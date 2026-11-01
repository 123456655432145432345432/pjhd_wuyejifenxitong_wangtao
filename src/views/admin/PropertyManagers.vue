<template>
  <div class="page">
    <div class="header">
      <div>
        <h1 class="title">物业经理</h1>
        <p class="desc">
          物业公司经理为「住户 + 经理」复合身份：由管理端指派，可添加本物业单元楼长，并从楼长分成中按比例抽成。
          同一物业公司同一时刻仅允许一名在职经理；修改比例仅影响后续订单，已产生订单按下单快照结算。
        </p>
      </div>
      <button class="btnPrimary" @click="openCreate">指派物业经理</button>
    </div>

    <div class="tablePanel">
      <div class="toolbar">
        <form class="search" @submit.prevent="applyFilters">
          <IconSvg name="search" />
          <input
            v-model="keyword"
            type="search"
            placeholder="搜索住户姓名、手机号"
            enterkeyhint="search"
          />
          <button type="submit" class="searchBtn">搜索</button>
        </form>
        <select v-model="status" class="filterSelect" @change="applyFilters">
          <option v-for="option in STATUS_OPTIONS" :key="option.value || 'all'" :value="option.value">
            {{ option.label }}
          </option>
        </select>
        <select
          v-if="isPlatformAdmin"
          v-model="propertyCompanyId"
          class="filterSelect"
          @change="applyFilters"
        >
          <option value="">全部物业公司</option>
          <option v-for="pc in propertyCompanies" :key="pc.id" :value="pc.id">{{ pc.name }}</option>
        </select>
        <button class="btnSecondary" :disabled="loading" @click="applyFilters">刷新</button>
      </div>

      <div class="tableScroll">
        <table class="content">
          <thead>
            <tr>
              <th>住户</th>
              <th>手机号</th>
              <th>物业公司</th>
              <th>抽成比例</th>
              <th>状态</th>
              <th>创建时间</th>
              <th>操作</th>
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
                <div class="subText">{{ item.residentId || item.id || '—' }}</div>
              </td>
              <td>{{ item.residentPhone || '—' }}</td>
              <td>{{ item.propertyCompanyName || item.propertyCompanyId || '—' }}</td>
              <td>{{ formatRate(item.commissionRate) }}</td>
              <td>
                <span :class="['statusBadge', item.status || 'unknown']">
                  {{ getEnumLabel(STATUS_LABEL, item.status) }}
                </span>
              </td>
              <td>{{ formatDateTime(item.createdAt) }}</td>
              <td>
                <button type="button" class="linkBtn" @click="openEdit(item)">编辑</button>
                <button
                  v-if="item.status === STATUS.ACTIVE"
                  type="button"
                  class="linkBtn danger"
                  @click="disableManager(item)"
                >
                  停用
                </button>
              </td>
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
            <h3 class="modalTitle">{{ editingId ? '编辑物业经理' : '指派物业经理' }}</h3>
            <button type="button" class="modalClose" @click="closeModal">&times;</button>
          </div>
          <form class="modalBody" @submit.prevent="submit">
            <div v-if="!editingId" class="field">
              <label class="fieldLabel">关联住户 <em>*</em></label>
              <ResidentSearchSelect v-model="form.residentId" :auto-open="true" @select="onResidentSelect" />
              <p class="fieldHint">经理登录角色仍为住户；系统按该住户所属物业公司绑定，同物业仅允许一名在职经理。</p>
            </div>
            <div v-else class="auditInfo">
              <div><span>住户</span><strong>{{ editingName }}</strong></div>
              <div><span>物业公司</span><strong>{{ editingCompany }}</strong></div>
            </div>
            <div class="field">
              <label class="fieldLabel">抽成比例（占楼长分成，0 ≤ 比例 &lt; 1）</label>
              <input
                v-model.number="form.commissionRate"
                type="number"
                min="0"
                max="0.9999"
                step="0.001"
                class="input"
              />
              <p class="fieldHint">经理收益 = 楼长分成 × 比例；楼长实得 = 楼长分成 ×（1 − 比例）。默认 0（不抽成）。</p>
            </div>
            <div class="field">
              <label class="fieldLabel">状态</label>
              <select v-model="form.status" class="input">
                <option value="active">在职</option>
                <option value="inactive">停用</option>
              </select>
              <p class="fieldHint">将状态改为「在职」时会校验同物业唯一在职经理。</p>
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
import { adminPropertyManagerApi, propertyCompanyApi } from '../../api/services'
import type { PropertyCompanyItem, PropertyManagerListItem, ResidentItem } from '../../api/types'
import { ApiError, formatApiError } from '../../api/request'
import { ENTITY_STATUS, USER_ROLE, getEnumLabel } from '../../constants/enums'
import { useAuthStore } from '../../stores/auth'

const PAGE_SIZE = 20

/** §100 物业经理状态：active 在职 / inactive 停用 */
const STATUS = { ACTIVE: 'active', INACTIVE: 'inactive' } as const
const STATUS_LABEL: Record<string, string> = { active: '在职', inactive: '停用' }
const STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  { value: STATUS.ACTIVE, label: '在职' },
  { value: STATUS.INACTIVE, label: '停用' }
]

const auth = useAuthStore()
const isPlatformAdmin = computed(() => auth.profile?.role === USER_ROLE.PLATFORM_ADMIN)

const loading = ref(true)
const loadError = ref('')
const list = ref<PropertyManagerListItem[]>([])
const currentPage = ref(1)
const total = ref(0)
const totalPages = ref(1)

const keyword = ref('')
const status = ref('')
const propertyCompanyId = ref('')
const propertyCompanies = ref<PropertyCompanyItem[]>([])

const modalOpen = ref(false)
const editingId = ref('')
const editingName = ref('')
const editingCompany = ref('')
const saving = ref(false)
const formError = ref('')
const form = reactive({
  residentId: '',
  commissionRate: 0,
  status: 'active' as string
})

const pageStart = computed(() => (total.value ? (currentPage.value - 1) * PAGE_SIZE + 1 : 0))
const pageEnd = computed(() => Math.min(currentPage.value * PAGE_SIZE, total.value))

function formatRate(rate?: number) {
  if (rate === undefined || rate === null || Number.isNaN(Number(rate))) return '—'
  return `${(Number(rate) * 100).toFixed(2)}%`
}

function formatDateTime(value?: string) {
  return value ? value.replace('T', ' ').slice(0, 19) : '—'
}

/** 兼容后端偶发 snake_case */
function normalizeItem(item: PropertyManagerListItem | Record<string, unknown>): PropertyManagerListItem {
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
    ...(item as PropertyManagerListItem),
    id: pickStr('id', 'propertyManagerId', 'property_manager_id'),
    residentId: pickStr('residentId', 'resident_id') || undefined,
    residentName: pickStr('residentName', 'resident_name') || undefined,
    residentPhone: pickStr('residentPhone', 'resident_phone', 'phone') || undefined,
    propertyCompanyId: pickStr('propertyCompanyId', 'property_company_id') || undefined,
    propertyCompanyName: pickStr('propertyCompanyName', 'property_company_name') || undefined,
    commissionRate: rate === undefined || rate === null ? undefined : Number(rate),
    status: pickStr('status') || undefined,
    createdAt: pickStr('createdAt', 'created_at') || undefined
  }
}

async function loadPropertyCompanies() {
  if (!isPlatformAdmin.value) return
  try {
    const res = await propertyCompanyApi.list(
      { page: 1, pageSize: 100, status: ENTITY_STATUS.ACTIVE, sort: '-createdAt' },
      true
    )
    propertyCompanies.value = res.list || []
  } catch {
    propertyCompanies.value = []
  }
}

async function loadData(page = currentPage.value) {
  loading.value = true
  loadError.value = ''
  try {
    const res = await adminPropertyManagerApi.list({
      page,
      pageSize: PAGE_SIZE,
      keyword: keyword.value.trim() || undefined,
      status: status.value || undefined,
      propertyCompanyId: propertyCompanyId.value || undefined
    })
    list.value = (res.list || []).map((item) => normalizeItem(item))
    total.value = res.pagination?.total ?? list.value.length
    currentPage.value = res.pagination?.page ?? page
    totalPages.value = res.pagination?.totalPages ?? 1
  } catch (error) {
    loadError.value = formatApiError(error, '物业经理列表加载失败，请重试')
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
}

function openCreate() {
  editingId.value = ''
  formError.value = ''
  Object.assign(form, { residentId: '', commissionRate: 0, status: 'active' })
  modalOpen.value = true
}

function openEdit(item: PropertyManagerListItem) {
  editingId.value = item.id
  editingName.value = item.residentName || item.residentId || '—'
  editingCompany.value = item.propertyCompanyName || item.propertyCompanyId || '—'
  formError.value = ''
  Object.assign(form, {
    residentId: item.residentId || '',
    commissionRate: Number(item.commissionRate ?? 0) || 0,
    status: item.status || 'active'
  })
  modalOpen.value = true
}

function closeModal() {
  modalOpen.value = false
  formError.value = ''
}

function validateForm(isCreate: boolean) {
  if (isCreate && !form.residentId) {
    formError.value = '请选择住户'
    return false
  }
  const rate = Number(form.commissionRate)
  if (!Number.isFinite(rate) || rate < 0 || rate >= 1) {
    formError.value = '抽成比例须 ≥ 0 且小于 1'
    return false
  }
  if (form.status && form.status !== STATUS.ACTIVE && form.status !== STATUS.INACTIVE) {
    formError.value = '状态不合法'
    return false
  }
  return true
}

function describeError(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    if (error.code === 91006) return error.message || '该物业公司已存在在职物业经理，或该住户已有经理记录'
    if (error.code === 91008) return error.message || '不可修改自己的抽成比例'
    if (error.code === 30001) return error.message || '住户不存在'
    if (error.code === 20004) return error.message || '权限不足或跨物业操作'
  }
  return formatApiError(error, fallback)
}

async function submit() {
  const isCreate = !editingId.value
  if (!validateForm(isCreate)) return

  saving.value = true
  formError.value = ''
  try {
    if (isCreate) {
      await adminPropertyManagerApi.create({
        residentId: form.residentId,
        commissionRate: Number(form.commissionRate),
        status: form.status
      })
    } else {
      await adminPropertyManagerApi.update(editingId.value, {
        commissionRate: Number(form.commissionRate),
        status: form.status
      })
    }
    closeModal()
    await loadData(currentPage.value)
  } catch (error) {
    formError.value = describeError(error, '保存失败')
  } finally {
    saving.value = false
  }
}

async function disableManager(item: PropertyManagerListItem) {
  const label = item.residentName || item.residentPhone || item.id
  if (!confirm(`确认停用物业经理「${label}」？\n停用后楼长分成不再被抽成；已产生订单按下单快照结算。`)) return
  try {
    loadError.value = ''
    await adminPropertyManagerApi.disable(item.id)
    await loadData(currentPage.value)
  } catch (error) {
    loadError.value = describeError(error, '停用失败')
  }
}

onMounted(async () => {
  await loadPropertyCompanies()
  await loadData(1)
})
</script>

<style scoped>
.page { max-width: 1200px; }
.header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; gap: 12px; flex-wrap: wrap; }
.title { margin: 0 0 8px; font-size: 22px; color: #1f1f2e; }
.desc { margin: 0; color: #8c8c9a; font-size: 14px; max-width: 720px; }
.tablePanel { overflow: hidden; background: #fff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,.04); }
.toolbar { display: flex; align-items: center; gap: 12px; padding: 16px 20px; border-bottom: 1px solid #f0f0f3; flex-wrap: wrap; }
.search { display: flex; align-items: center; min-width: 260px; flex: 1; padding: 0 10px; border: 1px solid #e8e8ec; border-radius: 8px; }
.search input { min-width: 0; flex: 1; padding: 9px 8px; border: none; outline: none; }
.searchBtn { border: none; background: transparent; color: #5c5c9e; cursor: pointer; }
.filterSelect, .filterInput { padding: 9px 10px; border: 1px solid #e8e8ec; border-radius: 8px; background: #fff; }
.tableScroll { overflow-x: auto; }
.content { width: 100%; min-width: 900px; border-collapse: collapse; font-size: 14px; }
.content th, .content td { padding: 12px 14px; border-bottom: 1px solid #f0f0f3; text-align: left; }
.content th { color: #8c8c9a; font-weight: 500; background: #fafafc; }
.subText { margin-top: 3px; color: #a5a5ae; font-size: 12px; }
.statusBadge { display: inline-block; padding: 4px 9px; border-radius: 10px; white-space: nowrap; }
.statusBadge.active { color: #28845f; background: #ecfaf4; }
.statusBadge.inactive { color: #8c8c9a; background: #f2f2f5; }
.linkBtn { border: none; background: none; color: #5c5c9e; cursor: pointer; margin-right: 8px; }
.linkBtn.danger { color: #e05c5c; }
.emptyCell { padding: 36px !important; text-align: center !important; color: #8c8c9a; }
.errorCell { color: #e05c5c; }
.retryBtn { margin-top: 8px; padding: 6px 12px; border: none; border-radius: 6px; background: #5c5c9e; color: #fff; cursor: pointer; }
.footer { display: flex; justify-content: space-between; align-items: center; padding: 14px 20px; color: #8c8c9a; font-size: 13px; }
.pagination { display: flex; align-items: center; gap: 10px; }
.pageBtn { padding: 5px 10px; border: 1px solid #e8e8ec; border-radius: 6px; background: #fff; cursor: pointer; }
.pageBtn:disabled { opacity: .45; cursor: not-allowed; }
.modalOverlay { position: fixed; inset: 0; z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px; background: rgba(0,0,0,.45); }
.modal { width: min(520px, 100%); max-height: 90vh; overflow-y: auto; background: #fff; border-radius: 12px; }
.modalHeader { display: flex; align-items: center; justify-content: space-between; padding: 18px 22px; border-bottom: 1px solid #f0f0f3; }
.modalHeader h3 { margin: 0; font-size: 17px; }
.modalClose { border: none; background: none; color: #8c8c9a; font-size: 24px; cursor: pointer; }
.modalBody { padding: 22px; }
.field { margin-bottom: 14px; }
.fieldLabel { display: block; margin-bottom: 6px; color: #5c5c66; font-size: 13px; }
.fieldLabel em { color: #e05c5c; font-style: normal; }
.fieldHint { margin: 6px 0 0; font-size: 12px; color: #8c8c9a; }
.input { width: 100%; padding: 9px 12px; border: 1px solid #e8e8ec; border-radius: 8px; box-sizing: border-box; }
.auditInfo { padding: 12px 14px; border-radius: 8px; background: #fafafc; margin-bottom: 14px; }
.auditInfo div { display: flex; justify-content: space-between; gap: 16px; padding: 5px 0; }
.auditInfo span { color: #8c8c9a; }
.formError { color: #e05c5c; font-size: 13px; }
.modalFooter { display: flex; justify-content: flex-end; gap: 10px; margin-top: 16px; }
.btnPrimary, .btnSecondary { padding: 9px 16px; border-radius: 8px; cursor: pointer; }
.btnPrimary { border: none; background: #5c5c9e; color: #fff; }
.btnSecondary { border: 1px solid #e8e8ec; background: #fff; }
.btnPrimary:disabled { opacity: .55; cursor: not-allowed; }
@media (max-width: 640px) {
  .toolbar { align-items: stretch; }
  .search { min-width: 100%; }
}
</style>
