<template>
  <div class="page" :class="{ mobilePage: isMobile }">
    <div class="header">
      <div>
        <h1 class="title">抢单大厅</h1>
        <p class="desc">查看待配送订单并抢单 · 共 {{ total }} 单可抢 · 预计收入读取后端 courierEarning</p>
      </div>
      <button class="btnSecondary" :disabled="loading" @click="load(page)">刷新</button>
    </div>

    <div class="panel">
      <div v-if="loading" class="loading">加载中...</div>
      <p v-else-if="error" class="error">{{ error }}</p>
      <p v-else-if="successMsg" class="success">{{ successMsg }}</p>
      <div v-if="!loading && deliveries.length" class="cards">
        <div v-for="item in deliveries" :key="item.id" class="card">
          <div class="cardTop">
            <span class="orderNo">{{ item.orderNo || item.orderId }}</span>
            <span class="earning" title="按配送结算基数计算；满额减免时由补贴保证配送收入">
              预计 +¥{{ formatMoney(item.courierEarning) }}
            </span>
          </div>
          <div class="row"><span class="label">商家</span><span>{{ item.merchantName || '—' }}</span></div>
          <div class="row"><span class="label">取货</span><span>{{ item.pickupAddress || item.merchantAddress || '—' }}</span></div>
          <div class="row"><span class="label">送达</span><span>{{ item.deliveryAddress || '—' }}</span></div>
          <div class="row"><span class="label">联系</span><span>{{ item.contactPhone || '—' }}</span></div>
          <div v-if="item.timeoutMinutes" class="row warn">
            <span class="label">时限</span><span>{{ item.timeoutMinutes }} 分钟内完成</span>
          </div>
          <div class="cardFooter">
            <span class="time">{{ item.createdAt || '—' }}</span>
            <button class="btnPrimary" :disabled="actionId === item.id" @click="grab(item.id)">
              {{ actionId === item.id ? '抢单中...' : '立即抢单' }}
            </button>
          </div>
        </div>
      </div>
      <p v-else-if="!loading" class="empty">暂无可抢订单</p>
      <div v-if="totalPages > 1" class="pagination">
        <button class="pageBtn" :disabled="page <= 1 || loading" @click="changePage(page - 1)">&lt;</button>
        <span class="pageInfo">{{ page }} / {{ totalPages }}</span>
        <button class="pageBtn" :disabled="page >= totalPages || loading" @click="changePage(page + 1)">&gt;</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { courierPortalApi } from '../../api/services'
import type { CourierDeliveryItem } from '../../api/types'
import { ApiError } from '../../api/request'
import { useIsMobile } from '../../composables/useIsMobile'

const router = useRouter()
const { isMobile } = useIsMobile()
const deliveries = ref<CourierDeliveryItem[]>([])
const loading = ref(false)
const error = ref('')
const successMsg = ref('')
const page = ref(1)
const totalPages = ref(1)
const total = ref(0)
const actionId = ref('')

function formatMoney(value?: number) {
  if (value === undefined || value === null) return '0.00'
  return Number(value).toFixed(2)
}

async function load(pageNo = 1) {
  loading.value = true
  error.value = ''
  successMsg.value = ''
  try {
    let res = await courierPortalApi.pending({ page: pageNo, pageSize: 10, sort: '-createdAt' })
    if (!res.list?.length && pageNo === 1) {
      res = await courierPortalApi.available({ page: pageNo, pageSize: 10, sort: '-createdAt' })
    }
    deliveries.value = res.list || []
    page.value = res.pagination?.page || pageNo
    totalPages.value = res.pagination?.totalPages || 1
    total.value = res.pagination?.total ?? deliveries.value.length
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '订单加载失败'
  } finally {
    loading.value = false
  }
}

function changePage(next: number) {
  load(next)
}

async function grab(id: string) {
  actionId.value = id
  error.value = ''
  try {
    await courierPortalApi.grab(id)
    successMsg.value = '抢单成功，已加入我的任务'
    await load(page.value)
    setTimeout(() => router.push({ name: 'courier-tasks' }), 800)
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '抢单失败，可能已被其他快递员抢走'
  } finally {
    actionId.value = ''
  }
}

onMounted(() => load(1))
</script>

<style scoped>
.page { max-width: 1200px; }
.header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 24px; }
.title { font-size: 24px; font-weight: 600; color: #1f1f2e; margin-bottom: 8px; }
.desc { font-size: 14px; color: #8c8c9a; }
.btnSecondary { padding: 10px 18px; border-radius: 8px; border: 1px solid #e8e8ec; background: #fff; color: #5c5c66; font-size: 14px; cursor: pointer; }
.btnSecondary:hover { border-color: #5c5c9e; color: #5c5c9e; }
.btnPrimary { padding: 10px 18px; border-radius: 8px; background: #5c5c9e; color: #fff; border: none; cursor: pointer; }
.btnPrimary:hover { background: #52529a; }
.btnPrimary:hover { background: #52529a; }
.panel { background: #fff; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.loading, .empty, .error, .success { text-align: center; padding: 16px 0; font-size: 14px; color: #8c8c9a; }
.error { color: #e05c5c; }
.success { color: #3aaf7d; }
.cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }
.card { border: 1px solid #e8e8ec; border-radius: 12px; padding: 16px; }
.cardTop { display: flex; justify-content: space-between; margin-bottom: 12px; }
.orderNo { font-weight: 600; color: #1f1f2e; }
.earning { color: #3aaf7d; font-weight: 600; }
.row { display: flex; gap: 12px; font-size: 13px; margin-bottom: 8px; line-height: 1.5; }
.row .label { width: 40px; color: #8c8c9a; flex-shrink: 0; }
.row.warn span:last-child { color: #d48806; }
.cardFooter { display: flex; align-items: center; justify-content: space-between; margin-top: 12px; padding-top: 12px; border-top: 1px solid #f0f0f3; }
.time { font-size: 12px; color: #8c8c9a; }
.pagination { display: flex; align-items: center; justify-content: center; gap: 12px; margin-top: 16px; }
.pageBtn { padding: 6px 12px; border: 1px solid #e8e8ec; border-radius: 8px; background: #fff; cursor: pointer; }
.pageInfo { font-size: 13px; color: #8c8c9a; }
@media (max-width: 768px) {
  .header { align-items: center; margin-bottom: 18px; gap: 12px; }
  .title { font-size: 22px; margin-bottom: 4px; }
  .desc { line-height: 1.5; }
  .btnSecondary { min-width: 72px; min-height: 44px; padding: 0 14px; }
  .panel { padding: 14px; border-radius: 10px; }
  .cards { display: grid; grid-template-columns: 1fr; gap: 12px; }
  .card { padding: 16px; border-radius: 10px; }
  .cardTop { align-items: flex-start; gap: 12px; }
  .orderNo { overflow-wrap: anywhere; }
  .row { gap: 10px; margin-bottom: 10px; }
  .row > span:last-child { min-width: 0; overflow-wrap: anywhere; }
  .cardFooter { align-items: flex-end; gap: 12px; }
  .time { max-width: 52%; line-height: 1.5; }
  .btnPrimary { min-width: 96px; min-height: 44px; padding: 0 16px; }
  .pageBtn { min-width: 44px; min-height: 44px; padding: 0; }
}
</style>
