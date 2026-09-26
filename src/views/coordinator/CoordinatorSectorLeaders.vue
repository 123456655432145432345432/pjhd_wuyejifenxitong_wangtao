<template>
  <div class="page" :class="{ mobilePage: isMobile }">
    <div class="header">
      <div>
        <h1 class="title">板块管理</h1>
        <p class="desc">
          管理本人名下板块负责人（需具备板块管理权限；操作非本人名下记录会被拒绝）。
          若提示「只能操作本人名下」，请物业/平台在编辑时补挂统筹。
        </p>
      </div>
      <button class="btnPrimary" @click="openCreate">新增板块负责人</button>
      <button class="btnSecondary" @click="openIndividualCreate">新增个体负责人</button>
      <button class="btnSecondary" @click="openMerchantCreate">新增商户</button>
    </div>

    <div class="toolbar">
      <input v-model="keyword" class="input" placeholder="搜索姓名/手机号" @keyup.enter="reload" />
      <select v-model="sectorFilter" class="input" @change="reload">
        <option value="">全部板块</option>
        <option v-for="opt in sectorOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
      </select>
      <select v-model="statusFilter" class="input" @change="reload">
        <option v-for="opt in statusOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
      </select>
      <button class="btnPrimary" :disabled="loading" @click="reload">搜索</button>
    </div>

    <div class="panel">
      <div v-if="loading" class="loading">加载中...</div>
      <p v-else-if="error" class="error">{{ error }}</p>
      <table v-else-if="leaders.length" class="table" :class="{ mobileCards: isMobile }">
        <thead>
          <tr>
            <th>负责人</th>
            <th>板块</th>
            <th>个体负责人</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in leaders" :key="item.id">
            <td>
              <div>{{ item.residentName || '—' }}</div>
              <div class="sub">{{ item.residentPhone || '' }}</div>
            </td>
            <td>{{ item.sectorName || getEnumLabel(SECTOR_TYPE_LABEL, item.sector) }}</td>
            <td>{{ item.individualLeaderCount ?? '—' }}</td>
            <td>
              <span class="statusTag" :class="item.status">{{ item.statusLabel || statusLabel(item.status) }}</span>
            </td>
            <td class="actions">
              <button class="btnGhostSm" @click="openEdit(item)">编辑</button>
              <button
                v-if="item.status === ENTITY_STATUS.ACTIVE"
                class="btnDangerSm"
                :disabled="removingId === item.id"
                @click="removeLeader(item)"
              >
                停用
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else class="empty">暂无板块负责人</p>
    </div>

    <div v-if="totalPages > 1" class="pager">
      <button class="btnGhost" :disabled="page <= 1 || loading" @click="changePage(page - 1)">上一页</button>
      <span>{{ page }} / {{ totalPages }}</span>
      <button class="btnGhost" :disabled="page >= totalPages || loading" @click="changePage(page + 1)">下一页</button>
    </div>

    <Teleport to="body">
      <div v-if="modalOpen" class="modalOverlay" @click.self="closeModal">
        <div class="modal" :class="{ mobileSheet: isMobile }">
          <div class="modalHeader">
            <h3 class="modalTitle">{{ editingId ? '编辑板块负责人' : '新增板块负责人' }}</h3>
            <button class="modalClose" @click="closeModal">&times;</button>
          </div>
          <div class="modalBody">
            <p v-if="formError" class="error">{{ formError }}</p>
            <div v-if="!editingId" class="field">
              <label class="label">选择业主 <em>*</em></label>
              <ResidentSearchSelect
                v-model="form.residentId"
                :status="RESIDENT_STATUS.ACTIVE"
                auto-open
              />
            </div>
            <div class="field">
              <label class="label">负责板块<em>*</em></label>
              <select v-model="form.sector" class="input">
                <option v-for="opt in sectorOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
            </div>
            <div v-if="!editingId" class="field">
              <label class="label">分成比例（0~1）</label>
              <input
                v-model.number="form.commissionRate"
                type="number"
                min="0"
                max="1"
                step="0.01"
                class="input"
                placeholder="可选，如 0.3 表示 30%"
              />
            </div>
            <div class="field">
              <label class="label">工作说明</label>
              <textarea
                v-model="form.description"
                class="textarea"
                rows="3"
                maxlength="200"
                placeholder="最多 200 字"
              />
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
            <button class="btnGhost" @click="closeModal">取消</button>
            <button class="btnPrimary" :disabled="submitting" @click="submit">
              {{ submitting ? '提交中...' : '保存' }}
            </button>
          </div>
        </div>
      </div>

      <div v-if="individualModalOpen" class="modalOverlay" @click.self="closeIndividualModal">
        <div class="modal" :class="{ mobileSheet: isMobile }">
          <div class="modalHeader">
            <h3 class="modalTitle">新增个体负责人</h3>
            <button class="modalClose" @click="closeIndividualModal">&times;</button>
          </div>
          <div class="modalBody">
            <p v-if="individualFormError" class="error">{{ individualFormError }}</p>
            <div class="field">
              <label class="label">选择业主 <em>*</em></label>
              <ResidentSearchSelect
                v-model="individualForm.residentId"
                :status="RESIDENT_STATUS.ACTIVE"
                auto-open
              />
            </div>
            <div class="field">
              <label class="label">所属板块负责人 <em>*</em></label>
              <select v-model="individualForm.sectorLeaderId" class="input" @change="onIndividualSectorLeaderChange">
                <option value="">请选择板块负责人</option>
                <option v-for="item in leaders" :key="item.id" :value="item.id">
                  {{ item.residentName || item.id }} · {{ getEnumLabel(SECTOR_TYPE_LABEL, item.sector) }}
                </option>
              </select>
            </div>
            <div class="field">
              <label class="label">所属板块 <em>*</em></label>
              <input
                class="input"
                :value="getEnumLabel(SECTOR_TYPE_LABEL, individualForm.sector) || '请先选择板块负责人'"
                disabled
              />
            </div>
            <div class="field">
              <label class="label">姓名</label>
              <input v-model="individualForm.name" class="input" maxlength="50" />
            </div>
            <div class="field">
              <label class="label">分成比例（0~1）</label>
              <input v-model.number="individualForm.commissionRate" type="number" min="0" max="1" step="0.01" class="input" />
            </div>
          </div>
          <div class="modalFooter">
            <button class="btnGhost" @click="closeIndividualModal">取消</button>
            <button class="btnPrimary" :disabled="individualSubmitting" @click="submitIndividual">
              {{ individualSubmitting ? '提交中...' : '保存' }}
            </button>
          </div>
        </div>
      </div>

      <div v-if="merchantModalOpen" class="modalOverlay" @click.self="closeMerchantModal">
        <div class="modal" :class="{ mobileSheet: isMobile }">
          <div class="modalHeader">
            <h3 class="modalTitle">新增商户</h3>
            <button class="modalClose" @click="closeMerchantModal">&times;</button>
          </div>
          <div class="modalBody">
            <p v-if="merchantFormError" class="error">{{ merchantFormError }}</p>
            <div class="field">
              <label class="label">平台商家编号 <em>*</em></label>
              <input v-model="merchantForm.platformMerchantId" class="input" placeholder="平台商家编号，如 pm_xxx" />
            </div>
            <div class="field">
              <label class="label">商家名称 <em>*</em></label>
              <input v-model="merchantForm.name" class="input" maxlength="100" />
            </div>
            <div class="field">
              <label class="label">分类 <em>*</em></label>
              <input v-model="merchantForm.category" class="input" maxlength="50" placeholder="如：外卖" />
            </div>
            <div class="field">
              <label class="label">联系电话 <em>*</em></label>
              <input v-model="merchantForm.contactPhone" class="input" maxlength="20" />
            </div>
          </div>
          <div class="modalFooter">
            <button class="btnGhost" @click="closeMerchantModal">取消</button>
            <button class="btnPrimary" :disabled="merchantSubmitting" @click="submitMerchant">
              {{ merchantSubmitting ? '提交中...' : '保存' }}
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
import { coordinatorPortalApi, coordinatorManageApi, sectorLeaderAdminApi } from '../../api/services'
import type { SectorLeaderDetail } from '../../api/types'
import { ApiError, formatApiError } from '../../api/request'
import {
  ENTITY_STATUS,
  ENTITY_STATUS_LABEL,
  ENTITY_STATUS_OPTIONS,
  getEnumLabel,
  RESIDENT_STATUS,
  SECTOR_TYPE,
  SECTOR_TYPE_LABEL,
  SECTOR_TYPE_OPTIONS,
  normalizeSectorType
} from '../../constants/enums'
import { useCoordinatorPortalStore } from '../../stores/coordinatorPortal'
import { useIsMobile } from '../../composables/useIsMobile'

const portal = useCoordinatorPortalStore()
const { isMobile } = useIsMobile()
const leaders = ref<SectorLeaderDetail[]>([])
const loading = ref(false)
const error = ref('')
const keyword = ref('')
const sectorFilter = ref('')
const statusFilter = ref('')
const page = ref(1)
const totalPages = ref(1)
const modalOpen = ref(false)
const editingId = ref('')
const submitting = ref(false)
const formError = ref('')
const removingId = ref('')
const individualModalOpen = ref(false)
const individualSubmitting = ref(false)
const individualFormError = ref('')
const merchantModalOpen = ref(false)
const merchantSubmitting = ref(false)
const merchantFormError = ref('')

const individualForm = reactive({
  residentId: '',
  sectorLeaderId: '',
  sector: '' as string,
  name: '',
  commissionRate: undefined as number | undefined
})

const merchantForm = reactive({
  platformMerchantId: '',
  name: '',
  category: '',
  contactPhone: ''
})

const statusOptions = ENTITY_STATUS_OPTIONS
const sectorOptions = SECTOR_TYPE_OPTIONS

const form = reactive({
  residentId: '',
  sector: SECTOR_TYPE.CLEANING,
  description: '',
  status: ENTITY_STATUS.ACTIVE,
  commissionRate: undefined as number | undefined
})

const coordinatorId = computed(() => portal.detail?.id || '')

function statusLabel(status?: string) {
  return getEnumLabel(ENTITY_STATUS_LABEL, status, '—')
}

async function ensurePortal() {
  if (!portal.detail) await portal.loadMy()
}

async function load(pageNo = 1) {
  loading.value = true
  error.value = ''
  try {
    await ensurePortal()
    const res = await sectorLeaderAdminApi.list({
      page: pageNo,
      pageSize: 20,
      keyword: keyword.value.trim() || undefined,
      sector: sectorFilter.value || undefined,
      status: statusFilter.value || undefined,
      sort: '-createdAt'
    })
    leaders.value = res.list || []
    page.value = res.pagination?.page || pageNo
    totalPages.value = res.pagination?.totalPages || 1
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '板块负责人列表加载失败'
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

function resetForm() {
  editingId.value = ''
  form.residentId = ''
  form.sector = SECTOR_TYPE.CLEANING
  form.description = ''
  form.status = ENTITY_STATUS.ACTIVE
  form.commissionRate = undefined
  formError.value = ''
}

function openCreate() {
  resetForm()
  modalOpen.value = true
}

function openEdit(item: SectorLeaderDetail) {
  editingId.value = item.id
  form.residentId = item.residentId || ''
  form.sector = normalizeSectorType(item.sector || item.sectorName, SECTOR_TYPE.CLEANING)
  form.description = item.description || ''
  form.status = item.status || ENTITY_STATUS.ACTIVE
  formError.value = ''
  modalOpen.value = true
}

function closeModal() {
  modalOpen.value = false
  submitting.value = false
}

async function submit() {
  if (!editingId.value && !form.residentId) {
    formError.value = '请选择业主'
    return
  }
  if (!coordinatorId.value && !editingId.value) {
    formError.value = '统筹信息未加载，请刷新后重试'
    return
  }
  submitting.value = true
  formError.value = ''
  try {
    const sector = normalizeSectorType(form.sector, SECTOR_TYPE.CLEANING)
    if (!Object.values(SECTOR_TYPE).includes(sector as (typeof SECTOR_TYPE)[keyof typeof SECTOR_TYPE])) {
      formError.value = `板块不合法，请选择：保洁/维修/安保/绿化/其他（当前：${form.sector || '空'}）`
      submitting.value = false
      return
    }
    if (editingId.value) {
      await coordinatorPortalApi.updateSectorLeader(editingId.value, {
        sector,
        description: form.description.trim() || undefined,
        status: form.status
      })
    } else {
      await coordinatorManageApi.createSectorLeader(coordinatorId.value, {
        residentId: form.residentId,
        sector,
        commissionRate:
          form.commissionRate === undefined || form.commissionRate === null || Number.isNaN(Number(form.commissionRate))
            ? undefined
            : Number(form.commissionRate)
      })
    }
    closeModal()
    await load(page.value)
  } catch (e) {
    formError.value =
      e instanceof ApiError
        ? e.message.includes('板块') || e.message.includes('sector')
          ? `${e.message}（若改非保洁失败，多为同物业该板块已有其他负责人，见对接文档）`
          : e.message
        : '保存失败，请确认是否有板块管理权限'
  } finally {
    submitting.value = false
  }
}

async function removeLeader(item: SectorLeaderDetail) {
  if (!confirm(`确认停用板块负责人「${item.residentName || item.id}」？`)) return
  removingId.value = item.id
  try {
    await coordinatorPortalApi.removeSectorLeader(item.id)
    await load(page.value)
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '停用失败'
  } finally {
    removingId.value = ''
  }
}

function openIndividualCreate() {
  individualForm.residentId = ''
  individualForm.sectorLeaderId = ''
  individualForm.sector = ''
  individualForm.name = ''
  individualForm.commissionRate = undefined
  individualFormError.value = ''
  individualModalOpen.value = true
}

function onIndividualSectorLeaderChange() {
  const selected = leaders.value.find((item) => item.id === individualForm.sectorLeaderId)
  individualForm.sector = selected?.sector || ''
}

function closeIndividualModal() {
  individualModalOpen.value = false
  individualSubmitting.value = false
}

async function submitIndividual() {
  if (!individualForm.residentId) {
    individualFormError.value = '请选择业主'
    return
  }
  if (!individualForm.sectorLeaderId) {
    individualFormError.value = '请选择板块负责人'
    return
  }
  if (!individualForm.sector) {
    individualFormError.value = '板块信息缺失，请重新选择板块负责人'
    return
  }
  if (!coordinatorId.value) {
    individualFormError.value = '统筹信息未加载，请刷新后重试'
    return
  }
  individualSubmitting.value = true
  individualFormError.value = ''
  try {
    // 统筹走工作台接口，勿调 POST /admin/individual-leaders（需 individual.manage）
    await coordinatorManageApi.createIndividualLeader(coordinatorId.value, {
      residentId: individualForm.residentId,
      sectorLeaderId: individualForm.sectorLeaderId,
      sector: individualForm.sector,
      name: individualForm.name.trim() || undefined,
      commissionRate: individualForm.commissionRate
    })
    closeIndividualModal()
    await load(page.value)
  } catch (e) {
    individualFormError.value = formatApiError(e, '创建失败')
  } finally {
    individualSubmitting.value = false
  }
}

function openMerchantCreate() {
  merchantForm.platformMerchantId = ''
  merchantForm.name = ''
  merchantForm.category = ''
  merchantForm.contactPhone = ''
  merchantFormError.value = ''
  merchantModalOpen.value = true
}

function closeMerchantModal() {
  merchantModalOpen.value = false
  merchantSubmitting.value = false
}

async function submitMerchant() {
  if (!merchantForm.platformMerchantId.trim() || !merchantForm.name.trim() || !merchantForm.category.trim() || !merchantForm.contactPhone.trim()) {
    merchantFormError.value = '请填写完整商户信息'
    return
  }
  if (!coordinatorId.value) {
    merchantFormError.value = '统筹信息未加载，请刷新后重试'
    return
  }
  merchantSubmitting.value = true
  merchantFormError.value = ''
  try {
    await coordinatorManageApi.createMerchant(coordinatorId.value, {
      platformMerchantId: merchantForm.platformMerchantId.trim(),
      name: merchantForm.name.trim(),
      category: merchantForm.category.trim(),
      contactPhone: merchantForm.contactPhone.trim()
    })
    closeMerchantModal()
  } catch (e) {
    merchantFormError.value = e instanceof ApiError ? e.message : '创建失败'
  } finally {
    merchantSubmitting.value = false
  }
}

onMounted(() => load(1))
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
.btnSecondary { padding: 10px 18px; border-radius: 8px; border: 1px solid #e8e8ec; background: #fff; color: #5c5c66; cursor: pointer; }
.btnSecondary:hover { border-color: #5c5c9e; color: #5c5c9e; }
.panel { background: #fff; border-radius: 12px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.table { width: 100%; border-collapse: collapse; font-size: 14px; }
.table th, .table td { padding: 12px 10px; border-bottom: 1px solid #f0f0f3; text-align: left; }
.table th { color: #8c8c9a; font-weight: 500; }
.sub { font-size: 12px; color: #8c8c9a; margin-top: 2px; }
.statusTag { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; }
.statusTag.active { background: #e6f7ef; color: #389e6d; }
.statusTag.inactive { background: #f5f5f5; color: #8c8c9a; }
.actions { display: flex; gap: 8px; }
.btnGhostSm { padding: 6px 12px; border-radius: 6px; border: 1px solid #e8e8ec; background: #fff; color: #5c5c66; cursor: pointer; font-size: 13px; }
.btnGhostSm:hover { border-color: #5c5c9e; color: #5c5c9e; }
.btnDangerSm { padding: 6px 12px; border-radius: 6px; border: 1px solid #ffa39e; background: #fff1f0; color: #cf1322; cursor: pointer; font-size: 13px; }
.loading, .empty, .error { font-size: 14px; color: #8c8c9a; padding: 12px 0; }
.error { color: #e05c5c; }
.pager { display: flex; align-items: center; gap: 12px; margin-top: 16px; font-size: 14px; }
.btnGhost { padding: 8px 14px; border-radius: 8px; border: 1px solid #e8e8ec; background: #fff; color: #5c5c66; font-size: 14px; cursor: pointer; }
.btnGhost:hover { border-color: #5c5c9e; color: #5c5c9e; }
.modalOverlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal { width: 480px; max-width: calc(100vw - 32px); background: #fff; border-radius: 12px; overflow: hidden; }
.modalHeader { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid #f0f0f3; }
.modalTitle { font-size: 16px; font-weight: 600; }
.modalClose { border: none; background: none; font-size: 22px; cursor: pointer; color: #8c8c9a; }
.modalBody { padding: 20px; }
.modalFooter { display: flex; justify-content: flex-end; gap: 10px; padding: 16px 20px; border-top: 1px solid #f0f0f3; }
.field { margin-bottom: 14px; }
.label { display: block; font-size: 13px; color: #8c8c9a; margin-bottom: 6px; }
.label em { color: #e05c5c; font-style: normal; }
.textarea { width: 100%; padding: 8px 12px; border: 1px solid #e8e8ec; border-radius: 8px; resize: vertical; box-sizing: border-box; }
@media (max-width: 768px) {
  .page { max-width: none; }.header { flex-direction: column; margin-bottom: 16px; }.title { font-size: 21px; }.header .btnPrimary { width: 100%; }
  .toolbar { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }.toolbar .input { width: 100%; min-width: 0; box-sizing: border-box; }.toolbar .btnPrimary { grid-column: 1 / -1; width: 100%; }
  .panel { padding: 12px; border-radius: 14px; }.mobileCards thead { display: none; }.mobileCards, .mobileCards tbody, .mobileCards tr, .mobileCards td { display: block; width: 100%; }
  .mobileCards tr { padding: 12px 0; border-bottom: 1px solid #f0f0f3; }.mobileCards td { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 6px 0; text-align: right; }
  .mobileCards td::before { color: #8c8c9a; text-align: left; }.mobileCards td:nth-child(1)::before { content: '负责人'; }.mobileCards td:nth-child(2)::before { content: '板块'; }
  .mobileCards td:nth-child(3)::before { content: '个体负责人'; }.mobileCards td:nth-child(4)::before { content: '状态'; }.mobileCards td:nth-child(5)::before { content: '操作'; }
  .actions { justify-content: flex-end; }.pager { justify-content: center; }.modalOverlay { padding: 0; align-items: flex-end; }.modal.mobileSheet { max-width: 100%; border-radius: 18px 18px 0 0; }
}
</style>
