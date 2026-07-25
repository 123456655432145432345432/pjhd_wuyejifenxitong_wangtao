<template>
  <div class="page">
    <div class="header">
      <div>
        <h1 class="title">配送价格区间</h1>
        <p class="desc">配置物业公司配送费价格区间</p>
      </div>
      <button class="btnPrimary" :disabled="!selectedPropertyId && isPlatformAdmin" @click="openCreate">
        新增区间
      </button>
    </div>

    <div v-if="isPlatformAdmin" class="toolbar">
      <select v-model="selectedPropertyId" class="input" @change="load">
        <option value="">请选择物业公司</option>
        <option v-for="pc in propertyCompanies" :key="pc.id" :value="pc.id">{{ pc.name }}</option>
      </select>
    </div>

    <div class="panel">
      <div v-if="isPlatformAdmin && !selectedPropertyId" class="hint">请先选择物业公司</div>
      <div v-else-if="loading" class="hint">加载中...</div>
      <p v-else-if="error" class="error">{{ error }}</p>
      <table v-else-if="list.length" class="table">
        <thead>
          <tr>
            <th>最低价</th>
            <th>最高价</th>
            <th>状态</th>
            <th>创建时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in list" :key="item.id">
            <td>¥{{ formatMoney(item.minPrice) }}</td>
            <td>¥{{ formatMoney(item.maxPrice) }}</td>
            <td>{{ getEnumLabel(ENTITY_STATUS_LABEL, item.status, '启用') }}</td>
            <td>{{ item.createdAt || '—' }}</td>
            <td>
              <button class="linkBtn" @click="openEdit(item)">编辑</button>
              <button class="linkBtn danger" @click="removeItem(item)">删除</button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else class="hint">暂无价格区间</p>
    </div>

    <Teleport to="body">
      <div v-if="modalOpen" class="modalOverlay" @click.self="closeModal">
        <div class="modal">
          <div class="modalHeader">
            <h3 class="modalTitle">{{ editingId ? '编辑价格区间' : '新增价格区间' }}</h3>
            <button class="modalClose" @click="closeModal">&times;</button>
          </div>
          <div class="modalBody">
            <div class="field">
              <label class="label">最低价 (元)</label>
              <input v-model.number="form.minPrice" type="number" min="0" step="0.01" class="input" />
            </div>
            <div class="field">
              <label class="label">最高价 (元)</label>
              <input v-model.number="form.maxPrice" type="number" min="0" step="0.01" class="input" />
            </div>
            <p v-if="formError" class="error">{{ formError }}</p>
            <div class="modalFooter">
              <button class="btnSecondary" @click="closeModal">取消</button>
              <button class="btnPrimary" :disabled="saving" @click="submitForm">{{ saving ? '保存中...' : '保存' }}</button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { deliveryPriceRangeApi, propertyCompanyApi } from '../../api/services'
import type { DeliveryPriceRangeItem, PropertyCompanyItem } from '../../api/types'
import { formatApiError } from '../../api/request'
import { ENTITY_STATUS, ENTITY_STATUS_LABEL, USER_ROLE, getEnumLabel } from '../../constants/enums'
import { useAuthStore } from '../../stores/auth'

const auth = useAuthStore()
const isPlatformAdmin = computed(() => auth.profile?.role === USER_ROLE.PLATFORM_ADMIN)

const loading = ref(false)
const error = ref('')
const list = ref<DeliveryPriceRangeItem[]>([])
const propertyCompanies = ref<PropertyCompanyItem[]>([])
const selectedPropertyId = ref('')

const modalOpen = ref(false)
const editingId = ref('')
const saving = ref(false)
const formError = ref('')
const form = ref({ minPrice: 0.1, maxPrice: 0.5 })

function formatMoney(val?: number) {
  if (val === undefined || val === null) return '0.00'
  return Number(val).toFixed(2)
}

function resolvePropertyCompanyId() {
  if (isPlatformAdmin.value) return selectedPropertyId.value || ''
  return auth.propertyCompanyId || selectedPropertyId.value || ''
}

async function loadPropertyCompanies() {
  if (!isPlatformAdmin.value) return
  try {
    const res = await propertyCompanyApi.list({ pageSize: 100 })
    propertyCompanies.value = res.list || []
    if (!selectedPropertyId.value && auth.propertyCompanyId) {
      selectedPropertyId.value = auth.propertyCompanyId
    }
  } catch (e) {
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
      status: ENTITY_STATUS.ACTIVE
    })
  } catch (e) {
    list.value = []
    error.value = formatApiError(e, '加载失败')
  } finally {
    loading.value = false
  }
}

function openCreate() {
  if (isPlatformAdmin.value && !selectedPropertyId.value) {
    error.value = '请先选择物业公司'
    return
  }
  editingId.value = ''
  form.value = { minPrice: 0.1, maxPrice: 0.5 }
  formError.value = ''
  modalOpen.value = true
}

function openEdit(item: DeliveryPriceRangeItem) {
  editingId.value = item.id
  form.value = { minPrice: item.minPrice ?? 0, maxPrice: item.maxPrice ?? 0 }
  formError.value = ''
  modalOpen.value = true
}

function closeModal() {
  modalOpen.value = false
}

async function submitForm() {
  const { minPrice, maxPrice } = form.value
  const propertyCompanyId = resolvePropertyCompanyId()
  if (isPlatformAdmin.value && !propertyCompanyId) {
    formError.value = '请先选择物业公司'
    return
  }
  if (!Number.isFinite(minPrice) || !Number.isFinite(maxPrice) || minPrice < 0 || maxPrice < 0) {
    formError.value = '请输入不小于 0 的有效价格'
    return
  }
  if (minPrice > maxPrice) {
    formError.value = '最低价须小于或等于最高价'
    return
  }
  const overlapping = list.value.find((item) => {
    if (item.id === editingId.value) return false
    const existingMin = Number(item.minPrice)
    const existingMax = Number(item.maxPrice)
    return Number.isFinite(existingMin)
      && Number.isFinite(existingMax)
      && minPrice <= existingMax
      && maxPrice >= existingMin
  })
  if (overlapping) {
    formError.value = `与现有区间 ¥${formatMoney(overlapping.minPrice)} ~ ¥${formatMoney(overlapping.maxPrice)} 重叠`
    return
  }
  saving.value = true
  formError.value = ''
  try {
    const payload = {
      minPrice,
      maxPrice,
      propertyCompanyId: propertyCompanyId || undefined
    }
    if (editingId.value) {
      await deliveryPriceRangeApi.update(editingId.value, payload)
    } else {
      await deliveryPriceRangeApi.create(payload)
    }
    closeModal()
    await load()
  } catch (e) {
    formError.value = formatApiError(e, '保存失败')
  } finally {
    saving.value = false
  }
}

async function removeItem(item: DeliveryPriceRangeItem) {
  if (!confirm(`确定删除 ¥${formatMoney(item.minPrice)} ~ ¥${formatMoney(item.maxPrice)} 区间？`)) return
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
  await loadPropertyCompanies()
  await load()
})
</script>

<style scoped>
.page { max-width: 960px; }
.header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; gap: 16px; flex-wrap: wrap; }
.title { font-size: 24px; font-weight: 600; color: #1f1f2e; margin-bottom: 8px; }
.desc { font-size: 14px; color: #8c8c9a; }
.toolbar { display: flex; gap: 12px; margin-bottom: 16px; }
.panel { background: #fff; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.table { width: 100%; border-collapse: collapse; font-size: 14px; }
.table th, .table td { padding: 12px 16px; text-align: left; border-bottom: 1px solid #f0f0f3; }
.table th { color: #8c8c9a; font-weight: 500; background: #fafafc; }
.linkBtn { border: none; background: none; color: #5c5c9e; cursor: pointer; font-size: 14px; margin-right: 8px; }
.linkBtn.danger { color: #e05c5c; }
.btnPrimary { padding: 10px 18px; border-radius: 8px; background: #5c5c9e; color: #fff; border: none; cursor: pointer; }
.btnPrimary:disabled { opacity: 0.6; cursor: not-allowed; }
.btnSecondary { padding: 10px 18px; border-radius: 8px; border: 1px solid #e8e8ec; background: #fff; cursor: pointer; }
.hint, .error { font-size: 14px; color: #8c8c9a; text-align: center; padding: 24px 0; }
.error { color: #e05c5c; }
.modalOverlay { position: fixed; inset: 0; z-index: 1000; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; padding: 24px; }
.modal { background: #fff; border-radius: 12px; width: min(400px, 100%); }
.modalHeader { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid #f0f0f3; }
.modalTitle { font-size: 16px; font-weight: 600; margin: 0; }
.modalClose { border: none; background: none; font-size: 24px; cursor: pointer; color: #8c8c9a; }
.modalBody { padding: 24px; }
.field { margin-bottom: 16px; }
.label { display: block; font-size: 13px; color: #5c5c66; margin-bottom: 8px; }
.input { width: 100%; max-width: 360px; padding: 10px 14px; border: 1px solid #e8e8ec; border-radius: 8px; font-size: 14px; box-sizing: border-box; }
.modalFooter { display: flex; justify-content: flex-end; gap: 12px; margin-top: 8px; }
</style>
