<template>
  <div class="page" :class="{ mobilePage: isMobile }">
    <div class="header">
      <div>
        <h1 class="title">工作台</h1>
        <p class="desc">配送任务概览 · {{ displayName }}</p>
      </div>
    </div>

    <div v-if="loading" class="loading">加载中...</div>
    <template v-else>
      <div class="stats">
        <div class="statCard purple">
          <div class="label">待抢订单</div>
          <div class="value">{{ pendingCount }}</div>
        </div>
        <div class="statCard">
          <div class="label">进行中</div>
          <div class="value">{{ activeCount }}</div>
        </div>
        <div class="statCard green">
          <div class="label">今日完成</div>
          <div class="value">{{ todayCompletedCount }}</div>
        </div>
        <div class="statCard">
          <div class="label">今日预计收入</div>
          <div class="value small">¥{{ formatMoney(todayEarnings) }}</div>
        </div>
        <div class="statCard green">
          <div class="label">可提现余额</div>
          <div class="value small">¥{{ formatMoney(withdrawableAmount) }}</div>
        </div>
      </div>

      <div class="grid">
        <div class="card">
          <h3 class="cardTitle">快捷入口</h3>
          <div class="actions">
            <RouterLink class="actionBtn" :to="{ name: 'courier-available' }">去抢单大厅</RouterLink>
            <RouterLink class="actionBtn" :to="{ name: 'courier-tasks' }">查看我的任务</RouterLink>
          </div>
          <ul class="tips">
            <li>在抢单大厅查看待配送订单并抢单</li>
            <li>接单后先「开始配送」，送达后上传凭证并完成配送</li>
            <li>完成配送后预计收入入账；可提现余额只读钱包 withdrawableAmount，勿本地加减</li>
            <li>注意订单超时时间，及时完成配送</li>
          </ul>
        </div>
        <div class="card">
          <h3 class="cardTitle">最近任务</h3>
          <ul v-if="recentTasks.length" class="taskList">
            <li v-for="item in recentTasks" :key="item.id">
              <div class="taskMain">
                <span class="orderNo">{{ item.orderNo || item.orderId }}</span>
                <span class="tag" :class="statusClass(item.status)">
                  {{ getEnumLabel(DELIVERY_STATUS_LABEL, item.status) }}
                </span>
              </div>
              <div class="taskSub">
                {{ item.merchantName || '—' }} → {{ item.deliveryAddress || '—' }}
              </div>
              <div class="taskMeta">
                预计收入 ¥{{ formatMoney(item.courierEarning) }}
                · {{ item.acceptedAt || item.createdAt || '—' }}
              </div>
            </li>
          </ul>
          <p v-else class="empty">暂无最近任务</p>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { courierManagerApi, courierPortalApi } from '../../api/services'
import type { CourierDeliveryItem } from '../../api/types'
import { ApiError } from '../../api/request'
import { DELIVERY_STATUS, DELIVERY_STATUS_LABEL, getEnumLabel } from '../../constants/enums'
import { useAuthStore } from '../../stores/auth'
import { useIsMobile } from '../../composables/useIsMobile'

const auth = useAuthStore()
const { isMobile } = useIsMobile()
const loading = ref(false)
const pendingCount = ref(0)
const activeCount = ref(0)
const todayCompletedCount = ref(0)
const todayEarnings = ref(0)
const withdrawableAmount = ref(0)
const recentTasks = ref<CourierDeliveryItem[]>([])

const displayName = auth.username || auth.profile?.name || '快递员'

function formatMoney(value?: number) {
  if (value === undefined || value === null) return '0.00'
  return Number(value).toFixed(2)
}

function statusClass(status?: string) {
  if (status === DELIVERY_STATUS.ACCEPTED || status === DELIVERY_STATUS.GRABBED) return 'accepted'
  if (status === DELIVERY_STATUS.DELIVERING) return 'delivering'
  if (status === DELIVERY_STATUS.DELIVERED || status === DELIVERY_STATUS.COMPLETED) return 'completed'
  return ''
}

function isToday(value?: string) {
  if (!value) return false
  return value.slice(0, 10) === new Date().toISOString().slice(0, 10)
}

async function loadStats() {
  loading.value = true
  try {
    const [pendingRes, activeRes, completedRes, recentRes, profile] = await Promise.all([
      courierPortalApi.pending({ page: 1, pageSize: 1, sort: '-createdAt' }),
      courierPortalApi.my({ page: 1, pageSize: 100, sort: '-createdAt' }),
      courierPortalApi.my({
        page: 1,
        pageSize: 100,
        status: DELIVERY_STATUS.DELIVERED,
        sort: '-createdAt'
      }),
      courierPortalApi.my({ page: 1, pageSize: 5, sort: '-createdAt' }),
      courierManagerApi.my().catch(() => null)
    ])
    pendingCount.value = pendingRes.pagination?.total ?? pendingRes.list?.length ?? 0
    const allTasks = activeRes.list || []
    activeCount.value = allTasks.filter(
      (item) =>
        item.status === DELIVERY_STATUS.ACCEPTED ||
        item.status === DELIVERY_STATUS.GRABBED ||
        item.status === DELIVERY_STATUS.DELIVERING
    ).length
    const completed = completedRes.list || []
    const todayCompleted = completed.filter(
      (item) => isToday(item.deliveredAt) || isToday(item.updatedAt) || isToday(item.acceptedAt)
    )
    todayCompletedCount.value = todayCompleted.length
    todayEarnings.value = todayCompleted.reduce(
      (sum, item) => sum + Number(item.courierEarning ?? 0),
      0
    )
    recentTasks.value = recentRes.list || []
    withdrawableAmount.value = Number(profile?.withdrawableAmount ?? 0)
  } catch (e) {
    console.error(e instanceof ApiError ? e.message : e)
  } finally {
    loading.value = false
  }
}

onMounted(loadStats)
</script>

<style scoped>
.page { max-width: 1200px; }
.header { margin-bottom: 24px; }
.title { font-size: 24px; font-weight: 600; color: #1f1f2e; margin-bottom: 8px; }
.desc { font-size: 14px; color: #8c8c9a; }
.loading { color: #8c8c9a; font-size: 14px; }
.stats { display: grid; grid-template-columns: repeat(5, 1fr); gap: 16px; margin-bottom: 20px; }
.statCard { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.statCard.purple .value { color: #5c5c9e; }
.statCard.green .value { color: #3aaf7d; }
.statCard .label { font-size: 13px; color: #8c8c9a; margin-bottom: 8px; }
.statCard .value { font-size: 28px; font-weight: 600; color: #1f1f2e; }
.statCard .value.small { font-size: 22px; }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.card { background: #fff; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.cardTitle { font-size: 16px; font-weight: 600; margin-bottom: 16px; }
.actions { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 16px; }
.actionBtn { padding: 10px 16px; border-radius: 8px; background: #5c5c9e; color: #fff; text-decoration: none; font-size: 14px; }
.tips { padding-left: 18px; color: #5c5c66; line-height: 1.8; font-size: 14px; }
.taskList { list-style: none; }
.taskList li { padding: 12px 0; border-bottom: 1px solid #f0f0f3; }
.taskMain { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 4px; }
.orderNo { font-weight: 600; font-size: 14px; color: #1f1f2e; }
.tag { font-size: 12px; padding: 2px 8px; border-radius: 999px; background: #f4f5f7; color: #5c5c66; white-space: nowrap; }
.tag.accepted { background: #e6f4ff; color: #1677ff; }
.tag.delivering { background: #fff7e6; color: #d48806; }
.tag.completed { background: #f6ffed; color: #389e0d; }
.taskSub { font-size: 13px; color: #5c5c66; margin-bottom: 4px; }
.taskMeta { font-size: 12px; color: #8c8c9a; }
.empty { color: #8c8c9a; font-size: 14px; }
@media (max-width: 960px) {
  .stats { grid-template-columns: repeat(2, 1fr); }
  .grid { grid-template-columns: 1fr; }
}
@media (max-width: 768px) {
  .header { margin-bottom: 18px; }
  .title { font-size: 22px; }
  .stats { grid-template-columns: 1fr; gap: 12px; margin-bottom: 16px; }
  .statCard { padding: 16px; }
  .statCard .value { font-size: 26px; }
  .grid { gap: 16px; }
  .card { padding: 18px 16px; }
  .actions { display: grid; grid-template-columns: 1fr; }
  .actionBtn { min-height: 44px; padding: 0 16px; display: flex; align-items: center; justify-content: center; }
  .taskList li { padding: 14px 0; }
}
</style>
