<template>
  <div class="page">
    <div class="header">
      <div>
        <h1 class="title">平台收益</h1>
        <p class="desc">
          「我们公司」订单分成、配送费、提现手续费三条链路的统计与明细；可提现余额为三条链路汇总，仅平台管理员可申请提现。
        </p>
      </div>
      <button
        class="btnPrimary"
        :disabled="wallet?.withdrawalBlocked === true || !walletOk"
        @click="openApply"
      >
        申请提现
      </button>
    </div>

    <div class="walletSummary">
      <div class="statCard green">
        <div class="label">可提现余额</div>
        <div class="value">{{ walletOk ? `¥${formatMoney(wallet?.withdrawableAmount)}` : '—' }}</div>
      </div>
      <div class="statCard">
        <div class="label">处理中</div>
        <div class="value">{{ walletOk ? `¥${formatMoney(wallet?.pendingWithdrawalAmount)}` : '—' }}</div>
      </div>
      <div class="statCard">
        <div class="label">累计已提现</div>
        <div class="value">{{ walletOk ? `¥${formatMoney(wallet?.totalWithdrawn)}` : '—' }}</div>
      </div>
      <div class="statCard" :class="{ warn: wallet?.withdrawalBlocked }">
        <div class="label">提现状态</div>
        <div class="value small">{{ walletOk ? (wallet?.withdrawalBlocked ? '已阻止' : '正常') : '—' }}</div>
      </div>
    </div>
    <p v-if="walletError" class="bannerWarn">{{ walletError }}</p>
    <p v-if="bannerSuccess" class="bannerSuccess">{{ bannerSuccess }}</p>

    <div class="tabs">
      <button class="tab" :class="{ active: tab === 'stats' }" @click="tab = 'stats'">收益统计</button>
      <button class="tab" :class="{ active: tab === 'records' }" @click="tab = 'records'">收益明细</button>
      <button class="tab" :class="{ active: tab === 'withdrawals' }" @click="tab = 'withdrawals'">提现记录</button>
    </div>

    <div v-if="tab !== 'withdrawals'" class="toolbar">
      <select v-model="selectedPropertyId" class="input">
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

    <div v-else class="toolbar">
      <select v-model="withdrawalStatus" class="input" @change="loadWithdrawals(1)">
        <option v-for="opt in statusOptions" :key="opt.value || 'all'" :value="opt.value">
          {{ opt.label }}
        </option>
      </select>
      <button class="btnSecondary" :disabled="withdrawalsLoading" @click="loadWalletAndWithdrawals">刷新</button>
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
                <td>{{ item.orderId || item.withdrawalId || '—' }}</td>
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

    <template v-else-if="tab === 'withdrawals'">
      <div class="panel">
        <div v-if="withdrawalsLoading" class="loading">加载中...</div>
        <p v-else-if="withdrawalsError" class="error">{{ withdrawalsError }}</p>
        <div v-else-if="withdrawalRecords.length" class="tableScroll">
          <table class="table recordsTable">
            <thead>
              <tr>
                <th>申请时间</th>
                <th>提现金额</th>
                <th>手续费</th>
                <th>实际到账</th>
                <th>状态</th>
                <th>完成时间</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in withdrawalRecords" :key="item.id">
                <td>{{ item.createdAt || '—' }}</td>
                <td class="num">¥{{ formatMoney(item.amount) }}</td>
                <td class="num">¥{{ formatMoney(item.feeAmount) }}</td>
                <td class="num">¥{{ formatMoney(item.actualAmount) }}</td>
                <td>{{ getEnumLabel(WITHDRAWAL_AUDIT_STATUS_LABEL, item.status) }}</td>
                <td>{{ item.completedAt || '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-else class="empty">暂无提现记录</p>
        <div v-if="withdrawalTotalPages > 1" class="pager">
          <button
            class="pageBtn"
            :disabled="withdrawalPage <= 1"
            @click="loadWithdrawals(withdrawalPage - 1)"
          >
            &lt;
          </button>
          <span>{{ withdrawalPage }} / {{ withdrawalTotalPages }}</span>
          <button
            class="pageBtn"
            :disabled="withdrawalPage >= withdrawalTotalPages"
            @click="loadWithdrawals(withdrawalPage + 1)"
          >
            &gt;
          </button>
        </div>
      </div>
    </template>

    <Teleport to="body">
      <div v-if="modalOpen" class="modalOverlay" @click.self="modalOpen = false">
        <div class="modal">
          <div class="modalHeader">
            <h3 class="modalTitle">申请平台收益提现</h3>
            <button class="modalClose" @click="modalOpen = false">&times;</button>
          </div>
          <div class="modalBody">
            <p class="hintInline">
              可提现余额 ¥{{ formatMoney(wallet?.withdrawableAmount) }}（提交后手续费以服务端返回为准）
            </p>
            <div class="field">
              <label class="label">提现金额（元）</label>
              <input v-model.number="amount" type="number" min="0.01" step="0.01" class="input" />
            </div>
            <p v-if="formError" class="error inlineError">{{ formError }}</p>
            <div class="modalFooter">
              <button class="btnSecondary" @click="modalOpen = false">取消</button>
              <button class="btnPrimary" :disabled="submitting" @click="submitWithdrawal">
                {{ submitting ? '提交中...' : '提交申请' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { platformShareApi, propertyCompanyApi } from '../../api/services'
import type {
  PlatformEarningsBalance,
  PlatformEarningsStats,
  PlatformEarningRecordItem,
  PropertyCompanyItem,
  RoleWithdrawalItem
} from '../../api/types'
import { ApiError, formatApiError } from '../../api/request'
import {
  getEnumLabel,
  PLATFORM_EARNING_TYPE_LABEL,
  PLATFORM_EARNING_TYPE_OPTIONS,
  WITHDRAWAL_AUDIT_STATUS_LABEL,
  WITHDRAWAL_AUDIT_STATUS_OPTIONS
} from '../../constants/enums'

const tab = ref<'stats' | 'records' | 'withdrawals'>('stats')
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
const walletError = ref('')
const bannerSuccess = ref('')

const withdrawalsLoading = ref(false)
const withdrawalsError = ref('')
const withdrawalRecords = ref<RoleWithdrawalItem[]>([])
const withdrawalPage = ref(1)
const withdrawalTotalPages = ref(1)
const withdrawalStatus = ref('')
const statusOptions = WITHDRAWAL_AUDIT_STATUS_OPTIONS

const modalOpen = ref(false)
const amount = ref(0)
const submitting = ref(false)
const formError = ref('')

function formatMoney(val?: number | null) {
  if (val === undefined || val === null) return '0.00'
  return Number(val).toFixed(2)
}

function explainBalanceError(e: unknown, fallback: string) {
  const msg = formatApiError(e, fallback)
  if (/NoResourceFoundException|404|Not Found|no static resource/i.test(msg)) {
    return (
      `${msg}\n` +
      `前端请求：GET /admin/platform-earnings/balance 与 .../withdrawals。` +
      `若仍 404，请后端确认平台收益钱包/提现接口是否已部署。`
    )
  }
  return msg
}

async function loadWallet() {
  walletError.value = ''
  try {
    wallet.value = await platformShareApi.earningsBalance()
    walletOk.value = true
  } catch (e) {
    walletOk.value = false
    wallet.value = null
    walletError.value = explainBalanceError(e, '平台可提现余额加载失败')
  }
}

async function loadWithdrawals(pageNo = 1) {
  withdrawalsLoading.value = true
  withdrawalsError.value = ''
  try {
    const res = await platformShareApi.earningsWithdrawals({
      page: pageNo,
      pageSize: 20,
      status: withdrawalStatus.value || undefined
    })
    withdrawalRecords.value = res.list || []
    withdrawalPage.value = res.pagination?.page ?? pageNo
    withdrawalTotalPages.value = res.pagination?.totalPages ?? 1
  } catch (e) {
    withdrawalRecords.value = []
    withdrawalsError.value = explainBalanceError(e, '提现记录加载失败')
  } finally {
    withdrawalsLoading.value = false
  }
}

async function loadWalletAndWithdrawals() {
  bannerSuccess.value = ''
  await loadWallet()
  await loadWithdrawals(1)
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
  else if (tab.value === 'records') loadRecords(1)
  else loadWalletAndWithdrawals()
}

function changePage(next: number) {
  loadRecords(next)
}

function openApply() {
  amount.value = 0
  formError.value = ''
  bannerSuccess.value = ''
  modalOpen.value = true
}

async function submitWithdrawal() {
  if (!amount.value || amount.value <= 0) {
    formError.value = '请输入有效提现金额'
    return
  }
  const available = Number(wallet.value?.withdrawableAmount ?? 0)
  if (amount.value > available) {
    formError.value = `超过可提现余额（¥${formatMoney(available)}）`
    return
  }
  if (wallet.value?.withdrawalBlocked) {
    formError.value = '当前已被阻止提现'
    return
  }
  submitting.value = true
  formError.value = ''
  try {
    const created = await platformShareApi.createEarningsWithdrawal({ amount: amount.value })
    modalOpen.value = false
    bannerSuccess.value = `已提交提现申请：申请 ¥${formatMoney(created.amount)}，手续费 ¥${formatMoney(created.feeAmount)}，预计到账 ¥${formatMoney(created.actualAmount)}`
    tab.value = 'withdrawals'
    await loadWalletAndWithdrawals()
  } catch (e) {
    formError.value = formatApiError(e, '申请失败')
  } finally {
    submitting.value = false
  }
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
.desc { font-size: 14px; color: #8c8c9a; max-width: 720px; line-height: 1.5; }
.walletSummary {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 12px;
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
.loading, .error, .empty { font-size: 14px; color: #8c8c9a; text-align: center; padding: 24px 0; }
.error { color: #e05c5c; }
.inlineError { text-align: left; padding: 0 0 8px; }
.bannerWarn, .bannerSuccess {
  white-space: pre-wrap; padding: 10px 12px; border-radius: 8px; margin-bottom: 12px; font-size: 13px;
}
.bannerWarn { background: #fff7e6; color: #ad6800; }
.bannerSuccess { background: #f6ffed; color: #389e0d; }
.stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 20px; }
.statCard { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.statCard.purple .value { color: #5c5c9e; }
.statCard.green .value { color: #3aaf7d; }
.statCard.warn .value { color: #cf1322; }
.statCard .label { font-size: 13px; color: #8c8c9a; margin-bottom: 8px; }
.statCard .value { font-size: 24px; font-weight: 600; }
.statCard .value.small { font-size: 18px; }
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
.pager { display: flex; align-items: center; justify-content: center; gap: 12px; margin-top: 16px; }
.pageBtn { padding: 6px 12px; border: 1px solid #e8e8ec; border-radius: 8px; background: #fff; cursor: pointer; }
.modalOverlay { position: fixed; inset: 0; z-index: 1000; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; padding: 24px; }
.modal { background: #fff; border-radius: 12px; width: min(420px, 100%); }
.modalHeader { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid #f0f0f3; }
.modalTitle { font-size: 16px; font-weight: 600; margin: 0; }
.modalClose { border: none; background: none; font-size: 24px; cursor: pointer; color: #8c8c9a; }
.modalBody { padding: 24px; }
.field { margin-bottom: 12px; }
.label { display: block; font-size: 13px; color: #5c5c66; margin-bottom: 8px; }
.hintInline { margin: 0 0 12px; font-size: 13px; color: #5c5c66; }
.modalFooter { display: flex; justify-content: flex-end; gap: 12px; margin-top: 8px; }
@media (max-width: 960px) {
  .stats, .walletSummary { grid-template-columns: repeat(2, 1fr); }
}
</style>
