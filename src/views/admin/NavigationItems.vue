<template>
  <div class="page">
    <div class="header">
      <div>
        <h1 class="title">手机端导航配置</h1>
        <p class="desc">
          配置手机端底部与模块内导航项（首页、服务、活动、业主商户四套模块）。
          不是改管理端侧栏；对应住户 App/小程序里「首页、服务、活动、商户」等入口的增删与排序。
        </p>
      </div>
      <button class="btnPrimary" @click="openCreate">新增导航项</button>
    </div>
    <div class="toolbar">
      <select v-model="module" @change="load">
        <option v-for="opt in NAVIGATION_MODULE_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
      </select>
    </div>
    <p v-if="error" class="error">{{ error }}</p>
    <div class="panel">
      <div v-if="loading" class="hint">加载中...</div>
      <table v-else-if="list.length" class="table">
        <thead><tr><th>名称</th><th>路由</th><th>排序</th><th>状态</th><th>操作</th></tr></thead>
        <tbody>
          <tr v-for="item in list" :key="item.id">
            <td>{{ item.name }}</td>
            <td>{{ getNavigationRouteLabel(item.route) }}</td>
            <td>{{ item.sortOrder ?? '—' }}</td>
            <td>{{ getEnumLabel(ENTITY_STATUS_LABEL, item.status) }}</td>
            <td><button class="linkBtn" @click="removeItem(item)">删除</button></td>
          </tr>
        </tbody>
      </table>
      <p v-else class="hint">暂无导航项</p>
    </div>
    <Teleport to="body">
      <div v-if="formOpen" class="overlay" @click.self="formOpen = false">
        <div class="modal">
          <h3>新增导航项</h3>
          <select v-model="form.module" class="input">
            <option v-for="opt in NAVIGATION_MODULE_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
          <input v-model="form.name" class="input" placeholder="名称" />
          <input v-model="form.route" class="input" placeholder="路由/链接" />
          <input v-model.number="form.sortOrder" type="number" class="input" placeholder="排序" />
          <p v-if="formError" class="error">{{ formError }}</p>
          <div class="actions">
            <button @click="formOpen = false">取消</button>
            <button class="primary" :disabled="submitting" @click="submit">保存</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { navigationItemApi } from '../../api/services'
import type { NavigationItem } from '../../api/types'
import { formatApiError } from '../../api/request'
import { NAVIGATION_MODULE, NAVIGATION_MODULE_OPTIONS, ENTITY_STATUS, ENTITY_STATUS_LABEL, getEnumLabel, getNavigationRouteLabel } from '../../constants/enums'

const list = ref<NavigationItem[]>([])
const loading = ref(false)
const error = ref('')
const module = ref(NAVIGATION_MODULE.HOME)
const formOpen = ref(false)
const submitting = ref(false)
const formError = ref('')
const form = reactive({
  module: NAVIGATION_MODULE.HOME,
  name: '',
  route: '',
  sortOrder: 0,
  status: ENTITY_STATUS.ACTIVE
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await navigationItemApi.list({ module: module.value })
    list.value = Array.isArray(res) ? res : res.list || []
  } catch (e) {
    error.value = formatApiError(e, '加载失败')
  } finally {
    loading.value = false
  }
}

function openCreate() {
  form.module = module.value
  form.name = ''
  form.route = ''
  form.sortOrder = 0
  formError.value = ''
  formOpen.value = true
}

async function submit() {
  if (!form.name.trim()) {
    formError.value = '请填写名称'
    return
  }
  submitting.value = true
  try {
    await navigationItemApi.create({
      module: form.module,
      name: form.name.trim(),
      route: form.route.trim() || undefined,
      sortOrder: form.sortOrder,
      status: form.status
    })
    formOpen.value = false
    await load()
  } catch (e) {
    formError.value = formatApiError(e, '保存失败')
  } finally {
    submitting.value = false
  }
}

async function removeItem(item: NavigationItem) {
  if (!confirm(`删除导航项「${item.name}」？`)) return
  try {
    await navigationItemApi.remove(item.id)
    await load()
  } catch (e) {
    error.value = formatApiError(e, '删除失败')
  }
}

onMounted(load)
</script>

<style scoped>
.page { max-width: 900px; }
.header { display: flex; justify-content: space-between; margin-bottom: 12px; }
.toolbar { margin-bottom: 12px; }
.panel { background: #fff; border-radius: 12px; padding: 16px; }
.table { width: 100%; border-collapse: collapse; font-size: 14px; }
.table th, .table td { padding: 10px; border-bottom: 1px solid #f0f0f3; }
.btnPrimary { padding: 8px 16px; background: #5c5c9e; color: #fff; border: none; border-radius: 8px; cursor: pointer; }
.linkBtn { background: none; border: none; color: #cf1322; cursor: pointer; }
.overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal { background: #fff; padding: 20px; border-radius: 12px; width: 400px; display: flex; flex-direction: column; gap: 10px; }
.input { padding: 8px; border: 1px solid #e8e8ec; border-radius: 8px; }
.actions { display: flex; justify-content: flex-end; gap: 8px; }
.primary { background: #5c5c9e; color: #fff; border: none; padding: 8px 16px; border-radius: 6px; }
.error { color: #e05c5c; }
.hint { color: #8c8c9a; }
</style>
