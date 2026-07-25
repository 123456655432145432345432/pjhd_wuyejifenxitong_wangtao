<template>
  <div class="page">
    <div class="header">
      <div>
        <h1 class="title">提现审批</h1>
        <p class="desc">审核商家提现申请。</p>
      </div>
    </div>

    <div class="table">
      <div class="toolbar">
        <form class="search" @submit.prevent="submitSearch">
          <IconSvg name="search" />
          <input
            v-model="searchMerchantId"
            type="search"
            placeholder="搜索商家ID..."
            @input="onSearchInput"
          />
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
            <th>商家ID</th>
            <th>商家名称</th>
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
            <td colspan="8" class="emptyCell">加载中...</td>
          </tr>
          <tr v-else-if="!list.length">
            <td colspan="8" class="emptyCell">暂无数据</td>
          </tr>
          <tr v-for="item in list" v-else :key="item.id" class="dataRow">
            <td>{{ item.merchantId }}</td>
            <td>{{ item.merchantName }}</td>
            <td>¥{{ formatMoney(item.amount) }}</td>
            <td>¥{{ formatMoney(item.feeAmount) }}</td>
            <td>¥{{ formatMoney(item.actualAmount) }}</td>
            <td>
              <span :class="['statusBadge', item.status]">
                {{ WITHDRAWAL_AUDIT_STATUS_LABEL[item.status] || item.status }}
              </span>
            </td>
            <td>{{ item.createdAt }}</td>
            <td>
              <div class="actions">
                <button
                  v-if="item.status === WITHDRAWAL_AUDIT_STATUS.PENDING"
                  class="actionBtn approve"
                  title="审核"
                  @click="openAuditModal(item)"
                >
                  <IconSvg name="edit" />
                </button>
                <span v-else class="doneLabel">已处理</span>
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
            <h3 class="modalTitle">审核提现申请</h3>
            <button class="modalClose" @click="closeAuditModal">&times;</button>
          </div>
          <form class="modalBody" @submit.prevent="submitAudit">
            <div class="auditInfo">
              <div class="infoRow"><span class="infoLabel">商家名称</span><span>{{ auditTarget?.merchantName }}</span></div>
              <div class="infoRow"><span class="infoLabel">商家ID</span><span>{{ auditTarget?.merchantId }}</span></div>
              <div class="infoRow"><span class="infoLabel">提现金额</span><span>¥{{ auditTarget?.amount ? formatMoney(auditTarget.amount) : '-' }}</span></div>
              <div class="infoRow"><span class="infoLabel">手续费</span><span>¥{{ auditTarget?.feeAmount ? formatMoney(auditTarget.feeAmount) : '-' }}</span></div>
              <div class="infoRow"><span class="infoLabel">实际到账</span><span>¥{{ auditTarget?.actualAmount ? formatMoney(auditTarget.actualAmount) : '-' }}</span></div>
            </div>
            <div class="field">
              <label class="label">审核结果 <span class="required">*</span></label>
              <div class="radioGroup">
                <label class="radioItem">
                  <input v-model="auditForm.auditResult" type="radio" value="approved" />
                  <span>通过</span>
                </label>
                <label class="radioItem">
                  <input v-model="auditForm.auditResult" type="radio" value="rejected" />
                  <span>拒绝</span>
                </label>
              </div>
            </div>
            <div class="field">
              <label class="label">{{ auditForm.auditResult === 'rejected' ? '拒绝原因' : '备注' }}</label>
              <textarea v-model="auditForm.remark" class="textarea" rows="3" maxlength="200" :placeholder="auditForm.auditResult === 'rejected' ? '请填写拒绝原因（必填）' : '备注（选填）'" />
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
import { adminMerchantWithdrawalApi } from '../../api/services'
import type { AdminMerchantWithdrawalItem } from '../../api/types'
import { ApiError } from '../../api/request'
import {
  WITHDRAWAL_AUDIT_STATUS,
  WITHDRAWAL_AUDIT_STATUS_LABEL,
  WITHDRAWAL_AUDIT_STATUS_OPTIONS
} from '../../constants/enums'

const PAGE_SIZE = 20

const loading = ref(true)
const list = ref<AdminMerchantWithdrawalItem[]>([])
const currentPage = ref(1)
const total = ref(0)
const totalPages = ref(1)

const searchMerchantId = ref('')
const appliedMerchantId = ref('')
const filterStatus = ref('')
const startDate = ref('')
const endDate = ref('')

const auditModalOpen = ref(false)
const auditTarget = ref<AdminMerchantWithdrawalItem | null>(null)
const auditForm = ref({ auditResult: 'approved', remark: '' })
const formSubmitting = ref(false)
const formError = ref('')

let searchTimer: ReturnType<typeof setTimeout>

const pageStart = computed(() => {
  if (!total.value) return 0
  return (currentPage.value - 1) * PAGE_SIZE + 1
})

const pageEnd = computed(() => {
  if (!total.value) return 0
  return Math.min(currentPage.value * PAGE_SIZE, total.value)
})

function formatMoney(val: number | string | undefined): string {
  if (val === undefined || val === null) return '0.00'
  return Number(val).toFixed(2)
}

async function loadData(page = currentPage.value) {
  loading.value = true
  try {
    const params: Record<string, string | number | undefined> = {
      page,
      pageSize: PAGE_SIZE,
      auditStatus: filterStatus.value || undefined,
      merchantId: appliedMerchantId.value || undefined,
      startDate: startDate.value || undefined,
      endDate: endDate.value || undefined,
      sort: '-createdAt'
    }
    const res = await adminMerchantWithdrawalApi.list(params)
    list.value = res.list || []
    total.value = res.pagination?.total ?? 0
    currentPage.value = res.pagination?.page ?? page
    totalPages.value = res.pagination?.totalPages ?? 1
  } catch (e) {
    console.error(e)
    list.value = []
    total.value = 0
    totalPages.value = 1
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
  appliedMerchantId.value = searchMerchantId.value.trim()
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

function openAuditModal(item: AdminMerchantWithdrawalItem) {
  auditTarget.value = item
  auditForm.value = { auditResult: 'approved', remark: '' }
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
  if (auditForm.value.auditResult === 'rejected' && !auditForm.value.remark.trim()) {
    formError.value = '拒绝时请填写拒绝原因'
    return
  }
  formError.value = ''
  formSubmitting.value = true
  try {
    const payload = {
      auditResult: auditForm.value.auditResult,
      ...(auditForm.value.auditResult === 'rejected'
        ? { rejectReason: auditForm.value.remark.trim() }
        : { remark: auditForm.value.remark.trim() || undefined })
    }
    await adminMerchantWithdrawalApi.audit(auditTarget.value.id, payload)
    closeAuditModal()
    await loadData(currentPage.value)
  } catch (e) {
    formError.value = e instanceof ApiError ? e.message : '审核失败，请稍后重试'
  } finally {
    formSubmitting.value = false
  }
}

onMounted(() => {
  loadData(1)
})
</script>

<style scoped>
.page { max-width: 1200px; }
.header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 24px; gap: 16px; flex-wrap: wrap; }
.title { font-size: 24px; font-weight: 600; color: #1f1f2e; margin-bottom: 8px; }
.desc { font-size: 14px; color: #8c8c9a; }
.required { color: #e05c5c; }

.table { background: #ffffff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); overflow: hidden; }
.toolbar { display: flex; align-items: center; gap: 12px; padding: 16px 24px; border-bottom: 1px solid #f0f0f3; flex-wrap: wrap; }
.search { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 200px; padding: 10px 14px; border: 1px solid #e8e8ec; border-radius: 8px; background: #fafafc; }
.search svg { width: 18px; height: 18px; color: #8c8c9a; }
.search input { flex: 1; border: none; background: transparent; font-size: 14px; color: #1f1f2e; outline: none; }
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
.dataRow { transition: background 0.15s; }
.dataRow:hover { background: #fafafc; }

.statusBadge { display: inline-block; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 500; }
.statusBadge.pending_audit { background: #fff7e6; color: #d48806; }
.statusBadge.approved { background: #e6f7ee; color: #389e0d; }
.statusBadge.rejected { background: #fff1f0; color: #cf1322; }
.statusBadge.completed { background: #e6f0ff; color: #1d39c4; }

.actions { display: flex; align-items: center; gap: 8px; }
.actionBtn { display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 50%; border: 1px solid; background: transparent; cursor: pointer; }
.actionBtn svg { width: 14px; height: 14px; }
.actionBtn.approve { border-color: #5c5c9e; color: #5c5c9e; }
.doneLabel { font-size: 12px; color: #8c8c9a; }

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
.infoRow { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; color: #5c5c66; }
.infoLabel { color: #8c8c9a; }
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
}
</style>
