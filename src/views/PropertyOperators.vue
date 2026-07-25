<template>
  <div class="page">
    <div class="header">
      <div>
        <h1 class="title">物业操作员</h1>
        <p class="desc">物业领导创建管理员账号，并分配管辖小区/楼栋与权限预设</p>
      </div>
      <button type="button" class="btnPrimary" @click="openCreate">创建管理员</button>
    </div>

    <div class="panel">
      <div v-if="loading" class="hint">加载中...</div>
      <p v-else-if="error" class="error">{{ error }}</p>
      <table v-else-if="list.length" class="table">
        <thead>
          <tr>
            <th>姓名</th>
            <th>手机号</th>
            <th>管辖小区</th>
            <th>管辖楼栋</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in list" :key="item.id">
            <td>{{ item.name || '—' }}</td>
            <td>{{ item.phone || '—' }}</td>
            <td>{{ formatCommunityIds(item.communityIds) }}</td>
            <td>{{ formatList(item.buildingNos) }}</td>
            <td>{{ item.status || item.statusCode || '—' }}</td>
            <td class="actions">
              <button type="button" class="linkBtn" @click="openScope(item)">改范围</button>
              <button
                type="button"
                class="linkBtn"
                @click="toggleStatus(item)"
              >
                {{ isActive(item) ? '停用' : '启用' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else class="hint">暂无操作员</p>
    </div>

    <Teleport to="body">
      <div v-if="modalOpen" class="modalOverlay" @click.self="modalOpen = false">
        <div class="modal">
          <div class="modalHeader">
            <h3 class="modalTitle">{{ editingId ? '更新管辖范围' : '创建管理员' }}</h3>
            <button type="button" class="modalClose" @click="modalOpen = false">&times;</button>
          </div>
          <div class="modalBody">
            <template v-if="!editingId">
              <div class="field">
                <label class="label">姓名</label>
                <input v-model="form.name" class="input" />
              </div>
              <div class="field">
                <label class="label">手机号</label>
                <input v-model="form.phone" class="input" />
              </div>
              <div class="field">
                <label class="label">初始密码</label>
                <input v-model="form.password" type="password" class="input" />
              </div>
            </template>
            <div class="field">
              <label class="label">管辖小区（不选=全公司）</label>
              <select
                v-model="form.communityIds"
                class="input selectMultiple"
                multiple
                :disabled="communitiesLoading || !communities.length"
              >
                <option v-if="communitiesLoading" disabled value="">加载小区中...</option>
                <option v-else-if="!communities.length" disabled value="">
                  {{ authStore.propertyCompanyId ? '暂无可用小区' : '未获取到物业公司，请重新登录' }}
                </option>
                <option v-for="c in communities" :key="c.id" :value="c.id">
                  {{ c.name || c.id }}
                </option>
              </select>
              <p class="fieldHint">按住 Ctrl / Cmd 可多选</p>
            </div>
            <div class="field">
              <label class="label">管辖楼栋（逗号分隔，空=不限）</label>
              <input v-model="form.buildingNosText" class="input" placeholder="1号楼,2号楼" />
            </div>
            <div class="field">
              <label class="label">权限预设编码（可选）</label>
              <input v-model="form.permissionPresetCode" class="input" placeholder="如 property_operator_default" />
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
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { propertyCompanyApi, propertyOperatorApi } from '../api/services'
import { ApiError } from '../api/request'
import type { PropertyCompanyCommunity, PropertyOperatorItem } from '../api/types'
import { ENTITY_STATUS } from '../constants/enums'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()

const loading = ref(false)
const error = ref('')
const list = ref<PropertyOperatorItem[]>([])

const communities = ref<PropertyCompanyCommunity[]>([])
const communitiesLoading = ref(false)

const modalOpen = ref(false)
const editingId = ref('')
const saving = ref(false)
const formError = ref('')
const form = ref({
  name: '',
  phone: '',
  password: '',
  communityIds: [] as string[],
  buildingNosText: '',
  permissionPresetCode: ''
})

function resolveError(e: unknown) {
  if (e instanceof ApiError) return e.message
  if (e instanceof Error) return e.message
  return '操作失败'
}

function parseCsv(text: string) {
  return text
    .split(/[,，\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
}

function formatList(list?: string[]) {
  if (!list?.length) return '全部'
  return list.join('、')
}

function formatCommunityIds(ids?: string[]) {
  if (!ids?.length) return '全部'
  return ids
    .map((id) => {
      const found = communities.value.find((c) => c.id === id)
      return found?.name || id
    })
    .join('、')
}

function isActive(item: PropertyOperatorItem) {
  const code = item.statusCode || item.status
  return code === ENTITY_STATUS.ACTIVE || code === '启用' || code === 'active'
}

async function loadCommunities() {
  const companyId = authStore.propertyCompanyId
  if (!companyId) {
    communities.value = []
    return
  }
  communitiesLoading.value = true
  try {
    const res = await propertyCompanyApi.communities(companyId)
    communities.value = res.list || []
  } catch (e) {
    communities.value = []
    if (modalOpen.value) {
      formError.value = resolveError(e) || '小区列表加载失败'
    }
  } finally {
    communitiesLoading.value = false
  }
}

async function loadList() {
  loading.value = true
  error.value = ''
  try {
    const res = await propertyOperatorApi.list({ page: 1, pageSize: 100 })
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
    phone: '',
    password: '',
    communityIds: [],
    buildingNosText: '',
    permissionPresetCode: ''
  }
  formError.value = ''
  modalOpen.value = true
  loadCommunities()
}

function openScope(item: PropertyOperatorItem) {
  editingId.value = item.id
  form.value = {
    name: item.name || '',
    phone: item.phone || '',
    password: '',
    communityIds: [...(item.communityIds || [])],
    buildingNosText: (item.buildingNos || []).join(','),
    permissionPresetCode: item.permissionPresetCode || ''
  }
  formError.value = ''
  modalOpen.value = true
  loadCommunities()
}

async function submit() {
  formError.value = ''
  const communityIds = form.value.communityIds.filter(Boolean)
  const buildingNos = parseCsv(form.value.buildingNosText)
  saving.value = true
  try {
    if (editingId.value) {
      await propertyOperatorApi.updateScope(editingId.value, {
        communityIds: communityIds.length ? communityIds : undefined,
        buildingNos: buildingNos.length ? buildingNos : undefined,
        permissionPresetCode: form.value.permissionPresetCode.trim() || undefined
      })
    } else {
      if (!form.value.name.trim() || !form.value.phone.trim() || !form.value.password) {
        formError.value = '请填写姓名、手机号和初始密码'
        return
      }
      await propertyOperatorApi.create({
        name: form.value.name.trim(),
        phone: form.value.phone.trim(),
        password: form.value.password,
        communityIds: communityIds.length ? communityIds : undefined,
        buildingNos: buildingNos.length ? buildingNos : undefined,
        permissionPresetCode: form.value.permissionPresetCode.trim() || undefined
      })
    }
    modalOpen.value = false
    await loadList()
  } catch (e) {
    formError.value = resolveError(e)
  } finally {
    saving.value = false
  }
}

async function toggleStatus(item: PropertyOperatorItem) {
  const next = isActive(item) ? 'disabled' : ENTITY_STATUS.ACTIVE
  try {
    await propertyOperatorApi.updateStatus(item.id, next)
    await loadList()
  } catch (e) {
    error.value = resolveError(e)
  }
}

onMounted(() => {
  loadList()
  loadCommunities()
})
</script>

<style scoped>
.page { max-width: 1200px; }
.header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 24px; gap: 16px; flex-wrap: wrap; }
.title { font-size: 24px; font-weight: 600; color: #1f1f2e; margin: 0 0 8px; }
.desc { font-size: 14px; color: #8c8c9a; margin: 0; }
.panel { background: #fff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); overflow: hidden; overflow-x: auto; }
.table { width: 100%; border-collapse: collapse; font-size: 14px; min-width: 720px; }
.table th, .table td { padding: 14px 24px; text-align: left; vertical-align: middle; border-bottom: 1px solid #f0f0f3; }
.table th { color: #8c8c9a; font-weight: 500; background: #fafafc; }
.table tbody td { color: #1f1f2e; }
.table tbody tr:last-child td { border-bottom: none; }
.actions { display: flex; gap: 12px; flex-wrap: wrap; }
.hint { color: #8c8c9a; font-size: 14px; padding: 24px; margin: 0; }
.error { color: #e05c5c; font-size: 14px; padding: 24px; margin: 0; }
.linkBtn { border: none; background: none; color: #5c5c9e; padding: 0; cursor: pointer; font-size: 14px; }
.btnPrimary { padding: 10px 18px; border-radius: 8px; border: none; background: #5c5c9e; color: #ffffff; font-size: 14px; cursor: pointer; transition: background 0.2s; }
.btnPrimary:hover { background: #52529a; }
.btnPrimary:disabled { opacity: 0.6; cursor: not-allowed; }
.btnSecondary { padding: 10px 18px; border-radius: 8px; border: 1px solid #e8e8ec; background: #ffffff; color: #5c5c66; font-size: 14px; cursor: pointer; }
.btnSecondary:hover { border-color: #5c5c9e; color: #5c5c9e; }
.modalOverlay { position: fixed; inset: 0; z-index: 1000; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; padding: 24px; }
.modal { width: min(520px, 100%); max-height: 90vh; background: #fff; border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.12); overflow: auto; display: flex; flex-direction: column; }
.modalHeader { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid #f0f0f3; flex-shrink: 0; }
.modalTitle { font-size: 16px; font-weight: 600; color: #1f1f2e; margin: 0; }
.modalClose { width: 32px; height: 32px; border: none; background: transparent; font-size: 24px; line-height: 1; color: #8c8c9a; cursor: pointer; }
.modalClose:hover { color: #1f1f2e; }
.modalBody { padding: 24px; display: flex; flex-direction: column; gap: 16px; }
.modalFooter { display: flex; justify-content: flex-end; gap: 12px; padding-top: 8px; }
.field { display: flex; flex-direction: column; gap: 8px; }
.label { font-size: 13px; font-weight: 500; color: #5c5c66; }
.input { width: 100%; border: 1px solid #e8e8ec; border-radius: 8px; padding: 10px 12px; font-size: 14px; color: #1f1f2e; background: #ffffff; outline: none; box-sizing: border-box; font-family: inherit; }
.input:focus { border-color: #5c5c9e; }
.selectMultiple { min-height: 120px; }
.fieldHint { margin: 0; font-size: 12px; color: #8c8c9a; }
</style>
