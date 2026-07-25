<template>
    <div class="page">
      <div class="header">
        <div>
          <h1 class="title">送货管理</h1>
          <p class="desc">管理快递配送、快递员与订单</p>
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
          <table class="table">
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
                    <span class="name">{{ courier.name }}</span>
                  </div>
                </td>
                <td>{{ courier.todayCompleted }}</td>
                <td>{{ courier.monthIncome }}</td>
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
          <table class="table">
            <thead>
              <tr>
                <th>时间</th>
                <th>用户</th>
                <th>商品</th>
                <th>费用</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loading">
                <td colspan="5" class="empty">加载中...</td>
              </tr>
              <tr v-else-if="!deliveryOrders.length">
                <td colspan="5" class="empty">暂无配送记录</td>
              </tr>
              <tr v-for="order in deliveryOrders" :key="order.id">
                <td>{{ order.time }}</td>
                <td>
                  <div class="name">{{ order.residentName }}</div>
                </td>
                <td>{{ order.productDesc }}</td>
                <td>{{ order.fee }}</td>
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
    </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import IconSvg from '../components/IconSvg.vue'
import { deliveryApi } from '../api/services'
import {
  mapCapacityBars,
  mapDeliveryCouriers,
  mapDeliveryStats,
  mapRecentDeliveries
} from '../api/mappers'
import { ApiError } from '../api/request'
import { DELIVERY_CAPACITY_DIMENSION } from '../constants/enums'

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
  await Promise.all([loadOverview(), loadCapacity()])
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
@media (max-width: 640px) {
  .stats { grid-template-columns: 1fr; }
  .header { flex-direction: column; gap: 16px; }
}
</style>
