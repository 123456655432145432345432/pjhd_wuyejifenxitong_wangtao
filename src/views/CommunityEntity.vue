<template>
  <div class="page">
    <div class="header">
      <div>
        <h1 class="title">社区多物业绑定</h1>
        <p class="desc">社区与物业公司多对多绑定，并配置社区管理员对物业的权限</p>
      </div>
      <button type="button" class="btnPrimary" @click="openCreate">创建社区</button>
    </div>

    <div class="panel">
      <div v-if="loading" class="hint">加载中...</div>
      <p v-else-if="error" class="error">{{ error }}</p>
      <table v-else-if="list.length" class="table">
        <thead>
          <tr>
            <th>社区名称</th>
            <th>管理员</th>
            <th>绑定物业数</th>
            <th>创建时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in list" :key="item.id">
            <td>
              <div class="name">{{ item.name }}</div>
              <div class="sub">{{ item.description || item.id }}</div>
            </td>
            <td>{{ item.adminName || item.adminResidentId || '—' }}</td>
            <td>{{ item.propertyCompanyCount ?? '—' }}</td>
            <td>{{ item.createdAt || '—' }}</td>
            <td>
              <button type="button" class="linkBtn" @click="openBindings(item)">管理绑定</button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else class="hint">暂无社区实体</p>
    </div>

    <Teleport to="body">
      <div v-if="createOpen" class="modalOverlay" @click.self="createOpen = false">
        <div class="modal">
          <div class="modalHeader">
            <h3 class="modalTitle">创建社区</h3>
            <button type="button" class="modalClose" @click="createOpen = false">&times;</button>
          </div>
          <div class="modalBody">
            <div class="field">
              <label class="label">名称</label>
              <input v-model="createForm.name" class="input" maxlength="100" />
            </div>
            <div class="field">
              <label class="label">描述</label>
              <textarea v-model="createForm.description" class="textarea" rows="3" />
            </div>
            <div class="field">
              <label class="label">社区管理员</label>
              <select
                v-model="createForm.adminResidentId"
                class="input"
                :disabled="operatorsLoading"
              >
                <option value="">
                  {{ operatorsLoading ? '加载管理员中...' : '请选择管理员（可选）' }}
                </option>
                <option
                  v-for="op in operators"
                  :key="op.id"
                  :value="op.residentId || op.id"
                >
                  {{ formatOperatorLabel(op) }}
                </option>
              </select>
              <p v-if="operatorsError" class="fieldHint error">{{ operatorsError }}</p>
            </div>
            <p v-if="createError" class="error">{{ createError }}</p>
            <div class="modalFooter">
              <button type="button" class="btnSecondary" @click="createOpen = false">取消</button>
              <button type="button" class="btnPrimary" :disabled="creating" @click="submitCreate">
                {{ creating ? '创建中...' : '创建' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="bindOpen" class="modalOverlay" @click.self="bindOpen = false">
        <div class="modal modalWide">
          <div class="modalHeader">
            <h3 class="modalTitle">绑定物业 — {{ currentEntity?.name }}</h3>
            <button type="button" class="modalClose" @click="bindOpen = false">&times;</button>
          </div>
          <div class="modalBody">
            <div class="bindForm">
              <select v-model="bindForm.propertyCompanyId" class="input">
                <option value="">选择物业公司</option>
                <option v-for="pc in propertyCompanies" :key="pc.id" :value="pc.id">
                  {{ pc.name || pc.id }}
                </option>
              </select>
              <select v-model="bindForm.permissionLevel" class="input">
                <option
                  v-for="opt in COMMUNITY_PERMISSION_LEVEL_OPTIONS"
                  :key="opt.value"
                  :value="opt.value"
                >
                  {{ opt.label }}
                </option>
              </select>
              <button type="button" class="btnPrimary" :disabled="binding" @click="submitBind">
                {{ binding ? '绑定中...' : '绑定' }}
              </button>
            </div>
            <p v-if="bindError" class="error">{{ bindError }}</p>
            <div v-if="bindingsLoading" class="hint">加载绑定列表...</div>
            <table v-else-if="bindings.length" class="table">
              <thead>
                <tr>
                  <th>物业公司</th>
                  <th>权限</th>
                  <th>绑定时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="b in bindings" :key="b.propertyCompanyId">
                  <td>{{ b.propertyCompanyName || b.propertyCompanyId }}</td>
                  <td>
                    <select
                      class="input sm"
                      :value="b.permissionLevel || COMMUNITY_PERMISSION_LEVEL.READ_ONLY"
                      @change="onPermissionChange(b, ($event.target as HTMLSelectElement).value)"
                    >
                      <option
                        v-for="opt in COMMUNITY_PERMISSION_LEVEL_OPTIONS"
                        :key="opt.value"
                        :value="opt.value"
                      >
                        {{ opt.label }}
                      </option>
                    </select>
                  </td>
                  <td>{{ b.boundAt || '—' }}</td>
                  <td>
                    <button type="button" class="dangerBtn" @click="unbind(b.propertyCompanyId)">
                      解绑
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
            <p v-else class="hint">暂无绑定物业</p>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { communityEntityApi, propertyCompanyApi, propertyOperatorApi } from '../api/services'
import { ApiError } from '../api/request'
import type {
  CommunityEntityItem,
  CommunityPropertyBindingItem,
  PropertyCompanyItem,
  PropertyOperatorItem
} from '../api/types'
import {
  COMMUNITY_PERMISSION_LEVEL,
  COMMUNITY_PERMISSION_LEVEL_OPTIONS,
  ENTITY_STATUS
} from '../constants/enums'

const loading = ref(false)
const error = ref('')
const list = ref<CommunityEntityItem[]>([])

const createOpen = ref(false)
const creating = ref(false)
const createError = ref('')
const createForm = ref({ name: '', description: '', adminResidentId: '' })
const operators = ref<PropertyOperatorItem[]>([])
const operatorsLoading = ref(false)
const operatorsError = ref('')

const bindOpen = ref(false)
const binding = ref(false)
const bindingsLoading = ref(false)
const bindError = ref('')
const currentEntity = ref<CommunityEntityItem | null>(null)
const bindings = ref<CommunityPropertyBindingItem[]>([])
const propertyCompanies = ref<PropertyCompanyItem[]>([])
const bindForm = ref({
  propertyCompanyId: '',
  permissionLevel: COMMUNITY_PERMISSION_LEVEL.READ_ONLY
})

function resolveError(e: unknown) {
  if (e instanceof ApiError) return e.message
  if (e instanceof Error) return e.message
  return '操作失败'
}

function normalizeBindings(
  data: { list: CommunityPropertyBindingItem[] } | CommunityPropertyBindingItem[]
) {
  return Array.isArray(data) ? data : data.list || []
}

async function loadList() {
  loading.value = true
  error.value = ''
  try {
    const res = await communityEntityApi.list({ page: 1, pageSize: 100 })
    list.value = res.list || []
  } catch (e) {
    error.value = resolveError(e)
    list.value = []
  } finally {
    loading.value = false
  }
}

async function loadPropertyCompanies() {
  try {
    const res = await propertyCompanyApi.list({ page: 1, pageSize: 100 })
    propertyCompanies.value = res.list || []
  } catch (e) {
    console.error(e)
  }
}

function formatOperatorLabel(op: PropertyOperatorItem) {
  const name = op.name || '未命名'
  const phone = op.phone ? `（${op.phone}）` : ''
  return `${name}${phone}`
}

async function loadOperators() {
  operatorsLoading.value = true
  operatorsError.value = ''
  try {
    const res = await propertyOperatorApi.list({
      page: 1,
      pageSize: 100,
      status: ENTITY_STATUS.ACTIVE
    })
    operators.value = res.list || []
  } catch (e) {
    operators.value = []
    operatorsError.value = resolveError(e) || '管理员列表加载失败'
  } finally {
    operatorsLoading.value = false
  }
}

function openCreate() {
  createForm.value = { name: '', description: '', adminResidentId: '' }
  createError.value = ''
  createOpen.value = true
  loadOperators()
}

async function submitCreate() {
  if (!createForm.value.name.trim()) {
    createError.value = '请填写社区名称'
    return
  }
  creating.value = true
  createError.value = ''
  try {
    await communityEntityApi.create({
      name: createForm.value.name.trim(),
      description: createForm.value.description.trim() || undefined,
      adminResidentId: createForm.value.adminResidentId.trim() || undefined
    })
    createOpen.value = false
    await loadList()
  } catch (e) {
    createError.value = resolveError(e)
  } finally {
    creating.value = false
  }
}

async function openBindings(item: CommunityEntityItem) {
  currentEntity.value = item
  bindOpen.value = true
  bindError.value = ''
  bindForm.value = {
    propertyCompanyId: '',
    permissionLevel: COMMUNITY_PERMISSION_LEVEL.READ_ONLY
  }
  bindingsLoading.value = true
  try {
    const data = await communityEntityApi.propertyCompanies(item.id)
    bindings.value = normalizeBindings(data)
  } catch (e) {
    bindError.value = resolveError(e)
    bindings.value = []
  } finally {
    bindingsLoading.value = false
  }
}

async function submitBind() {
  if (!currentEntity.value || !bindForm.value.propertyCompanyId) {
    bindError.value = '请选择物业公司'
    return
  }
  binding.value = true
  bindError.value = ''
  try {
    await communityEntityApi.bindProperty(currentEntity.value.id, {
      propertyCompanyId: bindForm.value.propertyCompanyId,
      permissionLevel: bindForm.value.permissionLevel
    })
    await openBindings(currentEntity.value)
    await loadList()
  } catch (e) {
    bindError.value = resolveError(e)
  } finally {
    binding.value = false
  }
}

async function unbind(propertyCompanyId: string) {
  if (!currentEntity.value) return
  if (!confirm('确认解绑该物业公司？')) return
  try {
    await communityEntityApi.unbindProperty(currentEntity.value.id, propertyCompanyId)
    await openBindings(currentEntity.value)
    await loadList()
  } catch (e) {
    bindError.value = resolveError(e)
  }
}

async function onPermissionChange(item: CommunityPropertyBindingItem, level: string) {
  if (!currentEntity.value) return
  try {
    await communityEntityApi.updatePermissions(currentEntity.value.id, item.propertyCompanyId, {
      permissionLevel: level,
      allowedModules: item.allowedModules
    })
    item.permissionLevel = level
  } catch (e) {
    bindError.value = resolveError(e)
  }
}

onMounted(async () => {
  await Promise.all([loadList(), loadPropertyCompanies()])
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
.name { font-weight: 600; color: #1f1f2e; }
.sub { color: #8c8c9a; font-size: 12px; margin-top: 2px; }
.hint { color: #8c8c9a; font-size: 14px; padding: 24px; margin: 0; }
.error { color: #e05c5c; font-size: 14px; padding: 24px; margin: 0; }
.linkBtn { border: none; background: none; color: #5c5c9e; padding: 0; cursor: pointer; font-size: 14px; }
.btnPrimary { padding: 10px 18px; border-radius: 8px; border: none; background: #5c5c9e; color: #ffffff; font-size: 14px; cursor: pointer; transition: background 0.2s; }
.btnPrimary:hover { background: #52529a; }
.btnPrimary:disabled { opacity: 0.6; cursor: not-allowed; }
.btnSecondary { padding: 10px 18px; border-radius: 8px; border: 1px solid #e8e8ec; background: #ffffff; color: #5c5c66; font-size: 14px; cursor: pointer; }
.btnSecondary:hover { border-color: #5c5c9e; color: #5c5c9e; }
.dangerBtn { border: none; background: none; color: #e05c5c; padding: 0; cursor: pointer; font-size: 14px; }
.modalOverlay { position: fixed; inset: 0; z-index: 1000; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; padding: 24px; }
.modal { width: min(520px, 100%); max-height: 90vh; background: #fff; border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.12); overflow: auto; display: flex; flex-direction: column; }
.modalWide { width: min(860px, 100%); }
.modalHeader { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid #f0f0f3; flex-shrink: 0; }
.modalTitle { font-size: 16px; font-weight: 600; color: #1f1f2e; margin: 0; }
.modalClose { width: 32px; height: 32px; border: none; background: transparent; font-size: 24px; line-height: 1; color: #8c8c9a; cursor: pointer; }
.modalClose:hover { color: #1f1f2e; }
.modalBody { padding: 24px; display: flex; flex-direction: column; gap: 16px; }
.modalFooter { display: flex; justify-content: flex-end; gap: 12px; padding-top: 8px; }
.field { display: flex; flex-direction: column; gap: 8px; }
.label { font-size: 13px; font-weight: 500; color: #5c5c66; }
.fieldHint { margin: 0; font-size: 12px; color: #8c8c9a; }
.input, .textarea { width: 100%; border: 1px solid #e8e8ec; border-radius: 8px; padding: 10px 12px; font-size: 14px; color: #1f1f2e; background: #ffffff; outline: none; box-sizing: border-box; font-family: inherit; }
.input:focus, .textarea:focus { border-color: #5c5c9e; }
.input.sm { width: 120px; }
.bindForm { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
</style>
