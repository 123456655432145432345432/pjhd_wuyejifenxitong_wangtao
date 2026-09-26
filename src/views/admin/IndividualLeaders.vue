<template>
  <div class="page">
    <div class="header">
      <div>
        <h1 class="title">一级代理</h1>
          <p class="desc">
            「已任命」可直接任命/撤销。「申请审核」走
            <code>GET /admin/individual-leaders/applications</code>（v8.2 已实现字面量路由）。
          </p>
      </div>
      <button class="btnPrimary" @click="openCreate">直接任命</button>
    </div>

    <div class="tabs">
      <button
        type="button"
        class="tab"
        :class="{ active: tab === 'applications' }"
        @click="switchTab('applications')"
      >
        申请审核
      </button>
      <button
        type="button"
        class="tab"
        :class="{ active: tab === 'appointed' }"
        @click="switchTab('appointed')"
      >
        已任命
      </button>
    </div>

    <div class="toolbar">
      <input
        v-model="keyword"
        class="input"
        placeholder="搜索姓名/手机号"
        @keyup.enter="reload"
      />
      <select v-if="tab === 'applications'" v-model="applicationStatus" class="input" @change="reload">
        <option
          v-for="opt in INDIVIDUAL_LEADER_APPLICATION_STATUS_OPTIONS"
          :key="opt.value || 'all'"
          :value="opt.value"
        >
          {{ opt.label }}
        </option>
      </select>
      <select v-if="tab === 'applications'" v-model="sectorFilter" class="input" @change="reload">
        <option value="">全部板块</option>
        <option v-for="opt in SECTOR_TYPE_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
      </select>
      <select v-else v-model="statusFilter" class="input" @change="reload">
        <option v-for="opt in statusOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
      </select>
      <button class="btnPrimary" :disabled="loading" @click="reload">搜索</button>
    </div>

    <div class="panel">
      <div v-if="loading" class="loading">加载中...</div>
      <p v-else-if="error" class="error">{{ error }}</p>

      <table v-else-if="tab === 'applications' && applications.length" class="table">
        <thead>
          <tr>
            <th>申请人</th>
            <th>申请板块</th>
            <th>备注</th>
            <th>状态</th>
            <th>申请时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in applications" :key="item.id">
            <td>
              <div>{{ item.residentName || item.residentId || '—' }}</div>
              <div class="sub">{{ item.residentPhone || item.phone || '' }}</div>
            </td>
            <td>{{ item.sectorName || getEnumLabel(SECTOR_TYPE_LABEL, item.sector) }}</td>
            <td>{{ item.remark || item.message || '—' }}</td>
            <td>
              <span class="statusTag" :class="item.status">{{ applicationStatusLabel(item.status) }}</span>
            </td>
            <td>{{ item.createdAt || '—' }}</td>
            <td class="actions">
              <button
                v-if="isIndividualLeaderApplicationPending(item.status)"
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

      <table v-else-if="tab === 'appointed' && leaders.length" class="table">
        <thead>
          <tr>
            <th>负责人</th>
            <th>板块</th>
            <th>物业公司</th>
            <th>分成</th>
            <th>状态</th>
            <th>任命时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in leaders" :key="item.id">
            <td>
              <div>{{ item.residentName || item.name || '—' }}</div>
              <div class="sub">{{ item.residentPhone || item.phone || '' }}</div>
            </td>
            <td>{{ item.sectorName || getEnumLabel(SECTOR_TYPE_LABEL, item.sector) }}</td>
            <td>{{ item.propertyCompanyName || item.propertyCompanyId || '—' }}</td>
            <td>{{ item.commissionRate != null ? `${Math.round(Number(item.commissionRate) * 10000) / 100}%` : '—' }}</td>
            <td>
              <span class="statusTag" :class="item.status">{{ statusLabel(item.status) }}</span>
            </td>
            <td>{{ item.appointedAt || item.createdAt || '—' }}</td>
            <td class="actions">
              <button
                v-if="item.status === ENTITY_STATUS.ACTIVE"
                class="btnDangerSm"
                :disabled="removingId === item.id"
                @click="removeLeader(item)"
              >
                撤销
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <p v-else class="empty">{{ emptyText }}</p>
    </div>

    <div v-if="totalPages > 1" class="pager">
      <button class="btnGhost" :disabled="page <= 1 || loading" @click="changePage(page - 1)">上一页</button>
      <span>{{ page }} / {{ totalPages }}</span>
      <button class="btnGhost" :disabled="page >= totalPages || loading" @click="changePage(page + 1)">下一页</button>
    </div>

    <Teleport to="body">
      <div v-if="formOpen" class="modalOverlay" @click.self="closeForm">
        <div class="modal">
          <div class="modalHeader">
            <h3 class="modalTitle">任命一级代理</h3>
            <button class="modalClose" @click="closeForm">&times;</button>
          </div>
          <div class="modalBody">
            <p v-if="formError" class="error">{{ formError }}</p>
            <div class="field">
              <label class="label">选择住户 <em>*</em></label>
              <ResidentSearchSelect
                v-model="form.residentId"
                :status="RESIDENT_STATUS.ACTIVE"
                auto-open
              />
            </div>
            <div class="field">
              <label class="label">所属板块负责人 <em>*</em></label>
              <select v-model="form.sectorLeaderId" class="input" @change="onSectorLeaderChange">
                <option value="">请选择板块负责人</option>
                <option v-for="item in sectorLeaders" :key="sectorLeaderRecordId(item)" :value="sectorLeaderRecordId(item)">
                  {{ item.residentName || item.id }} · {{ getEnumLabel(SECTOR_TYPE_LABEL, item.sector) }}
                </option>
              </select>
            </div>
            <div class="field">
              <label class="label">所属板块 <em>*</em></label>
              <input
                class="input"
                :value="getEnumLabel(SECTOR_TYPE_LABEL, form.sector) || '请先选择板块负责人'"
                disabled
              />
            </div>
            <div class="field">
              <label class="label">显示姓名</label>
              <input v-model="form.name" class="input" maxlength="50" placeholder="空则用住户姓名" />
            </div>
            <div class="field">
              <label class="label">分成比例（0~1）</label>
              <input v-model.number="form.commissionRate" type="number" min="0" max="1" step="0.01" class="input" />
            </div>
          </div>
          <div class="modalFooter">
            <button class="btnGhost" @click="closeForm">取消</button>
            <button class="btnPrimary" :disabled="submitting" @click="submit">
              {{ submitting ? '提交中...' : '任命' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="auditOpen" class="modalOverlay" @click.self="closeAudit">
        <div class="modal">
          <div class="modalHeader">
            <h3 class="modalTitle">审核一级代理申请</h3>
            <button class="modalClose" @click="closeAudit">&times;</button>
          </div>
          <div class="modalBody">
            <div class="summary">
              <div><span>申请人</span><strong>{{ auditTarget?.residentName || auditTarget?.residentId || '—' }}</strong></div>
              <div><span>手机</span><strong>{{ auditTarget?.residentPhone || auditTarget?.phone || '—' }}</strong></div>
              <div>
                <span>申请板块</span>
                <strong>{{ auditTarget?.sectorName || getEnumLabel(SECTOR_TYPE_LABEL, auditTarget?.sector) }}</strong>
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
            <template v-if="auditForm.auditResult === AUDIT_RESULT.APPROVED">
              <div class="field">
                <label class="label">所属板块负责人（可选，空则后端按板块自动挂）</label>
                <select v-model="auditForm.sectorLeaderId" class="input">
                  <option value="">不指定（后端按板块自动挂，可空）</option>
                  <option v-for="item in auditSectorLeaders" :key="sectorLeaderRecordId(item)" :value="sectorLeaderRecordId(item)">
                    {{ item.residentName || item.id }} · {{ getEnumLabel(SECTOR_TYPE_LABEL, item.sector) }}
                  </option>
                </select>
                <p v-if="!auditSectorLeaders.length" class="hint">暂无匹配该板块的负责人，请先在「板块负责人」中任命。</p>
              </div>
              <div class="field">
                <label class="label">显示姓名</label>
                <input v-model="auditForm.name" class="input" maxlength="50" placeholder="空则用住户姓名" />
              </div>
              <div class="field">
                <label class="label">分成比例（0~1）</label>
                <input v-model.number="auditForm.commissionRate" type="number" min="0" max="1" step="0.01" class="input" />
              </div>
              <div class="field">
                <label class="label">备注（选填）</label>
                <textarea v-model="auditForm.remark" class="input" rows="3" maxlength="200" />
              </div>
            </template>
            <div v-else class="field">
              <label class="label">拒绝原因 <em>*</em></label>
              <textarea v-model="auditForm.remark" class="input" rows="3" maxlength="200" placeholder="请填写拒绝原因" />
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
import ResidentSearchSelect from '../../components/ResidentSearchSelect.vue'
import { adminIndividualLeaderApi, sectorLeaderAdminApi } from '../../api/services'
import type {
  IndividualLeaderApplicationItem,
  IndividualLeaderItem,
  SectorLeaderDetail
} from '../../api/types'
import { ApiError, formatApiError } from '../../api/request'
import {
  AUDIT_RESULT,
  ENTITY_STATUS,
  ENTITY_STATUS_LABEL,
  ENTITY_STATUS_OPTIONS,
  getEnumLabel,
  INDIVIDUAL_LEADER_APPLICATION_STATUS,
  INDIVIDUAL_LEADER_APPLICATION_STATUS_LABEL,
  INDIVIDUAL_LEADER_APPLICATION_STATUS_OPTIONS,
  isIndividualLeaderApplicationPending,
  RESIDENT_STATUS,
  SECTOR_TYPE_LABEL,
  SECTOR_TYPE_OPTIONS
} from '../../constants/enums'

type TabKey = 'applications' | 'appointed'

/** 默认已任命：申请列表接口测服常未注册，避免首屏双请求报错 */
const tab = ref<TabKey>('appointed')
const leaders = ref<IndividualLeaderItem[]>([])
const applications = ref<IndividualLeaderApplicationItem[]>([])
const sectorLeaders = ref<SectorLeaderDetail[]>([])
const loading = ref(false)
const error = ref('')
const keyword = ref('')
const statusFilter = ref('')
const applicationStatus = ref(INDIVIDUAL_LEADER_APPLICATION_STATUS.PENDING)
const sectorFilter = ref('')
const page = ref(1)
const totalPages = ref(1)
const removingId = ref('')
const formOpen = ref(false)
const submitting = ref(false)
const formError = ref('')
const statusOptions = ENTITY_STATUS_OPTIONS
const auditOpen = ref(false)
const auditing = ref(false)
const auditError = ref('')
const auditTarget = ref<IndividualLeaderApplicationItem | null>(null)

const form = reactive({
  residentId: '',
  sectorLeaderId: '',
  sector: '',
  name: '',
  commissionRate: undefined as number | undefined
})

const auditForm = reactive({
  auditResult: AUDIT_RESULT.APPROVED as string,
  sectorLeaderId: '',
  name: '',
  commissionRate: undefined as number | undefined,
  remark: ''
})

const emptyText = computed(() => {
  if (tab.value === 'applications') return '暂无一级代理申请'
  return '暂无一级代理'
})

const auditSectorLeaders = computed(() => {
  const sector = auditTarget.value?.sector
  if (!sector) return sectorLeaders.value
  const matched = sectorLeaders.value.filter((item) => item.sector === sector)
  return matched.length ? matched : sectorLeaders.value
})

function statusLabel(status?: string) {
  return getEnumLabel(ENTITY_STATUS_LABEL, status, '—')
}

function applicationStatusLabel(status?: string) {
  return getEnumLabel(INDIVIDUAL_LEADER_APPLICATION_STATUS_LABEL, status, '—')
}

function switchTab(next: TabKey) {
  if (tab.value === next) return
  tab.value = next
  keyword.value = ''
  load(1)
}

async function load(targetPage = 1) {
  loading.value = true
  error.value = ''
  page.value = targetPage
  try {
    if (tab.value === 'applications') {
      const res = await adminIndividualLeaderApi.listApplications({
        page: targetPage,
        pageSize: 20,
        keyword: keyword.value.trim() || undefined,
        auditStatus: applicationStatus.value || undefined,
        sector: sectorFilter.value || undefined
      })
      applications.value = res.list || []
      totalPages.value = res.pagination?.totalPages || 1
      leaders.value = []
    } else {
      const res = await adminIndividualLeaderApi.list({
        page: targetPage,
        pageSize: 20,
        keyword: keyword.value.trim() || undefined,
        status: statusFilter.value || undefined,
        sort: '-createdAt'
      })
      leaders.value = res.list || []
      totalPages.value = res.pagination?.totalPages || 1
      applications.value = []
    }
  } catch (e) {
    error.value = formatApiError(
      e,
      tab.value === 'applications' ? '申请列表加载失败' : '加载失败'
    )
    if (
      tab.value === 'applications' &&
      (e instanceof ApiError && (e.code === 404 || e.code === 400) ||
        /NoResourceFoundException|NoHandlerFoundException|ID格式不正确|接口不存在|找不到/i.test(error.value))
    ) {
      error.value =
        '申请列表加载失败。请确认测服已部署最新接口；临时可用「已任命 → 直接任命」。'
    }
    leaders.value = []
    applications.value = []
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

async function loadSectorLeaders() {
  try {
    const res = await sectorLeaderAdminApi.list({
      page: 1,
      pageSize: 100,
      status: ENTITY_STATUS.ACTIVE,
      sort: '-createdAt'
    })
    sectorLeaders.value = res.list || []
  } catch {
    sectorLeaders.value = []
  }
}

function applicationRecordId(item: IndividualLeaderApplicationItem) {
  const candidates = [item.id].filter(Boolean) as string[]
  return candidates.find((value) => /^ila_/i.test(value)) || item.id
}

function sectorLeaderRecordId(item: SectorLeaderDetail) {
  const candidates = [item.id].filter(Boolean) as string[]
  return candidates.find((value) => /^sl_/i.test(value)) || item.id
}

function onSectorLeaderChange() {
  const selected = sectorLeaders.value.find((item) => sectorLeaderRecordId(item) === form.sectorLeaderId)
  form.sector = selected?.sector || ''
}

function openCreate() {
  form.residentId = ''
  form.sectorLeaderId = ''
  form.sector = ''
  form.name = ''
  form.commissionRate = undefined
  formError.value = ''
  formOpen.value = true
  loadSectorLeaders()
}

function closeForm() {
  formOpen.value = false
  submitting.value = false
}

async function submit() {
  if (!form.residentId) {
    formError.value = '请选择住户'
    return
  }
  if (!/^res_/i.test(form.residentId)) {
    formError.value = '住户编号格式不正确，请重新选择住户'
    return
  }
  if (!form.sectorLeaderId) {
    formError.value = '请选择板块负责人'
    return
  }
  if (!/^sl_/i.test(form.sectorLeaderId)) {
    formError.value = '请选择有效的板块负责人记录，不能用住户编号'
    return
  }
  if (!form.sector) {
    formError.value = '板块信息缺失，请重新选择板块负责人'
    return
  }
  submitting.value = true
  formError.value = ''
  try {
    await adminIndividualLeaderApi.create({
      residentId: form.residentId,
      sectorLeaderId: form.sectorLeaderId,
      sector: form.sector,
      name: form.name.trim() || undefined,
      commissionRate: form.commissionRate
    })
    closeForm()
    tab.value = 'appointed'
    await load(1)
  } catch (e) {
    formError.value = formatApiError(e, '任命失败')
  } finally {
    submitting.value = false
  }
}

async function removeLeader(item: IndividualLeaderItem) {
  if (!confirm(`确认撤销一级代理「${item.residentName || item.name || item.id}」？`)) return
  removingId.value = item.id
  error.value = ''
  try {
    await adminIndividualLeaderApi.remove(item.id, '管理端撤销')
    await load(page.value)
  } catch (e) {
    error.value = formatApiError(e, '撤销失败')
  } finally {
    removingId.value = ''
  }
}

async function openAudit(item: IndividualLeaderApplicationItem) {
  auditTarget.value = item
  auditForm.auditResult = AUDIT_RESULT.APPROVED
  auditForm.sectorLeaderId = ''
  auditForm.name = item.residentName || ''
  auditForm.commissionRate = undefined
  auditForm.remark = ''
  auditError.value = ''
  auditOpen.value = true
  await loadSectorLeaders()
  const matched = auditSectorLeaders.value
  if (matched.length === 1) {
    auditForm.sectorLeaderId = sectorLeaderRecordId(matched[0])
  }
}

function closeAudit() {
  auditOpen.value = false
  auditTarget.value = null
  auditError.value = ''
}

async function submitAudit() {
  if (!auditTarget.value || auditing.value) return
  const applicationId = applicationRecordId(auditTarget.value)
  if (!/^ila_/i.test(applicationId)) {
    auditError.value = `申请编号格式不正确（当前为「${applicationId || '空'}」），无法提交审核`
    return
  }
  if (auditForm.auditResult === AUDIT_RESULT.APPROVED && auditForm.sectorLeaderId && !/^sl_/i.test(auditForm.sectorLeaderId)) {
    auditError.value = '请选择有效的板块负责人记录，不能用住户编号'
    return
  }
  if (auditForm.auditResult === AUDIT_RESULT.REJECTED && !auditForm.remark.trim()) {
    auditError.value = '拒绝时请填写原因'
    return
  }
  auditing.value = true
  auditError.value = ''
  try {
    const selected = sectorLeaders.value.find(
      (item) => sectorLeaderRecordId(item) === auditForm.sectorLeaderId
    )
    await adminIndividualLeaderApi.auditApplication(applicationId, {
      auditResult: auditForm.auditResult,
      sectorLeaderId:
        auditForm.auditResult === AUDIT_RESULT.APPROVED && auditForm.sectorLeaderId
          ? auditForm.sectorLeaderId
          : undefined,
      sector:
        auditForm.auditResult === AUDIT_RESULT.APPROVED
          ? selected?.sector || auditTarget.value.sector
          : undefined,
      name: auditForm.name.trim() || undefined,
      commissionRate: auditForm.commissionRate,
      remark: auditForm.remark.trim() || undefined,
      rejectReason:
        auditForm.auditResult === AUDIT_RESULT.REJECTED ? auditForm.remark.trim() : undefined
    })
    closeAudit()
    await load(page.value)
  } catch (e) {
    auditError.value = formatApiError(e, '审核提交失败')
  } finally {
    auditing.value = false
  }
}

onMounted(() => load(1))
</script>

<style scoped>
.page { max-width: 1200px; }
.header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 16px; }
.title { font-size: 24px; font-weight: 600; color: #1f1f2e; margin-bottom: 8px; }
.desc { font-size: 14px; color: #8c8c9a; }
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
.panel { background: #fff; border-radius: 12px; padding: 16px; }
.table { width: 100%; border-collapse: collapse; }
.table th, .table td { padding: 10px 8px; border-bottom: 1px solid #f0f0f3; text-align: left; font-size: 14px; }
.sub { font-size: 12px; color: #8c8c9a; margin-top: 2px; }
.statusTag { font-size: 12px; }
.statusTag.active, .statusTag.approved { color: #2e7d32; }
.statusTag.inactive { color: #8c8c9a; }
.statusTag.pending, .statusTag.pending_audit { color: #b76a00; }
.statusTag.rejected { color: #c94a4a; }
.empty, .loading, .error { padding: 24px; color: #8c8c9a; }
.error { color: #c94a4a; }
.hint { margin: 0; font-size: 12px; color: #8c8c9a; }
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
