<template>
  <div class="page" :class="{ mobilePage: isMobile }">
    <div class="header">
      <div>
        <h1 class="title">活动组</h1>
        <p class="desc">管理社区活动组</p>
      </div>
      <button class="btnPrimary" @click="openCreate">新建活动组</button>
    </div>

    <div class="panel">
      <div v-if="loading" class="loading">加载中...</div>
      <p v-else-if="error" class="error">{{ error }}</p>
      <table v-else-if="groups.length" class="table" :class="{ mobileCards: isMobile }">
        <thead>
          <tr>
            <th>名称</th>
            <th>负责人</th>
            <th>成员数</th>
            <th>订阅数</th>
            <th>月费</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in groups" :key="item.id">
            <td>{{ item.name }}</td>
            <td>{{ item.leaderName || '—' }}</td>
            <td>{{ item.memberCount ?? '—' }}</td>
            <td>{{ item.subscriberCount ?? '—' }}</td>
            <td>{{ item.monthlyFee != null ? `¥${formatMoney(item.monthlyFee)}` : '—' }}</td>
            <td>{{ item.status === ENTITY_STATUS.ACTIVE ? '启用' : getEnumLabel(ENTITY_STATUS_LABEL, item.status) }}</td>
            <td>
              <button class="btnGhostSm" @click="openEdit(item)">编辑</button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else class="empty">暂无活动组</p>
    </div>

    <div v-if="totalPages > 1" class="pager">
      <button class="btnGhost" :disabled="page <= 1 || loading" @click="changePage(page - 1)">上一页</button>
      <span>{{ page }} / {{ totalPages }}</span>
      <button class="btnGhost" :disabled="page >= totalPages || loading" @click="changePage(page + 1)">下一页</button>
    </div>

    <Teleport to="body">
      <div v-if="modalOpen" class="modalOverlay" @click.self="closeModal">
        <div class="modal" :class="{ mobileSheet: isMobile }">
          <div class="modalHeader">
            <h3 class="modalTitle">{{ editingId ? '编辑活动组' : '新建活动组' }}</h3>
            <button class="modalClose" @click="closeModal">&times;</button>
          </div>
          <div class="modalBody">
            <p v-if="formError" class="error">{{ formError }}</p>
            <div class="field">
              <label class="label">名称</label>
              <input v-model="form.name" class="input" placeholder="活动组名称" />
            </div>
            <div class="field">
              <label class="label">描述</label>
              <textarea v-model="form.description" class="textarea" rows="3" />
            </div>
            <div class="fieldRow">
              <div class="field">
                <label class="label">月费</label>
                <input v-model.number="form.monthlyFee" type="number" min="0" step="0.01" class="input" />
              </div>
              <div class="field">
                <label class="label">年费</label>
                <input v-model.number="form.yearlyFee" type="number" min="0" step="0.01" class="input" />
              </div>
            </div>
          </div>
          <div class="modalFooter">
            <button class="btnGhost" @click="closeModal">取消</button>
            <button class="btnPrimary" :disabled="submitting" @click="submit">
              {{ submitting ? '提交中...' : '保存' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { activityGroupApi } from '../../api/services'
import type { ActivityGroupItem } from '../../api/types'
import { ApiError } from '../../api/request'
import { ENTITY_STATUS, ENTITY_STATUS_LABEL, getEnumLabel } from '../../constants/enums'
import { useIsMobile } from '../../composables/useIsMobile'

const groups = ref<ActivityGroupItem[]>([])
const { isMobile } = useIsMobile()
const loading = ref(false)
const error = ref('')
const page = ref(1)
const totalPages = ref(1)
const modalOpen = ref(false)
const editingId = ref('')
const submitting = ref(false)
const formError = ref('')

const form = reactive({
  name: '',
  description: '',
  monthlyFee: undefined as number | undefined,
  yearlyFee: undefined as number | undefined
})

function formatMoney(value?: number) {
  if (value === undefined || value === null) return '0.00'
  return Number(value).toFixed(2)
}

async function load(pageNo = 1) {
  loading.value = true
  error.value = ''
  try {
    const res = await activityGroupApi.list({ page: pageNo, pageSize: 20, sort: '-createdAt' })
    groups.value = res.list || []
    page.value = res.pagination?.page || pageNo
    totalPages.value = res.pagination?.totalPages || 1
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '活动组加载失败'
  } finally {
    loading.value = false
  }
}

function changePage(next: number) {
  load(next)
}

function openCreate() {
  editingId.value = ''
  form.name = ''
  form.description = ''
  form.monthlyFee = undefined
  form.yearlyFee = undefined
  formError.value = ''
  modalOpen.value = true
}

function openEdit(item: ActivityGroupItem) {
  editingId.value = item.id
  form.name = item.name || ''
  form.description = item.description || ''
  form.monthlyFee = item.monthlyFee
  form.yearlyFee = item.yearlyFee
  formError.value = ''
  modalOpen.value = true
}

function closeModal() {
  modalOpen.value = false
}

async function submit() {
  if (!form.name.trim()) {
    formError.value = '请填写名称'
    return
  }
  submitting.value = true
  formError.value = ''
  const payload = {
    name: form.name.trim(),
    description: form.description.trim() || undefined,
    monthlyFee: form.monthlyFee,
    yearlyFee: form.yearlyFee
  }
  try {
    if (editingId.value) {
      await activityGroupApi.update(editingId.value, payload)
    } else {
      await activityGroupApi.create(payload)
    }
    closeModal()
    await load(page.value)
  } catch (e) {
    formError.value = e instanceof ApiError ? e.message : '保存失败，请确认是否有活动组管理权限'
  } finally {
    submitting.value = false
  }
}

onMounted(() => load(1))
</script>

<style scoped>
.page { max-width: 1200px; }
.header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 24px; }
.title { font-size: 24px; font-weight: 600; color: #1f1f2e; margin-bottom: 8px; }
.desc { font-size: 14px; color: #8c8c9a; }
.btnPrimary { padding: 10px 18px; border-radius: 8px; background: #5c5c9e; color: #fff; border: none; cursor: pointer; }
.btnPrimary:hover { background: #52529a; }
.panel { background: #fff; border-radius: 12px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.table { width: 100%; border-collapse: collapse; font-size: 14px; }
.table th, .table td { padding: 12px 10px; border-bottom: 1px solid #f0f0f3; text-align: left; }
.table th { color: #8c8c9a; font-weight: 500; }
.btnGhostSm { padding: 6px 12px; border-radius: 6px; border: 1px solid #e8e8ec; background: #fff; color: #5c5c66; cursor: pointer; font-size: 13px; }
.btnGhostSm:hover { border-color: #5c5c9e; color: #5c5c9e; }
.loading, .empty, .error { font-size: 14px; color: #8c8c9a; padding: 12px 0; }
.error { color: #e05c5c; }
.pager { display: flex; align-items: center; gap: 12px; margin-top: 16px; font-size: 14px; }
.btnGhost { padding: 8px 14px; border-radius: 8px; border: 1px solid #e8e8ec; background: #fff; color: #5c5c66; font-size: 14px; cursor: pointer; }
.btnGhost:hover { border-color: #5c5c9e; color: #5c5c9e; }
.modalOverlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal { width: 480px; max-width: calc(100vw - 32px); background: #fff; border-radius: 12px; overflow: hidden; }
.modalHeader { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid #f0f0f3; }
.modalTitle { font-size: 16px; font-weight: 600; }
.modalClose { border: none; background: none; font-size: 22px; cursor: pointer; color: #8c8c9a; }
.modalBody { padding: 20px; }
.modalFooter { display: flex; justify-content: flex-end; gap: 10px; padding: 16px 20px; border-top: 1px solid #f0f0f3; }
.field { margin-bottom: 14px; }
.fieldRow { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.label { display: block; font-size: 13px; color: #8c8c9a; margin-bottom: 6px; }
.input { width: 100%; padding: 8px 12px; border: 1px solid #e8e8ec; border-radius: 8px; box-sizing: border-box; }
.textarea { width: 100%; padding: 8px 12px; border: 1px solid #e8e8ec; border-radius: 8px; resize: vertical; box-sizing: border-box; }
@media (max-width: 768px) {
  .page { max-width: none; }
  .header { flex-direction: column; margin-bottom: 16px; }
  .title { font-size: 21px; }
  .header .btnPrimary { width: 100%; }
  .panel { padding: 12px; border-radius: 14px; }
  .mobileCards thead { display: none; }
  .mobileCards, .mobileCards tbody, .mobileCards tr, .mobileCards td { display: block; width: 100%; }
  .mobileCards tr { padding: 12px 0; border-bottom: 1px solid #f0f0f3; }
  .mobileCards td { display: flex; justify-content: space-between; gap: 12px; padding: 6px 0; }
  .mobileCards td::before { color: #8c8c9a; }
  .mobileCards td:nth-child(1)::before { content: '名称'; }.mobileCards td:nth-child(2)::before { content: '负责人'; }
  .mobileCards td:nth-child(3)::before { content: '成员数'; }.mobileCards td:nth-child(4)::before { content: '订阅数'; }
  .mobileCards td:nth-child(5)::before { content: '月费'; }.mobileCards td:nth-child(6)::before { content: '状态'; }
  .mobileCards td:nth-child(7)::before { content: '操作'; }
  .modalOverlay { padding: 0; align-items: flex-end; }
  .modal.mobileSheet { max-width: 100%; border-radius: 18px 18px 0 0; }
  .fieldRow { grid-template-columns: 1fr; }
}
</style>
