<template>
  <div class="page" :class="{ mobilePage: isMobile }">
    <div class="header">
      <div>
        <h1 class="title">特惠推送</h1>
        <p class="desc">统筹级特惠推送（需具备特惠推送权限；仅本物业；住户端仅见已发布且在有效期内）</p>
      </div>
      <button class="btnPrimary" @click="openCreate">新建特惠</button>
    </div>

    <div class="toolbar">
      <select v-model="targetTypeFilter" class="input" @change="reload">
        <option value="">全部对象</option>
        <option v-for="opt in targetTypeOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
      </select>
      <select v-model="statusFilter" class="input" @change="reload">
        <option value="">全部状态</option>
        <option v-for="opt in statusOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
      </select>
      <button class="btnGhost" :disabled="loading" @click="reload">刷新</button>
    </div>

    <div class="panel">
      <div v-if="loading" class="loading">加载中...</div>
      <p v-else-if="error" class="error">{{ error }}</p>
      <table v-else-if="offers.length" class="table" :class="{ mobileCards: isMobile }">
        <thead>
          <tr>
            <th>标题</th>
            <th>推送对象</th>
            <th>关联商家</th>
            <th>优惠信息</th>
            <th>有效期</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in offers" :key="item.id">
            <td>{{ item.title }}</td>
            <td>{{ getEnumLabel(SPECIAL_OFFER_TARGET_TYPE_LABEL, item.targetType, '—') }}</td>
            <td>{{ item.merchantName || '—' }}</td>
            <td>{{ item.discountInfo || '—' }}</td>
            <td>{{ item.startTime || '—' }} ~ {{ item.endTime || '—' }}</td>
            <td>
              <span class="statusTag" :class="normalizeSpecialOfferStatusClass(item.status)">{{ offerStatusText(item) }}</span>
            </td>
            <td class="actions">
              <button
                v-if="canPublish(item.status)"
                class="btnLink"
                :disabled="actionId === item.id"
                @click="publishOffer(item.id)"
              >
                立即发布
              </button>
              <button
                v-if="canUnpublish(item.status)"
                class="btnLink"
                :disabled="actionId === item.id"
                @click="unpublishOffer(item.id)"
              >
                下架
              </button>
              <button
                class="btnDanger"
                :disabled="!isOfferRemovable(item.status) || removingId === item.id"
                @click="removeOffer(item.id)"
              >
                删除
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else class="empty">暂无特惠推送</p>
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
            <h3 class="modalTitle">新建特惠推送</h3>
            <button class="modalClose" @click="closeModal">&times;</button>
          </div>
          <div class="modalBody">
            <p v-if="formError" class="error">{{ formError }}</p>
            <div class="field">
              <label class="label">标题</label>
              <input v-model="form.title" class="input" placeholder="如：官方推荐满50减5" />
            </div>
            <div class="field">
              <label class="label">活动内容</label>
              <textarea v-model="form.content" class="textarea" rows="2" placeholder="请填写活动详细说明" />
            </div>
            <div class="field">
              <label class="label">推送对象</label>
              <select v-model="form.targetType" class="input">
                <option v-for="opt in targetTypeOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
              </select>
            </div>
            <div v-if="form.targetType === SPECIAL_OFFER_TARGET_TYPE.ROLE" class="field">
              <label class="label">关联商家</label>
              <select v-model="form.merchantId" class="input">
                <option value="">请选择商家</option>
                <option v-for="m in merchantOptions" :key="m.id" :value="m.id">{{ m.name }}</option>
              </select>
            </div>
            <div class="field">
              <label class="label">优惠信息</label>
              <input v-model="form.discountInfo" class="input" placeholder="如：满100减20" />
            </div>
            <div class="field">
              <label class="label">最低消费（可选）</label>
              <input v-model.number="form.minConsumption" type="number" min="0" step="0.01" class="input" />
            </div>
            <div class="fieldRow">
              <div class="field">
                <label class="label">开始时间</label>
                <input v-model="form.startTime" type="datetime-local" class="input" />
              </div>
              <div class="field">
                <label class="label">结束时间</label>
                <input v-model="form.endTime" type="datetime-local" class="input" />
              </div>
            </div>
            <div class="field">
              <label class="label">状态</label>
              <select v-model="form.status" class="input">
                <option v-for="opt in statusFormOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
              </select>
              <p class="hint">住户端仅展示「已发布」且在有效期内的特惠；草稿不会在住户端展示。也可保存草稿后在列表点「立即发布」。</p>
            </div>
          </div>
          <div class="modalFooter">
            <button class="btnGhost" @click="closeModal">取消</button>
            <button class="btnPrimary" :disabled="submitting" @click="submitCreate">
              {{ submitting ? '提交中...' : '创建' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { merchantApi, specialOfferApi } from '../../api/services'
import type { MerchantItem, SpecialOfferItem } from '../../api/types'
import { ApiError } from '../../api/request'
import {
  getEnumLabel,
  isSpecialOfferArchived,
  MERCHANT_LEVEL,
  normalizeSpecialOfferStatus,
  normalizeSpecialOfferStatusClass,
  SPECIAL_OFFER_STATUS,
  SPECIAL_OFFER_STATUS_LABEL,
  SPECIAL_OFFER_STATUS_OPTIONS,
  SPECIAL_OFFER_STATUS_FORM_OPTIONS,
  SPECIAL_OFFER_TARGET_TYPE,
  SPECIAL_OFFER_TARGET_TYPE_LABEL,
  SPECIAL_OFFER_COORDINATOR_TARGET_TYPE_OPTIONS
} from '../../constants/enums'
import { useIsMobile } from '../../composables/useIsMobile'
import { toApiDateTime } from '../../utils/datetime'

const offers = ref<SpecialOfferItem[]>([])
const { isMobile } = useIsMobile()
const merchantOptions = ref<MerchantItem[]>([])
const loading = ref(false)
const error = ref('')
const page = ref(1)
const totalPages = ref(1)
const targetTypeFilter = ref('')
const statusFilter = ref('')
const removingId = ref('')
const actionId = ref('')
const modalOpen = ref(false)
const submitting = ref(false)
const formError = ref('')

const targetTypeOptions = SPECIAL_OFFER_COORDINATOR_TARGET_TYPE_OPTIONS
const statusOptions = SPECIAL_OFFER_STATUS_OPTIONS
const statusFormOptions = SPECIAL_OFFER_STATUS_FORM_OPTIONS

function offerStatusText(item: SpecialOfferItem) {
  return item.statusLabel || getEnumLabel(SPECIAL_OFFER_STATUS_LABEL, item.status)
}

function canPublish(status?: string) {
  const s = normalizeSpecialOfferStatus(status)
  return s === SPECIAL_OFFER_STATUS.DRAFT || s === SPECIAL_OFFER_STATUS.ENDED
}

function canUnpublish(status?: string) {
  return normalizeSpecialOfferStatus(status) === SPECIAL_OFFER_STATUS.PUBLISHED
}

const form = reactive({
  title: '',
  content: '',
  targetType: SPECIAL_OFFER_TARGET_TYPE.ALL,
  merchantId: '',
  discountInfo: '',
  minConsumption: undefined as number | undefined,
  startTime: '',
  endTime: '',
  status: SPECIAL_OFFER_STATUS.PUBLISHED
})

function isOfferRemovable(status?: string) {
  return !isSpecialOfferArchived(status)
}

function defaultRange() {
  const now = new Date()
  const end = new Date(now.getTime() + 7 * 24 * 3600 * 1000)
  const fmt = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }
  form.startTime = fmt(now)
  form.endTime = fmt(end)
}

async function loadMerchants() {
  try {
    const res = await merchantApi.list({
      page: 1,
      pageSize: 100,
      merchantLevel: MERCHANT_LEVEL.OFFICIAL_CERTIFIED,
      sort: '+rankOrder'
    })
    merchantOptions.value = res.list || []
  } catch {
    merchantOptions.value = []
  }
}

async function load(pageNo = 1) {
  loading.value = true
  error.value = ''
  try {
    const res = await specialOfferApi.list({
      page: pageNo,
      pageSize: 20,
      targetType: targetTypeFilter.value || undefined,
      status: statusFilter.value || undefined
    })
    offers.value = res.list || []
    page.value = res.pagination?.page || pageNo
    totalPages.value = res.pagination?.totalPages || 1
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '特惠列表加载失败'
  } finally {
    loading.value = false
  }
}

function reload() {
  load(1)
}

function changePage(next: number) {
  load(next)
}

function openCreate() {
  form.title = ''
  form.content = ''
  form.targetType = SPECIAL_OFFER_TARGET_TYPE.ALL
  form.merchantId = ''
  form.discountInfo = ''
  form.minConsumption = undefined
  form.status = SPECIAL_OFFER_STATUS.PUBLISHED
  submitting.value = false
  defaultRange()
  formError.value = ''
  modalOpen.value = true
}

function closeModal() {
  modalOpen.value = false
  submitting.value = false
}

async function submitCreate() {
  if (!form.title.trim()) {
    formError.value = '请填写标题'
    return
  }
  if (!form.content.trim()) {
    formError.value = '请填写活动内容'
    return
  }
  if (!form.startTime || !form.endTime) {
    formError.value = '请填写有效期'
    return
  }
  if (form.targetType === SPECIAL_OFFER_TARGET_TYPE.ROLE && !form.merchantId) {
    formError.value = '指定商户时请选择商家'
    return
  }
  submitting.value = true
  formError.value = ''
  try {
    await specialOfferApi.create({
      title: form.title.trim(),
      content: form.content.trim(),
      targetType: form.targetType,
      startTime: toApiDateTime(form.startTime),
      endTime: toApiDateTime(form.endTime),
      merchantId:
        form.targetType === SPECIAL_OFFER_TARGET_TYPE.ROLE ? form.merchantId : undefined,
      discountInfo: form.discountInfo.trim() || undefined,
      minConsumption: form.minConsumption,
      status: form.status || SPECIAL_OFFER_STATUS.PUBLISHED
    })
    closeModal()
    await load(1)
  } catch (e) {
    formError.value = e instanceof ApiError ? e.message : '创建失败，请确认是否有特惠推送权限'
  } finally {
    submitting.value = false
  }
}

async function publishOffer(id: string) {
  actionId.value = id
  error.value = ''
  try {
    await specialOfferApi.publish(id)
    await load(page.value)
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '发布失败'
  } finally {
    actionId.value = ''
  }
}

async function unpublishOffer(id: string) {
  if (!confirm('确认下架？住户端将立即看不到该特惠。')) return
  actionId.value = id
  error.value = ''
  try {
    await specialOfferApi.unpublish(id)
    await load(page.value)
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '下架失败'
  } finally {
    actionId.value = ''
  }
}

async function removeOffer(id: string) {
  if (!confirm('确认删除该特惠推送？删除后将归档。')) return
  removingId.value = id
  try {
    await specialOfferApi.remove(id)
    await load(page.value)
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '删除失败'
  } finally {
    removingId.value = ''
  }
}

onMounted(async () => {
  await loadMerchants()
  await load(1)
})
</script>

<style scoped>
.page { max-width: 1200px; }
.header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 24px; }
.title { font-size: 24px; font-weight: 600; color: #1f1f2e; margin-bottom: 8px; }
.desc { font-size: 14px; color: #8c8c9a; }
.toolbar { display: flex; gap: 12px; margin-bottom: 16px; }
.input { padding: 8px 12px; border: 1px solid #e8e8ec; border-radius: 8px; background: #fff; }
.btnPrimary { padding: 10px 18px; border-radius: 8px; background: #5c5c9e; color: #fff; border: none; cursor: pointer; }
.btnPrimary:hover { background: #52529a; }
.btnGhost { padding: 8px 14px; border-radius: 8px; border: 1px solid #e8e8ec; background: #fff; color: #5c5c66; font-size: 14px; cursor: pointer; }
.btnGhost:hover { border-color: #5c5c9e; color: #5c5c9e; }
.panel { background: #fff; border-radius: 12px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.table { width: 100%; border-collapse: collapse; font-size: 14px; }
.table th, .table td { padding: 12px 10px; border-bottom: 1px solid #f0f0f3; text-align: left; }
.table th { color: #8c8c9a; font-weight: 500; }
.loading, .empty, .error { font-size: 14px; color: #8c8c9a; padding: 12px 0; }
.error { color: #e05c5c; }
.statusTag { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; background: #f0f0f3; color: #5c5c66; }
.statusTag.draft { background: #f5f5f5; color: #8c8c9a; }
.statusTag.active { background: #fff7e6; color: #d48806; }
.statusTag.published { background: #e6f7ef; color: #389e6d; }
.statusTag.ended { background: #f0f0f3; color: #5c5c66; }
.statusTag.archived { background: #f5f5f5; color: #8c8c9a; }
.statusTag.default { background: #f0f0f3; color: #5c5c66; }
.actions { white-space: nowrap; display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.btnLink { border: none; background: none; color: #5c5c9e; cursor: pointer; padding: 0; font-size: 13px; }
.btnLink:disabled { color: #c0c0c8; cursor: not-allowed; }
.btnDanger { padding: 6px 12px; border-radius: 6px; background: #fff1f0; color: #cf1322; border: 1px solid #ffa39e; cursor: pointer; font-size: 13px; }
.btnDanger:disabled { opacity: 0.5; cursor: not-allowed; }
.pager { display: flex; align-items: center; gap: 12px; margin-top: 16px; font-size: 14px; }
.modalOverlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal { width: 520px; max-width: calc(100vw - 32px); background: #fff; border-radius: 12px; overflow: hidden; max-height: 90vh; overflow-y: auto; }
.modalHeader { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid #f0f0f3; }
.modalTitle { font-size: 16px; font-weight: 600; }
.modalClose { border: none; background: none; font-size: 22px; cursor: pointer; color: #8c8c9a; }
.modalBody { padding: 20px; }
.modalFooter { display: flex; justify-content: flex-end; gap: 10px; padding: 16px 20px; border-top: 1px solid #f0f0f3; }
.field { margin-bottom: 14px; }
.fieldRow { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.label { display: block; font-size: 13px; color: #8c8c9a; margin-bottom: 6px; }
.hint { margin: 6px 0 0; font-size: 12px; color: #8c8c9a; line-height: 1.4; }
.textarea { width: 100%; padding: 8px 12px; border: 1px solid #e8e8ec; border-radius: 8px; resize: vertical; box-sizing: border-box; }
@media (max-width: 768px) {
  .page { max-width: none; }.header { flex-direction: column; margin-bottom: 16px; }
  .title { font-size: 21px; }.header .btnPrimary { width: 100%; }
  .toolbar { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }.toolbar .input, .toolbar .btnGhost { width: 100%; box-sizing: border-box; }
  .panel { padding: 12px; border-radius: 14px; }
  .mobileCards thead { display: none; }.mobileCards, .mobileCards tbody, .mobileCards tr, .mobileCards td { display: block; width: 100%; }
  .mobileCards tr { padding: 12px 0; border-bottom: 1px solid #f0f0f3; }.mobileCards td { display: flex; justify-content: space-between; gap: 12px; padding: 6px 0; text-align: right; }
  .mobileCards td::before { color: #8c8c9a; text-align: left; }.mobileCards td:nth-child(1)::before { content: '标题'; }.mobileCards td:nth-child(2)::before { content: '推送对象'; }
  .mobileCards td:nth-child(3)::before { content: '关联商家'; }.mobileCards td:nth-child(4)::before { content: '优惠信息'; }.mobileCards td:nth-child(5)::before { content: '有效期'; }
  .mobileCards td:nth-child(6)::before { content: '状态'; }.mobileCards td:nth-child(7)::before { content: '操作'; }
  .pager { justify-content: center; }.modalOverlay { padding: 0; align-items: flex-end; }.modal.mobileSheet { max-width: 100%; border-radius: 18px 18px 0 0; }
  .fieldRow { grid-template-columns: 1fr; }
}
</style>
