<template>
  <div class="page">
    <header class="header">
      <div>
        <h1>活动组注册审核</h1>
        <p>
          住户创建活动组即刻生效（无需等待审核）。本页为事后兜底：通过无影响；
          <strong>拒绝将永久硬删</strong>该活动组。
        </p>
      </div>
    </header>
    <div class="panel">
      <select v-model="status" @change="load(1)">
        <option value="pending">待审核</option>
        <option value="approved">已通过</option>
        <option value="rejected">已驳回</option>
      </select>
      <div v-if="loading" class="empty">加载中...</div>
      <p v-else-if="error" class="error">{{ error }}</p>
      <table v-else-if="list.length" class="table">
        <thead><tr><th>活动组</th><th>组长</th><th>状态</th><th>申请时间</th><th>操作</th></tr></thead>
        <tbody>
          <tr v-for="item in list" :key="item.id">
            <td>{{ item.name || item.id }}</td>
            <td>{{ item.leaderName || item.leaderPhone || '—' }}</td>
            <td>{{ getEnumLabel(PRICE_APPROVAL_STATUS_LABEL, item.status) }}</td>
            <td>{{ item.createdAt || '—' }}</td>
            <td>
              <button v-if="status === 'pending'" class="auditBtn" @click="openReview(item)">审核</button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else class="empty">暂无记录</p>
    </div>
    <Teleport to="body">
      <div v-if="reviewOpen" class="overlay" @click.self="reviewOpen = false">
        <div class="modal">
          <h3>审核活动组</h3>
          <select v-model="reviewAction">
            <option value="approve">通过</option>
            <option value="reject">驳回</option>
          </select>
          <textarea v-model="remark" rows="3" placeholder="驳回时请填写原因" />
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
import { activityGroupReviewApi } from '../../api/services'
import type { ActivityGroupReviewItem } from '../../api/types'
import { formatApiError } from '../../api/request'
import { PRICE_APPROVAL_STATUS_LABEL, getEnumLabel } from '../../constants/enums'

const list = ref<ActivityGroupReviewItem[]>([])
const loading = ref(false)
const error = ref('')
const status = ref('pending')
const reviewOpen = ref(false)
const target = ref<ActivityGroupReviewItem | null>(null)
const reviewAction = ref('approve')
const remark = ref('')
const formError = ref('')
const submitting = ref(false)

async function load(page = 1) {
  loading.value = true
  error.value = ''
  try {
    const res = await activityGroupReviewApi.list({ page, pageSize: 20, status: status.value })
    list.value = res.list || []
  } catch (e) {
    error.value = formatApiError(e, '加载失败')
  } finally {
    loading.value = false
  }
}

function openReview(item: ActivityGroupReviewItem) {
  target.value = item
  reviewAction.value = 'approve'
  remark.value = ''
  formError.value = ''
  reviewOpen.value = true
}

async function submitReview() {
  if (!target.value) return
  if (reviewAction.value === 'reject' && !remark.value.trim()) {
    formError.value = '请填写驳回原因'
    return
  }
  submitting.value = true
  try {
    await activityGroupReviewApi.review(target.value.id, {
      action: reviewAction.value,
      remark: remark.value.trim() || undefined
    })
    reviewOpen.value = false
    await load(1)
  } catch (e) {
    formError.value = formatApiError(e, '审核失败')
  } finally {
    submitting.value = false
  }
}

onMounted(() => load(1))
</script>

<style scoped>
.page { max-width: 900px; }
.panel { background: #fff; padding: 16px; border-radius: 12px; margin-top: 12px; }
.table { width: 100%; border-collapse: collapse; font-size: 14px; margin-top: 12px; }
.table th, .table td { padding: 10px; border-bottom: 1px solid #f0f0f3; }
.auditBtn { padding: 6px 12px; border: 1px solid #5c5c9e; background: #fff; color: #5c5c9e; border-radius: 6px; cursor: pointer; }
.overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal { background: #fff; padding: 20px; border-radius: 12px; width: 400px; display: flex; flex-direction: column; gap: 10px; }
.actions { display: flex; justify-content: flex-end; gap: 8px; }
.primary { background: #5c5c9e; color: #fff; border: none; padding: 8px 16px; border-radius: 6px; }
.error { color: #e05c5c; }
.empty { color: #8c8c9a; }
</style>
