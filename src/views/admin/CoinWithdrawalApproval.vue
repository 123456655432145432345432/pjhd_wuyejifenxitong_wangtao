<template>
  <div class="page">
    <div class="header">
      <div>
        <h1 class="title">物业币提现审批</h1>
        <p class="desc">仅审核住户物业币兑换申请（与商品微信支付分账不是同一条链路）。商家、配送员现金提现请走对应提现审批页。</p>
      </div>
    </div>

    <div class="stats">
      <div class="statCard">
        <div class="label">待审笔数</div>
        <div class="value">{{ displaySummary.pendingCount }}</div>
      </div>
      <div class="statCard">
        <div class="label">待审金额</div>
        <div class="value">¥{{ formatMoney(displaySummary.pendingAmount) }}</div>
      </div>
      <div class="statCard">
        <div class="label">今日完成</div>
        <div class="value small">
          {{ displaySummary.todayCompletedCount }} 笔 / ¥{{ formatMoney(displaySummary.todayCompletedAmount) }}
        </div>
      </div>
      <div class="statCard green">
        <div class="label">已通过</div>
        <div class="value small">
          {{ displaySummary.approvedCount }} 笔 / ¥{{ formatMoney(displaySummary.approvedAmount) }}
        </div>
      </div>
    </div>
    <p v-if="summaryHint" class="summaryHint">{{ summaryHint }}</p>

    <div class="table">
      <div class="toolbar">
        <form class="search" @submit.prevent="submitSearch">
          <IconSvg name="search" />
          <input
            v-model="searchKeyword"
            type="search"
            placeholder="搜索住户姓名 / 手机 / 编号"
            enterkeyhint="search"
            @input="onSearchInput"
          />
          <button type="submit" class="searchBtn">搜索</button>
        </form>
        <select v-model="filterStatus" class="filterSelect" @change="applyFilters">
          <option v-for="opt in WITHDRAWAL_AUDIT_STATUS_OPTIONS" :key="opt.value || 'all'" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>
        <div class="dateRange">
          <input v-model="startDate" type="date" class="dateInput" @change="applyFilters" />
          <span class="dateSep">至</span>
          <input v-model="endDate" type="date" class="dateInput" @change="applyFilters" />
        </div>
      </div>
      <table class="content">
        <thead>
          <tr>
            <th>申请人</th>
            <th>手机</th>
            <th>小区/物业</th>
            <th>兑换币额</th>
            <th>兑现金额</th>
            <th>状态</th>
            <th>申请时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="8" class="emptyCell">加载中...</td>
          </tr>
          <tr v-else-if="loadError">
            <td colspan="8" class="emptyCell errorCell">
              <p>{{ loadError }}</p>
              <button type="button" class="retryBtn" @click="loadData(currentPage)">重新加载</button>
            </td>
          </tr>
          <tr v-else-if="!list.length">
            <td colspan="8" class="emptyCell">暂无数据</td>
          </tr>
          <tr v-for="item in list" v-else :key="item.id" class="dataRow">
            <td>
              <div class="name">{{ applicantName(item) }}</div>
              <div class="sub">{{ applicantId(item) }}</div>
            </td>
            <td>{{ applicantPhone(item) }}</td>
            <td>{{ communityLabel(item) }}</td>
            <td>{{ formatMoney(coinAmountOf(item)) }}</td>
            <td>¥{{ formatMoney(exchangeAmountOf(item)) }}</td>
            <td>
              <span :class="['statusBadge', resolveStatus(item) || 'unknown']">
                {{ statusLabel(item) }}
              </span>
            </td>
            <td>{{ item.createdAt || '—' }}</td>
            <td>
              <div class="actions">
                <button
                  v-if="isPending(item)"
                  class="actionBtn approve"
                  title="审核"
                  @click="openAuditModal(item)"
                >
                  <IconSvg name="edit" />
                </button>
                <span v-else-if="isTerminal(item)" class="doneLabel">已处理</span>
                <span v-else class="doneLabel warn">待确认</span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <div class="footer">
        <span class="total">显示 {{ pageStart }} 到 {{ pageEnd }}，共 {{ total }} 条记录</span>
        <div v-if="totalPages > 1" class="pagination">
          <button class="pageBtn" :disabled="currentPage <= 1 || loading" @click="changePage(currentPage - 1)">&lt;</button>
          <span class="pageInfo">{{ currentPage }} / {{ totalPages }}</span>
          <button class="pageBtn" :disabled="currentPage >= totalPages || loading" @click="changePage(currentPage + 1)">&gt;</button>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="auditModalOpen" class="modalOverlay" @click.self="closeAuditModal">
        <div class="modal">
          <div class="modalHeader">
            <h3 class="modalTitle">审核物业币提现</h3>
            <button class="modalClose" @click="closeAuditModal">&times;</button>
          </div>
          <form class="modalBody" @submit.prevent="submitAudit">
            <div class="auditInfo">
              <div class="infoRow"><span class="infoLabel">申请人</span><span>{{ auditTarget ? applicantName(auditTarget) : '—' }}</span></div>
              <div class="infoRow"><span class="infoLabel">申请人编号</span><span>{{ auditTarget ? applicantId(auditTarget) : '—' }}</span></div>
              <div class="infoRow"><span class="infoLabel">手机</span><span>{{ auditTarget ? applicantPhone(auditTarget) : '—' }}</span></div>
              <div class="infoRow"><span class="infoLabel">小区/物业</span><span>{{ auditTarget ? communityLabel(auditTarget) : '—' }}</span></div>
              <div class="infoRow"><span class="infoLabel">兑换币额</span><span>{{ formatMoney(auditTarget ? coinAmountOf(auditTarget) : null) }}</span></div>
              <div class="infoRow"><span class="infoLabel">兑现金额</span><span>¥{{ formatMoney(auditTarget ? exchangeAmountOf(auditTarget) : null) }}</span></div>
            </div>
            <div class="field">
              <label class="label">审核结果 <span class="required">*</span></label>
              <div class="radioGroup">
                <label class="radioItem">
                  <input v-model="auditForm.auditResult" type="radio" :value="AUDIT_RESULT.APPROVED" />
                  <span>通过</span>
                </label>
                <label class="radioItem">
                  <input v-model="auditForm.auditResult" type="radio" :value="AUDIT_RESULT.REJECTED" />
                  <span>拒绝</span>
                </label>
              </div>
            </div>
            <div class="field">
              <label class="label">
                {{
                  auditForm.auditResult === AUDIT_RESULT.REJECTED
                    ? '拒绝原因'
                    : auditForm.auditResult === AUDIT_RESULT.APPROVED
                      ? '备注'
                      : '审核说明'
                }}
              </label>
              <textarea
                v-model="auditForm.remark"
                class="textarea"
                rows="3"
                maxlength="200"
                :placeholder="auditForm.auditResult === AUDIT_RESULT.REJECTED ? '请填写拒绝原因（必填）' : '备注（选填）'"
              />
            </div>
            <p v-if="formError" class="error">{{ formError }}</p>
            <div class="modalFooter">
              <button type="button" class="btnSecondary" @click="closeAuditModal">取消</button>
              <button type="submit" class="btnPrimary" :disabled="formSubmitting">
                {{ formSubmitting ? '提交中...' : '确认审核' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import IconSvg from '../../components/IconSvg.vue'
import { coinWithdrawalAdminApi } from '../../api/services'
import type { AdminCoinWithdrawalItem, CoinWithdrawalSummary } from '../../api/types'
import { formatApiError } from '../../api/request'
import {
  AUDIT_RESULT,
  WITHDRAWAL_AUDIT_STATUS,
  WITHDRAWAL_AUDIT_STATUS_LABEL,
  WITHDRAWAL_AUDIT_STATUS_OPTIONS,
  isWithdrawalPendingStatus,
  isWithdrawalTerminalStatus
} from '../../constants/enums'

const PAGE_SIZE = 20
const FETCH_PAGE_SIZE = 100
const FETCH_MAX_PAGES = 10

const loading = ref(true)
const loadError = ref('')
const list = ref<AdminCoinWithdrawalItem[]>([])
const currentPage = ref(1)
const total = ref(0)
const totalPages = ref(1)
const summary = ref<CoinWithdrawalSummary | null>(null)
const summaryHint = ref('')

const searchKeyword = ref('')
const appliedKeyword = ref('')
const filterStatus = ref('')
const startDate = ref('')
const endDate = ref('')

const auditModalOpen = ref(false)
const auditTarget = ref<AdminCoinWithdrawalItem | null>(null)
const auditForm = ref({ auditResult: '', remark: '' })
const formSubmitting = ref(false)
const formError = ref('')

let searchTimer: ReturnType<typeof setTimeout>

function pickStr(...vals: unknown[]) {
  for (const v of vals) {
    if (typeof v === 'string' && v.trim()) return v.trim()
    if (typeof v === 'number' && Number.isFinite(v)) return String(v)
  }
  return ''
}

function pickNum(...vals: unknown[]) {
  for (const v of vals) {
    if (typeof v === 'number' && Number.isFinite(v)) return v
    if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))) return Number(v)
  }
  return undefined
}

/** 兼容住户 / 商家 / snake_case 字段 */
function normalizeItem(raw: AdminCoinWithdrawalItem): AdminCoinWithdrawalItem {
  const r = raw as AdminCoinWithdrawalItem & Record<string, unknown>
  return {
    ...raw,
    id: pickStr(r.id) || raw.id,
    residentId: pickStr(r.residentId, r.resident_id, r.applicantId, r.applicant_id) || undefined,
    residentName: pickStr(r.residentName, r.resident_name, r.applicantName, r.applicant_name) || undefined,
    residentPhone:
      pickStr(r.residentPhone, r.resident_phone, r.phone, r.contactPhone, r.contact_phone) || undefined,
    merchantId: pickStr(r.merchantId, r.merchant_id) || undefined,
    merchantName: pickStr(r.merchantName, r.merchant_name, r.name) || undefined,
    communityName:
      pickStr(
        r.communityName,
        r.community_name,
        r.community,
        r.propertyCompanyName,
        r.property_company_name
      ) || undefined,
    coinAmount: pickNum(r.coinAmount, r.coin_amount, r.amount),
    exchangeAmount: pickNum(r.exchangeAmount, r.exchange_amount, r.cashAmount, r.actualAmount, r.amount),
    status: pickStr(r.status, r.auditStatus, r.audit_status) || raw.status,
    auditStatus: pickStr(r.auditStatus, r.audit_status, r.status) || raw.auditStatus,
    createdAt: pickStr(r.createdAt, r.created_at) || raw.createdAt,
    auditedAt: pickStr(r.auditedAt, r.audited_at) || raw.auditedAt,
    completedAt: pickStr(r.completedAt, r.completed_at) || raw.completedAt
  }
}

function applicantName(item: AdminCoinWithdrawalItem) {
  return pickStr(item.residentName, item.merchantName, item.applicantName) || '—'
}

function applicantId(item: AdminCoinWithdrawalItem) {
  return pickStr(item.residentId, item.merchantId, item.applicantId) || '—'
}

function applicantPhone(item: AdminCoinWithdrawalItem) {
  return pickStr(item.residentPhone, item.phone, item.contactPhone) || '—'
}

function communityLabel(item: AdminCoinWithdrawalItem) {
  return pickStr(item.communityName, item.community, item.propertyCompanyName) || '—'
}

function coinAmountOf(item: AdminCoinWithdrawalItem) {
  return pickNum(item.coinAmount, item.amount)
}

function exchangeAmountOf(item: AdminCoinWithdrawalItem) {
  return pickNum(item.exchangeAmount, item.amount, item.coinAmount)
}

const displaySummary = computed(() => ({
  pendingCount: Number(summary.value?.pendingCount ?? 0),
  pendingAmount: Number(summary.value?.pendingAmount ?? 0),
  todayCompletedCount: Number(
    summary.value?.todayCompletedCount ?? summary.value?.todayProcessedCount ?? 0
  ),
  todayCompletedAmount: Number(
    summary.value?.todayCompletedAmount ?? summary.value?.todayProcessedAmount ?? 0
  ),
  approvedCount: Number(summary.value?.approvedCount ?? 0),
  approvedAmount: Number(summary.value?.approvedAmount ?? 0)
}))

const pageStart = computed(() => {
  if (!total.value) return 0
  return (currentPage.value - 1) * PAGE_SIZE + 1
})

const pageEnd = computed(() => {
  if (!total.value) return 0
  return Math.min(currentPage.value * PAGE_SIZE, total.value)
})

function formatMoney(val: number | string | undefined | null): string {
  if (val === undefined || val === null || val === '') return '0.00'
  return Number(val).toFixed(2)
}

function resolveStatus(item: AdminCoinWithdrawalItem | null | undefined): string {
  if (!item) return ''
  return String(item.status || item.auditStatus || '').trim()
}

function statusLabel(item: AdminCoinWithdrawalItem) {
  const status = resolveStatus(item)
  if (!status) return '—'
  return WITHDRAWAL_AUDIT_STATUS_LABEL[status] || '—'
}

function isPending(item: AdminCoinWithdrawalItem) {
  return isWithdrawalPendingStatus(resolveStatus(item))
}

function isTerminal(item: AdminCoinWithdrawalItem) {
  return isWithdrawalTerminalStatus(resolveStatus(item))
}

function numField(raw: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const val = raw[key]
    if (typeof val === 'number' && Number.isFinite(val)) return val
    if (typeof val === 'string' && val.trim() !== '' && !Number.isNaN(Number(val))) return Number(val)
  }
  return 0
}

function normalizeSummary(raw: unknown): CoinWithdrawalSummary {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  return {
    pendingCount: numField(obj, 'pendingCount', 'pending_count'),
    pendingAmount: numField(obj, 'pendingAmount', 'pending_amount'),
    todayCompletedCount: numField(
      obj,
      'todayCompletedCount',
      'today_completed_count',
      'todayProcessedCount',
      'today_processed_count'
    ),
    todayCompletedAmount: numField(
      obj,
      'todayCompletedAmount',
      'today_completed_amount',
      'todayProcessedAmount',
      'today_processed_amount'
    ),
    approvedCount: numField(obj, 'approvedCount', 'approved_count'),
    approvedAmount: numField(obj, 'approvedAmount', 'approved_amount')
  }
}

function isSummaryEmpty(data: CoinWithdrawalSummary | null) {
  if (!data) return true
  return (
    !data.pendingCount &&
    !data.pendingAmount &&
    !data.todayCompletedCount &&
    !data.todayCompletedAmount &&
    !data.todayProcessedCount &&
    !data.todayProcessedAmount &&
    !data.approvedCount &&
    !data.approvedAmount
  )
}

function isToday(iso?: string) {
  if (!iso) return false
  const day = String(iso).slice(0, 10)
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return day === `${y}-${m}-${d}`
}

function matchKeyword(item: AdminCoinWithdrawalItem, term: string) {
  const q = term.trim().toLowerCase()
  if (!q) return true
  const hay = [
    applicantId(item),
    applicantName(item),
    applicantPhone(item),
    communityLabel(item)
  ]
    .map((v) => String(v || '').toLowerCase())
    .join(' ')
  return hay.includes(q)
}

async function buildSummaryFromList(): Promise<CoinWithdrawalSummary> {
  const collected: AdminCoinWithdrawalItem[] = []
  let page = 1
  let pages = 1
  do {
    const res = await coinWithdrawalAdminApi.list({
      page,
      pageSize: FETCH_PAGE_SIZE,
      sort: '-createdAt'
    })
    collected.push(...(res.list || []).map(normalizeItem))
    pages = res.pagination?.totalPages ?? 1
    page += 1
  } while (page <= pages && page <= FETCH_MAX_PAGES)

  let pendingCount = 0
  let pendingAmount = 0
  let todayCompletedCount = 0
  let todayCompletedAmount = 0
  let approvedCount = 0
  let approvedAmount = 0

  for (const item of collected) {
    const status = resolveStatus(item)
    const amount = Number(exchangeAmountOf(item) ?? 0)
    if (isWithdrawalPendingStatus(status)) {
      pendingCount += 1
      pendingAmount += amount
      continue
    }
    if (
      status === WITHDRAWAL_AUDIT_STATUS.APPROVED ||
      status === WITHDRAWAL_AUDIT_STATUS.COMPLETED
    ) {
      approvedCount += 1
      approvedAmount += amount
    }
    const dayMark = item.completedAt || item.auditedAt
    if (
      (status === WITHDRAWAL_AUDIT_STATUS.COMPLETED ||
        status === WITHDRAWAL_AUDIT_STATUS.APPROVED ||
        status === WITHDRAWAL_AUDIT_STATUS.REJECTED) &&
      dayMark &&
      isToday(dayMark)
    ) {
      todayCompletedCount += 1
      todayCompletedAmount += amount
    }
  }

  return {
    pendingCount,
    pendingAmount,
    todayCompletedCount,
    todayCompletedAmount,
    approvedCount,
    approvedAmount
  }
}

async function loadSummary() {
  summaryHint.value = ''
  let apiSummary: CoinWithdrawalSummary | null = null
  try {
    apiSummary = normalizeSummary(await coinWithdrawalAdminApi.summary())
  } catch (e) {
    console.error(e)
    summaryHint.value = '统计暂不可用，当前数据根据提现列表估算'
  }

  if (apiSummary && !isSummaryEmpty(apiSummary)) {
    summary.value = apiSummary
    return
  }

  try {
    summary.value = await buildSummaryFromList()
    if (!summaryHint.value) {
      summaryHint.value = '统计结果为空，当前数据根据提现列表估算'
    }
  } catch (e) {
    console.error(e)
    summary.value = apiSummary || {
      pendingCount: 0,
      pendingAmount: 0,
      todayCompletedCount: 0,
      todayCompletedAmount: 0,
      approvedCount: 0,
      approvedAmount: 0
    }
    if (!summaryHint.value) summaryHint.value = '汇总加载失败'
  }
}

async function loadData(page = currentPage.value) {
  loading.value = true
  loadError.value = ''
  try {
    const term = appliedKeyword.value.trim()
    const baseParams = {
      auditStatus: filterStatus.value || undefined,
      startDate: startDate.value || undefined,
      endDate: endDate.value || undefined,
      sort: '-createdAt' as const
    }

    if (term) {
      const collected: AdminCoinWithdrawalItem[] = []
      let fetchPage = 1
      let fetchTotalPages = 1
      do {
        const res = await coinWithdrawalAdminApi.list({
          ...baseParams,
          page: fetchPage,
          pageSize: FETCH_PAGE_SIZE
        })
        collected.push(...(res.list || []).map(normalizeItem))
        fetchTotalPages = res.pagination?.totalPages ?? 1
        fetchPage += 1
      } while (fetchPage <= fetchTotalPages && fetchPage <= FETCH_MAX_PAGES)

      const items = collected.filter((item) => matchKeyword(item, term))
      list.value = items
      total.value = items.length
      currentPage.value = 1
      totalPages.value = 1
      return
    }

    const res = await coinWithdrawalAdminApi.list({
      ...baseParams,
      page,
      pageSize: PAGE_SIZE
    })
    list.value = (res.list || []).map(normalizeItem)
    total.value = res.pagination?.total ?? 0
    currentPage.value = res.pagination?.page ?? page
    totalPages.value = res.pagination?.totalPages ?? 1
  } catch (e) {
    console.error(e)
    loadError.value = formatApiError(e, '物业币提现审批记录加载失败，请重试')
  } finally {
    loading.value = false
  }
}

function applyFilters() {
  currentPage.value = 1
  loadData(1)
}

function submitSearch() {
  clearTimeout(searchTimer)
  appliedKeyword.value = searchKeyword.value.trim()
  currentPage.value = 1
  loadData(1)
}

function onSearchInput() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(submitSearch, 300)
}

function changePage(page: number) {
  if (page < 1 || page > totalPages.value || page === currentPage.value) return
  currentPage.value = page
  loadData(page)
}

function openAuditModal(item: AdminCoinWithdrawalItem) {
  auditTarget.value = item
  auditForm.value = { auditResult: '', remark: '' }
  formError.value = ''
  auditModalOpen.value = true
}

function closeAuditModal() {
  auditModalOpen.value = false
  auditTarget.value = null
  formError.value = ''
}

async function submitAudit() {
  if (!auditTarget.value) return
  if (!auditForm.value.auditResult) {
    formError.value = '请选择通过或拒绝'
    return
  }
  if (auditForm.value.auditResult === AUDIT_RESULT.REJECTED && !auditForm.value.remark.trim()) {
    formError.value = '拒绝时请填写拒绝原因'
    return
  }
  const actionLabel = auditForm.value.auditResult === AUDIT_RESULT.APPROVED ? '通过' : '拒绝'
  const confirmed = window.confirm(
    `确认${actionLabel}「${applicantName(auditTarget.value)}」的物业币提现申请？\n` +
      `兑换币额：${formatMoney(coinAmountOf(auditTarget.value))}\n` +
      `兑现金额：¥${formatMoney(exchangeAmountOf(auditTarget.value))}\n` +
      '提交后不可撤回。'
  )
  if (!confirmed) return
  formError.value = ''
  formSubmitting.value = true
  try {
    const payload = {
      auditResult: auditForm.value.auditResult,
      ...(auditForm.value.auditResult === AUDIT_RESULT.REJECTED
        ? { rejectReason: auditForm.value.remark.trim() }
        : { remark: auditForm.value.remark.trim() || undefined })
    }
    await coinWithdrawalAdminApi.audit(auditTarget.value.id, payload)
    closeAuditModal()
    await Promise.all([loadData(currentPage.value), loadSummary()])
  } catch (e) {
    formError.value = formatApiError(e, '审核失败，请稍后重试')
  } finally {
    formSubmitting.value = false
  }
}

onMounted(() => {
  void Promise.all([loadData(1), loadSummary()])
})
</script>

<style scoped>
.page { max-width: 1200px; }
.header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 24px; gap: 16px; flex-wrap: wrap; }
.title { font-size: 24px; font-weight: 600; color: #1f1f2e; margin-bottom: 8px; }
.desc { font-size: 14px; color: #8c8c9a; }
.required { color: #e05c5c; }

.stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 8px; }
.statCard { background: #fff; border-radius: 12px; padding: 16px 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.statCard.green .value { color: #3aaf7d; }
.statCard .label { font-size: 13px; color: #8c8c9a; margin-bottom: 8px; }
.statCard .value { font-size: 22px; font-weight: 600; color: #1f1f2e; }
.statCard .value.small { font-size: 16px; }
.summaryHint { margin: 0 0 12px; padding: 10px 14px; border-radius: 8px; background: #fffbe6; color: #8c6d1f; font-size: 13px; }

.table { background: #ffffff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); overflow: hidden; }
.toolbar { display: flex; align-items: center; gap: 12px; padding: 16px 24px; border-bottom: 1px solid #f0f0f3; flex-wrap: wrap; }
.search { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 200px; padding: 10px 14px; border: 1px solid #e8e8ec; border-radius: 8px; background: #fafafc; }
.search svg { width: 18px; height: 18px; color: #8c8c9a; }
.search input { flex: 1; border: none; background: transparent; font-size: 14px; color: #1f1f2e; outline: none; min-width: 0; }
.searchBtn { flex-shrink: 0; padding: 6px 12px; border-radius: 6px; background: #5c5c9e; color: #ffffff; font-size: 13px; }
.filterSelect { padding: 10px 14px; border: 1px solid #e8e8ec; border-radius: 8px; background: #ffffff; color: #5c5c66; font-size: 14px; cursor: pointer; outline: none; min-width: 120px; }
.filterSelect:focus { border-color: #5c5c9e; }
.dateRange { display: flex; align-items: center; gap: 8px; }
.dateInput { padding: 10px 14px; border: 1px solid #e8e8ec; border-radius: 8px; background: #ffffff; color: #5c5c66; font-size: 14px; outline: none; cursor: pointer; }
.dateInput:focus { border-color: #5c5c9e; }
.dateSep { color: #8c8c9a; font-size: 13px; }

.content { width: 100%; font-size: 14px; }
.content thead th { text-align: left; padding: 14px 24px; color: #8c8c9a; font-weight: 500; background: #fafafc; border-bottom: 1px solid #f0f0f3; }
.content tbody td { padding: 16px 24px; color: #1f1f2e; border-bottom: 1px solid #f0f0f3; vertical-align: middle; }
.content tbody tr:last-child td { border-bottom: none; }
.emptyCell { text-align: center; padding: 24px; color: #8c8c9a; }
.errorCell { color: #e05c5c; }
.retryBtn { margin-top: 10px; padding: 7px 14px; border-radius: 7px; border: 1px solid #e05c5c; background: #fff; color: #e05c5c; cursor: pointer; }
.dataRow { transition: background 0.15s; }
.dataRow:hover { background: #fafafc; }
.name { font-weight: 500; }
.sub { font-size: 12px; color: #8c8c9a; margin-top: 2px; }

.statusBadge { display: inline-block; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 500; }
.statusBadge.pending_audit,
.statusBadge.pending { background: #fff7e6; color: #d48806; }
.statusBadge.approved { background: #e6f7ee; color: #389e0d; }
.statusBadge.rejected { background: #fff1f0; color: #cf1322; }
.statusBadge.completed { background: #e6f0ff; color: #1d39c4; }
.statusBadge.failed,
.statusBadge.unknown { background: #f4f5f7; color: #8c8c9a; }

.actions { display: flex; align-items: center; gap: 8px; }
.actionBtn { display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 50%; border: 1px solid; background: transparent; cursor: pointer; }
.actionBtn svg { width: 14px; height: 14px; }
.actionBtn.approve { border-color: #5c5c9e; color: #5c5c9e; }
.doneLabel { font-size: 12px; color: #8c8c9a; }
.doneLabel.warn { color: #d48806; }

.footer { display: flex; align-items: center; justify-content: space-between; padding: 14px 24px; border-top: 1px solid #f0f0f3; }
.total { font-size: 13px; color: #8c8c9a; }
.pagination { display: flex; align-items: center; gap: 8px; }
.pageInfo { font-size: 13px; color: #8c8c9a; min-width: 48px; text-align: center; }
.pageBtn { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 6px; border: 1px solid #e8e8ec; background: #ffffff; color: #5c5c66; font-size: 14px; cursor: pointer; }
.pageBtn:disabled { color: #c8c8d0; cursor: not-allowed; }

.modalOverlay { position: fixed; inset: 0; z-index: 1000; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; padding: 24px; }
.modal { width: 100%; max-width: 480px; background: #ffffff; border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.12); }
.modalHeader { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid #f0f0f3; }
.modalTitle { font-size: 16px; font-weight: 600; color: #1f1f2e; margin: 0; }
.modalClose { width: 32px; height: 32px; border: none; background: transparent; font-size: 24px; line-height: 1; color: #8c8c9a; cursor: pointer; }
.modalBody { padding: 24px; }
.auditInfo { background: #fafafc; border-radius: 8px; padding: 12px 16px; margin-bottom: 16px; }
.infoRow { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; color: #5c5c66; gap: 12px; }
.infoLabel { color: #8c8c9a; flex-shrink: 0; }
.field { margin-bottom: 16px; }
.label { display: block; font-size: 13px; font-weight: 500; color: #5c5c66; margin-bottom: 8px; }
.radioGroup { display: flex; gap: 20px; }
.radioItem { display: flex; align-items: center; gap: 6px; font-size: 14px; color: #5c5c66; cursor: pointer; }
.textarea { width: 100%; padding: 10px 12px; border: 1px solid #e8e8ec; border-radius: 8px; font-size: 14px; color: #1f1f2e; background: #ffffff; outline: none; box-sizing: border-box; resize: vertical; min-height: 80px; font-family: inherit; }
.textarea:focus { border-color: #5c5c9e; }
.error { font-size: 13px; color: #e05c5c; margin-bottom: 12px; }
.modalFooter { display: flex; justify-content: flex-end; gap: 12px; margin-top: 8px; }
.btnSecondary { padding: 10px 18px; border-radius: 8px; border: 1px solid #e8e8ec; background: #ffffff; color: #5c5c66; font-size: 14px; cursor: pointer; }
.btnSecondary:hover { border-color: #5c5c9e; color: #5c5c9e; }
.btnPrimary { padding: 10px 18px; border-radius: 8px; border: none; background: #5c5c9e; color: #ffffff; font-size: 14px; cursor: pointer; }
.btnPrimary:hover { background: #52529a; }
.btnPrimary:disabled { opacity: 0.6; cursor: not-allowed; }

@media (max-width: 900px) {
  .content { display: block; overflow-x: auto; }
  .toolbar { flex-direction: column; align-items: stretch; }
  .dateRange { flex-wrap: wrap; }
  .stats { grid-template-columns: repeat(2, 1fr); }
}
</style>
