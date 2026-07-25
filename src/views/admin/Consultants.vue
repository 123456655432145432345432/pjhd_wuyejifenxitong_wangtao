<template>
  <div class="page">
    <div class="header">
      <div>
        <h1 class="title">咨询师管理</h1>
        <p class="desc">医疗 / 教育 / 养老咨询师入驻审核与平台抽成配置</p>
      </div>
      <div class="headerActions">
        <button type="button" class="btnSecondary" @click="openSettings">抽成设置</button>
        <button type="button" class="btnPrimary" @click="openCreate">新增咨询师</button>
      </div>
    </div>

    <div class="filters">
      <select v-model="categoryFilter" class="filterSelect" @change="loadList(1)">
        <option value="">全部领域</option>
        <option v-for="opt in CONSULTATION_CATEGORY_OPTIONS" :key="opt.value" :value="opt.value">
          {{ opt.label }}
        </option>
      </select>
      <input
        v-model="keyword"
        class="filterInput"
        placeholder="搜索姓名/机构"
        @keyup.enter="loadList(1)"
      />
      <button type="button" class="btnSecondary" @click="loadList(1)">搜索</button>
    </div>

    <div class="panel">
      <div v-if="loading" class="hint">加载中...</div>
      <p v-else-if="error" class="error">{{ error }}</p>
      <table v-else-if="list.length" class="table">
        <thead>
          <tr>
            <th>姓名</th>
            <th>领域</th>
            <th>职称/机构</th>
            <th>图文价</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in list" :key="item.id">
            <td>{{ item.name }}</td>
            <td>{{ getEnumLabel(CONSULTATION_CATEGORY_LABEL, item.category) }}</td>
            <td>{{ item.title || '—' }} · {{ item.organization || '—' }}</td>
            <td>{{ item.chatPrice ?? '—' }}</td>
            <td>{{ item.status || item.auditStatus || item.statusCode || '—' }}</td>
            <td class="actions">
              <button type="button" class="linkBtn" @click="openEdit(item)">编辑</button>
              <button type="button" class="linkBtn" @click="audit(item.id, AUDIT_RESULT.APPROVED)">通过</button>
              <button type="button" class="linkBtn danger" @click="audit(item.id, AUDIT_RESULT.REJECTED)">
                拒绝
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else class="hint">暂无咨询师</p>
    </div>

    <Teleport to="body">
      <div v-if="modalOpen" class="modalOverlay" @click.self="modalOpen = false">
        <div class="modal">
          <div class="modalHeader">
            <h3 class="modalTitle">{{ editingId ? '编辑咨询师' : '新增咨询师' }}</h3>
            <button type="button" class="modalClose" @click="modalOpen = false">&times;</button>
          </div>
          <div class="modalBody">
            <div class="field">
              <label class="label">姓名</label>
              <input v-model="form.name" class="input" />
            </div>
            <div class="field">
              <label class="label">领域</label>
              <select v-model="form.category" class="input">
                <option v-for="opt in CONSULTATION_CATEGORY_OPTIONS" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
            </div>
            <div class="field">
              <label class="label">职称</label>
              <input v-model="form.title" class="input" />
            </div>
            <div class="field">
              <label class="label">机构</label>
              <input v-model="form.organization" class="input" />
            </div>
            <div class="field">
              <label class="label">专长</label>
              <input v-model="form.specialty" class="input" />
            </div>
            <div class="field">
              <label class="label">头像 URL</label>
              <input v-model="form.avatarUrl" class="input" />
            </div>
            <div class="fieldRow">
              <div class="field">
                <label class="label">图文咨询价格</label>
                <input v-model.number="form.chatPrice" type="number" min="0" class="input" />
              </div>
              <div class="field">
                <label class="label">面诊价格</label>
                <input v-model.number="form.appointmentPrice" type="number" min="0" class="input" />
              </div>
            </div>
            <label class="checkbox">
              <input v-model="form.appointmentEnabled" type="checkbox" />
              <span>开放预约面诊</span>
            </label>
            <div class="field">
              <label class="label">简介</label>
              <textarea v-model="form.introduction" class="textarea" rows="3" />
            </div>
            <p v-if="formError" class="error">{{ formError }}</p>
            <div class="modalFooter">
              <button type="button" class="btnSecondary" @click="modalOpen = false">取消</button>
              <button type="button" class="btnPrimary" :disabled="saving" @click="submit">
                {{ saving ? '保存中...' : '保存' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="settingsOpen" class="modalOverlay" @click.self="settingsOpen = false">
        <div class="modal">
          <div class="modalHeader">
            <h3 class="modalTitle">咨询抽成设置</h3>
            <button type="button" class="modalClose" @click="settingsOpen = false">&times;</button>
          </div>
          <div class="modalBody">
            <div class="field">
              <label class="label">平台抽成比例（0~1，如 0.1 = 10%）</label>
              <input v-model.number="commissionRate" type="number" min="0" max="1" step="0.01" class="input" />
            </div>
            <p v-if="settingsError" class="error">{{ settingsError }}</p>
            <div class="modalFooter">
              <button type="button" class="btnSecondary" @click="settingsOpen = false">取消</button>
              <button type="button" class="btnPrimary" :disabled="settingsSaving" @click="saveSettings">
                {{ settingsSaving ? '保存中...' : '保存' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { consultationAdminApi } from '../../api/services'
import { ApiError } from '../../api/request'
import type { ConsultantItem } from '../../api/types'
import {
  AUDIT_RESULT,
  CONSULTATION_CATEGORY,
  CONSULTATION_CATEGORY_LABEL,
  CONSULTATION_CATEGORY_OPTIONS,
  getEnumLabel
} from '../../constants/enums'

const loading = ref(false)
const error = ref('')
const list = ref<ConsultantItem[]>([])
const categoryFilter = ref('')
const keyword = ref('')

const modalOpen = ref(false)
const editingId = ref('')
const saving = ref(false)
const formError = ref('')
const form = ref({
  name: '',
  category: CONSULTATION_CATEGORY.MEDICAL,
  title: '',
  organization: '',
  specialty: '',
  avatarUrl: '',
  chatPrice: 0,
  appointmentPrice: 0,
  appointmentEnabled: true,
  introduction: '',
  phone: ''
})

const settingsOpen = ref(false)
const settingsSaving = ref(false)
const settingsError = ref('')
const commissionRate = ref(0)

function resolveError(e: unknown) {
  if (e instanceof ApiError) return e.message
  if (e instanceof Error) return e.message
  return '操作失败'
}

async function loadList(page = 1) {
  loading.value = true
  error.value = ''
  try {
    const res = await consultationAdminApi.list({
      page,
      pageSize: 50,
      category: categoryFilter.value || undefined,
      keyword: keyword.value.trim() || undefined
    })
    list.value = res.list || []
  } catch (e) {
    error.value = resolveError(e)
    list.value = []
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editingId.value = ''
  form.value = {
    name: '',
    category: CONSULTATION_CATEGORY.MEDICAL,
    title: '',
    organization: '',
    specialty: '',
    avatarUrl: '',
    chatPrice: 0,
    appointmentPrice: 0,
    appointmentEnabled: true,
    introduction: '',
    phone: ''
  }
  formError.value = ''
  modalOpen.value = true
}

function openEdit(item: ConsultantItem) {
  editingId.value = item.id
  form.value = {
    name: item.name || '',
    category: item.category || CONSULTATION_CATEGORY.MEDICAL,
    title: item.title || '',
    organization: item.organization || '',
    specialty: item.specialty || '',
    avatarUrl: item.avatarUrl || '',
    chatPrice: item.chatPrice ?? 0,
    appointmentPrice: item.appointmentPrice ?? 0,
    appointmentEnabled: item.appointmentEnabled !== false,
    introduction: '',
    phone: ''
  }
  formError.value = ''
  modalOpen.value = true
}

async function submit() {
  if (!form.value.name.trim()) {
    formError.value = '请填写姓名'
    return
  }
  saving.value = true
  formError.value = ''
  const payload = {
    name: form.value.name.trim(),
    category: form.value.category,
    title: form.value.title.trim() || undefined,
    organization: form.value.organization.trim() || undefined,
    specialty: form.value.specialty.trim() || undefined,
    avatarUrl: form.value.avatarUrl.trim() || undefined,
    chatPrice: form.value.chatPrice,
    appointmentPrice: form.value.appointmentPrice,
    appointmentEnabled: form.value.appointmentEnabled,
    introduction: form.value.introduction.trim() || undefined,
    phone: form.value.phone.trim() || undefined
  }
  try {
    if (editingId.value) {
      await consultationAdminApi.update(editingId.value, payload)
    } else {
      await consultationAdminApi.create(payload)
    }
    modalOpen.value = false
    await loadList()
  } catch (e) {
    formError.value = resolveError(e)
  } finally {
    saving.value = false
  }
}

async function audit(id: string, result: string) {
  try {
    await consultationAdminApi.audit(id, result)
    await loadList()
  } catch (e) {
    error.value = resolveError(e)
  }
}

async function openSettings() {
  settingsOpen.value = true
  settingsError.value = ''
  try {
    const data = await consultationAdminApi.getSettings()
    commissionRate.value = data.commissionRate ?? 0
  } catch (e) {
    settingsError.value = resolveError(e)
  }
}

async function saveSettings() {
  settingsSaving.value = true
  settingsError.value = ''
  try {
    await consultationAdminApi.updateSettings({ commissionRate: commissionRate.value })
    settingsOpen.value = false
  } catch (e) {
    settingsError.value = resolveError(e)
  } finally {
    settingsSaving.value = false
  }
}

onMounted(() => loadList())
</script>

<style scoped>
.page { max-width: 1200px; }
.header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 24px; gap: 16px; flex-wrap: wrap; }
.headerActions { display: flex; gap: 8px; flex-wrap: wrap; }
.title { font-size: 24px; font-weight: 600; color: #1f1f2e; margin: 0 0 8px; }
.desc { font-size: 14px; color: #8c8c9a; margin: 0; }
.filters { display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; align-items: center; }
.filterSelect, .filterInput { padding: 10px 14px; border: 1px solid #e8e8ec; border-radius: 8px; background: #ffffff; color: #1f1f2e; font-size: 14px; outline: none; min-width: 160px; }
.filterInput { flex: 1; max-width: 320px; }
.filterSelect:focus, .filterInput:focus { border-color: #5c5c9e; }
.panel { background: #fff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); overflow: hidden; overflow-x: auto; }
.table { width: 100%; border-collapse: collapse; font-size: 14px; min-width: 800px; }
.table th, .table td { padding: 14px 24px; text-align: left; vertical-align: middle; border-bottom: 1px solid #f0f0f3; }
.table th { color: #8c8c9a; font-weight: 500; background: #fafafc; }
.table tbody td { color: #1f1f2e; }
.table tbody tr:last-child td { border-bottom: none; }
.actions { display: flex; gap: 12px; flex-wrap: wrap; }
.linkBtn { border: none; background: none; color: #5c5c9e; cursor: pointer; padding: 0; font-size: 14px; }
.linkBtn.danger { color: #e05c5c; }
.btnPrimary { padding: 10px 18px; border-radius: 8px; border: none; background: #5c5c9e; color: #ffffff; font-size: 14px; cursor: pointer; transition: background 0.2s; }
.btnPrimary:hover { background: #52529a; }
.btnPrimary:disabled { opacity: 0.6; cursor: not-allowed; }
.btnSecondary { padding: 10px 18px; border-radius: 8px; border: 1px solid #e8e8ec; background: #ffffff; color: #5c5c66; font-size: 14px; cursor: pointer; }
.btnSecondary:hover { border-color: #5c5c9e; color: #5c5c9e; }
.hint { color: #8c8c9a; font-size: 14px; padding: 24px; margin: 0; }
.error { color: #e05c5c; font-size: 14px; }
.modalOverlay { position: fixed; inset: 0; z-index: 1000; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; padding: 24px; }
.modal { width: min(560px, 100%); max-height: 90vh; background: #fff; border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.12); overflow: auto; display: flex; flex-direction: column; }
.modalHeader { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid #f0f0f3; flex-shrink: 0; }
.modalTitle { font-size: 16px; font-weight: 600; color: #1f1f2e; margin: 0; }
.modalClose { width: 32px; height: 32px; border: none; background: transparent; font-size: 24px; line-height: 1; color: #8c8c9a; cursor: pointer; }
.modalClose:hover { color: #1f1f2e; }
.modalBody { padding: 24px; display: flex; flex-direction: column; gap: 16px; }
.modalFooter { display: flex; justify-content: flex-end; gap: 12px; padding-top: 8px; }
.field, .fieldRow { display: flex; flex-direction: column; gap: 8px; }
.fieldRow { flex-direction: row; gap: 12px; }
.fieldRow .field { flex: 1; }
.label { font-size: 13px; font-weight: 500; color: #5c5c66; }
.input, .textarea { width: 100%; border: 1px solid #e8e8ec; border-radius: 8px; padding: 10px 12px; font-size: 14px; color: #1f1f2e; background: #ffffff; outline: none; box-sizing: border-box; font-family: inherit; }
.input:focus, .textarea:focus { border-color: #5c5c9e; }
.textarea { resize: vertical; min-height: 80px; }
.checkbox { display: inline-flex; align-items: center; gap: 8px; font-size: 14px; color: #5c5c66; cursor: pointer; }
.checkbox input { accent-color: #5c5c9e; }
</style>
