<template>
  <div class="page">
    <div class="header">
      <div>
        <h1 class="title">提现管理</h1>
        <p class="desc">申请提现并查看处理进度</p>
      </div>
      <button class="btnPrimary" @click="openModal">申请提现</button>
    </div>

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
import { onMounted, ref } from 'vue'
import { merchantPortalApi } from '../../api/services'
import type { MerchantWithdrawalItem } from '../../api/types'
import { ApiError } from '../../api/request'
import { getEnumLabel, WITHDRAWAL_AUDIT_STATUS_LABEL } from '../../constants/enums'
import { useIsMobile } from '../../composables/useIsMobile'

const { isMobile } = useIsMobile()
const LOCAL_STATUS_LABEL: Record<string, string> = { ...WITHDRAWAL_AUDIT_STATUS_LABEL, pending: '审核中' }

const statusOptions = Object.entries(LOCAL_STATUS_LABEL).map(([value, label]) => ({ value, label }))

const records = ref<MerchantWithdrawalItem[]>([])
const loading = ref(false)
const error = ref('')
const auditFilter = ref('')
const modalOpen = ref(false)
const amount = ref(500)
const submitting = ref(false)
const formError = ref('')

function formatMoney(value?: number) {
  if (value === undefined || value === null) return '0.00'
  return Number(value).toFixed(2)
}

async function load(page = 1) {
  loading.value = true
  error.value = ''
  try {
    const res = await merchantPortalApi.withdrawals({
      page,
      pageSize: 20,
      auditStatus: auditFilter.value || undefined,
      sort: '-createdAt'
    })
    records.value = res.list || []
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '提现记录加载失败'
  } finally {
    loading.value = false
  }
}

function openModal() {
  formError.value = ''
  modalOpen.value = true
}

function closeModal() {
  modalOpen.value = false
}

async function submit() {
  if (!amount.value || amount.value <= 0) {
    formError.value = '请输入有效提现金额'
    return
  }
  submitting.value = true
  formError.value = ''
  try {
    await merchantPortalApi.createWithdrawal({ amount: amount.value })
    closeModal()
    await load(1)
  } catch (e) {
    formError.value = e instanceof ApiError ? e.message : '申请失败'
  } finally {
    submitting.value = false
  }
}

onMounted(() => load(1))
</script>

<style scoped>
.page { max-width: 1200px; }
.header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 24px; }
.title { font-size: 24px; font-weight: 600; color: #1f1f2e; margin-bottom: 8px; }
.desc { font-size: 14px; color: #8c8c9a; }
.btnPrimary { padding: 10px 18px; border-radius: 8px; background: #5c5c9e; color: #fff; border: none; cursor: pointer; }
.btnPrimary:hover { background: #52529a; }
.btnSecondary { padding: 10px 18px; border-radius: 8px; border: 1px solid #e8e8ec; background: #fff; color: #5c5c66; font-size: 14px; cursor: pointer; }
.btnSecondary:hover { border-color: #5c5c9e; color: #5c5c9e; }
.toolbar { margin-bottom: 16px; }
.select { padding: 8px 12px; border: 1px solid #e8e8ec; border-radius: 8px; background: #fff; }
.panel { background: #fff; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.loading, .empty, .error { text-align: center; padding: 32px 0; color: #8c8c9a; font-size: 14px; }
.error { color: #e05c5c; }
.table th, .table td { padding: 12px 10px; text-align: left; border-bottom: 1px solid #f0f0f3; font-size: 13px; }
.modalOverlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal { width: 420px; max-width: calc(100vw - 32px); background: #fff; border-radius: 12px; }
.modalHeader { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid #f0f0f3; }
.modalTitle { font-size: 16px; font-weight: 600; }
.modalClose { font-size: 24px; color: #8c8c9a; cursor: pointer; }
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
@media (max-width: 640px) {
  .header { flex-direction: column; gap: 12px; margin-bottom: 16px; }
  .header .btnPrimary, .toolbar .select { width: 100%; min-height: 44px; }
  .panel { padding: 14px; }
  .modalOverlay { align-items: flex-end; padding: 0; }
  .modal { width: 100%; max-width: 100%; }
  .modalHeader, .modalBody { padding: 16px; }
  .modalFooter { flex-direction: column-reverse; padding: 0 16px 16px; gap: 8px; }
  .modalFooter .btnSecondary, .modalFooter .btnPrimary, .modalFooter .btnDanger { width: 100%; min-height: 44px; }
}
</style>
