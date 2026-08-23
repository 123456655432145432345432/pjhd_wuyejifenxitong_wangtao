<template>
  <div class="page">
    <div class="header">
      <div>
        <h1 class="title">平台收益</h1>
        <p class="desc">
          查看订单、配送费和提现手续费带来的平台收益。
          收益由微信支付分账结算至平台商户号，本页仅用于查询和对账。
        </p>
      </div>
      <button class="btnSecondary" :disabled="walletLoading" @click="refreshBalance">
        {{ walletLoading ? '刷新中...' : '刷新对账' }}
      </button>
    </div>

    <div class="walletSummary">
      <div class="statCard green">
        <div class="label">平台账户已入账余额</div>
        <div class="value">{{ walletOk ? `¥${formatMoney(settledBalance)}` : '—' }}</div>
      </div>
      <div class="statCard">
        <div class="label">处理中</div>
        <div class="value">{{ walletOk ? `¥${formatMoney(pendingAmount)}` : '—' }}</div>
      </div>
      <div class="statCard">
        <div class="label">累计已入账</div>
        <div class="value">{{ walletOk ? `¥${formatMoney(totalEarned)}` : '—' }}</div>
      </div>
      <div class="statCard">
        <div class="label">结算状态</div>
        <div class="value small">{{ walletOk ? settlementStatusText : '—' }}</div>
      </div>
    </div>

    <div v-if="walletOk" class="composeRow">
      <span>构成：订单分成 ¥{{ formatMoney(distributionShare) }}</span>
      <span>配送费分成 ¥{{ formatMoney(deliveryShare) }}</span>
      <span>提现手续费分成 ¥{{ formatMoney(feeShare) }}</span>
    </div>
    <p v-if="walletError" class="bannerWarn">{{ walletError }}</p>
    <p v-if="!canWithdraw && walletOk" class="bannerInfo">
      当前收益由微信支付分账结算至平台商户号，无需在管理端申请提现。
    </p>

    <div class="tabs">
      <button class="tab" :class="{ active: tab === 'stats' }" @click="tab = 'stats'">收益统计</button>
      <button class="tab" :class="{ active: tab === 'records' }" @click="tab = 'records'">收益明细</button>
    </div>

    <div class="toolbar">
      <select v-model="selectedPropertyId" class="input" @change="onPropertyChange">
        <option value="">全部物业</option>
        <option v-for="property in propertyCompanies" :key="property.id" :value="property.id">
          {{ property.name }}
        </option>
      </select>
      <input v-model="startDate" type="date" class="input dateInput" />
      <span class="sep">至</span>
      <input v-model="endDate" type="date" class="input dateInput" />
      <select v-if="tab === 'records'" v-model="filterType" class="input">
        <option v-for="opt in PLATFORM_EARNING_TYPE_OPTIONS" :key="opt.value || 'all'" :value="opt.value">
          {{ opt.label }}
        </option>
      </select>
      <button class="btnPrimary" :disabled="loading" @click="reload">查询</button>
    </div>

    <div v-if="loading" class="loading">加载中...</div>
    <p v-else-if="error" class="error">{{ error }}</p>

    <template v-else-if="tab === 'stats' && stats">
      <div class="stats">
        <div class="statCard purple">
          <div class="label">订单分成（我们公司）</div>
          <div class="value">¥{{ formatMoney(stats.totalPlatformShare) }}</div>
        </div>
        <div class="statCard">
          <div class="label">配送费分成</div>
          <div class="value">¥{{ formatMoney(stats.totalDeliveryEarning) }}</div>
        </div>
        <div class="statCard">
          <div class="label">提现手续费分成</div>
          <div class="value">¥{{ formatMoney(stats.totalWithdrawalFeeShare) }}</div>
        </div>
        <div class="statCard green">
          <div class="label">总收益</div>
          <div class="value">¥{{ formatMoney(stats.totalEarning) }}</div>
        </div>
      </div>
      <div class="card">
        <h3 class="cardTitle">按物业分布</h3>
        <ul v-if="stats.byProperty?.length" class="list">
          <li v-for="item in stats.byProperty" :key="item.propertyCompanyId">
            <span>{{ item.propertyName || item.propertyCompanyId }}</span>
            <span class="amounts">
              订单 ¥{{ formatMoney(item.platformShare) }} ·
              配送 ¥{{ formatMoney(item.deliveryEarning) }} ·
              提现 ¥{{ formatMoney(item.withdrawalFeeShare) }}
            </span>
          </li>
        </ul>
        <p v-else class="empty">暂无数据</p>
      </div>
    </template>

    <template v-else-if="tab === 'records'">
      <div class="panel">
        <div v-if="records.length" class="tableScroll">
          <table class="table recordsTable">
            <thead>
              <tr>
                <th>时间</th>
                <th>类型</th>
                <th>物业</th>
                <th>金额</th>
                <th>关联单号</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in records" :key="item.id">
                <td>{{ item.createdAt || '—' }}</td>
                <td>{{ getEnumLabel(PLATFORM_EARNING_TYPE_LABEL, item.type) }}</td>
                <td>{{ item.propertyName || item.propertyCompanyId || '—' }}</td>
                <td class="num">¥{{ formatMoney(item.amount) }}</td>
                <td class="idCell">{{ item.orderId || item.withdrawalId || '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-else class="empty">暂无明细</p>
        <div v-if="totalPages > 1" class="pager">
          <button class="pageBtn" :disabled="page <= 1" @click="changePage(page - 1)">&lt;</button>
          <span>{{ page }} / {{ totalPages }}</span>
          <button class="pageBtn" :disabled="page >= totalPages" @click="changePage(page + 1)">&gt;</button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { platformShareApi, propertyCompanyApi } from '../../api/services'
import type {
  PlatformEarningsBalance,
  PlatformEarningsStats,
  PlatformEarningRecordItem,
  PropertyCompanyItem
} from '../../api/types'
import { ApiError, formatApiError } from '../../api/request'
import {
  getEnumLabel,
  PLATFORM_EARNING_TYPE_LABEL,
  PLATFORM_EARNING_TYPE_OPTIONS
} from '../../constants/enums'

const tab = ref<'stats' | 'records'>('stats')
const loading = ref(false)
const error = ref('')
const startDate = ref('')
const endDate = ref('')
const filterType = ref('')
const selectedPropertyId = ref('')
const propertyCompanies = ref<PropertyCompanyItem[]>([])

const stats = ref<PlatformEarningsStats | null>(null)
const records = ref<PlatformEarningRecordItem[]>([])
const page = ref(1)
const totalPages = ref(1)

const wallet = ref<PlatformEarningsBalance | null>(null)
const walletOk = ref(false)
const walletLoading = ref(false)
const walletError = ref('')

function toAmount(val?: number | string | null) {
  if (val === undefined || val === null || val === '') return undefined
  const n = Number(val)
  return Number.isFinite(n) ? n : undefined
}

function formatMoney(val?: number | string | null) {
  const n = toAmount(val)
  if (n === undefined) return '0.00'
  return n.toFixed(2)
}

/** 已入账余额：优先新字段，兼容旧 withdrawableAmount */
const settledBalance = computed(
  () =>
    toAmount(wallet.value?.settledBalance) ??
    toAmount(wallet.value?.withdrawableAmount) ??
    toAmount(wallet.value?.totalEarned) ??
    toAmount(wallet.value?.totalEarning) ??
    0
)
const pendingAmount = computed(
  () => toAmount(wallet.value?.pendingAmount) ?? toAmount(wallet.value?.pendingWithdrawalAmount) ?? 0
)
const totalEarned = computed(
  () =>
    toAmount(wallet.value?.totalEarned) ??
    toAmount(wallet.value?.totalEarning) ??
    toAmount(wallet.value?.totalWithdrawn) ??
    settledBalance.value
)
const settlementStatusText = computed(() => {
  if (wallet.value?.withdrawalBlocked) return '结算受限'
  if (pendingAmount.value > 0) return '部分收益处理中'
  return '自动结算正常'
})
const distributionShare = computed(() => toAmount(wallet.value?.distributionShare) ?? 0)
const deliveryShare = computed(() => toAmount(wallet.value?.deliveryShare) ?? 0)
const feeShare = computed(() => toAmount(wallet.value?.withdrawalFeeShare) ?? 0)
/** 微信支付分账下恒为 false；仅作防御，页面不提供提现入口 */
const canWithdraw = computed(() => wallet.value?.withdrawAvailable === true)

function explainBalanceError(e: unknown, fallback: string) {
  const msg = formatApiError(e, fallback)
  if (/NoResourceFoundException|404|Not Found|no static resource/i.test(msg)) {
    return '平台收益对账服务暂不可用，请稍后重试或联系系统管理员'
  }
  return msg
}

async function loadWallet() {
  walletLoading.value = true
  walletError.value = ''
  try {
    wallet.value = await platformShareApi.earningsBalance({
      propertyCompanyId: selectedPropertyId.value || undefined
    })
    walletOk.value = true
  } catch (e) {
    walletOk.value = false
    wallet.value = null
    walletError.value = explainBalanceError(e, '平台收益对账加载失败')
  } finally {
    walletLoading.value = false
  }
}

async function refreshBalance() {
  await loadWallet()
}

async function onPropertyChange() {
  await loadWallet()
  await reload()
}

async function loadStats() {
  loading.value = true
  error.value = ''
  try {
    stats.value = await platformShareApi.earningsStats({
      propertyCompanyId: selectedPropertyId.value || undefined,
      startDate: startDate.value || undefined,
      endDate: endDate.value || undefined
    })
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '统计加载失败'
  } finally {
    loading.value = false
  }
}

async function loadRecords(pageNo = 1) {
  loading.value = true
  error.value = ''
  try {
    const res = await platformShareApi.earningsRecords({
      page: pageNo,
      pageSize: 20,
      propertyCompanyId: selectedPropertyId.value || undefined,
      type: filterType.value || undefined,
      startDate: startDate.value || undefined,
      endDate: endDate.value || undefined
    })
    records.value = res.list || []
    page.value = res.pagination?.page ?? pageNo
    totalPages.value = res.pagination?.totalPages ?? 1
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '明细加载失败'
  } finally {
    loading.value = false
  }
}

function reload() {
  if (tab.value === 'stats') loadStats()
  else loadRecords(1)
}

function changePage(next: number) {
  loadRecords(next)
}

watch(tab, () => reload())

async function loadPropertyCompanies() {
  try {
    const res = await propertyCompanyApi.list({ pageSize: 100 })
    propertyCompanies.value = res.list || []
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '物业列表加载失败'
  }
}

onMounted(async () => {
  await Promise.all([loadPropertyCompanies(), loadWallet()])
  await reload()
})
</script>

<style scoped>
.page { max-width: 1200px; min-width: 0; width: 100%; box-sizing: border-box; }
.header {
  display: flex; justify-content: space-between; align-items: flex-start;
  gap: 16px; margin-bottom: 20px; flex-wrap: wrap;
}
.title { font-size: 24px; font-weight: 600; color: #1f1f2e; margin-bottom: 8px; }
.desc { font-size: 14px; color: #8c8c9a; max-width: 760px; line-height: 1.55; }
.walletSummary {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 10px;
}
.composeRow {
  display: flex; flex-wrap: wrap; gap: 12px 18px; margin-bottom: 12px;
  font-size: 12px; color: #5c5c66;
}
.modeTag {
  padding: 1px 8px; border-radius: 999px; background: #eef1f6; color: #5c5c9e; font-weight: 600;
}
.tabs { display: flex; gap: 8px; margin-bottom: 16px; }
.tab { padding: 8px 16px; border-radius: 8px; border: 1px solid #e8e8ec; background: #fff; cursor: pointer; font-size: 14px; }
.tab.active { background: #5c5c9e; color: #fff; border-color: #5c5c9e; }
.toolbar { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
.input { padding: 8px 12px; border: 1px solid #e8e8ec; border-radius: 8px; font-size: 14px; }
.dateInput { width: 140px; }
.sep { color: #8c8c9a; font-size: 13px; }
.btnPrimary { padding: 10px 18px; border-radius: 8px; background: #5c5c9e; color: #fff; border: none; cursor: pointer; }
.btnPrimary:disabled { opacity: 0.55; cursor: not-allowed; }
.btnSecondary { padding: 10px 18px; border-radius: 8px; border: 1px solid #e8e8ec; background: #fff; cursor: pointer; }
.btnSecondary:disabled { opacity: 0.55; cursor: not-allowed; }
.loading, .error, .empty { font-size: 14px; color: #8c8c9a; text-align: center; padding: 24px 0; }
.error { color: #e05c5c; }
.bannerWarn, .bannerInfo {
  white-space: pre-wrap; padding: 10px 12px; border-radius: 8px; margin-bottom: 12px; font-size: 13px;
}
.bannerWarn { background: #fff7e6; color: #ad6800; }
.bannerInfo { background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; }
.stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 20px; }
.statCard { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.statCard.purple .value { color: #5c5c9e; }
.statCard.green .value { color: #3aaf7d; }
.statCard .label { font-size: 13px; color: #8c8c9a; margin-bottom: 8px; }
.statCard .value { font-size: 24px; font-weight: 600; }
.statCard .value.small { font-size: 15px; line-height: 1.35; font-weight: 600; color: #1f1f2e; }
.card, .panel {
  background: #fff; border-radius: 12px; padding: 24px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04); min-width: 0; overflow: hidden;
}
.cardTitle { font-size: 16px; font-weight: 600; margin-bottom: 16px; }
.list { list-style: none; }
.list li { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f0f0f3; font-size: 14px; flex-wrap: wrap; gap: 8px; }
.amounts { color: #5c5c66; font-size: 13px; }
.tableScroll { width: 100%; max-width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
.table { width: 100%; border-collapse: collapse; font-size: 14px; }
.recordsTable { min-width: 640px; }
.table th, .table td {
  padding: 12px 16px; text-align: left; border-bottom: 1px solid #f0f0f3;
  vertical-align: top; word-break: break-word; overflow-wrap: anywhere;
}
.table th { color: #8c8c9a; font-weight: 500; background: #fafafc; }
.table td.num { white-space: nowrap; }
.table td.idCell {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
  word-break: break-all;
}
.pager { display: flex; align-items: center; justify-content: center; gap: 12px; margin-top: 16px; }
.pageBtn { padding: 6px 12px; border: 1px solid #e8e8ec; border-radius: 8px; background: #fff; cursor: pointer; }
@media (max-width: 960px) {
  .stats, .walletSummary { grid-template-columns: repeat(2, 1fr); }
}
</style>
