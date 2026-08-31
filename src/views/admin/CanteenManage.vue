<template>
  <div class="page">
    <header class="header">
      <div>
        <h1 class="title">社区食堂</h1>
        <p class="desc">
          新建食堂主店与窗口（与商城普通店隔离）、绑定供货关系、配置买额度手续费，并查询额度购买 / 定向充值 / 消费退款流水。买额度与充值在小程序商家端完成；管理端可给主商家手动加额度做测试。
        </p>
      </div>
    </header>

    <SegmentedControl v-model="section" :tabs="sectionTabs" />

    <p v-if="bannerError" class="bannerError">{{ bannerError }}</p>
    <p v-if="bannerSuccess" class="bannerSuccess">{{ bannerSuccess }}</p>

    <template v-if="section === 'config'">
      <div class="card">
        <div class="cardHead">创建食堂商家</div>
        <p class="cardDesc">
          必须用独立店主手机号新建食堂商家，不要把口福餐厅等普通商品店改成食堂。主商家（餐饮公司）可买额度、给住户充定向余额；窗口（麻辣烫等）走同一接口且 isMain 为否。店主须已在该物业注册，且不要和普通店共用手机号。
        </p>
        <div class="formGrid">
          <label class="field">
            <span>角色</span>
            <div class="roleRow">
              <label class="radio">
                <input v-model="createForm.role" type="radio" value="main" />
                主商家（餐饮公司）
              </label>
              <label class="radio">
                <input v-model="createForm.role" type="radio" value="sub" />
                子商家（窗口）
              </label>
            </div>
          </label>
          <label class="field">
            <span>商家名称</span>
            <input v-model.trim="createForm.name" class="input" :placeholder="createForm.role === 'main' ? '如：XX社区食堂（餐饮公司）' : '如：麻辣烫窗口'" />
          </label>
          <label class="field">
            <span>店主手机号</span>
            <input v-model.trim="createForm.contactPhone" class="input" maxlength="11" placeholder="该物业已注册住户，独立号码" />
          </label>
          <label class="field">
            <span>物业公司</span>
            <select
              v-if="isPlatformAdmin"
              v-model="createForm.propertyCompanyId"
              class="input"
              :disabled="companiesLoading"
            >
              <option value="">请选择物业公司</option>
              <option v-for="company in propertyCompanies" :key="company.id" :value="company.id">
                {{ company.name }}
              </option>
            </select>
            <input v-else class="input" :value="createForm.propertyCompanyId" disabled />
          </label>
          <label class="field">
            <span>经营类目</span>
            <input v-model.trim="createForm.category" class="input" placeholder="默认：社区食堂" />
          </label>
          <label class="field">
            <span>营业时间</span>
            <input v-model.trim="createForm.businessHours" class="input" placeholder="如 06:30-13:30" />
          </label>
          <label class="field span2">
            <span>地址</span>
            <input v-model.trim="createForm.address" class="input" />
          </label>
          <label class="field span2">
            <span>简介</span>
            <input v-model.trim="createForm.description" class="input" />
          </label>
        </div>
        <div class="row" style="margin-top: 12px">
          <button class="btnPrimary" :disabled="creating" @click="createMerchant">
            {{ creating ? '创建中...' : createForm.role === 'main' ? '创建主商家' : '创建窗口' }}
          </button>
        </div>
      </div>

      <div class="card">
        <div class="cardHead">食堂商家列表</div>
        <p class="cardDesc">仅展示 merchantType=canteen。角色以商家详情里的 isCanteenMainMerchant 为准（列表接口可能不带该字段）。</p>
        <div v-if="merchantsLoading" class="hint">加载中...</div>
        <div v-else-if="!merchants.length" class="hint">暂无食堂商家，请先创建主店和窗口。</div>
        <div v-else class="tableWrap">
          <table class="table">
            <thead>
              <tr>
                <th>名称</th>
                <th>角色</th>
                <th>类型</th>
                <th>店主手机</th>
                <th>状态</th>
                <th>审核</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="merchant in merchants" :key="merchant.id">
                <td>
                  {{ merchant.name || '未命名商家' }}
                  <small>{{ merchant.id }}</small>
                </td>
                <td>{{ merchant.isCanteenMainMerchant ? '主商家' : '窗口' }}</td>
                <td>{{ merchantTypeLabel(merchant.merchantType) }}</td>
                <td>{{ merchant.contactPhone || '—' }}</td>
                <td>{{ statusLabel(merchant.status, merchant.auditStatus) }}</td>
                <td>{{ merchant.auditStatus || '—' }}</td>
                <td>
                  <div class="ops">
                    <button
                      v-if="canOperateMerchant(merchant)"
                      class="btnLink"
                      :disabled="marking"
                      @click="setMainFor(merchant, !merchant.isCanteenMainMerchant)"
                    >
                      {{ merchant.isCanteenMainMerchant ? '取消主店' : '标为主店' }}
                    </button>
                    <button
                      v-if="canKickMerchant(merchant.status)"
                      class="btnLink danger"
                      :disabled="kickingId === merchant.id"
                      @click="openKick(merchant)"
                    >
                      踢出
                    </button>
                    <span v-else class="muted">已踢出</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="card">
        <div class="cardHead">购买额度手续费（内扣）</div>
        <p class="cardDesc">主商家购买额度时平台内扣比例，例如 2%：付 100 元到账 98 元额度。</p>
        <div class="row">
          <div class="inputWrap">
            <input
              v-model.number="feePercent"
              type="number"
              min="0"
              max="100"
              step="0.01"
              class="input"
            />
            <span class="unit">%</span>
          </div>
          <button class="btnPrimary" :disabled="settingsLoading || settingsSaving" @click="saveSettings">
            {{ settingsSaving ? '保存中...' : '保存费率' }}
          </button>
        </div>
      </div>

      <div class="card">
        <div class="cardHead">手动加额度（测试 / 运营兜底）</div>
        <p class="cardDesc">
          免手续费、无需支付，直接给食堂主商家入账可用充值额度，并生成一条已到账的额度流水。仅主商家可用；正式买额度仍走小程序。
        </p>
        <div class="row wrap">
          <select v-model="quotaAdjust.merchantId" class="input grow" :disabled="merchantsLoading">
            <option value="">请选择主商家</option>
            <option v-for="merchant in mainMerchants" :key="merchant.id" :value="merchant.id">
              {{ merchantLabel(merchant) }}
            </option>
          </select>
          <div class="inputWrap">
            <input
              v-model.number="quotaAdjust.amount"
              type="number"
              min="0.01"
              step="0.01"
              class="input"
              placeholder="入账额度"
            />
            <span class="unit">元</span>
          </div>
          <input v-model.trim="quotaAdjust.remark" class="input grow" placeholder="备注（可选，仅记录）" />
          <button class="btnPrimary" :disabled="quotaAdjusting" @click="adjustQuota">
            {{ quotaAdjusting ? '入账中...' : '入账额度' }}
          </button>
        </div>
        <p v-if="quotaAdjustHint" class="hint">{{ quotaAdjustHint }}</p>
      </div>

      <div class="card">
        <div class="cardHead">标记 / 取消主商家</div>
        <p class="cardDesc">仅对已有食堂商家有效。不要对普通商品店调用此接口。取消标记不会自动解绑已有窗口，该店仍是食堂类型，只是不能再买额度/充值。</p>
        <div class="row wrap">
          <select v-model="mainMarkMerchantId" class="input grow" :disabled="merchantsLoading">
            <option value="">请选择食堂商家</option>
            <option v-for="merchant in merchants" :key="merchant.id" :value="merchant.id">
              {{ merchantLabel(merchant) }}
            </option>
          </select>
          <button class="btnPrimary" :disabled="marking" @click="setMain(true)">标记为主商家</button>
          <button class="btnDanger" :disabled="marking" @click="setMain(false)">取消主商家</button>
        </div>
      </div>

      <div class="card">
        <div class="cardHead">绑定窗口到主店</div>
        <p class="cardDesc">主店与窗口须同属食堂类型且同一物业。供货优惠比例默认 20%（仅记录，不自动打款）。一个窗口可绑多个主店。</p>
        <div class="row wrap">
          <select v-model="bindForm.mainMerchantId" class="input grow" :disabled="merchantsLoading">
            <option value="">请选择主商家</option>
            <option v-for="merchant in mainMerchants" :key="merchant.id" :value="merchant.id">
              {{ merchantLabel(merchant) }}
            </option>
          </select>
          <select v-model="bindForm.subMerchantId" class="input grow" :disabled="merchantsLoading">
            <option value="">请选择窗口</option>
            <option v-for="merchant in windowMerchants" :key="merchant.id" :value="merchant.id">
              {{ merchantLabel(merchant) }}
            </option>
          </select>
          <div class="inputWrap">
            <input
              v-model.number="bindForm.discountPercent"
              type="number"
              min="0"
              max="100"
              step="0.01"
              class="input"
            />
            <span class="unit">%</span>
          </div>
          <button class="btnPrimary" :disabled="binding" @click="createBinding">
            {{ binding ? '绑定中...' : '绑定' }}
          </button>
        </div>
      </div>

      <div class="card">
        <div class="cardHead">绑定列表</div>
        <div class="row wrap">
          <select v-model="bindingFilter.mainMerchantId" class="input grow">
            <option value="">全部主商家</option>
            <option v-for="merchant in mainMerchants" :key="merchant.id" :value="merchant.id">
              {{ merchantLabel(merchant) }}
            </option>
          </select>
          <select v-model="bindingFilter.subMerchantId" class="input grow">
            <option value="">全部窗口</option>
            <option v-for="merchant in windowMerchants" :key="merchant.id" :value="merchant.id">
              {{ merchantLabel(merchant) }}
            </option>
          </select>
          <button class="btnSecondary" :disabled="bindingsLoading" @click="loadBindings(1)">查询</button>
        </div>
        <div v-if="bindingsLoading" class="hint">加载中...</div>
        <div v-else-if="!bindings.length" class="hint">暂无绑定</div>
        <div v-else class="tableWrap">
          <table class="table">
            <thead>
              <tr>
                <th>主商家</th>
                <th>子商家</th>
                <th>供货优惠</th>
                <th>状态</th>
                <th>创建时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in bindings" :key="item.id">
                <td>{{ item.mainMerchantName || merchantName(item.mainMerchantId) }}</td>
                <td>{{ item.subMerchantName || merchantName(item.subMerchantId) }}</td>
                <td>
                  <div class="rateEdit">
                    <input
                      :value="rateDrafts[item.id] ?? rateToPercent(item.supplyDiscountRate)"
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      class="input sm"
                      @input="onRateDraft(item.id, $event)"
                    />
                    <span class="unit">%</span>
                    <button
                      class="btnLink"
                      :disabled="rateSavingId === item.id || item.status !== CANTEEN_BINDING_STATUS.ACTIVE"
                      @click="saveRate(item)"
                    >
                      保存
                    </button>
                  </div>
                </td>
                <td>{{ bindingStatusLabel(item.status) }}</td>
                <td>{{ formatTime(item.createdAt) }}</td>
                <td>
                  <button
                    v-if="item.status === CANTEEN_BINDING_STATUS.ACTIVE"
                    class="btnLink danger"
                    :disabled="unbindingId === item.id"
                    @click="unbind(item)"
                  >
                    解绑
                  </button>
                  <span v-else class="muted">—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <footer v-if="bindingsTotal > PAGE_SIZE" class="pager">
          <span>共 {{ bindingsTotal }} 条</span>
          <button :disabled="bindingsPage <= 1" @click="loadBindings(bindingsPage - 1)">上一页</button>
          <span>{{ bindingsPage }} / {{ bindingsTotalPages }}</span>
          <button :disabled="bindingsPage >= bindingsTotalPages" @click="loadBindings(bindingsPage + 1)">下一页</button>
        </footer>
      </div>
    </template>

    <template v-else>
      <div class="card">
        <SegmentedControl v-model="flowTab" :tabs="flowTabs" />
        <div class="row wrap" style="margin-top: 14px">
          <select
            v-if="flowTab !== 'recharge'"
            v-model="flowFilter.merchantId"
            class="input grow"
          >
            <option value="">{{ flowTab === 'quota' ? '全部主商家' : '全部消费窗口' }}</option>
            <option
              v-for="merchant in flowTab === 'quota' ? mainMerchants : activeMerchants"
              :key="merchant.id"
              :value="merchant.id"
            >
              {{ merchantLabel(merchant) }}
            </option>
          </select>
          <select
            v-if="flowTab !== 'quota'"
            v-model="flowFilter.mainMerchantId"
            class="input grow"
          >
            <option value="">全部主商家</option>
            <option v-for="merchant in mainMerchants" :key="merchant.id" :value="merchant.id">
              {{ merchantLabel(merchant) }}
            </option>
          </select>
          <ResidentSearchSelect
            v-if="flowTab !== 'quota'"
            v-model="flowFilter.residentId"
            class="grow"
          />
          <select v-if="flowTab === 'quota'" v-model="flowFilter.status" class="input">
            <option value="">全部状态</option>
            <option
              v-for="opt in quotaStatusOptions"
              :key="opt.value"
              :value="opt.value"
            >
              {{ opt.label }}
            </option>
          </select>
          <select v-if="flowTab === 'directed'" v-model="flowFilter.flowType" class="input">
            <option value="">全部类型</option>
            <option :value="CANTEEN_DIRECTED_FLOW_TYPE.CONSUME_DEDUCT">消费扣减</option>
            <option :value="CANTEEN_DIRECTED_FLOW_TYPE.REFUND_BACK">退款退回</option>
          </select>
          <input v-model="flowFilter.startDate" type="date" class="input" />
          <input v-model="flowFilter.endDate" type="date" class="input" />
          <button class="btnSecondary" :disabled="flowsLoading" @click="loadFlows(1)">查询</button>
          <button class="btnPrimary" :disabled="exporting" @click="exportCsv">
            {{ exporting ? '导出中...' : '导出 CSV' }}
          </button>
        </div>

        <div v-if="flowsLoading" class="hint">加载中...</div>
        <div v-else-if="!flowRows.length" class="hint">暂无流水</div>
        <div v-else class="tableWrap">
          <table v-if="flowTab === 'quota'" class="table">
            <thead>
              <tr>
                <th>流水 ID</th>
                <th>支付金额</th>
                <th>手续费</th>
                <th>到账额度</th>
                <th>状态</th>
                <th>备注</th>
                <th>时间</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in quotaRows" :key="item.id">
                <td>{{ item.id }}</td>
                <td>¥{{ money(item.amount) }}</td>
                <td>¥{{ money(item.feeAmount) }}</td>
                <td>¥{{ money(item.actualQuota) }}</td>
                <td>{{ quotaStatusLabel(item.status) }}</td>
                <td>{{ item.remark || '—' }}</td>
                <td>{{ formatTime(item.createdAt) }}</td>
              </tr>
            </tbody>
          </table>
          <table v-else-if="flowTab === 'recharge'" class="table">
            <thead>
              <tr>
                <th>主商家</th>
                <th>住户</th>
                <th>金额</th>
                <th>充后余额</th>
                <th>备注</th>
                <th>时间</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in rechargeRows" :key="item.id">
                <td>{{ item.mainMerchantName || merchantName(item.mainMerchantId) }}</td>
                <td>{{ item.residentName || item.residentPhone || '—' }}</td>
                <td>¥{{ money(item.amount) }}</td>
                <td>¥{{ money(item.balanceAfter) }}</td>
                <td>{{ item.remark || '—' }}</td>
                <td>{{ formatTime(item.createdAt) }}</td>
              </tr>
            </tbody>
          </table>
          <table v-else class="table">
            <thead>
              <tr>
                <th>类型</th>
                <th>主商家体系</th>
                <th>消费商家</th>
                <th>金额</th>
                <th>变动后余额</th>
                <th>订单号</th>
                <th>时间</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in directedRows" :key="item.id">
                <td>{{ flowTypeLabel(item.flowType) }}</td>
                <td>{{ item.mainMerchantName || merchantName(item.mainMerchantId) }}</td>
                <td>{{ item.merchantName || merchantName(item.merchantId) }}</td>
                <td>¥{{ money(item.amount) }}</td>
                <td>¥{{ money(item.balanceAfter) }}</td>
                <td>{{ item.orderNo || '—' }}</td>
                <td>{{ formatTime(item.createdAt) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <footer v-if="flowsTotal > PAGE_SIZE" class="pager">
          <span>共 {{ flowsTotal }} 条</span>
          <button :disabled="flowsPage <= 1" @click="loadFlows(flowsPage - 1)">上一页</button>
          <span>{{ flowsPage }} / {{ flowsTotalPages }}</span>
          <button :disabled="flowsPage >= flowsTotalPages" @click="loadFlows(flowsPage + 1)">下一页</button>
        </footer>
      </div>
    </template>
  </div>

  <Teleport to="body">
    <div v-if="kickTarget" class="modalOverlay" @click.self="closeKick">
      <div class="modal">
        <div class="modalHead">踢出食堂商家</div>
        <p class="cardDesc">
          确认踢出「{{ kickTarget.name }}」（{{ kickTarget.isCanteenMainMerchant ? '主商家' : '窗口' }}）？踢出后不可再经营，对方可重新申请入驻。历史订单退款仍按快照处理。
        </p>
        <textarea v-model.trim="kickReason" class="input" rows="3" placeholder="请填写踢出原因（必填）" />
        <label class="radio" style="margin-top: 10px">
          <input v-model="kickNotify" type="checkbox" />
          通知商家
        </label>
        <div class="row" style="margin-top: 14px">
          <button class="btnSecondary" @click="closeKick">取消</button>
          <button class="btnDanger" :disabled="!!kickingId" @click="confirmKick">
            {{ kickingId ? '处理中...' : '确认踢出' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { adminCanteenApi, merchantApi, propertyCompanyApi } from '../../api/services'
import { formatMoney, rateToFormPercent, normalizeMerchantItem } from '../../api/mappers'
import { formatApiError } from '../../api/request'
import type {
  CanteenAdminRechargeItem,
  CanteenBindingItem,
  CanteenDirectedFlowItem,
  CanteenQuotaPurchaseItem,
  MerchantItem,
  PropertyCompanyItem
} from '../../api/types'
import ResidentSearchSelect from '../../components/ResidentSearchSelect.vue'
import {
  CANTEEN_BINDING_STATUS,
  CANTEEN_BINDING_STATUS_LABEL,
  CANTEEN_DIRECTED_FLOW_TYPE,
  CANTEEN_DIRECTED_FLOW_TYPE_LABEL,
  CANTEEN_EXPORT_TYPE,
  CANTEEN_QUOTA_PURCHASE_STATUS,
  CANTEEN_QUOTA_PURCHASE_STATUS_LABEL,
  ENTITY_STATUS,
  MERCHANT_AUDIT_STATUS,
  MERCHANT_TYPE,
  MERCHANT_TYPE_LABEL,
  USER_ROLE,
  canKickMerchant,
  getEnumLabel,
  getMerchantOperatingDisplayLabel,
  isMerchantTerminalStatus
} from '../../constants/enums'
import SegmentedControl from '../../components/SegmentedControl.vue'
import { useAuthStore } from '../../stores/auth'

const PAGE_SIZE = 20
/** 列表接口 pageSize 上限 100；导出与文档一致最多 1000 条 */
const EXPORT_PAGE_SIZE = 100
const EXPORT_MAX_ROWS = 1000
const auth = useAuthStore()
const isPlatformAdmin = computed(() => auth.profile?.role === USER_ROLE.PLATFORM_ADMIN)
const merchants = ref<MerchantItem[]>([])
const merchantsLoading = ref(false)
const propertyCompanies = ref<PropertyCompanyItem[]>([])
const companiesLoading = ref(false)
const creating = ref(false)
const createForm = reactive({
  role: 'main' as 'main' | 'sub',
  name: '',
  contactPhone: '',
  propertyCompanyId: auth.propertyCompanyId || '',
  category: '',
  businessHours: '',
  address: '',
  description: ''
})
const section = ref<'config' | 'flows'>('config')
const sectionTabs = [
  { code: 'config', name: '配置与绑定' },
  { code: 'flows', name: '流水查询' }
]
const flowTab = ref<'quota' | 'recharge' | 'directed'>('quota')
const flowTabs = [
  { code: 'quota', name: '额度购买' },
  { code: 'recharge', name: '定向充值' },
  { code: 'directed', name: '消费/退款' }
]

const bannerError = ref('')
const bannerSuccess = ref('')

const settingsLoading = ref(false)
const settingsSaving = ref(false)
const feePercent = ref(2)

const marking = ref(false)
const mainMarkMerchantId = ref('')
const quotaAdjusting = ref(false)
const quotaAdjustHint = ref('')
const quotaAdjust = reactive({
  merchantId: '',
  amount: 100 as number | null,
  remark: ''
})
const kickTarget = ref<MerchantItem | null>(null)
const kickReason = ref('')
const kickNotify = ref(true)
const kickingId = ref('')

const binding = ref(false)
const bindForm = reactive({
  mainMerchantId: '',
  subMerchantId: '',
  discountPercent: 20
})

const bindingsLoading = ref(false)
const bindings = ref<CanteenBindingItem[]>([])
const bindingsPage = ref(1)
const bindingsTotal = ref(0)
const bindingsTotalPages = computed(() => Math.max(1, Math.ceil(bindingsTotal.value / PAGE_SIZE)))
const bindingFilter = reactive({
  mainMerchantId: '',
  subMerchantId: ''
})
const rateDrafts = reactive<Record<string, number>>({})
const rateSavingId = ref('')
const unbindingId = ref('')

const flowsLoading = ref(false)
const exporting = ref(false)
const flowsPage = ref(1)
const flowsTotal = ref(0)
const flowsTotalPages = computed(() => Math.max(1, Math.ceil(flowsTotal.value / PAGE_SIZE)))
const quotaRows = ref<CanteenQuotaPurchaseItem[]>([])
const rechargeRows = ref<CanteenAdminRechargeItem[]>([])
const directedRows = ref<CanteenDirectedFlowItem[]>([])
const flowRows = computed(() => {
  if (flowTab.value === 'quota') return quotaRows.value
  if (flowTab.value === 'recharge') return rechargeRows.value
  return directedRows.value
})
const flowFilter = reactive({
  merchantId: '',
  mainMerchantId: '',
  residentId: '',
  status: '',
  flowType: '',
  startDate: '',
  endDate: ''
})

const quotaStatusOptions = [
  { value: CANTEEN_QUOTA_PURCHASE_STATUS.PENDING, label: CANTEEN_QUOTA_PURCHASE_STATUS_LABEL.pending },
  { value: CANTEEN_QUOTA_PURCHASE_STATUS.PAID, label: CANTEEN_QUOTA_PURCHASE_STATUS_LABEL.paid },
  { value: CANTEEN_QUOTA_PURCHASE_STATUS.REFUNDED, label: CANTEEN_QUOTA_PURCHASE_STATUS_LABEL.refunded },
  { value: CANTEEN_QUOTA_PURCHASE_STATUS.CLOSED, label: CANTEEN_QUOTA_PURCHASE_STATUS_LABEL.closed }
]

const activeMerchants = computed(() =>
  merchants.value.filter((item) => !isMerchantTerminalStatus(item.status))
)
const mainMerchants = computed(() => activeMerchants.value.filter((item) => !!item.isCanteenMainMerchant))
const windowMerchants = computed(() =>
  activeMerchants.value.filter(
    (item) => !item.isCanteenMainMerchant && item.id !== bindForm.mainMerchantId
  )
)

function merchantLabel(merchant: MerchantItem) {
  const role = merchant.isCanteenMainMerchant ? '主店' : '窗口'
  return `${merchant.name || '未命名商家'}（${role}）`
}

function merchantTypeLabel(type?: string) {
  return getEnumLabel(MERCHANT_TYPE_LABEL, type || MERCHANT_TYPE.CANTEEN)
}

function merchantName(id?: string) {
  if (!id) return '—'
  return merchants.value.find((item) => item.id === id)?.name || '—'
}

function flashError(e: unknown, fallback: string) {
  bannerSuccess.value = ''
  bannerError.value = formatApiError(e, fallback)
}

async function loadPropertyCompanies() {
  if (!isPlatformAdmin.value) {
    createForm.propertyCompanyId = auth.propertyCompanyId || createForm.propertyCompanyId
    return
  }
  companiesLoading.value = true
  try {
    const res = await propertyCompanyApi.list(
      { page: 1, pageSize: 100, status: ENTITY_STATUS.ACTIVE, sort: '-createdAt' },
      true
    )
    propertyCompanies.value = res.list || []
    if (!createForm.propertyCompanyId && propertyCompanies.value.length) {
      createForm.propertyCompanyId = auth.propertyCompanyId || propertyCompanies.value[0].id
    }
  } catch (e) {
    flashError(e, '加载物业公司失败')
  } finally {
    companiesLoading.value = false
  }
}

function statusLabel(status?: string, auditStatus?: string) {
  return getMerchantOperatingDisplayLabel(status, auditStatus)
}

function canOperateMerchant(merchant: MerchantItem) {
  return !isMerchantTerminalStatus(merchant.status)
}

async function hydrateCanteenFlags(list: MerchantItem[]) {
  const details = await Promise.all(
    list.map((item) =>
      merchantApi
        .get(item.id, item.propertyCompanyId || auth.propertyCompanyId || undefined)
        .catch(() => item)
    )
  )
  const byId = new Map(details.map((item) => [item.id, normalizeMerchantItem(item)]))
  return list.map((item) => {
    const detail = byId.get(item.id)
    if (!detail) return item
    return {
      ...item,
      ...detail,
      isCanteenMainMerchant: detail.isCanteenMainMerchant ?? item.isCanteenMainMerchant
    }
  })
}

function patchMerchant(id: string, patch: Partial<MerchantItem>) {
  merchants.value = merchants.value.map((item) => (item.id === id ? { ...item, ...patch } : item))
}

async function loadMerchants() {
  merchantsLoading.value = true
  try {
    const res = await merchantApi.list({
      page: 1,
      pageSize: 100,
      propertyCompanyId: auth.propertyCompanyId || undefined,
      merchantType: MERCHANT_TYPE.CANTEEN,
      sort: '-createdAt'
    })
    const list = (res.list || []).map((item) => normalizeMerchantItem(item))
    merchants.value = await hydrateCanteenFlags(list)
  } catch (e) {
    flashError(e, '加载食堂商家失败')
  } finally {
    merchantsLoading.value = false
  }
}

async function createMerchant() {
  if (!createForm.name) {
    bannerError.value = '请填写商家名称'
    return
  }
  if (!createForm.contactPhone) {
    bannerError.value = '请填写店主手机号'
    return
  }
  if (!createForm.propertyCompanyId) {
    bannerError.value = '请选择物业公司'
    return
  }
  const isMain = createForm.role === 'main'
  creating.value = true
  bannerError.value = ''
  bannerSuccess.value = ''
  try {
    const created = await adminCanteenApi.createMerchant({
      name: createForm.name,
      contactPhone: createForm.contactPhone,
      propertyCompanyId: createForm.propertyCompanyId,
      isMain,
      category: createForm.category || undefined,
      businessHours: createForm.businessHours || undefined,
      address: createForm.address || undefined,
      description: createForm.description || undefined
    })
    const mainFlag = created.isCanteenMainMerchant ?? isMain
    const typeOk = created.merchantType === MERCHANT_TYPE.CANTEEN
    const roleText = mainFlag ? '主商家' : '窗口'
    bannerSuccess.value = typeOk
      ? `已创建${roleText}「${created.name}」，类型 ${created.merchantType}，审核 ${created.auditStatus || MERCHANT_AUDIT_STATUS.APPROVED}`
      : `已创建「${created.name}」，但返回类型不是 canteen，请核对`
    if (isMain && created.isCanteenMainMerchant === false) {
      bannerError.value = '创建已成功，但详情未标记为主商家。请点「标为主店」补一次。'
    }
    createForm.name = ''
    createForm.contactPhone = ''
    await loadMerchants()
    patchMerchant(created.id, {
      isCanteenMainMerchant: mainFlag,
      merchantType: created.merchantType || MERCHANT_TYPE.CANTEEN
    })
  } catch (e) {
    flashError(e, '创建食堂商家失败')
  } finally {
    creating.value = false
  }
}

function percentToRate(percent: number) {
  return Math.round(percent * 1000) / 100000
}

function rateToPercent(rate?: number) {
  return rateToFormPercent(rate)
}

function money(value?: number | string) {
  const n = Number(value)
  return formatMoney(Number.isFinite(n) ? n : 0)
}

function formatTime(value?: string) {
  if (!value) return '—'
  return value.replace('T', ' ').replace('Z', '').slice(0, 19)
}

function bindingStatusLabel(status?: string) {
  return getEnumLabel(CANTEEN_BINDING_STATUS_LABEL, status)
}

function quotaStatusLabel(status?: string) {
  return getEnumLabel(CANTEEN_QUOTA_PURCHASE_STATUS_LABEL, status)
}

function flowTypeLabel(type?: string) {
  return getEnumLabel(CANTEEN_DIRECTED_FLOW_TYPE_LABEL, type)
}

async function loadSettings() {
  settingsLoading.value = true
  try {
    const res = await adminCanteenApi.getSettings()
    feePercent.value = rateToPercent(Number(res.quotaFeeRate ?? 0.02))
  } catch (e) {
    flashError(e, '加载手续费配置失败')
  } finally {
    settingsLoading.value = false
  }
}

async function saveSettings() {
  if (!Number.isFinite(feePercent.value) || feePercent.value < 0 || feePercent.value > 100) {
    bannerError.value = '手续费比例须在 0%～100%'
    return
  }
  settingsSaving.value = true
  bannerError.value = ''
  bannerSuccess.value = ''
  try {
    const res = await adminCanteenApi.updateSettings({ quotaFeeRate: percentToRate(feePercent.value) })
    feePercent.value = rateToPercent(Number(res.quotaFeeRate))
    bannerSuccess.value = '手续费已保存'
  } catch (e) {
    flashError(e, '保存手续费失败')
  } finally {
    settingsSaving.value = false
  }
}

async function adjustQuota() {
  if (!quotaAdjust.merchantId) {
    bannerError.value = '请选择食堂主商家'
    return
  }
  const amount = Number(quotaAdjust.amount)
  if (!Number.isFinite(amount) || amount <= 0) {
    bannerError.value = '入账额度必须大于 0'
    return
  }
  quotaAdjusting.value = true
  bannerError.value = ''
  bannerSuccess.value = ''
  quotaAdjustHint.value = ''
  try {
    const res = await adminCanteenApi.adjustQuota(quotaAdjust.merchantId, {
      amount,
      remark: quotaAdjust.remark || undefined
    })
    const remaining = money(res.remainingQuota)
    bannerSuccess.value = `已给主商家入账 ¥${money(res.amount ?? amount)} 额度（免手续费）`
    quotaAdjustHint.value = `调整后可用充值额度 ¥${remaining}`
    if (section.value === 'flows' && flowTab.value === 'quota') {
      await loadFlows(1)
    }
  } catch (e) {
    flashError(e, '调整额度失败')
  } finally {
    quotaAdjusting.value = false
  }
}

async function setMainFor(merchant: MerchantItem, main: boolean) {
  if (merchant.merchantType && merchant.merchantType !== MERCHANT_TYPE.CANTEEN) {
    bannerError.value = '只能标记食堂类型商家，请先用创建接口新建食堂店'
    return
  }
  if (!main && !window.confirm(`确认取消「${merchant.name}」的主商家标记？取消后不能再买额度/充值。`)) {
    return
  }
  mainMarkMerchantId.value = merchant.id
  await applyMainFlag(merchant.id, main)
}

async function applyMainFlag(merchantId: string, main: boolean) {
  marking.value = true
  bannerError.value = ''
  bannerSuccess.value = ''
  try {
    await adminCanteenApi.setMainMerchant(merchantId, main)
    patchMerchant(merchantId, { isCanteenMainMerchant: main })
    try {
      const detail = await merchantApi.get(
        merchantId,
        auth.propertyCompanyId || undefined
      )
      patchMerchant(merchantId, {
        ...detail,
        isCanteenMainMerchant: main
      })
    } catch {
      /* 标记接口成功即生效；详情若仍缺字段，以下拉本地状态为准 */
    }
    bannerSuccess.value = main ? '已标记为主商家' : '已取消主商家标记'
  } catch (e) {
    flashError(e, '更新主商家标记失败')
  } finally {
    marking.value = false
  }
}

async function setMain(main: boolean) {
  if (!mainMarkMerchantId.value) {
    bannerError.value = '请选择食堂商家'
    return
  }
  const target = merchants.value.find((item) => item.id === mainMarkMerchantId.value)
  if (target) {
    await setMainFor(target, main)
    return
  }
  await applyMainFlag(mainMarkMerchantId.value, main)
}

function openKick(merchant: MerchantItem) {
  kickTarget.value = merchant
  kickReason.value = ''
  kickNotify.value = true
}

function closeKick() {
  kickTarget.value = null
  kickReason.value = ''
  kickingId.value = ''
}

async function confirmKick() {
  if (!kickTarget.value) return
  if (!kickReason.value) {
    bannerError.value = '请填写踢出原因'
    return
  }
  kickingId.value = kickTarget.value.id
  bannerError.value = ''
  bannerSuccess.value = ''
  try {
    await merchantApi.kick(kickTarget.value.id, {
      reason: kickReason.value,
      notifyMerchant: kickNotify.value
    })
    bannerSuccess.value = `已踢出「${kickTarget.value.name}」`
    closeKick()
    await loadMerchants()
  } catch (e) {
    flashError(e, '踢出失败')
    kickingId.value = ''
  }
}

async function createBinding() {
  if (!bindForm.mainMerchantId || !bindForm.subMerchantId) {
    bannerError.value = '请选择主商家和子商家'
    return
  }
  if (bindForm.mainMerchantId === bindForm.subMerchantId) {
    bannerError.value = '主商家与子商家不能相同'
    return
  }
  if (!Number.isFinite(bindForm.discountPercent) || bindForm.discountPercent < 0 || bindForm.discountPercent > 100) {
    bannerError.value = '供货优惠比例须在 0%～100%'
    return
  }
  binding.value = true
  bannerError.value = ''
  bannerSuccess.value = ''
  try {
    await adminCanteenApi.createBinding({
      mainMerchantId: bindForm.mainMerchantId,
      subMerchantId: bindForm.subMerchantId,
      supplyDiscountRate: percentToRate(bindForm.discountPercent)
    })
    bannerSuccess.value = '绑定成功'
    bindForm.subMerchantId = ''
    await loadBindings(1)
  } catch (e) {
    flashError(e, '绑定失败')
  } finally {
    binding.value = false
  }
}

function onRateDraft(id: string, event: Event) {
  const value = Number((event.target as HTMLInputElement).value)
  rateDrafts[id] = value
}

async function saveRate(item: CanteenBindingItem) {
  const percent = rateDrafts[item.id] ?? rateToPercent(item.supplyDiscountRate)
  if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
    bannerError.value = '供货优惠比例须在 0%～100%'
    return
  }
  rateSavingId.value = item.id
  bannerError.value = ''
  bannerSuccess.value = ''
  try {
    const updated = await adminCanteenApi.updateBindingRate(item.id, percentToRate(percent))
    bindings.value = bindings.value.map((row) => (row.id === item.id ? updated : row))
    rateDrafts[item.id] = rateToPercent(updated.supplyDiscountRate)
    bannerSuccess.value = '供货优惠比例已更新'
  } catch (e) {
    flashError(e, '调整供货优惠比例失败')
  } finally {
    rateSavingId.value = ''
  }
}

async function unbind(item: CanteenBindingItem) {
  if (!window.confirm(`确认解绑「${item.subMerchantName || item.subMerchantId}」？解绑后不可再用该主商家体系定向余额，历史订单退款仍按快照退回。`)) {
    return
  }
  unbindingId.value = item.id
  bannerError.value = ''
  bannerSuccess.value = ''
  try {
    await adminCanteenApi.deleteBinding(item.id)
    bannerSuccess.value = '已解绑'
    await loadBindings(bindingsPage.value)
  } catch (e) {
    flashError(e, '解绑失败')
  } finally {
    unbindingId.value = ''
  }
}

async function loadBindings(page = 1) {
  bindingsLoading.value = true
  bindingsPage.value = page
  try {
    const res = await adminCanteenApi.listBindings({
      page,
      pageSize: PAGE_SIZE,
      mainMerchantId: bindingFilter.mainMerchantId || undefined,
      subMerchantId: bindingFilter.subMerchantId || undefined
    })
    bindings.value = res.list
    bindingsTotal.value = res.pagination.total
  } catch (e) {
    flashError(e, '加载绑定列表失败')
  } finally {
    bindingsLoading.value = false
  }
}

function exportType() {
  if (flowTab.value === 'quota') return CANTEEN_EXPORT_TYPE.QUOTA_PURCHASE
  if (flowTab.value === 'recharge') return CANTEEN_EXPORT_TYPE.RECHARGE
  return CANTEEN_EXPORT_TYPE.DIRECTED_FLOW
}

function csvCell(value: unknown) {
  const text = value == null ? '' : String(value)
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

function toCsvBlob(headers: string[], rows: unknown[][]) {
  const lines = [headers, ...rows].map((row) => row.map(csvCell).join(','))
  return new Blob([`\uFEFF${lines.join('\r\n')}`], { type: 'text/csv;charset=utf-8' })
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

async function collectExportList<T>(
  fetchPage: (page: number) => Promise<{ list: T[]; pagination: { total: number } }>
) {
  const rows: T[] = []
  let page = 1
  while (rows.length < EXPORT_MAX_ROWS) {
    const res = await fetchPage(page)
    rows.push(...res.list)
    if (
      res.list.length < EXPORT_PAGE_SIZE ||
      rows.length >= res.pagination.total ||
      rows.length >= EXPORT_MAX_ROWS
    ) {
      break
    }
    page += 1
  }
  return rows.slice(0, EXPORT_MAX_ROWS)
}

async function loadFlows(page = 1) {
  flowsLoading.value = true
  flowsPage.value = page
  const common = {
    page,
    pageSize: PAGE_SIZE,
    startDate: flowFilter.startDate || undefined,
    endDate: flowFilter.endDate || undefined
  }
  try {
    if (flowTab.value === 'quota') {
      const res = await adminCanteenApi.listQuotaPurchases({
        ...common,
        merchantId: flowFilter.merchantId || undefined,
        status: flowFilter.status || undefined
      })
      quotaRows.value = res.list
      flowsTotal.value = res.pagination.total
    } else if (flowTab.value === 'recharge') {
      const res = await adminCanteenApi.listRecharges({
        ...common,
        mainMerchantId: flowFilter.mainMerchantId || undefined,
        residentId: flowFilter.residentId || undefined
      })
      rechargeRows.value = res.list
      flowsTotal.value = res.pagination.total
    } else {
      const res = await adminCanteenApi.listFlows({
        ...common,
        mainMerchantId: flowFilter.mainMerchantId || undefined,
        merchantId: flowFilter.merchantId || undefined,
        residentId: flowFilter.residentId || undefined,
        flowType: flowFilter.flowType || undefined
      })
      directedRows.value = res.list
      flowsTotal.value = res.pagination.total
    }
  } catch (e) {
    flashError(e, '加载流水失败')
  } finally {
    flowsLoading.value = false
  }
}

async function exportCsv() {
  exporting.value = true
  bannerError.value = ''
  bannerSuccess.value = ''
  const common = {
    pageSize: EXPORT_PAGE_SIZE,
    startDate: flowFilter.startDate || undefined,
    endDate: flowFilter.endDate || undefined
  }
  try {
    let blob: Blob
    let count = 0
    if (flowTab.value === 'quota') {
      const list = await collectExportList((page) =>
        adminCanteenApi.listQuotaPurchases({
          ...common,
          page,
          merchantId: flowFilter.merchantId || undefined,
          status: flowFilter.status || undefined
        })
      )
      count = list.length
      blob = toCsvBlob(
        ['流水ID', '支付金额', '手续费', '到账额度', '状态', '备注', '时间'],
        list.map((item) => [
          item.id,
          money(item.amount),
          money(item.feeAmount),
          money(item.actualQuota),
          quotaStatusLabel(item.status),
          item.remark || '',
          formatTime(item.createdAt)
        ])
      )
    } else if (flowTab.value === 'recharge') {
      const list = await collectExportList((page) =>
        adminCanteenApi.listRecharges({
          ...common,
          page,
          mainMerchantId: flowFilter.mainMerchantId || undefined,
          residentId: flowFilter.residentId || undefined
        })
      )
      count = list.length
      blob = toCsvBlob(
        ['主商家', '住户', '金额', '充后余额', '备注', '时间'],
        list.map((item) => [
          item.mainMerchantName || merchantName(item.mainMerchantId),
          item.residentName || item.residentPhone || '',
          money(item.amount),
          money(item.balanceAfter),
          item.remark || '',
          formatTime(item.createdAt)
        ])
      )
    } else {
      const list = await collectExportList((page) =>
        adminCanteenApi.listFlows({
          ...common,
          page,
          mainMerchantId: flowFilter.mainMerchantId || undefined,
          merchantId: flowFilter.merchantId || undefined,
          residentId: flowFilter.residentId || undefined,
          flowType: flowFilter.flowType || undefined
        })
      )
      count = list.length
      blob = toCsvBlob(
        ['类型', '主商家体系', '消费商家', '金额', '变动后余额', '订单号', '时间'],
        list.map((item) => [
          flowTypeLabel(item.flowType),
          item.mainMerchantName || merchantName(item.mainMerchantId),
          item.merchantName || merchantName(item.merchantId),
          money(item.amount),
          money(item.balanceAfter),
          item.orderNo || '',
          formatTime(item.createdAt)
        ])
      )
    }
    downloadBlob(blob, `canteen_${exportType()}_${new Date().toISOString().slice(0, 10)}.csv`)
    bannerSuccess.value =
      count >= EXPORT_MAX_ROWS ? `已导出前 ${EXPORT_MAX_ROWS} 条` : `已导出 ${count} 条`
  } catch (e) {
    flashError(e, '导出失败')
  } finally {
    exporting.value = false
  }
}

watch(
  () => bindForm.mainMerchantId,
  (id) => {
    if (bindForm.subMerchantId && bindForm.subMerchantId === id) {
      bindForm.subMerchantId = ''
    }
  }
)

watch(flowTab, () => {
  quotaRows.value = []
  rechargeRows.value = []
  directedRows.value = []
  loadFlows(1)
})

watch(section, (value) => {
  if (value === 'flows' && !flowRows.value.length && !flowsLoading.value) {
    loadFlows(1)
  }
})

onMounted(async () => {
  await loadPropertyCompanies()
  await loadMerchants()
  await loadSettings()
  await loadBindings(1)
})
</script>

<style scoped>
.page {
  max-width: 1100px;
}
.header {
  margin-bottom: 16px;
}
.title {
  margin: 0;
  font-size: 22px;
}
.desc {
  margin: 6px 0 0;
  color: #8c8c9a;
  font-size: 13px;
}
.card {
  background: #fff;
  border: 1px solid #ececf2;
  border-radius: 12px;
  padding: 16px;
  margin-top: 16px;
}
.cardHead {
  font-weight: 600;
  margin-bottom: 6px;
}
.cardDesc {
  font-size: 12px;
  color: #8c8c9a;
  margin: 0 0 12px;
}
.row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.wrap {
  flex-wrap: wrap;
}
.grow {
  flex: 1;
  min-width: 180px;
}
.input {
  border: 1px solid #e8e8ec;
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 14px;
}
select.input {
  background: #fff;
  min-height: 40px;
}
.input.sm {
  width: 88px;
  padding: 6px 8px;
}
.inputWrap {
  display: flex;
  align-items: center;
  gap: 6px;
}
.unit {
  color: #8c8c9a;
  font-size: 13px;
}
.formGrid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
  color: #8c8c9a;
}
.field.span2 {
  grid-column: span 2;
}
.roleRow {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  min-height: 40px;
  align-items: center;
}
.radio {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #3a3a44;
  font-size: 13px;
}
@media (max-width: 720px) {
  .formGrid {
    grid-template-columns: 1fr;
  }
  .field.span2 {
    grid-column: span 1;
  }
}
.tableWrap {
  overflow: auto;
}
.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.table th,
.table td {
  text-align: left;
  padding: 10px 8px;
  border-bottom: 1px solid #f0f0f4;
  vertical-align: top;
}
.table small {
  display: block;
  color: #8c8c9a;
  margin-top: 2px;
}
.rateEdit {
  display: flex;
  align-items: center;
  gap: 6px;
}
.btnPrimary,
.btnSecondary,
.btnDanger {
  padding: 10px 16px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  font-size: 14px;
}
.btnPrimary {
  background: #5c5c9e;
  color: #fff;
}
.btnSecondary {
  background: #f4f5f7;
  color: #1f1f2e;
}
.btnDanger {
  background: #fef2f2;
  color: #d14343;
}
.btnLink {
  border: none;
  background: none;
  color: #5c5c9e;
  cursor: pointer;
  padding: 0;
}
.btnLink.danger {
  color: #d14343;
}
.btnPrimary:disabled,
.btnSecondary:disabled,
.btnDanger:disabled,
.btnLink:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.bannerError {
  color: #d14343;
  margin: 12px 0 0;
}
.bannerSuccess {
  color: #15803d;
  margin: 12px 0 0;
}
.hint {
  color: #8c8c9a;
  margin-top: 12px;
}
.muted {
  color: #8c8c9a;
}
.pager {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 12px;
  color: #8c8c9a;
  font-size: 13px;
}
.pager button {
  padding: 6px 10px;
  border: 1px solid #e8e8ec;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
}
.pager button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.ops {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.modalOverlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
}
.modal {
  width: min(480px, 100%);
  background: #fff;
  border-radius: 12px;
  padding: 18px;
}
.modalHead {
  font-weight: 600;
  margin-bottom: 8px;
}
textarea.input {
  width: 100%;
  resize: vertical;
}
</style>
