<template>
  <div class="page">
    <div class="header">
      <div>
        <h1 class="title">定向消息推送</h1>
        <p class="desc">按楼栋、性别、年龄段筛选住户，以官方身份推送到聊天列表</p>
      </div>
      <button type="button" class="btnSecondary" @click="showAgeConfig = !showAgeConfig">
        {{ showAgeConfig ? '关闭年龄段配置' : '年龄段配置' }}
      </button>
    </div>

    <div v-if="showAgeConfig" class="card ageCard">
      <div class="cardHead">年龄段配置（默认 6 档，可调整区间）</div>
      <div v-if="ageLoading" class="hint">加载中...</div>
      <template v-else>
        <div v-for="(item, index) in ageBrackets" :key="item.id || index" class="ageRow">
          <input v-model="item.label" class="input" placeholder="名称" />
          <input v-model.number="item.minAge" type="number" class="input sm" placeholder="最小年龄" />
          <input
            v-model.number="item.maxAge"
            type="number"
            class="input sm"
            placeholder="最大年龄（空=无上限）"
          />
        </div>
        <p v-if="ageError" class="error">{{ ageError }}</p>
        <button type="button" class="btnPrimary" :disabled="ageSaving" @click="saveAgeBrackets">
          {{ ageSaving ? '保存中...' : '保存年龄段' }}
        </button>
      </template>
    </div>

    <div class="grid">
      <div class="card">
        <div class="cardHead">发送定向消息</div>
        <div class="form">
          <div class="field">
            <label class="label">官方身份</label>
            <select v-model="form.officialSenderType" class="input">
              <option
                v-for="opt in OFFICIAL_SENDER_TYPE_OPTIONS"
                :key="opt.value"
                :value="opt.value"
              >
                {{ opt.label }}
              </option>
            </select>
          </div>
          <div class="field">
            <label class="label">标题</label>
            <input v-model="form.title" class="input" maxlength="128" placeholder="消息标题" />
          </div>
          <div class="field">
            <label class="label">正文</label>
            <textarea
              v-model="form.content"
              class="textarea"
              rows="6"
              maxlength="2000"
              placeholder="消息正文"
            />
          </div>
          <div class="field">
            <label class="label">图片（可选，最多 9 张）</label>
            <MediaUploader
              v-model="form.imageUrls"
              category="announcement"
              accept="image"
              :max="9"
            />
          </div>
          <div class="field">
            <label class="label">性别</label>
            <select v-model="form.filterGender" class="input">
              <option v-for="opt in FILTER_GENDER_OPTIONS" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
          </div>
          <div class="field">
            <label class="label">覆盖楼栋</label>
            <label class="checkbox">
              <input v-model="selectAllBuildings" type="checkbox" @change="onSelectAllBuildings" />
              <span>全部楼栋</span>
            </label>
            <div class="checkboxGroup">
              <label v-for="b in buildingOptions" :key="b" class="checkbox">
                <input
                  v-model="form.filterBuildings"
                  type="checkbox"
                  :value="b"
                  :disabled="selectAllBuildings"
                />
                <span>{{ b }}</span>
              </label>
            </div>
          </div>
          <div class="field">
            <label class="label">年龄段（空=全部）</label>
            <div class="checkboxGroup">
              <label v-for="item in ageBrackets" :key="item.id" class="checkbox">
                <input v-model="form.filterAgeBracketIds" type="checkbox" :value="item.id" />
                <span>{{ item.label }}</span>
              </label>
            </div>
          </div>
          <div class="field">
            <label class="label">按消费商家筛选（可选，每行一个商家 ID）</label>
            <textarea
              v-model="form.merchantIdsText"
              class="textarea"
              rows="2"
              placeholder="mch_demo001&#10;mch_mch01"
            />
            <p class="note">筛选曾在这些商家消费过的住户；可与楼栋/性别/年龄段组合使用</p>
          </div>
          <p v-if="formError" class="error">{{ formError }}</p>
          <p v-if="formSuccess" class="success">{{ formSuccess }}</p>
          <button type="button" class="btnPrimary" :disabled="submitting" @click="submitSend">
            {{ submitting ? '发送中...' : '立即发送' }}
          </button>
        </div>
      </div>

      <div class="card">
        <div class="cardHead">推送任务列表</div>
        <div v-if="listLoading" class="hint">加载中...</div>
        <table v-else-if="tasks.length && !isMobile" class="table">
          <thead>
            <tr>
              <th>时间</th>
              <th>标题</th>
              <th>身份</th>
              <th>已读/收件</th>
              <th>已读率</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in tasks" :key="item.id">
              <td>{{ item.createdAt || '—' }}</td>
              <td>{{ item.title }}</td>
              <td>{{ getEnumLabel(OFFICIAL_SENDER_TYPE_LABEL, item.officialSenderType) }}</td>
              <td>{{ item.readCount ?? 0 }} / {{ item.recipientCount ?? 0 }}</td>
              <td>{{ formatRate(item.readRate) }}</td>
              <td>
                <button type="button" class="linkBtn" @click="openDetail(item.id)">详情</button>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-else-if="tasks.length" class="mobileTaskList">
          <article v-for="item in tasks" :key="item.id" class="mobileTaskCard">
            <div class="mobileTaskTop">
              <span>{{ item.createdAt || '—' }}</span>
              <span>{{ getEnumLabel(OFFICIAL_SENDER_TYPE_LABEL, item.officialSenderType) }}</span>
            </div>
            <h3>{{ item.title }}</h3>
            <div class="mobileTaskStats">
              <span>已读/收件：{{ item.readCount ?? 0 }} / {{ item.recipientCount ?? 0 }}</span>
              <span>已读率：{{ formatRate(item.readRate) }}</span>
            </div>
            <button type="button" class="linkBtn" @click="openDetail(item.id)">查看详情</button>
          </article>
        </div>
        <p v-else class="hint">暂无推送任务</p>
        <div v-if="totalPages > 1" class="pager">
          <button type="button" class="pageBtn" :disabled="page <= 1" @click="loadTasks(page - 1)">&lt;</button>
          <span class="pageInfo">{{ page }} / {{ totalPages }}</span>
          <button type="button" class="pageBtn" :disabled="page >= totalPages" @click="loadTasks(page + 1)">&gt;</button>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="detailOpen" class="modalOverlay" @click.self="detailOpen = false">
        <div class="modal modalWide" :class="{ mobileSheet: isMobile }">
          <div class="modalHeader">
            <h3 class="modalTitle">推送详情</h3>
            <button type="button" class="modalClose" @click="detailOpen = false">&times;</button>
          </div>
          <div class="modalBody">
            <div v-if="detailLoading" class="hint">加载中...</div>
            <template v-else-if="detail">
              <div class="detailGrid">
                <div><span class="label">标题</span><strong>{{ detail.title }}</strong></div>
                <div>
                  <span class="label">筛选</span><strong>{{ detail.filterSummary || '全部' }}</strong>
                </div>
                <div>
                  <span class="label">收件人</span><strong>{{ detail.recipientCount ?? 0 }}</strong>
                </div>
                <div>
                  <span class="label">已读/未读</span>
                  <strong>{{ detailReadCount }} / {{ detailUnreadCount }}</strong>
                </div>
                <div>
                  <span class="label">已读率</span><strong>{{ formatRate(detailReadRate) }}</strong>
                </div>
              </div>
              <p v-if="detail.content" class="contentBlock">{{ detail.content }}</p>
              <div class="filtersRow">
                <select v-model="recipientFilter.readStatus" class="input sm" @change="loadRecipients(1)">
                  <option value="">全部状态</option>
                  <option :value="READ_STATUS.READ">已读</option>
                  <option :value="READ_STATUS.UNREAD">未读</option>
                </select>
                <input
                  v-model="recipientFilter.buildingNo"
                  class="input sm"
                  placeholder="楼栋"
                  @change="loadRecipients(1)"
                />
              </div>
              <table v-if="recipients.length && !isMobile" class="table">
                <thead>
                  <tr>
                    <th>住户</th>
                    <th>楼栋</th>
                    <th>性别</th>
                    <th>状态</th>
                    <th>已读时间</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="r in recipients" :key="r.id">
                    <td>{{ displayResidentName(r) }}</td>
                    <td>{{ r.buildingNo || '—' }}</td>
                    <td>{{ displayGender(r.gender) }}</td>
                    <td>{{ displayReadStatus(r) }}</td>
                    <td>{{ r.readAt || '—' }}</td>
                  </tr>
                </tbody>
              </table>
              <div v-else-if="recipients.length" class="mobileRecipientList">
                <article v-for="r in recipients" :key="r.id" class="mobileRecipientCard">
                  <strong>{{ displayResidentName(r) }}</strong>
                  <div><span>楼栋</span><span>{{ r.buildingNo || '—' }}</span></div>
                  <div><span>性别</span><span>{{ displayGender(r.gender) }}</span></div>
                  <div><span>状态</span><span>{{ displayReadStatus(r) }}</span></div>
                  <div><span>已读时间</span><span>{{ r.readAt || '—' }}</span></div>
                </article>
              </div>
              <p v-else class="hint">暂无收件人明细</p>
            </template>
            <p v-if="detailError" class="error">{{ detailError }}</p>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import MediaUploader from '../components/MediaUploader.vue'
import { directedMessageApi, residentApi } from '../api/services'
import { ApiError } from '../api/request'
import { useIsMobile } from '../composables/useIsMobile'
import type {
  AgeBracketItem,
  DirectedMessageTaskItem,
  DirectedMessageRecipientItem,
  ResidentItem
} from '../api/types'
import { useAuthStore } from '../stores/auth'
import {
  FILTER_GENDER,
  FILTER_GENDER_LABEL,
  FILTER_GENDER_OPTIONS,
  getEnumLabel,
  getPhase2ErrorMessage,
  normalizeFilterGender,
  OFFICIAL_SENDER_TYPE,
  OFFICIAL_SENDER_TYPE_LABEL,
  OFFICIAL_SENDER_TYPE_OPTIONS,
  READ_STATUS,
  READ_STATUS_LABEL,
  USER_ROLE
} from '../constants/enums'

const auth = useAuthStore()
const { isMobile } = useIsMobile()
const PAGE_SIZE = 20
/** 后端 pageSize 上限通常为 100，超出会 400「参数值超出范围」 */
const RESIDENT_LIST_PAGE_SIZE = 100
const BUILDING_OPTIONS_MAX_PAGES = 10

const form = ref({
  title: '',
  content: '',
  imageUrls: [] as string[],
  officialSenderType: defaultSenderType(),
  filterGender: FILTER_GENDER.ALL,
  filterBuildings: [] as string[],
  filterAgeBracketIds: [] as string[],
  merchantIdsText: ''
})
const selectAllBuildings = ref(true)
const buildingOptions = ref<string[]>([])
const residentLookup = ref<Map<string, ResidentItem>>(new Map())
const submitting = ref(false)
const formError = ref('')
const formSuccess = ref('')

const showAgeConfig = ref(false)
const ageBrackets = ref<AgeBracketItem[]>([])
const ageLoading = ref(false)
const ageSaving = ref(false)
const ageError = ref('')

const tasks = ref<DirectedMessageTaskItem[]>([])
const listLoading = ref(false)
const page = ref(1)
const totalPages = ref(1)

const detailOpen = ref(false)
const detailLoading = ref(false)
const detailError = ref('')
const detail = ref<DirectedMessageTaskItem | null>(null)
const recipients = ref<DirectedMessageRecipientItem[]>([])
const recipientFilter = ref({ readStatus: '', buildingNo: '' })
const currentTaskId = ref('')
/** 当前页收件人汇总，用于详情汇总字段缺失时兜底 */
const recipientPageStats = ref<{ readCount: number; unreadCount: number; total: number } | null>(null)

const detailReadCount = computed(() => {
  const api = detail.value?.readCount
  const page = recipientPageStats.value?.readCount
  const unfiltered =
    !recipientFilter.value.readStatus && !recipientFilter.value.buildingNo.trim()
  if (unfiltered && api != null && page != null) return Math.max(api, page)
  if (api != null) return api
  return page ?? 0
})
const detailUnreadCount = computed(() => {
  const total = detail.value?.recipientCount ?? recipientPageStats.value?.total
  if (total != null) return Math.max(0, total - detailReadCount.value)
  if (detail.value?.unreadCount != null) return detail.value.unreadCount
  return recipientPageStats.value?.unreadCount ?? 0
})
const detailReadRate = computed(() => {
  const total = detail.value?.recipientCount ?? recipientPageStats.value?.total
  if (total) return detailReadCount.value / total
  if (detail.value?.readRate != null) return detail.value.readRate
  return 0
})

function defaultSenderType() {
  if (auth.profile?.role === USER_ROLE.COORDINATOR) return OFFICIAL_SENDER_TYPE.COORDINATOR
  if (auth.profile?.role === USER_ROLE.PLATFORM_ADMIN) return OFFICIAL_SENDER_TYPE.PLATFORM
  return OFFICIAL_SENDER_TYPE.PROPERTY
}

function formatRate(rate?: number) {
  if (rate == null || Number.isNaN(rate)) return '—'
  return `${(rate <= 1 ? rate * 100 : rate).toFixed(1)}%`
}

function resolveError(e: unknown) {
  if (e instanceof ApiError) return getPhase2ErrorMessage(e.code, e.message)
  if (e instanceof Error) return e.message
  return '操作失败，请稍后重试'
}

function pickStr(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  }
  return undefined
}

/** 收件人记录 id（dmr_*）不是住户 id，勿请求 /residents/{id} */
function isLikelyResidentId(id: string) {
  return Boolean(id) && !id.startsWith('dmr_')
}

function asPersonObject(value: unknown): Record<string, unknown> | undefined {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return undefined
}

function pickResidentId(...values: unknown[]) {
  for (const value of values) {
    const id = pickStr(value)
    if (id && isLikelyResidentId(id)) return id
  }
  return undefined
}

function isReadStatus(status?: string) {
  return status === READ_STATUS.READ || status === '已读'
}

function displayResidentName(r: DirectedMessageRecipientItem) {
  return (
    r.residentName ||
    r.name ||
    (r.residentId && isLikelyResidentId(r.residentId) ? r.residentId : undefined) ||
    '—'
  )
}

function displayGender(gender?: string | number) {
  const normalized = normalizeFilterGender(gender)
  return getEnumLabel(FILTER_GENDER_LABEL, normalized, '—')
}

function displayReadStatus(r: DirectedMessageRecipientItem) {
  const status = r.readStatus || r.readStatusCode
  return getEnumLabel(READ_STATUS_LABEL, status, status || '—')
}

/** 兼容 camelCase / snake_case / 嵌套住户对象的收件人字段 */
function normalizeRecipient(raw: DirectedMessageRecipientItem): DirectedMessageRecipientItem {
  const record = raw as DirectedMessageRecipientItem & Record<string, unknown>
  const nested =
    asPersonObject(record.resident) ||
    asPersonObject(record.user) ||
    asPersonObject(record.recipient) ||
    asPersonObject(record.residentInfo) ||
    asPersonObject(record.resident_info) ||
    asPersonObject(record.profile) ||
    {}
  const nestedBuilding = pickStr(
    nested.buildingNo,
    nested.building_no,
    nested.building,
    nested.buildingName,
    nested.building_name
  )
  const readStatus = pickStr(
    record.readStatus,
    record.readStatusCode,
    record.read_status,
    record.status
  )
  // id = 收件记录（dmr_*）；recipientId = 住户 id（res_*）
  const recordId = pickStr(record.id) || ''
  const residentId = pickResidentId(
    record.residentId,
    record.resident_id,
    record.recipientId,
    record.recipient_id,
    record.userId,
    record.user_id,
    record.targetId,
    record.target_id,
    record.memberId,
    record.member_id,
    record.uid,
    nested.id,
    nested.residentId,
    nested.resident_id,
    nested.userId,
    nested.user_id,
    typeof record.resident === 'string' ? record.resident : undefined,
    typeof record.user === 'string' ? record.user : undefined,
    recordId
  )
  return {
    id: recordId,
    residentId,
    residentName: pickStr(
      record.residentName,
      record.resident_name,
      // 后端实际返回：recipientName
      record.recipientName,
      record.recipient_name,
      record.realName,
      record.real_name,
      record.displayName,
      record.display_name,
      record.name,
      record.userName,
      record.user_name,
      record.nickname,
      record.nickName,
      nested.name,
      nested.residentName,
      nested.resident_name,
      nested.realName,
      nested.real_name,
      nested.userName,
      nested.nickname
    ),
    buildingNo: pickStr(
      record.buildingNo,
      record.building_no,
      record.building,
      record.buildingName,
      record.building_name,
      nestedBuilding
    ),
    gender: normalizeFilterGender(
      (record.gender as string | number | undefined) ??
        (nested.gender as string | number | undefined)
    ),
    age:
      typeof record.age === 'number'
        ? record.age
        : typeof nested.age === 'number'
          ? nested.age
          : undefined,
    readStatus,
    readStatusCode: pickStr(record.readStatusCode, record.read_status_code, readStatus),
    readAt: pickStr(record.readAt, record.read_at, record.readTime, record.read_time)
  }
}

function mergeResidentProfile(
  item: DirectedMessageRecipientItem,
  resident?: ResidentItem
): DirectedMessageRecipientItem {
  if (!resident) return item
  return {
    ...item,
    residentId: item.residentId || resident.id,
    residentName: item.residentName || resident.name,
    buildingNo: item.buildingNo || resident.building,
    gender: item.gender || normalizeFilterGender(resident.gender)
  }
}

function enrichRecipients(list: DirectedMessageRecipientItem[]) {
  const map = residentLookup.value
  return list.map((item) => {
    const byResidentId = item.residentId ? map.get(item.residentId) : undefined
    const byId =
      item.id && isLikelyResidentId(item.id) ? map.get(item.id) : undefined
    return mergeResidentProfile(item, byResidentId || byId)
  })
}

function updateRecipientPageStats(list: DirectedMessageRecipientItem[]) {
  const readCount = list.filter((r) => isReadStatus(r.readStatus || r.readStatusCode)).length
  recipientPageStats.value = {
    readCount,
    unreadCount: Math.max(0, list.length - readCount),
    total: list.length
  }
}

/** 详情汇总若未聚合已读，用当前页收件人状态回填（无筛选时更准） */
function syncDetailStatsFromRecipients(list: DirectedMessageRecipientItem[]) {
  if (!detail.value || recipientFilter.value.readStatus || recipientFilter.value.buildingNo.trim()) {
    return
  }
  const readCount = list.filter((r) => isReadStatus(r.readStatus || r.readStatusCode)).length
  const total = detail.value.recipientCount ?? list.length
  const unreadCount = Math.max(0, total - readCount)
  const apiRead = detail.value.readCount ?? 0
  if (apiRead === 0 && readCount > 0) {
    detail.value = {
      ...detail.value,
      readCount,
      unreadCount,
      readRate: total ? readCount / total : 0
    }
  } else if (detail.value.unreadCount == null && detail.value.readCount != null) {
    detail.value = {
      ...detail.value,
      unreadCount: Math.max(0, (detail.value.recipientCount ?? list.length) - detail.value.readCount)
    }
  }
}

function onSelectAllBuildings() {
  if (selectAllBuildings.value) form.value.filterBuildings = []
}

watch(
  () => form.value.filterBuildings,
  (list) => {
    if (list.length) selectAllBuildings.value = false
  },
  { deep: true }
)

function collectBuildings(list: ResidentItem[]) {
  const set = new Set(buildingOptions.value)
  const map = new Map(residentLookup.value)
  list.forEach((item) => {
    if (item.building) set.add(item.building)
    if (item.id) map.set(item.id, item)
  })
  buildingOptions.value = Array.from(set).sort((a, b) => a.localeCompare(b, 'zh-CN'))
  residentLookup.value = map
}

async function loadBuildingOptions() {
  try {
    let fetchPage = 1
    let fetchTotalPages = 1
    do {
      const res = await residentApi.list({
        page: fetchPage,
        pageSize: RESIDENT_LIST_PAGE_SIZE,
        propertyCompanyId: auth.propertyCompanyId || undefined
      })
      collectBuildings(res.list || [])
      fetchTotalPages = res.pagination?.totalPages ?? 1
      fetchPage += 1
    } while (fetchPage <= fetchTotalPages && fetchPage <= BUILDING_OPTIONS_MAX_PAGES)
  } catch (e) {
    console.error(e)
  }
}

function normalizeAgeList(data: { list: AgeBracketItem[] } | AgeBracketItem[]) {
  return Array.isArray(data) ? data : data.list || []
}

async function loadAgeBrackets() {
  ageLoading.value = true
  ageError.value = ''
  try {
    const data = await directedMessageApi.ageBrackets()
    ageBrackets.value = normalizeAgeList(data)
  } catch (e) {
    ageError.value = resolveError(e)
    ageBrackets.value = []
  } finally {
    ageLoading.value = false
  }
}

async function saveAgeBrackets() {
  ageSaving.value = true
  ageError.value = ''
  try {
    const data = await directedMessageApi.updateAgeBrackets(ageBrackets.value)
    ageBrackets.value = normalizeAgeList(data)
    formSuccess.value = '年龄段已保存'
  } catch (e) {
    ageError.value = resolveError(e)
  } finally {
    ageSaving.value = false
  }
}

async function loadTasks(p = page.value) {
  listLoading.value = true
  try {
    const res = await directedMessageApi.list({
      page: p,
      pageSize: PAGE_SIZE,
      propertyCompanyId: auth.propertyCompanyId || undefined
    })
    tasks.value = res.list || []
    page.value = res.pagination?.page ?? p
    totalPages.value = res.pagination?.totalPages ?? 1
  } catch (e) {
    console.error(e)
    tasks.value = []
  } finally {
    listLoading.value = false
  }
}

async function submitSend() {
  formError.value = ''
  formSuccess.value = ''
  const title = form.value.title.trim()
  const content = form.value.content.trim()
  if (!title || !content) {
    formError.value = '请填写标题和正文'
    return
  }
  const imageUrls = form.value.imageUrls.filter((s) => s.trim()).slice(0, 9)
  const merchantIds = form.value.merchantIdsText
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean)

  submitting.value = true
  try {
    const result = await directedMessageApi.create({
      title,
      content,
      imageUrls: imageUrls.length ? imageUrls : undefined,
      officialSenderType: form.value.officialSenderType,
      filterGender: form.value.filterGender,
      filterBuildings:
        selectAllBuildings.value || !form.value.filterBuildings.length
          ? undefined
          : [...form.value.filterBuildings],
      filterAgeBracketIds: form.value.filterAgeBracketIds.length
        ? [...form.value.filterAgeBracketIds]
        : undefined,
      merchantIds: merchantIds.length ? merchantIds : undefined,
      propertyCompanyId: auth.propertyCompanyId || undefined
    })
    formSuccess.value = `已发送，覆盖 ${result.recipientCount ?? 0} 人`
    form.value.title = ''
    form.value.content = ''
    form.value.imageUrls = []
    await loadTasks(1)
  } catch (e) {
    formError.value = resolveError(e)
  } finally {
    submitting.value = false
  }
}

async function openDetail(id: string) {
  detailOpen.value = true
  detailLoading.value = true
  detailError.value = ''
  detail.value = null
  recipients.value = []
  recipientPageStats.value = null
  currentTaskId.value = id
  recipientFilter.value = { readStatus: '', buildingNo: '' }
  try {
    detail.value = await directedMessageApi.get(id)
    await loadRecipients(1)
  } catch (e) {
    detailError.value = resolveError(e)
  } finally {
    detailLoading.value = false
  }
}

async function ensureResidentLookup(ids: string[]) {
  const missing = ids.filter(
    (id) => isLikelyResidentId(id) && !residentLookup.value.has(id)
  )
  if (!missing.length) return
  const map = new Map(residentLookup.value)
  await Promise.all(
    missing.slice(0, 50).map(async (id) => {
      try {
        const resident = await residentApi.get(id)
        if (resident?.id) map.set(resident.id, resident)
      } catch {
        /* 个别住户不可见时忽略，保留原始字段 */
      }
    })
  )
  residentLookup.value = map
}

function extractRecipientList(res: unknown): DirectedMessageRecipientItem[] {
  if (!res || typeof res !== 'object') return []
  const data = res as Record<string, unknown>
  const list =
    data.list || data.items || data.records || data.recipients || data.rows
  return Array.isArray(list) ? (list as DirectedMessageRecipientItem[]) : []
}

async function loadRecipients(p = 1) {
  if (!currentTaskId.value) return
  try {
    const res = await directedMessageApi.recipients(currentTaskId.value, {
      page: p,
      pageSize: 50,
      readStatus: recipientFilter.value.readStatus || undefined,
      buildingNo: recipientFilter.value.buildingNo.trim() || undefined
    })
    const rawList = extractRecipientList(res)
    const normalized = rawList.map((item) => normalizeRecipient(item))
    const lookupIds = [
      ...new Set(
        normalized
          .map((item) => item.residentId)
          .filter((id): id is string => Boolean(id) && isLikelyResidentId(id))
      )
    ]
    const needProfile = normalized.some((item) => !item.residentName || !item.buildingNo)
    if (needProfile && lookupIds.length) {
      await ensureResidentLookup(lookupIds)
    }
    const enriched = enrichRecipients(normalized)
    if (
      import.meta.env.DEV &&
      enriched.some((item) => !item.residentName) &&
      rawList[0]
    ) {
      console.warn(
        '[DirectedMessage] 收件人缺少姓名，原始字段：',
        Object.keys(rawList[0] as object),
        rawList[0]
      )
    }
    recipients.value = enriched
    updateRecipientPageStats(enriched)
    syncDetailStatsFromRecipients(enriched)
  } catch (e) {
    detailError.value = resolveError(e)
  }
}

onMounted(async () => {
  await Promise.all([loadBuildingOptions(), loadAgeBrackets(), loadTasks(1)])
})

watch(detailOpen, (open, wasOpen) => {
  if (wasOpen && !open) {
    loadTasks(page.value)
  }
})
</script>

<style scoped>
.page { max-width: 1200px; }
.header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 24px; gap: 16px; flex-wrap: wrap; }
.title { font-size: 24px; font-weight: 600; color: #1f1f2e; margin: 0 0 8px; }
.desc { font-size: 14px; color: #8c8c9a; margin: 0; }
.grid { display: grid; grid-template-columns: 1fr 1.2fr; gap: 20px; }
@media (max-width: 1100px) { .grid { grid-template-columns: 1fr; } }
.card, .ageCard { background: #fff; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.cardHead { font-size: 15px; font-weight: 500; color: #5c5c9e; margin-bottom: 20px; }
.form { display: flex; flex-direction: column; gap: 16px; }
.field { display: flex; flex-direction: column; gap: 8px; }
.label { font-size: 14px; font-weight: 500; color: #5c5c66; }
.input, .textarea { width: 100%; border: 1px solid #e8e8ec; border-radius: 8px; padding: 10px 14px; font-size: 14px; color: #1f1f2e; background: #fafafc; outline: none; box-sizing: border-box; font-family: inherit; }
.input:focus, .textarea:focus { border-color: #5c5c9e; background: #ffffff; }
.input.sm { width: 140px; }
.checkboxGroup { display: flex; flex-wrap: wrap; gap: 10px 16px; }
.checkbox { display: inline-flex; align-items: center; gap: 8px; font-size: 14px; color: #5c5c66; cursor: pointer; }
.note { font-size: 12px; color: #8c8c9a; margin-top: 6px; }
.checkbox input { accent-color: #5c5c9e; }
.ageRow { display: flex; gap: 8px; margin-bottom: 8px; flex-wrap: wrap; }
.table { width: 100%; border-collapse: collapse; font-size: 14px; }
.table th, .table td { padding: 14px 16px; text-align: left; vertical-align: middle; border-bottom: 1px solid #f0f0f3; color: #1f1f2e; }
.table th { color: #8c8c9a; font-weight: 500; background: #fafafc; }
.table tbody tr:last-child td { border-bottom: none; }
.linkBtn { border: none; background: none; color: #5c5c9e; padding: 0; cursor: pointer; font-size: 14px; }
.btnPrimary { padding: 10px 18px; border-radius: 8px; border: none; background: #5c5c9e; color: #ffffff; font-size: 14px; cursor: pointer; align-self: flex-start; transition: background 0.2s; }
.btnPrimary:hover { background: #52529a; }
.btnPrimary:disabled { opacity: 0.6; cursor: not-allowed; }
.btnSecondary { padding: 10px 18px; border-radius: 8px; border: 1px solid #e8e8ec; background: #ffffff; color: #5c5c66; font-size: 14px; cursor: pointer; }
.btnSecondary:hover:not(:disabled) { border-color: #5c5c9e; color: #5c5c9e; }
.btnSecondary:disabled { opacity: 0.6; cursor: not-allowed; }
.error { color: #e05c5c; font-size: 14px; }
.success { color: #3aaf7d; font-size: 14px; }
.hint { color: #8c8c9a; font-size: 14px; }
.pager { display: flex; align-items: center; gap: 12px; margin-top: 16px; }
.pageBtn { padding: 6px 12px; border: 1px solid #e8e8ec; border-radius: 8px; background: #fff; color: #5c5c66; font-size: 14px; cursor: pointer; }
.pageBtn:hover:not(:disabled) { border-color: #5c5c9e; color: #5c5c9e; }
.pageBtn:disabled { opacity: 0.5; cursor: not-allowed; }
.pageInfo { font-size: 14px; color: #8c8c9a; min-width: 48px; text-align: center; }
.modalOverlay { position: fixed; inset: 0; z-index: 1000; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; padding: 24px; }
.modal { background: #fff; border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.12); width: min(720px, 100%); max-height: 90vh; overflow: auto; display: flex; flex-direction: column; }
.modalWide { width: min(920px, 100%); }
.modalHeader { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid #f0f0f3; flex-shrink: 0; }
.modalTitle { font-size: 16px; font-weight: 600; color: #1f1f2e; margin: 0; }
.modalClose { width: 32px; height: 32px; border: none; background: transparent; font-size: 24px; line-height: 1; color: #8c8c9a; cursor: pointer; }
.modalClose:hover { color: #1f1f2e; }
.modalBody { padding: 24px; display: flex; flex-direction: column; gap: 16px; }
.detailGrid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 20px; font-size: 14px; color: #1f1f2e; }
.detailGrid .label { font-size: 12px; color: #8c8c9a; font-weight: 400; display: block; margin-bottom: 4px; }
.contentBlock { white-space: pre-wrap; background: #fafafc; padding: 14px 16px; border-radius: 8px; font-size: 14px; color: #1f1f2e; line-height: 1.6; }
.filtersRow { display: flex; gap: 8px; flex-wrap: wrap; }
@media (max-width: 768px) {
  .header { flex-direction: column; }
  .header .btnSecondary { width: 100%; }
  .card, .ageCard { padding: 18px; }
  .ageRow { display: grid; grid-template-columns: 1fr; }
  .ageRow .input.sm, .input.sm { width: 100%; }
  .grid { grid-template-columns: 1fr; gap: 16px; }
  .checkboxGroup { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  .mobileTaskList, .mobileRecipientList { display: flex; flex-direction: column; gap: 12px; }
  .mobileTaskCard, .mobileRecipientCard { border: 1px solid #f0f0f3; border-radius: 10px; padding: 14px; }
  .mobileTaskTop, .mobileTaskStats { display: flex; justify-content: space-between; gap: 10px; color: #8c8c9a; font-size: 12px; }
  .mobileTaskCard h3 { margin: 10px 0; font-size: 15px; color: #1f1f2e; }
  .mobileTaskStats { padding-bottom: 12px; }
  .mobileTaskCard .linkBtn { font-size: 13px; }
  .mobileRecipientCard { display: grid; gap: 8px; font-size: 13px; }
  .mobileRecipientCard strong { font-size: 14px; color: #1f1f2e; }
  .mobileRecipientCard div { display: flex; justify-content: space-between; gap: 16px; color: #1f1f2e; }
  .mobileRecipientCard div span:first-child { color: #8c8c9a; flex-shrink: 0; }
  .modalOverlay { align-items: flex-end; padding: 0; }
  .mobileSheet { width: 100%; max-height: calc(100vh - 24px); border-radius: 16px 16px 0 0; }
  .mobileSheet .modalHeader { padding: 16px 20px; }
  .mobileSheet .modalBody { padding: 20px; }
  .mobileSheet .detailGrid { grid-template-columns: 1fr; }
  .mobileSheet .filtersRow { flex-direction: column; }
}
</style>
