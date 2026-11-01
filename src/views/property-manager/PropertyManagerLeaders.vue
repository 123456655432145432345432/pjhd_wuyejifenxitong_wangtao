<template>
  <div class="page" :class="{ mobilePage: isMobile }">
    <div class="header">
      <div>
        <h1 class="title">名下楼长</h1>
        <p class="desc">仅可指定本物业公司范围内的单元楼长；楼长分成将按比例向您抽成</p>
      </div>
      <button class="btnPrimary" :disabled="!canManage" @click="openCreate">指定楼长</button>
    </div>

    <p v-if="blockHint" class="blockHint">{{ blockHint }}</p>

    <div class="tablePanel">
      <div class="toolbar">
        <form class="search" @submit.prevent="applyFilters">
          <IconSvg name="search" />
          <input v-model="keyword" type="search" placeholder="搜索住户姓名、手机号" enterkeyhint="search" />
          <button type="submit" class="searchBtn">搜索</button>
        </form>
        <select v-model="status" class="filterSelect" @change="applyFilters">
          <option v-for="option in STATUS_OPTIONS" :key="option.value || 'all'" :value="option.value">
            {{ option.label }}
          </option>
        </select>
        <button class="btnSecondary" :disabled="loading" @click="applyFilters">刷新</button>
      </div>

      <div class="tableScroll">
        <table class="content">
          <thead>
            <tr>
              <th>住户</th>
              <th>手机号</th>
              <th>小区</th>
              <th>单元</th>
              <th>分成比例</th>
              <th>状态</th>
              <th>任命时间</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="7" class="emptyCell">加载中...</td>
            </tr>
            <tr v-else-if="loadError">
              <td colspan="7" class="emptyCell errorCell">
                <p>{{ loadError }}</p>
                <button type="button" class="retryBtn" @click="loadData(currentPage)">重新加载</button>
              </td>
            </tr>
            <tr v-else-if="!list.length">
              <td colspan="7" class="emptyCell">暂无数据</td>
            </tr>
            <tr v-for="item in list" v-else :key="item.id">
              <td>
                <div>{{ item.residentName || '—' }}</div>
                <div class="subText">{{ item.residentId || '—' }}</div>
              </td>
              <td>{{ item.residentPhone || item.phone || '—' }}</td>
              <td>{{ item.communityName || item.communityId || '—' }}</td>
              <td>{{ item.unit || item.building || '—' }}</td>
              <td>{{ formatRate(item.commissionRate) }}</td>
              <td>
                <span :class="['statusBadge', item.status || 'unknown']">
                  {{ getEnumLabel(BUILDING_LEADER_STATUS_LABEL, item.status) }}
                </span>
              </td>
              <td>{{ formatDateTime(item.appointedAt || item.createdAt) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="footer">
        <span>显示 {{ pageStart }} 到 {{ pageEnd }}，共 {{ total }} 条记录</span>
        <div v-if="totalPages > 1" class="pagination">
          <button class="pageBtn" :disabled="currentPage <= 1 || loading" @click="changePage(currentPage - 1)">
            &lt;
          </button>
          <span>{{ currentPage }} / {{ totalPages }}</span>
          <button
            class="pageBtn"
            :disabled="currentPage >= totalPages || loading"
            @click="changePage(currentPage + 1)"
          >
            &gt;
          </button>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="modalOpen" class="modalOverlay" @click.self="closeModal">
        <div class="modal">
          <div class="modalHeader">
            <h3 class="modalTitle">指定楼长</h3>
            <button type="button" class="modalClose" @click="closeModal">&times;</button>
          </div>
          <form class="modalBody" @submit.prevent="submit">
            <div class="field">
              <label class="fieldLabel">关联住户 <em>*</em></label>
              <ResidentSearchSelect v-model="form.residentId" :auto-open="true" @select="onResidentSelect" />
              <p class="fieldHint">仅可指定本物业公司范围内的住户。</p>
            </div>
            <div class="fieldRow">
              <div class="field half">
                <label class="fieldLabel">小区 ID（不填取住户所属小区）</label>
                <input v-model.trim="form.communityId" class="input" placeholder="住户未关联小区时必填" />
              </div>
              <div class="field half">
                <label class="fieldLabel">单元（不填取住户所属单元）</label>
                <input v-model.trim="form.unit" class="input" placeholder="如 1单元" />
              </div>
            </div>
            <div class="field">
              <label class="fieldLabel">分成比例（占物业分成，0 &lt; 比例 ≤ 1）<em>*</em></label>
              <input
                v-model.number="form.commissionRate"
                type="number"
                min="0.0001"
                max="1"
                step="0.001"
                class="input"
              />
              <p class="fieldHint">默认 0.1（10%）；同一小区同一单元同一时刻仅一名在任楼长。</p>
            </div>
            <div class="field">
              <label class="fieldLabel">备注</label>
              <textarea v-model.trim="form.description" class="textarea" rows="2" maxlength="200" placeholder="如 1单元楼长" />
            </div>
            <p v-if="formError" class="formError">{{ formError }}</p>
            <div class="modalFooter">
              <button type="button" class="btnSecondary" @click="closeModal">取消</button>
              <button type="submit" class="btnPrimary" :disabled="saving">
                {{ saving ? '保存中...' : '保存' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import IconSvg from '../../components/IconSvg.vue'
import ResidentSearchSelect from '../../components/ResidentSearchSelect.vue'
import { propertyManagerPortalApi } from '../../api/services'
import type { BuildingLeaderListItem, ResidentItem } from '../../api/types'
import { ApiError, formatApiError } from '../../api/request'
import {
  BUILDING_LEADER_STATUS,
  BUILDING_LEADER_STATUS_LABEL,
  getEnumLabel
} from '../../constants/enums'
import { useIsMobile } from '../../composables/useIsMobile'

const PAGE_SIZE = 20
const { isMobile } = useIsMobile()

const STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  { value: BUILDING_LEADER_STATUS.ACTIVE, label: '在任' },
  { value: BUILDING_LEADER_STATUS.INACTIVE, label: '已撤销' }
]

const loading = ref(true)
const loadError = ref('')
const blockHint = ref('')
const canManage = ref(true)
const list = ref<BuildingLeaderListItem[]>([])
const currentPage = ref(1)
const total = ref(0)
const totalPages = ref(1)
const keyword = ref('')
const status = ref('')

const modalOpen = ref(false)
const saving = ref(false)
const formError = ref('')
const form = reactive({
  residentId: '',
  communityId: '',
  unit: '',
  commissionRate: 0.1,
  description: ''
})

const pageStart = computed(() => (total.value ? (currentPage.value - 1) * PAGE_SIZE + 1 : 0))
const pageEnd = computed(() => Math.min(currentPage.value * PAGE_SIZE, total.value))

function formatRate(rate?: number) {
  if (rate === undefined || rate === null || Number.isNaN(Number(rate))) return '—'
  return `${(Number(rate) * 100).toFixed(1)}%`
}

function formatDateTime(value?: string) {
  return value ? value.replace('T', ' ').slice(0, 19) : '—'
}

/** 兼容后端偶发 snake_case */
function normalizeItem(item: BuildingLeaderListItem | Record<string, unknown>): BuildingLeaderListItem {
  const raw = item as Record<string, unknown>
  const pickStr = (...keys: string[]) => {
    for (const key of keys) {
      const value = raw[key]
      if (typeof value === 'string' && value.trim()) return value.trim()
    }
    return ''
  }
  const rate = raw.commissionRate ?? raw.commission_rate
  return {
    ...(item as BuildingLeaderListItem),
    id: pickStr('id', 'buildingLeaderId'),
    residentId: pickStr('residentId', 'resident_id') || undefined,
    residentName: pickStr('residentName', 'resident_name') || undefined,
    residentPhone: pickStr('residentPhone', 'resident_phone', 'phone') || undefined,
    communityId: pickStr('communityId', 'community_id') || undefined,
    communityName: pickStr('communityName', 'community_name') || undefined,
    building: pickStr('building') || undefined,
    unit: pickStr('unit') || undefined,
    description: pickStr('description') || undefined,
    status: pickStr('status') || undefined,
    commissionRate: rate === undefined || rate === null ? undefined : Number(rate),
    appointedAt: pickStr('appointedAt', 'appointed_at', 'createdAt', 'created_at') || undefined
  } as BuildingLeaderListItem
}

function describeIdentityError(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.code === 91005) return e.message || '当前账号不是物业经理'
    if (e.code === 91007) return e.message || '物业经理身份已停用'
  }
  return ''
}

async function loadData(page = currentPage.value) {
  loading.value = true
  loadError.value = ''
  blockHint.value = ''
  try {
    const res = await propertyManagerPortalApi.buildingLeaders({
      page,
      pageSize: PAGE_SIZE,
      keyword: keyword.value.trim() || undefined,
      status: status.value || undefined
    })
    list.value = (res.list || []).map((item) => normalizeItem(item))
    total.value = res.pagination?.total ?? list.value.length
    currentPage.value = res.pagination?.page ?? page
    totalPages.value = res.pagination?.totalPages ?? 1
    canManage.value = true
  } catch (error) {
    const hint = describeIdentityError(error)
    if (hint) {
      blockHint.value = hint
      canManage.value = false
      list.value = []
    } else {
      loadError.value = formatApiError(error, '楼长列表加载失败，请重试')
    }
  } finally {
    loading.value = false
  }
}

function applyFilters() {
  currentPage.value = 1
  void loadData(1)
}

function changePage(page: number) {
  if (page < 1 || page > totalPages.value || page === currentPage.value) return
  currentPage.value = page
  void loadData(page)
}

function onResidentSelect(item: ResidentItem) {
  form.residentId = item.id
  if (!form.communityId && item.communityId) form.communityId = item.communityId
  if (!form.unit && item.unit) form.unit = item.unit
}

function openCreate() {
  formError.value = ''
  Object.assign(form, { residentId: '', communityId: '', unit: '', commissionRate: 0.1, description: '' })
  modalOpen.value = true
}

function closeModal() {
  modalOpen.value = false
  formError.value = ''
}

function validateForm() {
  if (!form.residentId) {
    formError.value = '请选择住户'
    return false
  }
  const rate = Number(form.commissionRate)
  if (!Number.isFinite(rate) || rate <= 0 || rate > 1) {
    formError.value = '分成比例须大于 0 且不超过 1'
    return false
  }
  return true
}

async function submit() {
  if (!validateForm()) return
  saving.value = true
  formError.value = ''
  try {
    await propertyManagerPortalApi.appointBuildingLeader({
      residentId: form.residentId,
      communityId: form.communityId || undefined,
      unit: form.unit || undefined,
      commissionRate: Number(form.commissionRate),
      description: form.description || undefined
    })
    closeModal()
    await loadData(currentPage.value)
  } catch (error) {
    const hint = describeIdentityError(error)
    formError.value = hint || formatApiError(error, '保存失败')
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  void loadData(1)
})
</script>

<style scoped>
.page { max-width: 1100px; }
.mobilePage { max-width: none; }
.header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; gap: 12px; flex-wrap: wrap; }
.title { margin: 0 0 8px; font-size: 22px; color: #1f1f2e; }
.desc { margin: 0; color: #8c8c9a; font-size: 14px; max-width: 640px; }
.tablePanel { overflow: hidden; background: #fff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,.04); }
.toolbar { display: flex; align-items: center; gap: 12px; padding: 16px 20px; border-bottom: 1px solid #f0f0f3; flex-wrap: wrap; }
.search { display: flex; align-items: center; min-width: 260px; flex: 1; padding: 0 10px; border: 1px solid #e8e8ec; border-radius: 8px; }
.search input { min-width: 0; flex: 1; padding: 9px 8px; border: none; outline: none; }
.searchBtn { border: none; background: transparent; color: #5c5c9e; cursor: pointer; }
.filterSelect { padding: 9px 10px; border: 1px solid #e8e8ec; border-radius: 8px; background: #fff; }
.tableScroll { overflow-x: auto; }
.content { width: 100%; min-width: 820px; border-collapse: collapse; font-size: 14px; }
.content th, .content td { padding: 12px 14px; border-bottom: 1px solid #f0f0f3; text-align: left; }
.content th { color: #8c8c9a; font-weight: 500; background: #fafafc; }
.subText { margin-top: 3px; color: #a5a5ae; font-size: 12px; }
.statusBadge { display: inline-block; padding: 4px 9px; border-radius: 10px; white-space: nowrap; }
.statusBadge.active { color: #28845f; background: #ecfaf4; }
.statusBadge.inactive { color: #8c8c9a; background: #f2f2f5; }
.emptyCell { padding: 36px !important; text-align: center !important; color: #8c8c9a; }
.errorCell { color: #e05c5c; }
.retryBtn { margin-top: 8px; padding: 6px 12px; border: none; border-radius: 6px; background: #5c5c9e; color: #fff; cursor: pointer; }
.footer { display: flex; justify-content: space-between; align-items: center; padding: 14px 20px; color: #8c8c9a; font-size: 13px; }
.pagination { display: flex; align-items: center; gap: 10px; }
.pageBtn { padding: 5px 10px; border: 1px solid #e8e8ec; border-radius: 6px; background: #fff; cursor: pointer; }
.pageBtn:disabled { opacity: .45; cursor: not-allowed; }
.blockHint { margin: 0 0 16px; font-size: 13px; color: #e05c5c; background: #fff; border-radius: 12px; padding: 14px 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.modalOverlay { position: fixed; inset: 0; z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px; background: rgba(0,0,0,.45); }
.modal { width: min(520px, 100%); max-height: 90vh; overflow-y: auto; background: #fff; border-radius: 12px; }
.modalHeader { display: flex; align-items: center; justify-content: space-between; padding: 18px 22px; border-bottom: 1px solid #f0f0f3; }
.modalHeader h3 { margin: 0; font-size: 17px; }
.modalClose { border: none; background: none; color: #8c8c9a; font-size: 24px; cursor: pointer; }
.modalBody { padding: 22px; }
.field { margin-bottom: 14px; }
.fieldRow { display: flex; gap: 12px; }
.fieldRow .half { flex: 1; }
.fieldLabel { display: block; margin-bottom: 6px; color: #5c5c66; font-size: 13px; }
.fieldLabel em { color: #e05c5c; font-style: normal; }
.fieldHint { margin: 6px 0 0; font-size: 12px; color: #8c8c9a; }
.input, .textarea { width: 100%; padding: 9px 12px; border: 1px solid #e8e8ec; border-radius: 8px; box-sizing: border-box; font-family: inherit; }
.textarea { resize: vertical; }
.formError { color: #e05c5c; font-size: 13px; }
.modalFooter { display: flex; justify-content: flex-end; gap: 10px; margin-top: 16px; }
.btnPrimary, .btnSecondary { padding: 9px 16px; border-radius: 8px; cursor: pointer; }
.btnPrimary { border: none; background: #5c5c9e; color: #fff; }
.btnSecondary { border: 1px solid #e8e8ec; background: #fff; }
.btnPrimary:disabled { opacity: .55; cursor: not-allowed; }
@media (max-width: 640px) {
  .toolbar { align-items: stretch; }
  .search { min-width: 100%; }
  .fieldRow { flex-direction: column; gap: 0; }
}
</style>
