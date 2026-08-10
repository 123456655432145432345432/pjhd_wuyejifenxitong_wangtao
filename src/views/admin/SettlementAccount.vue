<template>
  <div class="page">
    <div class="header">
      <div>
        <h1 class="title">分成账户</h1>
        <p class="desc">
          物业公司账面分成余额（settlementBalance）。与「公司账户」（领导归集、无个人提现）不是同一账户。
          金额为待结算/可提现口径，非通道实时到账；提现手续费按后端返回（通常 6‰）。
        </p>
      </div>
      <button class="btnPrimary" :disabled="!companyId || loading || !balanceOk" @click="openApply">
        申请提现
      </button>
    </div>

    <div v-if="isPlatformAdmin" class="toolbar">
      <input
        v-model.trim="platformCompanyId"
        class="input"
        placeholder="物业公司 ID"
      />
      <button class="btnSecondary" :disabled="loading" @click="loadAll">加载</button>
    </div>

    <p v-if="bannerError" class="bannerError">{{ bannerError }}</p>
    <p v-if="bannerSuccess" class="bannerSuccess">{{ bannerSuccess }}</p>

    <div v-if="loading" class="hint">加载中...</div>
    <template v-else>
      <div class="summary">
        <div class="stat" :class="{ mutedStat: !balanceOk }">
          <span>可提现余额（待结算）</span>
          <strong>{{ balanceOk ? `¥${formatMoney(balance?.settlementBalance)}` : '—' }}</strong>
        </div>
        <div class="stat">
          <span>物业公司</span>
          <strong>{{ balance?.propertyCompanyId || companyId || '—' }}</strong>
        </div>
      </div>

      <div class="panel">
        <div class="panelHead">
          <h3 class="subTitle">提现记录</h3>
          <select
            v-model="statusFilter"
            class="select"
            :disabled="!balanceOk"
            @change="loadWithdrawals(1)"
          >
            <option value="">全部状态</option>
            <option v-for="opt in statusOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </div>
        <div v-if="listLoading" class="hint">加载中...</div>
        <p v-else-if="listError" class="error">{{ listError }}</p>
        <div v-else-if="records.length" class="tableScroll">
          <table class="table">
            <thead>
              <tr>
                <th>提现金额</th>
                <th>手续费</th>
                <th>实际到账</th>
                <th>状态</th>
                <th>申请时间</th>
                <th v-if="canAudit">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in records" :key="item.id">
                <td>¥{{ formatMoney(item.amount) }}</td>
                <td>¥{{ formatMoney(item.feeAmount) }}</td>
                <td>¥{{ formatMoney(item.actualAmount) }}</td>
                <td>{{ getEnumLabel(WITHDRAWAL_AUDIT_STATUS_LABEL, item.status) }}</td>
                <td>{{ item.createdAt || '—' }}</td>
                <td v-if="canAudit">
                  <template v-if="isWithdrawalPendingStatus(item.status)">
                    <button
                      class="linkBtn"
                      :disabled="auditingId === item.id"
                      @click="audit(item.id, 'approve')"
                    >
                      通过
                    </button>
                    <button
                      class="linkBtn danger"
                      :disabled="auditingId === item.id"
                      @click="audit(item.id, 'reject')"
                    >
                      拒绝
                    </button>
                  </template>
                  <span v-else class="muted">—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-else class="hint">{{ balanceOk ? '暂无提现记录' : '余额接口未通，暂不拉取提现记录' }}</p>
        <div v-if="totalPages > 1" class="pager">
          <button class="pageBtn" :disabled="page <= 1" @click="loadWithdrawals(page - 1)">&lt;</button>
          <span>{{ page }} / {{ totalPages }}</span>
          <button class="pageBtn" :disabled="page >= totalPages" @click="loadWithdrawals(page + 1)">
            &gt;
          </button>
        </div>
      </div>
    </template>

    <Teleport to="body">
      <div v-if="modalOpen" class="modalOverlay" @click.self="modalOpen = false">
        <div class="modal">
          <div class="modalHeader">
            <h3 class="modalTitle">申请分成提现</h3>
            <button class="modalClose" @click="modalOpen = false">&times;</button>
          </div>
          <div class="modalBody">
            <p class="hintInline">
              可提现余额 ¥{{ formatMoney(balance?.settlementBalance) }}（提交后后端扣手续费，以返回
              actualAmount 为准）
            </p>
            <div class="field">
              <label class="label">提现金额（元）</label>
              <input v-model.number="amount" type="number" min="0" step="0.01" class="input" />
            </div>
            <p v-if="previewFee != null" class="feePreview">
              预估手续费 ¥{{ formatMoney(previewFee) }} · 预估到账 ¥{{ formatMoney(previewActual) }}（以服务端为准）
            </p>
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
import { computed, onMounted, ref } from 'vue'
import { propertySettlementApi } from '../../api/services'
import type { PropertySettlementBalance, RoleWithdrawalItem } from '../../api/types'
import { formatApiError } from '../../api/request'
import {
  getEnumLabel,
  isWithdrawalPendingStatus,
  USER_ROLE,
  WITHDRAWAL_AUDIT_STATUS_LABEL,
  WITHDRAWAL_AUDIT_STATUS_OPTIONS
} from '../../constants/enums'
import { useAuthStore } from '../../stores/auth'

const FEE_RATE_HINT = 0.006

const auth = useAuthStore()
const isPlatformAdmin = computed(() => auth.profile?.role === USER_ROLE.PLATFORM_ADMIN)
const canAudit = computed(() => isPlatformAdmin.value)
const companyId = computed(() => {
  if (isPlatformAdmin.value && platformCompanyId.value) return platformCompanyId.value
  return auth.propertyCompanyId || ''
})

const platformCompanyId = ref(auth.propertyCompanyId || '')
const loading = ref(true)
const listLoading = ref(false)
const bannerError = ref('')
const bannerSuccess = ref('')
const listError = ref('')
const balance = ref<PropertySettlementBalance | null>(null)
const balanceOk = ref(false)
const records = ref<RoleWithdrawalItem[]>([])
const page = ref(1)
const totalPages = ref(1)
const statusFilter = ref('')
const auditingId = ref('')

const modalOpen = ref(false)
const amount = ref(0)
const submitting = ref(false)
const formError = ref('')

const statusOptions = WITHDRAWAL_AUDIT_STATUS_OPTIONS.filter((opt) => opt.value)

const previewFee = computed(() => {
  if (!amount.value || amount.value <= 0) return null
  return Math.round(amount.value * FEE_RATE_HINT * 100) / 100
})
const previewActual = computed(() => {
  if (previewFee.value == null) return null
  return Math.round((amount.value - previewFee.value) * 100) / 100
})

function formatMoney(value?: number | null) {
  if (value === undefined || value === null || value === '') return '0.00'
  return Number(value).toFixed(2)
}

function explainSettlementError(e: unknown, fallback: string) {
  const msg = formatApiError(e, fallback)
  if (/NoResourceFoundException|404|Not Found|no static resource/i.test(msg)) {
    return (
      `${msg}\n` +
      `前端请求：GET /admin/property-companies/{id}/settlement-balance。` +
      `若仍 404，请后端确认 AdminPropertyCompanyController 是否已部署到当前环境。`
    )
  }
  return msg
}

async function loadBalance() {
  if (!companyId.value) {
    balanceOk.value = false
    bannerError.value = isPlatformAdmin.value
      ? '请先在环境/账号中选择物业公司，或填写后刷新'
      : '未绑定物业公司，无法加载分成账户'
    balance.value = null
    return
  }
  balance.value = await propertySettlementApi.balance(companyId.value)
  balanceOk.value = true
}

async function loadWithdrawals(pageNo = 1) {
  if (!companyId.value || !balanceOk.value) {
    records.value = []
    return
  }
  listLoading.value = true
  listError.value = ''
  try {
    const res = await propertySettlementApi.withdrawals(companyId.value, {
      page: pageNo,
      pageSize: 20,
      status: statusFilter.value || undefined
    })
    records.value = res.list || []
    page.value = res.pagination?.page || pageNo
    totalPages.value = res.pagination?.totalPages || 1
  } catch (e) {
    listError.value = explainSettlementError(e, '提现记录加载失败')
    records.value = []
  } finally {
    listLoading.value = false
  }
}

async function loadAll() {
  loading.value = true
  bannerError.value = ''
  bannerSuccess.value = ''
  balanceOk.value = false
  balance.value = null
  records.value = []
  try {
    await loadBalance()
    await loadWithdrawals(1)
  } catch (e) {
    balanceOk.value = false
    balance.value = null
    bannerError.value = explainSettlementError(e, '分成账户加载失败')
  } finally {
    loading.value = false
  }
}

function openApply() {
  amount.value = 0
  formError.value = ''
  bannerSuccess.value = ''
  modalOpen.value = true
}

async function submit() {
  if (!companyId.value) {
    formError.value = '缺少物业公司 ID'
    return
  }
  if (!amount.value || amount.value <= 0) {
    formError.value = '请输入有效提现金额'
    return
  }
  const available = Number(balance.value?.settlementBalance ?? 0)
  if (amount.value > available) {
    formError.value = `超过可提现余额（¥${formatMoney(available)}）`
    return
  }
  submitting.value = true
  formError.value = ''
  try {
    const created = await propertySettlementApi.createWithdrawal(companyId.value, {
      amount: amount.value
    })
    modalOpen.value = false
    bannerSuccess.value = `已提交提现申请：申请 ¥${formatMoney(created.amount)}，手续费 ¥${formatMoney(created.feeAmount)}，预计到账 ¥${formatMoney(created.actualAmount)}（待审核）`
    await loadAll()
  } catch (e) {
    formError.value = formatApiError(e, '申请失败')
  } finally {
    submitting.value = false
  }
}

async function audit(id: string, action: 'approve' | 'reject') {
  if (!companyId.value) return
  if (action === 'reject') {
    const remark = window.prompt('请输入拒绝原因（可选）') || undefined
    auditingId.value = id
    bannerError.value = ''
    try {
      await propertySettlementApi.reject(companyId.value, id, { remark })
      bannerSuccess.value = '已拒绝该提现申请'
      await loadWithdrawals(page.value)
    } catch (e) {
      bannerError.value = formatApiError(e, '拒绝失败')
    } finally {
      auditingId.value = ''
    }
    return
  }
  auditingId.value = id
  bannerError.value = ''
  try {
    await propertySettlementApi.approve(companyId.value, id)
    bannerSuccess.value = '已通过该提现申请'
    await loadWithdrawals(page.value)
    await loadBalance()
  } catch (e) {
    bannerError.value = formatApiError(e, '审核失败')
  } finally {
    auditingId.value = ''
  }
}

onMounted(loadAll)
</script>

<style scoped>
.page { max-width: 960px; }
.header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 20px; flex-wrap: wrap; }
.toolbar { display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
.input { padding: 8px 12px; border: 1px solid #e8e8ec; border-radius: 8px; background: #fff; font-size: 14px; min-width: 220px; }
.title { font-size: 24px; font-weight: 600; color: #1f1f2e; margin-bottom: 8px; }
.desc { font-size: 13px; color: #8c8c9a; max-width: 640px; line-height: 1.5; }
.summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-bottom: 16px; }
.stat { background: #fff; border-radius: 12px; padding: 16px 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.stat.mutedStat strong { color: #8c8c9a; }
.bannerError { white-space: pre-wrap; }
.stat span { display: block; font-size: 13px; color: #8c8c9a; margin-bottom: 8px; }
.stat strong { font-size: 22px; color: #1f1f2e; }
.panel { background: #fff; border-radius: 12px; padding: 20px 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.panelHead { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 12px; }
.subTitle { margin: 0; font-size: 16px; font-weight: 600; }
.select { padding: 8px 12px; border: 1px solid #e8e8ec; border-radius: 8px; background: #fff; }
.tableScroll { overflow-x: auto; }
.table { width: 100%; border-collapse: collapse; font-size: 14px; }
.table th, .table td { padding: 12px 14px; text-align: left; border-bottom: 1px solid #f0f0f3; }
.table th { color: #8c8c9a; font-weight: 500; background: #fafafc; }
.btnPrimary { padding: 10px 18px; border-radius: 8px; background: #5c5c9e; color: #fff; border: none; cursor: pointer; }
.btnPrimary:disabled { opacity: 0.55; cursor: not-allowed; }
.btnSecondary { padding: 10px 18px; border-radius: 8px; border: 1px solid #e8e8ec; background: #fff; cursor: pointer; }
.linkBtn { border: none; background: none; color: #5c5c9e; cursor: pointer; margin-right: 8px; padding: 0; }
.linkBtn.danger { color: #e05c5c; }
.linkBtn:disabled { opacity: 0.5; cursor: not-allowed; }
.muted { color: #8c8c9a; }
.hint, .error { font-size: 14px; color: #8c8c9a; text-align: center; padding: 24px 0; }
.error { color: #e05c5c; text-align: left; padding: 0; }
.bannerError, .bannerSuccess { padding: 10px 12px; border-radius: 8px; margin-bottom: 12px; font-size: 13px; }
.bannerError { background: #fff1f0; color: #cf1322; }
.bannerSuccess { background: #f6ffed; color: #389e0d; }
.hintInline { margin: 0 0 12px; font-size: 13px; color: #5c5c66; }
.feePreview { margin: 0 0 12px; font-size: 12px; color: #8a6d1d; }
.pager { display: flex; align-items: center; justify-content: center; gap: 12px; margin-top: 12px; }
.pageBtn { padding: 6px 12px; border: 1px solid #e8e8ec; border-radius: 8px; background: #fff; cursor: pointer; }
.pageBtn:disabled { opacity: 0.5; cursor: not-allowed; }
.modalOverlay { position: fixed; inset: 0; z-index: 1000; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; padding: 24px; }
.modal { background: #fff; border-radius: 12px; width: min(420px, 100%); }
.modalHeader { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid #f0f0f3; }
.modalTitle { font-size: 16px; font-weight: 600; margin: 0; }
.modalClose { border: none; background: none; font-size: 24px; cursor: pointer; color: #8c8c9a; }
.modalBody { padding: 24px; }
.field { margin-bottom: 12px; }
.label { display: block; font-size: 13px; color: #5c5c66; margin-bottom: 8px; }
.input { width: 100%; padding: 10px 14px; border: 1px solid #e8e8ec; border-radius: 8px; font-size: 14px; box-sizing: border-box; }
.modalFooter { display: flex; justify-content: flex-end; gap: 12px; margin-top: 8px; }
</style>
