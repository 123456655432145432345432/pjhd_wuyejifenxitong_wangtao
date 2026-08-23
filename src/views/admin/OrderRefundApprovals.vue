<template>
  <div class="page">
    <header class="header">
      <div>
        <h1>退货审批</h1>
        <p>审核住户提交的退货申请。未完成订单通过后走微信支付原路退并恢复库存；订单已完成后不可退款。驳回后进入「退货已驳回」。</p>
      </div>
    </header>

    <div class="panel">
      <div class="toolbar">
        <form class="search" @submit.prevent="applyFilters">
          <input v-model="keyword" type="search" placeholder="订单号 / 收货人 / 手机号" />
          <button type="submit">筛选</button>
        </form>
        <select v-model="status" @change="applyFilters">
          <option v-for="item in ORDER_REFUND_FILTER_OPTIONS" :key="item.value || 'all'" :value="item.value">
            {{ item.label }}
          </option>
        </select>
      </div>

      <div v-if="loading" class="empty">加载中...</div>
      <div v-else-if="loadError" class="empty error">{{ loadError }}</div>
      <div v-else-if="!list.length" class="empty">暂无退货申请</div>
      <div v-else class="tableWrap">
        <table>
          <thead>
            <tr>
              <th>订单</th>
              <th>住户</th>
              <th>商家</th>
              <th>金额</th>
              <th>退货原因</th>
              <th>状态</th>
              <th>申请时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in list" :key="item.orderId">
              <td>
                <strong>{{ item.orderNo || item.orderId || '—' }}</strong>
                <small v-if="item.orderNo && item.orderId">{{ item.orderId }}</small>
              </td>
              <td>
                <strong>{{ item.residentName || item.receiverName || '—' }}</strong>
                <small>{{ item.residentPhone || '—' }}</small>
              </td>
              <td>{{ item.merchantName || '—' }}</td>
              <td>{{ item.totalAmount != null ? `¥${item.totalAmount}` : '—' }}</td>
              <td>{{ item.cancelReason || '—' }}</td>
              <td>
                <span class="badge" :class="badgeClass(item.orderStatus)">{{ statusLabel(item.orderStatus) }}</span>
              </td>
              <td>{{ item.requestedAt || item.createdAt || '—' }}</td>
              <td>
                <button v-if="canAudit(item)" class="auditBtn" @click="openAudit(item)">审核</button>
                <span v-else-if="isCompletedOrder(item)" class="muted">订单已完成，不可退款</span>
                <span v-else class="muted">{{ item.rejectReason || '已处理' }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <footer class="footer">
        <span>共 {{ total }} 条</span>
        <div v-if="totalPages > 1">
          <button :disabled="page <= 1" @click="load(page - 1)">上一页</button>
          <span>{{ page }} / {{ totalPages }}</span>
          <button :disabled="page >= totalPages" @click="load(page + 1)">下一页</button>
        </div>
      </footer>
    </div>

    <Teleport to="body">
      <div v-if="auditOpen" class="overlay" @click.self="closeAudit">
        <div class="modal">
          <h3>审核退货申请</h3>
          <div class="summary">
            <span>订单</span><strong>{{ target?.orderNo || target?.orderId || '—' }}</strong>
            <span>住户</span><strong>{{ target?.residentName || target?.residentPhone || '—' }}</strong>
            <span>原因</span><strong>{{ target?.cancelReason || '—' }}</strong>
          </div>
          <label>审核结果</label>
          <select v-model="auditAction">
            <option
              :value="ORDER_REFUND_AUDIT_ACTION.APPROVE"
              :disabled="target ? isCompletedOrder(target) : false"
            >
              通过（未完成订单原路退回微信支付）
            </option>
            <option :value="ORDER_REFUND_AUDIT_ACTION.REJECT">不通过（驳回）</option>
          </select>
          <p v-if="target && isCompletedOrder(target)" class="error">订单已完成后不支持退款，仅可驳回申请。</p>
          <label v-if="auditAction === ORDER_REFUND_AUDIT_ACTION.REJECT">驳回原因</label>
          <textarea
            v-if="auditAction === ORDER_REFUND_AUDIT_ACTION.REJECT"
            v-model="rejectReason"
            rows="4"
            maxlength="200"
            placeholder="请填写驳回原因"
          />
          <p v-if="formError" class="error">{{ formError }}</p>
          <div class="actions">
            <button type="button" class="secondary" @click="closeAudit">取消</button>
            <button type="button" class="primary" :disabled="submitting" @click="submitAudit">
              {{ submitting ? '提交中...' : '确认提交' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { adminOrderRefundApi } from '../../api/services'
import type { OrderRefundItem } from '../../api/types'
import { ApiError, formatApiError } from '../../api/request'
import {
  ORDER_REFUND_AUDIT_ACTION,
  ORDER_REFUND_FILTER_OPTIONS,
  ORDER_STATUS,
  ORDER_STATUS_LABEL,
  getEnumLabel,
  isOrderRefundPending,
  normalizeOrderRefundStatus
} from '../../constants/enums'

const PAGE_SIZE = 20
const list = ref<OrderRefundItem[]>([])
const loading = ref(false)
const loadError = ref('')
const keyword = ref('')
const status = ref(ORDER_STATUS.REFUNDING)
const page = ref(1)
const total = ref(0)
const totalPages = ref(1)
const auditOpen = ref(false)
const target = ref<OrderRefundItem | null>(null)
const auditAction = ref<string>(ORDER_REFUND_AUDIT_ACTION.APPROVE)
const rejectReason = ref('')
const formError = ref('')
const submitting = ref(false)

function refundStatusOf(item: Pick<OrderRefundItem, 'orderStatus'>) {
  return normalizeOrderRefundStatus(item.orderStatus)
}

function isPending(item: OrderRefundItem) {
  const current = refundStatusOf(item)
  if (!current) return true
  return isOrderRefundPending(current)
}

function isCompletedOrder(item: Pick<OrderRefundItem, 'orderStatus'>) {
  return item.orderStatus === ORDER_STATUS.COMPLETED
}

function canAudit(item: OrderRefundItem) {
  return isPending(item) && !isCompletedOrder(item)
}

function statusLabel(value?: string) {
  const current = normalizeOrderRefundStatus(value)
  if (!current || current === ORDER_STATUS.REFUNDING) return '待审核'
  if (current === ORDER_STATUS.REFUNDED) return '已通过'
  if (current === ORDER_STATUS.REFUND_REJECTED) return '已驳回'
  return getEnumLabel(ORDER_STATUS_LABEL, current, current)
}

function badgeClass(value?: string) {
  const current = normalizeOrderRefundStatus(value)
  if (!current || current === ORDER_STATUS.REFUNDING) return 'pending'
  if (current === ORDER_STATUS.REFUNDED) return 'approved'
  if (current === ORDER_STATUS.REFUND_REJECTED) return 'rejected'
  return ''
}

async function load(nextPage = page.value) {
  loading.value = true
  loadError.value = ''
  try {
    const result = await adminOrderRefundApi.list({
      page: nextPage,
      pageSize: PAGE_SIZE,
      status: status.value || undefined,
      keyword: keyword.value.trim() || undefined
    })
    list.value = result.list || []
    page.value = result.pagination?.page ?? nextPage
    total.value = result.pagination?.total ?? list.value.length
    totalPages.value = result.pagination?.totalPages ?? 1
  } catch (error) {
    list.value = []
    loadError.value = error instanceof ApiError ? formatApiError(error, '退货申请加载失败') : '退货申请加载失败'
  } finally {
    loading.value = false
  }
}

function applyFilters() {
  load(1)
}

function openAudit(item: OrderRefundItem) {
  if (!canAudit(item)) return
  target.value = item
  auditAction.value = ORDER_REFUND_AUDIT_ACTION.APPROVE
  rejectReason.value = ''
  formError.value = ''
  auditOpen.value = true
}

function closeAudit() {
  auditOpen.value = false
  target.value = null
  formError.value = ''
}

async function submitAudit() {
  if (!target.value || submitting.value) return
  if (auditAction.value === ORDER_REFUND_AUDIT_ACTION.REJECT && !rejectReason.value.trim()) {
    formError.value = '驳回时请填写原因'
    return
  }
  submitting.value = true
  formError.value = ''
  try {
    if (
      auditAction.value === ORDER_REFUND_AUDIT_ACTION.APPROVE &&
      isCompletedOrder(target.value)
    ) {
      formError.value = '订单已完成，不支持退款'
      return
    }
    await adminOrderRefundApi.audit(target.value.orderId, {
      action: auditAction.value,
      rejectReason:
        auditAction.value === ORDER_REFUND_AUDIT_ACTION.REJECT
          ? rejectReason.value.trim()
          : undefined
    })
    closeAudit()
    await load(page.value)
  } catch (error) {
    formError.value = error instanceof ApiError ? formatApiError(error, '审核提交失败') : '审核提交失败'
  } finally {
    submitting.value = false
  }
}

onMounted(() => load(1))
</script>

<style scoped>
.page { max-width: 1200px; }
.header { margin-bottom: 20px; }
h1 { margin: 0 0 8px; font-size: 24px; color: #1f1f2e; }
.header p { margin: 0; color: #8c8c9a; font-size: 14px; }
.panel { overflow: hidden; border-radius: 12px; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,.04); }
.toolbar { display: flex; gap: 12px; padding: 16px 20px; border-bottom: 1px solid #f0f0f3; }
.search { display: flex; flex: 1; gap: 8px; }
input, select, textarea { box-sizing: border-box; width: 100%; padding: 10px 12px; border: 1px solid #e8e8ec; border-radius: 8px; background: #fff; color: #1f1f2e; }
.toolbar select { width: 150px; }
button { padding: 9px 14px; border: 1px solid #e8e8ec; border-radius: 8px; background: #fff; color: #5c5c66; cursor: pointer; }
button:disabled { opacity: .55; cursor: not-allowed; }
.search button, .primary, .auditBtn { border-color: #5c5c9e; background: #5c5c9e; color: #fff; }
.tableWrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
th, td { padding: 14px 16px; border-bottom: 1px solid #f0f0f3; text-align: left; vertical-align: top; }
th { background: #fafafc; color: #8c8c9a; font-weight: 500; white-space: nowrap; }
td strong, td small { display: block; }
td small, .muted { margin-top: 4px; color: #8c8c9a; }
.badge { display: inline-block; padding: 4px 9px; border-radius: 10px; background: #f4f5f7; }
.badge.pending { background: #fff7e6; color: #d48806; }
.badge.approved { background: #e8f8f0; color: #389e0d; }
.badge.rejected { background: #fff1f0; color: #cf1322; }
.empty { padding: 40px; text-align: center; color: #8c8c9a; }
.error { color: #e05c5c; }
.footer { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 14px 20px; color: #8c8c9a; font-size: 13px; }
.footer div { display: flex; align-items: center; gap: 10px; }
.overlay { position: fixed; inset: 0; z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px; background: rgba(0,0,0,.45); }
.modal { width: min(480px, 100%); padding: 24px; border-radius: 12px; background: #fff; }
.modal h3 { margin: 0 0 16px; color: #1f1f2e; }
.modal label { display: block; margin: 14px 0 7px; color: #5c5c66; font-size: 13px; }
.summary { display: grid; grid-template-columns: auto 1fr; gap: 8px 14px; padding: 14px; border-radius: 8px; background: #fafafc; font-size: 13px; }
.summary span { color: #8c8c9a; }
.actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 18px; }
@media (max-width: 640px) {
  .toolbar { flex-direction: column; }
  .toolbar select { width: 100%; }
  .footer { align-items: flex-start; flex-direction: column; }
  .overlay { align-items: flex-end; padding: 0; }
  .modal { border-radius: 16px 16px 0 0; }
}
</style>
