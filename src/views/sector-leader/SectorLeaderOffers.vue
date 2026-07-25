<template>
  <div class="page" :class="{ mobile: isMobile }">
    <div class="header">
      <div>
        <h1 class="title">板块特惠</h1>
        <p class="desc">为本板块创建和管理特惠推送</p>
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
      <div v-else-if="offers.length" class="tableWrap">
        <table v-if="!isMobile" class="table">
          <thead>
            <tr>
              <th>封面</th>
              <th>标题</th>
              <th>推送对象</th>
              <th>关联商家</th>
              <th>优惠信息</th>
              <th>门槛</th>
              <th>配额</th>
              <th>有效期</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in offers" :key="item.id">
              <td>
                <img v-if="item.coverUrl" :src="item.coverUrl" alt="" class="coverThumb" @error="onCoverError" />
                <span v-else class="coverPlaceholder">—</span>
              </td>
              <td class="titleCell">{{ item.title }}</td>
              <td>{{ getEnumLabel(SPECIAL_OFFER_TARGET_TYPE_LABEL, item.targetType, '—') }}</td>
              <td>{{ item.merchantName || '—' }}</td>
              <td>{{ item.discountInfo || '—' }}</td>
              <td>{{ formatMinConsumption(item.minConsumption) }}</td>
              <td>{{ formatQuota(item) }}</td>
              <td class="timeCell">{{ item.startTime || '—' }} ~ {{ item.endTime || '—' }}</td>
              <td>
                <span class="statusTag" :class="normalizeSpecialOfferStatusClass(item.status)">{{ getEnumLabel(SPECIAL_OFFER_STATUS_LABEL, item.status) }}</span>
              </td>
              <td class="actionsCell">
                <button class="btnLink" @click="openDetail(item.id)">详情</button>
                <button
                  class="btnLink"
                  :disabled="!isOfferEditable(item.status)"
                  @click="openEdit(item.id)"
                >
                  编辑
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
        <div v-else class="mobileCards">
          <article v-for="item in offers" :key="item.id" class="offerCard">
            <div class="cardHeading">
              <div class="offerIdentity">
                <img v-if="item.coverUrl" :src="item.coverUrl" alt="" class="coverThumb" @error="onCoverError" />
                <strong>{{ item.title }}</strong>
              </div>
              <span class="statusTag" :class="normalizeSpecialOfferStatusClass(item.status)">{{ getEnumLabel(SPECIAL_OFFER_STATUS_LABEL, item.status) }}</span>
            </div>
            <div class="cardMeta">
              <span>{{ getEnumLabel(SPECIAL_OFFER_TARGET_TYPE_LABEL, item.targetType, '—') }} · {{ item.merchantName || '未关联商家' }}</span>
              <span>{{ item.discountInfo || '暂无优惠信息' }} · {{ formatMinConsumption(item.minConsumption) }}</span>
              <span>{{ item.startTime || '—' }} ~ {{ item.endTime || '—' }}</span>
            </div>
            <div class="cardActions">
              <button class="btnLink" @click="openDetail(item.id)">详情</button>
              <button class="btnLink" :disabled="!isOfferEditable(item.status)" @click="openEdit(item.id)">编辑</button>
              <button class="btnDanger" :disabled="!isOfferRemovable(item.status) || removingId === item.id" @click="removeOffer(item.id)">删除</button>
            </div>
          </article>
        </div>
      </div>
      <p v-else class="empty">暂无特惠推送</p>
    </div>

    <div v-if="totalPages > 1" class="pager">
      <button class="btnGhost" :disabled="page <= 1 || loading" @click="changePage(page - 1)">上一页</button>
      <span>{{ page }} / {{ totalPages }}</span>
      <button class="btnGhost" :disabled="page >= totalPages || loading" @click="changePage(page + 1)">下一页</button>
    </div>

    <Teleport to="body">
      <div v-if="detailOpen" class="modalOverlay" @click.self="closeDetail">
        <div class="modal modalWide" :class="{ mobileSheet: isMobile }">
          <div class="modalHeader">
            <h3 class="modalTitle">特惠详情</h3>
            <button class="modalClose" @click="closeDetail">&times;</button>
          </div>
          <div class="modalBody">
            <div v-if="detailLoading" class="loading">加载中...</div>
            <p v-else-if="detailError" class="error">{{ detailError }}</p>
            <template v-else-if="detailData">
              <div v-if="detailData.coverUrl" class="detailCover">
                <img :src="detailData.coverUrl" alt="" @error="onCoverError" />
              </div>
              <ul class="detailList">
                <li><span>标题</span><strong>{{ detailData.title }}</strong></li>
                <li><span>活动内容</span><strong>{{ detailData.content || '—' }}</strong></li>
                <li><span>推送对象</span><strong>{{ getEnumLabel(SPECIAL_OFFER_TARGET_TYPE_LABEL, detailData.targetType, '—') }}</strong></li>
                <li><span>目标标签</span><strong>{{ formatTargetTags(detailData.targetTags) }}</strong></li>
                <li><span>发布人</span><strong>{{ detailData.publisherName || '—' }}</strong></li>
                <li><span>发布角色</span><strong>{{ detailData.publisherRole || '—' }}</strong></li>
                <li><span>关联商家</span><strong>{{ detailData.merchantName || '—' }}</strong></li>
                <li><span>优惠信息</span><strong>{{ detailData.discountInfo || '—' }}</strong></li>
                <li><span>最低消费</span><strong>{{ formatMinConsumption(detailData.minConsumption) }}</strong></li>
                <li><span>总配额</span><strong>{{ detailData.totalQuota ?? '不限' }}</strong></li>
                <li><span>已使用</span><strong>{{ detailData.usedQuota ?? 0 }}</strong></li>
                <li><span>每人限领</span><strong>{{ detailData.perUserQuota ?? '不限' }}</strong></li>
                <li><span>有效期</span><strong>{{ detailData.startTime }} ~ {{ detailData.endTime }}</strong></li>
                <li><span>状态</span><strong>{{ getEnumLabel(SPECIAL_OFFER_STATUS_LABEL, detailData.status) }}</strong></li>
                <li><span>创建时间</span><strong>{{ detailData.createdAt || '—' }}</strong></li>
              </ul>
            </template>
          </div>
          <div class="modalFooter">
            <button class="btnGhost" @click="closeDetail">关闭</button>
            <button
              v-if="detailData && isOfferEditable(detailData.status)"
              class="btnPrimary"
              @click="openEditFromDetail"
            >
              编辑
            </button>
          </div>
        </div>
      </div>

      <div v-if="formOpen" class="modalOverlay" @click.self="closeForm">
        <div class="modal modalWide" :class="{ mobileSheet: isMobile }">
          <div class="modalHeader">
            <h3 class="modalTitle">{{ editingId ? '编辑特惠推送' : '新建特惠推送' }}</h3>
            <button class="modalClose" @click="closeForm">&times;</button>
          </div>
          <div class="modalBody">
            <p v-if="formError" class="error">{{ formError }}</p>
            <div class="field">
              <label class="label">标题 <em>*</em></label>
              <input v-model="form.title" class="input" maxlength="100" placeholder="如：周末特惠满50减5" />
            </div>
            <div class="field">
              <label class="label">活动内容 <em>*</em></label>
              <textarea v-model="form.content" class="textarea" rows="3" placeholder="请填写活动详细说明" />
            </div>
            <div class="field">
              <label class="label">推送对象 <em>*</em></label>
              <select v-model="form.targetType" class="input">
                <option v-if="extraTargetTypeOption" :value="extraTargetTypeOption.value">
                  {{ extraTargetTypeOption.label }}
                </option>
                <option v-for="opt in targetTypeOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
              </select>
            </div>
            <div v-if="form.targetType === SPECIAL_OFFER_TARGET_TYPE.BUILDING" class="field">
              <label class="label">小区 ID</label>
              <input v-model="form.communityId" class="input" placeholder="指定小区时填写" />
            </div>
            <div v-if="form.targetType === SPECIAL_OFFER_TARGET_TYPE.ROLE" class="field">
              <label class="label">关联商家</label>
              <select v-model="form.merchantId" class="input">
                <option value="">请选择商家</option>
                <option v-for="m in merchantOptions" :key="m.id" :value="m.id">{{ m.name }}</option>
              </select>
            </div>
            <div class="field">
              <label class="label">目标标签</label>
              <input v-model="form.targetTags" class="input" placeholder="逗号分隔，如：新业主,首套房" />
            </div>
            <div class="field">
              <label class="label">封面图 URL</label>
              <input v-model="form.coverUrl" class="input" maxlength="500" placeholder="https://..." />
              <div v-if="form.coverUrl.trim()" class="coverPreview">
                <img :src="form.coverUrl.trim()" alt="封面预览" @error="onCoverError" />
              </div>
            </div>
            <div class="field">
              <label class="label">优惠信息</label>
              <input v-model="form.discountInfo" class="input" placeholder="如：满100减20" />
            </div>
            <div class="field">
              <label class="label">最低消费门槛</label>
              <input v-model.number="form.minConsumption" type="number" min="0" step="0.01" class="input" placeholder="0 表示无门槛" />
            </div>
            <div class="fieldRow">
              <div class="field">
                <label class="label">开始时间 <em>*</em></label>
                <input v-model="form.startTime" type="datetime-local" class="input" />
              </div>
              <div class="field">
                <label class="label">结束时间 <em>*</em></label>
                <input v-model="form.endTime" type="datetime-local" class="input" />
              </div>
            </div>
            <div class="field">
              <label class="label">状态</label>
              <select v-model="form.status" class="input">
                <option v-for="opt in statusFormOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
              </select>
            </div>
            <div class="fieldRow">
              <div class="field">
                <label class="label">总配额</label>
                <input v-model.number="form.totalQuota" type="number" min="1" step="1" class="input" placeholder="不限则不填" />
              </div>
              <div class="field">
                <label class="label">每人限领</label>
                <input v-model.number="form.perUserQuota" type="number" min="1" step="1" class="input" placeholder="不限则不填" />
              </div>
            </div>
          </div>
          <div class="modalFooter">
            <button class="btnGhost" @click="closeForm">取消</button>
            <button class="btnPrimary" :disabled="submitting" @click="submitForm">
              {{ submitting ? '提交中...' : editingId ? '保存' : '创建' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { merchantApi, specialOfferApi } from '../../api/services'
import type { MerchantItem, SpecialOfferCreatePayload, SpecialOfferItem } from '../../api/types'
import { ApiError } from '../../api/request'
import {
  getEnumLabel,
  isSpecialOfferArchived,
  isSpecialOfferEnded,
  normalizeSpecialOfferStatus,
  normalizeSpecialOfferStatusClass,
  normalizeSpecialOfferTargetType,
  SPECIAL_OFFER_STATUS,
  SPECIAL_OFFER_STATUS_LABEL,
  SPECIAL_OFFER_STATUS_OPTIONS,
  SPECIAL_OFFER_TARGET_TYPE,
  SPECIAL_OFFER_TARGET_TYPE_LABEL,
  SPECIAL_OFFER_TARGET_TYPE_OPTIONS
} from '../../constants/enums'
import { useIsMobile } from '../../composables/useIsMobile'

const DEFAULT_COMMUNITY_ID = import.meta.env.VITE_COMMUNITY_ID || 'com_demo001'
const { isMobile } = useIsMobile()

const offers = ref<SpecialOfferItem[]>([])
const merchantOptions = ref<MerchantItem[]>([])
const loading = ref(false)
const error = ref('')
const page = ref(1)
const totalPages = ref(1)
const targetTypeFilter = ref('')
const statusFilter = ref('')
const removingId = ref('')

const formOpen = ref(false)
const editingId = ref('')
const submitting = ref(false)
const formError = ref('')

const detailOpen = ref(false)
const detailLoading = ref(false)
const detailError = ref('')
const detailData = ref<SpecialOfferItem | null>(null)

const targetTypeOptions = SPECIAL_OFFER_TARGET_TYPE_OPTIONS
const statusOptions = SPECIAL_OFFER_STATUS_OPTIONS
const statusFormOptions = SPECIAL_OFFER_STATUS_OPTIONS

const form = reactive({
  title: '',
  content: '',
  targetType: SPECIAL_OFFER_TARGET_TYPE.ALL,
  communityId: DEFAULT_COMMUNITY_ID,
  merchantId: '',
  targetTags: '',
  coverUrl: '',
  discountInfo: '',
  minConsumption: undefined as number | undefined,
  startTime: '',
  endTime: '',
  status: SPECIAL_OFFER_STATUS.DRAFT,
  totalQuota: undefined as number | undefined,
  perUserQuota: undefined as number | undefined
})

const extraTargetTypeOption = computed(() => {
  const value = form.targetType
  if (!value || SPECIAL_OFFER_TARGET_TYPE_OPTIONS.some((opt) => opt.value === value)) return null
  return { value, label: getEnumLabel(SPECIAL_OFFER_TARGET_TYPE_LABEL, value, value) }
})

function formatMinConsumption(value?: number) {
  if (value == null || value <= 0) return '无门槛'
  return `满 ¥${Number(value).toFixed(2)}`
}

function formatTargetTags(value: unknown) {
  const text = normalizeTargetTags(value).trim()
  return text || '—'
}

function isOfferEditable(status?: string) {
  return !isSpecialOfferEnded(status) && !isSpecialOfferArchived(status)
}

function isOfferRemovable(status?: string) {
  return !isSpecialOfferArchived(status)
}

function formatQuota(item: SpecialOfferItem) {
  if (item.totalQuota == null) return '不限'
  return `${item.usedQuota ?? 0} / ${item.totalQuota}`
}

function toApiDateTime(value: string) {
  if (!value) return ''
  return `${value.replace('T', ' ')}:00`
}

function fromApiDateTime(value?: string) {
  if (!value) return ''
  return value.slice(0, 16).replace(' ', 'T')
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

function resetForm() {
  editingId.value = ''
  submitting.value = false
  form.title = ''
  form.content = ''
  form.targetType = SPECIAL_OFFER_TARGET_TYPE.ALL
  form.communityId = DEFAULT_COMMUNITY_ID
  form.merchantId = ''
  form.targetTags = ''
  form.coverUrl = ''
  form.discountInfo = ''
  form.minConsumption = undefined
  form.status = SPECIAL_OFFER_STATUS.DRAFT
  form.totalQuota = undefined
  form.perUserQuota = undefined
  defaultRange()
  formError.value = ''
}

function normalizeTargetTags(value: unknown): string {
  if (value == null) return ''
  if (Array.isArray(value)) return value.map(String).filter(Boolean).join(',')
  return String(value)
}

function applyDetailToForm(data: SpecialOfferItem) {
  form.title = data.title || ''
  form.content = data.content || ''
  form.targetType = normalizeSpecialOfferTargetType(data.targetType)
  form.communityId = data.communityId || DEFAULT_COMMUNITY_ID
  form.merchantId = data.merchantId || ''
  form.targetTags = normalizeTargetTags(data.targetTags)
  form.coverUrl = data.coverUrl || ''
  form.discountInfo = data.discountInfo || ''
  form.minConsumption = data.minConsumption
  form.startTime = fromApiDateTime(data.startTime)
  form.endTime = fromApiDateTime(data.endTime)
  form.status = normalizeSpecialOfferStatus(data.status)
  form.totalQuota = data.totalQuota
  form.perUserQuota = data.perUserQuota
}

function buildPayload(): SpecialOfferCreatePayload {
  const payload: SpecialOfferCreatePayload = {
    title: form.title.trim(),
    content: form.content.trim(),
    targetType: form.targetType,
    startTime: toApiDateTime(form.startTime),
    endTime: toApiDateTime(form.endTime),
    status: form.status || SPECIAL_OFFER_STATUS.DRAFT
  }
  const targetTags = normalizeTargetTags(form.targetTags).trim()
  if (targetTags) payload.targetTags = targetTags
  const coverUrl = form.coverUrl.trim()
  if (coverUrl) payload.coverUrl = coverUrl
  const discountInfo = form.discountInfo.trim()
  if (discountInfo) payload.discountInfo = discountInfo
  if (form.minConsumption != null) payload.minConsumption = form.minConsumption
  if (form.totalQuota != null) payload.totalQuota = form.totalQuota
  if (form.perUserQuota != null) payload.perUserQuota = form.perUserQuota
  if (form.targetType === SPECIAL_OFFER_TARGET_TYPE.BUILDING) {
    payload.communityId = form.communityId.trim() || DEFAULT_COMMUNITY_ID
  }
  if (form.targetType === SPECIAL_OFFER_TARGET_TYPE.ROLE && form.merchantId) {
    payload.merchantId = form.merchantId
  }
  return payload
}

async function loadMerchants() {
  try {
    const res = await merchantApi.list({ page: 1, pageSize: 100, sort: '+rankOrder' })
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
  resetForm()
  formOpen.value = true
}

function closeForm() {
  formOpen.value = false
  submitting.value = false
}

async function openEdit(id: string) {
  formError.value = ''
  submitting.value = false
  editingId.value = id
  formOpen.value = true
  try {
    const data = await specialOfferApi.get(id)
    applyDetailToForm(data)
  } catch (e) {
    formError.value = e instanceof ApiError ? e.message : '详情加载失败'
  }
}

async function openDetail(id: string) {
  detailOpen.value = true
  detailLoading.value = true
  detailError.value = ''
  detailData.value = null
  try {
    detailData.value = await specialOfferApi.get(id)
  } catch (e) {
    detailError.value = e instanceof ApiError ? e.message : '详情加载失败'
  } finally {
    detailLoading.value = false
  }
}

function closeDetail() {
  detailOpen.value = false
  detailData.value = null
}

function openEditFromDetail() {
  if (!detailData.value) return
  const id = detailData.value.id
  closeDetail()
  openEdit(id)
}

function validateForm() {
  if (!form.title.trim()) return '请填写标题'
  if (!form.content.trim()) return '请填写活动内容'
  if (!form.targetType) return '请选择推送对象'
  if (!form.startTime || !form.endTime) return '请填写有效期'
  if (new Date(form.endTime) <= new Date(form.startTime)) return '结束时间须晚于开始时间'
  if (form.targetType === SPECIAL_OFFER_TARGET_TYPE.ROLE && !form.merchantId) {
    return '指定商户时请选择商家'
  }
  if (form.minConsumption != null && form.minConsumption < 0) return '最低消费不能为负数'
  if (form.totalQuota != null && form.totalQuota < 1) return '总配额须不小于 1'
  if (form.perUserQuota != null && form.perUserQuota < 1) return '每人限领须不小于 1'
  if (form.coverUrl.trim().length > 500) return '封面图 URL 不能超过 500 字'
  return ''
}

async function submitForm() {
  const validationError = validateForm()
  if (validationError) {
    formError.value = validationError
    return
  }

  submitting.value = true
  formError.value = ''
  const payload = buildPayload()
  const currentPage = page.value
  const isEdit = !!editingId.value

  try {
    if (isEdit) {
      await specialOfferApi.update(editingId.value, payload)
    } else {
      await specialOfferApi.create(payload)
    }
    closeForm()
    await load(isEdit ? currentPage : 1)
  } catch (e) {
    formError.value = e instanceof ApiError ? e.message : '提交失败，请确认是否有特惠推送权限'
  } finally {
    submitting.value = false
  }
}

async function removeOffer(id: string) {
  if (!confirm('确认删除该特惠推送？')) return
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

function onCoverError(e: Event) {
  const img = e.target as HTMLImageElement
  img.style.display = 'none'
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
.toolbar { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 16px; }
.input { padding: 8px 12px; border: 1px solid #e8e8ec; border-radius: 8px; background: #fff; }
.btnPrimary { padding: 10px 18px; border-radius: 8px; background: #5c5c9e; color: #fff; border: none; cursor: pointer; }
.btnPrimary:hover { background: #52529a; }
.btnGhost { padding: 8px 14px; border-radius: 8px; border: 1px solid #e8e8ec; background: #fff; color: #5c5c66; font-size: 14px; cursor: pointer; }
.btnGhost:hover { border-color: #5c5c9e; color: #5c5c9e; }
.panel { background: #fff; border-radius: 12px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.tableWrap { overflow-x: auto; }
.table { width: 100%; border-collapse: collapse; font-size: 14px; min-width: 1080px; }
.table th, .table td { padding: 12px 10px; border-bottom: 1px solid #f0f0f3; text-align: left; vertical-align: middle; }
.table th { color: #8c8c9a; font-weight: 500; white-space: nowrap; }
.titleCell { max-width: 160px; }
.timeCell { font-size: 13px; color: #5c5c66; white-space: nowrap; }
.coverThumb { width: 48px; height: 48px; object-fit: cover; border-radius: 6px; background: #f5f5f7; }
.coverPlaceholder { color: #c0c0c8; }
.statusTag { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; background: #f0f0f3; color: #5c5c66; }
.statusTag.draft { background: #f5f5f5; color: #8c8c9a; }
.statusTag.active { background: #fff7e6; color: #d48806; }
.statusTag.published { background: #e6f7ef; color: #389e6d; }
.statusTag.ended { background: #f0f0f3; color: #5c5c66; }
.statusTag.archived { background: #f5f5f5; color: #8c8c9a; }
.actionsCell { white-space: nowrap; }
.btnLink { border: none; background: none; color: #5c5c9e; cursor: pointer; padding: 0 6px 0 0; font-size: 14px; }
.btnLink:disabled { color: #c0c0c8; cursor: not-allowed; }
.loading, .empty, .error { font-size: 14px; color: #8c8c9a; padding: 12px 0; }
.error { color: #e05c5c; }
.btnDanger { padding: 6px 12px; border-radius: 6px; background: #fff1f0; color: #cf1322; border: 1px solid #ffa39e; cursor: pointer; font-size: 13px; }
.btnDanger:disabled { opacity: 0.5; cursor: not-allowed; }
.pager { display: flex; align-items: center; gap: 12px; margin-top: 16px; font-size: 14px; }
.modalOverlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 16px; }
.modal { width: 520px; max-width: calc(100vw - 32px); background: #fff; border-radius: 12px; overflow: hidden; max-height: 90vh; overflow-y: auto; }
.modalWide { width: 640px; }
.modalHeader { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid #f0f0f3; }
.modalTitle { font-size: 16px; font-weight: 600; }
.modalClose { border: none; background: none; font-size: 22px; cursor: pointer; color: #8c8c9a; }
.modalBody { padding: 20px; }
.modalFooter { display: flex; justify-content: flex-end; gap: 10px; padding: 16px 20px; border-top: 1px solid #f0f0f3; }
.field { margin-bottom: 14px; }
.fieldRow { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.label { display: block; font-size: 13px; color: #8c8c9a; margin-bottom: 6px; }
.label em { color: #e05c5c; font-style: normal; }
.textarea { width: 100%; padding: 8px 12px; border: 1px solid #e8e8ec; border-radius: 8px; resize: vertical; box-sizing: border-box; }
.coverPreview img { margin-top: 8px; max-width: 100%; max-height: 120px; border-radius: 8px; object-fit: cover; }
.detailCover { margin-bottom: 16px; }
.detailCover img { width: 100%; max-height: 200px; object-fit: cover; border-radius: 8px; }
.detailList { list-style: none; margin: 0; padding: 0; }
.detailList li { display: flex; justify-content: space-between; gap: 16px; padding: 10px 0; border-bottom: 1px solid #f0f0f3; font-size: 14px; }
.detailList span { color: #8c8c9a; flex-shrink: 0; }
.detailList strong { color: #1f1f2e; text-align: right; font-weight: 500; word-break: break-all; }
@media (max-width: 640px) { .fieldRow { grid-template-columns: 1fr; } }
@media (max-width: 768px) {
  .page { padding: 0 var(--mobile-page-gap); }
  .header { margin-bottom: 18px; align-items: stretch; flex-direction: column; }
  .title { font-size: 22px; }
  .header .btnPrimary { width: 100%; min-height: var(--mobile-touch-target); }
  .toolbar { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .toolbar .btnGhost { grid-column: 1 / -1; min-height: var(--mobile-touch-target); }
  .input { width: 100%; min-height: var(--mobile-touch-target); box-sizing: border-box; }
  .panel { padding: 0; background: transparent; box-shadow: none; }
  .mobileCards { display: grid; gap: 10px; }
  .offerCard { padding: 16px; background: #fff; border-radius: var(--mobile-card-radius); box-shadow: 0 1px 3px rgba(0,0,0,.04); }
  .cardHeading { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
  .offerIdentity { display: flex; align-items: center; min-width: 0; gap: 10px; }
  .offerIdentity strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .cardMeta { display: grid; gap: 7px; margin: 12px 0; color: #5c5c66; font-size: 13px; line-height: 1.45; }
  .cardActions { display: flex; align-items: center; gap: 14px; }
  .btnLink { padding: 6px 0; }
  .pager { justify-content: center; }
  .modalOverlay { align-items: flex-end; padding: 0; }
  .modal, .modalWide { width: 100%; max-width: 100%; max-height: 88vh; border-radius: var(--mobile-sheet-radius) var(--mobile-sheet-radius) 0 0; }
  .modalHeader, .modalBody, .modalFooter { padding-left: 16px; padding-right: 16px; }
  .modalFooter { padding-bottom: max(16px, env(safe-area-inset-bottom)); }
}
</style>
