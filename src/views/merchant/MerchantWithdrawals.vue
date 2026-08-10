<template>
  <div class="page">
    <div class="header">
      <div>
        <h1 class="title">提现管理</h1>
        <p class="desc">{{ pageDesc }}</p>
      </div>
      <button
        class="btnPrimary"
        :disabled="wallet?.withdrawalBlocked === true"
        @click="openModal"
      >
        申请提现
      </button>
    </div>

    <div class="stats">
      <div class="statCard green">
        <div class="label">可提现余额</div>
        <div class="value">¥{{ formatMoney(wallet?.withdrawableAmount) }}</div>
      </div>
      <div class="statCard">
        <div class="label">处理中</div>
        <div class="value">¥{{ formatMoney(pendingAmount) }}</div>
      </div>
      <div class="statCard">
        <div class="label">累计已提现</div>
        <div class="value">¥{{ formatMoney(wallet?.totalWithdrawn) }}</div>
      </div>
      <div class="statCard" :class="{ warn: wallet?.withdrawalBlocked }">
        <div class="label">提现状态</div>
        <div class="value small">{{ wallet?.withdrawalBlocked ? '已阻止' : '正常' }}</div>
      </div>
      <div class="statCard">
        <div class="label">自动提现</div>
        <div class="value small">{{ autoWithdrawalLabel }}</div>
      </div>
    </div>
    <p v-if="wallet?.withdrawalBlocked" class="bannerWarn">当前账号已被阻止提现，请联系物业管理员</p>
    <p v-if="walletError" class="bannerWarn">{{ walletError }}</p>

    <div class="toolbar">
      <select v-model="auditFilter" class="select" @change="load(1)">
        <option value="">全部状态</option>
        <option v-for="opt in statusOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
      </select>
    </div>

    <div class="panel">
      <div v-if="loading" class="loading">加载中...</div>
      <p v-else-if="error" class="error">{{ error }}</p>
      <div v-else-if="records.length && isMobile" class="mobileList">
        <article v-for="item in records" :key="item.id" class="mobileCard">
          <div class="mobileCardHead"><strong>¥{{ formatMoney(item.amount) }}</strong><span>{{ getEnumLabel(LOCAL_STATUS_LABEL, item.status) }}</span></div>
          <p>手续费 ¥{{ formatMoney(item.feeAmount) }} · 实际到账 ¥{{ formatMoney(item.actualAmount) }}</p>
          <small>申请：{{ item.createdAt || '—' }}<template v-if="item.completedAt"> · 完成：{{ item.completedAt }}</template></small>
        </article>
      </div>
      <table v-else-if="records.length" class="table">
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
          <tr v-for="item in records" :key="item.id">
            <td>{{ item.createdAt || '—' }}</td>
            <td>¥{{ formatMoney(item.amount) }}</td>
            <td>¥{{ formatMoney(item.feeAmount) }}</td>
            <td>¥{{ formatMoney(item.actualAmount) }}</td>
            <td>{{ getEnumLabel(LOCAL_STATUS_LABEL, item.status) }}</td>
            <td>{{ item.completedAt || '—' }}</td>
          </tr>
        </tbody>
      </table>
      <p v-else class="empty">暂无提现记录</p>
    </div>

    <Teleport to="body">
      <div v-if="modalOpen" class="modalOverlay" @click.self="closeModal">
        <div class="modal" :class="{ mobileSheet: isMobile }">
          <div class="modalHeader">
            <h3 class="modalTitle">申请提现</h3>
            <button class="modalClose" @click="closeModal">&times;</button>
          </div>
          <div class="modalBody">
            <p class="hintInline">可提现余额 ¥{{ formatMoney(wallet?.withdrawableAmount) }}</p>
            <p v-if="formError" class="error">{{ formError }}</p>
            <div class="field">
              <label class="label">提现金额（元）</label>
              <input v-model.number="amount" type="number" min="0.01" step="0.01" class="input" />
            </div>
          </div>
          <div class="modalFooter">
            <button class="btnSecondary" @click="closeModal">取消</button>
            <button class="btnPrimary" :disabled="submitting" @click="submit">
              {{ submitting ? '提交中...' : '确认申请' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { merchantPortalApi, propertyCompanyApi } from '../../api/services'
import type { MerchantWithdrawalItem, MyMerchantDetail, PropertyCompanyDetail } from '../../api/types'
import { formatApiError } from '../../api/request'
import { getEnumLabel, WITHDRAWAL_AUDIT_STATUS, WITHDRAWAL_AUDIT_STATUS_LABEL } from '../../constants/enums'
import { useIsMobile } from '../../composables/useIsMobile'

const route = useRoute()
const { isMobile } = useIsMobile()
const pageDesc = computed(() => {
  if (route.name === 'activity-leader-withdrawals') {
    return '组长小店收入提现（账面待结算/可提现；首次申请将自动开通店铺）'
  }
  if (route.name === 'technician-withdrawals') {
    return '技工服务档口收入提现（账面待结算/可提现；按已完成服务订单聚合）'
  }
  return '账面分成可提现（非通道实时到账）；手续费与实际到账以服务端返回为准'
})

const LOCAL_STATUS_LABEL: Record<string, string> = { ...WITHDRAWAL_AUDIT_STATUS_LABEL, pending: '审核中' }
const PENDING_STATUSES = new Set([
  WITHDRAWAL_AUDIT_STATUS.PENDING,
  'pending',
  WITHDRAWAL_AUDIT_STATUS.APPROVED
])

const statusOptions = Object.entries(LOCAL_STATUS_LABEL).map(([value, label]) => ({ value, label }))

const wallet = ref<MyMerchantDetail | null>(null)
const walletError = ref('')
const propertyCurrent = ref<PropertyCompanyDetail | null>(null)
const records = ref<MerchantWithdrawalItem[]>([])
const loading = ref(false)
const error = ref('')
const auditFilter = ref('')
const modalOpen = ref(false)
const amount = ref<number | ''>('')
const submitting = ref(false)
const formError = ref('')

const pendingAmount = computed(() => {
  if (wallet.value?.pendingWithdrawalAmount != null) {
    return Number(wallet.value.pendingWithdrawalAmount) || 0
  }
  return records.value
    .filter((item) => PENDING_STATUSES.has(item.status || ''))
    .reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
})

const autoWithdrawalLabel = computed(() => {
  const enabled = propertyCurrent.value?.autoWithdrawalEnabled
  if (enabled == null) return '—'
  if (!enabled) return '未开启'
  const days = propertyCurrent.value?.autoWithdrawalPeriodDays
  return days != null ? `每 ${days} 天` : '已开启'
})

function formatMoney(value?: number | null) {
  if (value === undefined || value === null || Number.isNaN(Number(value))) return '0.00'
  return Number(value).toFixed(2)
}

async function loadWallet() {
  walletError.value = ''
  try {
    wallet.value = await merchantPortalApi.my()
  } catch (e) {
    wallet.value = null
    walletError.value = formatApiError(e, '可提现余额加载失败')
  }
}

async function loadPropertyCurrent() {
  try {
    propertyCurrent.value = await propertyCompanyApi.current()
  } catch {
    propertyCurrent.value = null
  }
}

async function load(page = 1) {
  loading.value = true
  error.value = ''
  try {
    const res = await merchantPortalApi.withdrawals({
      page,
      pageSize: 50,
      auditStatus: auditFilter.value || undefined,
      sort: '-createdAt'
    })
    records.value = res.list || []
  } catch (e) {
    error.value = formatApiError(e, '提现记录加载失败')
  } finally {
    loading.value = false
  }
}

function openModal() {
  if (wallet.value?.withdrawalBlocked) {
    formError.value = '当前账号已被阻止提现'
    return
  }
  formError.value = ''
  amount.value = ''
  modalOpen.value = true
}

function closeModal() {
  modalOpen.value = false
}

async function submit() {
  const value = Number(amount.value)
  if (!value || value <= 0) {
    formError.value = '请输入有效提现金额'
    return
  }
  if (wallet.value?.withdrawalBlocked) {
    formError.value = '当前账号已被阻止提现'
    return
  }
  const available = Number(wallet.value?.withdrawableAmount ?? 0)
  if (value > available + 1e-9) {
    formError.value = `超过可提现余额（¥${formatMoney(available)}）`
    return
  }
  submitting.value = true
  formError.value = ''
  try {
    await merchantPortalApi.createWithdrawal({ amount: value })
    closeModal()
    await Promise.all([loadWallet(), load(1)])
  } catch (e) {
    formError.value = formatApiError(e, '申请失败')
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  await Promise.all([loadWallet(), loadPropertyCurrent(), load(1)])
})
</script>

<style scoped>
.page { max-width: 1200px; }
.header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 20px; gap: 16px; flex-wrap: wrap; }
.title { font-size: 24px; font-weight: 600; color: #1f1f2e; margin-bottom: 8px; }
.desc { font-size: 14px; color: #8c8c9a; }
.btnPrimary { padding: 10px 18px; border-radius: 8px; background: #5c5c9e; color: #fff; border: none; cursor: pointer; }
.btnPrimary:disabled { opacity: 0.55; cursor: not-allowed; }
.btnPrimary:hover:not(:disabled) { background: #52529a; }
.btnSecondary { padding: 10px 18px; border-radius: 8px; border: 1px solid #e8e8ec; background: #fff; color: #5c5c66; font-size: 14px; cursor: pointer; }
.btnSecondary:hover { border-color: #5c5c9e; color: #5c5c9e; }
.stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 12px; }
.statCard { background: #fff; border-radius: 12px; padding: 16px 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.statCard.green .value { color: #3aaf7d; }
.statCard.warn .value { color: #e05c5c; }
.statCard .label { font-size: 13px; color: #8c8c9a; margin-bottom: 8px; }
.statCard .value { font-size: 22px; font-weight: 600; color: #1f1f2e; }
.statCard .value.small { font-size: 18px; }
.bannerWarn { margin: 0 0 16px; padding: 10px 12px; border-radius: 8px; background: #fff7e8; color: #b76a00; font-size: 13px; }
.toolbar { margin-bottom: 16px; }
.select { padding: 8px 12px; border: 1px solid #e8e8ec; border-radius: 8px; background: #fff; }
.panel { background: #fff; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.loading, .empty, .error { text-align: center; padding: 32px 0; color: #8c8c9a; font-size: 14px; }
.error { color: #e05c5c; text-align: left; padding: 0 0 12px; }
.hintInline { margin: 0 0 12px; font-size: 13px; color: #5c5c66; }
.table { width: 100%; border-collapse: collapse; }
.table th, .table td { padding: 12px 10px; text-align: left; border-bottom: 1px solid #f0f0f3; font-size: 13px; }
.modalOverlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal { width: 420px; max-width: calc(100vw - 32px); background: #fff; border-radius: 12px; }
.modalHeader { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid #f0f0f3; }
.modalTitle { font-size: 16px; font-weight: 600; }
.modalClose { font-size: 24px; color: #8c8c9a; cursor: pointer; border: none; background: none; }
.modalBody { padding: 24px; }
.modalFooter { display: flex; justify-content: flex-end; gap: 12px; padding: 0 24px 24px; }
.field { margin-bottom: 16px; }
.label { display: block; font-size: 13px; color: #5c5c66; margin-bottom: 8px; }
.input { width: 100%; padding: 10px 12px; border: 1px solid #e8e8ec; border-radius: 8px; box-sizing: border-box; }
.mobileList { display: flex; flex-direction: column; gap: 12px; }
.mobileCard { border: 1px solid #ececf2; border-radius: 10px; padding: 14px; }
.mobileCardHead { display: flex; justify-content: space-between; gap: 12px; }
.mobileCard p { margin: 10px 0; color: #5c5c66; font-size: 13px; }
.mobileCard small { color: #8c8c9a; font-size: 12px; }
.mobileSheet { max-width: 100%; border-radius: 18px 18px 0 0; margin-top: auto; }
@media (max-width: 900px) {
  .stats { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 640px) {
  .header { flex-direction: column; gap: 12px; margin-bottom: 16px; }
  .header .btnPrimary, .toolbar .select { width: 100%; min-height: 44px; }
  .stats { grid-template-columns: 1fr 1fr; gap: 10px; }
  .panel { padding: 14px; }
  .modalOverlay { align-items: flex-end; padding: 0; }
  .modal { width: 100%; max-width: 100%; }
  .modalHeader, .modalBody { padding: 16px; }
  .modalFooter { flex-direction: column-reverse; padding: 0 16px 16px; gap: 8px; }
  .modalFooter .btnSecondary, .modalFooter .btnPrimary { width: 100%; min-height: 44px; }
}
</style>
