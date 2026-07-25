<template>
  <div class="page">
    <div class="header">
      <div>
        <h1 class="title">板块负责人管理</h1>
        <p class="desc">指派、维护板块负责人，关联统筹负责人与负责板块</p>
      </div>
      <button class="btnPrimary" @click="openCreate">指派板块负责人</button>
    </div>

    <div class="toolbar">
      <input
        v-model="keyword"
        class="input"
        placeholder="搜索姓名/手机号"
        @keyup.enter="reload"
      />
      <select v-model="statusFilter" class="input" @change="reload">
        <option v-for="opt in statusOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
      </select>
      <button class="btnPrimary" :disabled="loading" @click="reload">搜索</button>
    </div>

    <div class="panel">
      <div v-if="loading" class="loading">加载中...</div>
      <p v-else-if="error" class="error">{{ error }}</p>
      <table v-else-if="leaders.length" class="table">
        <thead>
          <tr>
            <th>负责人</th>
            <th>板块</th>
            <th>统筹负责人</th>
            <th>物业公司</th>
            <th>下级个体负责人</th>
            <th>状态</th>
            <th>创建时间</th>
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
            <td>{{ item.coordinatorName || '—' }}</td>
            <td>{{ item.propertyCompanyName || '—' }}</td>
            <td>{{ item.individualLeaderCount ?? '—' }}</td>
            <td>
              <span class="statusTag" :class="item.status">{{ statusLabel(item.status) }}</span>
            </td>
            <td>{{ item.createdAt || '—' }}</td>
            <td class="actions">
              <button class="btnGhostSm" @click="openDetail(item.id)">详情</button>
              <button class="btnGhostSm" @click="openEdit(item)">编辑</button>
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
      <p v-else class="empty">暂无板块负责人</p>
    </div>

    <div v-if="totalPages > 1" class="pager">
      <button class="btnGhost" :disabled="page <= 1 || loading" @click="changePage(page - 1)">上一页</button>
      <span>{{ page }} / {{ totalPages }}</span>
      <button class="btnGhost" :disabled="page >= totalPages || loading" @click="changePage(page + 1)">下一页</button>
    </div>

    <Teleport to="body">
      <div v-if="detailOpen" class="modalOverlay" @click.self="closeDetail">
        <div class="modal modalWide">
          <div class="modalHeader">
            <h3 class="modalTitle">板块负责人详情</h3>
            <button class="modalClose" @click="closeDetail">&times;</button>
          </div>
          <div class="modalBody">
            <div v-if="detailLoading" class="loading">加载中...</div>
            <p v-else-if="detailError" class="error">{{ detailError }}</p>
            <ul v-else-if="detailData" class="detailList">
              <li><span>负责人</span><strong>{{ detailData.residentName || '—' }}</strong></li>
              <li><span>手机号</span><strong>{{ detailData.residentPhone || detailData.phone || '—' }}</strong></li>
              <li><span>负责板块</span><strong>{{ detailData.sectorName || getEnumLabel(SECTOR_TYPE_LABEL, detailData.sector) }}</strong></li>
              <li><span>统筹负责人</span><strong>{{ detailData.coordinatorName || '—' }}</strong></li>
              <li><span>物业公司</span><strong>{{ detailData.propertyCompanyName || '—' }}</strong></li>
              <li><span>下级个体负责人</span><strong>{{ detailData.individualLeaderCount ?? '—' }} 人</strong></li>
              <li><span>板块商家</span><strong>{{ detailData.merchantCount ?? '—' }}</strong></li>
              <li><span>进行中特惠</span><strong>{{ detailData.activeSpecialOfferCount ?? '—' }}</strong></li>
              <li><span>累计收益</span><strong>¥{{ formatMoney(detailData.totalEarnings) }}</strong></li>
              <li><span>工作说明</span><strong>{{ detailData.description || '—' }}</strong></li>
              <li><span>状态</span><strong>{{ statusLabel(detailData.status) }}</strong></li>
              <li><span>创建时间</span><strong>{{ detailData.createdAt || '—' }}</strong></li>
              <li><span>更新时间</span><strong>{{ detailData.updatedAt || '—' }}</strong></li>
            </ul>
          </div>
          <div class="modalFooter">
            <button class="btnGhost" @click="closeDetail">关闭</button>
            <button v-if="detailData" class="btnPrimary" @click="openEditFromDetail">编辑</button>
          </div>
        </div>
      </div>

      <div v-if="formOpen" class="modalOverlay" @click.self="closeForm">
        <div class="modal modalWide">
          <div class="modalHeader">
            <h3 class="modalTitle">{{ editingId ? '编辑板块负责人' : '指派板块负责人' }}</h3>
            <button class="modalClose" @click="closeForm">&times;</button>
          </div>
          <div class="modalBody">
            <p v-if="formError" class="error">{{ formError }}</p>

            <template v-if="!editingId">
              <div class="field">
                <label class="label">选择业主 <em>*</em></label>
                <ResidentSearchSelect
                  v-model="form.residentId"
                  :status="RESIDENT_STATUS.ACTIVE"
                  auto-open
                />
              </div>
              <div class="field">
                <label class="label">统筹负责人 <em>*</em></label>
                <select v-model="form.coordinatorId" class="input" :disabled="coordinatorLoading">
                  <option value="">
                    {{ coordinatorLoading ? '加载统筹负责人中...' : '请选择统筹负责人' }}
                  </option>
                  <option v-for="c in coordinatorOptions" :key="c.id" :value="c.id">{{ c.name }}</option>
                </select>
                <p v-if="coordinatorLoadError" class="fieldHint error">{{ coordinatorLoadError }}</p>
                <p v-else-if="!coordinatorLoading && !coordinatorOptions.length" class="fieldHint error">
                  暂无可选统筹负责人
                </p>
              </div>
            </template>

            <div v-else class="field">
              <label class="label">统筹负责人</label>
              <select v-model="form.coordinatorId" class="input" :disabled="coordinatorLoading">
                <option value="">不修改</option>
                <option v-for="c in coordinatorOptions" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
            </div>

            <div class="field">
              <label class="label">负责板块 <em>*</em></label>
              <select v-model="form.sector" class="input">
                <option v-for="opt in sectorOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
              </select>
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
            <button class="btnGhost" @click="closeForm">取消</button>
            <button class="btnPrimary" :disabled="submitting" @click="submitForm">
              {{ submitting ? '提交中...' : editingId ? '保存' : '指派' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import ResidentSearchSelect from '../components/ResidentSearchSelect.vue'
import { distributionApi, sectorLeaderAdminApi } from '../api/services'
import type { SectorLeaderDetail } from '../api/types'
import { ApiError } from '../api/request'
import {
  ENTITY_STATUS,
  ENTITY_STATUS_OPTIONS,
  getEnumLabel,
  RESIDENT_STATUS,
  SECTOR_TYPE,
  SECTOR_TYPE_LABEL,
  SECTOR_TYPE_OPTIONS
} from '../constants/enums'

const leaders = ref<SectorLeaderDetail[]>([])
const loading = ref(false)
const error = ref('')
const keyword = ref('')
const statusFilter = ref('')
const page = ref(1)
const totalPages = ref(1)
const removingId = ref('')

const detailOpen = ref(false)
const detailLoading = ref(false)
const detailError = ref('')
const detailData = ref<SectorLeaderDetail | null>(null)
const detailId = ref('')

const formOpen = ref(false)
const editingId = ref('')
const submitting = ref(false)
const formError = ref('')

const coordinatorLoading = ref(false)
const coordinatorLoadError = ref('')
const coordinatorOptions = ref<Array<{ id: string; name: string }>>([])

const statusOptions = ENTITY_STATUS_OPTIONS
const sectorOptions = SECTOR_TYPE_OPTIONS

const form = reactive({
  residentId: '',
  coordinatorId: '',
  sector: SECTOR_TYPE.CLEANING,
  description: '',
  status: ENTITY_STATUS.ACTIVE
})

function statusLabel(status?: string) {
  return status === ENTITY_STATUS.ACTIVE
    ? '启用'
    : status === ENTITY_STATUS.INACTIVE
      ? '停用'
      : status || '—'
}

function formatMoney(value?: number) {
  if (value === undefined || value === null) return '0.00'
  return Number(value).toFixed(2)
}

async function loadCoordinatorOptions() {
  coordinatorLoading.value = true
  coordinatorLoadError.value = ''
  const map = new Map<string, string>()
  try {
    const res = await sectorLeaderAdminApi.list({ page: 1, pageSize: 100, sort: '-createdAt' })
    for (const item of res.list || []) {
      if (item.coordinatorId) {
        map.set(item.coordinatorId, item.coordinatorName || item.coordinatorId)
      }
    }
  } catch {
    /* ignore, try next source */
  }
  try {
    const stats = await distributionApi.stats()
    for (const item of stats.byCoordinator || []) {
      if (item.coordinatorId) {
        map.set(item.coordinatorId, item.name || item.coordinatorId)
      }
    }
  } catch (e) {
    if (!map.size) {
      coordinatorLoadError.value = e instanceof ApiError ? e.message : '统筹负责人加载失败'
    }
  }
  coordinatorOptions.value = Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  coordinatorLoading.value = false
}

async function load(pageNo = 1) {
  loading.value = true
  error.value = ''
  try {
    const res = await sectorLeaderAdminApi.list({
      page: pageNo,
      pageSize: 20,
      keyword: keyword.value.trim() || undefined,
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
  form.coordinatorId = ''
  form.sector = SECTOR_TYPE.CLEANING
  form.description = ''
  form.status = ENTITY_STATUS.ACTIVE
  formError.value = ''
}

function openCreate() {
  resetForm()
  formOpen.value = true
  if (!coordinatorOptions.value.length && !coordinatorLoading.value) {
    loadCoordinatorOptions()
  }
}

function openEdit(item: SectorLeaderDetail) {
  editingId.value = item.id
  form.residentId = item.residentId || ''
  form.coordinatorId = item.coordinatorId || ''
  form.sector = item.sector || SECTOR_TYPE.CLEANING
  form.description = item.description || ''
  form.status = item.status || ENTITY_STATUS.ACTIVE
  formError.value = ''
  formOpen.value = true
  if (!coordinatorOptions.value.length && !coordinatorLoading.value) {
    loadCoordinatorOptions()
  }
}

function openEditFromDetail() {
  if (!detailData.value) return
  closeDetail()
  openEdit(detailData.value)
}

function closeForm() {
  formOpen.value = false
  submitting.value = false
}

async function openDetail(id: string) {
  detailId.value = id
  detailOpen.value = true
  detailLoading.value = true
  detailError.value = ''
  detailData.value = null
  try {
    detailData.value = await sectorLeaderAdminApi.get(id)
  } catch (e) {
    detailError.value = e instanceof ApiError ? e.message : '详情加载失败'
  } finally {
    detailLoading.value = false
  }
}

function closeDetail() {
  detailOpen.value = false
  detailId.value = ''
}

async function submitForm() {
  if (!editingId.value) {
    if (!form.residentId) {
      formError.value = '请选择业主'
      return
    }
    if (!form.coordinatorId) {
      formError.value = '请选择统筹负责人'
      return
    }
  }
  if (!form.sector) {
    formError.value = '请选择负责板块'
    return
  }
  submitting.value = true
  formError.value = ''
  try {
    if (editingId.value) {
      const payload: {
        sector: string
        description?: string
        status?: string
        coordinatorId?: string
      } = {
        sector: form.sector,
        description: form.description.trim() || undefined,
        status: form.status
      }
      if (form.coordinatorId) payload.coordinatorId = form.coordinatorId
      await sectorLeaderAdminApi.update(editingId.value, payload)
    } else {
      await sectorLeaderAdminApi.create({
        residentId: form.residentId,
        coordinatorId: form.coordinatorId,
        sector: form.sector,
        description: form.description.trim() || undefined
      })
    }
    closeForm()
    await load(page.value)
  } catch (e) {
    formError.value = e instanceof ApiError ? e.message : '保存失败'
  } finally {
    submitting.value = false
  }
}

async function removeLeader(item: SectorLeaderDetail) {
  if (!confirm(`确认撤销板块负责人「${item.residentName || item.id}」？`)) return
  removingId.value = item.id
  try {
    await sectorLeaderAdminApi.remove(item.id)
    await load(page.value)
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '撤销失败'
  } finally {
    removingId.value = ''
  }
}

onMounted(async () => {
  await loadCoordinatorOptions()
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
.table { width: 100%; border-collapse: collapse; font-size: 14px; min-width: 960px; }
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
.btnGhost:hover { border-color: #5c5c9e; color: #5c5c9e; }
.modalOverlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal { width: 480px; max-width: calc(100vw - 32px); background: #fff; border-radius: 12px; overflow: hidden; }
.modalWide { width: 560px; }
.modalHeader { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid #f0f0f3; }
.modalTitle { font-size: 16px; font-weight: 600; }
.modalClose { border: none; background: none; font-size: 22px; cursor: pointer; color: #8c8c9a; }
.modalBody { padding: 20px; max-height: 70vh; overflow-y: auto; }
.modalFooter { display: flex; justify-content: flex-end; gap: 10px; padding: 16px 20px; border-top: 1px solid #f0f0f3; }
.field { margin-bottom: 14px; }
.fieldRow { display: flex; gap: 8px; align-items: center; }
.fieldRow .input { flex: 1; min-width: 0; }
.label { display: block; font-size: 13px; color: #8c8c9a; margin-bottom: 6px; }
.label em { color: #e05c5c; font-style: normal; }
.fieldHint { margin: 6px 0 0; font-size: 12px; color: #8c8c9a; }
.fieldHint.error { color: #e05c5c; }
.textarea { width: 100%; padding: 8px 12px; border: 1px solid #e8e8ec; border-radius: 8px; resize: vertical; box-sizing: border-box; }
.detailList { list-style: none; margin: 0; padding: 0; }
.detailList li { display: flex; justify-content: space-between; gap: 16px; padding: 10px 0; border-bottom: 1px solid #f0f0f3; font-size: 14px; }
.detailList span { color: #8c8c9a; flex-shrink: 0; }
.detailList strong { color: #1f1f2e; text-align: right; font-weight: 500; }
.mt8 { margin-top: 8px; }
</style>
