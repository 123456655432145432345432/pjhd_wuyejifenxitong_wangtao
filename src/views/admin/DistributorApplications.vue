<template>
  <div class="page">
    <div class="header">
      <div>
        <h1 class="title">一级代理申请</h1>
        <p class="desc">
          住户自助申请的货源带货资质，走
          <code>GET /admin/distributor-applications</code>（v8.12.1 §60.16）。
          <b>审核通过后后端会同事务自动创建商家载体并开通一级代理</b>，无需再手工去「商家管理」建店。
          本页与菜单「个体负责人」（板块体系）不是同一条链路。
        </p>
      </div>
      <button class="btnPrimary" :disabled="loading" @click="reload">刷新</button>
    </div>

    <div class="toolbar">
      <input
        v-model="keyword"
        class="input"
        placeholder="搜索姓名/手机号"
        @keyup.enter="reload"
      />
      <select v-model="auditStatus" class="input" @change="reload">
        <option
          v-for="opt in DISTRIBUTOR_APPLICATION_STATUS_OPTIONS"
          :key="opt.value || 'all'"
          :value="opt.value"
        >
          {{ opt.label }}
        </option>
      </select>
      <select v-if="isPlatformAdmin" v-model="selectedPropertyId" class="input" @change="reload">
        <option value="">全部物业</option>
        <option v-for="pc in propertyCompanies" :key="pc.id" :value="pc.id">{{ pc.name }}</option>
      </select>
      <button class="btnPrimary" :disabled="loading" @click="reload">搜索</button>
    </div>

    <div class="panel">
      <div v-if="loading" class="loading">加载中...</div>
      <p v-else-if="error" class="error">
        {{ error }}
        <button type="button" class="retryBtn" @click="load(page)">重新加载</button>
      </p>

      <template v-else-if="applications.length">
        <table class="table">
          <thead>
            <tr>
              <th>申请人</th>
              <th>联系方式</th>
              <th>经营品类</th>
              <th>服务范围</th>
              <th>备注</th>
              <th>状态</th>
              <th>申请时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in applications" :key="item.id">
              <td>
                <div>{{ item.residentName || item.contactName || item.residentId || '—' }}</div>
                <div class="sub">{{ item.residentId || '—' }}</div>
              </td>
              <td>{{ item.contactPhone || item.residentPhone || '—' }}</td>
              <td>{{ getEnumLabel(DISTRIBUTOR_BUSINESS_SCOPE_LABEL, item.businessScope) }}</td>
              <td>{{ getEnumLabel(DISTRIBUTOR_SERVICE_SCOPE_LABEL, item.serviceScope) }}</td>
              <td class="remarkCell">{{ item.remark || '—' }}</td>
              <td>
                <span class="statusTag" :class="statusClass(item.auditStatus)">
                  {{ getEnumLabel(DISTRIBUTOR_APPLICATION_STATUS_LABEL, item.auditStatus, '—') }}
                </span>
                <div v-if="item.distributorMerchantId" class="sub">
                  载体：{{ item.distributorMerchantId }}
                </div>
              </td>
              <td>{{ formatDateTime(item.createdAt || item.submittedAt) }}</td>
              <td class="actions">
                <button
                  v-if="isDistributorApplicationPending(item.auditStatus)"
                  class="btnGhost"
                  @click="openAudit(item)"
                >
                  审核
                </button>
                <span v-else class="muted">{{ item.rejectReason || '已处理' }}</span>
              </td>
            </tr>
          </tbody>
        </table>

        <div v-if="totalPages > 1" class="pager">
          <button class="btnGhost" :disabled="page <= 1 || loading" @click="changePage(page - 1)">
            上一页
          </button>
          <span>{{ page }} / {{ totalPages }}</span>
          <button
            class="btnGhost"
            :disabled="page >= totalPages || loading"
            @click="changePage(page + 1)"
          >
            下一页
          </button>
        </div>
      </template>

      <p v-else class="empty">暂无一级代理申请</p>
    </div>

    <Teleport to="body">
      <div v-if="auditOpen" class="modalOverlay" @click.self="closeAudit">
        <div class="modal">
          <div class="modalHeader">
            <h3 class="modalTitle">审核一级代理申请</h3>
            <button class="modalClose" @click="closeAudit">&times;</button>
          </div>
          <div class="modalBody">
            <div class="summary">
              <div>
                <span>申请人</span>
                <strong>{{ auditTarget?.residentName || auditTarget?.contactName || '—' }}</strong>
              </div>
              <div>
                <span>联系电话</span>
                <strong>{{ auditTarget?.contactPhone || auditTarget?.residentPhone || '—' }}</strong>
              </div>
              <div>
                <span>经营品类</span>
                <strong>{{ getEnumLabel(DISTRIBUTOR_BUSINESS_SCOPE_LABEL, auditTarget?.businessScope) }}</strong>
              </div>
              <div>
                <span>服务范围</span>
                <strong>{{ getEnumLabel(DISTRIBUTOR_SERVICE_SCOPE_LABEL, auditTarget?.serviceScope) }}</strong>
              </div>
              <div><span>备注</span><strong>{{ auditTarget?.remark || '—' }}</strong></div>
            </div>

            <p v-if="auditError" class="error">{{ auditError }}</p>

            <div class="field">
              <label class="label">审核结果 <em>*</em></label>
              <select v-model="auditForm.auditResult" class="input">
                <option :value="AUDIT_RESULT.APPROVED">通过</option>
                <option :value="AUDIT_RESULT.REJECTED">拒绝</option>
              </select>
            </div>

            <div v-if="auditForm.auditResult === AUDIT_RESULT.APPROVED" class="callout">
              通过后后端自动创建商家载体（platform_merchants + merchants + merchant_property_configs）
              并开通一级代理，幂等可重复；无需再手工建店。
            </div>

            <div v-else class="field">
              <label class="label">拒绝原因 <em>*</em></label>
              <textarea
                v-model="auditForm.rejectReason"
                class="input"
                rows="3"
                maxlength="200"
                placeholder="请填写拒绝原因，住户端会展示并可重新申请"
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
import { adminDistributorApplicationApi, propertyCompanyApi } from '../../api/services'
import { formatApiError } from '../../api/request'
import type { DistributorApplicationItem, PropertyCompanyItem } from '../../api/types'
import {
  AUDIT_RESULT,
  DISTRIBUTOR_APPLICATION_STATUS_LABEL,
  DISTRIBUTOR_APPLICATION_STATUS_OPTIONS,
  DISTRIBUTOR_BUSINESS_SCOPE_LABEL,
  DISTRIBUTOR_SERVICE_SCOPE_LABEL,
  ENTITY_STATUS,
  USER_ROLE,
  getEnumLabel,
  isDistributorApplicationPending
} from '../../constants/enums'
import { useAuthStore } from '../../stores/auth'

const PAGE_SIZE = 20

const auth = useAuthStore()
const isPlatformAdmin = computed(() => auth.profile?.role === USER_ROLE.PLATFORM_ADMIN)

const applications = ref<DistributorApplicationItem[]>([])
const propertyCompanies = ref<PropertyCompanyItem[]>([])
const selectedPropertyId = ref('')
const loading = ref(false)
const error = ref('')
const keyword = ref('')
const auditStatus = ref('')
const page = ref(1)
const totalPages = ref(1)

const auditOpen = ref(false)
const auditing = ref(false)
const auditError = ref('')
const auditTarget = ref<DistributorApplicationItem | null>(null)
const auditForm = reactive({
  auditResult: AUDIT_RESULT.APPROVED as string,
  rejectReason: ''
})

function resolvePropertyCompanyId() {
  if (isPlatformAdmin.value) return selectedPropertyId.value || ''
  return auth.propertyCompanyId || ''
}

function formatDateTime(value?: string) {
  return value ? value.replace('T', ' ').slice(0, 19) : '—'
}

function statusClass(status?: string) {
  return status || 'unknown'
}

async function load(targetPage = 1) {
  loading.value = true
  error.value = ''
  page.value = targetPage
  try {
    const res = await adminDistributorApplicationApi.list({
      page: targetPage,
      pageSize: PAGE_SIZE,
      keyword: keyword.value.trim() || undefined,
      auditStatus: auditStatus.value || undefined,
      propertyCompanyId: resolvePropertyCompanyId() || undefined
    })
    applications.value = res.list || []
    totalPages.value = res.pagination?.totalPages || 1
  } catch (e) {
    applications.value = []
    totalPages.value = 1
    error.value = formatApiError(e, '一级代理申请列表加载失败')
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

function openAudit(item: DistributorApplicationItem) {
  auditTarget.value = item
  auditForm.auditResult = AUDIT_RESULT.APPROVED
  auditForm.rejectReason = ''
  auditError.value = ''
  auditOpen.value = true
}

function closeAudit() {
  auditOpen.value = false
  auditTarget.value = null
  auditError.value = ''
}

async function submitAudit() {
  if (!auditTarget.value || auditing.value) return
  const applicationId = auditTarget.value.id
  if (!/^dap_/i.test(applicationId)) {
    auditError.value = `申请编号格式不正确（当前为「${applicationId || '空'}」），无法提交审核`
    return
  }
  if (auditForm.auditResult === AUDIT_RESULT.REJECTED && !auditForm.rejectReason.trim()) {
    auditError.value = '拒绝时请填写原因'
    return
  }
  auditing.value = true
  auditError.value = ''
  try {
    await adminDistributorApplicationApi.audit(applicationId, {
      auditResult: auditForm.auditResult,
      rejectReason:
        auditForm.auditResult === AUDIT_RESULT.REJECTED
          ? auditForm.rejectReason.trim()
          : undefined
    })
    closeAudit()
    await load(page.value)
  } catch (e) {
    auditError.value = formatApiError(e, '审核提交失败')
  } finally {
    auditing.value = false
  }
}

onMounted(async () => {
  await loadPropertyCompanies()
  await load(1)
})
</script>

<style scoped>
.page { max-width: 1200px; }
.header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 16px; }
.title { font-size: 24px; font-weight: 600; color: #1f1f2e; margin-bottom: 8px; }
.desc { font-size: 14px; color: #8c8c9a; line-height: 1.7; }
.toolbar { display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
.input { padding: 8px 12px; border: 1px solid #e8e8ec; border-radius: 8px; min-width: 180px; font: inherit; font-size: 14px; }
.btnPrimary { padding: 10px 18px; border-radius: 8px; background: #5c5c9e; color: #fff; border: none; cursor: pointer; }
.btnPrimary:hover { background: #52529a; }
.btnPrimary:disabled { opacity: 0.6; cursor: not-allowed; }
.btnGhost { padding: 8px 14px; border-radius: 8px; border: 1px solid #e8e8ec; background: #fff; cursor: pointer; }
.panel { background: #fff; border-radius: 12px; padding: 16px; }
.table { width: 100%; border-collapse: collapse; }
.table th, .table td { padding: 10px 8px; border-bottom: 1px solid #f0f0f3; text-align: left; font-size: 14px; }
.remarkCell { max-width: 220px; white-space: normal; word-break: break-all; color: #5c5c66; }
.sub { font-size: 12px; color: #8c8c9a; margin-top: 2px; }
.statusTag { font-size: 12px; }
.statusTag.pending { color: #b76a00; }
.statusTag.approved { color: #2e7d32; }
.statusTag.rejected { color: #c94a4a; }
.statusTag.none { color: #8c8c9a; }
.statusTag.unknown { color: #8c8c9a; }
.muted { color: #8c8c9a; font-size: 13px; }
.empty, .loading, .error { padding: 24px; color: #8c8c9a; }
.error { color: #c94a4a; }
.retryBtn { margin-left: 8px; padding: 4px 10px; border-radius: 6px; border: 1px solid #e8e8ec; background: #fff; cursor: pointer; color: #5c5c66; }
.pager { display: flex; gap: 12px; align-items: center; justify-content: center; margin-top: 16px; }
.actions { white-space: nowrap; }
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
.callout { padding: 10px 12px; border-radius: 8px; background: #f4f1fd; color: #5c5c9e; font-size: 13px; line-height: 1.6; }
.summary { padding: 12px 14px; border-radius: 8px; background: #fafafc; }
.summary div { display: flex; justify-content: space-between; gap: 16px; padding: 4px 0; }
.summary span { color: #8c8c9a; }
.summary strong { font-weight: 500; text-align: right; }
</style>
