<template>
  <div class="page">
    <header class="header">
      <div>
        <h1>住户注销终审</h1>
        <p>冷静期内住户注销申请的平台终审（§94.13，仅平台管理员）。</p>
      </div>
    </header>
    <div class="panel">
      <div v-if="loading" class="empty">加载中...</div>
      <p v-else-if="error" class="error">{{ error }}</p>
      <table v-else-if="list.length" class="table">
        <thead><tr><th>住户</th><th>物业</th><th>申请时间</th><th>操作</th></tr></thead>
        <tbody>
          <tr v-for="item in list" :key="item.id">
            <td>{{ item.residentName || item.residentPhone || item.residentId }}</td>
            <td>{{ item.propertyCompanyName || '—' }}</td>
            <td>{{ item.requestedAt || '—' }}</td>
            <td><button class="auditBtn" @click="openReview(item)">终审</button></td>
          </tr>
        </tbody>
      </table>
      <p v-else class="empty">暂无注销申请</p>
    </div>
    <Teleport to="body">
      <div v-if="reviewOpen" class="overlay" @click.self="reviewOpen = false">
        <div class="modal">
          <h3>注销终审</h3>
          <select v-model="reviewAction">
            <option value="approve">通过并注销</option>
            <option value="reject">驳回恢复</option>
          </select>
          <textarea v-model="rejectReason" rows="3" placeholder="驳回原因" />
          <p v-if="formError" class="error">{{ formError }}</p>
          <div class="actions">
            <button @click="reviewOpen = false">取消</button>
            <button class="primary" :disabled="submitting" @click="submitReview">提交</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { residentDeletionApi } from '../../api/services'
import type { ResidentDeletionRequestItem } from '../../api/types'
import { formatApiError } from '../../api/request'

const list = ref<ResidentDeletionRequestItem[]>([])
const loading = ref(false)
const error = ref('')
const reviewOpen = ref(false)
const target = ref<ResidentDeletionRequestItem | null>(null)
const reviewAction = ref('approve')
const rejectReason = ref('')
const formError = ref('')
const submitting = ref(false)

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await residentDeletionApi.list({ page: 1, pageSize: 50 })
    list.value = res.list || []
  } catch (e) {
    error.value = formatApiError(e, '加载失败')
  } finally {
    loading.value = false
  }
}

function openReview(item: ResidentDeletionRequestItem) {
  target.value = item
  reviewAction.value = 'approve'
  rejectReason.value = ''
  formError.value = ''
  reviewOpen.value = true
}

async function submitReview() {
  if (!target.value?.residentId) return
  if (reviewAction.value === 'reject' && !rejectReason.value.trim()) {
    formError.value = '请填写驳回原因'
    return
  }
  submitting.value = true
  try {
    await residentDeletionApi.review(target.value.residentId, {
      action: reviewAction.value,
      rejectReason: rejectReason.value.trim() || undefined
    })
    reviewOpen.value = false
    await load()
  } catch (e) {
    formError.value = formatApiError(e, '审核失败')
  } finally {
    submitting.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.page { max-width: 900px; }
.panel { background: #fff; padding: 16px; border-radius: 12px; }
.table { width: 100%; border-collapse: collapse; font-size: 14px; }
.table th, .table td { padding: 10px; border-bottom: 1px solid #f0f0f3; }
.auditBtn { padding: 6px 12px; border: 1px solid #5c5c9e; background: #fff; color: #5c5c9e; border-radius: 6px; cursor: pointer; }
.overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal { background: #fff; padding: 20px; border-radius: 12px; width: 400px; display: flex; flex-direction: column; gap: 10px; }
.actions { display: flex; justify-content: flex-end; gap: 8px; }
.primary { background: #5c5c9e; color: #fff; border: none; padding: 8px 16px; border-radius: 6px; }
.error { color: #e05c5c; }
.empty { color: #8c8c9a; }
</style>
