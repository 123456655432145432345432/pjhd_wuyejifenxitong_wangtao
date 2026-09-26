<template>
  <div class="page" :class="{ mobilePage: isMobile }">
    <div class="header">
      <div>
        <h1 class="title">价格审批</h1>
        <p class="desc">
          改价须先提交申请；仅物业领导可审批。平台管理员可跨物业提交与查看，无审批权限。
        </p>
      </div>
      <button v-if="canCreate" class="btnPrimary" @click="openCreate">发起申请</button>
    </div>

    <div class="toolbar">
      <select
        v-if="showCompanyFilter"
        v-model="filterPropertyCompanyId"
        class="input"
        @change="reload"
      >
        <option value="">全部物业公司</option>
        <option v-for="c in propertyCompanies" :key="c.id" :value="c.id">
          {{ c.name || c.id }}
        </option>
      </select>
      <select v-model="filterStatus" class="input" @change="reload">
        <option v-for="opt in PRICE_APPROVAL_STATUS_OPTIONS" :key="opt.value || 'all'" :value="opt.value">
          {{ opt.label }}
        </option>
      </select>
      <button class="btnPrimary" :disabled="loading" @click="reload">刷新</button>
    </div>

    <div class="panel">
      <div v-if="loading" class="hint">加载中...</div>
      <p v-else-if="error" class="error">{{ error }}</p>
      <table v-else-if="list.length" class="table" :class="{ mobileCards: isMobile }">
        <thead>
          <tr>
            <th>审批单号</th>
            <th v-if="showCompanyFilter">物业公司</th>
            <th>类型</th>
            <th>对象</th>
            <th>原值</th>
            <th>新值</th>
            <th>原因</th>
            <th>申请人</th>
            <th>状态</th>
            <th>申请时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in list" :key="item.id">
            <td class="monoCell" data-label="审批单号">
              <MobileCellText variant="nowrap">{{ item.id }}</MobileCellText>
            </td>
            <td v-if="showCompanyFilter" data-label="物业公司">
              <MobileCellText variant="primary">{{ companyLabel(item.propertyCompanyId) }}</MobileCellText>
            </td>
            <td data-label="类型">
              <MobileCellText variant="nowrap">{{ getEnumLabel(PRICE_APPROVAL_ITEM_TYPE_LABEL, item.itemType) }}</MobileCellText>
            </td>
            <td class="monoCell" data-label="对象">
              <MobileCellText variant="nowrap">{{ item.itemId || '—' }}</MobileCellText>
            </td>
            <td class="diffCell mono mCellStack" data-label="原值">
              <MobileCellText>{{ summarizeValue(item.oldValue) }}</MobileCellText>
            </td>
            <td class="diffCell mono mCellStack" data-label="新值">
              <MobileCellText>{{ summarizeValue(item.newValue) }}</MobileCellText>
            </td>
            <td class="reasonCell mCellStack" data-label="原因">
              <MobileCellText>{{ item.reason || '—' }}</MobileCellText>
            </td>
            <td data-label="申请人">
              <MobileCellText variant="primary">{{ applicantLabel(item) }}</MobileCellText>
            </td>
            <td data-label="状态">
              <span :class="['statusBadge', item.status]">
                {{ getEnumLabel(PRICE_APPROVAL_STATUS_LABEL, item.status) }}
              </span>
            </td>
            <td data-label="申请时间">
              <MobileCellText variant="nowrap">{{ item.createdAt || '—' }}</MobileCellText>
            </td>
            <td data-label="操作">
              <template v-if="canShowAudit(item)">
                <button class="linkBtn" @click="openAudit(item, true)">通过</button>
                <button class="linkBtn danger" @click="openAudit(item, false)">拒绝</button>
              </template>
              <span v-else-if="item.status === PRICE_APPROVAL_STATUS.PENDING" class="doneLabel">
                待领导审批
              </span>
              <span v-else class="doneLabel">已处理</span>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else class="hint">暂无审批记录</p>
      <div v-if="totalPages > 1" class="pager">
        <button class="pageBtn" :disabled="page <= 1" @click="changePage(page - 1)">&lt;</button>
        <span>{{ page }} / {{ totalPages }}</span>
        <button class="pageBtn" :disabled="page >= totalPages" @click="changePage(page + 1)">&gt;</button>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="auditModalOpen" class="modalOverlay" @click.self="closeAudit">
        <div class="modal modalWide" :class="{ mobileSheet: isMobile }">
          <div class="modalHeader">
            <h3 class="modalTitle">{{ auditApproved ? '通过审批' : '拒绝审批' }}</h3>
            <button class="modalClose" @click="closeAudit">&times;</button>
          </div>
          <div class="modalBody">
            <div class="auditInfo">
              <div class="infoRow"><span>单号</span><strong class="mono">{{ auditTarget?.id }}</strong></div>
              <div class="infoRow"><span>类型</span><strong>{{ getEnumLabel(PRICE_APPROVAL_ITEM_TYPE_LABEL, auditTarget?.itemType) }}</strong></div>
              <div class="infoRow"><span>对象</span><strong class="mono">{{ auditTarget?.itemId || '—' }}</strong></div>
              <div class="infoRow diffRow">
                <span>变更内容</span>
                <div v-if="auditDiff.length" class="diffTable">
                  <div class="diffHead"><span>字段</span><span>变更前</span><span>变更后</span></div>
                  <div v-for="row in auditDiff" :key="row.key" class="diffLine">
                    <span>{{ row.key }}</span>
                    <strong>{{ row.oldValue }}</strong>
                    <strong>{{ row.newValue }}</strong>
                  </div>
                </div>
                <div v-else class="rawDiff">
                  <strong class="mono">{{ auditTarget?.oldValue || '—' }}</strong>
                  <span>→</span>
                  <strong class="mono">{{ auditTarget?.newValue || '—' }}</strong>
                </div>
              </div>
              <div class="infoRow"><span>原因</span><strong>{{ auditTarget?.reason || '—' }}</strong></div>
            </div>
            <div class="field">
              <label class="label">备注{{ auditApproved ? '' : '（拒绝建议填写）' }}</label>
              <textarea v-model="auditRemark" class="textarea" rows="3" maxlength="200" />
            </div>
            <p v-if="formError" class="error">{{ formError }}</p>
            <div class="modalFooter">
              <button class="btnSecondary" @click="closeAudit">取消</button>
              <button class="btnPrimary" :disabled="submitting" @click="submitAudit">
                {{ submitting ? '提交中...' : (auditApproved ? '确认通过' : '确认拒绝') }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div v-if="createModalOpen" class="modalOverlay" @click.self="closeCreate">
        <div class="modal modalWide" :class="{ mobileSheet: isMobile }">
          <div class="modalHeader">
            <h3 class="modalTitle">发起价格审批</h3>
            <button class="modalClose" @click="closeCreate">&times;</button>
          </div>
          <div class="modalBody">
            <div v-if="showCompanyFilter" class="field">
              <label class="label">物业公司 <em class="required">*</em></label>
              <select
                v-model="createForm.propertyCompanyId"
                class="input fullInput"
                @change="onCreateCompanyChange"
              >
                <option value="">请选择物业公司</option>
                <option v-for="c in propertyCompanies" :key="c.id" :value="c.id">
                  {{ c.name || c.id }}
                </option>
              </select>
            </div>
            <div class="field">
              <label class="label">审批类型</label>
              <select v-model="createForm.itemType" class="input fullInput" @change="onCreateTypeChange">
                <option :value="PRICE_APPROVAL_ITEM_TYPE.PRODUCT_PRICE">商品价格</option>
                <option :value="PRICE_APPROVAL_ITEM_TYPE.MERCHANT_DISTRIBUTION">商家分成</option>
                <option :value="PRICE_APPROVAL_ITEM_TYPE.PROPERTY_FEE_PRICE">物业费价格</option>
                <option :value="PRICE_APPROVAL_ITEM_TYPE.RESIDENT_SHARE_RATE">积分分成比例</option>
                <option :value="PRICE_APPROVAL_ITEM_TYPE.DELIVERY_FEE">配送费</option>
              </select>
            </div>
            <div v-if="isProductType" class="field">
              <label class="label">商家</label>
              <select
                v-model="createMerchantId"
                class="input fullInput"
                :disabled="itemOptionsLoading"
                @change="onProductMerchantChange"
              >
                <option value="">{{ itemOptionsLoading ? '加载中...' : '请选择商家' }}</option>
                <option v-for="opt in merchantOptions" :key="opt.id" :value="opt.id">
                  {{ opt.label }}
                </option>
              </select>
            </div>
            <div class="field">
              <label class="label">{{ itemIdLabel }}</label>
              <select
                v-model="createForm.itemId"
                class="input fullInput"
                :disabled="itemOptionsLoading || (isProductType && !createMerchantId)"
                @change="onCreateItemChange"
              >
                <option value="">{{ itemSelectPlaceholder }}</option>
                <option v-for="opt in itemOptions" :key="opt.id" :value="opt.id">
                  {{ opt.label }}
                </option>
              </select>
              <p v-if="optionHint" class="optionHint">{{ optionHint }}</p>
            </div>
            <div class="fieldRow">
              <div class="field">
                <label class="label">变更前 · {{ valueFieldLabel }}</label>
                <input
                  v-model="createForm.oldAmount"
                  type="number"
                  step="any"
                  class="input fullInput"
                  :placeholder="valuePlaceholder"
                />
              </div>
              <div class="field">
                <label class="label">变更后 · {{ valueFieldLabel }} <em class="required">*</em></label>
                <input
                  v-model="createForm.newAmount"
                  type="number"
                  step="any"
                  class="input fullInput"
                  :placeholder="valuePlaceholder"
                />
              </div>
            </div>
            <p class="formHint">将按类型自动生成 JSON 提交；比例类请填 0~1（如 0.1 表示 10%）或百分数（如 10）。</p>
            <div class="field">
              <label class="label">申请原因</label>
              <textarea v-model="createForm.reason" class="textarea" rows="3" maxlength="200" />
            </div>
            <p v-if="createError" class="error">{{ createError }}</p>
            <div class="modalFooter">
              <button class="btnSecondary" @click="closeCreate">取消</button>
              <button class="btnPrimary" :disabled="creating" @click="submitCreate">
                {{ creating ? '提交中...' : '提交申请' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MobileCellText from '../../components/MobileCellText.vue'
import {
  configApi,
  merchantApi,
  merchantPortalApi,
  priceApprovalApi,
  propertyCompanyApi,
  residentApi
} from '../../api/services'
import type { MerchantItem, PriceApprovalItem, ProductItem, PropertyCompanyItem, ResidentItem } from '../../api/types'
import { ApiError } from '../../api/request'
import { normalizePageResult } from '../../utils/pageResult'
import {
  API_ERROR_CODE,
  getEnumLabel,
  PRICE_APPROVAL_ITEM_TYPE,
  PRICE_APPROVAL_ITEM_TYPE_LABEL,
  PRICE_APPROVAL_STATUS,
  PRICE_APPROVAL_STATUS_LABEL,
  PRICE_APPROVAL_STATUS_OPTIONS,
  ROLE_LABEL
} from '../../constants/enums'
import {
  canAuditPriceApproval,
  canCreatePriceApproval,
  isPlatformAdmin as checkPlatformAdmin
} from '../../constants/roles'
import { useAuthStore } from '../../stores/auth'
import { useIsMobile } from '../../composables/useIsMobile'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const { isMobile } = useIsMobile()
const isPlatformAdmin = computed(() => checkPlatformAdmin(auth.profile))
const canAudit = computed(() => canAuditPriceApproval(auth.profile))
const canCreate = computed(() => canCreatePriceApproval(auth.profile))
const showCompanyFilter = computed(() => isPlatformAdmin.value)

const loading = ref(false)
const error = ref('')
const list = ref<PriceApprovalItem[]>([])
const page = ref(1)
const totalPages = ref(1)
const filterStatus = ref('')
const filterPropertyCompanyId = ref('')
const propertyCompanies = ref<PropertyCompanyItem[]>([])

const auditModalOpen = ref(false)
const auditTarget = ref<PriceApprovalItem | null>(null)
const auditApproved = ref(true)
const auditRemark = ref('')
const submitting = ref(false)
const formError = ref('')
const createModalOpen = ref(false)
const creating = ref(false)
const createError = ref('')
const createForm = reactive({
  propertyCompanyId: '',
  itemType: PRICE_APPROVAL_ITEM_TYPE.PRODUCT_PRICE as string,
  itemId: '',
  oldAmount: '' as string | number,
  newAmount: '' as string | number,
  reason: ''
})

const isRateType = computed(() =>
  createForm.itemType === PRICE_APPROVAL_ITEM_TYPE.MERCHANT_DISTRIBUTION ||
  createForm.itemType === PRICE_APPROVAL_ITEM_TYPE.RESIDENT_SHARE_RATE
)

const valueFieldLabel = computed(() => (isRateType.value ? '比例' : '金额'))
const valuePlaceholder = computed(() => (isRateType.value ? '如 0.1 或 10' : '如 8'))
const itemIdLabel = computed(() => {
  switch (createForm.itemType) {
    case PRICE_APPROVAL_ITEM_TYPE.PRODUCT_PRICE:
      return '商品'
    case PRICE_APPROVAL_ITEM_TYPE.PROPERTY_FEE_PRICE:
      return '住户'
    case PRICE_APPROVAL_ITEM_TYPE.RESIDENT_SHARE_RATE:
      return '物业公司'
    default:
      return '商家'
  }
})
const isProductType = computed(() => createForm.itemType === PRICE_APPROVAL_ITEM_TYPE.PRODUCT_PRICE)
const itemSelectPlaceholder = computed(() => {
  if (itemOptionsLoading.value) return '加载中...'
  if (isProductType.value && !createMerchantId.value) return '请先选择商家'
  return `请选择${itemIdLabel.value}`
})

type CreateItemOption = { id: string; label: string; oldAmount: string | number | '' }
const itemOptions = ref<CreateItemOption[]>([])
const merchantOptions = ref<CreateItemOption[]>([])
const createMerchantId = ref('')
const itemOptionsLoading = ref(false)
const optionHint = ref('')

function currentCompanyId() {
  if (isPlatformAdmin.value) return createForm.propertyCompanyId || ''
  return auth.propertyCompanyId || auth.profile?.propertyCompanyId || ''
}

function toOldAmount(value: unknown): string | number | '' {
  if (value === undefined || value === null || value === '') return ''
  const num = Number(value)
  return Number.isNaN(num) ? '' : num
}

function fillOldAmount(value: unknown) {
  createForm.oldAmount = toOldAmount(value)
}

function merchantToOption(item: MerchantItem, type = createForm.itemType): CreateItemOption {
  return {
    id: item.id,
    label: item.name || item.id,
    oldAmount:
      type === PRICE_APPROVAL_ITEM_TYPE.MERCHANT_DISTRIBUTION
        ? toOldAmount(item.commissionRate)
        : toOldAmount(item.deliveryFee)
  }
}

async function fetchMerchants() {
  const companyId = currentCompanyId()
  const res = await merchantApi.list({
    page: 1,
    pageSize: 100,
    propertyCompanyId: companyId || undefined,
    sort: '-createdAt'
  })
  return normalizePageResult<MerchantItem>(res).list
}

async function fetchProducts(merchantId: string) {
  try {
    const res = await merchantPortalApi.products({
      merchantId,
      page: 1,
      pageSize: 100,
      sort: '-createdAt'
    })
    const list = normalizePageResult<ProductItem>(res).list
    if (list.length) return list
  } catch {
    // 管理端可能无商家门户商品权限，改走商家详情里的商品
  }
  const detail = await merchantApi.get(merchantId, currentCompanyId() || undefined) as MerchantItem & {
    products?: ProductItem[]
  }
  return detail.products || []
}

async function fetchResidents() {
  const companyId = currentCompanyId()
  const res = await residentApi.list({
    page: 1,
    pageSize: 100,
    propertyCompanyId: companyId || undefined,
    sort: '+building,+floor,+unit,+room'
  })
  return normalizePageResult<ResidentItem>(res).list
}

async function loadItemOptions() {
  itemOptions.value = []
  merchantOptions.value = []
  createMerchantId.value = ''
  createForm.itemId = ''
  createForm.oldAmount = ''
  optionHint.value = ''
  const type = createForm.itemType
  const companyId = currentCompanyId()
  itemOptionsLoading.value = true
  try {
    if (type === PRICE_APPROVAL_ITEM_TYPE.PRODUCT_PRICE) {
      const merchants = await fetchMerchants()
      merchantOptions.value = merchants.map((item) => merchantToOption(item))
      optionHint.value = merchants.length ? '请先选商家，再选商品' : '该物业下暂无商家'
    } else if (
      type === PRICE_APPROVAL_ITEM_TYPE.MERCHANT_DISTRIBUTION ||
      type === PRICE_APPROVAL_ITEM_TYPE.DELIVERY_FEE
    ) {
      const merchants = await fetchMerchants()
      itemOptions.value = merchants.map((item) => merchantToOption(item, type))
      optionHint.value = merchants.length ? '' : '该物业下暂无商家'
    } else if (type === PRICE_APPROVAL_ITEM_TYPE.PROPERTY_FEE_PRICE) {
      const residents = await fetchResidents()
      itemOptions.value = residents.map((item) => ({
        id: item.id,
        label:
          [item.name, item.phone, item.building, item.unit, item.room].filter(Boolean).join(' ') ||
          item.id,
        oldAmount: toOldAmount(item.arrearsAmount)
      }))
      optionHint.value = residents.length ? '' : '该物业下暂无住户'
    } else if (type === PRICE_APPROVAL_ITEM_TYPE.RESIDENT_SHARE_RATE) {
      if (isPlatformAdmin.value) {
        if (!propertyCompanies.value.length) await loadPropertyCompanies()
        itemOptions.value = propertyCompanies.value.map((item) => ({
          id: item.id,
          label: item.name || item.id,
          oldAmount: ''
        }))
      } else if (companyId) {
        itemOptions.value = [{ id: companyId, label: '当前物业公司', oldAmount: '' }]
        createForm.itemId = companyId
        await fillShareRateOldAmount(companyId)
      }
    }
  } catch (e) {
    itemOptions.value = []
    merchantOptions.value = []
    optionHint.value = e instanceof ApiError ? e.message : '选项加载失败'
  } finally {
    itemOptionsLoading.value = false
  }
}

async function fillShareRateOldAmount(companyId: string) {
  try {
    const detail = await configApi.propertyCompany(companyId)
    fillOldAmount(detail.residentPointShareRate)
  } catch {
    createForm.oldAmount = ''
  }
}

async function onProductMerchantChange() {
  createForm.itemId = ''
  createForm.oldAmount = ''
  itemOptions.value = []
  if (!createMerchantId.value) return
  itemOptionsLoading.value = true
  optionHint.value = ''
  try {
    const products = await fetchProducts(createMerchantId.value)
    itemOptions.value = products.map((item) => ({
      id: item.id,
      label: item.name || item.id,
      oldAmount: toOldAmount(item.price)
    }))
    optionHint.value = products.length ? '' : '该商家暂无商品'
  } catch (e) {
    optionHint.value = e instanceof ApiError ? e.message : '商品加载失败'
  } finally {
    itemOptionsLoading.value = false
  }
}

async function onCreateItemChange() {
  const selected = itemOptions.value.find((item) => item.id === createForm.itemId)
  if (!selected) {
    createForm.oldAmount = ''
    return
  }
  if (createForm.itemType === PRICE_APPROVAL_ITEM_TYPE.RESIDENT_SHARE_RATE) {
    await fillShareRateOldAmount(selected.id)
    return
  }
  fillOldAmount(selected.oldAmount)
}

async function onCreateCompanyChange() {
  createForm.newAmount = ''
  await loadItemOptions()
}

function canShowAudit(item: PriceApprovalItem) {
  return canAudit.value && item.status === PRICE_APPROVAL_STATUS.PENDING
}

function companyLabel(id?: string) {
  if (!id) return '—'
  const hit = propertyCompanies.value.find((c) => c.id === id)
  return hit?.name || id
}

function applicantLabel(item: PriceApprovalItem) {
  const roleText = item.applicantRole
    ? getEnumLabel(ROLE_LABEL, item.applicantRole, '—')
    : ''
  const name = item.applicantName || item.applicantId || '—'
  return roleText ? `${name}（${roleText}）` : name
}

function normalizeRate(raw: number) {
  if (Number.isNaN(raw)) return NaN
  return raw > 1 ? raw / 100 : raw
}

function buildValueJson(raw: string | number) {
  if (raw === '' || raw === null || raw === undefined) return null
  const num = typeof raw === 'number' ? raw : Number(raw)
  if (Number.isNaN(num)) return null
  if (isRateType.value) {
    const rate = normalizeRate(num)
    if (Number.isNaN(rate) || rate < 0 || rate > 1) return null
    return JSON.stringify({ rate })
  }
  if (createForm.itemType === PRICE_APPROVAL_ITEM_TYPE.PRODUCT_PRICE) {
    return JSON.stringify({ price: num })
  }
  return JSON.stringify({ amount: num })
}

function onCreateTypeChange() {
  createForm.itemId = ''
  createForm.oldAmount = ''
  createForm.newAmount = ''
  void loadItemOptions()
}

function parseJsonObject(value?: string): Record<string, unknown> | null {
  if (!value) return null
  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null
  } catch {
    return null
  }
}

const SHARE_RATE_FIELD_LABEL: Record<string, string> = {
  rate: '分成比例',
  residentPointShareRate: '业主分成',
  merchantPointShareRate: '商家分成',
  coinPointShareRate: '物业币分成',
  sharedPointShareRate: '共享分成',
  price: '价格',
  memberPrice: '会员价',
  amount: '金额'
}

function displayValue(value: unknown, key?: string) {
  if (value === undefined) return '—'
  if (value === null) return 'null'
  const isRateKey =
    !key ||
    key === 'rate' ||
    key.endsWith('ShareRate') ||
    key === '分成比例' ||
    key.includes('分成')
  if (isRateKey && typeof value === 'number' && value >= 0 && value <= 1) {
    return `${(value * 100).toFixed(1)}%`
  }
  return typeof value === 'object' ? JSON.stringify(value) : String(value)
}

function displayFieldKey(key: string) {
  return SHARE_RATE_FIELD_LABEL[key] || key
}

function summarizeValue(raw?: string) {
  if (!raw) return '—'
  const obj = parseJsonObject(raw)
  if (!obj) return raw.length > 48 ? `${raw.slice(0, 48)}…` : raw
  const keys = Object.keys(obj)
  if (keys.length === 1) {
    const key = keys[0]
    return `${displayFieldKey(key)} ${displayValue(obj[key], key)}`
  }
  return keys
    .slice(0, 2)
    .map((key) => `${displayFieldKey(key)} ${displayValue(obj[key], key)}`)
    .join('；') + (keys.length > 2 ? '…' : '')
}

const auditDiff = computed(() => {
  const oldObject = parseJsonObject(auditTarget.value?.oldValue)
  const newObject = parseJsonObject(auditTarget.value?.newValue)
  if (!oldObject || !newObject) return []
  const keys = [...new Set([...Object.keys(oldObject), ...Object.keys(newObject)])]
  return keys.map((key) => ({
    key: displayFieldKey(key),
    oldValue: displayValue(oldObject[key], key),
    newValue: displayValue(newObject[key], key)
  }))
})

async function loadPropertyCompanies() {
  if (!isPlatformAdmin.value) return
  try {
    const res = await propertyCompanyApi.list({ page: 1, pageSize: 100 })
    propertyCompanies.value = res.list || []
  } catch (e) {
    console.error(e)
  }
}

async function load(pageNo = 1) {
  loading.value = true
  error.value = ''
  try {
    const res = await priceApprovalApi.list({
      page: pageNo,
      pageSize: 20,
      status: filterStatus.value || undefined,
      // 领导勿传；平台仅在选中时传
      propertyCompanyId:
        isPlatformAdmin.value && filterPropertyCompanyId.value
          ? filterPropertyCompanyId.value
          : undefined
    })
    list.value = res.list || []
    page.value = res.pagination?.page ?? pageNo
    totalPages.value = res.pagination?.totalPages ?? 1
  } catch (e) {
    list.value = []
    if (e instanceof ApiError && (e.code === 20004 || e.code === 403)) {
      error.value = '无权限查看价格审批'
    } else {
      error.value = e instanceof ApiError ? e.message : '加载失败'
    }
  } finally {
    loading.value = false
  }
}

function reload() { load(1) }
function changePage(p: number) { load(p) }

function openAudit(item: PriceApprovalItem, approved: boolean) {
  if (!canShowAudit(item)) return
  auditTarget.value = item
  auditApproved.value = approved
  auditRemark.value = ''
  formError.value = ''
  auditModalOpen.value = true
}

function closeAudit() {
  auditModalOpen.value = false
  auditTarget.value = null
}

function openCreate() {
  createForm.propertyCompanyId =
    filterPropertyCompanyId.value || auth.propertyCompanyId || auth.profile?.propertyCompanyId || ''
  createForm.itemType = PRICE_APPROVAL_ITEM_TYPE.PRODUCT_PRICE
  createForm.itemId = ''
  createForm.oldAmount = ''
  createForm.newAmount = ''
  createForm.reason = ''
  createError.value = ''
  createModalOpen.value = true
  void loadItemOptions()
}

function closeCreate() {
  createModalOpen.value = false
}

async function submitCreate() {
  if (isPlatformAdmin.value && !createForm.propertyCompanyId) {
    createError.value = '请选择物业公司'
    return
  }
  if (!createForm.itemId) {
    createError.value = `请选择${itemIdLabel.value}`
    return
  }
  const newValue = buildValueJson(createForm.newAmount)
  if (!newValue) {
    createError.value = isRateType.value
      ? '请填写有效的变更后比例（0~1 或百分数，如 10）'
      : '请填写有效的变更后数值'
    return
  }
  const oldValue =
    createForm.oldAmount === '' || createForm.oldAmount === null
      ? undefined
      : buildValueJson(createForm.oldAmount) || undefined
  if (createForm.oldAmount !== '' && createForm.oldAmount != null && !oldValue) {
    createError.value = '变更前数值无效'
    return
  }
  creating.value = true
  createError.value = ''
  try {
    // 领导：不要塞 propertyCompanyId
    await priceApprovalApi.create({
      ...(isPlatformAdmin.value ? { propertyCompanyId: createForm.propertyCompanyId } : {}),
      itemType: createForm.itemType,
      itemId: createForm.itemId || undefined,
      oldValue,
      newValue,
      reason: createForm.reason.trim() || undefined
    })
    closeCreate()
    await load(1)
  } catch (e) {
    if (e instanceof ApiError && (e.code === 10001 || e.code === 97001)) {
      createError.value = e.message || '请检查物业公司与必填项'
    } else {
      createError.value = e instanceof ApiError ? e.message : '发起申请失败'
    }
  } finally {
    creating.value = false
  }
}

async function submitAudit() {
  if (!auditTarget.value) return
  if (!canAudit.value) {
    formError.value = '仅物业领导可审批'
    return
  }
  if (!auditApproved.value && !auditRemark.value.trim()) {
    formError.value = '拒绝时请填写备注'
    return
  }
  submitting.value = true
  formError.value = ''
  try {
    await priceApprovalApi.audit(auditTarget.value.id, {
      approved: auditApproved.value,
      remark: auditRemark.value.trim() || undefined
    })
    closeAudit()
    await load(page.value)
  } catch (e) {
    if (e instanceof ApiError && e.errorCode === API_ERROR_CODE.INVALID_SHARE_RATE_TOTAL) {
      formError.value = '审批未生效：业主、商家、物业币和共享积分分成比例合计必须为 100%'
    } else if (e instanceof ApiError && (e.code === 20004 || e.code === 403)) {
      formError.value = '无审批权限（仅物业领导可审批）'
    } else if (e instanceof ApiError && e.code === 60003) {
      formError.value = '该申请已审批过'
      await load(page.value)
    } else if (e instanceof ApiError && e.code === 10002) {
      formError.value = e.message || '通过时落库校验失败，申请仍为待审批'
    } else {
      formError.value = e instanceof ApiError ? e.message : '审批失败'
    }
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  await loadPropertyCompanies()
  await load(1)
  openCreateFromQuery()
})

watch(
  () => route.query.create,
  () => openCreateFromQuery()
)

function openCreateFromQuery() {
  if (route.query.create !== '1' || !canCreate.value) return
  openCreate()
  const nextQuery = { ...route.query }
  delete nextQuery.create
  void router.replace({ name: 'price-approvals', query: nextQuery })
}
</script>

<style scoped>
.page { max-width: 1280px; }
.header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 24px; }
.title { font-size: 24px; font-weight: 600; color: #1f1f2e; margin-bottom: 8px; }
.desc { font-size: 14px; color: #8c8c9a; }
.toolbar { display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
.input { padding: 10px 14px; border: 1px solid #e8e8ec; border-radius: 8px; font-size: 14px; }
.panel { background: #fff; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); overflow-x: auto; }
.table { width: 100%; border-collapse: collapse; font-size: 13px; }
.table th, .table td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #f0f0f3; vertical-align: top; }
.table th { color: #8c8c9a; font-weight: 500; background: #fafafc; white-space: nowrap; }
.reasonCell { max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.diffCell { max-width: 160px; font-size: 12px; word-break: break-all; }
.monoCell, .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; word-break: break-all; }
.statusBadge { display: inline-block; padding: 4px 10px; border-radius: 12px; font-size: 12px; }
.statusBadge.pending { background: #fff7e6; color: #d48806; }
.statusBadge.approved { background: #e6f7ee; color: #389e0d; }
.statusBadge.rejected { background: #fff1f0; color: #cf1322; }
.linkBtn { border: none; background: none; color: #5c5c9e; cursor: pointer; font-size: 13px; margin-right: 8px; }
.linkBtn.danger { color: #cf1322; }
.doneLabel { font-size: 12px; color: #8c8c9a; }
.btnPrimary { padding: 10px 18px; border-radius: 8px; background: #5c5c9e; color: #fff; border: none; cursor: pointer; }
.btnSecondary { padding: 10px 18px; border-radius: 8px; border: 1px solid #e8e8ec; background: #fff; cursor: pointer; }
.hint, .error { font-size: 14px; color: #8c8c9a; text-align: center; padding: 24px 0; }
.error { color: #e05c5c; }
.pager { display: flex; align-items: center; justify-content: center; gap: 12px; margin-top: 16px; }
.pageBtn { padding: 6px 12px; border: 1px solid #e8e8ec; border-radius: 8px; background: #fff; cursor: pointer; }
.modalOverlay { position: fixed; inset: 0; z-index: 1000; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; padding: 24px; }
.modal { background: #fff; border-radius: 12px; width: min(480px, 100%); max-height: 90vh; overflow: auto; }
.modalWide { width: min(560px, 100%); }
.modalHeader { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid #f0f0f3; }
.modalTitle { font-size: 16px; font-weight: 600; margin: 0; }
.modalClose { border: none; background: none; font-size: 24px; cursor: pointer; color: #8c8c9a; }
.modalBody { padding: 24px; }
.auditInfo { background: #fafafc; border-radius: 8px; padding: 12px 16px; margin-bottom: 16px; }
.infoRow { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; gap: 12px; }
.infoRow span { color: #8c8c9a; flex-shrink: 0; }
.required { color: #cf1322; font-style: normal; }
.diffRow { align-items: flex-start; }
.diffTable { flex: 1; min-width: 0; }
.diffHead, .diffLine { display: grid; grid-template-columns: minmax(80px, 1fr) repeat(2, minmax(100px, 1fr)); gap: 8px; padding: 6px 0; text-align: left; }
.diffHead { color: #8c8c9a; border-bottom: 1px solid #e8e8ec; }
.diffLine strong { font-size: 12px; word-break: break-all; }
.rawDiff { display: flex; align-items: center; justify-content: flex-end; gap: 8px; min-width: 0; }
.fullInput { width: 100%; box-sizing: border-box; }
.field { margin-bottom: 16px; }
.fieldRow { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.formHint { margin: -8px 0 16px; font-size: 12px; color: #8c8c9a; line-height: 1.5; }
.optionHint { margin: 6px 0 0; font-size: 12px; color: #8c8c9a; }
.label { display: block; font-size: 13px; color: #5c5c66; margin-bottom: 8px; }
.textarea { width: 100%; padding: 10px 12px; border: 1px solid #e8e8ec; border-radius: 8px; font-size: 14px; box-sizing: border-box; resize: vertical; font-family: inherit; }
.modalFooter { display: flex; justify-content: flex-end; gap: 12px; margin-top: 8px; }
@media (max-width: 768px) {
  .page { max-width: none; }
  .header { flex-direction: column; margin-bottom: 16px; }
  .title { font-size: 21px; }
  .header .btnPrimary { width: 100%; }
  .toolbar { display: grid; grid-template-columns: 1fr; gap: 8px; }
  .toolbar .btnPrimary { width: 100%; }
  .toolbar .input { width: 100%; min-width: 0; box-sizing: border-box; }
  .panel { padding: 12px; border-radius: 14px; }
  .mobileCards thead { display: none; }
  .mobileCards, .mobileCards tbody, .mobileCards tr, .mobileCards td { display: block; width: 100%; }
  .mobileCards tr { padding: 12px 0; border-bottom: 1px solid #f0f0f3; }
  .mobileCards td {
    display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;
    padding: 6px 0; text-align: right; border-bottom: none;
  }
  .mobileCards td::before {
    content: attr(data-label);
    color: #8c8c9a; text-align: left; flex-shrink: 0;
  }
  .mobileCards .reasonCell,
  .mobileCards .diffCell {
    max-width: none; overflow: visible; text-overflow: unset;
    white-space: normal;
  }
  .pager { justify-content: center; }
  .modalOverlay { padding: 0; align-items: flex-end; }
  .modal.mobileSheet { max-width: 100%; width: 100%; border-radius: 18px 18px 0 0; max-height: 90vh; }
  .infoRow { flex-direction: column; align-items: flex-start; }
  .diffHead, .diffLine { grid-template-columns: 1fr; }
  .rawDiff { flex-wrap: wrap; justify-content: flex-start; }
  .fieldRow { grid-template-columns: 1fr; }
}
</style>
