<template>
  <div class="panel">
    <p v-if="banner" class="ledgerBanner">{{ banner }}</p>
    <div v-if="loading" class="loading">加载中...</div>
    <p v-else-if="error" class="error">{{ error }}</p>
    <template v-else>
      <table v-if="records.length && !isMobile" class="table">
        <thead>
          <tr>
            <th>时间</th>
            <th>订单号</th>
            <th>商家</th>
            <th v-if="showCommission">抽佣</th>
            <th>订单额</th>
            <th>可分配/平台盘</th>
            <th v-if="showMerchant">商家份额</th>
            <th v-if="showPlatform">平台服务费</th>
            <th v-if="showProperty">物业</th>
            <th v-if="showCoordinator">统筹</th>
            <th v-if="showSector">板块</th>
            <th v-if="showIndividual">个体</th>
            <th v-if="showCourier">配送员(配送费)</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in records" :key="item.id">
            <td>{{ item.createdAt || '—' }}</td>
            <td>{{ item.orderNo || item.orderId || '—' }}</td>
            <td>{{ item.merchantName || '—' }}</td>
            <td v-if="showCommission">{{ formatRate(item.commissionRate) }}</td>
            <td>{{ formatMoney(item.totalAmount) }}</td>
            <td>{{ formatMoney(item.distributableAmount) }}</td>
            <td v-if="showMerchant">{{ formatMoney(shareOf(item, 'merchant')) }}</td>
            <td v-if="showPlatform">{{ formatMoney(shareOf(item, 'platform')) }}</td>
            <td v-if="showProperty">{{ formatMoney(shareOf(item, 'property')) }}</td>
            <td v-if="showCoordinator">{{ formatMoney(shareOf(item, 'coordinator')) }}</td>
            <td v-if="showSector">{{ formatMoney(shareOf(item, 'sector')) }}</td>
            <td v-if="showIndividual">{{ formatMoney(shareOf(item, 'individual')) }}</td>
            <td v-if="showCourier">{{ formatMoney(shareOf(item, 'courier')) }}</td>
          </tr>
        </tbody>
      </table>
      <div v-else-if="records.length" class="mobileCards">
        <article v-for="item in records" :key="item.id" class="recordCard">
          <div class="recordRow"><span>时间</span><strong>{{ item.createdAt || '—' }}</strong></div>
          <div class="recordRow"><span>订单号</span><strong>{{ item.orderNo || item.orderId || '—' }}</strong></div>
          <div class="recordRow"><span>商家</span><strong>{{ item.merchantName || '—' }}</strong></div>
          <div v-if="showCommission" class="recordRow">
            <span>抽佣</span><strong>{{ formatRate(item.commissionRate) }}</strong>
          </div>
          <div class="recordRow"><span>订单额</span><strong>{{ formatMoney(item.totalAmount) }}</strong></div>
          <div class="recordRow">
            <span>可分配/平台盘</span><strong>{{ formatMoney(item.distributableAmount) }}</strong>
          </div>
          <div v-if="showMerchant" class="recordRow">
            <span>商家份额</span><strong>{{ formatMoney(shareOf(item, 'merchant')) }}</strong>
          </div>
          <div v-if="showPlatform" class="recordRow">
            <span>平台服务费</span><strong>{{ formatMoney(shareOf(item, 'platform')) }}</strong>
          </div>
          <div v-if="showProperty" class="recordRow">
            <span>物业</span><strong>{{ formatMoney(shareOf(item, 'property')) }}</strong>
          </div>
          <div v-if="showCoordinator" class="recordRow">
            <span>统筹</span><strong>{{ formatMoney(shareOf(item, 'coordinator')) }}</strong>
          </div>
          <div v-if="showSector" class="recordRow">
            <span>板块</span><strong>{{ formatMoney(shareOf(item, 'sector')) }}</strong>
          </div>
          <div v-if="showIndividual" class="recordRow">
            <span>个体</span><strong>{{ formatMoney(shareOf(item, 'individual')) }}</strong>
          </div>
          <div v-if="showCourier" class="recordRow">
            <span>配送员(配送费)</span><strong>{{ formatMoney(shareOf(item, 'courier')) }}</strong>
          </div>
        </article>
      </div>
      <p v-else class="empty">暂无分成记录</p>
      <div v-if="totalPages > 1" class="pagination">
        <button class="pageBtn" :disabled="page <= 1 || loading" @click="$emit('page-change', page - 1)">
          &lt;
        </button>
        <span class="pageInfo">{{ page }} / {{ totalPages }}</span>
        <button
          class="pageBtn"
          :disabled="page >= totalPages || loading"
          @click="$emit('page-change', page + 1)"
        >
          &gt;
        </button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { DistributionRecordItem } from '../api/types'
import { useIsMobile } from '../composables/useIsMobile'

type ShareKey = 'merchant' | 'platform' | 'property' | 'coordinator' | 'sector' | 'individual' | 'courier'

interface Props {
  records: DistributionRecordItem[]
  loading?: boolean
  error?: string
  page?: number
  totalPages?: number
  banner?: string
  showCommission?: boolean
  showMerchant?: boolean
  showProperty?: boolean
  showPlatform?: boolean
  showCoordinator?: boolean
  showSector?: boolean
  showIndividual?: boolean
  showCourier?: boolean
}

withDefaults(defineProps<Props>(), {
  loading: false,
  error: '',
  page: 1,
  totalPages: 1,
  banner: '金额均为账面待结算/可提现口径，非支付通道实时到账。配送员收入来自配送费（我们公司抽成后余额，无保底），与可提现为同一笔；不从平台盘切。',
  showCommission: true,
  showMerchant: true,
  showProperty: true,
  showPlatform: true,
  showCoordinator: true,
  showSector: true,
  showIndividual: true,
  showCourier: true
})
const { isMobile } = useIsMobile()

defineEmits<{ 'page-change': [page: number] }>()

const SHARE_FIELDS: Record<ShareKey, string[]> = {
  merchant: ['merchantShare', 'merchantAmount', 'merchant_share', 'merchant_amount'],
  platform: ['platformShare', 'platformAmount', 'platform_share', 'platform_amount'],
  property: ['propertyShare', 'propertyAmount', 'property_share', 'property_amount'],
  coordinator: [
    'coordinatorShare',
    'coordinatorAmount',
    'coordinator_share',
    'coordinator_amount'
  ],
  sector: [
    'sectorLeaderShare',
    'sectorLeaderAmount',
    'sector_leader_share',
    'sector_leader_amount'
  ],
  individual: [
    'individualLeaderShare',
    'individualLeaderAmount',
    'individual_leader_share',
    'individual_leader_amount'
  ],
  courier: ['courierShare', 'courierAmount', 'courier_share', 'courier_amount']
}

function shareOf(item: DistributionRecordItem, key: ShareKey) {
  const raw = item as Record<string, unknown>
  for (const field of SHARE_FIELDS[key]) {
    const value = raw[field]
    if (value !== undefined && value !== null && value !== '') {
      const num = Number(value)
      if (!Number.isNaN(num)) return num
    }
  }

  // 商家份额兜底：B 方案按商品价×(1−抽佣)；仅当后端未给字段时用于展示
  if (key === 'merchant') {
    const total = Number(item.totalAmount)
    const deliveryFee = Number(item.deliveryFee)
    const product =
      item.productAmount != null && Number.isFinite(Number(item.productAmount))
        ? Number(item.productAmount)
        : Number.isFinite(total) && Number.isFinite(deliveryFee)
          ? total - deliveryFee
          : undefined
    const rate = Number(item.commissionRate)
    if (product != null && Number.isFinite(product) && Number.isFinite(rate)) {
      return Math.round(product * (1 - rate) * 100) / 100
    }
    if (Number.isFinite(total) && Number.isFinite(rate) && !Number.isFinite(deliveryFee)) {
      return Math.round(total * (1 - rate) * 100) / 100
    }
    const pool = Number(item.distributableAmount)
    if (product != null && Number.isFinite(product) && Number.isFinite(pool) && pool < product) {
      return Math.round((product - pool) * 100) / 100
    }
    if (Number.isFinite(total) && Number.isFinite(pool) && pool < total) {
      return Math.round((total - pool) * 100) / 100
    }
  }

  // B 方案：配送员 = 配送费 − 我们公司抽成（仅缺字段时展示兜底）
  if (key === 'courier') {
    const fee = Number(item.deliveryFee)
    const platformCut = Number(item.platformDeliveryShare)
    if (Number.isFinite(fee) && Number.isFinite(platformCut)) {
      return Math.round(Math.max(fee - platformCut, 0) * 100) / 100
    }
  }
  return undefined
}

function formatMoney(value?: number) {
  if (value === undefined || value === null || Number.isNaN(Number(value))) return '—'
  return `¥${Number(value).toFixed(2)}`
}

function formatRate(rate?: number) {
  if (rate === undefined || rate === null || Number.isNaN(Number(rate))) return '—'
  return `${(Number(rate) * 100).toFixed(2)}%`
}
</script>

<style scoped>
.panel { background: #ffffff; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.ledgerBanner {
  margin: 0 0 14px;
  padding: 10px 12px;
  border-radius: 8px;
  background: #fff8e8;
  color: #8a6d1d;
  font-size: 13px;
  line-height: 1.5;
}
.loading, .empty, .error { font-size: 14px; color: #8c8c9a; text-align: center; padding: 32px 0; }
.error { color: #e05c5c; }
.table { width: 100%; border-collapse: collapse; }
.table th, .table td { padding: 12px 8px; text-align: left; border-bottom: 1px solid #f0f0f3; font-size: 12px; }
.table th { color: #8c8c9a; font-weight: 500; white-space: nowrap; }
.table td { color: #1f1f2e; }
.pagination { display: flex; align-items: center; justify-content: center; gap: 12px; margin-top: 16px; }
.pageBtn { padding: 6px 12px; border: 1px solid #e8e8ec; border-radius: 8px; background: #fff; cursor: pointer; }
.pageBtn:disabled { opacity: 0.5; cursor: not-allowed; }
.pageInfo { font-size: 13px; color: #8c8c9a; }
@media (max-width: 768px) {
  .panel { padding: 14px; border-radius: 14px; }
  .mobileCards { display: grid; gap: 12px; }
  .recordCard { padding: 14px; border: 1px solid #f0f0f3; border-radius: 12px; }
  .recordRow { display: flex; justify-content: space-between; gap: 12px; padding: 5px 0; font-size: 13px; }
  .recordRow span { color: #8c8c9a; flex-shrink: 0; }
  .recordRow strong { color: #1f1f2e; text-align: right; word-break: break-all; }
}
</style>
