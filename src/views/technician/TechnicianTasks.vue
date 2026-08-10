<template>
  <div class="page" :class="{ mobilePage: isMobile }">
    <div class="header">
      <div>
        <h1 class="title">我的工单</h1>
        <p class="desc">查看和处理分配给您的任务</p>
      </div>
    </div>

    <div class="toolbar">
      <select v-model="filterStatus" class="select" @change="reload">
        <option value="">全部状态</option>
        <option
          v-for="opt in TECHNICIAN_TASK_STATUS_OPTIONS"
          :key="opt.value"
          :value="opt.value"
        >
          {{ opt.label }}
        </option>
      </select>
      <button class="btnGhost" :disabled="loading" @click="reload">刷新</button>
    </div>

    <div class="panel">
      <div v-if="loading" class="loading">加载中...</div>
      <p v-else-if="error" class="error">{{ error }}</p>
      <table v-else-if="tasks.length" class="table" :class="{ mobileCards: isMobile }">
        <thead>
          <tr>
            <th>标题</th>
            <th>联系人</th>
            <th>地址</th>
            <th>预约时间</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in tasks" :key="item.id">
            <td>
              <strong>{{ item.title || '工单' }}</strong>
              <div v-if="item.description" class="sub">{{ item.description }}</div>
            </td>
            <td>{{ contactText(item) }}</td>
            <td>{{ item.address || '—' }}</td>
            <td>{{ item.preferredTime || '—' }}</td>
            <td>{{ statusLabel(item) }}</td>
            <td class="actions">
              <button class="btnGhostSm" @click="openDetail(item)">详情</button>
              <button
                v-if="canAccept(item)"
                class="btnGhostSm primary"
                :disabled="actionId === item.id"
                @click="updateStatus(item, TECHNICIAN_TASK_STATUS.ASSIGNED)"
              >
                接单
              </button>
              <button
                v-if="canStart(item)"
                class="btnGhostSm primary"
                :disabled="actionId === item.id"
                @click="updateStatus(item, TECHNICIAN_TASK_STATUS.IN_PROGRESS)"
              >
                开始
              </button>
              <button
                v-if="canComplete(item)"
                class="btnGhostSm primary"
                :disabled="actionId === item.id"
                @click="updateStatus(item, TECHNICIAN_TASK_STATUS.COMPLETED)"
              >
                完成
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else class="empty">暂无工单</p>
    </div>

    <div v-if="totalPages > 1" class="pager">
      <button class="btnGhost" :disabled="page <= 1 || loading" @click="changePage(page - 1)">上一页</button>
      <span>{{ page }} / {{ totalPages }}</span>
      <button class="btnGhost" :disabled="page >= totalPages || loading" @click="changePage(page + 1)">下一页</button>
    </div>

    <Teleport to="body">
      <div v-if="detail" class="modalOverlay" @click.self="detail = null">
        <div class="modal" :class="{ mobileSheet: isMobile }">
          <div class="modalHeader">
            <h3 class="modalTitle">工单详情</h3>
            <button class="modalClose" @click="detail = null">&times;</button>
          </div>
          <div class="modalBody">
            <div class="infoRow"><span>标题</span><strong>{{ detail.title || '—' }}</strong></div>
            <div class="infoRow"><span>状态</span><strong>{{ statusLabel(detail) }}</strong></div>
            <div class="infoRow"><span>联系人</span><strong>{{ contactText(detail) }}</strong></div>
            <div class="infoRow"><span>地址</span><strong>{{ detail.address || '—' }}</strong></div>
            <div class="infoRow"><span>预约时间</span><strong>{{ detail.preferredTime || '—' }}</strong></div>
            <div class="infoRow"><span>创建时间</span><strong>{{ detail.createdAt || '—' }}</strong></div>
            <p v-if="detail.description" class="descBlock">{{ detail.description }}</p>
            <p v-if="actionError" class="error">{{ actionError }}</p>
          </div>
          <div class="modalFooter">
            <button class="btnGhost" @click="detail = null">关闭</button>
            <button
              v-if="canAccept(detail)"
              class="btnPrimary"
              :disabled="actionId === detail.id"
              @click="updateStatus(detail, TECHNICIAN_TASK_STATUS.ASSIGNED)"
            >
              接单
            </button>
            <button
              v-if="canStart(detail)"
              class="btnPrimary"
              :disabled="actionId === detail.id"
              @click="updateStatus(detail, TECHNICIAN_TASK_STATUS.IN_PROGRESS)"
            >
              开始
            </button>
            <button
              v-if="canComplete(detail)"
              class="btnPrimary"
              :disabled="actionId === detail.id"
              @click="updateStatus(detail, TECHNICIAN_TASK_STATUS.COMPLETED)"
            >
              完成
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { technicianPortalApi } from '../../api/services'
import type { TechnicianTaskItem } from '../../api/types'
import { ApiError } from '../../api/request'
import {
  getEnumLabel,
  TECHNICIAN_TASK_STATUS,
  TECHNICIAN_TASK_STATUS_LABEL
} from '../../constants/enums'
import { useIsMobile } from '../../composables/useIsMobile'

const TECHNICIAN_TASK_STATUS_OPTIONS = Object.entries(TECHNICIAN_TASK_STATUS_LABEL).map(
  ([value, label]) => ({ value, label })
)

const { isMobile } = useIsMobile()
const tasks = ref<TechnicianTaskItem[]>([])
const loading = ref(false)
const error = ref('')
const page = ref(1)
const totalPages = ref(1)
const filterStatus = ref('')
const detail = ref<TechnicianTaskItem | null>(null)
const actionId = ref('')
const actionError = ref('')

function statusLabel(item: TechnicianTaskItem) {
  const status = item.status || item.statusCode
  return getEnumLabel(TECHNICIAN_TASK_STATUS_LABEL, status, status || '—')
}

function contactText(item: TechnicianTaskItem) {
  const name = item.contactName || ''
  const phone = item.contactPhone || ''
  if (name && phone) return `${name} · ${phone}`
  return name || phone || '—'
}

function canAccept(item: TechnicianTaskItem) {
  const status = item.status || item.statusCode
  return status === TECHNICIAN_TASK_STATUS.PENDING
}

function canStart(item: TechnicianTaskItem) {
  const status = item.status || item.statusCode
  return status === TECHNICIAN_TASK_STATUS.ASSIGNED
}

function canComplete(item: TechnicianTaskItem) {
  const status = item.status || item.statusCode
  return status === TECHNICIAN_TASK_STATUS.IN_PROGRESS || status === TECHNICIAN_TASK_STATUS.ASSIGNED
}

async function load(pageNo = page.value) {
  loading.value = true
  error.value = ''
  try {
    const res = await technicianPortalApi.tasks({
      page: pageNo,
      pageSize: 20,
      status: filterStatus.value || undefined,
      sort: '-createdAt'
    })
    tasks.value = res.list || []
    page.value = res.pagination?.page || pageNo
    totalPages.value = res.pagination?.totalPages || 1
  } catch (e) {
    tasks.value = []
    if (e instanceof ApiError) {
      error.value =
        e.code === 500 || /500|内部|服务器/.test(e.message)
          ? '工单接口异常（后端 500），请联系后端检查 /technicians/my/tasks'
          : e.message
    } else {
      error.value = '工单加载失败'
    }
  } finally {
    loading.value = false
  }
}

function reload() {
  void load(1)
}

function changePage(next: number) {
  void load(next)
}

function openDetail(item: TechnicianTaskItem) {
  detail.value = item
  actionError.value = ''
}

async function updateStatus(item: TechnicianTaskItem, status: string) {
  actionId.value = item.id
  actionError.value = ''
  try {
    const updated = await technicianPortalApi.updateTaskStatus(item.id, { status })
    const next = { ...item, ...updated, status: updated.status || status }
    tasks.value = tasks.value.map((row) => (row.id === item.id ? next : row))
    if (detail.value?.id === item.id) detail.value = next
  } catch (e) {
    actionError.value = e instanceof ApiError ? e.message : '操作失败'
    if (!detail.value) error.value = actionError.value
  } finally {
    actionId.value = ''
  }
}

onMounted(() => {
  void load(1)
})
</script>

<style scoped>
.page { padding: 24px 32px; }
.header { margin-bottom: 20px; }
.title { font-size: 24px; font-weight: 600; color: #1f1f2e; margin: 0 0 6px; }
.desc { margin: 0; color: #8c8c9a; font-size: 14px; }
.toolbar { display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
.select {
  padding: 8px 12px; border: 1px solid #e8e8ec; border-radius: 8px; background: #fff; font-size: 14px;
}
.panel { background: #fff; border-radius: 12px; padding: 8px 20px 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.loading, .empty { padding: 40px 0; text-align: center; color: #8c8c9a; }
.error { color: #d4380d; margin: 16px 0; }
.table { width: 100%; border-collapse: collapse; }
.table th, .table td { text-align: left; padding: 14px 8px; border-bottom: 1px solid #f0f0f3; font-size: 14px; vertical-align: top; }
.table th { color: #8c8c9a; font-weight: 500; }
.sub { margin-top: 4px; font-size: 12px; color: #8c8c9a; }
.actions { display: flex; flex-wrap: wrap; gap: 8px; }
.btnGhostSm, .btnGhost, .btnPrimary {
  border: none; border-radius: 8px; cursor: pointer; font-size: 13px; padding: 8px 12px;
}
.btnGhostSm, .btnGhost { background: #f5f5f7; color: #1f1f2e; }
.btnGhostSm.primary, .btnPrimary { background: #5b4cdb; color: #fff; }
.btnPrimary:disabled, .btnGhost:disabled, .btnGhostSm:disabled { opacity: 0.5; cursor: not-allowed; }
.pager { display: flex; align-items: center; justify-content: center; gap: 12px; margin-top: 16px; color: #5c5c66; }
.modalOverlay {
  position: fixed; inset: 0; background: rgba(15, 15, 20, 0.45); display: flex; align-items: center; justify-content: center; z-index: 1000;
}
.modal { width: min(520px, calc(100vw - 32px)); background: #fff; border-radius: 14px; overflow: hidden; }
.modalHeader { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid #f0f0f3; }
.modalTitle { margin: 0; font-size: 16px; }
.modalClose { border: none; background: transparent; font-size: 22px; cursor: pointer; color: #8c8c9a; }
.modalBody { padding: 16px 20px; display: grid; gap: 10px; }
.modalFooter { padding: 12px 20px 16px; display: flex; justify-content: flex-end; gap: 10px; flex-wrap: wrap; }
.infoRow { display: flex; justify-content: space-between; gap: 12px; font-size: 14px; }
.infoRow span { color: #8c8c9a; flex-shrink: 0; }
.descBlock { margin: 4px 0 0; font-size: 14px; line-height: 1.6; color: #5c5c66; white-space: pre-wrap; }
.mobileSheet { max-width: 100%; border-radius: 18px 18px 0 0; margin-top: auto; }
@media (max-width: 768px) {
  .page { padding: 0 var(--mobile-page-gap); }
  .toolbar { display: grid; grid-template-columns: 1fr auto; gap: 8px; }
  .toolbar .select, .toolbar .btnGhost { min-height: 44px; }
  .table.mobileCards thead { display: none; }
  .table.mobileCards, .table.mobileCards tbody, .table.mobileCards tr, .table.mobileCards td { display: block; width: 100%; }
  .table.mobileCards tr { border: 1px solid #f0f0f3; border-radius: 10px; padding: 10px 12px; margin-bottom: 10px; }
  .table.mobileCards td { border: none; padding: 6px 0; }
  .modalOverlay { align-items: flex-end; }
}
</style>
