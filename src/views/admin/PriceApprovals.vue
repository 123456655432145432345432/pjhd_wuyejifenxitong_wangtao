<template>
  <div class="page" :class="{ mobilePage: isMobile }">
    <div class="header">
      <div>
        <h1 class="title">价格审批</h1>
        <p class="desc">审核配送费、商品价格、商家分成等价格变更申请</p>
      </div>
      <button class="btnPrimary" @click="openCreate">发起审批</button>
    </div>

    <div class="toolbar">
      <select v-model="filterStatus" class="input" @change="reload">
        <option v-for="opt in PRICE_APPROVAL_STATUS_OPTIONS" :key="opt.value || 'all'" :value="opt.value">
          {{ opt.label }}
        </option>
      </select>
      <button class="btnPrimary" :disabled="loading" @click="reload">刷新</button>
    </div>

    <div class="panel">
      <div v-if="loading" class="hint">加载中...</div>
      <p v-else-if="error" class="error">{{ error }}</p>
      <table v-else-if="list.length" class="table" :class="{ mobileCards: isMobile }">
        <thead>
          <tr>
            <th>类型</th>
            <th>申请人</th>
            <th>原因</th>
            <th>状态</th>
            <th>申请时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in list" :key="item.id">
            <td>{{ getEnumLabel(PRICE_APPROVAL_ITEM_TYPE_LABEL, item.itemType) }}</td>
            <td>{{ item.applicantName || item.applicantId || '—' }}</td>
            <td class="reasonCell">{{ item.reason || '—' }}</td>
            <td>
              <span :class="['statusBadge', item.status]">
                {{ getEnumLabel(PRICE_APPROVAL_STATUS_LABEL, item.status) }}
              </span>
            </td>
            <td>{{ item.createdAt || '—' }}</td>
            <td>
              <button
                v-if="item.status === PRICE_APPROVAL_STATUS.PENDING"
                class="linkBtn"
                @click="openAudit(item)"
              >
                审批
              </button>
              <span v-else class="doneLabel">已处理</span>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else class="hint">暂无审批记录</p>
      <div v-if="totalPages > 1" class="pager">
        <button class="pageBtn" :disabled="page <= 1" @click="changePage(page - 1)">&lt;</button>
        <span>{{ page }} / {{ totalPages }}</span>
        <button class="pageBtn" :disabled="page >= totalPages" @click="changePage(page + 1)">&gt;</button>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="auditModalOpen" class="modalOverlay" @click.self="closeAudit">
        <div class="modal modalWide" :class="{ mobileSheet: isMobile }">
          <div class="modalHeader">
            <h3 class="modalTitle">价格变更审批</h3>
            <button class="modalClose" @click="closeAudit">&times;</button>
          </div>
          <div class="modalBody">
            <div class="auditInfo">
              <div class="infoRow"><span>类型</span><strong>{{ getEnumLabel(PRICE_APPROVAL_ITEM_TYPE_LABEL, auditTarget?.itemType) }}</strong></div>
              <div class="infoRow"><span>申请人</span><strong>{{ auditTarget?.applicantName || '—' }}</strong></div>
              <div class="infoRow diffRow">
                <span>变更内容</span>
                <div v-if="auditDiff.length" class="diffTable">
                  <div class="diffHead"><span>字段</span><span>变更前</span><span>变更后</span></div>
                  <div v-for="row in auditDiff" :key="row.key" class="diffLine">
                    <span>{{ row.key }}</span>
                    <strong>{{ row.oldValue }}</strong>
                    <strong>{{ row.newValue }}</strong>
                  </div>
                </div>
                <div v-else class="rawDiff">
                  <strong class="mono">{{ auditTarget?.oldValue || '—' }}</strong>
                  <span>→</span>
                  <strong class="mono">{{ auditTarget?.newValue || '—' }}</strong>
                </div>
              </div>
              <div class="infoRow"><span>原因</span><strong>{{ auditTarget?.reason || '—' }}</strong></div>
            </div>
            <div class="field">
              <label class="label">审批结果</label>
              <div class="radioGroup">
                <label class="radioItem">
                  <input v-model="auditApproved" type="radio" :value="true" /> 通过
                </label>
                <label class="radioItem">
                  <input v-model="auditApproved" type="radio" :value="false" /> 拒绝
                </label>
              </div>
            </div>
            <div class="field">
              <label class="label">备注</label>
              <textarea v-model="auditRemark" class="textarea" rows="3" maxlength="200" />
            </div>
            <p v-if="formError" class="error">{{ formError }}</p>
            <div class="modalFooter">
              <button class="btnSecondary" @click="closeAudit">取消</button>
              <button class="btnPrimary" :disabled="submitting" @click="submitAudit">
                {{ submitting ? '提交中...' : '确认审批' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div v-if="createModalOpen" class="modalOverlay" @click.self="closeCreate">
        <div class="modal modalWide" :class="{ mobileSheet: isMobile }">
          <div class="modalHeader">
            <h3 class="modalTitle">发起价格审批</h3>
            <button class="modalClose" @click="closeCreate">&times;</button>
          </div>
          <div class="modalBody">
            <div class="field">
              <label class="label">审批类型</label>
              <select v-model="createForm.itemType" class="input fullInput">
                <option :value="PRICE_APPROVAL_ITEM_TYPE.DELIVERY_FEE">配送费</option>
                <option :value="PRICE_APPROVAL_ITEM_TYPE.MERCHANT_DISTRIBUTION">商家分成</option>
              </select>
            </div>
            <div class="field">
              <label class="label">关联对象 ID</label>
              <input v-model.trim="createForm.itemId" class="input fullInput" placeholder="请输入商家或规则 ID" />
            </div>
            <div class="field">
              <label class="label">变更前（JSON）</label>
              <textarea v-model="createForm.oldValue" class="textarea mono" rows="3" placeholder='例如：{"amount": 5}' />
            </div>
            <div class="field">
              <label class="label">变更后（JSON）</label>
              <textarea v-model="createForm.newValue" class="textarea mono" rows="3" placeholder='例如：{"amount": 8}' />
            </div>
            <div class="field">
              <label class="label">申请原因</label>
              <textarea v-model="createForm.reason" class="textarea" rows="3" maxlength="200" />
            </div>
            <p v-if="createError" class="error">{{ createError }}</p>
            <div class="modalFooter">
              <button class="btnSecondary" @click="closeCreate">取消</button>
              <button class="btnPrimary" :disabled="creating" @click="submitCreate">
                {{ creating ? '提交中...' : '提交审批' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { priceApprovalApi } from '../../api/services'
import type { PriceApprovalItem } from '../../api/types'
import { ApiError } from '../../api/request'
import {
  getEnumLabel,
  PRICE_APPROVAL_ITEM_TYPE,
  PRICE_APPROVAL_ITEM_TYPE_LABEL,
  PRICE_APPROVAL_STATUS,
  PRICE_APPROVAL_STATUS_LABEL,
  PRICE_APPROVAL_STATUS_OPTIONS
} from '../../constants/enums'
import { useIsMobile } from '../../composables/useIsMobile'

const { isMobile } = useIsMobile()
const loading = ref(false)
const error = ref('')
const list = ref<PriceApprovalItem[]>([])
const page = ref(1)
const totalPages = ref(1)
const filterStatus = ref('')

const auditModalOpen = ref(false)
const auditTarget = ref<PriceApprovalItem | null>(null)
const auditApproved = ref(true)
const auditRemark = ref('')
const submitting = ref(false)
const formError = ref('')
const createModalOpen = ref(false)
const creating = ref(false)
const createError = ref('')
const createForm = reactive({
  itemType: PRICE_APPROVAL_ITEM_TYPE.DELIVERY_FEE as string,
  itemId: '',
  oldValue: '',
  newValue: '',
  reason: ''
})

function parseJsonObject(value?: string): Record<string, unknown> | null {
  if (!value) return null
  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null
  } catch {
    return null
  }
}

function displayValue(value: unknown) {
  if (value === undefined) return '—'
  if (value === null) return 'null'
  return typeof value === 'object' ? JSON.stringify(value) : String(value)
}

const auditDiff = computed(() => {
  const oldObject = parseJsonObject(auditTarget.value?.oldValue)
  const newObject = parseJsonObject(auditTarget.value?.newValue)
  if (!oldObject || !newObject) return []
  const keys = [...new Set([...Object.keys(oldObject), ...Object.keys(newObject)])]
  return keys.map((key) => ({
    key,
    oldValue: displayValue(oldObject[key]),
    newValue: displayValue(newObject[key])
  }))
})

async function load(pageNo = 1) {
  loading.value = true
  error.value = ''
  try {
    const res = await priceApprovalApi.list({
      page: pageNo,
      pageSize: 20,
      status: filterStatus.value || undefined
    })
    list.value = res.list || []
    page.value = res.pagination?.page ?? pageNo
    totalPages.value = res.pagination?.totalPages ?? 1
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '加载失败'
  } finally {
    loading.value = false
  }
}

function reload() { load(1) }
function changePage(p: number) { load(p) }

function openAudit(item: PriceApprovalItem) {
  auditTarget.value = item
  auditApproved.value = true
  auditRemark.value = ''
  formError.value = ''
  auditModalOpen.value = true
}

function closeAudit() {
  auditModalOpen.value = false
  auditTarget.value = null
}

function openCreate() {
  createForm.itemType = PRICE_APPROVAL_ITEM_TYPE.DELIVERY_FEE
  createForm.itemId = ''
  createForm.oldValue = ''
  createForm.newValue = ''
  createForm.reason = ''
  createError.value = ''
  createModalOpen.value = true
}

function closeCreate() {
  createModalOpen.value = false
}

async function submitCreate() {
  if (!createForm.itemId || !createForm.oldValue.trim() || !createForm.newValue.trim()) {
    createError.value = '请填写关联对象 ID、变更前和变更后内容'
    return
  }
  if (!parseJsonObject(createForm.oldValue) || !parseJsonObject(createForm.newValue)) {
    createError.value = '变更前和变更后须为有效的 JSON 对象'
    return
  }
  creating.value = true
  createError.value = ''
  try {
    await priceApprovalApi.create({
      itemType: createForm.itemType,
      itemId: createForm.itemId,
      oldValue: createForm.oldValue.trim(),
      newValue: createForm.newValue.trim(),
      reason: createForm.reason.trim() || undefined
    })
    closeCreate()
    await load(1)
  } catch (e) {
    createError.value = e instanceof ApiError ? e.message : '发起审批失败'
  } finally {
    creating.value = false
  }
}

async function submitAudit() {
  if (!auditTarget.value) return
  submitting.value = true
  formError.value = ''
  try {
    await priceApprovalApi.audit(auditTarget.value.id, {
      approved: auditApproved.value,
      remark: auditRemark.value.trim() || undefined
    })
    closeAudit()
    await load(page.value)
  } catch (e) {
    formError.value = e instanceof ApiError ? e.message : '审批失败'
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
.toolbar { display: flex; gap: 12px; margin-bottom: 16px; }
.input { padding: 10px 14px; border: 1px solid #e8e8ec; border-radius: 8px; font-size: 14px; }
.panel { background: #fff; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.table { width: 100%; border-collapse: collapse; font-size: 14px; }
.table th, .table td { padding: 12px 16px; text-align: left; border-bottom: 1px solid #f0f0f3; }
.table th { color: #8c8c9a; font-weight: 500; background: #fafafc; }
.reasonCell { max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.statusBadge { display: inline-block; padding: 4px 10px; border-radius: 12px; font-size: 12px; }
.statusBadge.pending { background: #fff7e6; color: #d48806; }
.statusBadge.approved { background: #e6f7ee; color: #389e0d; }
.statusBadge.rejected { background: #fff1f0; color: #cf1322; }
.linkBtn { border: none; background: none; color: #5c5c9e; cursor: pointer; font-size: 14px; }
.doneLabel { font-size: 12px; color: #8c8c9a; }
.btnPrimary { padding: 10px 18px; border-radius: 8px; background: #5c5c9e; color: #fff; border: none; cursor: pointer; }
.btnSecondary { padding: 10px 18px; border-radius: 8px; border: 1px solid #e8e8ec; background: #fff; cursor: pointer; }
.hint, .error { font-size: 14px; color: #8c8c9a; text-align: center; padding: 24px 0; }
.error { color: #e05c5c; }
.pager { display: flex; align-items: center; justify-content: center; gap: 12px; margin-top: 16px; }
.pageBtn { padding: 6px 12px; border: 1px solid #e8e8ec; border-radius: 8px; background: #fff; cursor: pointer; }
.modalOverlay { position: fixed; inset: 0; z-index: 1000; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; padding: 24px; }
.modal { background: #fff; border-radius: 12px; width: min(480px, 100%); max-height: 90vh; overflow: auto; }
.modalWide { width: min(560px, 100%); }
.modalHeader { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid #f0f0f3; }
.modalTitle { font-size: 16px; font-weight: 600; margin: 0; }
.modalClose { border: none; background: none; font-size: 24px; cursor: pointer; color: #8c8c9a; }
.modalBody { padding: 24px; }
.auditInfo { background: #fafafc; border-radius: 8px; padding: 12px 16px; margin-bottom: 16px; }
.infoRow { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; gap: 12px; }
.infoRow span { color: #8c8c9a; flex-shrink: 0; }
.mono { font-family: monospace; font-size: 12px; word-break: break-all; text-align: right; }
.diffRow { align-items: flex-start; }
.diffTable { flex: 1; min-width: 0; }
.diffHead, .diffLine { display: grid; grid-template-columns: minmax(80px, 1fr) repeat(2, minmax(100px, 1fr)); gap: 8px; padding: 6px 0; text-align: left; }
.diffHead { color: #8c8c9a; border-bottom: 1px solid #e8e8ec; }
.diffLine strong { font-size: 12px; word-break: break-all; }
.rawDiff { display: flex; align-items: center; justify-content: flex-end; gap: 8px; min-width: 0; }
.fullInput { width: 100%; box-sizing: border-box; }
.field { margin-bottom: 16px; }
.label { display: block; font-size: 13px; color: #5c5c66; margin-bottom: 8px; }
.radioGroup { display: flex; gap: 20px; }
.radioItem { display: flex; align-items: center; gap: 6px; font-size: 14px; cursor: pointer; }
.textarea { width: 100%; padding: 10px 12px; border: 1px solid #e8e8ec; border-radius: 8px; font-size: 14px; box-sizing: border-box; resize: vertical; font-family: inherit; }
.modalFooter { display: flex; justify-content: flex-end; gap: 12px; margin-top: 8px; }
@media (max-width: 768px) {
  .page { max-width: none; }
  .header { flex-direction: column; margin-bottom: 16px; }
  .title { font-size: 21px; }
  .header .btnPrimary { width: 100%; }
  .toolbar { display: grid; grid-template-columns: 1fr auto; gap: 8px; }
  .toolbar .input { width: 100%; min-width: 0; box-sizing: border-box; }
  .panel { padding: 12px; border-radius: 14px; }
  .mobileCards thead { display: none; }
  .mobileCards, .mobileCards tbody, .mobileCards tr, .mobileCards td { display: block; width: 100%; }
  .mobileCards tr { padding: 12px 0; border-bottom: 1px solid #f0f0f3; }
  .mobileCards td {
    display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;
    padding: 6px 0; text-align: right; border-bottom: none;
  }
  .mobileCards td::before { color: #8c8c9a; text-align: left; flex-shrink: 0; }
  .mobileCards td:nth-child(1)::before { content: '类型'; }
  .mobileCards td:nth-child(2)::before { content: '申请人'; }
  .mobileCards td:nth-child(3)::before { content: '原因'; }
  .mobileCards td:nth-child(4)::before { content: '状态'; }
  .mobileCards td:nth-child(5)::before { content: '申请时间'; }
  .mobileCards td:nth-child(6)::before { content: '操作'; }
  .mobileCards .reasonCell {
    max-width: none; overflow: visible; text-overflow: unset;
    white-space: normal; word-break: break-word;
  }
  .pager { justify-content: center; }
  .modalOverlay { padding: 0; align-items: flex-end; }
  .modal.mobileSheet { max-width: 100%; width: 100%; border-radius: 18px 18px 0 0; max-height: 90vh; }
  .infoRow { flex-direction: column; align-items: flex-start; }
  .diffHead, .diffLine { grid-template-columns: 1fr; }
  .rawDiff { flex-wrap: wrap; justify-content: flex-start; }
}
</style>
