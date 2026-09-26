<template>
  <div class="page">
    <header class="header">
      <div>
        <h1>奖励金 / 积分发放审批</h1>
        <p>
          业主或商家提交的发放申请。列表：物业管理员与平台超管均可查看（§94.1）；
          <strong>审批操作仅物业管理员</strong>。
        </p>
      </div>
    </header>
    <div class="panel">
      <div class="toolbar">
        <select v-model="status" @change="load(1)">
          <option v-for="opt in REWARD_GRANT_STATUS_OPTIONS" :key="opt.value || 'all'" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>
        <select v-model="grantType" @change="load(1)">
          <option v-for="opt in GRANT_TYPE_OPTIONS" :key="opt.value || 'all'" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>
      </div>
      <div v-if="loading" class="empty">加载中...</div>
      <p v-else-if="error" class="error">{{ error }}</p>
      <table v-else-if="list.length" class="table">
        <thead>
          <tr>
            <th>类型</th>
            <th>目标住户</th>
            <th>数量</th>
            <th>原因</th>
            <th>状态</th>
            <th>申请时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in list" :key="item.id">
            <td>{{ getEnumLabel(GRANT_TYPE_LABEL, item.grantType) }}</td>
            <td>{{ item.targetResidentName || item.targetResidentId }}</td>
            <td>{{ item.pointAmount ?? '—' }}</td>
            <td>{{ item.reason || '—' }}</td>
            <td>{{ getEnumLabel(REWARD_GRANT_STATUS_LABEL, item.status) }}</td>
            <td>{{ item.createdAt || '—' }}</td>
            <td>
              <button
                v-if="canAudit && item.status === REWARD_GRANT_STATUS.PENDING"
                class="auditBtn"
                @click="openAudit(item)"
              >
                审批
              </button>
              <span v-else-if="item.status === REWARD_GRANT_STATUS.PENDING && !canAudit" class="muted">仅物业可审</span>
              <span v-else class="muted">已处理</span>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else class="empty">暂无申请</p>
      <footer v-if="totalPages > 1" class="footer">
        <button :disabled="page <= 1" @click="load(page - 1)">上一页</button>
        <span>{{ page }} / {{ totalPages }}</span>
        <button :disabled="page >= totalPages" @click="load(page + 1)">下一页</button>
      </footer>
    </div>
    <Teleport to="body">
      <div v-if="auditOpen" class="overlay" @click.self="closeAudit">
        <div class="modal">
          <h3>审批发放</h3>
          <select v-model="auditAction">
            <option :value="AUDIT_RESULT.APPROVED">通过</option>
            <option :value="AUDIT_RESULT.REJECTED">驳回</option>
          </select>
          <textarea v-model="remark" rows="3" :placeholder="auditAction === AUDIT_RESULT.REJECTED ? '驳回原因' : '备注'" />
          <p v-if="formError" class="error">{{ formError }}</p>
          <div class="actions">
            <button type="button" @click="closeAudit">取消</button>
            <button type="button" class="primary" :disabled="submitting" @click="submitAudit">
              {{ submitting ? '提交中...' : '确认' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { rewardGrantApi } from '../../api/services'
import type { RewardGrantItem } from '../../api/types'
import { formatApiError } from '../../api/request'
import {
  AUDIT_RESULT,
  GRANT_TYPE_LABEL,
  GRANT_TYPE_OPTIONS,
  REWARD_GRANT_STATUS,
  REWARD_GRANT_STATUS_LABEL,
  REWARD_GRANT_STATUS_OPTIONS,
  USER_ROLE,
  getEnumLabel
} from '../../constants/enums'
import { useAuthStore } from '../../stores/auth'

const auth = useAuthStore()
const canAudit = computed(() => auth.profile?.role !== USER_ROLE.PLATFORM_ADMIN)

const list = ref<RewardGrantItem[]>([])
const loading = ref(false)
const error = ref('')
const status = ref(REWARD_GRANT_STATUS.PENDING)
const grantType = ref('')
const page = ref(1)
const totalPages = ref(1)
const auditOpen = ref(false)
const target = ref<RewardGrantItem | null>(null)
const auditAction = ref(AUDIT_RESULT.APPROVED)
const remark = ref('')
const formError = ref('')
const submitting = ref(false)

async function load(pageNo = 1) {
  loading.value = true
  error.value = ''
  try {
    const res = await rewardGrantApi.list({
      page: pageNo,
      pageSize: 20,
      status: status.value || undefined,
      grantType: grantType.value || undefined
    })
    list.value = res.list || []
    page.value = res.pagination?.page || pageNo
    totalPages.value = res.pagination?.totalPages || 1
  } catch (e) {
    error.value = formatApiError(e, '加载失败')
  } finally {
    loading.value = false
  }
}

function openAudit(item: RewardGrantItem) {
  target.value = item
  auditAction.value = AUDIT_RESULT.APPROVED
  remark.value = ''
  formError.value = ''
  auditOpen.value = true
}

function closeAudit() {
  auditOpen.value = false
  target.value = null
}

async function submitAudit() {
  if (!target.value) return
  if (auditAction.value === AUDIT_RESULT.REJECTED && !remark.value.trim()) {
    formError.value = '请填写驳回原因'
    return
  }
  submitting.value = true
  formError.value = ''
  try {
    await rewardGrantApi.audit(target.value.id, {
      action: auditAction.value,
      remark: remark.value.trim() || undefined
    })
    closeAudit()
    await load(page.value)
  } catch (e) {
    formError.value = formatApiError(e, '审批失败')
  } finally {
    submitting.value = false
  }
}

onMounted(() => load(1))
</script>

<style scoped>
.page { max-width: 1100px; }
.header h1 { font-size: 22px; margin-bottom: 8px; }
.header p { font-size: 14px; color: #8c8c9a; }
.panel { background: #fff; border-radius: 12px; padding: 16px; }
.toolbar { display: flex; gap: 12px; margin-bottom: 16px; }
.table { width: 100%; border-collapse: collapse; font-size: 14px; }
.table th, .table td { padding: 10px; border-bottom: 1px solid #f0f0f3; text-align: left; }
.auditBtn { padding: 6px 12px; border: 1px solid #5c5c9e; background: #fff; color: #5c5c9e; border-radius: 6px; cursor: pointer; }
.empty, .muted { color: #8c8c9a; }
.error { color: #e05c5c; }
.footer { display: flex; gap: 12px; align-items: center; margin-top: 16px; }
.overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal { background: #fff; padding: 20px; border-radius: 12px; width: 400px; max-width: 96vw; display: flex; flex-direction: column; gap: 10px; }
.modal .actions { display: flex; justify-content: flex-end; gap: 8px; }
.modal .primary { background: #5c5c9e; color: #fff; border: none; padding: 8px 16px; border-radius: 6px; }
</style>
