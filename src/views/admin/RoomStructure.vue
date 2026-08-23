<template>
  <div class="page">
    <div class="header">
      <div>
        <h1 class="title">楼宇结构</h1>
        <p class="desc">维护小区空房主数据；住户入住后自动变为已占用。锁定房号住户端不可选。</p>
      </div>
      <div class="headerActions">
        <button class="btnSecondary" :disabled="!communityId" @click="openCreate">新增空房</button>
        <button class="btnPrimary" :disabled="!communityId" @click="openBatch">批量新增</button>
      </div>
    </div>

    <div class="toolbar">
      <select v-model="communityId" class="input" @change="onCommunityChange">
        <option value="">选择小区</option>
        <option v-for="c in communities" :key="c.id" :value="c.id">{{ c.name || c.id }}</option>
      </select>
      <input v-model.trim="building" class="input" placeholder="楼栋，如 1栋" />
      <input v-if="viewMode !== 'structure'" v-model.trim="unit" class="input" placeholder="单元（可选）" />
      <select v-if="viewMode === 'manage'" v-model="statusFilter" class="input" @change="load">
        <option v-for="opt in COMMUNITY_ROOM_STATUS_OPTIONS" :key="opt.value || 'all'" :value="opt.value">
          {{ opt.label }}
        </option>
      </select>
      <div class="seg">
        <button type="button" class="segBtn" :class="{ active: viewMode === 'manage' }" @click="switchMode('manage')">
          房号管理
        </button>
        <button type="button" class="segBtn" :class="{ active: viewMode === 'structure' }" @click="switchMode('structure')">
          结构视图
        </button>
        <button type="button" class="segBtn" :class="{ active: viewMode === 'available' }" @click="switchMode('available')">
          可选空房
        </button>
      </div>
      <button class="btnPrimary" :disabled="!communityId || loading" @click="load">查询</button>
    </div>

    <p v-if="success" class="success">{{ success }}</p>
    <p v-if="error" class="error">{{ error }}</p>
    <div v-if="loading" class="hint">加载中...</div>

    <template v-else-if="viewMode === 'manage'">
      <div class="summary">
        <div class="stat"><span>全部房号</span><strong>{{ managedRooms.length }}</strong></div>
        <div class="stat"><span>空置</span><strong>{{ countByStatus(COMMUNITY_ROOM_STATUS.VACANT) }}</strong></div>
        <div class="stat"><span>已入住</span><strong>{{ countByStatus(COMMUNITY_ROOM_STATUS.OCCUPIED) }}</strong></div>
        <div class="stat"><span>锁定</span><strong>{{ countByStatus(COMMUNITY_ROOM_STATUS.LOCKED) }}</strong></div>
      </div>
      <table v-if="managedRooms.length" class="table">
        <thead>
          <tr>
            <th>楼栋</th>
            <th>单元</th>
            <th>楼层</th>
            <th>房号</th>
            <th>状态</th>
            <th>名字</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in managedRooms" :key="item.id">
            <td>{{ item.building || '—' }}</td>
            <td>{{ item.unit || '—' }}</td>
            <td>{{ formatFloorLabel(item.floor) }}</td>
            <td>{{ item.room || '—' }}</td>
            <td>
              <span class="badge" :class="item.status || ''">{{ statusLabel(item.status) }}</span>
            </td>
            <td>{{ item.residentName || '—' }}</td>
            <td class="actions">
              <button
                v-if="item.status === COMMUNITY_ROOM_STATUS.VACANT"
                class="linkBtn"
                :disabled="actingId === item.id"
                @click="setStatus(item, COMMUNITY_ROOM_STATUS.LOCKED)"
              >
                锁定
              </button>
              <button
                v-if="item.status === COMMUNITY_ROOM_STATUS.LOCKED"
                class="linkBtn"
                :disabled="actingId === item.id"
                @click="setStatus(item, COMMUNITY_ROOM_STATUS.VACANT)"
              >
                解锁
              </button>
              <button
                v-if="item.status === COMMUNITY_ROOM_STATUS.VACANT"
                class="linkBtn danger"
                :disabled="actingId === item.id"
                @click="removeRoom(item)"
              >
                删除
              </button>
              <span v-if="item.status === COMMUNITY_ROOM_STATUS.OCCUPIED" class="muted">已入住不可改</span>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else class="hint">暂无房号。请先「新增空房」或「批量新增」，住户才能在选房时看到空房。</p>
    </template>

    <template v-else-if="viewMode === 'structure' && structure">
      <div class="structure">
        <h3 class="buildingTitle">{{ structure.building || building || '楼宇' }}</h3>
        <div v-for="u in structure.units || []" :key="u.unit" class="unitCard">
          <h4>{{ u.unit || '单元' }}</h4>
          <div v-for="floor in u.floors || []" :key="floor.floor || floorKey(floor)" class="floorRow">
            <div class="floorLabel">{{ formatFloorLabel(floor.floor) }}</div>
            <div class="rooms">
              <span
                v-for="room in floor.rooms || []"
                :key="room.room"
                class="roomChip"
                :class="chipClass(room)"
                :title="chipTitle(room)"
              >
                {{ room.room }}
                <small>{{ chipText(room) }}</small>
              </span>
            </div>
          </div>
        </div>
        <p v-if="!(structure.units || []).length" class="hint">暂无结构数据。请先在「房号管理」新增空房，或填写楼栋后再查询。</p>
      </div>
    </template>

    <template v-else-if="viewMode === 'available'">
      <div class="summary" v-if="available">
        <div class="stat"><span>可选空房</span><strong>{{ available.totalAvailable ?? available.items?.length ?? 0 }}</strong></div>
      </div>
      <table v-if="availableItems.length" class="table">
        <thead>
          <tr><th>楼栋</th><th>单元</th><th>楼层</th><th>房号</th></tr>
        </thead>
        <tbody>
          <tr v-for="(item, idx) in availableItems" :key="`${item.building}-${item.unit}-${item.room}-${idx}`">
            <td>{{ item.building || '—' }}</td>
            <td>{{ item.unit || '—' }}</td>
            <td>{{ formatFloorLabel(item.floor) }}</td>
            <td>{{ item.room || '—' }}</td>
          </tr>
        </tbody>
      </table>
      <p v-else-if="!loading" class="hint">暂无空房。请到「房号管理」新增空置房号。</p>
    </template>
  </div>

  <Teleport to="body">
    <div v-if="createOpen" class="overlay" @click.self="createOpen = false">
      <div class="modal">
        <h3>新增空房</h3>
        <label>楼栋</label>
        <input v-model.trim="createForm.building" class="input" placeholder="如 1栋" />
        <label>单元</label>
        <input v-model.trim="createForm.unit" class="input" placeholder="如 1单元" />
        <label>楼层</label>
        <input v-model.trim="createForm.floor" class="input" placeholder="如 3" />
        <label>房号</label>
        <input v-model.trim="createForm.room" class="input" placeholder="如 301" />
        <p v-if="formError" class="error">{{ formError }}</p>
        <div class="modalActions">
          <button type="button" @click="createOpen = false">取消</button>
          <button type="button" class="btnPrimary" :disabled="saving" @click="submitCreate">
            {{ saving ? '提交中...' : '保存为空置' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <Teleport to="body">
    <div v-if="batchOpen" class="overlay" @click.self="batchOpen = false">
      <div class="modal">
        <h3>批量新增空房</h3>
        <p class="formHint">同一楼栋、同一单元下一次添加多套房，保存后均为空置。</p>
        <label>楼栋</label>
        <input v-model.trim="batchForm.building" class="input" placeholder="如 1栋" />
        <label>单元</label>
        <input v-model.trim="batchForm.unit" class="input" placeholder="如 1单元" />
        <div class="batchHead">
          <span>楼层 / 房号</span>
          <button type="button" class="linkBtn" @click="addBatchRow">添加一行</button>
        </div>
        <div v-for="(row, index) in batchForm.rooms" :key="index" class="batchRow">
          <input v-model.trim="row.floor" class="input" placeholder="楼层" />
          <input v-model.trim="row.room" class="input" placeholder="房号" />
          <button type="button" class="linkBtn danger" :disabled="batchForm.rooms.length <= 1" @click="removeBatchRow(index)">
            删
          </button>
        </div>
        <p v-if="formError" class="error">{{ formError }}</p>
        <div class="modalActions">
          <button type="button" @click="batchOpen = false">取消</button>
          <button type="button" class="btnPrimary" :disabled="saving" @click="submitBatch">
            {{ saving ? '提交中...' : '批量保存' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { communityRoomApi, propertyCompanyApi, residentApi } from '../../api/services'
import { ApiError } from '../../api/request'
import type {
  AvailableRoomsResult,
  CommunityRoomItem,
  PropertyCompanyCommunity,
  ResidentItem,
  RoomStructure,
  RoomStructureFloor,
  RoomStructureRoom,
  RoomStructureUnit
} from '../../api/types'
import {
  COMMUNITY_ROOM_STATUS,
  COMMUNITY_ROOM_STATUS_LABEL,
  COMMUNITY_ROOM_STATUS_OPTIONS,
  getEnumLabel
} from '../../constants/enums'
import { useAuthStore } from '../../stores/auth'
import { normalizePageResult } from '../../utils/pageResult'

type ViewMode = 'manage' | 'structure' | 'available'

const auth = useAuthStore()
const communities = ref<PropertyCompanyCommunity[]>([])
const communityId = ref('')
const building = ref('')
const unit = ref('')
const statusFilter = ref('')
const viewMode = ref<ViewMode>('manage')
const loading = ref(false)
const saving = ref(false)
const actingId = ref('')
const error = ref('')
const success = ref('')
const formError = ref('')
const structure = ref<RoomStructure | null>(null)
const available = ref<AvailableRoomsResult | null>(null)
const managedRooms = ref<CommunityRoomItem[]>([])

const createOpen = ref(false)
const batchOpen = ref(false)
const createForm = reactive({ building: '', unit: '', floor: '', room: '' })
const batchForm = reactive({
  building: '',
  unit: '',
  rooms: [{ floor: '', room: '' }]
})

const availableItems = computed(() => available.value?.items || [])
const naturalCollator = new Intl.Collator('zh-CN', { numeric: true, sensitivity: 'base' })
const FIELD_NAME_VALUES = new Set([
  'residentname',
  'resident_name',
  'residentid',
  'resident_id',
  'name',
  'null',
  'undefined'
])
const NAME_KEYS = [
  'residentName',
  'resident_name',
  'ownerName',
  'owner_name',
  'householderName',
  'householdName',
  'occupantName',
  'displayName',
  'fullName',
  'realName',
  'real_name',
  'userName',
  'username',
  'nickName',
  'nickname'
]

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function pickRaw(source: Record<string, unknown> | null | undefined, keys: string[]): unknown {
  if (!source) return undefined
  for (const key of keys) {
    if (source[key] !== undefined && source[key] !== null && source[key] !== '') return source[key]
  }
  return undefined
}

function pickStr(source: Record<string, unknown> | null | undefined, keys: string[]): string {
  const value = pickRaw(source, keys)
  return value === undefined || value === null || typeof value === 'object' ? '' : String(value).trim()
}

function isFieldKey(value: string) {
  return FIELD_NAME_VALUES.has(value.toLowerCase().replace(/-/g, '_'))
}

function isIdLike(value: string) {
  return /^(res|room|usr|user|occ|com)[_-]/i.test(value)
}

function isUsableName(value: unknown): value is string {
  if (value === undefined || value === null || typeof value === 'object') return false
  const text = String(value).trim()
  return !!text && !isFieldKey(text) && !isIdLike(text)
}

function occupantName(raw: unknown): string {
  const source = asRecord(raw)
  if (!source) return isUsableName(raw) ? String(raw).trim() : ''
  const nested = [source.resident, source.user, source.owner, source.occupant, source.householder]
    .map((item) => asRecord(item))
    .filter((item): item is Record<string, unknown> => !!item)
  const candidates: unknown[] = [
    ...NAME_KEYS.map((key) => source[key]),
    ...nested.flatMap((item) => [...NAME_KEYS.map((key) => item[key]), item.name])
  ]
  for (const key of ['resident', 'occupant', 'owner', 'householder']) {
    if (typeof source[key] === 'string') candidates.push(source[key])
  }
  const topName = pickStr(source, ['name'])
  const roomNo = pickStr(source, ['room', 'roomNo', 'roomNumber'])
  if (topName && topName !== roomNo && !/^\d+$/.test(topName)) candidates.push(topName)
  for (const candidate of candidates) {
    if (isUsableName(candidate)) return String(candidate).trim()
  }
  return ''
}

function occupantId(raw: unknown): string {
  const source = asRecord(raw)
  if (!source) return ''
  const nested = asRecord(source.resident) || asRecord(source.user) || asRecord(source.owner)
  const id = pickStr(source, ['residentId', 'resident_id', 'occupantId'])
    || pickStr(nested, ['id', 'residentId', 'resident_id'])
  if (typeof source.resident === 'string' && isIdLike(source.resident)) return source.resident.trim()
  return id
}

function addressKey(building?: string, unit?: string, room?: string) {
  const norm = (value?: string) => {
    const text = String(value || '').replace(/[栋幢单元号室层楼\s-]/g, '').toLowerCase()
    return text.replace(/^0+(?=\d)/, '')
  }
  return `${norm(building)}|${norm(unit)}|${norm(room)}`
}

function inferFloorFromRoom(room?: string): string {
  const digits = String(room || '').replace(/\D/g, '')
  if (digits.length >= 3) return String(Number.parseInt(digits.slice(0, digits.length - 2), 10))
  return ''
}

function rawFloorValue(raw: unknown, room?: string): string {
  const source = asRecord(raw)
  const value = source
    ? pickRaw(source, ['floor', 'floorNumber', 'floorNo', 'floorNum', 'floorIndex', 'floor_no', 'level', 'storey'])
    : raw
  if (typeof value === 'object' && value) {
    const nested = asRecord(value)
    const nestedValue = pickRaw(nested, ['floor', 'number', 'value', 'name', 'label'])
    if (nestedValue !== undefined && nestedValue !== null && nestedValue !== '' && typeof nestedValue !== 'object') {
      return String(nestedValue).trim()
    }
  } else if (value !== undefined && value !== null && value !== '') {
    return String(value).trim()
  }
  return inferFloorFromRoom(room)
}

function formatFloorLabel(value?: string | number | null): string {
  if (value === undefined || value === null || value === '') return '—'
  const text = String(value).trim()
  if (!text || text === '楼层') return '—'
  if (/层$/.test(text)) return text
  const digits = text.replace(/[^\d-]/g, '')
  if (digits !== '' && /^-?\d+$/.test(digits) && (text === digits || text === `${digits}楼`)) {
    return `${Number.parseInt(digits, 10)}层`
  }
  return text
}

function floorKey(floor: RoomStructureFloor) {
  return floor.floor || (floor.rooms || []).map((room) => room.room).join('-') || 'floor'
}

function floorSortValue(floor?: string) {
  const digits = String(floor || '').replace(/[^\d-]/g, '')
  if (digits !== '' && /^-?\d+$/.test(digits)) return Number.parseInt(digits, 10)
  return Number.POSITIVE_INFINITY
}

function asKeyedMap(record: Record<string, unknown>): boolean {
  const keys = Object.keys(record)
  if (!keys.length) return false
  const dtoKeys = ['floor', 'floorNumber', 'floorNo', 'rooms', 'room', 'unit', 'building', 'id', 'status', 'residentName']
  if (dtoKeys.some((key) => key in record)) return false
  return keys.every(
    (key) => /^\d/.test(key) || /层$/.test(key) || Array.isArray(record[key]) || !!asRecord(record[key])
  )
}

function asList(value: unknown): unknown[] {
  if (Array.isArray(value)) return value
  const record = asRecord(value)
  if (!record) return []
  if (Array.isArray(record.list)) return record.list
  if (Array.isArray(record.items)) return record.items
  if (asKeyedMap(record)) {
    return Object.entries(record).map(([key, val]) => {
      if (Array.isArray(val)) return { floor: key, rooms: val }
      if (asRecord(val)) return { floor: key, ...(val as object) }
      return { floor: key }
    })
  }
  return [record]
}

function buildingNode(raw: unknown, fallbackBuilding?: string): Record<string, unknown> {
  const source = asRecord(raw) || {}
  const nested = asRecord(source.data) || asRecord(source.structure) || source
  const buildings = Array.isArray(nested.buildings)
    ? nested.buildings
    : Array.isArray(nested.list) && nested.units === undefined
      ? nested.list
      : Array.isArray(raw)
        ? raw
        : null
  if (buildings && buildings.length) {
    const nodes = buildings.map((item) => asRecord(item)).filter((item): item is Record<string, unknown> => !!item)
    const match = fallbackBuilding
      ? nodes.find((item) => pickStr(item, ['building', 'buildingName', 'buildingNo']) === fallbackBuilding)
      : undefined
    return match || nodes[0] || nested
  }
  return nested
}

function normalizeStructureRoom(raw: unknown, fallbackRoom?: string): RoomStructureRoom {
  const source = asRecord(raw) || {}
  const room = pickStr(source, ['room', 'roomNo', 'roomNumber', 'room_no']) || fallbackRoom || ''
  const status = pickStr(source, ['status'])
  const name = occupantName(source)
  const residentId = occupantId(source) || null
  const occupied = source.isOccupied === true || status === COMMUNITY_ROOM_STATUS.OCCUPIED || !!name || !!residentId
  return {
    room,
    status: status || (occupied ? COMMUNITY_ROOM_STATUS.OCCUPIED : undefined),
    isOccupied: occupied,
    residentId,
    residentName: name || null
  }
}

function normalizeFloor(raw: unknown, keyHint?: string): RoomStructureFloor {
  const source = asRecord(raw)
  const roomList = source ? asList(source.rooms ?? source.roomList) : Array.isArray(raw) ? raw : []
  const rooms = roomList.map((item, index) => {
    const record = asRecord(item)
    const key = record ? undefined : typeof item === 'string' || typeof item === 'number' ? String(item) : String(index)
    return normalizeStructureRoom(item, key)
  })
  const floorFromRooms = rooms.map((room) => inferFloorFromRoom(room.room)).find(Boolean) || ''
  const floor = rawFloorValue(source || raw, rooms[0]?.room) || keyHint || floorFromRooms
  return { floor, rooms }
}

function normalizeUnit(raw: unknown, keyHint?: string): RoomStructureUnit {
  const source = asRecord(raw) || {}
  const unit = pickStr(source, ['unit', 'unitName', 'unitNo', 'unit_no']) || keyHint || ''
  let floors: RoomStructureFloor[]
  if (source.floors && !Array.isArray(source.floors) && asRecord(source.floors)) {
    floors = Object.entries(source.floors as Record<string, unknown>).map(([key, val]) => normalizeFloor(val, key))
  } else if (Array.isArray(source.floors) || source.floorList) {
    floors = asList(source.floors ?? source.floorList).map((item) => normalizeFloor(item))
  } else {
    const rooms = asList(source.rooms ?? source.roomList).map((item) => normalizeStructureRoom(item))
    const grouped = new Map<string, RoomStructureRoom[]>()
    for (const room of rooms) {
      const record = asRecord(room)
      const floor = rawFloorValue(record, room.room) || inferFloorFromRoom(room.room) || ''
      const list = grouped.get(floor) || []
      list.push(room)
      grouped.set(floor, list)
    }
    floors = [...grouped.entries()].map(([floor, groupedRooms]) => ({ floor, rooms: groupedRooms }))
  }
  return { unit, floors }
}

function normalizeRoomStructure(raw: unknown, fallbackBuilding?: string): RoomStructure {
  const nested = buildingNode(raw, fallbackBuilding)
  const building = pickStr(nested, ['building', 'buildingName', 'buildingNo', 'building_no'])
    || fallbackBuilding
    || ''
  const unitSource = nested.units ?? nested.unitList
  let units: RoomStructureUnit[]
  if (unitSource && !Array.isArray(unitSource) && asRecord(unitSource)) {
    units = Object.entries(unitSource as Record<string, unknown>).map(([key, val]) => normalizeUnit(val, key))
  } else if (Array.isArray(unitSource)) {
    units = unitSource.map((item) => normalizeUnit(item))
  } else {
    units = [normalizeUnit(nested)]
  }
  return { building, units: units.filter((unit) => (unit.floors || []).length || unit.unit) }
}

function normalizeManagedRoom(raw: unknown, index: number): CommunityRoomItem {
  const source = asRecord(raw) || {}
  const room = pickStr(source, ['room', 'roomNo', 'roomNumber', 'room_no'])
  return {
    id: pickStr(source, ['id', 'roomId', 'room_id']) || `room-${index}`,
    communityId: pickStr(source, ['communityId', 'community_id']) || undefined,
    building: pickStr(source, ['building', 'buildingName', 'buildingNo']) || undefined,
    unit: pickStr(source, ['unit', 'unitName', 'unitNo']) || undefined,
    floor: rawFloorValue(source, room) || undefined,
    room: room || undefined,
    status: pickStr(source, ['status']) || undefined,
    residentId: occupantId(source) || null,
    residentName: occupantName(source) || null,
    createdAt: pickStr(source, ['createdAt', 'created_at']) || undefined
  }
}

function normalizeAvailable(raw: unknown): AvailableRoomsResult {
  const source = asRecord(raw) || {}
  const items = asList(source.items ?? source.list ?? source.rooms ?? (Array.isArray(raw) ? raw : [])).map((item) => {
    const row = asRecord(item) || {}
    const room = pickStr(row, ['room', 'roomNo', 'roomNumber'])
    return {
      building: pickStr(row, ['building', 'buildingName']) || undefined,
      unit: pickStr(row, ['unit', 'unitName']) || undefined,
      floor: rawFloorValue(row, room) || undefined,
      room: room || undefined,
      isOccupied: row.isOccupied === true,
      status: pickStr(row, ['status']) || undefined
    }
  })
  const total = Number(source.totalAvailable ?? source.total ?? items.length)
  return {
    communityId: pickStr(source, ['communityId', 'community_id']) || undefined,
    totalAvailable: Number.isFinite(total) ? total : items.length,
    items
  }
}

function statusLabel(value?: string) {
  return getEnumLabel(COMMUNITY_ROOM_STATUS_LABEL, value, value || '—')
}

function countByStatus(status: string) {
  return managedRooms.value.filter((item) => item.status === status).length
}

function chipClass(room: RoomStructureRoom) {
  if (room.status === COMMUNITY_ROOM_STATUS.LOCKED) return 'locked'
  if (room.status === COMMUNITY_ROOM_STATUS.OCCUPIED || room.isOccupied) return 'occupied'
  return ''
}

function chipText(room: RoomStructureRoom) {
  if (room.status === COMMUNITY_ROOM_STATUS.LOCKED) return '锁定'
  if (room.status === COMMUNITY_ROOM_STATUS.OCCUPIED || room.isOccupied) {
    return room.residentName || '已占用'
  }
  return '空'
}

function chipTitle(room: RoomStructureRoom) {
  const name = room.residentName
  if (name) return name
  return chipText(room)
}

function sortRoomStructure(raw: RoomStructure): RoomStructure {
  const units = [...(raw.units || [])]
    .map((u): RoomStructureUnit => {
      const floors = [...(u.floors || [])]
        .map((floor): RoomStructureFloor => ({
          ...floor,
          rooms: [...(floor.rooms || [])].sort((a, b) =>
            naturalCollator.compare(a.room || '', b.room || '')
          )
        }))
        .sort((a, b) => {
          const byNumber = floorSortValue(a.floor) - floorSortValue(b.floor)
          return byNumber !== 0 ? byNumber : naturalCollator.compare(a.floor || '', b.floor || '')
        })
      return { ...u, floors }
    })
    .sort((a, b) => naturalCollator.compare(a.unit || '', b.unit || ''))
  return { ...raw, units }
}

interface NameLookup {
  byId: Map<string, string>
  byAddress: Map<string, string>
}

function residentNameOf(item: ResidentItem) {
  if (item.name && isUsableName(item.name)) return item.name.trim()
  return occupantName(item)
}

async function loadCommunityResidents(): Promise<ResidentItem[]> {
  const companyId = auth.propertyCompanyId || auth.profile?.propertyCompanyId || undefined
  const loadPages = async (params: { communityId?: string; building?: string }) => {
    const all: ResidentItem[] = []
    let page = 1
    let totalPages = 1
    while (page <= totalPages && page <= 20) {
      const res = normalizePageResult<ResidentItem>(
        await residentApi.list({
          page,
          pageSize: 100,
          communityId: params.communityId,
          building: params.building,
          propertyCompanyId: companyId
        })
      )
      const list = res.list || []
      all.push(...list)
      totalPages = res.pagination?.totalPages ?? 1
      if (!list.length) break
      page += 1
    }
    return all
  }
  const scoped = await loadPages({
    communityId: communityId.value || undefined,
    building: building.value || undefined
  })
  if (scoped.length) return scoped
  return loadPages({ building: building.value || undefined })
}

function buildNameLookup(residents: ResidentItem[]): NameLookup {
  const byId = new Map<string, string>()
  const byAddress = new Map<string, string>()
  for (const item of residents) {
    if (communityId.value && item.communityId && item.communityId !== communityId.value) continue
    const name = residentNameOf(item)
    if (!name) continue
    if (item.id) byId.set(item.id, name)
    if (item.room) byAddress.set(addressKey(item.building, item.unit, item.room), name)
  }
  return { byId, byAddress }
}

function lookupName(lookup: NameLookup, item: { residentId?: string | null; building?: string; unit?: string; room?: string }) {
  return (item.residentId && lookup.byId.get(item.residentId))
    || lookup.byAddress.get(addressKey(item.building, item.unit, item.room))
    || ''
}

async function fillManagedRoomNames(rooms: CommunityRoomItem[]) {
  if (rooms.every((item) => item.residentName)) return rooms
  try {
    const lookup = buildNameLookup(await loadCommunityResidents())
    return rooms.map((item) => {
      if (item.residentName) return item
      const name = lookupName(lookup, item)
      return name ? { ...item, residentName: name } : item
    })
  } catch {
    return rooms
  }
}

async function fillStructureNames(raw: RoomStructure) {
  const rooms = (raw.units || []).flatMap((unitItem) =>
    (unitItem.floors || []).flatMap((floor) => floor.rooms || [])
  )
  if (!rooms.some((room) => (room.isOccupied || room.status === COMMUNITY_ROOM_STATUS.OCCUPIED) && !room.residentName)) {
    return raw
  }
  try {
    const lookup = buildNameLookup(await loadCommunityResidents())
    return {
      ...raw,
      units: (raw.units || []).map((unitItem) => ({
        ...unitItem,
        floors: (unitItem.floors || []).map((floor) => ({
          ...floor,
          rooms: (floor.rooms || []).map((room) => {
            if (room.residentName) return room
            const name = lookupName(lookup, {
              residentId: room.residentId,
              building: raw.building,
              unit: unitItem.unit,
              room: room.room
            })
            return name ? { ...room, residentName: name } : room
          })
        }))
      }))
    }
  } catch {
    return raw
  }
}

async function loadCommunities() {
  const id = auth.propertyCompanyId || auth.profile?.propertyCompanyId
  if (!id) return
  try {
    const res = await propertyCompanyApi.communities(id)
    communities.value = res.list || []
    if (!communityId.value && communities.value[0]) communityId.value = communities.value[0].id
  } catch {
    communities.value = []
  }
}

async function load() {
  if (!communityId.value) return
  loading.value = true
  error.value = ''
  try {
    if (viewMode.value === 'structure') {
      const raw = await communityRoomApi.structure(communityId.value, {
        building: building.value || undefined
      })
      structure.value = sortRoomStructure(
        await fillStructureNames(normalizeRoomStructure(raw, building.value))
      )
      available.value = null
      managedRooms.value = []
    } else if (viewMode.value === 'available') {
      available.value = normalizeAvailable(
        await communityRoomApi.availableRooms(communityId.value, {
          building: building.value || undefined,
          unit: unit.value || undefined
        })
      )
      structure.value = null
      managedRooms.value = []
    } else {
      const result = await communityRoomApi.list(communityId.value, {
        building: building.value || undefined,
        unit: unit.value || undefined,
        status: statusFilter.value || undefined
      })
      managedRooms.value = await fillManagedRoomNames(
        [...(result.rooms || [])]
          .map((item, index) => normalizeManagedRoom(item, index))
          .sort((a, b) =>
            naturalCollator.compare(
              `${a.building || ''}-${a.unit || ''}-${a.floor || ''}-${a.room || ''}`,
              `${b.building || ''}-${b.unit || ''}-${b.floor || ''}-${b.room || ''}`
            )
          )
      )
      structure.value = null
      available.value = null
    }
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '加载失败'
    structure.value = null
    available.value = null
    managedRooms.value = []
  } finally {
    loading.value = false
  }
}

function onCommunityChange() {
  structure.value = null
  available.value = null
  managedRooms.value = []
  if (communityId.value) load()
}

function switchMode(mode: ViewMode) {
  viewMode.value = mode
  if (communityId.value) load()
}

function openCreate() {
  if (!communityId.value) return
  createForm.building = building.value
  createForm.unit = unit.value
  createForm.floor = ''
  createForm.room = ''
  formError.value = ''
  createOpen.value = true
}

function openBatch() {
  if (!communityId.value) return
  batchForm.building = building.value
  batchForm.unit = unit.value
  batchForm.rooms = [{ floor: '', room: '' }]
  formError.value = ''
  batchOpen.value = true
}

function addBatchRow() {
  batchForm.rooms.push({ floor: '', room: '' })
}

function removeBatchRow(index: number) {
  if (batchForm.rooms.length <= 1) return
  batchForm.rooms.splice(index, 1)
}

async function submitCreate() {
  if (!createForm.building.trim() || !createForm.unit.trim() || !createForm.room.trim()) {
    formError.value = '请填写楼栋、单元和房号'
    return
  }
  saving.value = true
  formError.value = ''
  try {
    await communityRoomApi.create(communityId.value, {
      building: createForm.building.trim(),
      unit: createForm.unit.trim(),
      floor: createForm.floor.trim() || undefined,
      room: createForm.room.trim()
    })
    createOpen.value = false
    success.value = '已新增空置房号'
    viewMode.value = 'manage'
    await load()
  } catch (e) {
    formError.value = e instanceof ApiError ? e.message : '新增失败'
  } finally {
    saving.value = false
  }
}

async function submitBatch() {
  const rooms = batchForm.rooms
    .map((row) => ({ floor: row.floor.trim() || undefined, room: row.room.trim() }))
    .filter((row) => row.room)
  if (!batchForm.building.trim() || !batchForm.unit.trim() || !rooms.length) {
    formError.value = '请填写楼栋、单元，并至少填写一个房号'
    return
  }
  saving.value = true
  formError.value = ''
  try {
    await communityRoomApi.createBatch(communityId.value, {
      building: batchForm.building.trim(),
      unit: batchForm.unit.trim(),
      rooms
    })
    batchOpen.value = false
    success.value = `已批量新增 ${rooms.length} 套空置房号`
    viewMode.value = 'manage'
    await load()
  } catch (e) {
    formError.value = e instanceof ApiError ? e.message : '批量新增失败'
  } finally {
    saving.value = false
  }
}

async function setStatus(item: CommunityRoomItem, status: string) {
  actingId.value = item.id
  error.value = ''
  success.value = ''
  try {
    await communityRoomApi.update(communityId.value, item.id, { status })
    success.value = status === COMMUNITY_ROOM_STATUS.LOCKED ? '已锁定，住户端不可选' : '已解锁为空置'
    await load()
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '更新失败'
  } finally {
    actingId.value = ''
  }
}

async function removeRoom(item: CommunityRoomItem) {
  if (!window.confirm(`删除空置房号 ${item.building || ''}${item.unit || ''}${item.room || ''} ？`)) return
  actingId.value = item.id
  error.value = ''
  success.value = ''
  try {
    await communityRoomApi.remove(communityId.value, item.id)
    success.value = '已删除空置房号'
    await load()
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '删除失败（已入住不可删）'
  } finally {
    actingId.value = ''
  }
}

onMounted(async () => {
  await loadCommunities()
  if (communityId.value) await load()
})
</script>

<style scoped>
.page { max-width: 1100px; }
.header { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; margin-bottom: 20px; }
.headerActions { display: flex; gap: 8px; flex-wrap: wrap; }
.title { font-size: 24px; font-weight: 600; margin: 0 0 6px; }
.desc { margin: 0; color: #8c8c9a; font-size: 14px; }
.toolbar { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 16px; align-items: center; }
.input { min-width: 140px; padding: 8px 12px; border: 1px solid #e8e8ec; border-radius: 8px; }
.btnPrimary { padding: 8px 16px; border: none; border-radius: 8px; background: #5c5c9e; color: #fff; cursor: pointer; }
.btnPrimary:disabled { opacity: 0.6; cursor: not-allowed; }
.btnSecondary { padding: 8px 16px; border: 1px solid #e8e8ec; border-radius: 8px; background: #fff; cursor: pointer; }
.seg { display: inline-flex; border: 1px solid #e8e8ec; border-radius: 8px; overflow: hidden; }
.segBtn { border: none; background: #fff; padding: 8px 12px; cursor: pointer; font-size: 13px; color: #5c5c66; }
.segBtn.active { background: #5c5c9e; color: #fff; }
.buildingTitle { margin: 0 0 16px; }
.unitCard { border: 1px solid #f0f0f3; border-radius: 12px; padding: 14px; margin-bottom: 14px; }
.unitCard h4 { margin: 0 0 12px; }
.floorRow { display: flex; gap: 12px; margin-bottom: 10px; align-items: flex-start; }
.floorLabel { min-width: 72px; color: #5c5c66; font-size: 13px; padding-top: 6px; font-weight: 600; white-space: nowrap; }
.rooms { display: flex; flex-wrap: wrap; gap: 8px; flex: 1; }
.roomChip {
  display: inline-flex; flex-direction: column; gap: 2px;
  min-width: 64px; padding: 8px 10px; border-radius: 8px;
  background: #f0faf4; color: #2f7d4a; font-size: 13px;
}
.roomChip.occupied { background: #f3f0ff; color: #5c5c9e; }
.roomChip.locked { background: #fff7e6; color: #d48806; }
.roomChip small { font-size: 11px; opacity: 0.85; }
.summary { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 14px; }
.stat { background: #fafafc; border: 1px solid #f0f0f3; border-radius: 10px; padding: 12px 16px; min-width: 120px; }
.stat span { display: block; font-size: 12px; color: #8c8c9a; margin-bottom: 4px; }
.stat strong { font-size: 20px; }
.table { width: 100%; border-collapse: collapse; font-size: 13px; }
.table th, .table td { padding: 10px 8px; border-bottom: 1px solid #f0f0f3; text-align: left; }
.actions { display: flex; gap: 10px; flex-wrap: wrap; }
.linkBtn { border: none; background: none; color: #5c5c9e; cursor: pointer; padding: 0; font-size: 13px; }
.linkBtn.danger { color: #cf1322; }
.linkBtn:disabled { opacity: 0.5; cursor: not-allowed; }
.badge { display: inline-block; padding: 4px 8px; border-radius: 10px; background: #f4f5f7; }
.badge.vacant { background: #f0faf4; color: #2f7d4a; }
.badge.occupied { background: #f3f0ff; color: #5c5c9e; }
.badge.locked { background: #fff7e6; color: #d48806; }
.hint, .error, .success, .muted { color: #8c8c9a; font-size: 13px; }
.error { color: #e05c5c; }
.success { color: #3aaf7d; margin: 0 0 12px; }
.overlay {
  position: fixed; inset: 0; z-index: 1000;
  display: flex; align-items: center; justify-content: center;
  padding: 20px; background: rgba(0,0,0,.45);
}
.modal { width: min(460px, 100%); padding: 24px; border-radius: 12px; background: #fff; }
.modal h3 { margin: 0 0 12px; }
.modal label { display: block; margin: 12px 0 6px; color: #5c5c66; font-size: 13px; }
.modal .input { width: 100%; box-sizing: border-box; }
.formHint { margin: 0 0 12px; font-size: 13px; color: #8c8c9a; }
.batchHead { display: flex; justify-content: space-between; align-items: center; margin: 14px 0 8px; font-size: 13px; color: #5c5c66; }
.batchRow { display: flex; gap: 8px; margin-bottom: 8px; }
.batchRow .input { min-width: 0; flex: 1; }
.modalActions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 18px; }
</style>
