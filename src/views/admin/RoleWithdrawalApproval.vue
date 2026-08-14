<template>
  <div class="page">
    <div class="header">
      <div>
        <h2 class="title">配送员/角色提现审批</h2>
        <p class="desc">审核配送员及各级负责人的提现申请，并完成线下打款闭环。</p>
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
        <div class="label">今日已审</div>
        <div class="value small">
          {{ displaySummary.todayProcessedCount }} 笔 /
          ¥{{ formatMoney(displaySummary.todayProcessedAmount) }}
        </div>
      </div>
      <div class="statCard green">
        <div class="label">已通过</div>
        <div class="value small">
          {{ displaySummary.approvedCount }} 笔 /
          ¥{{ formatMoney(displaySummary.approvedAmount) }}
        </div>
      </div>
    </div>
    <p v-if="summaryHint" class="summaryHint">{{ summaryHint }}</p>

    <div class="tablePanel">
      <div class="toolbar">
        <form class="search" @submit.prevent="submitSearch">
          <IconSvg name="search" />
          <input
            v-model="searchKeyword"
            type="search"
            placeholder="搜索提现ID、申请人、手机号"
            enterkeyhint="search"
            @input="onSearchInput"
          />
          <button type="submit" class="searchBtn">搜索</button>
        </form>
        <select v-model="withdrawalType" class="filterSelect" @change="onTypeChange">
          <option v-for="option in ROLE_WITHDRAWAL_TYPE_OPTIONS" :key="option.value || 'all'" :value="option.value">
            {{ option.label }}
          </option>
        </select>
        <select v-model="filterStatus" class="filterSelect" @change="applyFilters">
          <option v-for="option in WITHDRAWAL_AUDIT_STATUS_OPTIONS" :key="option.value || 'all'" :value="option.value">
            {{ option.label }}
          </option>
        </select>
        <div class="dateRange">
          <input v-model="startDate" type="date" class="dateInput" @change="applyFilters" />
          <span>至</span>
          <input v-model="endDate" type="date" class="dateInput" @change="applyFilters" />
        </div>
      </div>

      <div class="tableScroll">
        <table class="content">
          <thead>
            <tr>
              <th>角色</th>
              <th>申请人</th>
              <th>手机号</th>
              <th>提现金额</th>
              <th>手续费</th>
              <th>实际到账</th>
              <th>状态</th>
              <th>申请时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="9" class="emptyCell">加载中...</td>
            </tr>
            <tr v-else-if="loadError">
              <td colspan="9" class="emptyCell errorCell">
                <p>{{ loadError }}</p>
                <button type="button" class="retryBtn" @click="loadData(currentPage)">重新加载</button>
              </td>
            </tr>
            <tr v-else-if="!list.length">
              <td colspan="9" class="emptyCell">暂无数据</td>
            </tr>
            <tr v-for="item in list" v-else :key="item.id">
              <td>{{ getEnumLabel(WITHDRAWAL_TYPE_LABEL, item.withdrawalType) }}</td>
              <td>
                <div>{{ applicantName(item) }}</div>
                <div class="subText">{{ item.applicantId || item.residentId || '—' }}</div>
              </td>
              <td>{{ item.residentPhone || '—' }}</td>
              <td>¥{{ formatMoney(item.amount) }}</td>
              <td>¥{{ formatMoney(item.feeAmount) }}</td>
              <td>¥{{ formatMoney(item.actualAmount) }}</td>
              <td>
                <span :class="['statusBadge', item.auditStatus || 'unknown']">
                  {{ getEnumLabel(WITHDRAWAL_AUDIT_STATUS_LABEL, item.auditStatus) }}
                </span>
              </td>
              <td>{{ item.createdAt || '—' }}</td>
              <td>
                <button
                  v-if="canAudit(item)"
                  type="button"
                  :class="['actionBtn', item.auditStatus === WITHDRAWAL_AUDIT_STATUS.APPROVED ? 'pay' : 'approve']"
                  @click="openAuditModal(item)"
                >
                  {{ item.auditStatus === WITHDRAWAL_AUDIT_STATUS.APPROVED ? '打款' : '审核' }}
                </button>
                <span v-else class="doneLabel">已处理</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="footer">
        <span>显示 {{ pageStart }} 到 {{ pageEnd }}，共 {{ total }} 条记录</span>
        <div v-if="totalPages > 1" class="pagination">
          <button class="pageBtn" :disabled="currentPage <= 1 || loading" @click="changePage(currentPage - 1)">
            &lt;
          </button>
          <span>{{ currentPage }} / {{ totalPages }}</span>
          <button
            class="pageBtn"
            :disabled="currentPage >= totalPages || loading"
            @click="changePage(currentPage + 1)"
          >
            &gt;
          </button>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="auditModalOpen" class="modalOverlay" @click.self="closeAuditModal">
        <div class="modal">
          <div class="modalHeader">
            <h3>处理角色提现</h3>
            <button type="button" class="modalClose" @click="closeAuditModal">&times;</button>
          </div>
          <form class="modalBody" @submit.prevent="submitAudit">
            <div class="auditInfo">
              <div><span>申请人</span><strong>{{ auditTarget ? applicantName(auditTarget) : '—' }}</strong></div>
              <div><span>提现金额</span><strong>¥{{ formatMoney(auditTarget?.amount) }}</strong></div>
              <div><span>实际到账</span><strong>¥{{ formatMoney(auditTarget?.actualAmount) }}</strong></div>
            </div>

            <div class="field">
              <label class="fieldLabel">处理结果 <em>*</em></label>
              <div class="radioGroup">
                <label v-for="option in auditResultOptions" :key="option.value">
                  <input v-model="auditForm.auditResult" type="radio" :value="option.value" />
                  <span>{{ option.label }}</span>
                </label>
              </div>
            </div>

            <div v-if="auditForm.auditResult === WITHDRAWAL_AUDIT_STATUS.COMPLETED" class="field">
              <label class="fieldLabel">转账凭证 <em>*</em></label>
              <MediaUploader
                v-model="auditForm.transferProof"
                :category="FILE_CATEGORY.PROOF"
                accept="image"
                :max="1"
                hint="请上传人工转账凭证"
              />
            </div>

            <div class="field">
              <label class="fieldLabel">
                {{ auditForm.auditResult === WITHDRAWAL_AUDIT_STATUS.REJECTED ? '拒绝原因' : '备注' }}
                <em v-if="auditForm.auditResult === WITHDRAWAL_AUDIT_STATUS.REJECTED">*</em>
              </label>
              <textarea
                v-model="auditForm.remark"
                class="textarea"
                rows="3"
                maxlength="200"
                :placeholder="
                  auditForm.auditResult === WITHDRAWAL_AUDIT_STATUS.REJECTED
                    ? '请填写拒绝原因'
                    : '备注（选填）'
                "
              />
            </div>
            <p v-if="formError" class="formError">{{ formError }}</p>
            <div class="modalFooter">
              <button type="button" class="btnSecondary" @click="closeAuditModal">取消</button>
              <button type="submit" class="btnPrimary" :disabled="formSubmitting">
                {{ formSubmitting ? '提交中...' : '确认提交' }}
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
import MediaUploader from '../../components/MediaUploader.vue'
import { adminRoleWithdrawalApi } from '../../api/services'
import type {
  AdminRoleWithdrawalAuditPayload,
  AdminRoleWithdrawalItem,
  RoleWithdrawalSummary
} from '../../api/types'
import { ApiError, formatApiError } from '../../api/request'
import {
  FILE_CATEGORY,
  ROLE_WITHDRAWAL_TYPE_OPTIONS,
  WITHDRAWAL_AUDIT_STATUS,
  WITHDRAWAL_AUDIT_STATUS_LABEL,
  WITHDRAWAL_AUDIT_STATUS_OPTIONS,
  WITHDRAWAL_TYPE,
  WITHDRAWAL_TYPE_LABEL,
  getEnumLabel,
  isWithdrawalPendingStatus
} from '../../constants/enums'

const PAGE_SIZE = 20
const SUMMARY_PAGE_SIZE = 100
const SUMMARY_MAX_PAGES = 50

const loading = ref(true)
const loadError = ref('')
const list = ref<AdminRoleWithdrawalItem[]>([])
const currentPage = ref(1)
const total = ref(0)
const totalPages = ref(1)

const searchKeyword = ref('')
const appliedKeyword = ref('')
const withdrawalType = ref<string>(WITHDRAWAL_TYPE.COURIER)
const filterStatus = ref('')
const startDate = ref('')
const endDate = ref('')
let searchTimer: ReturnType<typeof setTimeout>

const summary = ref<RoleWithdrawalSummary | null>(null)
const summaryHint = ref('')

const auditModalOpen = ref(false)
const auditTarget = ref<AdminRoleWithdrawalItem | null>(null)
const auditForm = ref({
  auditResult: '',
  transferProof: '',
  remark: ''
})
const formSubmitting = ref(false)
const formError = ref('')

const displaySummary = computed(() => ({
  pendingCount: Number(summary.value?.pendingCount ?? 0),
  pendingAmount: Number(summary.value?.pendingAmount ?? 0),
  todayProcessedCount: Number(summary.value?.todayProcessedCount ?? 0),
  todayProcessedAmount: Number(summary.value?.todayProcessedAmount ?? 0),
  approvedCount: Number(summary.value?.approvedCount ?? 0),
  approvedAmount: Number(summary.value?.approvedAmount ?? 0)
}))

const pageStart = computed(() => (total.value ? (currentPage.value - 1) * PAGE_SIZE + 1 : 0))
const pageEnd = computed(() => Math.min(currentPage.value * PAGE_SIZE, total.value))

const auditResultOptions = computed(() => {
  if (auditTarget.value?.auditStatus === WITHDRAWAL_AUDIT_STATUS.APPROVED) {
    return [
      { value: WITHDRAWAL_AUDIT_STATUS.COMPLETED, label: '确认打款完成' },
      { value: WITHDRAWAL_AUDIT_STATUS.REJECTED, label: '拒绝' }
    ]
  }
  return [
    { value: WITHDRAWAL_AUDIT_STATUS.APPROVED, label: '通过' },
    { value: WITHDRAWAL_AUDIT_STATUS.REJECTED, label: '拒绝' }
  ]
})

function formatMoney(value?: number | string | null) {
  if (value === undefined || value === null || Number.isNaN(Number(value))) return '0.00'
  return Number(value).toFixed(2)
}

function applicantName(item: AdminRoleWithdrawalItem) {
  return item.applicantName || item.residentName || '—'
}

function canAudit(item: AdminRoleWithdrawalItem) {
  return isWithdrawalPendingStatus(item.auditStatus) ||
    item.auditStatus === WITHDRAWAL_AUDIT_STATUS.APPROVED
}

function isToday(value?: string) {
  if (!value) return false
  const now = new Date()
  const today = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0')
  ].join('-')
  return value.slice(0, 10) === today
}

async function loadData(page = currentPage.value) {
  loading.value = true
  loadError.value = ''
  try {
    const res = await adminRoleWithdrawalApi.list({
      page,
      pageSize: PAGE_SIZE,
      withdrawalType: withdrawalType.value || undefined,
      auditStatus: filterStatus.value || undefined,
      keyword: appliedKeyword.value || undefined,
      startDate: startDate.value || undefined,
      endDate: endDate.value || undefined
    })
    list.value = res.list || []
    total.value = res.pagination?.total ?? 0
    currentPage.value = res.pagination?.page ?? page
    totalPages.value = res.pagination?.totalPages ?? 1
  } catch (error) {
    loadError.value = formatApiError(error, '角色提现记录加载失败，请重试')
  } finally {
    loading.value = false
  }
}

async function calculateTypeSummary(type: string): Promise<RoleWithdrawalSummary> {
  const records: AdminRoleWithdrawalItem[] = []
  let page = 1
  let pages = 1
  do {
    const res = await adminRoleWithdrawalApi.list({
      page,
      pageSize: SUMMARY_PAGE_SIZE,
      withdrawalType: type
    })
    records.push(...(res.list || []))
    pages = res.pagination?.totalPages ?? 1
    page += 1
  } while (page <= pages && page <= SUMMARY_MAX_PAGES)

  let pendingCount = 0
  let pendingAmount = 0
  let todayProcessedCount = 0
  let todayProcessedAmount = 0
  let approvedCount = 0
  let approvedAmount = 0

  records.forEach((item) => {
    if (isWithdrawalPendingStatus(item.auditStatus)) {
      pendingCount += 1
      pendingAmount += Number(item.amount || 0)
    }
    if (
      item.auditStatus === WITHDRAWAL_AUDIT_STATUS.APPROVED ||
      item.auditStatus === WITHDRAWAL_AUDIT_STATUS.COMPLETED
    ) {
      approvedCount += 1
      approvedAmount += Number(item.actualAmount ?? item.amount ?? 0)
    }
    if (item.auditedAt && isToday(item.auditedAt)) {
      todayProcessedCount += 1
      todayProcessedAmount += Number(item.actualAmount ?? item.amount ?? 0)
    }
  })

  return {
    pendingCount,
    pendingAmount,
    todayProcessedCount,
    todayProcessedAmount,
    approvedCount,
    approvedAmount
  }
}

async function loadSummary() {
  summaryHint.value = ''
  try {
    if (withdrawalType.value) {
      summary.value = await calculateTypeSummary(withdrawalType.value)
      return
    }
    summary.value = await adminRoleWithdrawalApi.summary()
  } catch (error) {
    summary.value = null
    summaryHint.value = formatApiError(error, '角色提现汇总加载失败')
  }
}

function applyFilters() {
  currentPage.value = 1
  void loadData(1)
}

function onTypeChange() {
  currentPage.value = 1
  void Promise.all([loadData(1), loadSummary()])
}

function submitSearch() {
  clearTimeout(searchTimer)
  appliedKeyword.value = searchKeyword.value.trim()
  currentPage.value = 1
  void loadData(1)
}

function onSearchInput() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(submitSearch, 300)
}

function changePage(page: number) {
  if (page < 1 || page > totalPages.value || page === currentPage.value) return
  currentPage.value = page
  void loadData(page)
}

function openAuditModal(item: AdminRoleWithdrawalItem) {
  auditTarget.value = item
  auditForm.value = { auditResult: '', transferProof: '', remark: '' }
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
  const result = auditForm.value.auditResult
  if (!result) {
    formError.value = '请选择处理结果'
    return
  }
  if (result === WITHDRAWAL_AUDIT_STATUS.REJECTED && !auditForm.value.remark.trim()) {
    formError.value = '拒绝时请填写拒绝原因'
    return
  }
  if (result === WITHDRAWAL_AUDIT_STATUS.COMPLETED && !auditForm.value.transferProof) {
    formError.value = '确认打款完成前请上传转账凭证'
    return
  }

  const actionLabel =
    result === WITHDRAWAL_AUDIT_STATUS.APPROVED
      ? '通过'
      : result === WITHDRAWAL_AUDIT_STATUS.COMPLETED
        ? '确认打款完成'
        : '拒绝'
  if (!window.confirm(`确认${actionLabel}「${applicantName(auditTarget.value)}」的提现申请？提交后不可撤回。`)) {
    return
  }

  const payload: AdminRoleWithdrawalAuditPayload = {
    auditResult: result as AdminRoleWithdrawalAuditPayload['auditResult'],
    ...(result === WITHDRAWAL_AUDIT_STATUS.REJECTED
      ? { rejectReason: auditForm.value.remark.trim() }
      : { remark: auditForm.value.remark.trim() || undefined }),
    ...(result === WITHDRAWAL_AUDIT_STATUS.COMPLETED
      ? { transferProof: auditForm.value.transferProof }
      : {})
  }

  formSubmitting.value = true
  formError.value = ''
  try {
    await adminRoleWithdrawalApi.audit(auditTarget.value.id, payload)
    closeAuditModal()
    await Promise.all([loadData(currentPage.value), loadSummary()])
  } catch (error) {
    formError.value = error instanceof ApiError ? error.message : '处理失败，请稍后重试'
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
.header { margin-bottom: 20px; }
.title { margin: 0 0 8px; font-size: 20px; color: #1f1f2e; }
.desc { margin: 0; color: #8c8c9a; font-size: 14px; }
.stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 8px; }
.statCard { padding: 16px 18px; background: #fff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,.04); }
.statCard .label { margin-bottom: 8px; color: #8c8c9a; font-size: 13px; }
.statCard .value { color: #1f1f2e; font-size: 22px; font-weight: 600; }
.statCard .value.small { font-size: 16px; }
.statCard.green .value { color: #3aaf7d; }
.summaryHint { margin: 0 0 8px; color: #b76a00; font-size: 13px; }
.tablePanel { overflow: hidden; background: #fff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,.04); }
.toolbar { display: flex; align-items: center; gap: 12px; padding: 16px 20px; border-bottom: 1px solid #f0f0f3; flex-wrap: wrap; }
.search { display: flex; align-items: center; min-width: 280px; flex: 1; padding: 0 10px; border: 1px solid #e8e8ec; border-radius: 8px; }
.search input { min-width: 0; flex: 1; padding: 9px 8px; border: none; outline: none; }
.searchBtn { border: none; background: transparent; color: #5c5c9e; cursor: pointer; }
.filterSelect, .dateInput { padding: 9px 10px; border: 1px solid #e8e8ec; border-radius: 8px; background: #fff; }
.dateRange { display: flex; align-items: center; gap: 6px; color: #8c8c9a; }
.tableScroll { overflow-x: auto; }
.content { width: 100%; min-width: 1040px; border-collapse: collapse; font-size: 14px; }
.content th, .content td { padding: 12px 14px; border-bottom: 1px solid #f0f0f3; text-align: left; }
.content th { color: #8c8c9a; font-weight: 500; background: #fafafc; }
.subText { margin-top: 3px; color: #a5a5ae; font-size: 12px; }
.statusBadge { display: inline-block; padding: 4px 9px; border-radius: 10px; background: #f2f2f5; white-space: nowrap; }
.statusBadge.pending, .statusBadge.pending_audit { color: #b76a00; background: #fff7e8; }
.statusBadge.approved { color: #2878c8; background: #edf6ff; }
.statusBadge.completed { color: #28845f; background: #ecfaf4; }
.statusBadge.rejected, .statusBadge.failed { color: #c74444; background: #fff0f0; }
.actionBtn, .retryBtn { padding: 6px 12px; border: none; border-radius: 6px; color: #fff; cursor: pointer; }
.actionBtn.approve { background: #5c5c9e; }
.actionBtn.pay { background: #3aaf7d; }
.retryBtn { background: #5c5c9e; }
.doneLabel { color: #8c8c9a; font-size: 13px; }
.emptyCell { padding: 36px !important; text-align: center !important; color: #8c8c9a; }
.errorCell { color: #e05c5c; }
.footer { display: flex; justify-content: space-between; align-items: center; padding: 14px 20px; color: #8c8c9a; font-size: 13px; }
.pagination { display: flex; align-items: center; gap: 10px; }
.pageBtn { padding: 5px 10px; border: 1px solid #e8e8ec; border-radius: 6px; background: #fff; cursor: pointer; }
.pageBtn:disabled { opacity: .45; cursor: not-allowed; }
.modalOverlay { position: fixed; inset: 0; z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px; background: rgba(0,0,0,.45); }
.modal { width: min(500px, 100%); max-height: 90vh; overflow-y: auto; background: #fff; border-radius: 12px; }
.modalHeader { display: flex; align-items: center; justify-content: space-between; padding: 18px 22px; border-bottom: 1px solid #f0f0f3; }
.modalHeader h3 { margin: 0; font-size: 17px; }
.modalClose { border: none; background: none; color: #8c8c9a; font-size: 24px; cursor: pointer; }
.modalBody { padding: 22px; }
.auditInfo { padding: 12px 14px; border-radius: 8px; background: #fafafc; }
.auditInfo div { display: flex; justify-content: space-between; gap: 16px; padding: 5px 0; }
.auditInfo span { color: #8c8c9a; }
.field { margin-top: 18px; }
.fieldLabel { display: block; margin-bottom: 8px; color: #5c5c66; font-size: 13px; }
.fieldLabel em { color: #e05c5c; font-style: normal; }
.radioGroup { display: flex; gap: 22px; }
.radioGroup label { display: flex; align-items: center; gap: 6px; }
.textarea { width: 100%; padding: 10px 12px; border: 1px solid #e8e8ec; border-radius: 8px; box-sizing: border-box; resize: vertical; }
.formError { color: #e05c5c; font-size: 13px; }
.modalFooter { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
.btnPrimary, .btnSecondary { padding: 9px 16px; border-radius: 8px; cursor: pointer; }
.btnPrimary { border: none; background: #5c5c9e; color: #fff; }
.btnSecondary { border: 1px solid #e8e8ec; background: #fff; }
.btnPrimary:disabled { opacity: .55; cursor: not-allowed; }
@media (max-width: 900px) {
  .stats { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 640px) {
  .stats { grid-template-columns: 1fr 1fr; }
  .toolbar { align-items: stretch; }
  .search { min-width: 100%; }
  .filterSelect, .dateRange { flex: 1; }
  .dateRange { flex-wrap: wrap; }
  .dateInput { min-width: 0; flex: 1; }
}
</style>
