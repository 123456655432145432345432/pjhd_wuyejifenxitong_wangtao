<template>
  <div class="page" :class="{ mobilePage: isMobile }">
    <div class="header">
      <div>
        <h1 class="title">快递负责人</h1>
        <p class="desc">管理快递负责人及其下属快递员</p>
      </div>
      <button class="btnPrimary" @click="openCreate">新增负责人</button>
    </div>

    <div class="toolbar">
      <input v-model="keyword" class="input" placeholder="搜索姓名/手机号" @keyup.enter="reload" />
      <select v-model="statusFilter" class="input" @change="reload">
        <option v-for="opt in ENTITY_STATUS_OPTIONS" :key="opt.value || 'all'" :value="opt.value">{{ opt.label }}</option>
      </select>
      <button class="btnPrimary" :disabled="loading" @click="reload">搜索</button>
    </div>

    <div class="panel">
      <div v-if="loading" class="hint">加载中...</div>
      <p v-else-if="error" class="error">{{ error }}</p>
      <table v-else-if="list.length" class="table managerTable" :class="{ mobileCards: isMobile }">
        <thead>
          <tr>
            <th>姓名</th>
            <th>手机号</th>
            <th>小区</th>
            <th>负责区域</th>
            <th>快递员数</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in list" :key="item.id">
            <td>{{ item.name || '—' }}</td>
            <td>{{ item.phone || '—' }}</td>
            <td>{{ item.communityName || item.communityId || '—' }}</td>
            <td>{{ item.responsibleArea || '—' }}</td>
            <td>{{ item.courierCount ?? '—' }}</td>
            <td>{{ getEnumLabel(ENTITY_STATUS_LABEL, item.status) }}</td>
            <td class="actions">
              <button class="linkBtn" @click="openDetail(item)">详情</button>
              <button class="linkBtn" @click="openEdit(item)">编辑</button>
              <button v-if="item.status === ENTITY_STATUS.ACTIVE" class="linkBtn danger" @click="removeItem(item)">停用</button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else class="hint">暂无数据</p>
      <div v-if="totalPages > 1" class="pager">
        <button class="pageBtn" :disabled="page <= 1" @click="changePage(page - 1)">&lt;</button>
        <span>{{ page }} / {{ totalPages }}</span>
        <button class="pageBtn" :disabled="page >= totalPages" @click="changePage(page + 1)">&gt;</button>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="modalOpen" class="modalOverlay" @click.self="closeModal">
        <div class="modal" :class="{ mobileSheet: isMobile }">
          <div class="modalHeader">
            <h3 class="modalTitle">{{ editingId ? '编辑快递负责人' : '新增快递负责人' }}</h3>
            <button class="modalClose" @click="closeModal">&times;</button>
          </div>
          <div class="modalBody">
            <div v-if="!editingId" class="field">
              <label class="label">选择业主 <em>*</em></label>
              <ResidentSearchSelect v-model="form.residentId" :status="RESIDENT_STATUS.ACTIVE" auto-open />
              <p class="fieldHint">输入姓名或手机号搜索后选择，勿手填 res_ ID</p>
            </div>
            <div class="field">
              <label class="label">姓名 <em>*</em></label>
              <input v-model="form.name" class="input" />
            </div>
            <div class="field">
              <label class="label">手机号 <em>*</em></label>
              <input v-model="form.phone" class="input" />
            </div>
            <div class="field">
              <label class="label">所属小区 <em>*</em></label>
              <select v-model="form.communityId" class="input">
                <option value="">请选择小区</option>
                <option v-for="c in communities" :key="c.id" :value="c.id">
                  {{ c.name || c.id }}
                </option>
              </select>
              <p v-if="!communities.length" class="fieldHint">暂无小区列表时可手动填写小区 ID</p>
              <input
                v-if="!communities.length"
                v-model="form.communityId"
                class="input"
                style="margin-top: 8px"
                placeholder="com_xxx"
              />
            </div>
            <div class="field">
              <label class="label">负责区域</label>
              <input v-model="form.responsibleArea" class="input" placeholder="1栋-5栋" />
            </div>
            <p v-if="formError" class="error">{{ formError }}</p>
            <div class="modalFooter">
              <button class="btnSecondary" @click="closeModal">取消</button>
              <button class="btnPrimary" :disabled="saving" @click="submitForm">{{ saving ? '保存中...' : '保存' }}</button>
            </div>
          </div>
        </div>
      </div>

      <div v-if="detailOpen" class="modalOverlay" @click.self="detailOpen = false">
        <div class="modal modalWide" :class="{ mobileSheet: isMobile }">
          <div class="modalHeader">
            <h3 class="modalTitle">负责人详情 · {{ detailTarget?.name }}</h3>
            <button class="modalClose" @click="detailOpen = false">&times;</button>
          </div>
          <div class="modalBody">
            <div v-if="detailTarget" class="detailGrid">
              <div><span>手机号</span><strong>{{ detailTarget.phone || '—' }}</strong></div>
              <div><span>所属社区</span><strong>{{ detailTarget.communityName || detailTarget.communityId || '—' }}</strong></div>
              <div><span>负责区域</span><strong>{{ detailTarget.responsibleArea || '—' }}</strong></div>
              <div><span>状态</span><strong>{{ getEnumLabel(ENTITY_STATUS_LABEL, detailTarget.status) }}</strong></div>
              <div><span>配送时段</span><strong>{{ detailTarget.deliveryTimeConfig || '—' }}</strong></div>
              <div><span>创建时间</span><strong>{{ detailTarget.createdAt || '—' }}</strong></div>
            </div>
            <h4 class="sectionTitle">绑定快递员</h4>
            <div class="addCourier">
              <ResidentSearchSelect v-model="newCourierId" :status="RESIDENT_STATUS.ACTIVE" />
              <button class="btnPrimary" :disabled="binding || !newCourierId" @click="bindCourier">添加</button>
            </div>
            <table v-if="couriers.length" class="table courierTable" :class="{ mobileCards: isMobile }">
              <thead><tr><th>姓名</th><th>手机号</th><th>状态</th><th>操作</th></tr></thead>
              <tbody>
                <tr v-for="c in couriers" :key="c.id">
                  <td>{{ c.name || '—' }}</td>
                  <td>{{ c.phone || '—' }}</td>
                  <td>{{ getEnumLabel(ENTITY_STATUS_LABEL, c.status) }}</td>
                  <td><button class="linkBtn danger" @click="unbindCourier(c.id)">解绑</button></td>
                </tr>
              </tbody>
            </table>
            <p v-else class="hint">暂无绑定快递员</p>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import ResidentSearchSelect from '../../components/ResidentSearchSelect.vue'
import { courierManagerApi, propertyCompanyApi, residentApi, configApi } from '../../api/services'
import type {
  CourierManagerItem,
  CourierManagerCourierItem,
  PropertyCompanyCommunity
} from '../../api/types'
import { ApiError } from '../../api/request'
import {
  ENTITY_STATUS,
  ENTITY_STATUS_LABEL,
  ENTITY_STATUS_OPTIONS,
  RESIDENT_STATUS,
  getEnumLabel
} from '../../constants/enums'
import { resolveResidentDisplayName } from '../../api/mappers'
import { useAuthStore } from '../../stores/auth'
import { useIsMobile } from '../../composables/useIsMobile'

const auth = useAuthStore()
const { isMobile } = useIsMobile()
const loading = ref(false)
const error = ref('')
const list = ref<CourierManagerItem[]>([])
const page = ref(1)
const totalPages = ref(1)
const keyword = ref('')
const statusFilter = ref('')
const communities = ref<PropertyCompanyCommunity[]>([])

const modalOpen = ref(false)
const editingId = ref('')
const saving = ref(false)
const formError = ref('')
const form = ref({ residentId: '', name: '', phone: '', communityId: '', responsibleArea: '' })

const detailOpen = ref(false)
const detailTarget = ref<CourierManagerItem | null>(null)
const couriers = ref<CourierManagerCourierItem[]>([])
const newCourierId = ref('')
const binding = ref(false)

const propertyCompanyId = computed(
  () => auth.propertyCompanyId || auth.profile?.propertyCompanyId || ''
)

async function loadCommunities() {
  const id = propertyCompanyId.value
  if (!id) {
    communities.value = []
    return
  }
  try {
    const res = await propertyCompanyApi.communities(id)
    communities.value = res.list || []
  } catch {
    communities.value = []
  }
  if (communities.value.length) return
  try {
    const detail = await configApi.propertyCompany(id)
    communities.value = detail.communities || []
  } catch {
    // keep empty; form still allows manual communityId
  }
}

watch(
  () => form.value.residentId,
  async (id) => {
    if (!id || editingId.value) return
    try {
      const resident = await residentApi.get(id)
      if (!form.value.name.trim()) {
        form.value.name = resolveResidentDisplayName(resident)
      }
      if (!form.value.phone.trim() && resident.phone) {
        form.value.phone = resident.phone
      }
    } catch {
      // 选择器已写入 ID，姓名/手机可手动补全
    }
  }
)

async function load(pageNo = 1) {
  loading.value = true
  error.value = ''
  try {
    const res = await courierManagerApi.list({
      page: pageNo,
      pageSize: 20,
      keyword: keyword.value.trim() || undefined,
      status: statusFilter.value || undefined
    })
    list.value = res.list || []
    page.value = res.pagination?.page ?? pageNo
    totalPages.value = res.pagination?.totalPages ?? 1
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '加载失败'
  } finally {
    loading.value = false
  }
}

function reload() { load(1) }
function changePage(p: number) { load(p) }

function openCreate() {
  editingId.value = ''
  form.value = { residentId: '', name: '', phone: '', communityId: '', responsibleArea: '' }
  formError.value = ''
  modalOpen.value = true
}

function openEdit(item: CourierManagerItem) {
  editingId.value = item.id
  form.value = {
    residentId: item.residentId || '',
    name: item.name || '',
    phone: item.phone || '',
    communityId: item.communityId || '',
    responsibleArea: item.responsibleArea || ''
  }
  formError.value = ''
  modalOpen.value = true
}

function closeModal() { modalOpen.value = false }

async function submitForm() {
  if (!form.value.name.trim() || !form.value.phone.trim()) {
    formError.value = '请填写姓名和手机号'
    return
  }
  saving.value = true
  formError.value = ''
  try {
    if (editingId.value) {
      await courierManagerApi.update(editingId.value, {
        name: form.value.name.trim(),
        phone: form.value.phone.trim(),
        communityId: form.value.communityId.trim() || undefined,
        responsibleArea: form.value.responsibleArea.trim() || undefined
      })
    } else {
      if (!form.value.residentId.trim() || !form.value.communityId.trim()) {
        formError.value = '请选择业主和小区'
        saving.value = false
        return
      }
      await courierManagerApi.create({
        residentId: form.value.residentId.trim(),
        communityId: form.value.communityId.trim(),
        name: form.value.name.trim(),
        phone: form.value.phone.trim(),
        responsibleArea: form.value.responsibleArea.trim() || undefined
      })
    }
    closeModal()
    await load(page.value)
  } catch (e) {
    formError.value = e instanceof ApiError ? e.message : '保存失败'
  } finally {
    saving.value = false
  }
}

async function removeItem(item: CourierManagerItem) {
  if (!confirm(`确定停用「${item.name}」？`)) return
  try {
    await courierManagerApi.remove(item.id)
    await load(page.value)
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '操作失败'
  }
}

async function openDetail(item: CourierManagerItem) {
  detailTarget.value = item
  detailOpen.value = true
  newCourierId.value = ''
  try {
    const [detail, data] = await Promise.all([
      courierManagerApi.get(item.id),
      courierManagerApi.couriers(item.id)
    ])
    detailTarget.value = detail
    couriers.value = Array.isArray(data) ? data : data.list || []
  } catch (e) {
    couriers.value = []
  }
}

async function bindCourier() {
  if (!detailTarget.value || !newCourierId.value.trim()) return
  binding.value = true
  try {
    await courierManagerApi.addCourier(detailTarget.value.id, newCourierId.value.trim())
    newCourierId.value = ''
    await openDetail(detailTarget.value)
    await load(page.value)
  } catch (e) {
    formError.value = e instanceof ApiError ? e.message : '绑定失败'
  } finally {
    binding.value = false
  }
}

async function unbindCourier(courierId: string) {
  if (!detailTarget.value || !confirm('确定解绑该快递员？')) return
  try {
    await courierManagerApi.removeCourier(detailTarget.value.id, courierId)
    await openDetail(detailTarget.value)
    await load(page.value)
  } catch (e) {
    formError.value = e instanceof ApiError ? e.message : '解绑失败'
  }
}

onMounted(async () => {
  await loadCommunities()
  await load(1)
})
</script>

<style scoped>
.page { max-width: 1200px; }
.header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; gap: 16px; flex-wrap: wrap; }
.detailGrid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-bottom: 20px; padding: 16px; border-radius: 8px; background: #fafafc; }
.detailGrid div { min-width: 0; }
.detailGrid span { display: block; margin-bottom: 4px; color: #8c8c9a; font-size: 12px; }
.detailGrid strong { font-size: 14px; word-break: break-all; }
.sectionTitle { margin: 0 0 12px; font-size: 14px; }
.title { font-size: 24px; font-weight: 600; color: #1f1f2e; margin-bottom: 8px; }
.desc { font-size: 14px; color: #8c8c9a; }
.toolbar { display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
.input { padding: 10px 14px; border: 1px solid #e8e8ec; border-radius: 8px; font-size: 14px; }
.panel { background: #fff; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.table { width: 100%; border-collapse: collapse; font-size: 14px; }
.table th, .table td { padding: 12px 16px; text-align: left; border-bottom: 1px solid #f0f0f3; }
.table th { color: #8c8c9a; font-weight: 500; background: #fafafc; }
.linkBtn { border: none; background: none; color: #5c5c9e; cursor: pointer; font-size: 14px; margin-right: 8px; }
.linkBtn.danger { color: #e05c5c; }
.btnPrimary { padding: 10px 18px; border-radius: 8px; background: #5c5c9e; color: #fff; border: none; cursor: pointer; }
.btnSecondary { padding: 10px 18px; border-radius: 8px; border: 1px solid #e8e8ec; background: #fff; cursor: pointer; }
.hint, .error { font-size: 14px; color: #8c8c9a; text-align: center; padding: 24px 0; }
.error { color: #e05c5c; }
.pager { display: flex; align-items: center; justify-content: center; gap: 12px; margin-top: 16px; }
.pageBtn { padding: 6px 12px; border: 1px solid #e8e8ec; border-radius: 8px; background: #fff; cursor: pointer; }
.modalOverlay { position: fixed; inset: 0; z-index: 1000; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; padding: 24px; }
.modal { background: #fff; border-radius: 12px; width: min(480px, 100%); max-height: 90vh; overflow: auto; }
.modalWide { width: min(720px, 100%); }
.modalHeader { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid #f0f0f3; }
.modalTitle { font-size: 16px; font-weight: 600; margin: 0; }
.modalClose { border: none; background: none; font-size: 24px; cursor: pointer; color: #8c8c9a; }
.modalBody { padding: 24px; }
.field { margin-bottom: 16px; }
.label { display: block; font-size: 13px; color: #5c5c66; margin-bottom: 8px; }
.fieldHint { margin: 6px 0 0; font-size: 12px; color: #8c8c9a; }
.modalFooter { display: flex; justify-content: flex-end; gap: 12px; margin-top: 8px; }
.addCourier { display: flex; gap: 8px; margin-bottom: 16px; align-items: flex-start; }
.addCourier > :first-child { flex: 1; min-width: 0; }
.field .input { width: 100%; box-sizing: border-box; }
.actions { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; }
@media (max-width: 768px) {
  .page { max-width: none; }
  .header { flex-direction: column; margin-bottom: 16px; }
  .title { font-size: 21px; }
  .header .btnPrimary { width: 100%; }
  .toolbar { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .toolbar .input { width: 100%; min-width: 0; box-sizing: border-box; }
  .toolbar .btnPrimary { grid-column: 1 / -1; width: 100%; }
  .panel { padding: 12px; border-radius: 14px; }
  .mobileCards thead { display: none; }
  .mobileCards, .mobileCards tbody, .mobileCards tr, .mobileCards td { display: block; width: 100%; }
  .mobileCards tr { padding: 12px 0; border-bottom: 1px solid #f0f0f3; }
  .mobileCards td {
    display: flex; justify-content: space-between; align-items: center; gap: 12px;
    padding: 6px 0; text-align: right; border-bottom: none; word-break: break-word;
  }
  .mobileCards td::before { color: #8c8c9a; text-align: left; flex-shrink: 0; }
  .managerTable.mobileCards td:nth-child(1)::before { content: '姓名'; }
  .managerTable.mobileCards td:nth-child(2)::before { content: '手机号'; }
  .managerTable.mobileCards td:nth-child(3)::before { content: '小区'; }
  .managerTable.mobileCards td:nth-child(4)::before { content: '负责区域'; }
  .managerTable.mobileCards td:nth-child(5)::before { content: '快递员数'; }
  .managerTable.mobileCards td:nth-child(6)::before { content: '状态'; }
  .managerTable.mobileCards td:nth-child(7)::before { content: '操作'; }
  .courierTable.mobileCards td:nth-child(1)::before { content: '姓名'; }
  .courierTable.mobileCards td:nth-child(2)::before { content: '手机号'; }
  .courierTable.mobileCards td:nth-child(3)::before { content: '状态'; }
  .courierTable.mobileCards td:nth-child(4)::before { content: '操作'; }
  .actions { justify-content: flex-end; }
  .pager { justify-content: center; }
  .detailGrid { grid-template-columns: 1fr; }
  .addCourier { flex-direction: column; }
  .addCourier .btnPrimary { width: 100%; }
  .modalOverlay { padding: 0; align-items: flex-end; }
  .modal.mobileSheet { max-width: 100%; width: 100%; border-radius: 18px 18px 0 0; max-height: 90vh; }
}
</style>
