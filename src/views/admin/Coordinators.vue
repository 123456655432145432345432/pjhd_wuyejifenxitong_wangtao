<template>
  <div class="page">
    <div class="header">
      <div>
        <h1 class="title">统筹人员</h1>
        <p class="desc">
          将已有住户指派为统筹负责人。分成比例在「参数配置 → 分账」的管理盘中设置，本页不改费率。
        </p>
      </div>
      <button class="btnPrimary" @click="openCreate">指派统筹</button>
    </div>

    <div class="toolbar">
      <select
        v-if="isPlatformAdmin"
        v-model="filterPropertyId"
        class="input"
        @change="reload"
      >
        <option value="">全部物业公司</option>
        <option v-for="pc in propertyCompanies" :key="pc.id" :value="pc.id">
          {{ pc.name || pc.id }}
        </option>
      </select>
      <input
        v-model="keyword"
        class="input"
        placeholder="搜索姓名/手机号"
        @keyup.enter="reload"
      />
      <select v-model="statusFilter" class="input" @change="reload">
        <option v-for="opt in statusOptions" :key="opt.value || 'all'" :value="opt.value">
          {{ opt.label }}
        </option>
      </select>
      <button class="btnPrimary" :disabled="loading" @click="reload">搜索</button>
    </div>

    <div class="panel">
      <div v-if="loading" class="loading">加载中...</div>
      <p v-else-if="error" class="error">{{ error }}</p>
      <table v-else-if="list.length" class="table">
        <thead>
          <tr>
            <th>负责人</th>
            <th v-if="isPlatformAdmin">物业公司</th>
            <th>板块数</th>
            <th>个体负责人</th>
            <th>商家数</th>
            <th>状态</th>
            <th>创建时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in list" :key="item.id">
            <td>
              <div>{{ item.residentName || '—' }}</div>
              <div class="sub">{{ item.residentPhone || item.phone || '' }}</div>
            </td>
            <td v-if="isPlatformAdmin">{{ item.propertyCompanyName || item.propertyCompanyId || '—' }}</td>
            <td>{{ item.sectorCount ?? item.sectorLeaderCount ?? '—' }}</td>
            <td>{{ item.individualLeaderCount ?? '—' }}</td>
            <td>{{ item.merchantCount ?? 0 }}</td>
            <td>
              <span class="statusTag" :class="item.status">{{ statusLabel(item.status) }}</span>
            </td>
            <td>{{ item.createdAt || item.appointedAt || '—' }}</td>
            <td class="actions">
              <button class="btnGhostSm" @click="openDetail(item.id)">详情</button>
              <button class="btnGhostSm" @click="openEdit(item)">编辑</button>
              <button
                v-if="item.status === ENTITY_STATUS.ACTIVE"
                class="btnDangerSm"
                :disabled="removingId === item.id"
                @click="removeItem(item)"
              >
                撤销
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else class="empty">暂无统筹人员。请先在「住户管理」创建账号，再在本页指派。</p>
    </div>

    <div v-if="totalPages > 1" class="pager">
      <button class="btnGhost" :disabled="page <= 1 || loading" @click="changePage(page - 1)">上一页</button>
      <span>{{ page }} / {{ totalPages }}</span>
      <button class="btnGhost" :disabled="page >= totalPages || loading" @click="changePage(page + 1)">下一页</button>
    </div>

    <Teleport to="body">
      <div v-if="detailOpen" class="modalOverlay" @click.self="closeDetail">
        <div class="modal">
          <div class="modalHeader">
            <h3 class="modalTitle">统筹详情</h3>
            <button class="modalClose" @click="closeDetail">&times;</button>
          </div>
          <div class="modalBody">
            <div v-if="detailLoading" class="loading">加载中...</div>
            <p v-else-if="detailError" class="error">{{ detailError }}</p>
            <ul v-else-if="detailData" class="detailList">
              <li><span>姓名</span><strong>{{ detailData.residentName || '—' }}</strong></li>
              <li><span>手机号</span><strong>{{ detailData.residentPhone || detailData.phone || '—' }}</strong></li>
              <li><span>物业公司</span><strong>{{ detailData.propertyCompanyName || detailData.propertyCompanyId || '—' }}</strong></li>
              <li><span>说明</span><strong>{{ detailData.description || '—' }}</strong></li>
              <li><span>板块数</span><strong>{{ detailData.sectorCount ?? detailData.sectorLeaderCount ?? '—' }}</strong></li>
              <li><span>个体负责人</span><strong>{{ detailData.individualLeaderCount ?? '—' }}</strong></li>
              <li><span>商家数</span><strong>{{ detailData.merchantCount ?? 0 }}</strong></li>
              <li><span>累计收益</span><strong>{{ detailData.totalEarnings ?? '—' }}</strong></li>
              <li><span>状态</span><strong>{{ statusLabel(detailData.status) }}</strong></li>
              <li><span>任命时间</span><strong>{{ detailData.createdAt || detailData.appointedAt || '—' }}</strong></li>
            </ul>
          </div>
          <div class="modalFooter">
            <button class="btnGhost" @click="closeDetail">关闭</button>
          </div>
        </div>
      </div>

      <div v-if="formOpen" class="modalOverlay" @click.self="closeForm">
        <div class="modal">
          <div class="modalHeader">
            <h3 class="modalTitle">{{ editingId ? '编辑统筹' : '指派统筹' }}</h3>
            <button class="modalClose" @click="closeForm">&times;</button>
          </div>
          <div class="modalBody">
            <p v-if="formError" class="error">{{ formError }}</p>
            <template v-if="!editingId">
              <div v-if="isPlatformAdmin" class="field">
                <label class="label">物业公司 <em>*</em></label>
                <select v-model="form.propertyCompanyId" class="input">
                  <option value="">请选择物业公司</option>
                  <option v-for="pc in propertyCompanies" :key="pc.id" :value="pc.id">
                    {{ pc.name || pc.id }}
                  </option>
                </select>
              </div>
              <div class="field">
                <label class="label">选择业主 <em>*</em></label>
                <ResidentSearchSelect
                  v-model="form.residentId"
                  :status="RESIDENT_STATUS.ACTIVE"
                  auto-open
                />
              </div>
            </template>
            <div class="field">
              <label class="label">工作说明</label>
              <textarea v-model="form.description" class="textarea" rows="3" maxlength="200" />
            </div>
            <div v-if="editingId" class="field">
              <label class="label">状态</label>
              <select v-model="form.status" class="input">
                <option :value="ENTITY_STATUS.ACTIVE">启用</option>
                <option :value="ENTITY_STATUS.INACTIVE">停用</option>
              </select>
            </div>
          </div>
          <div class="modalFooter">
            <button class="btnGhost" @click="closeForm">取消</button>
            <button class="btnPrimary" :disabled="submitting" @click="submit">
              {{ submitting ? '提交中...' : '保存' }}
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
import { coordinatorAdminApi, propertyCompanyApi } from '../../api/services'
import type { CoordinatorDetail, PropertyCompanyItem } from '../../api/types'
import { ApiError } from '../../api/request'
import { useAuthStore } from '../../stores/auth'
import {
  ENTITY_STATUS,
  ENTITY_STATUS_LABEL,
  ENTITY_STATUS_OPTIONS,
  getEnumLabel,
  RESIDENT_STATUS,
  USER_ROLE
} from '../../constants/enums'

const auth = useAuthStore()
const isPlatformAdmin = computed(() => auth.profile?.role === USER_ROLE.PLATFORM_ADMIN)

const loading = ref(false)
const error = ref('')
const list = ref<CoordinatorDetail[]>([])
const keyword = ref('')
const statusFilter = ref('')
const filterPropertyId = ref('')
const page = ref(1)
const totalPages = ref(1)
const propertyCompanies = ref<PropertyCompanyItem[]>([])
const statusOptions = ENTITY_STATUS_OPTIONS

const formOpen = ref(false)
const editingId = ref('')
const submitting = ref(false)
const formError = ref('')
const removingId = ref('')
const form = reactive({
  residentId: '',
  propertyCompanyId: '',
  description: '',
  status: ENTITY_STATUS.ACTIVE
})

const detailOpen = ref(false)
const detailLoading = ref(false)
const detailError = ref('')
const detailData = ref<CoordinatorDetail | null>(null)

function statusLabel(status?: string) {
  return getEnumLabel(ENTITY_STATUS_LABEL, status, '—')
}

function pickStr(raw: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = raw[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  }
  return ''
}

function pickNum(raw: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = raw[key]
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) {
      return Number(value)
    }
  }
  return undefined
}

/** 兼容后端字段别名 / snake_case / 嵌套 resident，并用本地物业列表补全名称 */
function normalizeCoordinator(item: CoordinatorDetail | Record<string, unknown>): CoordinatorDetail {
  const raw = item as Record<string, unknown>
  const resident =
    raw.resident && typeof raw.resident === 'object'
      ? (raw.resident as Record<string, unknown>)
      : null
  const propertyCompanyId =
    pickStr(raw, 'propertyCompanyId', 'property_company_id') || undefined
  const fromCompanies = propertyCompanyId
    ? propertyCompanies.value.find((pc) => pc.id === propertyCompanyId)
    : undefined
  return {
    id: pickStr(raw, 'id') || (item as CoordinatorDetail).id,
    residentId:
      pickStr(raw, 'residentId', 'resident_id') ||
      (resident ? pickStr(resident, 'id', 'residentId') : '') ||
      undefined,
    residentName:
      pickStr(raw, 'residentName', 'resident_name', 'name') ||
      (resident ? pickStr(resident, 'name', 'residentName') : '') ||
      undefined,
    residentPhone:
      pickStr(raw, 'residentPhone', 'resident_phone', 'phone') ||
      (resident ? pickStr(resident, 'phone', 'residentPhone') : '') ||
      undefined,
    phone: pickStr(raw, 'phone') || undefined,
    propertyCompanyId,
    propertyCompanyName:
      pickStr(raw, 'propertyCompanyName', 'property_company_name', 'propertyCompany') ||
      fromCompanies?.name ||
      undefined,
    description: pickStr(raw, 'description') || undefined,
    sectorCount: pickNum(raw, 'sectorCount', 'sector_count', 'sectorLeaderCount', 'sector_leader_count'),
    sectorLeaderCount: pickNum(raw, 'sectorLeaderCount', 'sector_leader_count'),
    merchantCount: pickNum(raw, 'merchantCount', 'merchant_count'),
    individualLeaderCount: pickNum(
      raw,
      'individualLeaderCount',
      'individual_leader_count'
    ),
    commissionRate: pickNum(raw, 'commissionRate', 'commission_rate'),
    totalEarnings: pickNum(raw, 'totalEarnings', 'total_earnings'),
    status: pickStr(raw, 'status') || undefined,
    // v8.1：createdAt 与 appointedAt 同义
    createdAt:
      pickStr(raw, 'createdAt', 'created_at', 'appointedAt', 'appointed_at') || undefined,
    appointedAt: pickStr(raw, 'appointedAt', 'appointed_at') || undefined,
    updatedAt: pickStr(raw, 'updatedAt', 'updated_at') || undefined
  }
}

async function loadCompanies() {
  if (!isPlatformAdmin.value) return
  try {
    const res = await propertyCompanyApi.list({ page: 1, pageSize: 100, status: ENTITY_STATUS.ACTIVE }, true)
    propertyCompanies.value = res.list || []
  } catch {
    propertyCompanies.value = []
  }
}

async function load(pageNo = 1) {
  loading.value = true
  error.value = ''
  try {
    const res = await coordinatorAdminApi.list({
      page: pageNo,
      pageSize: 20,
      keyword: keyword.value.trim() || undefined,
      status: statusFilter.value || undefined,
      propertyCompanyId: isPlatformAdmin.value ? filterPropertyId.value || undefined : undefined,
      sort: '-createdAt'
    })
    list.value = (res.list || []).map((item) => normalizeCoordinator(item))
    page.value = res.pagination?.page || pageNo
    totalPages.value = res.pagination?.totalPages || 1
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '统筹列表加载失败'
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

function openCreate() {
  editingId.value = ''
  form.residentId = ''
  form.propertyCompanyId = auth.propertyCompanyId || ''
  form.description = ''
  form.status = ENTITY_STATUS.ACTIVE
  formError.value = ''
  formOpen.value = true
}

function openEdit(item: CoordinatorDetail) {
  editingId.value = item.id
  form.description = item.description || ''
  form.status = item.status || ENTITY_STATUS.ACTIVE
  formError.value = ''
  formOpen.value = true
}

function closeForm() {
  formOpen.value = false
  submitting.value = false
}

async function submit() {
  formError.value = ''
  if (editingId.value) {
    submitting.value = true
    try {
      await coordinatorAdminApi.update(editingId.value, {
        description: form.description.trim() || undefined,
        status: form.status
      })
      closeForm()
      await load(page.value)
    } catch (e) {
      formError.value = e instanceof ApiError ? e.message : '保存失败'
    } finally {
      submitting.value = false
    }
    return
  }
  const propertyCompanyId = isPlatformAdmin.value
    ? form.propertyCompanyId
    : auth.propertyCompanyId || auth.profile?.propertyCompanyId || ''
  if (!form.residentId) {
    formError.value = '请选择业主'
    return
  }
  if (!propertyCompanyId) {
    formError.value = isPlatformAdmin.value ? '请选择物业公司' : '当前账号未绑定物业公司'
    return
  }
  submitting.value = true
  try {
    await coordinatorAdminApi.create({
      residentId: form.residentId,
      propertyCompanyId,
      description: form.description.trim() || undefined
    })
    closeForm()
    await load(1)
  } catch (e) {
    formError.value = e instanceof ApiError ? e.message : '指派失败'
  } finally {
    submitting.value = false
  }
}

async function openDetail(id: string) {
  detailOpen.value = true
  detailLoading.value = true
  detailError.value = ''
  detailData.value = null
  try {
    detailData.value = normalizeCoordinator(await coordinatorAdminApi.get(id))
  } catch (e) {
    detailError.value = e instanceof ApiError ? e.message : '详情加载失败'
  } finally {
    detailLoading.value = false
  }
}

function closeDetail() {
  detailOpen.value = false
}

async function removeItem(item: CoordinatorDetail) {
  if (!confirm(`确认撤销统筹「${item.residentName || item.id}」？`)) return
  removingId.value = item.id
  try {
    await coordinatorAdminApi.remove(item.id)
    await load(page.value)
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '撤销失败'
  } finally {
    removingId.value = ''
  }
}

onMounted(async () => {
  await loadCompanies()
  await load(1)
})
</script>

<style scoped>
.page { max-width: 1200px; }
.header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 24px; }
.title { font-size: 24px; font-weight: 600; color: #1f1f2e; margin-bottom: 8px; }
.desc { font-size: 14px; color: #8c8c9a; }
.toolbar { display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
.input { padding: 8px 12px; border: 1px solid #e8e8ec; border-radius: 8px; min-width: 180px; }
.btnPrimary { padding: 10px 18px; border-radius: 8px; background: #5c5c9e; color: #fff; border: none; cursor: pointer; }
.btnPrimary:hover { background: #52529a; }
.panel { background: #fff; border-radius: 12px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); overflow-x: auto; }
.table { width: 100%; border-collapse: collapse; font-size: 14px; min-width: 880px; }
.table th, .table td { padding: 12px 10px; border-bottom: 1px solid #f0f0f3; text-align: left; }
.table th { color: #8c8c9a; font-weight: 500; }
.sub { font-size: 12px; color: #8c8c9a; margin-top: 2px; }
.statusTag { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; }
.statusTag.active { background: #e6f7ef; color: #389e6d; }
.statusTag.inactive { background: #f5f5f5; color: #8c8c9a; }
.actions { display: flex; gap: 8px; flex-wrap: wrap; }
.btnGhostSm { padding: 6px 12px; border-radius: 6px; border: 1px solid #e8e8ec; background: #fff; color: #5c5c66; cursor: pointer; font-size: 13px; }
.btnGhostSm:hover { border-color: #5c5c9e; color: #5c5c9e; }
.btnDangerSm { padding: 6px 12px; border-radius: 6px; border: 1px solid #ffa39e; background: #fff1f0; color: #cf1322; cursor: pointer; font-size: 13px; }
.loading, .empty, .error { font-size: 14px; color: #8c8c9a; padding: 12px 0; }
.error { color: #e05c5c; }
.pager { display: flex; align-items: center; gap: 12px; margin-top: 16px; font-size: 14px; }
.btnGhost { padding: 8px 14px; border-radius: 8px; border: 1px solid #e8e8ec; background: #fff; color: #5c5c66; font-size: 14px; cursor: pointer; }
.modalOverlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal { width: 480px; max-width: calc(100vw - 32px); background: #fff; border-radius: 12px; overflow: hidden; }
.modalHeader { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid #f0f0f3; }
.modalTitle { font-size: 16px; font-weight: 600; }
.modalClose { border: none; background: none; font-size: 22px; cursor: pointer; color: #8c8c9a; }
.modalBody { padding: 20px; max-height: 70vh; overflow-y: auto; }
.modalFooter { display: flex; justify-content: flex-end; gap: 10px; padding: 16px 20px; border-top: 1px solid #f0f0f3; }
.field { margin-bottom: 14px; }
.label { display: block; font-size: 13px; color: #8c8c9a; margin-bottom: 6px; }
.label em { color: #e05c5c; font-style: normal; }
.textarea { width: 100%; padding: 8px 12px; border: 1px solid #e8e8ec; border-radius: 8px; resize: vertical; box-sizing: border-box; }
.detailList { list-style: none; margin: 0; padding: 0; }
.detailList li { display: flex; justify-content: space-between; gap: 16px; padding: 10px 0; border-bottom: 1px solid #f0f0f3; font-size: 14px; }
.detailList span { color: #8c8c9a; }
.detailList strong { color: #1f1f2e; text-align: right; font-weight: 500; }
</style>
