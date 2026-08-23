<template>
  <div class="page">
    <header class="header">
      <div>
        <h1>楼栋变更审批</h1>
        <p>审核住户提交的栋、单元、楼层和房号变更；通过后由后端写入住户资料。</p>
      </div>
    </header>

    <div class="panel">
      <div class="toolbar">
        <form class="search" @submit.prevent="applyFilters">
          <input v-model="keyword" type="search" placeholder="在当前页筛选姓名、手机号" />
          <button type="submit">筛选</button>
        </form>
        <select v-model="status" @change="applyFilters">
          <option v-for="item in BUILDING_CHANGE_STATUS_OPTIONS" :key="item.value || 'all'" :value="item.value">
            {{ item.label }}
          </option>
        </select>
      </div>

      <div v-if="loading" class="empty">加载中...</div>
      <div v-else-if="loadError" class="empty error">{{ loadError }}</div>
      <div v-else-if="!displayList.length" class="empty">暂无楼栋变更申请</div>
      <div v-else class="tableWrap">
        <table>
          <thead>
            <tr>
              <th>住户</th>
              <th>小区</th>
              <th>原地址</th>
              <th>申请地址</th>
              <th>状态</th>
              <th>申请时间</th>
              <th>拒绝原因</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in displayList" :key="item.id">
              <td><strong>{{ item.residentName || '—' }}</strong><small>{{ item.residentPhone || item.residentId }}</small></td>
              <td>{{ item.communityName || item.communityId || '—' }}</td>
              <td>{{ formatAddress(item, true) }}</td>
              <td>{{ formatAddress(item) }}</td>
              <td><span class="badge" :class="normalizeStatus(item.status)">{{ statusLabel(item.status) }}</span></td>
              <td>{{ item.createdAt || '—' }}</td>
              <td>{{ item.rejectReason || '—' }}</td>
              <td>
                <button v-if="isPending(item.status)" class="auditBtn" @click="openAudit(item)">审核</button>
                <span v-else class="muted">已处理</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <footer class="footer">
        <span>
          共 {{ total }} 条
          <template v-if="keyword.trim()">（当前页筛选 {{ displayList.length }} 条）</template>
        </span>
        <div v-if="totalPages > 1">
          <button :disabled="page <= 1" @click="load(page - 1)">上一页</button>
          <span>{{ page }} / {{ totalPages }}</span>
          <button :disabled="page >= totalPages" @click="load(page + 1)">下一页</button>
        </div>
      </footer>
    </div>

    <Teleport to="body">
      <div v-if="auditOpen" class="overlay" @click.self="closeAudit">
        <div class="modal">
          <h3>审核楼栋变更</h3>
          <div class="summary">
            <span>住户</span><strong>{{ target?.residentName || target?.residentPhone || '—' }}</strong>
            <span>原地址</span><strong>{{ target ? formatAddress(target, true) : '—' }}</strong>
            <span>申请地址</span><strong>{{ target ? formatAddress(target) : '—' }}</strong>
          </div>
          <label>审核结果</label>
          <select v-model="auditResult">
            <option :value="AUDIT_RESULT.APPROVED">通过</option>
            <option :value="AUDIT_RESULT.REJECTED">拒绝</option>
          </select>
          <label>{{ auditResult === AUDIT_RESULT.REJECTED ? '拒绝原因' : '备注（选填）' }}</label>
          <textarea v-model="remark" rows="4" maxlength="200" :placeholder="auditResult === AUDIT_RESULT.REJECTED ? '请填写拒绝原因' : '审核备注'" />
          <p v-if="formError" class="error">{{ formError }}</p>
          <div class="actions">
            <button type="button" class="secondary" @click="closeAudit">取消</button>
            <button type="button" class="primary" :disabled="submitting" @click="submitAudit">
              {{ submitting ? '提交中...' : '确认提交' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { buildingChangeAdminApi } from '../../api/services'
import type { BuildingChangeApplication } from '../../api/types'
import { ApiError } from '../../api/request'
import {
  AUDIT_RESULT,
  BUILDING_CHANGE_STATUS,
  BUILDING_CHANGE_STATUS_LABEL,
  BUILDING_CHANGE_STATUS_OPTIONS,
  getEnumLabel
} from '../../constants/enums'

const PAGE_SIZE = 20
const list = ref<BuildingChangeApplication[]>([])
const loading = ref(false)
const loadError = ref('')
const keyword = ref('')
const status = ref(BUILDING_CHANGE_STATUS.PENDING)
const page = ref(1)
const total = ref(0)
const totalPages = ref(1)
const auditOpen = ref(false)
const target = ref<BuildingChangeApplication | null>(null)
const auditResult = ref<string>(AUDIT_RESULT.APPROVED)
const remark = ref('')
const formError = ref('')
const submitting = ref(false)

const displayList = computed(() => {
  const q = keyword.value.trim().toLowerCase()
  if (!q) return list.value
  return list.value.filter((item) => {
    const haystack = [item.residentName, item.residentPhone, item.residentId]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return haystack.includes(q)
  })
})

function normalizeStatus(value?: string) {
  return value === BUILDING_CHANGE_STATUS.PENDING_AUDIT ? BUILDING_CHANGE_STATUS.PENDING : value || ''
}

function isPending(value?: string) {
  return normalizeStatus(value) === BUILDING_CHANGE_STATUS.PENDING
}

function statusLabel(value?: string) {
  return getEnumLabel(BUILDING_CHANGE_STATUS_LABEL, value, value || '—')
}

function formatAddress(item: BuildingChangeApplication, old = false) {
  const values = old
    ? [item.oldBuilding, item.oldUnit, item.oldFloor, item.oldRoom]
    : [item.building, item.unit, item.floor, item.room]
  const suffixes = ['栋', '单元', '层', '室']
  const address = values.map((value, index) => value ? `${value}${suffixes[index]}` : '').filter(Boolean)
  return address.join(' ') || '—'
}

async function load(nextPage = page.value) {
  loading.value = true
  loadError.value = ''
  try {
    const result = await buildingChangeAdminApi.list({
      page: nextPage,
      pageSize: PAGE_SIZE,
      status: status.value || undefined
    })
    list.value = result.list || []
    page.value = result.pagination?.page ?? nextPage
    total.value = result.pagination?.total ?? list.value.length
    totalPages.value = result.pagination?.totalPages ?? 1
  } catch (error) {
    list.value = []
    loadError.value = error instanceof ApiError ? error.message : '楼栋变更申请加载失败'
  } finally {
    loading.value = false
  }
}

function applyFilters() {
  load(1)
}

function openAudit(item: BuildingChangeApplication) {
  target.value = item
  auditResult.value = AUDIT_RESULT.APPROVED
  remark.value = ''
  formError.value = ''
  auditOpen.value = true
}

function closeAudit() {
  auditOpen.value = false
  target.value = null
  formError.value = ''
}

async function submitAudit() {
  if (!target.value || submitting.value) return
  if (auditResult.value === AUDIT_RESULT.REJECTED && !remark.value.trim()) {
    formError.value = '拒绝时请填写原因'
    return
  }
  submitting.value = true
  formError.value = ''
  try {
    if (auditResult.value === AUDIT_RESULT.APPROVED) {
      await buildingChangeAdminApi.approve(target.value.id)
    } else {
      await buildingChangeAdminApi.reject(target.value.id, remark.value.trim())
    }
    closeAudit()
    await load(page.value)
  } catch (error) {
    formError.value = error instanceof ApiError ? error.message : '审核提交失败'
  } finally {
    submitting.value = false
  }
}

onMounted(() => load(1))
</script>

<style scoped>
.page { max-width: 1200px; }
.header { margin-bottom: 20px; }
h1 { margin: 0 0 8px; font-size: 24px; color: #1f1f2e; }
.header p { margin: 0; color: #8c8c9a; font-size: 14px; }
.panel { overflow: hidden; border-radius: 12px; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,.04); }
.toolbar { display: flex; gap: 12px; padding: 16px 20px; border-bottom: 1px solid #f0f0f3; }
.search { display: flex; flex: 1; gap: 8px; }
input, select, textarea { box-sizing: border-box; width: 100%; padding: 10px 12px; border: 1px solid #e8e8ec; border-radius: 8px; background: #fff; color: #1f1f2e; }
.toolbar select { width: 150px; }
button { padding: 9px 14px; border: 1px solid #e8e8ec; border-radius: 8px; background: #fff; color: #5c5c66; cursor: pointer; }
button:disabled { opacity: .55; cursor: not-allowed; }
.search button, .primary, .auditBtn { border-color: #5c5c9e; background: #5c5c9e; color: #fff; }
.tableWrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
th, td { padding: 14px 16px; border-bottom: 1px solid #f0f0f3; text-align: left; vertical-align: top; }
th { background: #fafafc; color: #8c8c9a; font-weight: 500; white-space: nowrap; }
td strong, td small { display: block; }
td small, .muted { margin-top: 4px; color: #8c8c9a; }
.badge { display: inline-block; padding: 4px 9px; border-radius: 10px; background: #f4f5f7; }
.badge.pending { background: #fff7e6; color: #d48806; }
.badge.approved { background: #e8f8f0; color: #389e0d; }
.badge.rejected { background: #fff1f0; color: #cf1322; }
.empty { padding: 40px; text-align: center; color: #8c8c9a; }
.error { color: #e05c5c; }
.footer { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 14px 20px; color: #8c8c9a; font-size: 13px; }
.footer div { display: flex; align-items: center; gap: 10px; }
.overlay { position: fixed; inset: 0; z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px; background: rgba(0,0,0,.45); }
.modal { width: min(480px, 100%); padding: 24px; border-radius: 12px; background: #fff; }
.modal h3 { margin: 0 0 16px; color: #1f1f2e; }
.modal label { display: block; margin: 14px 0 7px; color: #5c5c66; font-size: 13px; }
.summary { display: grid; grid-template-columns: auto 1fr; gap: 8px 14px; padding: 14px; border-radius: 8px; background: #fafafc; font-size: 13px; }
.summary span { color: #8c8c9a; }
.actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 18px; }
@media (max-width: 640px) {
  .toolbar { flex-direction: column; }
  .toolbar select { width: 100%; }
  .footer { align-items: flex-start; flex-direction: column; }
  .overlay { align-items: flex-end; padding: 0; }
  .modal { border-radius: 16px 16px 0 0; }
}
</style>
