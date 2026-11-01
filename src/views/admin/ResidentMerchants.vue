<template>
  <div class="page">
    <div class="header">
      <div>
        <h1 class="title">业主商户</h1>
        <p class="desc">
          审核住户端「业主商户」二级分销申请（缴保证金后）。商品商家 / 技工 / 组长入驻请到「商家管理」。
          分销商品支持新建、编辑内容、设置收费周期与软删除。
        </p>
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
      <div v-if="activeTab === 'applications'" class="productsToolbar">
        <select
          v-if="isPlatformAdmin"
          v-model="selectedPropertyId"
          class="input toolbarInput"
          @change="loadCurrent"
        >
          <option value="">全部物业</option>
          <option v-for="pc in propertyCompanies" :key="pc.id" :value="pc.id">{{ pc.name }}</option>
        </select>
        <select v-model="applicationStatus" class="input toolbarInput" @change="loadCurrent">
          <option v-for="opt in RESIDENT_MERCHANT_STATUS_OPTIONS" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>
        <input
          v-model="applicationKeyword"
          class="input toolbarInput"
          placeholder="搜索住户姓名/手机号/店铺名称"
          @keyup.enter="loadCurrent"
        />
        <button type="button" class="btnSecondary" :disabled="loading" @click="loadCurrent">搜索</button>
      </div>

      <p v-if="toggleSuccess" class="bannerSuccess">{{ toggleSuccess }}</p>
      <p v-if="error" class="bannerError">{{ error }}</p>

      <div v-if="loading" class="hint">加载中...</div>

      <table v-else-if="activeTab === 'applications' && applications.length" class="table">
        <thead>
          <tr>
            <th>申请人</th>
            <th>店铺</th>
            <th>小区</th>
            <th>保证金</th>
            <th>状态</th>
            <th>对外展示</th>
            <th>申请时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in applications" :key="item.id">
            <td>{{ item.residentName || item.residentId }} · {{ item.phone || '' }}</td>
            <td>
              <div class="shopCell">
                <img v-if="item.coverUrl" :src="item.coverUrl" class="shopCover" alt="店铺封面" />
                <div class="shopMeta">
                  <div class="shopName">{{ item.shopName || '—' }}</div>
                  <div v-if="item.businessHours" class="shopSub">营业时间：{{ item.businessHours }}</div>
                  <div v-if="item.contactPhone" class="shopSub">联系电话：{{ item.contactPhone }}</div>
                  <div v-if="item.description" class="shopSub shopDesc">{{ item.description }}</div>
                </div>
              </div>
            </td>
            <td>{{ item.communityName || item.communityId || '—' }}</td>
            <td>{{ item.depositAmount ?? '—' }}（{{ getEnumLabel(RESIDENT_MERCHANT_DEPOSIT_STATUS_LABEL, item.depositStatus) }}）</td>
            <td>{{ applicationStatusLabel(item) }}</td>
            <td>
              <span class="visibilityTag" :class="item.visibility || 'private'">
                {{ visibilityLabel(item.visibility) }}
              </span>
            </td>
            <td>{{ item.createdAt || '—' }}</td>
            <td class="actions">
              <template v-if="canAuditApplication(item)">
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
              </template>
              <span v-else class="muted">—</span>
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
            <td>{{ getEnumLabel(RESIDENT_MERCHANT_DEPOSIT_STATUS_LABEL, item.status || item.statusCode) }}</td>
            <td>{{ item.createdAt || '—' }}</td>
            <td class="actions">
              <button type="button" class="linkBtn danger" @click="openDeduct(item)">扣除保证金</button>
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
            <td>{{ getEnumLabel(RESIDENT_MERCHANT_SETTLEMENT_STATUS_LABEL, item.status || item.statusCode) }}</td>
            <td>{{ item.settledAt || item.createdAt || '—' }}</td>
          </tr>
        </tbody>
      </table>

      <template v-else-if="activeTab === 'distributors'">
        <div class="productsToolbar">
          <select
            v-if="isPlatformAdmin"
            v-model="selectedPropertyId"
            class="input toolbarInput"
            @change="reloadDistributors"
          >
            <option value="">请选择物业公司</option>
            <option v-for="pc in propertyCompanies" :key="pc.id" :value="pc.id">{{ pc.name }}</option>
          </select>
          <input
            v-model="distributorKeyword"
            class="input toolbarInput"
            placeholder="搜索商家名称"
            @keyup.enter="reloadDistributors"
          />
          <button type="button" class="btnSecondary" :disabled="loading" @click="reloadDistributors">搜索</button>
        </div>
        <div class="distributorNotice">
          <p class="hint">开通后该商家可作为一级代理上架货源商品，并接收业主小店按件拿货的货款。</p>
          <p class="subHint">仅「审核通过（approved）」的商家可开通；已有货源商品在取消后保留（历史可追溯）。</p>
          <p v-if="distributorStateUnavailable" class="subHint warnHint">
            注意：后端商家列表暂未返回「一级代理」状态字段，本列仅反映本次页面上的操作结果；刷新页面后可能回到「未开通」。
            请以每次开通/取消后的提示为准（实际权限已在后端生效）。
          </p>
        </div>
        <div v-if="isPlatformAdmin && !selectedPropertyId" class="productsNotice">
          <p class="hint">请先选择物业公司后再查看商家</p>
        </div>
        <table v-else-if="distributors.length" class="table">
          <thead>
            <tr>
              <th>商家名称</th>
              <th>类目</th>
              <th>审核状态</th>
              <th>一级代理</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in distributors" :key="item.id">
              <td>{{ item.name || item.id }}</td>
              <td>{{ item.category || '—' }}</td>
              <td>{{ getEnumLabel(MERCHANT_AUDIT_STATUS_LABEL, item.auditStatus, '—') }}</td>
              <td>
                <span class="visibilityTag" :class="isDistributorOf(item) ? 'public' : 'private'">
                  {{ isDistributorOf(item) ? '已开通' : '未开通' }}
                </span>
              </td>
              <td class="actions">
                <button
                  v-if="!isDistributorOf(item)"
                  type="button"
                  class="linkBtn"
                  :disabled="togglingId === item.id"
                  @click="toggleDistributor(item, true)"
                >
                  {{ togglingId === item.id ? '开通中…' : '开通' }}
                </button>
                <button
                  v-else
                  type="button"
                  class="linkBtn danger"
                  :disabled="togglingId === item.id"
                  @click="toggleDistributor(item, false)"
                >
                  {{ togglingId === item.id ? '取消中…' : '取消' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-else class="productsNotice">
          <p class="hint">暂无商家</p>
          <p class="subHint">商品商家 / 技工 / 组长入驻请到「商家管理」。</p>
        </div>
        <div v-if="distributorTotalPages > 1" class="pager">
          <button
            type="button"
            class="pageBtn"
            :disabled="distributorPage <= 1 || loading"
            @click="changeDistributorPage(distributorPage - 1)"
          >
            &lt;
          </button>
          <span>{{ distributorPage }} / {{ distributorTotalPages }}</span>
          <button
            type="button"
            class="pageBtn"
            :disabled="distributorPage >= distributorTotalPages || loading"
            @click="changeDistributorPage(distributorPage + 1)"
          >
            &gt;
          </button>
        </div>
      </template>

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
          <p v-if="!propertyCompanies.length" class="subHint">
            物业列表为空：请确认超管已登录并刷新页面；若仍无选项，请检查物业公司列表接口是否正常。
          </p>
        </div>
        <table v-else-if="distributorProducts.length" class="table">
          <thead>
            <tr>
              <th>商品名称</th>
              <th>一级代理商家</th>
              <th>进货价</th>
              <th>建议零售价</th>
              <th>加价%</th>
              <th>库存(件)</th>
              <th>收费周期</th>
              <th>创建时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in distributorProducts" :key="item.id">
              <td>{{ item.name || item.id }}</td>
              <td>{{ item.distributorMerchantName || distributorNameMap[item.distributorMerchantId || ''] || item.distributorMerchantId || '—' }}</td>
              <td>{{ item.wholesalePrice ?? '—' }}</td>
              <td>{{ item.suggestedRetailPrice ?? '—' }}</td>
              <td>{{ markupPercent(item) }}</td>
              <td>{{ item.stock ?? '—' }}</td>
              <td>{{ getEnumLabel(BILLING_CYCLE_LABEL, item.billingCycle) }}</td>
              <td>{{ item.createdAt || '—' }}</td>
              <td class="actions">
                <button type="button" class="linkBtn" @click="openEditProduct(item)">编辑</button>
                <button type="button" class="linkBtn" @click="openBillingCycle(item)">设置周期</button>
                <button type="button" class="linkBtn danger" @click="removeProduct(item)">删除</button>
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
        {{ emptyHint }}
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
              <label class="label">平台抽成（自有商品，0~1）</label>
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
              <label class="label">平台抽成（经销商货品，0~1，默认 0.10）</label>
              <input
                v-model.number="settings.distributorProductCommissionRate"
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
            <h3 class="modalTitle">{{ editingProductId ? '编辑分销商品' : '新建分销商品' }}</h3>
            <button type="button" class="modalClose" @click="createProductOpen = false">&times;</button>
          </div>
          <div class="modalBody">
            <div class="field">
              <label class="label">一级代理商家 <em class="reqMark">*</em></label>
              <select v-model="createProductForm.distributorMerchantId" class="input" :disabled="!!editingProductId">
                <option value="">请选择一级代理商家</option>
                <option v-for="m in enabledDistributorOptions" :key="m.id" :value="m.id">{{ m.name }}</option>
              </select>
              <p class="subHint">
                {{
                  editingProductId
                    ? '货源商品归属的代理商家创建后不可修改'
                    : distributorStateUnavailable
                      ? '后端暂未返回代理状态，已列出全部已审核商家；未开通一级代理的商家提交时会被后端拒绝'
                      : '仅可选择已开通一级代理权限的商家（v8.11 必传）'
                }}
              </p>
            </div>
            <div class="field">
              <label class="label">商品名称</label>
              <input v-model="createProductForm.name" class="input" maxlength="100" />
            </div>
            <div class="field">
              <label class="label">进货价（一级代理批发价）</label>
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
            <div class="field">
              <label class="label">库存件数</label>
              <input v-model.number="createProductForm.stock" type="number" min="0" class="input" />
              <p class="subHint">业主小店按件拿货时从此库存扣减。</p>
            </div>
            <div class="field">
              <label class="label">服务区间</label>
              <select v-model="createProductForm.serviceScope" class="input">
                <option value="">不指定</option>
                <option v-for="opt in DISTRIBUTOR_SERVICE_SCOPE_OPTIONS" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
            </div>
            <p v-if="createProductError" class="error">{{ createProductError }}</p>
            <div class="modalFooter">
              <button type="button" class="btnSecondary" @click="createProductOpen = false">取消</button>
              <button type="button" class="btnPrimary" :disabled="createProductSaving" @click="submitCreateProduct">
                {{ createProductSaving ? '提交中...' : editingProductId ? '保存' : '创建' }}
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
import {
  distributorAdminApi,
  distributorProductApi,
  merchantApi,
  propertyCompanyApi,
  residentMerchantAdminApi
} from '../../api/services'
import { formatApiError } from '../../api/request'
import type {
  DistributorProductItem,
  MerchantItem,
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
  DISTRIBUTOR_SERVICE_SCOPE_OPTIONS,
  MERCHANT_AUDIT_STATUS,
  MERCHANT_AUDIT_STATUS_LABEL,
  RESIDENT_MERCHANT_STATUS,
  RESIDENT_MERCHANT_STATUS_LABEL,
  RESIDENT_MERCHANT_STATUS_OPTIONS,
  RESIDENT_MERCHANT_DEPOSIT_STATUS_LABEL,
  RESIDENT_MERCHANT_SETTLEMENT_STATUS_LABEL,
  RESIDENT_SHOP_VISIBILITY_LABEL,
  ENTITY_STATUS,
  USER_ROLE,
  getEnumLabel,
  isResidentMerchantPendingAudit
} from '../../constants/enums'
import { useAuthStore } from '../../stores/auth'

const auth = useAuthStore()
const isPlatformAdmin = computed(() => auth.profile?.role === USER_ROLE.PLATFORM_ADMIN)

function visibilityLabel(value?: string) {
  return getEnumLabel(RESIDENT_SHOP_VISIBILITY_LABEL, value, '不对外')
}

function markupPercent(item: { wholesalePrice?: number; suggestedRetailPrice?: number }) {
  const wholesale = Number(item.wholesalePrice)
  const retail = Number(item.suggestedRetailPrice)
  if (!Number.isFinite(wholesale) || wholesale <= 0 || !Number.isFinite(retail)) return '—'
  return `${(((retail - wholesale) / wholesale) * 100).toFixed(1)}%`
}

function applicationStatusLabel(item: ResidentMerchantApplicationItem) {
  const status = item.statusCode || item.status
  return getEnumLabel(RESIDENT_MERCHANT_STATUS_LABEL, status, '—')
}

function canAuditApplication(item: ResidentMerchantApplicationItem) {
  return isResidentMerchantPendingAudit(item.statusCode || item.status)
}

const tabs = [
  { key: 'applications', label: '申请审核' },
  { key: 'deposits', label: '保证金' },
  { key: 'settlements', label: '结算明细' },
  { key: 'distributors', label: '一级代理商家' },
  { key: 'products', label: '货源商品' }
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
// v8.11 §60.12 一级代理商家标签页
const distributors = ref<MerchantItem[]>([])
const distributorKeyword = ref('')
const distributorPage = ref(1)
const distributorTotalPages = ref(1)
const togglingId = ref('')
// 新建/编辑货源商品时的候选代理商家（仅已开通一级代理）
const distributorOptions = ref<MerchantItem[]>([])
/**
 * v8.11 临时兜底：后端 `GET /merchants` 暂未返回 `is_distributor`，
 * 导致状态列恒定显示「未开通」且下拉为空，故用本地状态覆盖显示。
 * 待后端补字段后（列表项返回 isDistributor）可移除本段兜底逻辑。
 */
const localDistributorState = ref<Record<string, boolean>>({})
const distributorStateUnavailable = ref(false)
const toggleSuccess = ref('')
let toggleSuccessTimer: ReturnType<typeof setTimeout> | undefined

function isDistributorOf(item: MerchantItem) {
  const local = item.id ? localDistributorState.value[item.id] : undefined
  return local ?? item.isDistributor ?? false
}

const enabledDistributorOptions = computed(() => {
  const all = distributorOptions.value
  const flagged = all.filter((m) => isDistributorOf(m))
  // 仅在「后端确实未返回状态字段」时才降级为「全部已审核商家」，由后端做最终校验；
  // 字段已回读时若商家一个都没开通，下拉就该为空（不能误列未开通商家）。
  if (distributorStateUnavailable.value && !flagged.length) return all
  return flagged
})
const distributorNameMap = computed(() => {
  const map: Record<string, string> = {}
  for (const m of [...distributorOptions.value, ...distributors.value]) {
    if (m.id && m.name) map[m.id] = m.name
  }
  return map
})
const propertyCompanies = ref<PropertyCompanyItem[]>([])
const selectedPropertyId = ref('')
const applicationStatus = ref(RESIDENT_MERCHANT_STATUS.PENDING_AUDIT)
/** v8.28：keyword 支持住户姓名/手机号 + 店铺名称 */
const applicationKeyword = ref('')

const emptyHint = computed(() => {
  if (activeTab.value === 'applications') {
    return '暂无业主商户申请。商品商家 / 技工 / 组长入驻请到「商家管理」，并筛选「待审核」。'
  }
  return '暂无数据'
})

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
  platformCommissionRate: 0.2,
  distributorProductCommissionRate: 0.1,
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
const editingProductId = ref('')
const createProductForm = ref({
  distributorMerchantId: '',
  name: '',
  wholesalePrice: 0,
  suggestedRetailPrice: 0,
  stock: 0,
  serviceScope: ''
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
    // list 第二参须为 true，否则无 Token，测服返回空列表
    const res = await propertyCompanyApi.list(
      { page: 1, pageSize: 100, status: ENTITY_STATUS.ACTIVE, sort: '-createdAt' },
      true
    )
    propertyCompanies.value = res.list || []
    if (!selectedPropertyId.value && propertyCompanies.value.length === 1) {
      selectedPropertyId.value = propertyCompanies.value[0].id
    } else if (!selectedPropertyId.value && auth.propertyCompanyId) {
      selectedPropertyId.value = auth.propertyCompanyId
    }
  } catch (e) {
    propertyCompanies.value = []
    error.value = resolveError(e)
  }
}

async function loadApplications() {
  const propertyCompanyId = resolvePropertyCompanyId() || undefined
  const status = applicationStatus.value
  const keyword = applicationKeyword.value.trim() || undefined
  const base = { page: 1, pageSize: 50, propertyCompanyId, keyword }

  if (status === RESIDENT_MERCHANT_STATUS.PENDING_AUDIT) {
    const [auditRes, reviewRes] = await Promise.all([
      residentMerchantAdminApi.applications({ ...base, status: RESIDENT_MERCHANT_STATUS.PENDING_AUDIT }),
      residentMerchantAdminApi
        .applications({ ...base, status: RESIDENT_MERCHANT_STATUS.PENDING_REVIEW })
        .catch(() => ({ list: [] as ResidentMerchantApplicationItem[] }))
    ])
    const merged = new Map<string, ResidentMerchantApplicationItem>()
    for (const item of [...(auditRes.list || []), ...(reviewRes.list || [])]) {
      merged.set(item.id, item)
    }
    applications.value = [...merged.values()]
    return
  }

  const res = await residentMerchantAdminApi.applications({ ...base, status })
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

// v8.11 §60.12：一级代理商家列表（商家表 is_distributor 标志）
async function loadDistributors(pageNo = 1) {
  const propertyCompanyId = resolvePropertyCompanyId()
  if (isPlatformAdmin.value && !propertyCompanyId) {
    distributors.value = []
    distributorPage.value = 1
    distributorTotalPages.value = 1
    return
  }
  const res = await merchantApi.list({
    page: pageNo,
    pageSize: 20,
    keyword: distributorKeyword.value.trim() || undefined,
    propertyCompanyId: propertyCompanyId || undefined,
    sort: '-createdAt'
  })
  distributors.value = res.list || []
  // 后端是否真的返回了一级代理状态字段：整页都取不到 ⇒ 未返回（触发兜底提示）
  distributorStateUnavailable.value =
    distributors.value.length > 0 &&
    distributors.value.every((m) => m.isDistributor === undefined)
  // v8.11.1：字段已回读后以接口为准，清空本地兜底状态，避免陈旧值覆盖真实数据
  if (!distributorStateUnavailable.value) {
    localDistributorState.value = {}
  }
  distributorPage.value = res.pagination?.page ?? pageNo
  distributorTotalPages.value = res.pagination?.totalPages ?? 1
}

// 新建/编辑货源商品时拉取候选代理商家（仅保留已开通一级代理的商家）
async function loadDistributorOptions() {
  const propertyCompanyId = resolvePropertyCompanyId()
  if (isPlatformAdmin.value && !propertyCompanyId) {
    distributorOptions.value = []
    return
  }
  try {
    const res = await merchantApi.list({
      page: 1,
      pageSize: 100,
      propertyCompanyId: propertyCompanyId || undefined,
      auditStatus: MERCHANT_AUDIT_STATUS.APPROVED
    })
    distributorOptions.value = res.list || []
    // 与「一级代理商家」列表同一判定：整批取不到字段 ⇒ 后端未回读
    // （覆盖用户先打开「货源商品」页、没进过一级代理列表的场景）
    if (distributorOptions.value.length) {
      distributorStateUnavailable.value = distributorOptions.value.every(
        (m) => m.isDistributor === undefined
      )
      if (!distributorStateUnavailable.value) localDistributorState.value = {}
    }
  } catch {
    distributorOptions.value = []
  }
}

async function loadCurrent() {
  loading.value = true
  error.value = ''
  try {
    if (activeTab.value === 'applications') await loadApplications()
    else if (activeTab.value === 'deposits') await loadDeposits()
    else if (activeTab.value === 'settlements') await loadSettlements()
    else if (activeTab.value === 'distributors') await loadDistributors(1)
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

function reloadDistributors() {
  loadCurrent()
}

async function changeDistributorPage(next: number) {
  loading.value = true
  error.value = ''
  try {
    await loadDistributors(next)
  } catch (e) {
    error.value = resolveError(e)
  } finally {
    loading.value = false
  }
}

function showToggleSuccess(text: string) {
  toggleSuccess.value = text
  if (toggleSuccessTimer) clearTimeout(toggleSuccessTimer)
  toggleSuccessTimer = setTimeout(() => {
    toggleSuccess.value = ''
  }, 6000)
}

async function toggleDistributor(item: MerchantItem, enable: boolean) {
  if (!enable && !confirm(`确认取消「${item.name || item.id}」的一级代理资格？历史货源商品将保留。`)) {
    return
  }
  togglingId.value = item.id
  error.value = ''
  toggleSuccess.value = ''
  const label = item.name || item.id
  try {
    if (enable) await distributorAdminApi.enable(item.id)
    else await distributorAdminApi.disable(item.id)
    // 后端确认成功后立即落地本地状态：列表接口不返回该字段时也能看到状态变化
    if (item.id) {
      localDistributorState.value = { ...localDistributorState.value, [item.id]: enable }
    }
    await Promise.all([loadDistributors(distributorPage.value), loadDistributorOptions()])
    showToggleSuccess(enable ? `已开通一级代理：${label}` : `已取消一级代理：${label}`)
  } catch (e) {
    error.value = resolveError(e)
  } finally {
    togglingId.value = ''
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
  editingProductId.value = ''
  createProductForm.value = {
    distributorMerchantId: '',
    name: '',
    wholesalePrice: 0,
    suggestedRetailPrice: 0,
    stock: 0,
    serviceScope: ''
  }
  createProductError.value = ''
  createProductOpen.value = true
  void loadDistributorOptions()
}

function openEditProduct(item: DistributorProductItem) {
  editingProductId.value = item.id
  createProductForm.value = {
    distributorMerchantId: item.distributorMerchantId || '',
    name: item.name || '',
    wholesalePrice: Number(item.wholesalePrice) || 0,
    suggestedRetailPrice: Number(item.suggestedRetailPrice) || 0,
    stock: Number(item.stock) || 0,
    serviceScope: item.serviceScope || ''
  }
  createProductError.value = ''
  createProductOpen.value = true
  void loadDistributorOptions()
}

async function submitCreateProduct() {
  if (!createProductForm.value.name.trim()) {
    createProductError.value = '请填写商品名称'
    return
  }
  if (!editingProductId.value && !createProductForm.value.distributorMerchantId) {
    createProductError.value = '请选择一级代理商家（v8.11 必传）'
    return
  }
  createProductSaving.value = true
  createProductError.value = ''
  try {
    const base = {
      name: createProductForm.value.name.trim(),
      wholesalePrice: Number(createProductForm.value.wholesalePrice) || 0,
      suggestedRetailPrice: Number(createProductForm.value.suggestedRetailPrice) || 0,
      stock: Number(createProductForm.value.stock) || 0,
      serviceScope: createProductForm.value.serviceScope || undefined
    }
    if (editingProductId.value) {
      // 归属商家创建后不可修改，编辑仅提交内容字段
      await distributorProductApi.update(editingProductId.value, base)
    } else {
      await distributorProductApi.create({
        ...base,
        distributorMerchantId: createProductForm.value.distributorMerchantId
      })
    }
    const reloadPage = editingProductId.value ? productPage.value : 1
    createProductOpen.value = false
    editingProductId.value = ''
    await loadDistributorProducts(reloadPage)
  } catch (e) {
    createProductError.value = resolveError(e)
  } finally {
    createProductSaving.value = false
  }
}

async function removeProduct(item: DistributorProductItem) {
  if (!confirm(`确认删除分销商品「${item.name || item.id}」？将软删除（下架），历史拿货记录保留。`)) return
  try {
    await distributorProductApi.remove(item.id)
    await loadDistributorProducts(productPage.value)
  } catch (e) {
    error.value = resolveError(e)
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
.actions { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
.muted { color: #8c8c9a; }
.visibilityTag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
}
.visibilityTag.public { background: #eaf7ee; color: #15803d; }
.visibilityTag.private { background: #f1f5f9; color: #64748b; }
.shopCell { display: flex; gap: 10px; align-items: flex-start; min-width: 180px; }
.shopCover { width: 44px; height: 44px; border-radius: 8px; object-fit: cover; flex-shrink: 0; background: #f5f5f7; }
.shopMeta { display: flex; flex-direction: column; gap: 2px; }
.shopName { font-weight: 600; color: #1f1f2e; }
.shopSub { font-size: 12px; color: #8c8c9a; }
.shopDesc { max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.btnPrimary { padding: 10px 18px; border-radius: 8px; border: none; background: #5c5c9e; color: #ffffff; font-size: 14px; cursor: pointer; transition: background 0.2s; }
.btnPrimary:hover { background: #52529a; }
.btnPrimary:disabled { opacity: 0.6; cursor: not-allowed; }
.btnSecondary { padding: 10px 18px; border-radius: 8px; border: 1px solid #e8e8ec; background: #ffffff; color: #5c5c66; font-size: 14px; cursor: pointer; }
.btnSecondary:hover { border-color: #5c5c9e; color: #5c5c9e; }
.hint { color: #8c8c9a; font-size: 14px; padding: 24px; margin: 0; }
.error { color: #e05c5c; font-size: 14px; padding: 24px; margin: 0; }
.bannerSuccess { font-size: 13px; color: #3aaf7d; background: #f0fdf4; border: 1px solid #d3f2df; border-radius: 8px; padding: 10px 14px; margin: 16px 24px 0; }
.bannerError { font-size: 13px; color: #e05c5c; background: #fff1f0; border: 1px solid #ffd9d6; border-radius: 8px; padding: 10px 14px; margin: 16px 24px 0; }
.warnHint { color: #b45309; }
.linkBtn:disabled { opacity: 0.5; cursor: not-allowed; }
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
