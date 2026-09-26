<template>
  <div class="panel">
    <p v-if="banner" class="ledgerBanner">{{ banner }}</p>
    <div v-if="loading" class="loading">加载中...</div>
    <p v-else-if="error" class="error">{{ error }}</p>
    <template v-else>
      <template v-if="records.length && !isMobile">
        <h3 class="tableTitle">商品分账</h3>
        <table class="table">
          <thead>
            <tr>
              <th>时间</th>
              <th>订单号</th>
              <th>商家</th>
              <th v-if="showResident">住户</th>
              <th>订单金额</th>
              <th>商品金额</th>
              <th v-if="showCommission">抽佣比例</th>
              <th v-if="showMerchant">商家收入</th>
              <th v-if="showPlatform">平台</th>
              <th v-if="showProperty">物业</th>
              <th v-if="showCoordinator">统筹</th>
              <th v-if="showSector">板块</th>
              <th v-if="showIndividual">个体</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in records" :key="`a-${item.id}`" :class="{ reverse: isReverse(item) }">
              <td>{{ item.createdAt || '—' }}</td>
              <td class="idCell">{{ item.orderNo || item.orderId || '—' }}</td>
              <td>{{ item.merchantName || '—' }}</td>
              <td v-if="showResident">{{ item.residentName || item.residentId || '—' }}</td>
              <td :class="amountClass(item.totalAmount)">{{ formatMoney(item.totalAmount) }}</td>
              <td :class="amountClass(item.productAmount)">{{ formatMoney(item.productAmount) }}</td>
              <td v-if="showCommission">{{ formatRate(item.commissionRate) }}</td>
              <td v-if="showMerchant" :class="amountClass(shareOf(item, 'merchant'))">
                {{ formatMoney(shareOf(item, 'merchant')) }}
              </td>
              <td v-if="showPlatform" :class="amountClass(shareOf(item, 'platform'))">
                {{ formatMoney(shareOf(item, 'platform')) }}
              </td>
              <td v-if="showProperty" :class="amountClass(shareOf(item, 'property'))">
                {{ formatMoney(shareOf(item, 'property')) }}
              </td>
              <td v-if="showCoordinator" :class="amountClass(shareOf(item, 'coordinator'))">
                {{ formatMoney(shareOf(item, 'coordinator')) }}
              </td>
              <td v-if="showSector" :class="amountClass(shareOf(item, 'sector'))">
                {{ formatMoney(shareOf(item, 'sector')) }}
              </td>
              <td v-if="showIndividual" :class="amountClass(shareOf(item, 'individual'))">
                {{ formatMoney(shareOf(item, 'individual')) }}
              </td>
              <td>{{ statusLabel(item.status) }}</td>
            </tr>
          </tbody>
        </table>

        <h3 class="tableTitle">配送费分账</h3>
        <table class="table">
          <thead>
            <tr>
              <th>时间</th>
              <th>订单号</th>
              <th>配送方式</th>
              <th>用户配送费</th>
              <th>平台</th>
              <th v-if="showCourier">配送员</th>
              <th>商家</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in records" :key="`b-${item.id}`" :class="{ reverse: isReverse(item) }">
              <td>{{ item.createdAt || '—' }}</td>
              <td class="idCell">{{ item.orderNo || item.orderId || '—' }}</td>
              <td>{{ fulfillmentLabel(item) }}</td>
              <td :class="amountClass(item.deliveryFee)">{{ formatMoney(item.deliveryFee) }}</td>
              <td :class="amountClass(item.platformDeliveryShare)">{{ formatMoney(item.platformDeliveryShare) }}</td>
              <td v-if="showCourier" :class="amountClass(item.courierEarning)">
                {{ formatMoney(item.courierEarning) }}
              </td>
              <td :class="amountClass(item.merchantDeliveryFeeShare)">
                {{ formatMoney(item.merchantDeliveryFeeShare) }}
              </td>
            </tr>
          </tbody>
        </table>
      </template>
      <div v-else-if="records.length" class="mobileCards">
        <article
          v-for="item in records"
          :key="item.id"
          class="recordCard"
          :class="{ reverse: isReverse(item) }"
        >
          <div class="recordRow"><span>时间</span><strong>{{ item.createdAt || '—' }}</strong></div>
          <div class="recordRow">
            <span>订单号</span><strong class="idCell">{{ item.orderNo || item.orderId || '—' }}</strong>
          </div>
          <div class="recordRow"><span>商家</span><strong>{{ item.merchantName || '—' }}</strong></div>
          <div v-if="showResident" class="recordRow">
            <span>住户</span><strong>{{ item.residentName || item.residentId || '—' }}</strong>
          </div>
          <div class="recordRow">
            <span>订单金额</span>
            <strong :class="amountClass(item.totalAmount)">{{ formatMoney(item.totalAmount) }}</strong>
          </div>
          <h4 class="cardSection">商品分账</h4>
          <div v-if="showMerchant" class="recordRow">
            <span>商家收入</span>
            <strong :class="amountClass(shareOf(item, 'merchant'))">{{ formatMoney(shareOf(item, 'merchant')) }}</strong>
          </div>
          <div v-if="showPlatform" class="recordRow">
            <span>平台</span>
            <strong :class="amountClass(shareOf(item, 'platform'))">{{ formatMoney(shareOf(item, 'platform')) }}</strong>
          </div>
          <div v-if="showProperty" class="recordRow">
            <span>物业</span>
            <strong :class="amountClass(shareOf(item, 'property'))">{{ formatMoney(shareOf(item, 'property')) }}</strong>
          </div>
          <div v-if="showCoordinator" class="recordRow">
            <span>统筹</span>
            <strong :class="amountClass(shareOf(item, 'coordinator'))">{{ formatMoney(shareOf(item, 'coordinator')) }}</strong>
          </div>
          <div v-if="showSector" class="recordRow">
            <span>板块</span>
            <strong :class="amountClass(shareOf(item, 'sector'))">{{ formatMoney(shareOf(item, 'sector')) }}</strong>
          </div>
          <div v-if="showIndividual" class="recordRow">
            <span>个体</span>
            <strong :class="amountClass(shareOf(item, 'individual'))">{{ formatMoney(shareOf(item, 'individual')) }}</strong>
          </div>
          <h4 class="cardSection">配送费分账</h4>
          <div class="recordRow"><span>配送方式</span><strong>{{ fulfillmentLabel(item) }}</strong></div>
          <div class="recordRow">
            <span>用户配送费</span>
            <strong :class="amountClass(item.deliveryFee)">{{ formatMoney(item.deliveryFee) }}</strong>
          </div>
          <div class="recordRow">
            <span>平台</span>
            <strong :class="amountClass(item.platformDeliveryShare)">{{ formatMoney(item.platformDeliveryShare) }}</strong>
          </div>
          <div v-if="showCourier" class="recordRow">
            <span>配送员</span>
            <strong :class="amountClass(item.courierEarning)">{{ formatMoney(item.courierEarning) }}</strong>
          </div>
          <div class="recordRow">
            <span>商家</span>
            <strong :class="amountClass(item.merchantDeliveryFeeShare)">{{ formatMoney(item.merchantDeliveryFeeShare) }}</strong>
          </div>
          <div class="recordRow"><span>状态</span><strong>{{ statusLabel(item.status) }}</strong></div>
          <p v-if="isReverse(item)" class="reverseHint">退款冲账</p>
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
import {
  DISTRIBUTION_RECORD_STATUS_LABEL,
  FULFILLMENT_MODE_LABEL,
  getEnumLabel
} from '../constants/enums'

type ShareKey = 'merchant' | 'platform' | 'property' | 'coordinator' | 'sector' | 'individual'

interface Props {
  records: DistributionRecordItem[]
  loading?: boolean
  error?: string
  page?: number
  totalPages?: number
  banner?: string
  showResident?: boolean
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
  banner: '商品货款和配送费分开记账。金额为负数表示退款冲账。大厅配送费归配送员，商家自配时归商家。',
  showResident: true,
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
  ]
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
  return undefined
}

function formatMoney(value?: number) {
  if (value === undefined || value === null || Number.isNaN(Number(value))) return '—'
  return `¥${Number(value).toFixed(2)}`
}

function amountClass(value?: number) {
  if (value === undefined || value === null || Number.isNaN(Number(value))) return undefined
  return Number(value) < 0 ? 'negative' : undefined
}

function isReverse(item: DistributionRecordItem) {
  const total = Number(item.totalAmount)
  const pool = Number(item.distributableAmount)
  return (Number.isFinite(total) && total < 0) || (Number.isFinite(pool) && pool < 0)
}

function formatRate(rate?: number) {
  if (rate === undefined || rate === null || Number.isNaN(Number(rate))) return '—'
  return `${(Number(rate) * 100).toFixed(0)}%`
}

function statusLabel(value?: string) {
  if (!value) return '—'
  return getEnumLabel(DISTRIBUTION_RECORD_STATUS_LABEL, value, '—')
}

function fulfillmentLabel(item: DistributionRecordItem) {
  return (
    item.fulfillmentModeLabel ||
    getEnumLabel(FULFILLMENT_MODE_LABEL, item.fulfillmentMode, '—')
  )
}
</script>

<style scoped>
.panel { background: #ffffff; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); overflow-x: auto; }
.ledgerBanner {
  margin: 0 0 14px;
  padding: 10px 12px;
  border-radius: 8px;
  background: #fff8e8;
  color: #8a6d1d;
  font-size: 13px;
  line-height: 1.5;
}
.tableTitle { font-size: 15px; font-weight: 600; color: #1f1f2e; margin: 8px 0 12px; }
.loading, .empty, .error { font-size: 14px; color: #8c8c9a; text-align: center; padding: 32px 0; }
.error { color: #e05c5c; }
.table { width: 100%; min-width: 720px; border-collapse: collapse; margin-bottom: 24px; }
.table th, .table td { padding: 12px 8px; text-align: left; border-bottom: 1px solid #f0f0f3; font-size: 13px; }
.table th { color: #8c8c9a; font-weight: 500; white-space: nowrap; }
.table td { color: #1f1f2e; }
.table tr.reverse { background: #fff8f6; }
.idCell {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
  word-break: break-all;
  overflow-wrap: anywhere;
  max-width: 160px;
}
.negative { color: #cf1322; }
.pagination { display: flex; align-items: center; justify-content: center; gap: 12px; margin-top: 16px; }
.pageBtn { padding: 6px 12px; border: 1px solid #e8e8ec; border-radius: 8px; background: #fff; cursor: pointer; }
.pageBtn:disabled { opacity: 0.5; cursor: not-allowed; }
.pageInfo { font-size: 13px; color: #8c8c9a; }
.cardSection { font-size: 13px; margin: 10px 0 4px; color: #5c5c9e; }
@media (max-width: 768px) {
  .panel { padding: 14px; border-radius: 14px; }
  .mobileCards { display: grid; gap: 12px; }
  .recordCard { padding: 14px; border: 1px solid #f0f0f3; border-radius: 12px; }
  .recordCard.reverse { border-color: #ffccc7; background: #fff8f6; }
  .recordRow { display: flex; justify-content: space-between; gap: 12px; padding: 5px 0; font-size: 13px; }
  .recordRow span { color: #8c8c9a; flex-shrink: 0; }
  .recordRow strong { color: #1f1f2e; text-align: right; word-break: break-all; }
  .reverseHint { margin: 8px 0 0; font-size: 12px; color: #cf1322; }
}
</style>
