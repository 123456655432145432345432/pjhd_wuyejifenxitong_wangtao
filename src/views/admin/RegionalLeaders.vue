<template>
  <div class="page">
    <div class="header">
      <div>
        <h1 class="title">区域 / 项目负责人</h1>
        <p class="desc">管理板块下的区域负责人及其项目负责人</p>
      </div>
      <button class="btnPrimary" @click="openCreate">
        {{ tab === 'regional' ? '新增区域负责人' : '新增项目负责人' }}
      </button>
    </div>

    <div class="tabs">
      <button class="tab" :class="{ active: tab === 'regional' }" @click="switchTab('regional')">区域负责人</button>
      <button class="tab" :class="{ active: tab === 'project' }" @click="switchTab('project')">项目负责人</button>
    </div>

    <div class="toolbar">
      <select v-if="tab === 'regional' && !isSectorLeader" v-model="sectorLeaderId" class="input" @change="load">
        <option value="">全部板块负责人</option>
        <option v-for="s in sectorLeaders" :key="s.id" :value="s.id">{{ sectorLeaderLabel(s) }}</option>
      </select>
      <div v-else-if="tab === 'regional' && isSectorLeader" class="readonlyFilter">
        当前板块：{{ currentSectorLabel }}
      </div>
      <select v-else v-model="regionalLeaderId" class="input" @change="load">
        <option value="">选择区域负责人</option>
        <option v-for="r in regionalOptions" :key="r.id" :value="r.id">{{ regionalLeaderLabel(r) }}</option>
      </select>
      <button class="btnPrimary" :disabled="loading" @click="load">刷新</button>
    </div>

    <p v-if="error" class="error">{{ error }}</p>
    <div v-if="loading" class="hint">加载中...</div>
    <div v-else-if="tab === 'regional' && regionalList.length" class="tableScroll">
      <table class="table">
        <thead>
          <tr><th>姓名</th><th>手机</th><th>区域</th><th>分成</th><th>操作</th></tr>
        </thead>
        <tbody>
          <tr v-for="item in regionalList" :key="item.id">
            <td>{{ item.name || '—' }}</td>
            <td>{{ item.phone || '—' }}</td>
            <td>{{ item.regionName || '—' }}</td>
            <td>{{ formatShare(item.shareRate) }}</td>
            <td>
              <button class="linkBtn" @click="openEditRegional(item)">编辑</button>
              <button
                class="linkBtn danger"
                :disabled="!item.residentId"
                :title="item.residentId ? '停用该负责人账号' : '缺少住户账号标识，请联系后端补充'"
                @click="removeRegional(item)"
              >
                停用账号
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-else-if="tab === 'project' && projectList.length" class="tableScroll">
      <table class="table">
        <thead>
          <tr><th>姓名</th><th>手机</th><th>项目</th><th>分成</th><th>操作</th></tr>
        </thead>
        <tbody>
          <tr v-for="item in projectList" :key="item.id">
            <td>{{ item.name || '—' }}</td>
            <td>{{ item.phone || '—' }}</td>
            <td>{{ item.projectName || '—' }}</td>
            <td>{{ formatShare(item.shareRate) }}</td>
            <td>
              <button class="linkBtn" @click="openEditProject(item)">编辑</button>
              <button
                class="linkBtn danger"
                :disabled="!item.residentId"
                :title="item.residentId ? '停用该负责人账号' : '缺少住户账号标识，请联系后端补充'"
                @click="removeProject(item)"
              >
                停用账号
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <p v-else class="hint">暂无数据</p>

    <Teleport to="body">
      <div v-if="modalOpen" class="modalOverlay" @click.self="closeModal">
        <div class="modal">
          <div class="modalHeader">
            <h3 class="modalTitle">{{ modalTitle }}</h3>
            <button class="modalClose" @click="closeModal">&times;</button>
          </div>
          <div class="modalBody">
            <template v-if="tab === 'regional'">
              <div class="field">
                <label class="label">关联住户</label>
                <ResidentSearchSelect
                  v-model="regionalForm.residentId"
                  :auto-open="modalOpen && !editingId"
                  @select="onRegionalResidentSelect"
                />
              </div>
              <div class="field">
                <label class="label">板块负责人</label>
                <select v-model="regionalForm.sectorLeaderId" class="input" :disabled="isSectorLeader">
                  <option value="">请选择</option>
                  <option v-for="s in sectorLeaders" :key="s.id" :value="s.id">{{ sectorLeaderLabel(s) }}</option>
                </select>
                <p v-if="!sectorLeaders.length" class="fieldHint">
                  {{ optionsError || '暂无可选板块负责人，请先在「板块负责人」中指派' }}
                </p>
              </div>
              <div class="field"><label class="label">姓名</label><input v-model.trim="regionalForm.name" class="input" /></div>
              <div class="field"><label class="label">手机</label><input v-model.trim="regionalForm.phone" class="input" /></div>
              <div class="field"><label class="label">区域名称</label><input v-model.trim="regionalForm.regionName" class="input" /></div>
              <div class="field"><label class="label">分成比例 (0~1)</label><input v-model.number="regionalForm.shareRate" type="number" min="0" max="1" step="0.01" class="input" /></div>
            </template>
            <template v-else>
              <div class="field">
                <label class="label">关联住户</label>
                <ResidentSearchSelect
                  v-model="projectForm.residentId"
                  :auto-open="modalOpen && !editingId"
                  @select="onProjectResidentSelect"
                />
              </div>
              <div class="field">
                <label class="label">区域负责人</label>
                <select v-model="projectForm.regionalLeaderId" class="input">
                  <option value="">请选择</option>
                  <option v-for="r in regionalOptions" :key="r.id" :value="r.id">{{ regionalLeaderLabel(r) }}</option>
                </select>
                <p v-if="!regionalOptions.length" class="fieldHint">
                  {{ optionsError || '暂无可选区域负责人，请先在「区域负责人」页签新增' }}
                </p>
              </div>
              <div class="field"><label class="label">姓名</label><input v-model.trim="projectForm.name" class="input" /></div>
              <div class="field"><label class="label">手机</label><input v-model.trim="projectForm.phone" class="input" /></div>
              <div class="field"><label class="label">项目名称</label><input v-model.trim="projectForm.projectName" class="input" /></div>
              <div class="field"><label class="label">分成比例 (0~1)</label><input v-model.number="projectForm.shareRate" type="number" min="0" max="1" step="0.01" class="input" /></div>
            </template>
            <p v-if="formError" class="error">{{ formError }}</p>
            <div class="modalFooter">
              <button class="btnSecondary" @click="closeModal">取消</button>
              <button class="btnPrimary" :disabled="saving" @click="submit">{{ saving ? '保存中...' : '保存' }}</button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import ResidentSearchSelect from '../../components/ResidentSearchSelect.vue'
import { projectLeaderApi, regionalLeaderApi, residentApi, sectorLeaderAdminApi } from '../../api/services'
import { ApiError } from '../../api/request'
import type { ProjectLeaderItem, RegionalLeaderItem, ResidentItem, SectorLeaderDetail } from '../../api/types'
import { rateToFormPercent, resolveResidentDisplayName } from '../../api/mappers'
import { USER_ROLE } from '../../constants/enums'
import { useAuthStore } from '../../stores/auth'
import { useSectorLeaderPortalStore } from '../../stores/sectorLeaderPortal'

const auth = useAuthStore()
const sectorPortal = useSectorLeaderPortalStore()
const isSectorLeader = computed(() => auth.profile?.role === USER_ROLE.SECTOR_LEADER)
const tab = ref<'regional' | 'project'>('regional')
const loading = ref(false)
const error = ref('')
const optionsError = ref('')
const sectorLeaders = ref<SectorLeaderDetail[]>([])
const sectorLeaderId = ref('')
const regionalLeaderId = ref('')
const regionalList = ref<RegionalLeaderItem[]>([])
const regionalOptions = ref<RegionalLeaderItem[]>([])
const projectList = ref<ProjectLeaderItem[]>([])
const modalOpen = ref(false)
const editingId = ref('')
const saving = ref(false)
const formError = ref('')
const regionalForm = reactive({
  residentId: '',
  sectorLeaderId: '',
  name: '',
  phone: '',
  regionName: '',
  shareRate: 0.05
})
const projectForm = reactive({
  residentId: '',
  regionalLeaderId: '',
  name: '',
  phone: '',
  projectName: '',
  shareRate: 0.05
})

const modalTitle = computed(() => {
  if (tab.value === 'regional') return editingId.value ? '编辑区域负责人' : '新增区域负责人'
  return editingId.value ? '编辑项目负责人' : '新增项目负责人'
})

const currentSectorLabel = computed(() => {
  const me = sectorLeaders.value.find((s) => s.id === sectorLeaderId.value) || sectorPortal.detail
  if (!me) return sectorLeaderId.value || '本人'
  return sectorLeaderLabel(me)
})

function formatShare(rate?: number) {
  if (rate === undefined || rate === null) return '—'
  return `${rateToFormPercent(rate)}%`
}

function unwrapList<T>(res: { list?: T[]; items?: T[]; records?: T[]; data?: T[] } | T[] | null | undefined): T[] {
  if (!res) return []
  if (Array.isArray(res)) return res
  if (Array.isArray(res.list)) return res.list
  if (Array.isArray(res.items)) return res.items
  if (Array.isArray(res.records)) return res.records
  if (Array.isArray(res.data)) return res.data
  return []
}

function pickStr(raw: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = raw[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  }
  return ''
}

function normalizeRegionalLeader(item: RegionalLeaderItem | Record<string, unknown>): RegionalLeaderItem {
  const raw = item as Record<string, unknown>
  return {
    ...(item as RegionalLeaderItem),
    id: pickStr(raw, 'id', 'regionalLeaderId', 'regional_leader_id'),
    residentId: pickStr(raw, 'residentId', 'resident_id') || undefined,
    sectorLeaderId: pickStr(raw, 'sectorLeaderId', 'sector_leader_id') || undefined,
    name: pickStr(raw, 'name', 'residentName', 'resident_name') || undefined,
    phone: pickStr(raw, 'phone', 'residentPhone', 'resident_phone') || undefined,
    regionName: pickStr(raw, 'regionName', 'region_name', 'region') || undefined,
    shareRate: (raw.shareRate ?? raw.share_rate) as number | undefined,
    status: pickStr(raw, 'status') || undefined,
    createdAt: pickStr(raw, 'createdAt', 'created_at') || undefined
  }
}

function normalizeProjectLeader(item: ProjectLeaderItem | Record<string, unknown>): ProjectLeaderItem {
  const raw = item as Record<string, unknown>
  return {
    ...(item as ProjectLeaderItem),
    id: pickStr(raw, 'id', 'projectLeaderId', 'project_leader_id'),
    residentId: pickStr(raw, 'residentId', 'resident_id') || undefined,
    regionalLeaderId: pickStr(raw, 'regionalLeaderId', 'regional_leader_id') || undefined,
    name: pickStr(raw, 'name', 'residentName', 'resident_name') || undefined,
    phone: pickStr(raw, 'phone', 'residentPhone', 'resident_phone') || undefined,
    projectName: pickStr(raw, 'projectName', 'project_name', 'project') || undefined,
    shareRate: (raw.shareRate ?? raw.share_rate) as number | undefined,
    status: pickStr(raw, 'status') || undefined,
    createdAt: pickStr(raw, 'createdAt', 'created_at') || undefined
  }
}

function sectorLeaderLabel(s: SectorLeaderDetail) {
  const name = s.residentName || s.phone || s.id
  return s.sectorName || s.sector ? `${name}（${s.sectorName || s.sector}）` : name
}

function regionalLeaderLabel(r: RegionalLeaderItem) {
  const name = r.name || r.id
  return r.regionName ? `${name}（${r.regionName}）` : name
}

async function loadSectorLeaders() {
  if (isSectorLeader.value) {
    const me = await sectorPortal.loadMy()
    if (me?.id) {
      sectorLeaders.value = [me]
      sectorLeaderId.value = me.id
      optionsError.value = ''
    } else {
      sectorLeaders.value = []
      optionsError.value = sectorPortal.loadError || '未能获取本人板块信息'
    }
    return
  }
  try {
    const res = await sectorLeaderAdminApi.list({
      page: 1,
      pageSize: 100
    })
    sectorLeaders.value = unwrapList(res).filter((item) => !!item.id)
    if (tab.value === 'regional') optionsError.value = ''
  } catch (e) {
    sectorLeaders.value = []
    optionsError.value = e instanceof ApiError ? e.message : '板块负责人加载失败'
  }
}

async function loadRegionalOptions() {
  try {
    const res = await regionalLeaderApi.list({
      propertyCompanyId: auth.propertyCompanyId || undefined,
      sectorLeaderId: isSectorLeader.value ? sectorLeaderId.value || undefined : undefined,
      page: 1,
      pageSize: 100
    })
    regionalOptions.value = unwrapList(res)
      .map((item) => normalizeRegionalLeader(item))
      .filter((item) => !!item.id)
    if (tab.value === 'project') optionsError.value = ''
  } catch (e) {
    regionalOptions.value = []
    optionsError.value = e instanceof ApiError ? e.message : '区域负责人加载失败'
  }
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    if (tab.value === 'regional') {
      const res = await regionalLeaderApi.list({
        propertyCompanyId: auth.propertyCompanyId || undefined,
        sectorLeaderId: sectorLeaderId.value || undefined,
        page: 1,
        pageSize: 100
      })
      regionalList.value = unwrapList(res).map((item) => normalizeRegionalLeader(item))
    } else {
      await loadRegionalOptions()
      if (!regionalLeaderId.value && regionalOptions.value[0]) {
        regionalLeaderId.value = regionalOptions.value[0].id
      }
      const res = await projectLeaderApi.list({
        regionalLeaderId: regionalLeaderId.value || undefined,
        page: 1,
        pageSize: 100
      })
      projectList.value = unwrapList(res).map((item) => normalizeProjectLeader(item))
    }
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '加载失败'
  } finally {
    loading.value = false
  }
}

function onRegionalResidentSelect(item: ResidentItem) {
  regionalForm.residentId = item.id
  if (!regionalForm.name) regionalForm.name = resolveResidentDisplayName(item)
  if (!regionalForm.phone) regionalForm.phone = item.phone || ''
}

function onProjectResidentSelect(item: ResidentItem) {
  projectForm.residentId = item.id
  if (!projectForm.name) projectForm.name = resolveResidentDisplayName(item)
  if (!projectForm.phone) projectForm.phone = item.phone || ''
}

function switchTab(next: 'regional' | 'project') {
  tab.value = next
  void load()
}

async function openCreate() {
  editingId.value = ''
  formError.value = ''
  optionsError.value = ''
  if (tab.value === 'regional') {
    if (!sectorLeaders.value.length) await loadSectorLeaders()
    Object.assign(regionalForm, {
      residentId: '',
      sectorLeaderId: isSectorLeader.value
        ? sectorLeaderId.value
        : sectorLeaderId.value || '',
      name: '',
      phone: '',
      regionName: '',
      shareRate: 0.05
    })
  } else {
    await loadRegionalOptions()
    Object.assign(projectForm, {
      residentId: '',
      regionalLeaderId: regionalLeaderId.value || regionalOptions.value[0]?.id || '',
      name: '',
      phone: '',
      projectName: '',
      shareRate: 0.05
    })
  }
  modalOpen.value = true
}

function openEditRegional(item: RegionalLeaderItem) {
  editingId.value = item.id
  Object.assign(regionalForm, {
    residentId: item.residentId || '',
    sectorLeaderId: item.sectorLeaderId || '',
    name: item.name || '',
    phone: item.phone || '',
    regionName: item.regionName || '',
    shareRate: item.shareRate ?? 0.05
  })
  formError.value = ''
  modalOpen.value = true
}

function openEditProject(item: ProjectLeaderItem) {
  editingId.value = item.id
  Object.assign(projectForm, {
    residentId: item.residentId || '',
    regionalLeaderId: item.regionalLeaderId || '',
    name: item.name || '',
    phone: item.phone || '',
    projectName: item.projectName || '',
    shareRate: item.shareRate ?? 0.05
  })
  formError.value = ''
  modalOpen.value = true
}

function closeModal() {
  modalOpen.value = false
}

async function submit() {
  saving.value = true
  formError.value = ''
  try {
    if (tab.value === 'regional') {
      if (!regionalForm.residentId || !regionalForm.sectorLeaderId || !regionalForm.name || !regionalForm.phone) {
        formError.value = '请完整填写必填项'
        return
      }
      if (editingId.value) {
        await regionalLeaderApi.update(editingId.value, { ...regionalForm })
      } else {
        await regionalLeaderApi.create({ ...regionalForm })
      }
    } else {
      if (!projectForm.residentId || !projectForm.regionalLeaderId || !projectForm.name || !projectForm.phone) {
        formError.value = '请完整填写必填项'
        return
      }
      if (editingId.value) {
        await projectLeaderApi.update(editingId.value, { ...projectForm })
      } else {
        await projectLeaderApi.create({ ...projectForm })
      }
    }
    closeModal()
    await loadRegionalOptions()
    await load()
  } catch (e) {
    formError.value = e instanceof ApiError ? e.message : '保存失败'
  } finally {
    saving.value = false
  }
}

async function removeRegional(item: RegionalLeaderItem) {
  if (!item.residentId) {
    error.value = '该区域负责人缺少住户账号标识，无法安全停用；请联系后端补充'
    return
  }
  if (
    !confirm(
      `确认停用区域负责人「${item.name || item.phone || '未命名账号'}」？\n` +
        '账号将无法继续登录，历史业务数据仍会保留。'
    )
  ) return
  try {
    error.value = ''
    await residentApi.remove(item.residentId)
    await load()
    await loadRegionalOptions()
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '删除失败'
  }
}

async function removeProject(item: ProjectLeaderItem) {
  if (!item.residentId) {
    error.value = '该项目负责人缺少住户账号标识，无法安全停用；请联系后端补充'
    return
  }
  if (
    !confirm(
      `确认停用项目负责人「${item.name || item.phone || '未命名账号'}」？\n` +
        '账号将无法继续登录，历史业务数据仍会保留。'
    )
  ) return
  try {
    error.value = ''
    await residentApi.remove(item.residentId)
    await load()
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '删除失败'
  }
}

onMounted(async () => {
  optionsError.value = ''
  await loadSectorLeaders()
  await loadRegionalOptions()
  await load()
})
</script>

<style scoped>
.page { max-width: 1000px; min-width: 0; width: 100%; box-sizing: border-box; }
.header { display: flex; justify-content: space-between; margin-bottom: 16px; gap: 12px; }
.title { font-size: 24px; font-weight: 600; margin: 0 0 6px; }
.desc { margin: 0; color: #8c8c9a; font-size: 14px; }
.tabs { display: flex; gap: 8px; margin-bottom: 14px; }
.tab { padding: 8px 14px; border: 1px solid #e8e8ec; border-radius: 8px; background: #fff; cursor: pointer; }
.tab.active { background: #5c5c9e; color: #fff; border-color: #5c5c9e; }
.toolbar { display: flex; gap: 10px; margin-bottom: 16px; align-items: center; flex-wrap: wrap; }
.readonlyFilter { min-width: 180px; padding: 8px 12px; border: 1px solid #e8e8ec; border-radius: 8px; background: #fafafc; color: #5c5c66; font-size: 14px; }
.input { min-width: 180px; width: 100%; padding: 8px 12px; border: 1px solid #e8e8ec; border-radius: 8px; box-sizing: border-box; }
.input:disabled { background: #fafafc; color: #8c8c9a; cursor: not-allowed; }
.btnPrimary, .btnSecondary { padding: 8px 16px; border-radius: 8px; border: none; cursor: pointer; }
.btnPrimary { background: #5c5c9e; color: #fff; }
.btnSecondary { background: #f0f0f3; }
.tableScroll { width: 100%; max-width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
.table { width: 100%; min-width: 560px; border-collapse: collapse; font-size: 13px; }
.table th, .table td {
  padding: 10px 8px; border-bottom: 1px solid #f0f0f3; text-align: left;
  word-break: break-word; overflow-wrap: anywhere;
}
.linkBtn { border: none; background: none; color: #5c5c9e; cursor: pointer; margin-right: 8px; }
.linkBtn.danger { color: #e05c5c; }
.linkBtn:disabled { color: #b8b8c2; cursor: not-allowed; }
.hint, .error, .fieldHint { color: #8c8c9a; }
.fieldHint { margin: 6px 0 0; font-size: 12px; }
.error { color: #e05c5c; }
.modalOverlay { position: fixed; inset: 0; background: rgba(0,0,0,.45); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal { width: 100%; max-width: 480px; background: #fff; border-radius: 12px; }
.modalHeader { display: flex; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid #f0f0f3; }
.modalTitle { margin: 0; font-size: 16px; }
.modalClose { border: none; background: none; font-size: 22px; cursor: pointer; }
.modalBody { padding: 16px 20px; max-height: 70vh; overflow: auto; }
.field { margin-bottom: 12px; }
.label { display: block; font-size: 13px; margin-bottom: 6px; color: #5c5c66; }
.modalFooter { display: flex; justify-content: flex-end; gap: 10px; }
</style>
