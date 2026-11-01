<template>
  <div class="page" :class="{ mobilePage: isMobile }">
    <div class="header">
      <div>
        <h1 class="title">钱包提现</h1>
        <p class="desc">经理抽成收益独立钱包，可申请提现（withdrawal_type=property_manager），提交后进入管理端多角色审核</p>
      </div>
      <button class="btnPrimary" :disabled="inactive || !wallet" @click="openApply">申请提现</button>
    </div>

    <p v-if="blockHint" class="blockHint">{{ blockHint }}</p>

    <div v-if="wallet" class="stats">
      <div class="statCard green">
        <div class="label">可提现余额</div>
        <div class="value">¥{{ formatMoney(wallet.withdrawableAmount) }}</div>
      </div>
      <div class="statCard">
        <div class="label">累计抽成</div>
        <div class="value">¥{{ formatMoney(wallet.totalEarning) }}</div>
      </div>
      <div class="statCard">
        <div class="label">在途提现</div>
        <div class="value">¥{{ formatMoney(wallet.pendingAmount) }}</div>
      </div>
      <div class="statCard">
        <div class="label">已提现</div>
        <div class="value">¥{{ formatMoney(wallet.withdrawnAmount) }}</div>
      </div>
    </div>
    <p v-if="inactive" class="blockHint">物业经理身份已停用，无法申请提现。</p>

    <div class="panel">
      <div v-if="loading" class="hint">加载中...</div>
      <p v-else-if="error && !blockHint" class="error">{{ error }}</p>
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
            <p v-if="formError" class="error">{{ formError }}</p>
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
import { onMounted, ref } from 'vue'
import { propertyManagerPortalApi } from '../../api/services'
import type { PropertyManagerWallet, RoleWithdrawalItem } from '../../api/types'
import { ApiError } from '../../api/request'
import { getEnumLabel, WITHDRAWAL_AUDIT_STATUS_LABEL } from '../../constants/enums'
import { useIsMobile } from '../../composables/useIsMobile'

const { isMobile } = useIsMobile()
const loading = ref(false)
const error = ref('')
const blockHint = ref('')
const wallet = ref<PropertyManagerWallet | null>(null)
const inactive = ref(false)
const list = ref<RoleWithdrawalItem[]>([])

const modalOpen = ref(false)
const amount = ref(0)
const submitting = ref(false)
const formError = ref('')

function formatMoney(val?: number) {
  if (val === undefined || val === null) return '0.00'
  return Number(val).toFixed(2)
}

function describeIdentityError(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.code === 91005) return e.message || '当前账号不是物业经理'
    if (e.code === 91007) {
      inactive.value = true
      return e.message || '物业经理身份已停用'
    }
  }
  return ''
}

async function load() {
  loading.value = true
  error.value = ''
  blockHint.value = ''
  inactive.value = false
  try {
    const info = await propertyManagerPortalApi.my()
    inactive.value = info.status === 'inactive'
    wallet.value = await propertyManagerPortalApi.wallet()
    const res = await propertyManagerPortalApi.withdrawals({ page: 1, pageSize: 50 })
    list.value = res.list || []
  } catch (e) {
    const hint = describeIdentityError(e)
    if (hint) blockHint.value = hint
    else error.value = e instanceof ApiError ? e.message : '加载失败'
  } finally {
    loading.value = false
  }
}

function openApply() {
  if (inactive.value || !wallet.value) return
  amount.value = 0
  formError.value = ''
  modalOpen.value = true
}

async function submit() {
  if (!amount.value || amount.value < 0.01) {
    formError.value = '请输入有效提现金额（≥ 0.01 元）'
    return
  }
  const available = Number(wallet.value?.withdrawableAmount)
  if (Number.isFinite(available) && amount.value > available) {
    formError.value = '提现金额不能超过可提现余额'
    return
  }
  submitting.value = true
  formError.value = ''
  try {
    await propertyManagerPortalApi.createWithdrawal({ amount: amount.value })
    modalOpen.value = false
    await load()
  } catch (e) {
    formError.value = e instanceof ApiError ? e.message : '申请失败'
  } finally {
    submitting.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.page { max-width: 960px; }
.mobilePage { max-width: none; }
.header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; gap: 16px; flex-wrap: wrap; }
.title { font-size: 24px; font-weight: 600; color: #1f1f2e; margin-bottom: 8px; }
.desc { font-size: 14px; color: #8c8c9a; max-width: 620px; }
.stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 16px; }
.statCard { background: #fff; border-radius: 12px; padding: 16px 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.statCard.green .value { color: #3aaf7d; }
.statCard .label { font-size: 13px; color: #8c8c9a; margin-bottom: 8px; }
.statCard .value { font-size: 22px; font-weight: 600; color: #1f1f2e; }
.blockHint { margin: 0 0 16px; font-size: 13px; color: #e05c5c; background: #fff; border-radius: 12px; padding: 14px 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.panel { background: #fff; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); overflow-x: auto; }
.table { width: 100%; min-width: 640px; border-collapse: collapse; font-size: 14px; }
.table th, .table td { padding: 12px 16px; text-align: left; border-bottom: 1px solid #f0f0f3; }
.table th { color: #8c8c9a; font-weight: 500; background: #fafafc; }
.btnPrimary { padding: 10px 18px; border-radius: 8px; background: #5c5c9e; color: #fff; border: none; cursor: pointer; }
.btnPrimary:disabled { opacity: 0.55; cursor: not-allowed; }
.btnSecondary { padding: 10px 18px; border-radius: 8px; border: 1px solid #e8e8ec; background: #fff; cursor: pointer; }
.hint, .error { font-size: 14px; color: #8c8c9a; text-align: center; padding: 24px 0; }
.error { color: #e05c5c; }
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
@media (max-width: 768px) {
  .header { margin-bottom: 16px; }
  .title { font-size: 21px; }
  .panel { padding: 16px; }
}
</style>
