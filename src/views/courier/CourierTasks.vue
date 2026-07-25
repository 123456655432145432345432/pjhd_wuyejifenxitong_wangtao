<template>
  <div class="page" :class="{ mobilePage: isMobile }">
    <div class="header">
      <div>
        <h1 class="title">我的任务</h1>
        <p class="desc">管理已接配送任务</p>
      </div>
      <button class="btnGhost" :disabled="loading" @click="load(page)">刷新</button>
    </div>

    <div class="toolbar">
      <select v-model="statusFilter" class="select" @change="load(1)">
        <option v-for="opt in COURIER_TASK_STATUS_OPTIONS" :key="opt.value || 'all'" :value="opt.value">
          {{ opt.label }}
        </option>
      </select>
    </div>

    <div class="panel">
      <div v-if="loading" class="loading">加载中...</div>
      <p v-else-if="error" class="error">{{ error }}</p>
      <template v-else>
        <table v-if="tasks.length && !isMobile" class="table">
          <thead>
            <tr>
              <th>订单号</th>
              <th>商家</th>
              <th>取货地址</th>
              <th>送达地址</th>
              <th>收益</th>
              <th>状态</th>
              <th>接单/超时</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in tasks" :key="item.id">
              <td class="mono">{{ item.orderNo || item.orderId }}</td>
              <td>{{ item.merchantName || '—' }}</td>
              <td class="addrCell">{{ item.pickupAddress || item.merchantAddress || '—' }}</td>
              <td class="addrCell">{{ item.deliveryAddress || '—' }}</td>
              <td>¥{{ formatMoney(item.courierEarning ?? item.fee) }}</td>
              <td>
                <span class="tag" :class="statusClass(item.status)">
                  {{ getEnumLabel(DELIVERY_STATUS_LABEL, item.status) }}
                </span>
              </td>
              <td>
                <div>{{ item.acceptedAt || item.createdAt || '—' }}</div>
                <div v-if="item.timeoutAt" class="sub">超时 {{ item.timeoutAt }}</div>
              </td>
              <td class="actions">
                <button class="linkBtn" @click="openDetail(item)">详情</button>
                <button
                  v-if="canStart(item)"
                  class="linkBtn"
                  :disabled="actionId === item.id"
                  @click="startDelivery(item.id)"
                >
                  开始配送
                </button>
                <button
                  v-else-if="canComplete(item)"
                  class="linkBtn"
                  :disabled="actionId === item.id"
                  @click="openComplete(item)"
                >
                  完成配送
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-else-if="tasks.length" class="taskCards">
          <article v-for="item in tasks" :key="item.id" class="taskCard">
            <div class="taskCardHeader">
              <span class="mono">{{ item.orderNo || item.orderId }}</span>
              <span class="tag" :class="statusClass(item.status)">
                {{ getEnumLabel(DELIVERY_STATUS_LABEL, item.status) }}
              </span>
            </div>
            <div class="taskEarning">收益 ¥{{ formatMoney(item.courierEarning ?? item.fee) }}</div>
            <div class="taskAddress">
              <span>取货</span>
              <strong>{{ item.pickupAddress || item.merchantAddress || '—' }}</strong>
            </div>
            <div class="taskAddress">
              <span>送达</span>
              <strong>{{ item.deliveryAddress || '—' }}</strong>
            </div>
            <div class="taskMeta">
              <span>{{ item.merchantName || '—' }}</span>
              <span>{{ item.acceptedAt || item.createdAt || '—' }}</span>
            </div>
            <p v-if="item.timeoutAt" class="sub">超时 {{ item.timeoutAt }}</p>
            <div class="taskCardActions">
              <button class="cardActionBtn" @click="openDetail(item)">详情</button>
              <button
                v-if="canStart(item)"
                class="cardActionBtn primary"
                :disabled="actionId === item.id"
                @click="startDelivery(item.id)"
              >
                {{ actionId === item.id ? '处理中...' : '开始配送' }}
              </button>
              <button
                v-else-if="canComplete(item)"
                class="cardActionBtn primary"
                :disabled="actionId === item.id"
                @click="openComplete(item)"
              >
                完成配送
              </button>
            </div>
          </article>
        </div>
        <p v-else class="empty">暂无配送任务</p>
        <div v-if="totalPages > 1" class="pagination">
          <button class="pageBtn" :disabled="page <= 1 || loading" @click="changePage(page - 1)">&lt;</button>
          <span class="pageInfo">{{ page }} / {{ totalPages }}</span>
          <button class="pageBtn" :disabled="page >= totalPages || loading" @click="changePage(page + 1)">&gt;</button>
        </div>
      </template>
    </div>

    <Teleport to="body">
      <div v-if="detailItem" class="modalOverlay" @click.self="closeDetail">
        <div class="modal" :class="{ mobileSheet: isMobile }">
          <div class="modalHeader">
            <h3 class="modalTitle">配送详情</h3>
            <button class="modalClose" @click="closeDetail">&times;</button>
          </div>
          <div class="modalBody">
            <div class="detailHead">
              <span class="orderNo">{{ detailItem.orderNo || detailItem.orderId }}</span>
              <span class="tag" :class="statusClass(detailItem.status)">
                {{ getEnumLabel(DELIVERY_STATUS_LABEL, detailItem.status) }}
              </span>
            </div>
            <ul class="infoList">
              <li><span>商家</span><strong>{{ detailItem.merchantName || '—' }}</strong></li>
              <li><span>取货地址</span><strong>{{ detailItem.pickupAddress || detailItem.merchantAddress || '—' }}</strong></li>
              <li><span>送达地址</span><strong>{{ detailItem.deliveryAddress || '—' }}</strong></li>
              <li><span>联系电话</span><strong>{{ detailItem.contactPhone || '—' }}</strong></li>
              <li><span>配送收益</span><strong>¥{{ formatMoney(detailItem.courierEarning ?? detailItem.fee) }}</strong></li>
              <li><span>接单时间</span><strong>{{ detailItem.acceptedAt || '—' }}</strong></li>
              <li><span>超时时间</span><strong>{{ detailItem.timeoutAt || '—' }}</strong></li>
              <li><span>完成时间</span><strong>{{ detailItem.deliveredAt || '—' }}</strong></li>
              <li v-if="detailItem.remark"><span>备注</span><strong>{{ detailItem.remark }}</strong></li>
            </ul>
          </div>
          <div v-if="detailItem && (canStart(detailItem) || canComplete(detailItem))" class="modalFooter">
            <button
              v-if="canStart(detailItem)"
              class="btnPrimary"
              :disabled="actionId === detailItem.id"
              @click="startDeliveryFromDetail"
            >
              开始配送
            </button>
            <button
              v-if="canComplete(detailItem)"
              class="btnPrimary"
              @click="openCompleteFromDetail"
            >
              完成配送
            </button>
          </div>
        </div>
      </div>

      <div v-if="completeTarget" class="modalOverlay" @click.self="closeComplete">
        <div class="modal" :class="{ mobileSheet: isMobile }">
          <div class="modalHeader">
            <h3 class="modalTitle">完成配送</h3>
            <button class="modalClose" @click="closeComplete">&times;</button>
          </div>
          <div class="modalBody">
            <p class="hint">订单 {{ completeTarget.orderNo || completeTarget.orderId }}</p>
            <p v-if="completeError" class="error">{{ completeError }}</p>
            <div class="field">
              <label class="label">送达凭证 URL（可选，多个用英文逗号分隔，最多 5 张）</label>
              <input v-model="completeForm.proofUrlsText" class="input" placeholder="https://..." />
            </div>
            <div class="field">
              <label class="label">备注</label>
              <textarea v-model="completeForm.remark" class="textarea" rows="3" maxlength="200" placeholder="如：已送达" />
            </div>
          </div>
          <div class="modalFooter">
            <button class="btnGhost" @click="closeComplete">取消</button>
            <button class="btnPrimary" :disabled="actionId === completeTarget.id" @click="submitComplete">
              {{ actionId === completeTarget.id ? '提交中...' : '确认完成' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { onMounted } from 'vue'
import { courierPortalApi } from '../../api/services'
import type { CourierDeliveryItem } from '../../api/types'
import { ApiError } from '../../api/request'
import {
  COURIER_TASK_STATUS_OPTIONS,
  DELIVERY_STATUS,
  DELIVERY_STATUS_LABEL,
  getEnumLabel
} from '../../constants/enums'
import { useIsMobile } from '../../composables/useIsMobile'

const { isMobile } = useIsMobile()
const tasks = ref<CourierDeliveryItem[]>([])
const loading = ref(false)
const error = ref('')
const statusFilter = ref('')
const actionId = ref('')
const page = ref(1)
const totalPages = ref(1)
const detailItem = ref<CourierDeliveryItem | null>(null)
const completeTarget = ref<CourierDeliveryItem | null>(null)
const completeError = ref('')
const completeForm = reactive({
  proofUrlsText: '',
  remark: '已送达'
})

function formatMoney(value?: number) {
  if (value === undefined || value === null) return '0.00'
  return Number(value).toFixed(2)
}

function statusClass(status?: string) {
  if (status === DELIVERY_STATUS.ACCEPTED || status === DELIVERY_STATUS.GRABBED) return 'accepted'
  if (status === DELIVERY_STATUS.DELIVERING) return 'delivering'
  if (status === DELIVERY_STATUS.COMPLETED) return 'completed'
  if (status === DELIVERY_STATUS.CANCELLED || status === DELIVERY_STATUS.FAILED) return 'cancelled'
  return ''
}

function canStart(item: CourierDeliveryItem) {
  return item.status === DELIVERY_STATUS.ACCEPTED || item.status === DELIVERY_STATUS.GRABBED
}

function canComplete(item: CourierDeliveryItem) {
  return item.status === DELIVERY_STATUS.DELIVERING
}

function parseProofUrls(text: string) {
  return text
    .split(',')
    .map((url) => url.trim())
    .filter(Boolean)
    .slice(0, 5)
}

async function load(pageNo = 1) {
  loading.value = true
  error.value = ''
  try {
    const res = await courierPortalApi.my({
      page: pageNo,
      pageSize: 20,
      status: statusFilter.value || undefined,
      sort: '-createdAt'
    })
    tasks.value = res.list || []
    page.value = res.pagination?.page || pageNo
    totalPages.value = res.pagination?.totalPages || 1
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '任务加载失败'
  } finally {
    loading.value = false
  }
}

function changePage(next: number) {
  load(next)
}

function openDetail(item: CourierDeliveryItem) {
  detailItem.value = item
}

function closeDetail() {
  detailItem.value = null
}

function openComplete(item: CourierDeliveryItem) {
  completeTarget.value = item
  completeForm.proofUrlsText = ''
  completeForm.remark = '已送达'
  completeError.value = ''
}

function openCompleteFromDetail() {
  if (!detailItem.value) return
  openComplete(detailItem.value)
  closeDetail()
}

function closeComplete() {
  completeTarget.value = null
  completeError.value = ''
}

async function startDelivery(id: string) {
  actionId.value = id
  error.value = ''
  try {
    await courierPortalApi.updateStatus(id, DELIVERY_STATUS.DELIVERING)
    await load(page.value)
    if (detailItem.value?.id === id) {
      detailItem.value = tasks.value.find((item) => item.id === id) || detailItem.value
    }
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '状态更新失败'
  } finally {
    actionId.value = ''
  }
}

async function startDeliveryFromDetail() {
  if (!detailItem.value) return
  await startDelivery(detailItem.value.id)
}

async function submitComplete() {
  if (!completeTarget.value) return
  actionId.value = completeTarget.value.id
  completeError.value = ''
  const proofImageUrls = parseProofUrls(completeForm.proofUrlsText)
  try {
    await courierPortalApi.complete(completeTarget.value.id, {
      proofImageUrls: proofImageUrls.length ? proofImageUrls : undefined,
      remark: completeForm.remark.trim() || undefined
    })
    closeComplete()
    await load(page.value)
  } catch (e) {
    completeError.value = e instanceof ApiError ? e.message : '完成配送失败'
  } finally {
    actionId.value = ''
  }
}

onMounted(() => load(1))
</script>

<style scoped>
.page { max-width: 1200px; }
.header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 24px; }
.title { font-size: 24px; font-weight: 600; color: #1f1f2e; margin-bottom: 8px; }
.desc { font-size: 14px; color: #8c8c9a; }
.toolbar { margin-bottom: 16px; }
.select { padding: 8px 12px; border: 1px solid #e8e8ec; border-radius: 8px; background: #fff; min-width: 140px; }
.btnGhost { padding: 8px 14px; border-radius: 8px; border: 1px solid #e8e8ec; background: #fff; color: #5c5c66; font-size: 14px; cursor: pointer; }
.btnGhost:hover { border-color: #5c5c9e; color: #5c5c9e; }
.panel { background: #fff; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); overflow-x: auto; }
.loading, .empty, .error { text-align: center; padding: 32px 0; color: #8c8c9a; font-size: 14px; }
.error { color: #e05c5c; }
.table { width: 100%; border-collapse: collapse; min-width: 980px; }
.table tbody tr { border-bottom: 1px solid #f0f0f3; }
.table th, .table td { padding: 10px; text-align: left; font-size: 13px; vertical-align: middle; }
.table th { color: #8c8c9a; font-weight: 500; border-bottom: 1px solid #f0f0f3; }
.mono { font-family: ui-monospace, monospace; font-size: 12px; }
.addrCell { max-width: 140px; line-height: 1.4; }
.sub { font-size: 11px; color: #d48806; margin-top: 2px; }
.tag { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 12px; background: #f4f5f7; color: #5c5c66; white-space: nowrap; }
.tag.accepted { background: #e6f4ff; color: #1677ff; }
.tag.delivering { background: #fff7e6; color: #d48806; }
.tag.completed { background: #f6ffed; color: #389e0d; }
.tag.cancelled { background: #fff1f0; color: #cf1322; }
.actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; white-space: nowrap; }
.linkBtn { color: #5c5c9e; cursor: pointer; background: none; border: none; padding: 0; font-size: 13px; }
.linkBtn:disabled { opacity: 0.6; cursor: not-allowed; }
.pagination { display: flex; align-items: center; justify-content: center; gap: 12px; margin-top: 16px; }
.pageBtn { padding: 6px 12px; border: 1px solid #e8e8ec; border-radius: 8px; background: #fff; cursor: pointer; }
.pageInfo { font-size: 13px; color: #8c8c9a; }
.modalOverlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 16px; }
.modal { width: 520px; max-width: 100%; background: #fff; border-radius: 12px; overflow: hidden; }
.modalHeader { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid #f0f0f3; }
.modalTitle { font-size: 16px; font-weight: 600; }
.modalClose { border: none; background: none; font-size: 22px; cursor: pointer; color: #8c8c9a; }
.modalBody { padding: 20px; }
.modalFooter { display: flex; justify-content: flex-end; gap: 10px; padding: 16px 20px; border-top: 1px solid #f0f0f3; }
.detailHead { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 16px; }
.orderNo { font-weight: 600; font-size: 16px; }
.infoList { list-style: none; }
.infoList li { display: flex; justify-content: space-between; gap: 12px; padding: 10px 0; border-bottom: 1px solid #f7f7f9; font-size: 13px; }
.infoList span { color: #8c8c9a; flex-shrink: 0; }
.infoList strong { text-align: right; color: #1f1f2e; font-weight: 500; word-break: break-all; }
.field { margin-bottom: 14px; }
.label { display: block; font-size: 13px; color: #8c8c9a; margin-bottom: 6px; }
.input, .textarea { width: 100%; padding: 10px 12px; border: 1px solid #e8e8ec; border-radius: 8px; box-sizing: border-box; font-size: 14px; }
.textarea { resize: vertical; font-family: inherit; }
.hint { font-size: 13px; color: #5c5c66; margin-bottom: 12px; }
.btnPrimary { padding: 10px 18px; border-radius: 8px; background: #5c5c9e; color: #fff; border: none; cursor: pointer; }
.btnPrimary:hover { background: #52529a; }
.btnGhost { padding: 10px 18px; border-radius: 8px; border: 1px solid #e8e8ec; background: #fff; color: #5c5c66; font-size: 14px; cursor: pointer; }
.btnGhost:hover { border-color: #5c5c9e; color: #5c5c9e; }
@media (max-width: 768px) {
  .header { align-items: center; gap: 12px; margin-bottom: 18px; }
  .title { font-size: 22px; margin-bottom: 4px; }
  .btnGhost { min-width: 72px; min-height: 44px; padding: 0 14px; }
  .toolbar { margin-bottom: 12px; }
  .select { width: 100%; min-height: 44px; }
  .panel { padding: 14px; overflow: visible; }
  .taskCards { display: grid; gap: 12px; }
  .taskCard { padding: 16px; border: 1px solid #e8e8ec; border-radius: 12px; background: #fafafc; }
  .taskCardHeader { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
  .taskCardHeader .mono { min-width: 0; overflow-wrap: anywhere; }
  .taskEarning { margin: 12px 0; color: #3aaf7d; font-size: 16px; font-weight: 600; }
  .taskAddress { display: grid; grid-template-columns: 36px minmax(0, 1fr); gap: 8px; padding: 7px 0; font-size: 13px; line-height: 1.5; }
  .taskAddress > span { color: #8c8c9a; }
  .taskAddress strong { color: #1f1f2e; font-weight: 500; overflow-wrap: anywhere; }
  .taskMeta { display: flex; flex-wrap: wrap; gap: 6px 12px; margin-top: 10px; color: #8c8c9a; font-size: 12px; line-height: 1.5; }
  .taskCard .sub { margin-top: 8px; }
  .taskCardActions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin-top: 14px; }
  .cardActionBtn { min-height: 44px; padding: 0 12px; border: 1px solid #5c5c9e; border-radius: 9px; color: #5c5c9e; background: #fff; font-size: 14px; cursor: pointer; }
  .cardActionBtn.primary { border-color: #5c5c9e; color: #fff; background: #5c5c9e; }
  .cardActionBtn:disabled { opacity: .6; cursor: not-allowed; }
  .pagination { margin-top: 18px; }
  .pageBtn { min-width: 44px; min-height: 44px; padding: 0; }
  .modalOverlay { align-items: flex-end; padding: 0; }
  .modal { max-height: min(88vh, 760px); display: flex; flex-direction: column; }
  .mobileSheet { width: 100%; max-width: 100%; margin-top: auto; border-radius: 18px 18px 0 0; }
  .modalHeader { padding: 18px 18px 14px; }
  .modalBody { padding: 18px; overflow-y: auto; }
  .modalFooter { padding: 14px 18px 18px; flex-direction: column-reverse; }
  .modalFooter .btnGhost, .modalFooter .btnPrimary { width: 100%; min-height: 44px; }
  .infoList li { display: grid; grid-template-columns: 76px minmax(0, 1fr); gap: 10px; }
  .infoList strong { text-align: left; }
}
</style>
