<template>
  <div class="page">
    <div class="header">
      <div>
        <h1 class="title">业主商户</h1>
        <p class="desc">申请审核、保证金管理、T+1 结算明细、分销商品收费周期与参数配置</p>
      </div>
      <div class="headerActions">
        <button type="button" class="btnSecondary" @click="openSettings">参数设置</button>
      </div>
    </div>

    <div class="tabs">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        type="button"
        class="tab"
        :class="{ active: activeTab === tab.key }"
        @click="switchTab(tab.key)"
      >
        {{ tab.label }}
      </button>
    </div>

    <div class="panel">
      <div v-if="loading" class="hint">加载中...</div>
      <p v-else-if="error" class="error">{{ error }}</p>

      <table v-else-if="activeTab === 'applications' && applications.length" class="table">
        <thead>
          <tr>
            <th>申请人</th>
            <th>小区</th>
            <th>保证金</th>
            <th>状态</th>
            <th>申请时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in applications" :key="item.id">
            <td>{{ item.residentName || item.residentId }} · {{ item.phone || '' }}</td>
            <td>{{ item.communityName || item.communityId || '—' }}</td>
            <td>{{ item.depositAmount ?? '—' }}（{{ item.depositStatus || '—' }}）</td>
            <td>{{ item.status || item.statusCode || '—' }}</td>
            <td>{{ item.createdAt || '—' }}</td>
            <td class="actions">
              <button type="button" class="linkBtn" @click="auditApp(item.id, AUDIT_RESULT.APPROVED)">
                通过
              </button>
              <button
                type="button"
                class="linkBtn danger"
                @click="auditApp(item.id, AUDIT_RESULT.REJECTED)"
              >
                拒绝
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <table v-else-if="activeTab === 'deposits' && deposits.length" class="table">
        <thead>
          <tr>
            <th>住户</th>
            <th>金额</th>
            <th>已扣</th>
            <th>状态</th>
            <th>时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in deposits" :key="item.id">
            <td>{{ item.residentName || item.residentId || '—' }}</td>
            <td>{{ item.amount ?? '—' }}</td>
            <td>{{ item.deductedAmount ?? 0 }}</td>
            <td>{{ item.status || item.statusCode || '—' }}</td>
            <td>{{ item.createdAt || '—' }}</td>
            <td>
              <button type="button" class="linkBtn" @click="openDeduct(item)">扣除</button>
            </td>
          </tr>
        </tbody>
      </table>

      <table v-else-if="activeTab === 'settlements' && settlements.length" class="table">
        <thead>
          <tr>
            <th>订单</th>
            <th>业主商户</th>
            <th>进货价</th>
            <th>售价</th>
            <th>抽成</th>
            <th>结算额</th>
            <th>状态</th>
            <th>时间</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in settlements" :key="item.id">
            <td>{{ item.orderId || '—' }}</td>
            <td>{{ item.residentName || item.residentMerchantId || '—' }}</td>
            <td>{{ item.wholesaleAmount ?? '—' }}</td>
            <td>{{ item.retailAmount ?? '—' }}</td>
            <td>{{ item.commissionAmount ?? '—' }}</td>
            <td>{{ item.settlementAmount ?? '—' }}</td>
            <td>{{ item.status || item.statusCode || '—' }}</td>
            <td>{{ item.settledAt || item.createdAt || '—' }}</td>
          </tr>
        </tbody>
      </table>

      <template v-else-if="activeTab === 'products'">
        <div class="productsToolbar">
          <select
            v-if="isPlatformAdmin"
            v-model="selectedPropertyId"
            class="input toolbarInput"
            @change="reloadProducts"
          >
            <option value="">请选择物业公司</option>
            <option v-for="pc in propertyCompanies" :key="pc.id" :value="pc.id">{{ pc.name }}</option>
          </select>
          <input
            v-model="productKeyword"
            class="input toolbarInput"
            placeholder="搜索商品名称"
            @keyup.enter="reloadProducts"
          />
          <button type="button" class="btnSecondary" :disabled="loading" @click="reloadProducts">搜索</button>
          <button type="button" class="btnPrimary" @click="openCreateProduct">新建分销商品</button>
        </div>
        <div v-if="isPlatformAdmin && !selectedPropertyId" class="productsNotice">
          <p class="hint">请先选择物业公司后再查看分销商品</p>
        </div>
        <table v-else-if="distributorProducts.length" class="table">
          <thead>
            <tr>
              <th>商品名称</th>
              <th>批发价</th>
              <th>建议零售价</th>
              <th>收费周期</th>
              <th>创建时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in distributorProducts" :key="item.id">
              <td>{{ item.name || item.id }}</td>
              <td>{{ item.wholesalePrice ?? '—' }}</td>
              <td>{{ item.suggestedRetailPrice ?? '—' }}</td>
              <td>{{ getEnumLabel(BILLING_CYCLE_LABEL, item.billingCycle) }}</td>
              <td>{{ item.createdAt || '—' }}</td>
              <td>
                <button type="button" class="linkBtn" @click="openBillingCycle(item)">设置周期</button>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-else class="productsNotice">
          <p class="hint">暂无分销商品</p>
          <p class="subHint">若刚新建仍看不到，可能是商品关联商家不在当前物业下。</p>
        </div>
        <div v-if="productTotalPages > 1" class="pager">
          <button type="button" class="pageBtn" :disabled="productPage <= 1 || loading" @click="changeProductPage(productPage - 1)">
            &lt;
          </button>
          <span>{{ productPage }} / {{ productTotalPages }}</span>
          <button
            type="button"
            class="pageBtn"
            :disabled="productPage >= productTotalPages || loading"
            @click="changeProductPage(productPage + 1)"
          >
            &gt;
          </button>
        </div>
      </template>

      <p
        v-else-if="
          !loading &&
          ((activeTab === 'applications' && !applications.length) ||
            (activeTab === 'deposits' && !deposits.length) ||
            (activeTab === 'settlements' && !settlements.length))
        "
        class="hint"
      >
        暂无数据
      </p>
    </div>

    <Teleport to="body">
      <div v-if="deductOpen" class="modalOverlay" @click.self="deductOpen = false">
        <div class="modal">
          <div class="modalHeader">
            <h3 class="modalTitle">扣除保证金</h3>
            <button type="button" class="modalClose" @click="deductOpen = false">&times;</button>
          </div>
          <div class="modalBody">
            <div class="field">
              <label class="label">扣除金额</label>
              <input v-model.number="deductForm.amount" type="number" min="0.01" step="0.01" class="input" />
            </div>
            <div class="field">
              <label class="label">原因</label>
              <textarea v-model="deductForm.reason" class="textarea" rows="3" />
            </div>
            <p v-if="deductError" class="error">{{ deductError }}</p>
            <div class="modalFooter">
              <button type="button" class="btnSecondary" @click="deductOpen = false">取消</button>
              <button type="button" class="btnPrimary" :disabled="deducting" @click="submitDeduct">
                {{ deducting ? '提交中...' : '确认扣除' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="settingsOpen" class="modalOverlay" @click.self="settingsOpen = false">
        <div class="modal">
          <div class="modalHeader">
            <h3 class="modalTitle">业主商户参数</h3>
            <button type="button" class="modalClose" @click="settingsOpen = false">&times;</button>
          </div>
          <div class="modalBody">
            <div class="field">
              <label class="label">默认保证金（元）</label>
              <input v-model.number="settings.defaultDepositAmount" type="number" min="0" class="input" />
            </div>
            <div class="field">
              <label class="label">平台抽成比例（0~1）</label>
              <input
                v-model.number="settings.platformCommissionRate"
                type="number"
                min="0"
                max="1"
                step="0.01"
                class="input"
              />
            </div>
            <div class="field">
              <label class="label">退货窗口（天）</label>
              <input v-model.number="settings.refundWindowDays" type="number" min="1" class="input" />
            </div>
            <p v-if="settingsError" class="error">{{ settingsError }}</p>
            <div class="modalFooter">
              <button type="button" class="btnSecondary" @click="settingsOpen = false">取消</button>
              <button type="button" class="btnPrimary" :disabled="settingsSaving" @click="saveSettings">
                {{ settingsSaving ? '保存中...' : '保存' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="billingCycleOpen" class="modalOverlay" @click.self="billingCycleOpen = false">
        <div class="modal">
          <div class="modalHeader">
            <h3 class="modalTitle">设置收费周期</h3>
            <button type="button" class="modalClose" @click="billingCycleOpen = false">&times;</button>
          </div>
          <div class="modalBody">
            <p class="hint">商品：{{ billingCycleTarget?.name || billingCycleTarget?.id }}</p>
            <div class="field">
              <label class="label">收费周期</label>
              <select v-model="billingCycleValue" class="input">
                <option v-for="opt in BILLING_CYCLE_OPTIONS" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
            </div>
            <p v-if="billingCycleError" class="error">{{ billingCycleError }}</p>
            <div class="modalFooter">
              <button type="button" class="btnSecondary" @click="billingCycleOpen = false">取消</button>
              <button type="button" class="btnPrimary" :disabled="billingCycleSaving" @click="submitBillingCycle">
                {{ billingCycleSaving ? '保存中...' : '保存' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="createProductOpen" class="modalOverlay" @click.self="createProductOpen = false">
        <div class="modal">
          <div class="modalHeader">
            <h3 class="modalTitle">新建分销商品</h3>
            <button type="button" class="modalClose" @click="createProductOpen = false">&times;</button>
          </div>
          <div class="modalBody">
            <div class="field">
              <label class="label">商品名称</label>
              <input v-model="createProductForm.name" class="input" maxlength="100" />
            </div>
            <div class="field">
              <label class="label">批发价</label>
              <input v-model.number="createProductForm.wholesalePrice" type="number" min="0" step="0.01" class="input" />
            </div>
            <div class="field">
              <label class="label">建议零售价</label>
              <input
                v-model.number="createProductForm.suggestedRetailPrice"
                type="number"
                min="0"
                step="0.01"
                class="input"
              />
            </div>
            <p v-if="createProductError" class="error">{{ createProductError }}</p>
            <div class="modalFooter">
              <button type="button" class="btnSecondary" @click="createProductOpen = false">取消</button>
              <button type="button" class="btnPrimary" :disabled="createProductSaving" @click="submitCreateProduct">
                {{ createProductSaving ? '提交中...' : '创建' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { distributorProductApi, propertyCompanyApi, residentMerchantAdminApi } from '../../api/services'
import { formatApiError } from '../../api/request'
import type {
  DistributorProductItem,
  PropertyCompanyItem,
  ResidentMerchantApplicationItem,
  ResidentMerchantDepositItem,
  ResidentMerchantSettlementItem,
  ResidentMerchantSettings
} from '../../api/types'
import {
  AUDIT_RESULT,
  BILLING_CYCLE,
  BILLING_CYCLE_LABEL,
  BILLING_CYCLE_OPTIONS,
  USER_ROLE,
  getEnumLabel
} from '../../constants/enums'
import { useAuthStore } from '../../stores/auth'

const auth = useAuthStore()
const isPlatformAdmin = computed(() => auth.profile?.role === USER_ROLE.PLATFORM_ADMIN)

const tabs = [
  { key: 'applications', label: '申请审核' },
  { key: 'deposits', label: '保证金' },
  { key: 'settlements', label: '结算明细' },
  { key: 'products', label: '分销商品' }
] as const

type TabKey = (typeof tabs)[number]['key']

const activeTab = ref<TabKey>('applications')
const loading = ref(false)
const error = ref('')
const applications = ref<ResidentMerchantApplicationItem[]>([])
const deposits = ref<ResidentMerchantDepositItem[]>([])
const settlements = ref<ResidentMerchantSettlementItem[]>([])
const distributorProducts = ref<DistributorProductItem[]>([])
const productKeyword = ref('')
const productPage = ref(1)
const productTotalPages = ref(1)
const propertyCompanies = ref<PropertyCompanyItem[]>([])
const selectedPropertyId = ref('')

const deductOpen = ref(false)
const deducting = ref(false)
const deductError = ref('')
const deductId = ref('')
const deductForm = ref({ amount: 0, reason: '' })

const settingsOpen = ref(false)
const settingsSaving = ref(false)
const settingsError = ref('')
const settings = ref<ResidentMerchantSettings>({
  defaultDepositAmount: 500,
  platformCommissionRate: 0,
  refundWindowDays: 7
})

const billingCycleOpen = ref(false)
const billingCycleSaving = ref(false)
const billingCycleError = ref('')
const billingCycleTarget = ref<DistributorProductItem | null>(null)
const billingCycleValue = ref(BILLING_CYCLE.ONE_TIME)

const createProductOpen = ref(false)
const createProductSaving = ref(false)
const createProductError = ref('')
const createProductForm = ref({
  name: '',
  wholesalePrice: 0,
  suggestedRetailPrice: 0
})

function resolveError(e: unknown) {
  return formatApiError(e, '操作失败')
}

function resolvePropertyCompanyId() {
  if (isPlatformAdmin.value) return selectedPropertyId.value || ''
  return auth.propertyCompanyId || selectedPropertyId.value || ''
}

async function loadPropertyCompanies() {
  if (!isPlatformAdmin.value) return
  try {
    const res = await propertyCompanyApi.list({ pageSize: 100 })
    propertyCompanies.value = res.list || []
    if (!selectedPropertyId.value && auth.propertyCompanyId) {
      selectedPropertyId.value = auth.propertyCompanyId
    }
  } catch (e) {
    error.value = resolveError(e)
  }
}

async function loadApplications() {
  const res = await residentMerchantAdminApi.applications({ page: 1, pageSize: 50 })
  applications.value = res.list || []
}

async function loadDeposits() {
  const res = await residentMerchantAdminApi.deposits({ page: 1, pageSize: 50 })
  deposits.value = res.list || []
}

async function loadSettlements() {
  const res = await residentMerchantAdminApi.settlements({ page: 1, pageSize: 50 })
  settlements.value = res.list || []
}

async function loadDistributorProducts(pageNo = 1) {
  const propertyCompanyId = resolvePropertyCompanyId()
  if (isPlatformAdmin.value && !propertyCompanyId) {
    distributorProducts.value = []
    productPage.value = 1
    productTotalPages.value = 1
    return
  }
  const res = await distributorProductApi.list({
    page: pageNo,
    pageSize: 20,
    keyword: productKeyword.value.trim() || undefined,
    propertyCompanyId: propertyCompanyId || undefined
  })
  distributorProducts.value = res.list || []
  productPage.value = res.pagination?.page ?? pageNo
  productTotalPages.value = res.pagination?.totalPages ?? 1
}

async function loadCurrent() {
  loading.value = true
  error.value = ''
  try {
    if (activeTab.value === 'applications') await loadApplications()
    else if (activeTab.value === 'deposits') await loadDeposits()
    else if (activeTab.value === 'settlements') await loadSettlements()
    else await loadDistributorProducts(1)
  } catch (e) {
    error.value = resolveError(e)
  } finally {
    loading.value = false
  }
}

function switchTab(key: TabKey) {
  activeTab.value = key
  loadCurrent()
}

function reloadProducts() {
  loadCurrent()
}

async function changeProductPage(next: number) {
  loading.value = true
  error.value = ''
  try {
    await loadDistributorProducts(next)
  } catch (e) {
    error.value = resolveError(e)
  } finally {
    loading.value = false
  }
}

async function auditApp(id: string, result: string) {
  try {
    await residentMerchantAdminApi.auditApplication(id, result)
    await loadApplications()
  } catch (e) {
    error.value = resolveError(e)
  }
}

function openDeduct(item: ResidentMerchantDepositItem) {
  deductId.value = item.id
  deductForm.value = { amount: 0, reason: '' }
  deductError.value = ''
  deductOpen.value = true
}

async function submitDeduct() {
  if (!deductForm.value.amount || !deductForm.value.reason.trim()) {
    deductError.value = '请填写扣除金额和原因'
    return
  }
  deducting.value = true
  deductError.value = ''
  try {
    await residentMerchantAdminApi.deductDeposit(
      deductId.value,
      deductForm.value.amount,
      deductForm.value.reason.trim()
    )
    deductOpen.value = false
    await loadDeposits()
  } catch (e) {
    deductError.value = resolveError(e)
  } finally {
    deducting.value = false
  }
}

async function openSettings() {
  settingsOpen.value = true
  settingsError.value = ''
  try {
    settings.value = {
      defaultDepositAmount: 500,
      platformCommissionRate: 0,
      refundWindowDays: 7,
      ...(await residentMerchantAdminApi.getSettings())
    }
  } catch (e) {
    settingsError.value = resolveError(e)
  }
}

async function saveSettings() {
  settingsSaving.value = true
  settingsError.value = ''
  try {
    await residentMerchantAdminApi.updateSettings(settings.value)
    settingsOpen.value = false
  } catch (e) {
    settingsError.value = resolveError(e)
  } finally {
    settingsSaving.value = false
  }
}

function openCreateProduct() {
  createProductForm.value = { name: '', wholesalePrice: 0, suggestedRetailPrice: 0 }
  createProductError.value = ''
  createProductOpen.value = true
}

async function submitCreateProduct() {
  if (!createProductForm.value.name.trim()) {
    createProductError.value = '请填写商品名称'
    return
  }
  createProductSaving.value = true
  createProductError.value = ''
  try {
    await distributorProductApi.create({
      name: createProductForm.value.name.trim(),
      wholesalePrice: Number(createProductForm.value.wholesalePrice) || 0,
      suggestedRetailPrice: Number(createProductForm.value.suggestedRetailPrice) || 0
    })
    createProductOpen.value = false
    await loadDistributorProducts(1)
  } catch (e) {
    createProductError.value = resolveError(e)
  } finally {
    createProductSaving.value = false
  }
}

function openBillingCycle(item: DistributorProductItem) {
  billingCycleTarget.value = item
  billingCycleValue.value = item.billingCycle || BILLING_CYCLE.ONE_TIME
  billingCycleError.value = ''
  billingCycleOpen.value = true
}

async function submitBillingCycle() {
  if (!billingCycleTarget.value) return
  billingCycleSaving.value = true
  billingCycleError.value = ''
  try {
    await distributorProductApi.updateBillingCycle(billingCycleTarget.value.id, {
      billingCycle: billingCycleValue.value
    })
    billingCycleOpen.value = false
    await loadDistributorProducts(productPage.value)
  } catch (e) {
    billingCycleError.value = resolveError(e)
  } finally {
    billingCycleSaving.value = false
  }
}

onMounted(async () => {
  if (!isPlatformAdmin.value) {
    selectedPropertyId.value = auth.propertyCompanyId || ''
  }
  await loadPropertyCompanies()
  await loadCurrent()
})
</script>

<style scoped>
.page { max-width: 1200px; }
.header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 24px; gap: 16px; flex-wrap: wrap; }
.headerActions { display: flex; gap: 8px; flex-wrap: wrap; }
.title { font-size: 24px; font-weight: 600; color: #1f1f2e; margin: 0 0 8px; }
.desc { font-size: 14px; color: #8c8c9a; margin: 0; }
.tabs { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
.tab { border: 1px solid #e8e8ec; background: #ffffff; border-radius: 8px; padding: 10px 18px; color: #5c5c66; font-size: 14px; cursor: pointer; }
.tab:hover { border-color: #5c5c9e; color: #5c5c9e; }
.tab.active { background: #5c5c9e; border-color: #5c5c9e; color: #ffffff; }
.panel { background: #fff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); overflow: hidden; overflow-x: auto; }
.productsToolbar { display: flex; align-items: center; justify-content: flex-end; gap: 12px; padding: 16px 24px 0; flex-wrap: wrap; }
.toolbarInput { width: 200px; max-width: 100%; padding: 10px 14px; border: 1px solid #e8e8ec; border-radius: 8px; font-size: 14px; box-sizing: border-box; }
.productsNotice { padding: 24px; text-align: center; }
.productsNotice .hint { padding: 0 0 8px; }
.subHint { margin: 0; font-size: 13px; color: #8c8c9a; }
.pager { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 16px 24px 24px; }
.pageBtn { padding: 6px 12px; border: 1px solid #e8e8ec; border-radius: 8px; background: #fff; cursor: pointer; }
.pageBtn:disabled { opacity: 0.5; cursor: not-allowed; }
.table { width: 100%; border-collapse: collapse; font-size: 14px; min-width: 800px; }
.table th, .table td { padding: 14px 24px; text-align: left; vertical-align: middle; border-bottom: 1px solid #f0f0f3; }
.table th { color: #8c8c9a; font-weight: 500; background: #fafafc; }
.table tbody td { color: #1f1f2e; }
.table tbody tr:last-child td { border-bottom: none; }
.actions { display: flex; gap: 12px; flex-wrap: wrap; }
.linkBtn { border: none; background: none; color: #5c5c9e; cursor: pointer; padding: 0; font-size: 14px; }
.linkBtn.danger { color: #e05c5c; }
.btnPrimary { padding: 10px 18px; border-radius: 8px; border: none; background: #5c5c9e; color: #ffffff; font-size: 14px; cursor: pointer; transition: background 0.2s; }
.btnPrimary:hover { background: #52529a; }
.btnPrimary:disabled { opacity: 0.6; cursor: not-allowed; }
.btnSecondary { padding: 10px 18px; border-radius: 8px; border: 1px solid #e8e8ec; background: #ffffff; color: #5c5c66; font-size: 14px; cursor: pointer; }
.btnSecondary:hover { border-color: #5c5c9e; color: #5c5c9e; }
.hint { color: #8c8c9a; font-size: 14px; padding: 24px; margin: 0; }
.error { color: #e05c5c; font-size: 14px; padding: 24px; margin: 0; }
.modalOverlay { position: fixed; inset: 0; z-index: 1000; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; padding: 24px; }
.modal { width: min(520px, 100%); max-height: 90vh; background: #fff; border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.12); overflow: auto; display: flex; flex-direction: column; }
.modalHeader { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid #f0f0f3; flex-shrink: 0; }
.modalTitle { font-size: 16px; font-weight: 600; color: #1f1f2e; margin: 0; }
.modalClose { width: 32px; height: 32px; border: none; background: transparent; font-size: 24px; line-height: 1; color: #8c8c9a; cursor: pointer; }
.modalClose:hover { color: #1f1f2e; }
.modalBody { padding: 24px; display: flex; flex-direction: column; gap: 16px; }
.modalFooter { display: flex; justify-content: flex-end; gap: 12px; padding-top: 8px; }
.field { display: flex; flex-direction: column; gap: 8px; }
.label { font-size: 13px; font-weight: 500; color: #5c5c66; }
.input, .textarea { width: 100%; border: 1px solid #e8e8ec; border-radius: 8px; padding: 10px 12px; font-size: 14px; color: #1f1f2e; background: #ffffff; outline: none; box-sizing: border-box; font-family: inherit; }
.input:focus, .textarea:focus { border-color: #5c5c9e; }
.textarea { resize: vertical; min-height: 80px; }
</style>
