<template>
  <div class="page">
    <div class="header">
      <div>
        <h1 class="title">活动组组长申请</h1>
        <p class="desc">
          住户自助申请成为活动组组长。审核通过后后端<b>同一事务</b>创建组长身份并自动开通组长小店，
          <b>前端不要再调用任何开店接口</b>。组长账号 <code>role</code> 恒为 <code>resident</code>，
          身份由 <code>isActivityLeader</code> 标签判定，不要用 role 判断。
        </p>
      </div>
    </div>

    <div class="tabs">
      <button
        v-for="opt in tabs"
        :key="opt.key"
        type="button"
        class="tab"
        :class="{ active: auditStatus === opt.key }"
        @click="switchTab(opt.key)"
      >
        {{ opt.label }}
      </button>
    </div>

    <div class="toolbar">
      <select
        v-if="isPlatformAdmin"
        v-model="selectedPropertyId"
        class="input"
        @change="reload"
      >
        <option value="">全部物业</option>
        <option v-for="item in propertyCompanies" :key="item.id" :value="item.id">
          {{ item.name || item.id }}
        </option>
      </select>
      <button class="btnPrimary" :disabled="loading" @click="reload">刷新</button>
    </div>

    <p v-if="success" class="success">{{ success }}</p>

    <div class="panel">
      <div v-if="loading" class="loading">加载中...</div>
      <p v-else-if="error" class="error">{{ error }}</p>

      <table v-else-if="applications.length" class="table">
        <thead>
          <tr>
            <th>申请人</th>
            <th>活动领域</th>
            <th>申请备注</th>
            <th>状态</th>
            <th>申请时间</th>
            <th>审核时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in applications" :key="item.id">
            <td>
              <div>{{ item.residentName || item.residentId || '—' }}</div>
              <div class="sub">{{ item.residentPhone || item.phone || '' }}</div>
            </td>
            <td>{{ item.activityField || '—' }}</td>
            <td>{{ item.remark || '—' }}</td>
            <td>
              <span class="statusTag" :class="item.auditStatus || item.status">
                {{ statusLabel(item.auditStatus || item.status) }}
              </span>
              <div v-if="item.activityLeaderIdentityId" class="sub">
                身份 {{ item.activityLeaderIdentityId }}
              </div>
            </td>
            <td>{{ formatDateTime(item.createdAt) }}</td>
            <td>{{ formatDateTime(item.auditedAt) }}</td>
            <td class="actions">
              <button
                v-if="isActivityLeaderApplicationPending(item.auditStatus || item.status)"
                class="btnGhost"
                @click="openAudit(item)"
              >
                审核
              </button>
              <button
                v-else-if="canRevoke(item)"
                class="btnDangerSm"
                :disabled="revokingId === item.id"
                @click="revoke(item)"
              >
                撤销身份
              </button>
              <span v-else class="muted">{{ item.rejectReason || '已处理' }}</span>
            </td>
          </tr>
        </tbody>
      </table>

      <p v-else class="empty">暂无{{ currentTabLabel }}的组长申请</p>
    </div>

    <div v-if="totalPages > 1" class="pager">
      <button class="btnGhost" :disabled="page <= 1 || loading" @click="changePage(page - 1)">
        上一页
      </button>
      <span>{{ page }} / {{ totalPages }}</span>
      <button class="btnGhost" :disabled="page >= totalPages || loading" @click="changePage(page + 1)">
        下一页
      </button>
    </div>

    <Teleport to="body">
      <div v-if="auditOpen" class="modalOverlay" @click.self="closeAudit">
        <div class="modal">
          <div class="modalHeader">
            <h3 class="modalTitle">审核组长申请</h3>
            <button class="modalClose" @click="closeAudit">&times;</button>
          </div>
          <div class="modalBody">
            <div class="summary">
              <div>
                <span>申请人</span>
                <strong>{{ auditTarget?.residentName || auditTarget?.residentId || '—' }}</strong>
              </div>
              <div>
                <span>手机</span>
                <strong>{{ auditTarget?.residentPhone || auditTarget?.phone || '—' }}</strong>
              </div>
              <div>
                <span>活动领域</span>
                <strong>{{ auditTarget?.activityField || '—' }}</strong>
              </div>
              <div><span>申请备注</span><strong>{{ auditTarget?.remark || '—' }}</strong></div>
            </div>
            <p v-if="auditError" class="error">{{ auditError }}</p>
            <div class="field">
              <label class="label">审核结果 <em>*</em></label>
              <select v-model="auditForm.auditStatus" class="input">
                <option :value="ACTIVITY_LEADER_APPLICATION_STATUS.APPROVED">通过</option>
                <option :value="ACTIVITY_LEADER_APPLICATION_STATUS.REJECTED">驳回</option>
              </select>
            </div>
            <div v-if="auditForm.auditStatus === ACTIVITY_LEADER_APPLICATION_STATUS.APPROVED" class="hint">
              通过后后端自动创建组长身份并开通组长小店，前端无需再调开店接口。
            </div>
            <div v-else class="field">
              <label class="label">驳回原因 <em>*</em></label>
              <textarea
                v-model="auditForm.rejectReason"
                class="input"
                rows="3"
                maxlength="200"
                placeholder="请填写驳回原因，住户端会展示并可重新申请"
              />
            </div>
          </div>
          <div class="modalFooter">
            <button class="btnGhost" @click="closeAudit">取消</button>
            <button class="btnPrimary" :disabled="auditing" @click="submitAudit">
              {{ auditing ? '提交中...' : '确认提交' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { adminActivityLeaderApplicationApi, propertyCompanyApi } from '../../api/services'
import type { ActivityLeaderApplicationItem, PropertyCompanyItem } from '../../api/types'
import { formatApiError } from '../../api/request'
import {
  ACTIVITY_LEADER_APPLICATION_STATUS,
  ACTIVITY_LEADER_APPLICATION_STATUS_LABEL,
  ENTITY_STATUS,
  getEnumLabel,
  isActivityLeaderApplicationPending,
  USER_ROLE
} from '../../constants/enums'
import { useAuthStore } from '../../stores/auth'

const PAGE_SIZE = 20

const auth = useAuthStore()
const isPlatformAdmin = computed(() => auth.profile?.role === USER_ROLE.PLATFORM_ADMIN)

const tabs = [
  { key: ACTIVITY_LEADER_APPLICATION_STATUS.PENDING, label: '待审核' },
  { key: ACTIVITY_LEADER_APPLICATION_STATUS.APPROVED, label: '已通过' },
  { key: ACTIVITY_LEADER_APPLICATION_STATUS.REJECTED, label: '已驳回' }
]

const applications = ref<ActivityLeaderApplicationItem[]>([])
const propertyCompanies = ref<PropertyCompanyItem[]>([])
const selectedPropertyId = ref('')
const auditStatus = ref<string>(ACTIVITY_LEADER_APPLICATION_STATUS.PENDING)
const loading = ref(false)
const error = ref('')
const success = ref('')
const page = ref(1)
const totalPages = ref(1)
const revokingId = ref('')

const auditOpen = ref(false)
const auditing = ref(false)
const auditError = ref('')
const auditTarget = ref<ActivityLeaderApplicationItem | null>(null)
const auditForm = reactive({
  auditStatus: ACTIVITY_LEADER_APPLICATION_STATUS.APPROVED as string,
  rejectReason: ''
})

const currentTabLabel = computed(
  () => tabs.find((item) => item.key === auditStatus.value)?.label || ''
)

function statusLabel(status?: string) {
  return getEnumLabel(ACTIVITY_LEADER_APPLICATION_STATUS_LABEL, status, '—')
}

function formatDateTime(value?: string | null) {
  return value ? value.replace('T', ' ').slice(0, 19) : '—'
}

/** 撤销只针对已通过且拿到住户编号的申请 */
function canRevoke(item: ActivityLeaderApplicationItem) {
  return (item.auditStatus || item.status) === ACTIVITY_LEADER_APPLICATION_STATUS.APPROVED && !!item.residentId
}

function switchTab(next: string) {
  if (auditStatus.value === next) return
  auditStatus.value = next
  success.value = ''
  load(1)
}

function resolvePropertyCompanyId() {
  if (isPlatformAdmin.value) return selectedPropertyId.value || ''
  return auth.propertyCompanyId || ''
}

async function load(targetPage = 1) {
  loading.value = true
  error.value = ''
  page.value = targetPage
  try {
    const res = await adminActivityLeaderApplicationApi.list({
      page: targetPage,
      pageSize: PAGE_SIZE,
      auditStatus: auditStatus.value || undefined,
      propertyCompanyId: resolvePropertyCompanyId() || undefined
    })
    applications.value = res.list || []
    totalPages.value = res.pagination?.totalPages || 1
  } catch (e) {
    applications.value = []
    totalPages.value = 1
    error.value = formatApiError(e, '组长申请列表加载失败')
  } finally {
    loading.value = false
  }
}

function reload() {
  load(1)
}

function changePage(next: number) {
  load(next)
}

async function loadPropertyCompanies() {
  if (!isPlatformAdmin.value) return
  try {
    const res = await propertyCompanyApi.list(
      { page: 1, pageSize: 100, status: ENTITY_STATUS.ACTIVE, sort: '-createdAt' },
      true
    )
    propertyCompanies.value = res.list || []
  } catch {
    propertyCompanies.value = []
  }
}

function openAudit(item: ActivityLeaderApplicationItem) {
  const applicationId = (item.id || '').trim()
  if (!/^ala_/i.test(applicationId)) {
    error.value = `申请编号格式不正确（当前为「${applicationId || '空'}」），无法提交审核`
    return
  }
  auditTarget.value = item
  auditForm.auditStatus = ACTIVITY_LEADER_APPLICATION_STATUS.APPROVED
  auditForm.rejectReason = ''
  auditError.value = ''
  success.value = ''
  auditOpen.value = true
}

function closeAudit() {
  auditOpen.value = false
  auditTarget.value = null
  auditError.value = ''
}

async function submitAudit() {
  if (!auditTarget.value || auditing.value) return
  const approved = auditForm.auditStatus === ACTIVITY_LEADER_APPLICATION_STATUS.APPROVED
  if (!approved && !auditForm.rejectReason.trim()) {
    auditError.value = '驳回时请填写原因（住户端会展示）'
    return
  }
  auditing.value = true
  auditError.value = ''
  try {
    const res = await adminActivityLeaderApplicationApi.audit(auditTarget.value.id, {
      auditStatus: auditForm.auditStatus,
      rejectReason: approved ? undefined : auditForm.rejectReason.trim()
    })
    closeAudit()
    success.value = approved
      ? `已通过，并已自动开通组长小店${
          res?.activityLeaderIdentityId ? `（组长身份 ${res.activityLeaderIdentityId}）` : ''
        }。请提醒组长刷新个人资料后进入组长管理页。`
      : '已驳回，住户端可在「我的申请」看到原因并重新提交。'
    await load(page.value)
  } catch (e) {
    auditError.value = formatApiError(e, '审核提交失败')
  } finally {
    auditing.value = false
  }
}

async function revoke(item: ActivityLeaderApplicationItem) {
  const name = item.residentName || item.residentId || '该住户'
  if (
    !confirm(
      `确认撤销「${name}」的组长身份？\n撤销后 isActivityLeader 变为 false，已存在的活动组、组长小店与订单数据保留，不会级联删除。`
    )
  ) {
    return
  }
  revokingId.value = item.id
  error.value = ''
  success.value = ''
  try {
    await adminActivityLeaderApplicationApi.revoke(item.residentId as string)
    success.value = `已撤销「${name}」的组长身份。活动组、组长小店与订单数据均保留。`
    await load(page.value)
  } catch (e) {
    error.value = formatApiError(e, '撤销组长身份失败')
  } finally {
    revokingId.value = ''
  }
}

onMounted(() => {
  if (isPlatformAdmin.value) void loadPropertyCompanies()
  void load(1)
})
</script>

<style scoped>
.page { max-width: 1200px; }
.header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 16px; }
.title { font-size: 24px; font-weight: 600; color: #1f1f2e; margin-bottom: 8px; }
.desc { font-size: 14px; color: #8c8c9a; }
code { background: #f4f4f7; padding: 1px 5px; border-radius: 4px; font-size: 12.5px; color: #5c5c9e; }
.tabs { display: flex; gap: 8px; margin-bottom: 16px; }
.tab { padding: 8px 14px; border-radius: 8px; border: 1px solid #e8e8ec; background: #fff; cursor: pointer; color: #5c5c66; }
.tab.active { background: #5c5c9e; color: #fff; border-color: #5c5c9e; }
.toolbar { display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
.input { padding: 8px 12px; border: 1px solid #e8e8ec; border-radius: 8px; min-width: 180px; }
.btnPrimary { padding: 10px 18px; border-radius: 8px; background: #5c5c9e; color: #fff; border: none; cursor: pointer; }
.btnPrimary:hover { background: #52529a; }
.btnPrimary:disabled { opacity: 0.6; cursor: not-allowed; }
.btnGhost { padding: 8px 14px; border-radius: 8px; border: 1px solid #e8e8ec; background: #fff; cursor: pointer; }
.btnDangerSm { padding: 4px 10px; border-radius: 6px; border: none; background: #e05c5c; color: #fff; cursor: pointer; }
.btnDangerSm:disabled { opacity: 0.6; cursor: not-allowed; }
.panel { background: #fff; border-radius: 12px; padding: 16px; }
.table { width: 100%; border-collapse: collapse; }
.table th, .table td { padding: 10px 8px; border-bottom: 1px solid #f0f0f3; text-align: left; font-size: 14px; }
.sub { font-size: 12px; color: #8c8c9a; margin-top: 2px; }
.statusTag { font-size: 12px; }
.statusTag.approved { color: #2e7d32; }
.statusTag.pending, .statusTag.pending_audit { color: #b76a00; }
.statusTag.rejected { color: #c94a4a; }
.statusTag.revoked { color: #8c8c9a; }
.empty, .loading, .error { padding: 24px; color: #8c8c9a; }
.error { color: #c94a4a; }
.success { padding: 10px 14px; margin: 0 0 12px; border-radius: 8px; background: #ecfdf3; color: #14532d; font-size: 13.5px; }
.hint { margin: 0; font-size: 12.5px; color: #5c5c66; }
.muted { color: #8c8c9a; font-size: 13px; }
.pager { display: flex; gap: 12px; align-items: center; justify-content: center; margin-top: 16px; }
.modalOverlay { position: fixed; inset: 0; background: rgba(0,0,0,.35); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal { width: 480px; max-width: calc(100vw - 32px); background: #fff; border-radius: 12px; }
.modalHeader { display: flex; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid #f0f0f3; }
.modalTitle { margin: 0; font-size: 16px; }
.modalClose { border: none; background: none; font-size: 22px; cursor: pointer; }
.modalBody { padding: 16px 20px; display: flex; flex-direction: column; gap: 12px; }
.modalFooter { display: flex; justify-content: flex-end; gap: 8px; padding: 12px 20px 20px; }
.field { display: flex; flex-direction: column; gap: 6px; }
.label { font-size: 13px; color: #5c5c66; }
.label em { color: #c94a4a; font-style: normal; }
.actions { white-space: nowrap; }
.summary { padding: 12px 14px; border-radius: 8px; background: #fafafc; }
.summary div { display: flex; justify-content: space-between; gap: 16px; padding: 4px 0; }
.summary span { color: #8c8c9a; }
.summary strong { font-weight: 500; text-align: right; }
</style>
