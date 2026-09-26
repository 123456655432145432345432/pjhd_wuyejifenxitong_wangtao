<template>
  <div class="page">
    <div class="header">
      <div>
        <h1 class="title">积分管理</h1>
        <p class="desc">购买积分并赠送给顾客</p>
      </div>
    </div>

    <div class="grid">
      <div class="card">
        <h3 class="cardTitle">购买积分</h3>
        <p v-if="purchaseMsg" :class="purchaseMsgType">{{ purchaseMsg }}</p>
        <div class="quoteBox">
          <span>100 元可购</span>
          <strong>{{ quoteLoading ? '计算中…' : `${quotePointAmount} 积分` }}</strong>
        </div>
        <div class="field">
          <label class="label">积分数量</label>
          <input v-model.number="purchaseForm.pointAmount" type="number" min="1" class="input" />
          <p class="hint">支付金额由系统按商家兑换比例自动计算（以商家挂接配置与审核记录为准）。</p>
        </div>
        <button class="btnPrimary" :disabled="purchaseSubmitting" @click="submitPurchase">
          {{ purchaseSubmitting ? '提交中...' : '提交购买申请' }}
        </button>
      </div>

      <div class="card">
        <h3 class="cardTitle">赠送积分</h3>
        <p v-if="grantMsg" :class="grantMsgType">{{ grantMsg }}</p>
        <div class="balanceBox">
          <span class="balanceLabel">可用积分余额</span>
          <span class="balanceValue">{{ approvedLoading ? '—' : totalBalance }}</span>
          <p v-if="!approvedLoading && !totalBalance" class="hint warn">
            暂无可用积分，请先提交购买并等待审核通过
          </p>
        </div>
        <div class="field">
          <label class="label">住户手机号</label>
          <input
            v-model="grantForm.phone"
            type="tel"
            inputmode="numeric"
            maxlength="11"
            pattern="1\d{10}"
            class="input"
            placeholder="请输入住户手机号"
          />
          <p class="hint">系统按手机号定位同一物业下的住户。</p>
        </div>
        <div class="field">
          <label class="label">赠送积分</label>
          <input
            v-model.number="grantForm.pointAmount"
            type="number"
            min="1"
            :max="totalBalance || undefined"
            class="input"
          />
        </div>
        <div class="field">
          <label class="label">说明</label>
          <input v-model="grantForm.description" class="input" placeholder="如：消费赠送" />
        </div>
        <button
          class="btnPrimary"
          :disabled="grantSubmitting || !totalBalance"
          @click="submitGrant"
        >
          {{ grantSubmitting ? '赠送中...' : '确认赠送' }}
        </button>
      </div>
    </div>

    <div class="panel">
      <div class="panelHeader">
        <h3 class="cardTitle">购买记录</h3>
        <select v-model="auditFilter" class="select" @change="loadPurchases(1)">
          <option value="">全部状态</option>
          <option v-for="opt in MERCHANT_AUDIT_STATUS_OPTIONS.slice(1)" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>
      </div>
      <div v-if="loading" class="loading">加载中...</div>
      <p v-else-if="listError" class="error">{{ listError }}</p>
      <div v-else-if="purchases.length && isMobile" class="mobileList">
        <article v-for="item in purchases" :key="item.id" class="mobileCard">
          <div class="mobileCardHead"><strong>{{ pointPurchaseStatusLabel(item.status) }}</strong><span>¥{{ formatMoney(item.payAmount) }}</span></div>
          <p>购买 {{ item.pointAmount ?? '—' }} 积分 · 剩余 {{ item.remainingPoints ?? '—' }} 积分</p>
          <small>{{ item.createdAt || '—' }}</small>
        </article>
      </div>
      <table v-else-if="purchases.length" class="table">
        <thead>
          <tr>
            <th>记录编号</th>
            <th>时间</th>
            <th>积分</th>
            <th>剩余积分</th>
            <th>金额</th>
            <th>状态</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in purchases" :key="item.id">
            <td class="mono">{{ item.id }}</td>
            <td>{{ item.createdAt || '—' }}</td>
            <td>{{ item.pointAmount ?? '—' }}</td>
            <td>{{ item.remainingPoints ?? '—' }}</td>
            <td>¥{{ formatMoney(item.payAmount) }}</td>
            <td>{{ pointPurchaseStatusLabel(item.status) }}</td>
          </tr>
        </tbody>
      </table>
      <p v-else class="empty">暂无购买记录</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { merchantPortalApi } from '../../api/services'
import type { MerchantPointPurchaseItem } from '../../api/types'
import { ApiError } from '../../api/request'
import {
  getEnumLabel,
  MERCHANT_AUDIT_STATUS,
  MERCHANT_AUDIT_STATUS_LABEL,
  MERCHANT_AUDIT_STATUS_OPTIONS
} from '../../constants/enums'
import { useIsMobile } from '../../composables/useIsMobile'

const { isMobile } = useIsMobile()
const purchases = ref<MerchantPointPurchaseItem[]>([])
const approvedPurchases = ref<MerchantPointPurchaseItem[]>([])
const loading = ref(false)
const approvedLoading = ref(false)
const quoteLoading = ref(false)
const quotePointAmount = ref(0)
const listError = ref('')
const auditFilter = ref('')
const purchaseSubmitting = ref(false)
const grantSubmitting = ref(false)
const purchaseMsg = ref('')
const purchaseMsgType = ref('success')
const grantMsg = ref('')
const grantMsgType = ref('success')

const purchaseForm = reactive({ pointAmount: 1000 })
const grantForm = reactive({
  phone: '',
  pointAmount: 50,
  description: '消费赠送'
})

const totalBalance = computed(() =>
  approvedPurchases.value.reduce((sum, item) => sum + (item.remainingPoints ?? 0), 0)
)

function formatMoney(value?: number) {
  if (value === undefined || value === null) return '0.00'
  return Number(value).toFixed(2)
}

const POINT_PURCHASE_STATUS_LABEL: Record<string, string> = {
  pending: '审核中',
  pending_audit: '审核中',
  approved: '已通过',
  rejected: '已拒绝'
}

function pointPurchaseStatusLabel(status?: string) {
  return getEnumLabel(POINT_PURCHASE_STATUS_LABEL, status, '—')
}

async function loadQuote() {
  quoteLoading.value = true
  try {
    const quote = await merchantPortalApi.pointQuote(100)
    quotePointAmount.value = Number(quote.pointAmount) || 0
  } catch {
    quotePointAmount.value = 0
  } finally {
    quoteLoading.value = false
  }
}

async function loadApprovedPurchases() {
  approvedLoading.value = true
  try {
    const res = await merchantPortalApi.pointPurchases({
      page: 1,
      pageSize: 100,
      auditStatus: MERCHANT_AUDIT_STATUS.APPROVED,
      sort: '-createdAt'
    })
    approvedPurchases.value = res.list || []
  } catch {
    approvedPurchases.value = []
  } finally {
    approvedLoading.value = false
  }
}

async function loadPurchases(page = 1) {
  loading.value = true
  listError.value = ''
  try {
    const res = await merchantPortalApi.pointPurchases({
      page,
      pageSize: 20,
      auditStatus: auditFilter.value || undefined,
      sort: '-createdAt'
    })
    purchases.value = res.list || []
  } catch (e) {
    listError.value = e instanceof ApiError ? e.message : '记录加载失败'
  } finally {
    loading.value = false
  }
}

async function reloadAll() {
  await Promise.all([loadPurchases(1), loadApprovedPurchases(), loadQuote()])
}

async function submitPurchase() {
  if (!purchaseForm.pointAmount || purchaseForm.pointAmount < 1) {
    purchaseMsg.value = '请填写有效积分数量'
    purchaseMsgType.value = 'error'
    return
  }
  purchaseSubmitting.value = true
  purchaseMsg.value = ''
  try {
    const result = await merchantPortalApi.purchasePoints({
      pointAmount: purchaseForm.pointAmount
    })
    const payText =
      result.payAmount !== undefined && result.payAmount !== null
        ? `，应付 ¥${formatMoney(result.payAmount)}`
        : ''
    purchaseMsg.value = `购买申请已提交${payText}，等待审核`
    purchaseMsgType.value = 'success'
    await reloadAll()
  } catch (e) {
    purchaseMsg.value = e instanceof ApiError ? e.message : '提交失败'
    purchaseMsgType.value = 'error'
  } finally {
    purchaseSubmitting.value = false
  }
}

async function submitGrant() {
  if (!totalBalance.value) {
    grantMsg.value = '暂无可用积分余额'
    grantMsgType.value = 'error'
    return
  }
  const phone = grantForm.phone.trim()
  if (!/^1\d{10}$/.test(phone)) {
    grantMsg.value = '请输入正确的 11 位住户手机号'
    grantMsgType.value = 'error'
    return
  }
  if (!grantForm.pointAmount || grantForm.pointAmount < 1) {
    grantMsg.value = '请填写有效赠送积分'
    grantMsgType.value = 'error'
    return
  }
  if (grantForm.pointAmount > totalBalance.value) {
    grantMsg.value = `赠送积分不能超过可用余额 ${totalBalance.value}`
    grantMsgType.value = 'error'
    return
  }
  grantSubmitting.value = true
  grantMsg.value = ''
  try {
    await merchantPortalApi.grantPoints({
      phone,
      pointAmount: grantForm.pointAmount,
      description: grantForm.description.trim() || undefined
    })
    grantMsg.value = '积分赠送成功'
    grantMsgType.value = 'success'
    grantForm.phone = ''
    grantForm.pointAmount = 50
    grantForm.description = '消费赠送'
    await reloadAll()
  } catch (e) {
    grantMsg.value = e instanceof ApiError ? e.message : '赠送失败'
    grantMsgType.value = 'error'
  } finally {
    grantSubmitting.value = false
  }
}

onMounted(reloadAll)
</script>

<style scoped>
.page { max-width: 1200px; }
.header { margin-bottom: 24px; }
.title { font-size: 24px; font-weight: 600; color: #1f1f2e; margin-bottom: 8px; }
.desc { font-size: 14px; color: #8c8c9a; }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
.card, .panel { background: #fff; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.cardTitle { font-size: 16px; font-weight: 600; margin-bottom: 16px; color: #1f1f2e; }
.field { margin-bottom: 14px; }
.label { display: block; font-size: 13px; color: #5c5c66; margin-bottom: 8px; }
.input, .select { width: 100%; padding: 10px 12px; border: 1px solid #e8e8ec; border-radius: 8px; font-size: 14px; box-sizing: border-box; }
.btnPrimary { padding: 10px 18px; border-radius: 8px; background: #5c5c9e; color: #fff; border: none; cursor: pointer; }
.btnPrimary:hover { background: #52529a; }
.success { color: #3aaf7d; font-size: 13px; margin-bottom: 12px; }
.error { color: #e05c5c; font-size: 13px; margin-bottom: 12px; }
.balanceBox { margin-bottom: 16px; padding: 14px 16px; background: #f7f7fb; border-radius: 8px; }
.balanceLabel { display: block; font-size: 13px; color: #5c5c66; margin-bottom: 6px; }
.balanceValue { font-size: 28px; font-weight: 600; color: #5c5c9e; }
.quoteBox { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 16px; padding: 14px 16px; background: #f7f7fb; border-radius: 8px; color: #5c5c66; font-size: 13px; }
.quoteBox strong { color: #5c5c9e; font-size: 20px; }
.hint { font-size: 12px; color: #8c8c9a; margin-top: 6px; }
.hint.warn { color: #d48806; }
.mono { font-family: ui-monospace, monospace; font-size: 12px; }
.panelHeader { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.panelHeader .select { width: 160px; }
.loading, .empty { text-align: center; padding: 24px 0; color: #8c8c9a; }
.table th, .table td { padding: 12px 10px; text-align: left; border-bottom: 1px solid #f0f0f3; font-size: 13px; }
@media (max-width: 900px) { .grid { grid-template-columns: 1fr; } }
 .mobileList { display: flex; flex-direction: column; gap: 12px; }
 .mobileCard { border: 1px solid #ececf2; border-radius: 10px; padding: 14px; }
 .mobileCardHead { display: flex; justify-content: space-between; gap: 12px; }
 .mobileCard p { margin: 10px 0; color: #5c5c66; font-size: 13px; }
 .mobileCard small { color: #8c8c9a; }
@media (max-width: 640px) {
  .header { margin-bottom: 16px; }
  .title { font-size: 20px; }
  .grid { gap: 12px; margin-bottom: 12px; }
  .card, .panel { padding: 16px; }
  .btnPrimary { width: 100%; min-height: 44px; }
  .panelHeader { align-items: stretch; flex-direction: column; gap: 12px; }
  .panelHeader .select { width: 100%; min-height: 44px; }
}
</style>
