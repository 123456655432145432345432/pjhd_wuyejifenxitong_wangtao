<template>
  <div class="page">
    <div class="header">
      <div>
        <h1 class="title">单元楼长</h1>
        <p class="desc">
          绑定「小区 + 楼栋」的推广角色；该楼栋住户消费时从物业公司分成中按比例定向分走。
          修改/撤销仅影响后续订单，已产生订单按下单快照结算。
        </p>
      </div>
      <button class="btnPrimary" @click="openCreate">指定楼长</button>
    </div>

    <div class="tablePanel">
      <div class="toolbar">
        <form class="search" @submit.prevent="applyFilters">
          <IconSvg name="search" />
          <input
            v-model="keyword"
            type="search"
            placeholder="搜索住户姓名、手机号"
            enterkeyhint="search"
          />
          <button type="submit" class="searchBtn">搜索</button>
        </form>
        <select v-model="status" class="filterSelect" @change="applyFilters">
          <option v-for="option in BUILDING_LEADER_STATUS_OPTIONS" :key="option.value || 'all'" :value="option.value">
            {{ option.label }}
          </option>
        </select>
        <input
          v-model.trim="building"
          class="filterInput"
          placeholder="楼栋（可选）"
          @change="applyFilters"
        />
        <button class="btnSecondary" :disabled="loading" @click="applyFilters">刷新</button>
      </div>

      <div class="tableScroll">
        <table class="content">
          <thead>
            <tr>
              <th>住户</th>
              <th>手机号</th>
              <th>小区</th>
              <th>楼栋</th>
              <th>分成比例</th>
              <th>累计分成</th>
              <th>状态</th>
              <th>任命时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="9" class="emptyCell">加载中...</td>
            </tr>
            <tr v-else-if="loadError">
              <td colspan="9" class="emptyCell errorCell">
                <p>{{ loadError }}</p>
                <button type="button" class="retryBtn" @click="loadData(currentPage)">重新加载</button>
              </td>
            </tr>
            <tr v-else-if="!list.length">
              <td colspan="9" class="emptyCell">暂无数据</td>
            </tr>
            <tr v-for="item in list" v-else :key="item.id">
              <td>
                <div>{{ item.residentName || '—' }}</div>
                <div class="subText">{{ item.residentId || '—' }}</div>
              </td>
              <td>{{ item.residentPhone || item.phone || '—' }}</td>
              <td>{{ item.communityName || item.communityId || '—' }}</td>
              <td>{{ item.building || '—' }}</td>
              <td>{{ formatRate(item.commissionRate) }}</td>
              <td>¥{{ formatMoney(item.totalEarning) }}</td>
              <td>
                <span :class="['statusBadge', item.status || 'unknown']">
                  {{ getEnumLabel(BUILDING_LEADER_STATUS_LABEL, item.status) }}
                </span>
              </td>
              <td>{{ formatDateTime(item.appointedAt || item.createdAt) }}</td>
              <td>
                <button type="button" class="linkBtn" @click="openEdit(item)">编辑</button>
                <button
                  v-if="item.status === BUILDING_LEADER_STATUS.ACTIVE"
                  type="button"
                  class="linkBtn danger"
                  @click="revoke(item)"
                >
                  撤销
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="footer">
        <span>显示 {{ pageStart }} 到 {{ pageEnd }}，共 {{ total }} 条记录</span>
        <div v-if="totalPages > 1" class="pagination">
          <button class="pageBtn" :disabled="currentPage <= 1 || loading" @click="changePage(currentPage - 1)">
            &lt;
          </button>
          <span>{{ currentPage }} / {{ totalPages }}</span>
          <button
            class="pageBtn"
            :disabled="currentPage >= totalPages || loading"
            @click="changePage(currentPage + 1)"
          >
            &gt;
          </button>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="modalOpen" class="modalOverlay" @click.self="closeModal">
        <div class="modal">
          <div class="modalHeader">
            <h3 class="modalTitle">{{ editingId ? '编辑楼长' : '指定楼长' }}</h3>
            <button type="button" class="modalClose" @click="closeModal">&times;</button>
          </div>
          <form class="modalBody" @submit.prevent="submit">
            <div v-if="!editingId" class="field">
              <label class="fieldLabel">关联住户 <em>*</em></label>
              <ResidentSearchSelect v-model="form.residentId" :auto-open="true" @select="onResidentSelect" />
            </div>
            <div v-else class="auditInfo">
              <div><span>住户</span><strong>{{ editingName }}</strong></div>
              <div><span>小区 / 楼栋</span><strong>{{ editingScope }}</strong></div>
            </div>
            <div v-if="!editingId" class="fieldRow">
              <div class="field half">
                <label class="fieldLabel">小区 ID（不填取住户所属小区）</label>
                <input v-model.trim="form.communityId" class="input" placeholder="住户未关联小区时必填" />
              </div>
              <div class="field half">
                <label class="fieldLabel">楼栋（不填取住户所属楼栋）</label>
                <input v-model.trim="form.building" class="input" placeholder="如 1号楼" />
              </div>
            </div>
            <div class="field">
              <label class="fieldLabel">分成比例（占物业分成，0 < 比例 ≤ 1）<em>*</em></label>
              <input
                v-model.number="form.commissionRate"
                type="number"
                min="0.0001"
                max="1"
                step="0.001"
                class="input"
              />
              <p class="fieldHint">默认 0.1（10%）；同一小区同一楼栋同一时刻仅一名在任楼长。</p>
            </div>
            <div class="field">
              <label class="fieldLabel">备注</label>
              <textarea v-model.trim="form.description" class="textarea" rows="2" maxlength="200" placeholder="如 1号楼楼长" />
            </div>
            <div v-if="editingId" class="field">
              <label class="fieldLabel">状态</label>
              <select v-model="form.status" class="input">
                <option value="active">在任</option>
                <option value="inactive">已撤销</option>
              </select>
            </div>
            <p v-if="formError" class="formError">{{ formError }}</p>
            <div class="modalFooter">
              <button type="button" class="btnSecondary" @click="closeModal">取消</button>
              <button type="submit" class="btnPrimary" :disabled="saving">
                {{ saving ? '保存中...' : '保存' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import IconSvg from '../../components/IconSvg.vue'
import ResidentSearchSelect from '../../components/ResidentSearchSelect.vue'
import { adminBuildingLeaderApi } from '../../api/services'
import type { BuildingLeaderListItem, ResidentItem } from '../../api/types'
import { ApiError, formatApiError } from '../../api/request'
import {
  BUILDING_LEADER_STATUS,
  BUILDING_LEADER_STATUS_LABEL,
  BUILDING_LEADER_STATUS_OPTIONS,
  getEnumLabel
} from '../../constants/enums'

const PAGE_SIZE = 20

const loading = ref(true)
const loadError = ref('')
const list = ref<BuildingLeaderListItem[]>([])
const currentPage = ref(1)
const total = ref(0)
const totalPages = ref(1)

const keyword = ref('')
const status = ref('')
const building = ref('')

const modalOpen = ref(false)
const editingId = ref('')
const editingName = ref('')
const editingScope = ref('')
const saving = ref(false)
const formError = ref('')
const form = reactive({
  residentId: '',
  communityId: '',
  building: '',
  commissionRate: 0.1,
  description: '',
  status: 'active'
})

const pageStart = computed(() => (total.value ? (currentPage.value - 1) * PAGE_SIZE + 1 : 0))
const pageEnd = computed(() => Math.min(currentPage.value * PAGE_SIZE, total.value))

function formatMoney(value?: number | string | null) {
  if (value === undefined || value === null || Number.isNaN(Number(value))) return '0.00'
  return Number(value).toFixed(2)
}

function formatRate(rate?: number) {
  if (rate === undefined || rate === null || Number.isNaN(Number(rate))) return '—'
  return `${(Number(rate) * 100).toFixed(1)}%`
}

function formatDateTime(value?: string) {
  return value ? value.replace('T', ' ').slice(0, 19) : '—'
}

/** 兼容后端偶发 snake_case / 旧字段名 */
function normalizeItem(item: BuildingLeaderListItem | Record<string, unknown>): BuildingLeaderListItem {
  const raw = item as Record<string, unknown>
  const pickStr = (...keys: string[]) => {
    for (const key of keys) {
      const value = raw[key]
      if (typeof value === 'string' && value.trim()) return value.trim()
    }
    return ''
  }
  return {
    ...(item as BuildingLeaderListItem),
    id: pickStr('id', 'buildingLeaderId'),
    residentId: pickStr('residentId', 'resident_id') || undefined,
    residentName: pickStr('residentName', 'resident_name') || undefined,
    residentPhone: pickStr('residentPhone', 'resident_phone', 'phone') || undefined,
    communityId: pickStr('communityId', 'community_id') || undefined,
    communityName: pickStr('communityName', 'community_name') || undefined,
    building: pickStr('building') || undefined,
    description: pickStr('description') || undefined,
    status: pickStr('status') || undefined,
    appointedAt: pickStr('appointedAt', 'appointed_at', 'createdAt', 'created_at') || undefined
  }
}

async function loadData(page = currentPage.value) {
  loading.value = true
  loadError.value = ''
  try {
    const res = await adminBuildingLeaderApi.list({
      page,
      pageSize: PAGE_SIZE,
      keyword: keyword.value.trim() || undefined,
      status: status.value || undefined,
      building: building.value || undefined
    })
    list.value = (res.list || []).map((item) => normalizeItem(item))
    total.value = res.pagination?.total ?? list.value.length
    currentPage.value = res.pagination?.page ?? page
    totalPages.value = res.pagination?.totalPages ?? 1
  } catch (error) {
    loadError.value = formatApiError(error, '楼长列表加载失败，请重试')
  } finally {
    loading.value = false
  }
}

function applyFilters() {
  currentPage.value = 1
  void loadData(1)
}

function changePage(page: number) {
  if (page < 1 || page > totalPages.value || page === currentPage.value) return
  currentPage.value = page
  void loadData(page)
}

function onResidentSelect(item: ResidentItem) {
  form.residentId = item.id
  if (!form.communityId && item.communityId) form.communityId = item.communityId
  if (!form.building && item.building) form.building = item.building
}

function openCreate() {
  editingId.value = ''
  formError.value = ''
  Object.assign(form, {
    residentId: '',
    communityId: '',
    building: '',
    commissionRate: 0.1,
    description: '',
    status: 'active'
  })
  modalOpen.value = true
}

function openEdit(item: BuildingLeaderListItem) {
  editingId.value = item.id
  editingName.value = item.residentName || item.residentId || '—'
  editingScope.value = `${item.communityName || item.communityId || '—'} / ${item.building || '—'}`
  formError.value = ''
  Object.assign(form, {
    residentId: item.residentId || '',
    communityId: item.communityId || '',
    building: item.building || '',
    commissionRate: Number(item.commissionRate ?? 0.1) || 0.1,
    description: item.description || '',
    status: item.status || 'active'
  })
  modalOpen.value = true
}

function closeModal() {
  modalOpen.value = false
  formError.value = ''
}

function validateForm(isCreate: boolean) {
  if (isCreate && !form.residentId) {
    formError.value = '请选择住户'
    return false
  }
  const rate = Number(form.commissionRate)
  if (!Number.isFinite(rate) || rate <= 0 || rate > 1) {
    formError.value = '分成比例须大于 0 且不超过 1'
    return false
  }
  if (form.status && form.status !== 'active' && form.status !== 'inactive') {
    formError.value = '状态不合法'
    return false
  }
  return true
}

async function submit() {
  const isCreate = !editingId.value
  if (!validateForm(isCreate)) return

  saving.value = true
  formError.value = ''
  try {
    if (isCreate) {
      await adminBuildingLeaderApi.create({
        residentId: form.residentId,
        communityId: form.communityId || undefined,
        building: form.building || undefined,
        commissionRate: Number(form.commissionRate),
        description: form.description || undefined
      })
    } else {
      await adminBuildingLeaderApi.update(editingId.value, {
        commissionRate: Number(form.commissionRate),
        description: form.description || undefined,
        status: form.status || undefined
      })
    }
    closeModal()
    await loadData(currentPage.value)
  } catch (error) {
    formError.value = formatApiError(error, '保存失败')
  } finally {
    saving.value = false
  }
}

async function revoke(item: BuildingLeaderListItem) {
  const label = item.residentName || item.residentPhone || item.id
  const reason = window.prompt(
    `确认撤销楼长「${label}」？\n撤销后该楼栋可重新指派；已产生订单仍按下单快照结算。\n如需撤销原因请填写（可选）：`
  )
  if (reason === null) return
  try {
    loadError.value = ''
    await adminBuildingLeaderApi.revoke(item.id, reason.trim() || undefined)
    await loadData(currentPage.value)
  } catch (error) {
    loadError.value = formatApiError(error, '撤销失败')
  }
}

onMounted(() => {
  void loadData(1)
})
</script>

<style scoped>
.page { max-width: 1200px; }
.header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; gap: 12px; flex-wrap: wrap; }
.title { margin: 0 0 8px; font-size: 22px; color: #1f1f2e; }
.desc { margin: 0; color: #8c8c9a; font-size: 14px; max-width: 640px; }
.tablePanel { overflow: hidden; background: #fff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,.04); }
.toolbar { display: flex; align-items: center; gap: 12px; padding: 16px 20px; border-bottom: 1px solid #f0f0f3; flex-wrap: wrap; }
.search { display: flex; align-items: center; min-width: 260px; flex: 1; padding: 0 10px; border: 1px solid #e8e8ec; border-radius: 8px; }
.search input { min-width: 0; flex: 1; padding: 9px 8px; border: none; outline: none; }
.searchBtn { border: none; background: transparent; color: #5c5c9e; cursor: pointer; }
.filterSelect, .filterInput { padding: 9px 10px; border: 1px solid #e8e8ec; border-radius: 8px; background: #fff; }
.filterInput { min-width: 130px; }
.tableScroll { overflow-x: auto; }
.content { width: 100%; min-width: 980px; border-collapse: collapse; font-size: 14px; }
.content th, .content td { padding: 12px 14px; border-bottom: 1px solid #f0f0f3; text-align: left; }
.content th { color: #8c8c9a; font-weight: 500; background: #fafafc; }
.subText { margin-top: 3px; color: #a5a5ae; font-size: 12px; }
.statusBadge { display: inline-block; padding: 4px 9px; border-radius: 10px; white-space: nowrap; }
.statusBadge.active { color: #28845f; background: #ecfaf4; }
.statusBadge.inactive { color: #8c8c9a; background: #f2f2f5; }
.linkBtn { border: none; background: none; color: #5c5c9e; cursor: pointer; margin-right: 8px; }
.linkBtn.danger { color: #e05c5c; }
.emptyCell { padding: 36px !important; text-align: center !important; color: #8c8c9a; }
.errorCell { color: #e05c5c; }
.retryBtn { margin-top: 8px; padding: 6px 12px; border: none; border-radius: 6px; background: #5c5c9e; color: #fff; cursor: pointer; }
.footer { display: flex; justify-content: space-between; align-items: center; padding: 14px 20px; color: #8c8c9a; font-size: 13px; }
.pagination { display: flex; align-items: center; gap: 10px; }
.pageBtn { padding: 5px 10px; border: 1px solid #e8e8ec; border-radius: 6px; background: #fff; cursor: pointer; }
.pageBtn:disabled { opacity: .45; cursor: not-allowed; }
.modalOverlay { position: fixed; inset: 0; z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px; background: rgba(0,0,0,.45); }
.modal { width: min(520px, 100%); max-height: 90vh; overflow-y: auto; background: #fff; border-radius: 12px; }
.modalHeader { display: flex; align-items: center; justify-content: space-between; padding: 18px 22px; border-bottom: 1px solid #f0f0f3; }
.modalHeader h3 { margin: 0; font-size: 17px; }
.modalClose { border: none; background: none; color: #8c8c9a; font-size: 24px; cursor: pointer; }
.modalBody { padding: 22px; }
.field { margin-bottom: 14px; }
.fieldRow { display: flex; gap: 12px; }
.fieldRow .half { flex: 1; }
.fieldLabel { display: block; margin-bottom: 6px; color: #5c5c66; font-size: 13px; }
.fieldLabel em { color: #e05c5c; font-style: normal; }
.fieldHint { margin: 6px 0 0; font-size: 12px; color: #8c8c9a; }
.input { width: 100%; padding: 9px 12px; border: 1px solid #e8e8ec; border-radius: 8px; box-sizing: border-box; }
.textarea { width: 100%; padding: 9px 12px; border: 1px solid #e8e8ec; border-radius: 8px; box-sizing: border-box; resize: vertical; }
.auditInfo { padding: 12px 14px; border-radius: 8px; background: #fafafc; margin-bottom: 14px; }
.auditInfo div { display: flex; justify-content: space-between; gap: 16px; padding: 5px 0; }
.auditInfo span { color: #8c8c9a; }
.formError { color: #e05c5c; font-size: 13px; }
.modalFooter { display: flex; justify-content: flex-end; gap: 10px; margin-top: 16px; }
.btnPrimary, .btnSecondary { padding: 9px 16px; border-radius: 8px; cursor: pointer; }
.btnPrimary { border: none; background: #5c5c9e; color: #fff; }
.btnSecondary { border: 1px solid #e8e8ec; background: #fff; }
.btnPrimary:disabled { opacity: .55; cursor: not-allowed; }
@media (max-width: 640px) {
  .toolbar { align-items: stretch; }
  .search { min-width: 100%; }
  .fieldRow { flex-direction: column; gap: 0; }
}
</style>
