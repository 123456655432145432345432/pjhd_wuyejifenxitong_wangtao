<template>
  <div class="page" :class="{ mobilePage: isMobile }">
    <div class="header">
      <div>
        <h1 class="title">服务管理</h1>
        <p class="desc">管理社区服务项目</p>
      </div>
      <button class="btnPrimary" @click="openCreate">发布服务</button>
    </div>

    <div class="toolbar">
      <select v-model="categoryFilter" class="input" @change="reload">
        <option value="">全部分类</option>
        <option v-for="opt in SERVICE_CATEGORY_OPTIONS" :key="opt.value" :value="opt.value">
          {{ opt.label }}
        </option>
      </select>
      <select v-model="providerTypeFilter" class="input" @change="reload">
        <option v-for="opt in PROVIDER_TYPE_OPTIONS" :key="opt.value || 'all'" :value="opt.value">
          {{ opt.label }}
        </option>
      </select>
      <button class="btnGhost" :disabled="loading" @click="reload">刷新</button>
    </div>

    <div class="panel">
      <div v-if="loading" class="loading">加载中...</div>
      <p v-else-if="error" class="error">{{ error }}</p>
      <table v-else-if="services.length" class="table" :class="{ mobileCards: isMobile }">
        <thead>
          <tr>
            <th>服务名称</th>
            <th>分类</th>
            <th>提供者</th>
            <th>价格</th>
            <th>会员价</th>
            <th>单位</th>
            <th>状态</th>
            <th>创建时间</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in services" :key="item.id">
            <td>{{ item.name }}</td>
            <td>{{ getEnumLabel(SERVICE_CATEGORY_LABEL, item.category, item.categoryName || '—') }}</td>
            <td>
              <span v-if="item.providerType" class="providerTag" :class="item.providerType">
                {{ getEnumLabel(PROVIDER_TYPE_LABEL, item.providerType) }}
              </span>
              <span v-else>—</span>
            </td>
            <td>{{ item.price != null ? `¥${formatMoney(item.price)}` : '—' }}</td>
            <td>{{ item.memberPrice != null ? `¥${formatMoney(item.memberPrice)}` : '—' }}</td>
            <td>{{ item.priceUnit || '—' }}</td>
            <td>{{ item.status === ENTITY_STATUS.ACTIVE ? '上架' : getEnumLabel(ENTITY_STATUS_LABEL, item.status) }}</td>
            <td>{{ item.createdAt || '—' }}</td>
          </tr>
        </tbody>
      </table>
      <p v-else class="empty">暂无服务</p>
    </div>

    <Teleport to="body">
      <div v-if="modalOpen" class="modalOverlay" @click.self="closeModal">
        <div class="modal" :class="{ mobileSheet: isMobile }">
          <div class="modalHeader">
            <h3 class="modalTitle">发布服务</h3>
            <button class="modalClose" @click="closeModal">&times;</button>
          </div>
          <div class="modalBody">
            <p v-if="formError" class="error">{{ formError }}</p>
            <div class="field">
              <label class="label">服务名称</label>
              <input v-model="form.name" class="input" placeholder="如：家电维修" />
            </div>
            <div class="field">
              <label class="label">服务分类</label>
              <select v-model="form.category" class="input">
                <option v-for="opt in SERVICE_CATEGORY_OPTIONS" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
            </div>
            <div class="fieldRow">
              <div class="field">
                <label class="label">价格</label>
                <input v-model.number="form.price" type="number" min="0" step="0.01" class="input" />
              </div>
              <div class="field">
                <label class="label">会员价</label>
                <input v-model.number="form.memberPrice" type="number" min="0" step="0.01" class="input" />
              </div>
            </div>
            <div class="field">
              <label class="label">价格单位</label>
              <input v-model="form.priceUnit" class="input" placeholder="次 / 月 / 年" />
            </div>
            <div class="field">
              <label class="label">服务描述</label>
              <textarea v-model="form.description" class="textarea" rows="3" />
            </div>
          </div>
          <div class="modalFooter">
            <button class="btnGhost" @click="closeModal">取消</button>
            <button class="btnPrimary" :disabled="submitting" @click="submit">
              {{ submitting ? '发布中...' : '确认发布' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { serviceApi } from '../../api/services'
import type { CommunityServiceItem } from '../../api/types'
import { ApiError } from '../../api/request'
import {
  ENTITY_STATUS,
  ENTITY_STATUS_LABEL,
  getEnumLabel,
  PROVIDER_TYPE_LABEL,
  PROVIDER_TYPE_OPTIONS,
  SERVICE_CATEGORY,
  SERVICE_CATEGORY_LABEL,
  SERVICE_CATEGORY_OPTIONS
} from '../../constants/enums'
import { useIsMobile } from '../../composables/useIsMobile'

const services = ref<CommunityServiceItem[]>([])
const { isMobile } = useIsMobile()
const loading = ref(false)
const error = ref('')
const categoryFilter = ref('')
const providerTypeFilter = ref('')
const modalOpen = ref(false)
const submitting = ref(false)
const formError = ref('')
const form = reactive({
  name: '',
  category: SERVICE_CATEGORY.CLEANING_REPAIR,
  price: undefined as number | undefined,
  memberPrice: undefined as number | undefined,
  priceUnit: '次',
  description: ''
})

function formatMoney(value?: number) {
  if (value === undefined || value === null) return '0.00'
  return Number(value).toFixed(2)
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await serviceApi.list({
      page: 1,
      pageSize: 100,
      category: categoryFilter.value || undefined,
      providerType: providerTypeFilter.value || undefined,
      sort: '-createdAt'
    })
    services.value = res.list || []
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '服务加载失败'
  } finally {
    loading.value = false
  }
}

function reload() {
  load()
}

function openCreate() {
  form.name = ''
  form.category = SERVICE_CATEGORY.CLEANING_REPAIR
  form.price = undefined
  form.memberPrice = undefined
  form.priceUnit = '次'
  form.description = ''
  formError.value = ''
  modalOpen.value = true
}

function closeModal() {
  modalOpen.value = false
}

async function submit() {
  if (!form.name.trim()) {
    formError.value = '请填写服务名称'
    return
  }
  submitting.value = true
  formError.value = ''
  try {
    await serviceApi.create({
      name: form.name.trim(),
      category: form.category,
      price: form.price,
      memberPrice: form.memberPrice,
      priceUnit: form.priceUnit.trim() || undefined,
      description: form.description.trim() || undefined
    })
    closeModal()
    await load()
  } catch (e) {
    formError.value = e instanceof ApiError ? e.message : '发布失败，请确认是否有服务管理权限'
  } finally {
    submitting.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.page { max-width: 1200px; }
.header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 24px; }
.title { font-size: 24px; font-weight: 600; color: #1f1f2e; margin-bottom: 8px; }
.desc { font-size: 14px; color: #8c8c9a; }
.toolbar { display: flex; gap: 12px; margin-bottom: 16px; }
.input { padding: 8px 12px; border: 1px solid #e8e8ec; border-radius: 8px; background: #fff; }
.btnPrimary { padding: 10px 18px; border-radius: 8px; background: #5c5c9e; color: #fff; border: none; cursor: pointer; }
.btnPrimary:hover { background: #52529a; }
.btnGhost { padding: 8px 14px; border-radius: 8px; border: 1px solid #e8e8ec; background: #fff; color: #5c5c66; font-size: 14px; cursor: pointer; }
.btnGhost:hover { border-color: #5c5c9e; color: #5c5c9e; }
.panel { background: #fff; border-radius: 12px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.table { width: 100%; border-collapse: collapse; font-size: 14px; }
.table th, .table td { padding: 12px 10px; border-bottom: 1px solid #f0f0f3; text-align: left; }
.table th { color: #8c8c9a; font-weight: 500; }
.loading, .empty, .error { font-size: 14px; color: #8c8c9a; padding: 12px 0; }
.error { color: #e05c5c; }
.providerTag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 12px;
  background: #f4f5f7;
  color: #5c5c66;
}
.providerTag.technician { background: #eef6ff; color: #2f6fed; }
.providerTag.individual_leader { background: #f6ffed; color: #389e0d; }
.providerTag.merchant { background: #f5f5fb; color: #5c5c9e; }
.modalOverlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal { width: 520px; max-width: calc(100vw - 32px); background: #fff; border-radius: 12px; overflow: hidden; }
.modalHeader { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid #f0f0f3; }
.modalTitle { font-size: 16px; font-weight: 600; }
.modalClose { border: none; background: none; font-size: 22px; cursor: pointer; color: #8c8c9a; }
.modalBody { padding: 20px; }
.modalFooter { display: flex; justify-content: flex-end; gap: 10px; padding: 16px 20px; border-top: 1px solid #f0f0f3; }
.field { margin-bottom: 14px; }
.fieldRow { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.label { display: block; font-size: 13px; color: #8c8c9a; margin-bottom: 6px; }
.textarea { width: 100%; padding: 8px 12px; border: 1px solid #e8e8ec; border-radius: 8px; resize: vertical; box-sizing: border-box; }
@media (max-width: 768px) {
  .page { max-width: none; }
  .header { flex-direction: column; margin-bottom: 16px; }
  .title { font-size: 21px; }.header .btnPrimary { width: 100%; }
  .toolbar { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .toolbar .input, .toolbar .btnGhost { width: 100%; box-sizing: border-box; }
  .panel { padding: 12px; border-radius: 14px; }
  .mobileCards thead { display: none; }
  .mobileCards, .mobileCards tbody, .mobileCards tr, .mobileCards td { display: block; width: 100%; }
  .mobileCards tr { padding: 12px 0; border-bottom: 1px solid #f0f0f3; }
  .mobileCards td { display: flex; justify-content: space-between; gap: 12px; padding: 6px 0; }
  .mobileCards td::before { color: #8c8c9a; }
  .mobileCards td:nth-child(1)::before { content: '服务名称'; }.mobileCards td:nth-child(2)::before { content: '分类'; }
  .mobileCards td:nth-child(3)::before { content: '提供者'; }.mobileCards td:nth-child(4)::before { content: '价格'; }
  .mobileCards td:nth-child(5)::before { content: '会员价'; }.mobileCards td:nth-child(6)::before { content: '单位'; }
  .mobileCards td:nth-child(7)::before { content: '状态'; }.mobileCards td:nth-child(8)::before { content: '创建时间'; }
  .modalOverlay { padding: 0; align-items: flex-end; }.modal.mobileSheet { max-width: 100%; border-radius: 18px 18px 0 0; }
  .fieldRow { grid-template-columns: 1fr; }
}
</style>
