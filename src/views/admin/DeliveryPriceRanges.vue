<template>
  <div class="page" :class="{ mobilePage: isMobile }">
    <div class="header">
      <div>
        <h1 class="title">配送价格区间</h1>
        <p class="desc">按距离与配送范围配置价格区间；重叠校验按「距离 + 范围」组合独立判断（§76）</p>
      </div>
      <button
        class="btnPrimary"
        :disabled="isPlatformAdmin && !selectedPropertyId"
        @click="openCreate"
      >
        新增区间
      </button>
    </div>

    <div class="toolbar">
      <select v-if="isPlatformAdmin" v-model="selectedPropertyId" class="input" @change="load">
        <option value="">{{ propertyCompanies.length ? '请选择物业公司' : '暂无物业公司' }}</option>
        <option v-for="pc in propertyCompanies" :key="pc.id" :value="String(pc.id)">{{ pc.name || pc.id }}</option>
      </select>
      <select v-model="filterDistanceType" class="input" @change="load">
        <option value="">全部距离</option>
        <option v-for="opt in distanceOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
      </select>
      <select v-model="filterDeliveryScope" class="input" @change="load">
        <option value="">全部范围</option>
        <option v-for="opt in scopeOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
      </select>
      <button class="btnSecondary" :disabled="loading" @click="load">刷新</button>
    </div>

    <div class="panel">
      <p v-if="error" class="error">{{ error }}</p>
      <div v-else-if="isPlatformAdmin && !selectedPropertyId" class="hint">请先选择物业公司</div>
      <div v-else-if="loading" class="hint">加载中...</div>
      <div v-else-if="list.length && isMobile" class="mobileList">
        <article v-for="item in list" :key="item.id" class="mobileCard">
          <div class="mobileCardHead">
            <strong>¥{{ formatMoney(item.minPrice) }} ~ ¥{{ formatMoney(item.maxPrice) }}</strong>
            <span class="mobileStatus">{{ getEnumLabel(ENTITY_STATUS_LABEL, item.status, '启用') }}</span>
          </div>
          <div class="mobileMeta">
            <span>距离：{{ labelDistance(item.distanceType) }}</span>
            <span>范围：{{ labelScope(item.deliveryScope) }}</span>
            <span>创建：{{ item.createdAt || '—' }}</span>
          </div>
          <div class="mobileActions">
            <button class="linkBtn" @click="openEdit(item)">编辑</button>
            <button class="linkBtn danger" @click="removeItem(item)">删除</button>
          </div>
        </article>
      </div>
      <div v-else-if="list.length" class="tableWrap">
        <table class="table">
          <thead>
            <tr>
              <th>最低价</th>
              <th>最高价</th>
              <th>距离</th>
              <th>范围</th>
              <th>状态</th>
              <th>创建时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in list" :key="item.id">
              <td>¥{{ formatMoney(item.minPrice) }}</td>
              <td>¥{{ formatMoney(item.maxPrice) }}</td>
              <td>{{ labelDistance(item.distanceType) }}</td>
              <td>{{ labelScope(item.deliveryScope) }}</td>
              <td>{{ getEnumLabel(ENTITY_STATUS_LABEL, item.status, '启用') }}</td>
              <td>{{ item.createdAt || '—' }}</td>
              <td>
                <button class="linkBtn" @click="openEdit(item)">编辑</button>
                <button class="linkBtn danger" @click="removeItem(item)">删除</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else class="hint">暂无价格区间</p>
    </div>

    <Teleport to="body">
      <div v-if="modalOpen" class="modalOverlay" @click.self="closeModal">
        <div class="modal">
          <div class="modalHeader">
            <h3 class="modalTitle">{{ editingId ? '编辑价格区间' : '新增价格区间' }}</h3>
            <button class="modalClose" type="button" @click="closeModal">&times;</button>
          </div>
          <div class="modalBody">
            <div class="fieldRow">
              <div class="field">
                <label class="label">最低价（元）</label>
                <input v-model.number="form.minPrice" type="number" min="0" step="0.01" class="input" />
              </div>
              <div class="field">
                <label class="label">最高价（元）</label>
                <input v-model.number="form.maxPrice" type="number" min="0" step="0.01" class="input" />
              </div>
            </div>
            <div class="field">
              <label class="label">距离类型</label>
              <select v-model="form.distanceType" class="input">
                <option v-for="opt in distanceOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
              </select>
            </div>
            <div class="field">
              <label class="label">配送范围</label>
              <select v-model="form.deliveryScope" class="input">
                <option v-for="opt in scopeOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
              </select>
            </div>
            <p class="formHint">同一「距离 + 范围」组合下价格区间不可重叠。</p>
            <p v-if="formError" class="error">{{ formError }}</p>
            <div class="modalFooter">
              <button class="btnSecondary" type="button" @click="closeModal">取消</button>
              <button class="btnPrimary" type="button" :disabled="saving" @click="submit">
                {{ saving ? '保存中...' : '保存' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { deliveryPriceRangeApi, deliveryRulesApi, propertyCompanyApi } from '../../api/services'
import type { DeliveryPriceRangeItem, PropertyCompanyItem } from '../../api/types'
import { ApiError, formatApiError } from '../../api/request'
import {
  DELIVERY_SCOPE,
  DELIVERY_SCOPE_LABEL,
  DELIVERY_SCOPE_OPTIONS,
  DISTANCE_TYPE,
  DISTANCE_TYPE_LABEL,
  DISTANCE_TYPE_OPTIONS,
  ENTITY_STATUS,
  ENTITY_STATUS_LABEL,
  USER_ROLE,
  getEnumLabel
} from '../../constants/enums'
import { useAuthStore } from '../../stores/auth'
import { useIsMobile } from '../../composables/useIsMobile'

const auth = useAuthStore()
const { isMobile } = useIsMobile()
const isPlatformAdmin = computed(() => auth.profile?.role === USER_ROLE.PLATFORM_ADMIN)

const loading = ref(false)
const error = ref('')
const list = ref<DeliveryPriceRangeItem[]>([])
const propertyCompanies = ref<PropertyCompanyItem[]>([])
const selectedPropertyId = ref('')
const filterDistanceType = ref('')
const filterDeliveryScope = ref('')

const distanceOptions = ref([...DISTANCE_TYPE_OPTIONS])
const scopeOptions = ref([...DELIVERY_SCOPE_OPTIONS])

const modalOpen = ref(false)
const editingId = ref('')
const saving = ref(false)
const formError = ref('')
const form = reactive({
  minPrice: 0,
  maxPrice: 0,
  distanceType: DISTANCE_TYPE.ANY as string,
  deliveryScope: DELIVERY_SCOPE.BOTH as string
})

function formatMoney(val?: number) {
  if (val === undefined || val === null) return '0.00'
  return Number(val).toFixed(2)
}

function labelDistance(code?: string) {
  return getEnumLabel(DISTANCE_TYPE_LABEL, code, '不限')
}

function labelScope(code?: string) {
  return getEnumLabel(DELIVERY_SCOPE_LABEL, code, '小区内外')
}

function resolvePropertyCompanyId() {
  if (isPlatformAdmin.value) return selectedPropertyId.value || ''
  return auth.propertyCompanyId || selectedPropertyId.value || ''
}

async function loadScopeOptions() {
  try {
    const data = await deliveryRulesApi.scopeOptions()
    if (data.distanceTypes?.length) {
      distanceOptions.value = data.distanceTypes.map((item) => ({
        value: item.code,
        label: item.description
      }))
    }
    if (data.deliveryScopes?.length) {
      scopeOptions.value = data.deliveryScopes.map((item) => ({
        value: item.code,
        label: item.description
      }))
    }
  } catch {
    // 字典失败时回退本地枚举
  }
}

async function loadPropertyCompanies() {
  if (!isPlatformAdmin.value) return
  try {
    // 第二参须带 Token；测服无 Token 会返回空列表
    const res = await propertyCompanyApi.list(
      { page: 1, pageSize: 100, status: ENTITY_STATUS.ACTIVE, sort: '-createdAt' },
      true
    )
    propertyCompanies.value = res.list || []
    if (!selectedPropertyId.value) {
      const preferred =
        auth.propertyCompanyId ||
        auth.profile?.propertyCompanyId ||
        propertyCompanies.value[0]?.id ||
        ''
      selectedPropertyId.value = preferred ? String(preferred) : ''
    }
  } catch (e) {
    propertyCompanies.value = []
    error.value = formatApiError(e, '物业列表加载失败')
  }
}

async function load() {
  const propertyCompanyId = resolvePropertyCompanyId()
  if (isPlatformAdmin.value && !propertyCompanyId) {
    list.value = []
    return
  }

  loading.value = true
  error.value = ''
  try {
    list.value = await deliveryPriceRangeApi.list({
      propertyCompanyId: propertyCompanyId || undefined,
      status: ENTITY_STATUS.ACTIVE,
      distanceType: filterDistanceType.value || undefined,
      deliveryScope: filterDeliveryScope.value || undefined
    })
  } catch (e) {
    list.value = []
    error.value = formatApiError(e, '加载失败')
  } finally {
    loading.value = false
  }
}

function openCreate() {
  const propertyCompanyId = resolvePropertyCompanyId()
  if (isPlatformAdmin.value && !propertyCompanyId) {
    error.value = '请先选择物业公司'
    return
  }
  editingId.value = ''
  form.minPrice = 0
  form.maxPrice = 0
  form.distanceType = DISTANCE_TYPE.ANY
  form.deliveryScope = DELIVERY_SCOPE.BOTH
  formError.value = ''
  modalOpen.value = true
}

function openEdit(item: DeliveryPriceRangeItem) {
  editingId.value = item.id
  form.minPrice = Number(item.minPrice ?? 0)
  form.maxPrice = Number(item.maxPrice ?? 0)
  form.distanceType = item.distanceType || DISTANCE_TYPE.ANY
  form.deliveryScope = item.deliveryScope || DELIVERY_SCOPE.BOTH
  formError.value = ''
  modalOpen.value = true
}

function closeModal() {
  modalOpen.value = false
}

async function submit() {
  const propertyCompanyId = resolvePropertyCompanyId()
  if (!propertyCompanyId) {
    formError.value = '缺少物业公司'
    return
  }
  if (form.minPrice == null || form.maxPrice == null || Number(form.minPrice) < 0 || Number(form.maxPrice) < 0) {
    formError.value = '请填写有效的最低价与最高价'
    return
  }
  if (Number(form.minPrice) > Number(form.maxPrice)) {
    formError.value = '最低价不能高于最高价'
    return
  }

  saving.value = true
  formError.value = ''
  try {
    const payload = {
      minPrice: Number(form.minPrice),
      maxPrice: Number(form.maxPrice),
      propertyCompanyId,
      distanceType: form.distanceType || DISTANCE_TYPE.ANY,
      deliveryScope: form.deliveryScope || DELIVERY_SCOPE.BOTH
    }
    if (editingId.value) {
      await deliveryPriceRangeApi.update(editingId.value, payload)
    } else {
      await deliveryPriceRangeApi.create(payload)
    }
    closeModal()
    await load()
  } catch (e) {
    formError.value = e instanceof ApiError ? e.message : '保存失败'
  } finally {
    saving.value = false
  }
}

async function removeItem(item: DeliveryPriceRangeItem) {
  if (!confirm(`确认删除区间 ¥${formatMoney(item.minPrice)} ~ ¥${formatMoney(item.maxPrice)}？`)) return
  try {
    await deliveryPriceRangeApi.remove(item.id)
    await load()
  } catch (e) {
    error.value = formatApiError(e, '删除失败')
  }
}

onMounted(async () => {
  if (!isPlatformAdmin.value) {
    selectedPropertyId.value = auth.propertyCompanyId || ''
  }
  await Promise.all([loadScopeOptions(), loadPropertyCompanies()])
  await load()
})
</script>

<style scoped>
.page { max-width: 960px; min-width: 0; }
.header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; gap: 16px; flex-wrap: wrap; }
.title { font-size: 24px; font-weight: 600; color: #1f1f2e; margin-bottom: 8px; }
.desc { font-size: 14px; color: #8c8c9a; }
.toolbar { display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
.panel { background: #fff; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); min-width: 0; }
.tableWrap { width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
.table { width: 100%; min-width: 720px; border-collapse: collapse; font-size: 14px; }
.table th, .table td { padding: 12px 16px; text-align: left; border-bottom: 1px solid #f0f0f3; white-space: nowrap; }
.table th { color: #8c8c9a; font-weight: 500; background: #fafafc; }
.hint, .error { font-size: 14px; color: #8c8c9a; text-align: center; padding: 24px 0; }
.error { color: #e05c5c; text-align: left; padding: 0; }
.panel > .error { text-align: center; padding: 24px 0; }
.input { width: 100%; max-width: 240px; padding: 10px 14px; border: 1px solid #e8e8ec; border-radius: 8px; font-size: 14px; box-sizing: border-box; }
.btnPrimary, .btnSecondary { padding: 10px 18px; border-radius: 8px; font-size: 14px; cursor: pointer; }
.btnPrimary { border: none; background: #5c5c9e; color: #fff; }
.btnPrimary:disabled { opacity: 0.5; cursor: not-allowed; }
.btnSecondary { border: 1px solid #e8e8ec; background: #fff; color: #5c5c66; }
.linkBtn { border: none; background: none; color: #5c5c9e; cursor: pointer; font-size: 13px; margin-right: 8px; padding: 0; }
.linkBtn.danger { color: #e05c5c; }
.mobileList { display: flex; flex-direction: column; gap: 12px; }
.mobileCard { border: 1px solid #f0f0f3; border-radius: 12px; padding: 14px; background: #fafafc; }
.mobileCardHead { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 10px; }
.mobileCardHead strong { font-size: 15px; color: #1f1f2e; word-break: break-word; }
.mobileStatus { flex-shrink: 0; font-size: 12px; color: #5c5c9e; background: #f0f0ff; padding: 4px 10px; border-radius: 12px; }
.mobileMeta { display: flex; flex-direction: column; gap: 6px; font-size: 13px; color: #5c5c66; }
.mobileActions { margin-top: 10px; display: flex; gap: 12px; }
.modalOverlay { position: fixed; inset: 0; z-index: 1000; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; padding: 24px; }
.modal { width: min(480px, 100%); background: #fff; border-radius: 12px; overflow: hidden; }
.modalHeader { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid #f0f0f3; }
.modalTitle { margin: 0; font-size: 16px; }
.modalClose { border: none; background: none; font-size: 22px; cursor: pointer; color: #8c8c9a; }
.modalBody { padding: 20px; display: flex; flex-direction: column; gap: 14px; }
.field { display: flex; flex-direction: column; gap: 6px; }
.fieldRow { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.field .input, .modalBody .input { max-width: none; }
.label { font-size: 13px; color: #8c8c9a; }
.formHint { margin: 0; font-size: 12px; color: #8c8c9a; }
.modalFooter { display: flex; justify-content: flex-end; gap: 10px; margin-top: 4px; }

@media (max-width: 768px) {
  .page { max-width: none; }
  .header { flex-direction: column; margin-bottom: 12px; }
  .title { font-size: 21px; }
  .toolbar .input { width: 100%; max-width: none; }
  .header .btnPrimary { width: 100%; min-height: 44px; }
  .panel { padding: 12px; border-radius: 14px; }
  .fieldRow { grid-template-columns: 1fr; }
}
</style>
