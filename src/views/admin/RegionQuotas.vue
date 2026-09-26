<template>
  <div class="page">
    <div class="header">
      <div>
        <h1 class="title">区域配额</h1>
        <p class="desc">按板块配置积分/金额配额与周期（§94.8）。</p>
      </div>
      <button class="btnPrimary" @click="openCreate">新增配额</button>
    </div>
    <p v-if="error" class="error">{{ error }}</p>
    <div class="panel">
      <div v-if="loading" class="hint">加载中...</div>
      <table v-else-if="list.length" class="table">
        <thead>
          <tr>
            <th>板块</th>
            <th>类型</th>
            <th>配额</th>
            <th>已用</th>
            <th>周期</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in list" :key="item.id">
            <td>{{ item.sector || '—' }}</td>
            <td>{{ getEnumLabel(REGION_QUOTA_TYPE_LABEL, item.quotaType) }}</td>
            <td>{{ item.quotaAmount ?? '—' }}</td>
            <td>{{ item.usedAmount ?? '—' }}</td>
            <td>
              <span v-if="item.periodStart || item.periodEnd">
                {{ item.periodStart || '?' }} ~ {{ item.periodEnd || '?' }}
              </span>
              <span v-else>—</span>
            </td>
            <td><button class="linkBtn" @click="removeItem(item)">删除</button></td>
          </tr>
        </tbody>
      </table>
      <p v-else class="hint">暂无配额</p>
    </div>
    <Teleport to="body">
      <div v-if="formOpen" class="overlay" @click.self="formOpen = false">
        <div class="modal">
          <h3>新增区域配额</h3>
          <label class="label">板块 sector</label>
          <input v-model="form.sector" class="input" placeholder="如 cleaning / 测试1" />
          <label class="label">类型</label>
          <select v-model="form.quotaType" class="input">
            <option value="point">积分</option>
            <option value="amount">金额</option>
          </select>
          <label class="label">配额总量</label>
          <input v-model.number="form.quotaAmount" type="number" min="0" class="input" />
          <label class="label">周期起止 <em>*</em></label>
          <div class="row">
            <input v-model="form.periodStart" type="date" class="input" />
            <input v-model="form.periodEnd" type="date" class="input" />
          </div>
          <p class="hint">测服校验要求填写周期开始/结束日期（格式：年-月-日）</p>
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
import { regionQuotaApi } from '../../api/services'
import type { RegionQuotaItem } from '../../api/types'
import { formatApiError } from '../../api/request'
import { REGION_QUOTA_TYPE_LABEL, getEnumLabel } from '../../constants/enums'

const list = ref<RegionQuotaItem[]>([])
const loading = ref(false)
const error = ref('')
const formOpen = ref(false)
const submitting = ref(false)
const formError = ref('')
const form = reactive({
  sector: '',
  quotaType: 'point',
  quotaAmount: 0,
  periodStart: '',
  periodEnd: ''
})

function defaultPeriod() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const start = `${y}-${m}-01`
  const endMonth = new Date(y, now.getMonth() + 3, 0)
  const end = `${endMonth.getFullYear()}-${String(endMonth.getMonth() + 1).padStart(2, '0')}-${String(endMonth.getDate()).padStart(2, '0')}`
  return { start, end }
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await regionQuotaApi.list()
    list.value = Array.isArray(res) ? res : res.list || []
  } catch (e) {
    error.value = formatApiError(e, '加载失败')
  } finally {
    loading.value = false
  }
}

function openCreate() {
  const { start, end } = defaultPeriod()
  form.sector = ''
  form.quotaType = 'point'
  form.quotaAmount = 0
  form.periodStart = start
  form.periodEnd = end
  formError.value = ''
  formOpen.value = true
}

async function submit() {
  if (!form.sector.trim()) {
    formError.value = '请填写板块'
    return
  }
  if (!form.periodStart || !form.periodEnd) {
    formError.value = '请选择周期起止日期'
    return
  }
  if (form.periodStart > form.periodEnd) {
    formError.value = '起始日不能晚于结束日'
    return
  }
  submitting.value = true
  try {
    await regionQuotaApi.create({
      sector: form.sector.trim(),
      quotaType: form.quotaType,
      quotaAmount: Number(form.quotaAmount) || 0,
      periodStart: form.periodStart,
      periodEnd: form.periodEnd
    })
    formOpen.value = false
    await load()
  } catch (e) {
    formError.value = formatApiError(e, '保存失败')
  } finally {
    submitting.value = false
  }
}

async function removeItem(item: RegionQuotaItem) {
  if (!confirm('确认删除该配额？')) return
  try {
    await regionQuotaApi.remove(item.id)
    await load()
  } catch (e) {
    error.value = formatApiError(e, '删除失败')
  }
}

onMounted(load)
</script>

<style scoped>
.page { max-width: 960px; }
.header { display: flex; justify-content: space-between; margin-bottom: 16px; }
.title { font-size: 22px; font-weight: 600; }
.desc { font-size: 13px; color: #8c8c9a; margin-top: 4px; }
.panel { background: #fff; border-radius: 12px; padding: 16px; }
.table { width: 100%; border-collapse: collapse; font-size: 14px; }
.table th, .table td { padding: 10px 8px; border-bottom: 1px solid #f0f0f3; text-align: left; }
.btnPrimary, .primary { padding: 8px 16px; border: none; border-radius: 8px; background: #5c5c9e; color: #fff; cursor: pointer; }
.linkBtn { border: none; background: none; color: #5c5c9e; cursor: pointer; }
.overlay { position: fixed; inset: 0; background: rgba(0,0,0,.4); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal { width: 420px; max-width: calc(100vw - 32px); background: #fff; border-radius: 12px; padding: 20px; display: flex; flex-direction: column; gap: 8px; }
.input { padding: 8px 12px; border: 1px solid #e8e8ec; border-radius: 8px; width: 100%; box-sizing: border-box; }
.row { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.label { font-size: 13px; color: #8c8c9a; }
.label em { color: #e05c5c; font-style: normal; }
.actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; }
.error { color: #cf1322; font-size: 13px; }
.hint { font-size: 12px; color: #8c8c9a; }
</style>
