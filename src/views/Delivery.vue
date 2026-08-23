<template>
    <div class="page" :class="{ mobilePage: isMobile }">
      <div class="header">
        <div>
          <h1 class="title">送货管理</h1>
          <p class="desc">支付成功后商家有 30 分钟选择自配或发大厅；超时自动进大厅。自配单不进入抢单/指派。整单均为团购商品的订单无需配送，支付后进入商家核实。</p>
        </div>
        <button class="btnRefresh" :disabled="loading" @click="reload">
          <IconSvg name="refresh" />
          <span>{{ loading ? '刷新中...' : '刷新数据' }}</span>
        </button>
      </div>

      <p v-if="loadError" class="bannerError">{{ loadError }}</p>

      <div class="stats">
        <div class="statCard">
          <div class="label">今日订单</div>
          <div class="value">
            <template v-if="loading">—</template>
            <template v-else>
              {{ deliveryStats.todayOrders }}
              <span class="trend" :class="{ down: deliveryStats.orderGrowth < 0 }">
                {{ deliveryStats.orderGrowthText }}
              </span>
            </template>
          </div>
        </div>
        <div class="statCard">
          <div class="label">快递员在线</div>
          <div class="value">
            <template v-if="loading">—</template>
            <template v-else>
              {{ deliveryStats.onlineCouriers }}
              <span class="sub">/ {{ deliveryStats.totalCouriers }}</span>
            </template>
          </div>
        </div>
        <div class="statCard">
          <div class="label">今日配送费</div>
          <div class="value">
            <template v-if="loading">—</template>
            <template v-else>¥{{ deliveryStats.todayDeliveryFee }}</template>
          </div>
        </div>
        <div class="statCard">
          <div class="label">当前运力负荷</div>
          <div class="value load" :class="deliveryStats.loadLevelClass">
            <template v-if="loading">—</template>
            <template v-else>{{ deliveryStats.capacityLoadText }}</template>
          </div>
        </div>
      </div>

      <div class="panels">
        <div class="panel">
          <div class="header">
            <h3 class="title">快递员实时状态</h3>
            <div class="sync" :class="{ connected: !loading && !loadError }">
              <IconSvg name="refresh" />
              <span>{{ loading ? '加载中' : loadError ? '同步异常' : '实时同步中' }}</span>
            </div>
          </div>
          <table class="table courierStatusTable" :class="{ mobileCards: isMobile }">
            <thead>
              <tr>
                <th>快递员</th>
                <th>今日完成</th>
                <th>本月收入</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loading">
                <td colspan="4" class="empty">加载中...</td>
              </tr>
              <tr v-else-if="!couriers.length">
                <td colspan="4" class="empty">暂无快递员数据</td>
              </tr>
              <tr v-for="courier in couriers" :key="courier.id">
                <td>
                  <div class="userInfo">
                    <div class="avatar" :style="{ background: courier.avatarColor }">{{ courier.initials }}</div>
                    <MobileCellText variant="primary">{{ courier.name }}</MobileCellText>
                  </div>
                </td>
                <td><MobileCellText variant="nowrap">{{ courier.todayCompleted }}</MobileCellText></td>
                <td><MobileCellText variant="nowrap">{{ courier.monthIncome }}</MobileCellText></td>
                <td>
                  <span class="status" :class="courier.statusClass">
                    {{ courier.statusLabel }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="panel">
          <div class="header">
            <h3 class="title">最新订单动态</h3>
          </div>
          <table class="table orderTable" :class="{ mobileCards: isMobile }">
            <thead>
              <tr>
                <th>时间</th>
                <th>用户</th>
                <th>商品</th>
                <th>费用</th>
                <th>履约</th>
                <th>承运</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loading">
                <td colspan="7" class="empty">加载中...</td>
              </tr>
              <tr v-else-if="!deliveryOrders.length">
                <td colspan="7" class="empty">暂无配送记录</td>
              </tr>
              <tr v-for="order in deliveryOrders" :key="order.id">
                <td><MobileCellText variant="nowrap">{{ order.time }}</MobileCellText></td>
                <td>
                  <MobileCellText variant="primary">{{ order.residentName }}</MobileCellText>
                </td>
                <td class="productCell mCellStack">
                  <MobileCellText>{{ order.productDesc }}</MobileCellText>
                </td>
                <td><MobileCellText variant="nowrap">{{ order.fee }}</MobileCellText></td>
                <td>{{ order.fulfillmentModeLabel || fulfillmentLabel(order.fulfillmentMode, order) }}</td>
                <td>{{ carrierLabel(order.carrierType) }}</td>
                <td>
                  <span class="orderStatus" :class="order.statusClass">
                    {{ order.statusLabel }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="panel orderListPanel">
        <div class="header">
          <h3 class="title">配送订单</h3>
        </div>
        <div class="toolbar">
          <select v-model="orderFilters.fulfillmentMode" class="select" @change="loadAdminOrders(1)">
            <option v-for="opt in FULFILLMENT_MODE_OPTIONS" :key="opt.value || 'all'" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
          <select v-model="orderFilters.carrierType" class="select" @change="loadAdminOrders(1)">
            <option v-for="opt in CARRIER_TYPE_OPTIONS" :key="opt.value || 'all-carrier'" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
          <label class="checkLabel">
            <input v-model="orderFilters.overdueOnly" type="checkbox" @change="loadAdminOrders(1)" />
            超时未选
          </label>
          <button class="btnGhost" :disabled="ordersLoading" @click="loadAdminOrders(orderPage)">刷新</button>
        </div>
        <p v-if="ordersError" class="bannerError">{{ ordersError }}</p>
        <table class="table">
          <thead>
            <tr>
              <th>时间</th>
              <th>订单号</th>
              <th>住户</th>
              <th>商家</th>
              <th>履约方式</th>
              <th>承运</th>
              <th>配送状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="ordersLoading">
              <td colspan="8" class="empty">加载中...</td>
            </tr>
            <tr v-else-if="!adminOrders.length">
              <td colspan="8" class="empty">暂无配送订单</td>
            </tr>
            <tr v-for="item in visibleAdminOrders" :key="item.id">
              <td>{{ item.createdAt || '—' }}</td>
              <td class="idCell">{{ item.orderNo || item.id }}</td>
              <td>{{ item.residentName || '—' }}</td>
              <td>{{ item.merchantName || '—' }}</td>
              <td>
                {{ fulfillmentModeLabelOf(item) }}
                <em v-if="isChoiceOverdue(item)" class="overdue">超时未选</em>
              </td>
              <td>{{ carrierTypeLabelOf(item) }}</td>
              <td>{{ item.deliveryStatusLabel || deliveryStatusText(item.deliveryStatus) }}</td>
              <td>
                <button class="linkBtn" @click="openOrderDetail(item.id)">详情</button>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="orderTotalPages > 1" class="pagination">
          <button class="pageBtn" :disabled="orderPage <= 1" @click="loadAdminOrders(orderPage - 1)">&lt;</button>
          <span class="pageInfo">{{ orderPage }} / {{ orderTotalPages }}</span>
          <button class="pageBtn" :disabled="orderPage >= orderTotalPages" @click="loadAdminOrders(orderPage + 1)">&gt;</button>
        </div>
      </div>

      <div class="capacity">
        <div class="header">
          <div>
            <div class="title">运力效能分析</div>
            <div class="desc">
              {{ capacityDimension === DELIVERY_CAPACITY_DIMENSION.H24 ? '近24小时' : '近7天' }}
              配送高峰与快递员响应曲线
              <span v-if="peakHour" class="peakHint"> · 高峰时段 {{ peakHour }}</span>
            </div>
          </div>
          <div class="tabs">
            <button
              v-for="tab in capacityTabs"
              :key="tab.value"
              class="tab"
              :class="{ active: capacityDimension === tab.value }"
              :disabled="capacityLoading"
              @click="switchCapacityDimension(tab.value)"
            >
              {{ tab.label }}
            </button>
          </div>
        </div>
        <p v-if="capacityError" class="capacityError">{{ capacityError }}</p>
        <div v-else-if="capacityLoading" class="capacityLoading">加载运力数据中...</div>
        <div v-else-if="!capacityData.length" class="capacityLoading">暂无运力数据</div>
        <div v-else class="body">
          <div class="yAxis">
            <div class="line" v-for="n in 6" :key="n" />
          </div>
          <div class="bars">
            <div
              v-for="item in capacityData"
              :key="item.key"
              class="barWrap"
            >
              <div
                class="bar"
                :class="{ peak: item.isPeak }"
                :style="{ height: `${item.value}%` }"
                :title="`${item.deliveryCount} 单 · 平均响应 ${item.avgResponseMinutes} 分钟`"
              >
                <div v-if="item.peakLabel" class="label">{{ item.peakLabel }}</div>
              </div>
              <div class="hour">{{ item.hour }}</div>
            </div>
          </div>
        </div>
      </div>

    <Teleport to="body">
      <div v-if="detailOpen" class="modalOverlay" @click.self="closeOrderDetail">
        <div class="modal">
          <div class="modalHeader">
            <h3 class="modalTitle">订单履约</h3>
            <button class="modalClose" @click="closeOrderDetail">&times;</button>
          </div>
          <div class="modalBody">
            <div v-if="detailLoading" class="loading">加载详情中...</div>
            <p v-else-if="detailError" class="bannerError">{{ detailError }}</p>
            <template v-else-if="detail">
              <ul class="infoGrid">
                <li><span>订单号</span><strong>{{ detail.orderNo || detail.id }}</strong></li>
                <li><span>住户</span><strong>{{ detail.residentName || '—' }}</strong></li>
                <li><span>商家</span><strong>{{ detail.merchantName || '—' }}</strong></li>
                <li><span>订单状态</span><strong>{{ detail.orderStatus || detail.status || '—' }}</strong></li>
              </ul>
              <FulfillmentPanel
                :order="detail"
                variant="admin"
                :busy="overrideBusy"
                @override="openOverride"
              />
            </template>
          </div>
        </div>
      </div>
      <div v-if="overrideOpen" class="modalOverlay" @click.self="closeOverride">
        <div class="modal small">
          <div class="modalHeader">
            <h3 class="modalTitle">强制改派</h3>
            <button class="modalClose" @click="closeOverride">&times;</button>
          </div>
          <div class="modalBody">
            <p class="hint">将改派为：{{ overrideModeLabel }}。已结束订单后端会拒绝。</p>
            <label class="label">备注</label>
            <textarea v-model="overrideRemark" class="textarea" rows="3" placeholder="请填写改派原因" />
            <p v-if="overrideError" class="bannerError">{{ overrideError }}</p>
          </div>
          <div class="modalFooter">
            <button class="btnGhost" @click="closeOverride">取消</button>
            <button class="btnPrimary" :disabled="overrideBusy" @click="submitOverride">
              {{ overrideBusy ? '提交中...' : '确认改派' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import IconSvg from '../components/IconSvg.vue'
import MobileCellText from '../components/MobileCellText.vue'
import FulfillmentPanel from '../components/FulfillmentPanel.vue'
import { deliveryApi, ordersApi } from '../api/services'
import type { OrderItem } from '../api/types'
import {
  mapCapacityBars,
  mapDeliveryCouriers,
  mapDeliveryStats,
  mapRecentDeliveries
} from '../api/mappers'
import { ApiError, formatApiError } from '../api/request'
import {
  CARRIER_TYPE_LABEL,
  CARRIER_TYPE_OPTIONS,
  DELIVERY_CAPACITY_DIMENSION,
  DELIVERY_STATUS_LABEL,
  FULFILLMENT_MODE_LABEL,
  FULFILLMENT_MODE_OPTIONS,
  getEnumLabel
} from '../constants/enums'
import { useIsMobile } from '../composables/useIsMobile'
import {
  carrierTypeLabelOf,
  fulfillmentModeLabelOf,
  isChoiceOverdue
} from '../utils/fulfillment'

const { isMobile } = useIsMobile()
const loading = ref(true)
const loadError = ref('')
const capacityLoading = ref(false)
const capacityError = ref('')
const capacityDimension = ref<string>(DELIVERY_CAPACITY_DIMENSION.H24)
const peakHour = ref('')

const capacityTabs = [
  { value: DELIVERY_CAPACITY_DIMENSION.H24, label: '24小时' },
  { value: DELIVERY_CAPACITY_DIMENSION.D7, label: '7天' }
]

const deliveryStats = ref({
  todayOrders: 0,
  orderGrowth: 0,
  orderGrowthText: '0',
  onlineCouriers: 0,
  totalCouriers: 0,
  todayDeliveryFee: '0.00',
  capacityLoad: 0,
  capacityLoadText: '0%',
  loadLevelClass: 'low'
})

const couriers = ref<ReturnType<typeof mapDeliveryCouriers>>([])
const deliveryOrders = ref<ReturnType<typeof mapRecentDeliveries>>([])
const capacityData = ref<ReturnType<typeof mapCapacityBars>>([])

const orderFilters = reactive({
  fulfillmentMode: '',
  carrierType: '',
  overdueOnly: false
})
const adminOrders = ref<OrderItem[]>([])
const ordersLoading = ref(false)
const ordersError = ref('')
const orderPage = ref(1)
const orderTotalPages = ref(1)

const detailOpen = ref(false)
const detailLoading = ref(false)
const detailError = ref('')
const detail = ref<OrderItem | null>(null)
const overrideOpen = ref(false)
const overrideBusy = ref(false)
const overrideError = ref('')
const overrideMode = ref('')
const overrideRemark = ref('')

const overrideModeLabel = computed(() =>
  getEnumLabel(FULFILLMENT_MODE_LABEL, overrideMode.value, overrideMode.value)
)

const visibleAdminOrders = computed(() => {
  if (!orderFilters.overdueOnly) return adminOrders.value
  return adminOrders.value.filter((item) => isChoiceOverdue(item))
})

function fulfillmentLabel(mode?: string, item?: { fulfillmentModeLabel?: string }) {
  return item?.fulfillmentModeLabel || getEnumLabel(FULFILLMENT_MODE_LABEL, mode, '—')
}

function carrierLabel(type?: string) {
  return getEnumLabel(CARRIER_TYPE_LABEL, type, '—')
}

function deliveryStatusText(status?: string) {
  return getEnumLabel(DELIVERY_STATUS_LABEL, status, '—')
}

async function loadAdminOrders(pageNo = 1) {
  ordersLoading.value = true
  ordersError.value = ''
  try {
    const res = await deliveryApi.orders({
      page: pageNo,
      pageSize: 20,
      sort: '-createdAt',
      fulfillmentMode: orderFilters.fulfillmentMode || undefined,
      carrierType: orderFilters.carrierType || undefined
    })
    adminOrders.value = res.list || []
    orderPage.value = res.pagination?.page || pageNo
    orderTotalPages.value = res.pagination?.totalPages || 1
  } catch (e) {
    ordersError.value = formatApiError(e, '配送订单加载失败')
    adminOrders.value = []
  } finally {
    ordersLoading.value = false
  }
}

async function openOrderDetail(id: string) {
  detailOpen.value = true
  detailLoading.value = true
  detailError.value = ''
  detail.value = null
  try {
    detail.value = await ordersApi.get(id)
  } catch (e) {
    detailError.value = formatApiError(e, '订单详情加载失败')
  } finally {
    detailLoading.value = false
  }
}

function closeOrderDetail() {
  detailOpen.value = false
  detail.value = null
  detailError.value = ''
}

function openOverride(mode: string) {
  overrideMode.value = mode
  overrideRemark.value = ''
  overrideError.value = ''
  overrideOpen.value = true
}

function closeOverride() {
  overrideOpen.value = false
  overrideBusy.value = false
}

async function submitOverride() {
  if (!detail.value) return
  overrideBusy.value = true
  overrideError.value = ''
  try {
    await ordersApi.overrideFulfillment(detail.value.id, {
      mode: overrideMode.value,
      remark: overrideRemark.value.trim() || undefined
    })
    detail.value = await ordersApi.get(detail.value.id)
    closeOverride()
    await Promise.all([loadOverview(), loadAdminOrders(orderPage.value)])
  } catch (e) {
    overrideError.value = formatApiError(e, '改派失败')
  } finally {
    overrideBusy.value = false
  }
}

async function loadOverview() {
  loading.value = true
  loadError.value = ''
  try {
    const overview = await deliveryApi.overview()
    deliveryStats.value = mapDeliveryStats(overview.todayStats)
    couriers.value = mapDeliveryCouriers(overview.couriers)
    deliveryOrders.value = mapRecentDeliveries(overview.recentDeliveries)
  } catch (e) {
    loadError.value = e instanceof ApiError ? e.message : '送货概览加载失败'
    couriers.value = []
    deliveryOrders.value = []
  } finally {
    loading.value = false
  }
}

async function loadCapacity() {
  capacityLoading.value = true
  capacityError.value = ''
  try {
    const data = await deliveryApi.capacity({ dimension: capacityDimension.value })
    peakHour.value = data.peakHour || ''
    capacityData.value = mapCapacityBars(data.hourlyData, data.peakHour)
  } catch (e) {
    capacityError.value = e instanceof ApiError ? e.message : '运力数据加载失败'
    capacityData.value = []
    peakHour.value = ''
  } finally {
    capacityLoading.value = false
  }
}

async function switchCapacityDimension(dimension: string) {
  if (capacityDimension.value === dimension || capacityLoading.value) return
  capacityDimension.value = dimension
  await loadCapacity()
}

async function reload() {
  await Promise.all([loadOverview(), loadCapacity(), loadAdminOrders(1)])
}

onMounted(reload)
</script>

<style scoped>
.page { max-width: 1200px; }
.header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 20px; }
.title { font-size: 24px; font-weight: 600; color: #1f1f2e; margin-bottom: 8px; }
.desc { font-size: 14px; color: #8c8c9a; }
.btnRefresh { display: flex; align-items: center; gap: 6px; padding: 10px 18px; border-radius: 8px; background: #ffffff; color: #5c5c9e; font-size: 14px; cursor: pointer; border: 1px solid #e8e8ec; transition: all 0.2s; }
.btnRefresh:hover:not(:disabled) { background: #f8f8fc; border-color: #5c5c9e; }
.btnRefresh:disabled { opacity: 0.6; cursor: not-allowed; }
.btnRefresh svg { width: 18px; height: 18px; }
.bannerError { font-size: 13px; color: #e05c5c; margin-bottom: 12px; }

.stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 20px; }
.statCard { background: #ffffff; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.statCard .label { font-size: 13px; color: #8c8c9a; margin-bottom: 8px; }
.statCard .value { font-size: 24px; font-weight: 700; color: #1f1f2e; display: flex; align-items: center; gap: 8px; }
.statCard .trend { font-size: 12px; color: #3aaf7d; font-weight: 500; }
.statCard .trend.down { color: #e05c5c; }
.statCard .sub { font-size: 14px; color: #8c8c9a; font-weight: 400; }
.statCard .value.load { font-size: 20px; position: relative; padding-bottom: 8px; }
.statCard .value.load::after { content: ''; position: absolute; bottom: 0; left: 0; width: 40px; height: 3px; border-radius: 2px; }
.statCard .value.load.low { color: #3aaf7d; }
.statCard .value.load.low::after { background: #3aaf7d; }
.statCard .value.load.medium { color: #f5a623; }
.statCard .value.load.medium::after { background: #f5a623; }
.statCard .value.load.high { color: #e05c5c; }
.statCard .value.load.high::after { background: #e05c5c; }

.panels { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
.panel { background: #ffffff; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.panel .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.panel .title { font-size: 15px; font-weight: 500; color: #1f1f2e; margin-bottom: 0; }
.panel .sync { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #8c8c9a; }
.panel .sync.connected { color: #3aaf7d; }
.panel .sync svg { width: 14px; height: 14px; }
.panel .sync.connected svg { animation: spin 1s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
.panel .table { width: 100%; font-size: 14px; }
.panel .table thead th { text-align: left; padding: 12px; color: #8c8c9a; font-weight: 500; background: #fafafc; border-bottom: 1px solid #f0f0f3; }
.panel .table tbody td { padding: 14px 12px; color: #1f1f2e; border-bottom: 1px solid #f0f0f3; vertical-align: middle; }
.panel .table tbody tr:last-child td { border-bottom: none; }
.panel .empty { text-align: center; color: #8c8c9a; padding: 24px 12px !important; }
.panel .userInfo { display: flex; align-items: center; gap: 10px; }
.panel .avatar { width: 32px; height: 32px; border-radius: 50%; color: #ffffff; font-size: 12px; font-weight: 500; display: flex; align-items: center; justify-content: center; }
.panel .name { font-weight: 500; color: #1f1f2e; }
.panel .status { display: inline-block; padding: 3px 8px; border-radius: 10px; font-size: 12px; font-weight: 500; }
.panel .status.online { background: #e8f8f0; color: #3aaf7d; }
.panel .status.offline { background: #f0f0f0; color: #8c8c9a; }
.panel .orderStatus { display: inline-block; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 500; }
.panel .orderStatus.grabbed { background: #e8f8f0; color: #3aaf7d; }
.panel .orderStatus.pending { background: #fff8e8; color: #f5a623; }
.panel .orderStatus.delivering { background: #f0f0ff; color: #5c5c9e; }
.panel .orderStatus.completed { background: #f0f0f0; color: #8c8c9a; }
.orderListPanel { margin-bottom: 20px; overflow-x: auto; }
.toolbar { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-bottom: 12px; }
.select { padding: 8px 12px; border: 1px solid #e8e8ec; border-radius: 8px; background: #fff; }
.checkLabel { display: flex; align-items: center; gap: 6px; font-size: 13px; color: #5c5c66; }
.btnGhost { padding: 8px 14px; border-radius: 8px; border: 1px solid #e8e8ec; background: #fff; cursor: pointer; }
.linkBtn { border: none; background: none; color: #5c5c9e; cursor: pointer; }
.idCell { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; }
.overdue { color: #cf1322; font-style: normal; margin-left: 6px; font-size: 12px; }
.pagination { display: flex; justify-content: center; gap: 12px; margin-top: 12px; }
.pageBtn { padding: 6px 12px; border: 1px solid #e8e8ec; border-radius: 8px; background: #fff; }
.pageInfo { font-size: 13px; color: #8c8c9a; }
.modalOverlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 40; padding: 16px;
}
.modal { width: min(720px, 100%); max-height: 90vh; overflow: auto; background: #fff; border-radius: 12px; padding: 20px; }
.modal.small { width: min(480px, 100%); }
.modalHeader { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.modalTitle { font-size: 18px; margin: 0; }
.modalClose { border: none; background: none; font-size: 24px; cursor: pointer; }
.infoGrid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; list-style: none; padding: 0; margin: 0 0 16px; }
.infoGrid li { display: flex; justify-content: space-between; gap: 12px; font-size: 13px; }
.infoGrid span { color: #8c8c9a; }
.textarea, .label { display: block; width: 100%; }
.textarea { margin: 8px 0 12px; padding: 8px 12px; border: 1px solid #e8e8ec; border-radius: 8px; box-sizing: border-box; }
.hint { font-size: 13px; color: #8c8c9a; }
.modalFooter { display: flex; justify-content: flex-end; gap: 8px; }
.btnPrimary { padding: 8px 14px; border: none; border-radius: 8px; background: #5c5c9e; color: #fff; cursor: pointer; }

.capacity { background: #ffffff; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.capacity .header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 20px; }
.capacity .title { font-size: 15px; font-weight: 500; color: #1f1f2e; margin-bottom: 4px; }
.capacity .desc { font-size: 12px; color: #8c8c9a; }
.capacity .peakHint { color: #5c5c9e; }
.capacity .tabs { display: flex; border: 1px solid #e8e8ec; border-radius: 8px; overflow: hidden; border-bottom: none; margin-bottom: 0; gap: 0; }
.capacity .tab { padding: 6px 14px; font-size: 13px; color: #5c5c66; border: none; background: #ffffff; cursor: pointer; border-bottom: none; }
.capacity .tab.active { background: #5c5c9e; color: #ffffff; }
.capacity .tab:disabled { opacity: 0.6; cursor: not-allowed; }
.capacityError { font-size: 13px; color: #e05c5c; padding: 24px 0; text-align: center; }
.capacityLoading { text-align: center; color: #8c8c9a; padding: 48px 0; font-size: 14px; }
.capacity .body { position: relative; height: 200px; display: flex; }
.capacity .yAxis { position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: space-between; padding: 10px 0; }
.capacity .line { height: 1px; background: #f0f0f3; }
.capacity .bars { display: flex; align-items: flex-end; justify-content: space-around; flex: 1; padding-left: 30px; z-index: 1; overflow-x: auto; }
.capacity .barWrap { display: flex; flex-direction: column; align-items: center; gap: 8px; flex: 1; min-width: 48px; }
.capacity .bar { width: 40px; background: #d8d8e8; border-radius: 4px 4px 0 0; position: relative; transition: height 0.6s ease; min-height: 8px; }
.capacity .bar.peak { background: #5c5c9e; }
.capacity .bar .label { position: absolute; top: -22px; left: 50%; transform: translateX(-50%); padding: 2px 6px; border-radius: 4px; background: #5c5c9e; color: #ffffff; font-size: 10px; white-space: nowrap; }
.capacity .hour { font-size: 12px; color: #8c8c9a; }

@media (max-width: 1024px) {
  .stats { grid-template-columns: repeat(2, 1fr); }
  .panels { grid-template-columns: 1fr; }
}
@media (max-width: 768px) {
  .page { max-width: none; }
  .header { flex-direction: column; gap: 16px; }
  .title { font-size: 21px; }
  .btnRefresh { width: 100%; justify-content: center; }
  .panel { padding: 12px; border-radius: 14px; }
  .mobileCards thead { display: none; }
  .mobileCards, .mobileCards tbody, .mobileCards tr, .mobileCards td { display: block; width: 100%; }
  .mobileCards tr { padding: 12px 0; border-bottom: 1px solid #f0f0f3; }
  .mobileCards tr:last-child { border-bottom: none; }
  .mobileCards td {
    display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;
    padding: 6px 0; text-align: right; border-bottom: none !important;
  }
  .mobileCards td::before { color: #8c8c9a; text-align: left; flex-shrink: 0; }
  .mobileCards .userInfo { max-width: 68%; justify-content: flex-end; min-width: 0; }
  .mobileCards .userInfo .mCellText { max-width: 100%; }
  .courierStatusTable.mobileCards td:nth-child(1)::before { content: '快递员'; }
  .courierStatusTable.mobileCards td:nth-child(2)::before { content: '今日完成'; }
  .courierStatusTable.mobileCards td:nth-child(3)::before { content: '本月收入'; }
  .courierStatusTable.mobileCards td:nth-child(4)::before { content: '状态'; }
  .orderTable.mobileCards td:nth-child(1)::before { content: '时间'; }
  .orderTable.mobileCards td:nth-child(2)::before { content: '用户'; }
  .orderTable.mobileCards td:nth-child(3)::before { content: '商品'; }
  .orderTable.mobileCards td:nth-child(4)::before { content: '费用'; }
  .orderTable.mobileCards td:nth-child(5)::before { content: '状态'; }
  .mobileCards td.empty {
    justify-content: center; text-align: center; padding: 24px 12px !important;
  }
  .mobileCards td.empty::before { content: none; }
  .mobileCards .productCell { white-space: normal; }
  .capacity .header { flex-direction: column; gap: 12px; }
}
@media (max-width: 640px) {
  .stats { grid-template-columns: 1fr; }
}
</style>
