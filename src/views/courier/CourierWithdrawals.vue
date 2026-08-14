<template>
  <div class="page">
    <div class="header">
      <div>
        <h1 class="title">提现记录</h1>
        <p class="desc">
          配送收益提现。账户「实际可拿」只读
          <code>withdrawableAmount</code>（<code>GET /courier-managers/my</code>），完成配送后以该接口刷新，禁止前端加减。
          单笔预计收入见任务 <code>courierEarning</code>，入账后计入可提现。
        </p>
      </div>
      <button
        class="btnPrimary"
        :disabled="wallet?.withdrawalBlocked === true"
        @click="openApply"
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
    </div>
    <p v-if="wallet?.withdrawalBlocked" class="bannerWarn">当前账号已被阻止提现，请联系物业管理员</p>
    <p v-if="walletError" class="bannerWarn">{{ walletError }}</p>

    <div class="panel">
      <div v-if="loading" class="hint">加载中...</div>
      <p v-else-if="error" class="error">{{ error }}</p>
      <table v-else-if="list.length" class="table">
        <thead>
          <tr>
            <th>提现金额</th>
            <th>手续费</th>
            <th>实际到账</th>
            <th>状态</th>
            <th>申请时间</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in list" :key="item.id">
            <td>¥{{ formatMoney(item.amount) }}</td>
            <td>¥{{ formatMoney(item.feeAmount) }}</td>
            <td>¥{{ formatMoney(item.actualAmount) }}</td>
            <td>{{ getEnumLabel(WITHDRAWAL_AUDIT_STATUS_LABEL, item.status) }}</td>
            <td>{{ item.createdAt || '—' }}</td>
          </tr>
        </tbody>
      </table>
      <p v-else class="hint">暂无提现记录</p>
    </div>

    <Teleport to="body">
      <div v-if="modalOpen" class="modalOverlay" @click.self="modalOpen = false">
        <div class="modal">
          <div class="modalHeader">
            <h3 class="modalTitle">申请提现</h3>
            <button class="modalClose" @click="modalOpen = false">&times;</button>
          </div>
          <div class="modalBody">
            <p class="hintInline">可提现余额 ¥{{ formatMoney(wallet?.withdrawableAmount) }}</p>
            <div class="field">
              <label class="label">提现金额 (元)</label>
              <input v-model.number="amount" type="number" min="0.01" step="0.01" class="input" />
            </div>
            <p v-if="formError" class="formError">{{ formError }}</p>
            <div class="modalFooter">
              <button class="btnSecondary" @click="modalOpen = false">取消</button>
              <button class="btnPrimary" :disabled="submitting" @click="submit">
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
import { computed, onMounted, ref } from 'vue'
import { courierManagerApi, courierWithdrawalApi } from '../../api/services'
import type { CourierManagerItem, RoleWithdrawalItem } from '../../api/types'
import { formatApiError } from '../../api/request'
import { getEnumLabel, WITHDRAWAL_AUDIT_STATUS, WITHDRAWAL_AUDIT_STATUS_LABEL } from '../../constants/enums'

const PENDING_STATUSES = new Set([
  WITHDRAWAL_AUDIT_STATUS.PENDING,
  'pending',
  WITHDRAWAL_AUDIT_STATUS.APPROVED
])

const wallet = ref<CourierManagerItem | null>(null)
const walletError = ref('')
const loading = ref(false)
const error = ref('')
const list = ref<RoleWithdrawalItem[]>([])

const modalOpen = ref(false)
const amount = ref<number | ''>('')
const submitting = ref(false)
const formError = ref('')

const pendingAmount = computed(() => {
  if (wallet.value?.pendingWithdrawalAmount != null) {
    return Number(wallet.value.pendingWithdrawalAmount) || 0
  }
  return list.value
    .filter((item) => PENDING_STATUSES.has(item.status || ''))
    .reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
})

function formatMoney(val?: number | null) {
  if (val === undefined || val === null || Number.isNaN(Number(val))) return '0.00'
  return Number(val).toFixed(2)
}

async function loadWallet() {
  walletError.value = ''
  try {
    wallet.value = await courierManagerApi.my()
  } catch (e) {
    wallet.value = null
    walletError.value = formatApiError(e, '可提现余额加载失败')
  }
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await courierWithdrawalApi.list({
      page: 1,
      pageSize: 50
    })
    list.value = res.list || []
  } catch (e) {
    error.value = formatApiError(e, '加载失败')
  } finally {
    loading.value = false
  }
}

function openApply() {
  if (wallet.value?.withdrawalBlocked) {
    formError.value = '当前账号已被阻止提现'
    return
  }
  amount.value = ''
  formError.value = ''
  modalOpen.value = true
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
    await courierWithdrawalApi.create({ amount: value })
    modalOpen.value = false
    await Promise.all([loadWallet(), load()])
  } catch (e) {
    formError.value = formatApiError(e, '申请失败')
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  await Promise.all([loadWallet(), load()])
})
</script>

<style scoped>
.page { max-width: 960px; }
.header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; gap: 16px; flex-wrap: wrap; }
.title { font-size: 24px; font-weight: 600; color: #1f1f2e; margin-bottom: 8px; }
.desc { font-size: 14px; color: #8c8c9a; }
.stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 12px; }
.statCard { background: #fff; border-radius: 12px; padding: 16px 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.statCard.green .value { color: #3aaf7d; }
.statCard.warn .value { color: #e05c5c; }
.statCard .label { font-size: 13px; color: #8c8c9a; margin-bottom: 8px; }
.statCard .value { font-size: 22px; font-weight: 600; color: #1f1f2e; }
.statCard .value.small { font-size: 18px; }
.bannerWarn { margin: 0 0 16px; padding: 10px 12px; border-radius: 8px; background: #fff7e8; color: #b76a00; font-size: 13px; }
.panel { background: #fff; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.table { width: 100%; border-collapse: collapse; font-size: 14px; }
.table th, .table td { padding: 12px 16px; text-align: left; border-bottom: 1px solid #f0f0f3; }
.table th { color: #8c8c9a; font-weight: 500; background: #fafafc; }
.btnPrimary { padding: 10px 18px; border-radius: 8px; background: #5c5c9e; color: #fff; border: none; cursor: pointer; }
.btnPrimary:disabled { opacity: 0.55; cursor: not-allowed; }
.btnSecondary { padding: 10px 18px; border-radius: 8px; border: 1px solid #e8e8ec; background: #fff; cursor: pointer; }
.hint, .error { font-size: 14px; color: #8c8c9a; text-align: center; padding: 24px 0; }
.error { color: #e05c5c; }
.formError { color: #e05c5c; font-size: 13px; margin: 0 0 8px; }
.hintInline { margin: 0 0 12px; font-size: 13px; color: #5c5c66; }
.modalOverlay { position: fixed; inset: 0; z-index: 1000; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; padding: 24px; }
.modal { background: #fff; border-radius: 12px; width: min(400px, 100%); }
.modalHeader { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid #f0f0f3; }
.modalTitle { font-size: 16px; font-weight: 600; margin: 0; }
.modalClose { border: none; background: none; font-size: 24px; cursor: pointer; color: #8c8c9a; }
.modalBody { padding: 24px; }
.field { margin-bottom: 16px; }
.label { display: block; font-size: 13px; color: #5c5c66; margin-bottom: 8px; }
.input { width: 100%; padding: 10px 14px; border: 1px solid #e8e8ec; border-radius: 8px; font-size: 14px; box-sizing: border-box; }
.modalFooter { display: flex; justify-content: flex-end; gap: 12px; margin-top: 8px; }
@media (max-width: 900px) {
  .stats { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 640px) {
  .stats { grid-template-columns: 1fr 1fr; }
  .header .btnPrimary { width: 100%; min-height: 44px; }
}
</style>
