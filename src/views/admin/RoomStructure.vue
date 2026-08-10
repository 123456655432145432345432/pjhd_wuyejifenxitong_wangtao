<template>
  <div class="page">
    <div class="header">
      <div>
        <h1 class="title">楼宇结构</h1>
        <p class="desc">查看小区楼栋占用情况与可选空房号</p>
      </div>
    </div>

    <div class="toolbar">
      <select v-model="communityId" class="input" @change="onCommunityChange">
        <option value="">选择小区</option>
        <option v-for="c in communities" :key="c.id" :value="c.id">{{ c.name || c.id }}</option>
      </select>
      <input v-model.trim="building" class="input" placeholder="楼栋，如 1栋" />
      <input v-if="viewMode === 'available'" v-model.trim="unit" class="input" placeholder="单元（可选）" />
      <div class="seg">
        <button type="button" class="segBtn" :class="{ active: viewMode === 'structure' }" @click="switchMode('structure')">结构视图</button>
        <button type="button" class="segBtn" :class="{ active: viewMode === 'available' }" @click="switchMode('available')">可选空房</button>
      </div>
      <button class="btnPrimary" :disabled="!communityId || loading" @click="load">查询</button>
    </div>

    <p v-if="error" class="error">{{ error }}</p>
    <div v-if="loading" class="hint">加载中...</div>

    <template v-else-if="viewMode === 'structure' && structure">
      <div class="structure">
        <h3 class="buildingTitle">{{ structure.building || building || '楼宇' }}</h3>
        <div v-for="u in structure.units || []" :key="u.unit" class="unitCard">
          <h4>{{ u.unit || '单元' }}</h4>
          <div v-for="floor in u.floors || []" :key="floor.floor" class="floorRow">
            <div class="floorLabel">{{ floor.floor || '楼层' }}</div>
            <div class="rooms">
              <span
                v-for="room in floor.rooms || []"
                :key="room.room"
                class="roomChip"
                :class="{ occupied: room.isOccupied }"
                :title="room.isOccupied ? (room.residentName || '已占用') : '空置'"
              >
                {{ room.room }}
                <small>{{ room.isOccupied ? (room.residentName || '已占用') : '空' }}</small>
              </span>
            </div>
          </div>
        </div>
        <p v-if="!(structure.units || []).length" class="hint">暂无结构数据，请确认楼栋参数</p>
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
            <td>{{ item.floor || '—' }}</td>
            <td>{{ item.room || '—' }}</td>
          </tr>
        </tbody>
      </table>
      <p v-else-if="!loading" class="hint">暂无空房，或请调整楼栋/单元筛选</p>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { communityRoomApi, propertyCompanyApi } from '../../api/services'
import { ApiError } from '../../api/request'
import type {
  AvailableRoomsResult,
  PropertyCompanyCommunity,
  RoomStructure,
  RoomStructureFloor,
  RoomStructureUnit
} from '../../api/types'
import { useAuthStore } from '../../stores/auth'

const auth = useAuthStore()
const communities = ref<PropertyCompanyCommunity[]>([])
const communityId = ref('')
const building = ref('')
const unit = ref('')
const viewMode = ref<'structure' | 'available'>('structure')
const loading = ref(false)
const error = ref('')
const structure = ref<RoomStructure | null>(null)
const available = ref<AvailableRoomsResult | null>(null)

const availableItems = computed(() => available.value?.items || [])

const naturalCollator = new Intl.Collator('zh-CN', { numeric: true, sensitivity: 'base' })

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
        .sort((a, b) => naturalCollator.compare(a.floor || '', b.floor || ''))
      return { ...u, floors }
    })
    .sort((a, b) => naturalCollator.compare(a.unit || '', b.unit || ''))
  return { ...raw, units }
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
      structure.value = sortRoomStructure(raw)
      available.value = null
    } else {
      available.value = await communityRoomApi.availableRooms(communityId.value, {
        building: building.value || undefined,
        unit: unit.value || undefined
      })
      structure.value = null
    }
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '加载失败'
    structure.value = null
    available.value = null
  } finally {
    loading.value = false
  }
}

function onCommunityChange() {
  structure.value = null
  available.value = null
}

function switchMode(mode: 'structure' | 'available') {
  viewMode.value = mode
  if (communityId.value) load()
}

onMounted(async () => {
  await loadCommunities()
  if (communityId.value) await load()
})
</script>

<style scoped>
.page { max-width: 1100px; }
.header { margin-bottom: 20px; }
.title { font-size: 24px; font-weight: 600; margin: 0 0 6px; }
.desc { margin: 0; color: #8c8c9a; font-size: 14px; }
.toolbar { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 16px; align-items: center; }
.input { min-width: 140px; padding: 8px 12px; border: 1px solid #e8e8ec; border-radius: 8px; }
.btnPrimary { padding: 8px 16px; border: none; border-radius: 8px; background: #5c5c9e; color: #fff; cursor: pointer; }
.btnPrimary:disabled { opacity: 0.6; cursor: not-allowed; }
.seg { display: inline-flex; border: 1px solid #e8e8ec; border-radius: 8px; overflow: hidden; }
.segBtn { border: none; background: #fff; padding: 8px 12px; cursor: pointer; font-size: 13px; color: #5c5c66; }
.segBtn.active { background: #5c5c9e; color: #fff; }
.buildingTitle { margin: 0 0 16px; }
.unitCard { border: 1px solid #f0f0f3; border-radius: 12px; padding: 14px; margin-bottom: 14px; }
.unitCard h4 { margin: 0 0 12px; }
.floorRow { display: flex; gap: 12px; margin-bottom: 10px; align-items: flex-start; }
.floorLabel { width: 64px; color: #8c8c9a; font-size: 13px; padding-top: 6px; }
.rooms { display: flex; flex-wrap: wrap; gap: 8px; flex: 1; }
.roomChip {
  display: inline-flex; flex-direction: column; gap: 2px;
  min-width: 64px; padding: 8px 10px; border-radius: 8px;
  background: #f0faf4; color: #2f7d4a; font-size: 13px;
}
.roomChip.occupied { background: #f3f0ff; color: #5c5c9e; }
.roomChip small { font-size: 11px; opacity: 0.85; }
.summary { display: flex; gap: 12px; margin-bottom: 14px; }
.stat { background: #fafafc; border: 1px solid #f0f0f3; border-radius: 10px; padding: 12px 16px; min-width: 140px; }
.stat span { display: block; font-size: 12px; color: #8c8c9a; margin-bottom: 4px; }
.stat strong { font-size: 20px; }
.table { width: 100%; border-collapse: collapse; font-size: 13px; }
.table th, .table td { padding: 10px 8px; border-bottom: 1px solid #f0f0f3; text-align: left; }
.hint, .error { color: #8c8c9a; }
.error { color: #e05c5c; }
</style>
