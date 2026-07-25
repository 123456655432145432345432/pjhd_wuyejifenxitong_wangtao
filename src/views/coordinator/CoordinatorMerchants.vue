<template>
  <div class="page" :class="{ mobilePage: isMobile }">
    <div class="header">
      <div>
        <h1 class="title">商家管理</h1>
        <p class="desc">商家列表查询、入驻审核与信息维护</p>
      </div>
    </div>

    <div class="tabs">
      <button class="tab" :class="{ active: tab === 'all' }" @click="switchTab('all')">全部商家</button>
      <button class="tab" :class="{ active: tab === 'official' }" @click="switchTab('official')">官方认证商家</button>
      <button class="tab" :class="{ active: tab === 'pending' }" @click="switchTab('pending')">待审核入驻</button>
    </div>

    <div class="toolbar">
      <input
        v-model="keyword"
        class="input searchInput"
        placeholder="搜索商家名称或上架商品名称"
        @keyup.enter="reload"
      />
      <select v-model="categoryFilter" class="input" @change="reload">
        <option value="">全部分类</option>
        <option v-for="cat in categoryOptions" :key="cat" :value="cat">{{ cat }}</option>
      </select>
      <select v-if="tab === 'all'" v-model="levelFilter" class="input" @change="reload">
        <option value="">全部等级</option>
        <option v-for="opt in MERCHANT_LEVEL_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
      </select>
      <button class="btnPrimary" :disabled="loading" @click="reload">搜索</button>
      <button class="btnGhost" :disabled="loading" @click="reload">刷新</button>
    </div>

    <div class="panel">
      <div v-if="loading" class="loading">加载中...</div>
      <p v-else-if="error" class="error">{{ error }}</p>
      <div v-else-if="merchants.length" class="tableWrap">
        <table class="table" :class="{ mobileCards: isMobile }">
          <thead>
            <tr>
              <th>封面</th>
              <th>商家名称</th>
              <th>分类</th>
              <th>等级</th>
              <th>审核状态</th>
              <th>营业状态</th>
              <th>联系电话</th>
              <th>排序</th>
              <th>创建时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in merchants" :key="item.id">
              <td>
                <img
                  v-if="item.coverUrls?.[0]"
                  :src="item.coverUrls[0]"
                  alt=""
                  class="coverThumb"
                  @error="onCoverError"
                />
                <span v-else class="coverPlaceholder">—</span>
              </td>
              <td class="nameCell">{{ item.name }}</td>
              <td>{{ item.category || '—' }}</td>
              <td>{{ getEnumLabel(MERCHANT_LEVEL_LABEL, item.merchantLevel) }}</td>
              <td>{{ getEnumLabel(MERCHANT_AUDIT_STATUS_LABEL, item.auditStatus) }}</td>
              <td>{{ getEnumLabel(MERCHANT_STATUS_LABEL, item.status) }}</td>
              <td>{{ item.contactPhone || '—' }}</td>
              <td>{{ item.rankOrder ?? '—' }}</td>
              <td class="timeCell">{{ item.createdAt || '—' }}</td>
              <td class="actions">
                <div class="actionsInner">
                  <button type="button" class="btnLink" @click="openDetail(item.id)">详情</button>
                  <button
                    v-if="canEdit(item)"
                    type="button"
                    class="btnLink"
                    @click="openEdit(item.id)"
                  >
                    编辑
                  </button>
                  <button
                    v-if="item.auditStatus === MERCHANT_AUDIT_STATUS.PENDING"
                    type="button"
                    class="btnPrimarySm"
                    @click="openAudit(item)"
                  >
                    审核
                  </button>
                  <button
                    v-if="canFreeze(item)"
                    type="button"
                    class="btnGhostSm"
                    :disabled="freezingId === item.id"
                    @click="toggleFreeze(item, true)"
                  >
                    冻结
                  </button>
                  <button
                    v-if="canUnfreeze(item)"
                    type="button"
                    class="btnGhostSm"
                    :disabled="freezingId === item.id"
                    @click="toggleFreeze(item, false)"
                  >
                    解冻
                  </button>
                  <span
                    v-if="item.merchantLevel === MERCHANT_LEVEL.OFFICIAL_CERTIFIED"
                    class="badge"
                  >
                    官方推荐
                  </span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else class="empty">暂无商家</p>
    </div>

    <div v-if="totalPages > 1" class="pager">
      <button class="btnGhost" :disabled="page <= 1 || loading" @click="changePage(page - 1)">上一页</button>
      <span>{{ page }} / {{ totalPages }}（共 {{ total }} 条）</span>
      <button class="btnGhost" :disabled="page >= totalPages || loading" @click="changePage(page + 1)">下一页</button>
    </div>

    <Teleport to="body">
      <div v-if="detailOpen" class="modalOverlay" @click.self="closeDetail">
        <div class="modal modalWide" :class="{ mobileSheet: isMobile }">
          <div class="modalHeader">
            <h3 class="modalTitle">商家详情</h3>
            <button class="modalClose" @click="closeDetail">&times;</button>
          </div>
          <div class="modalBody">
            <div v-if="detailLoading" class="loading">加载中...</div>
            <p v-else-if="detailError" class="error">{{ detailError }}</p>
            <template v-else-if="detailData">
              <div v-if="detailData.coverUrls?.length" class="coverList">
                <img v-for="(url, idx) in detailData.coverUrls" :key="idx" :src="url" alt="" @error="onCoverError" />
              </div>
              <ul class="detailList">
                <li v-for="row in detailRows" :key="row.label">
                  <span>{{ row.label }}</span><strong>{{ row.value }}</strong>
                </li>
              </ul>
            </template>
          </div>
          <div class="modalFooter">
            <button class="btnGhost" @click="closeDetail">关闭</button>
            <button v-if="detailData && canEdit(detailData)" class="btnPrimary" @click="openEditFromDetail">编辑</button>
          </div>
        </div>
      </div>

      <div v-if="editOpen" class="modalOverlay" @click.self="closeEdit">
        <div class="modal modalWide" :class="{ mobileSheet: isMobile }">
          <div class="modalHeader">
            <h3 class="modalTitle">编辑商家</h3>
            <button class="modalClose" @click="closeEdit">&times;</button>
          </div>
          <div class="modalBody">
            <div v-if="editLoading" class="loading">加载中...</div>
            <template v-else>
              <p v-if="editError" class="error">{{ editError }}</p>
              <div class="field">
                <label class="label">商家名称</label>
                <input v-model="editForm.name" class="input" maxlength="100" />
              </div>
              <div class="field">
                <label class="label">描述</label>
                <textarea v-model="editForm.description" class="textarea" rows="2" />
              </div>
              <div class="field">
                <label class="label">封面图 URL</label>
                <input v-model="editForm.coverUrlsText" class="input" placeholder="多个 URL 用英文逗号分隔" />
              </div>
              <div class="field">
                <label class="label">视频 URL</label>
                <input v-model="editForm.videoUrl" class="input" maxlength="500" />
              </div>
              <div class="fieldRow">
                <div class="field">
                  <label class="label">联系电话</label>
                  <input v-model="editForm.contactPhone" class="input" maxlength="20" />
                </div>
                <div class="field">
                  <label class="label">营业时间</label>
                  <input v-model="editForm.businessHours" class="input" maxlength="50" placeholder="08:00-22:00" />
                </div>
              </div>
              <div class="field">
                <label class="label">地址</label>
                <input v-model="editForm.address" class="input" maxlength="200" />
              </div>
              <div class="fieldRow">
                <div class="field">
                  <label class="label">配送费</label>
                  <input v-model="editForm.deliveryFee" type="number" min="0" step="0.01" class="input" />
                </div>
                <div class="field">
                  <label class="label">满额免配送</label>
                  <input v-model="editForm.freeDeliveryThreshold" type="number" min="0" step="0.01" class="input" />
                </div>
              </div>
              <div class="field">
                <label class="label">排序权重</label>
                <input v-model.number="editForm.rankOrder" type="number" min="0" step="1" class="input" />
              </div>
            </template>
          </div>
          <div class="modalFooter">
            <button class="btnGhost" @click="closeEdit">取消</button>
            <button class="btnPrimary" :disabled="editSubmitting || editLoading" @click="submitEdit">
              {{ editSubmitting ? '保存中...' : '保存' }}
            </button>
          </div>
        </div>
      </div>

      <div v-if="auditTarget" class="modalOverlay" @click.self="closeAudit">
        <div class="modal modalWide" :class="{ mobileSheet: isMobile }">
          <div class="modalHeader">
            <h3 class="modalTitle">审核商家「{{ auditTarget.name }}」</h3>
            <button class="modalClose" @click="closeAudit">&times;</button>
          </div>
          <form class="modalBody" @submit.prevent="submitAudit">
            <div class="field">
              <label class="label">审核结果</label>
              <select v-model="auditForm.auditResult" class="input">
                <option :value="AUDIT_RESULT.APPROVED">通过</option>
                <option :value="AUDIT_RESULT.REJECTED">拒绝</option>
              </select>
            </div>
            <div v-if="auditForm.auditResult === AUDIT_RESULT.REJECTED" class="field">
              <label class="label">拒绝原因</label>
              <textarea
                v-model="auditForm.rejectReason"
                class="textarea"
                rows="3"
                maxlength="200"
                placeholder="请填写拒绝原因"
                required
              />
            </div>
            <template v-if="auditForm.auditResult === AUDIT_RESULT.APPROVED">
              <div class="field">
                <label class="label">商家等级</label>
                <select v-model="auditForm.merchantLevel" class="input">
                  <option v-for="opt in MERCHANT_LEVEL_OPTIONS" :key="opt.value" :value="opt.value">
                    {{ opt.label }}
                  </option>
                </select>
              </div>
              <div class="field">
                <label class="label">分类</label>
                <input
                  v-model="auditForm.category"
                  type="text"
                  class="input"
                  maxlength="50"
                  placeholder="如：外卖"
                />
              </div>
              <div class="field">
                <label class="label">营业时间</label>
                <input
                  v-model="auditForm.businessHours"
                  type="text"
                  class="input"
                  maxlength="50"
                  placeholder="如：08:00-22:00"
                />
              </div>
              <div class="fieldRow">
                <div class="field">
                  <label class="label">配送费</label>
                  <input v-model="auditForm.deliveryFee" type="text" class="input" placeholder="如：0.30" />
                </div>
                <div class="field">
                  <label class="label">满额免配送费</label>
                  <input
                    v-model="auditForm.freeDeliveryThreshold"
                    type="text"
                    class="input"
                    placeholder="如：50.00"
                  />
                </div>
              </div>
            </template>
            <div class="field">
              <label class="label">备注（选填）</label>
              <textarea
                v-model="auditForm.remark"
                class="textarea"
                rows="2"
                maxlength="200"
                placeholder="审核备注"
              />
            </div>
            <p v-if="auditError" class="error">{{ auditError }}</p>
            <div class="modalFooter">
              <button type="button" class="btnGhost" @click="closeAudit">取消</button>
              <button type="submit" class="btnPrimary" :disabled="auditing">
                {{ auditing ? '提交中...' : '提交审核' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { merchantApi, coordinatorManageApi } from '../../api/services'
import type { MerchantAuditPayload, MerchantItem, MerchantUpdatePayload } from '../../api/types'
import { ApiError } from '../../api/request'
import {
  AUDIT_RESULT,
  getEnumLabel,
  MERCHANT_AUDIT_STATUS,
  MERCHANT_AUDIT_STATUS_LABEL,
  MERCHANT_LEVEL,
  MERCHANT_LEVEL_LABEL,
  MERCHANT_LEVEL_OPTIONS,
  MERCHANT_STATUS,
  MERCHANT_STATUS_LABEL
} from '../../constants/enums'
import { useCoordinatorPortalStore } from '../../stores/coordinatorPortal'
import { useIsMobile } from '../../composables/useIsMobile'

type TabKey = 'official' | 'pending' | 'all'

const portal = useCoordinatorPortalStore()
const { isMobile } = useIsMobile()
const tab = ref<TabKey>('all')
const merchants = ref<MerchantItem[]>([])
const categoryOptions = ref<string[]>([])
const loading = ref(false)
const error = ref('')
const keyword = ref('')
const categoryFilter = ref('')
const levelFilter = ref('')
const page = ref(1)
const totalPages = ref(1)
const total = ref(0)

const detailOpen = ref(false)
const detailLoading = ref(false)
const detailError = ref('')
const detailData = ref<MerchantItem | null>(null)

const editOpen = ref(false)
const editLoading = ref(false)
const editSubmitting = ref(false)
const editError = ref('')
const editingId = ref('')
const editForm = reactive({
  name: '',
  description: '',
  coverUrlsText: '',
  videoUrl: '',
  contactPhone: '',
  businessHours: '',
  address: '',
  deliveryFee: '' as string | number,
  freeDeliveryThreshold: '' as string | number,
  rankOrder: undefined as number | undefined
})

const auditTarget = ref<MerchantItem | null>(null)
const auditing = ref(false)
const auditError = ref('')
const freezingId = ref('')
const auditForm = reactive({
  auditResult: AUDIT_RESULT.APPROVED,
  merchantLevel: MERCHANT_LEVEL.PROPERTY_CERTIFIED,
  category: '',
  businessHours: '',
  deliveryFee: '',
  freeDeliveryThreshold: '',
  rejectReason: '',
  remark: ''
})

const detailRows = computed(() => {
  const d = detailData.value
  if (!d) return []
  return [
    { label: '商家 ID', value: d.id || '—' },
    { label: '平台商家 ID', value: d.platformMerchantId || '—' },
    { label: '物业 ID', value: d.propertyCompanyId || '—' },
    { label: '商家名称', value: d.name || '—' },
    { label: '分类', value: d.category || '—' },
    { label: '等级', value: getEnumLabel(MERCHANT_LEVEL_LABEL, d.merchantLevel) },
    { label: '等级权重', value: d.levelWeight != null ? String(d.levelWeight) : '—' },
    { label: '审核状态', value: getEnumLabel(MERCHANT_AUDIT_STATUS_LABEL, d.auditStatus) },
    { label: '营业状态', value: getEnumLabel(MERCHANT_STATUS_LABEL, d.status) },
    { label: '联系电话', value: d.contactPhone || '—' },
    { label: '地址', value: d.address || '—' },
    { label: '营业时间', value: d.businessHours || '—' },
    { label: '配送费', value: formatMoney(d.deliveryFee) },
    { label: '满额免配送', value: formatMoney(d.freeDeliveryThreshold) },
    { label: '会员折扣价', value: formatMoney(d.memberDiscountPrice) },
    { label: '物业币返利', value: d.coinRebateEnabled ? `${formatPercent(d.coinRebateRate)}%` : '未启用' },
    { label: '排序权重', value: d.rankOrder != null ? String(d.rankOrder) : '—' },
    { label: '描述', value: d.description || '—' },
    { label: '创建时间', value: d.createdAt || '—' },
    { label: '更新时间', value: d.updatedAt || '—' }
  ]
})

function propertyCompanyId() {
  return portal.detail?.propertyCompanyId || undefined
}

function coordinatorId() {
  return portal.detail?.id || ''
}

function canFreeze(item: MerchantItem) {
  return item.auditStatus === MERCHANT_AUDIT_STATUS.APPROVED && item.status === MERCHANT_STATUS.ACTIVE
}

function canUnfreeze(item: MerchantItem) {
  return item.auditStatus === MERCHANT_AUDIT_STATUS.APPROVED && item.status === MERCHANT_STATUS.FROZEN
}

async function toggleFreeze(item: MerchantItem, frozen: boolean) {
  const cid = coordinatorId()
  if (!cid) {
    error.value = '统筹信息未加载，请刷新后重试'
    return
  }
  const action = frozen ? '冻结' : '解冻'
  if (!confirm(`确认${action}商家「${item.name}」？`)) return
  freezingId.value = item.id
  error.value = ''
  try {
    await coordinatorManageApi.freezeMerchant(cid, item.id, { frozen })
    await load(page.value)
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : `${action}失败`
  } finally {
    freezingId.value = ''
  }
}

function formatMoney(value?: string | number | null) {
  if (value == null || value === '') return '—'
  return `¥${Number(value).toFixed(2)}`
}

function formatPercent(value?: number) {
  if (value == null) return '0'
  return (Number(value) * 100).toFixed(0)
}

function collectCategories(list: MerchantItem[]) {
  const set = new Set(categoryOptions.value)
  list.forEach((item) => {
    if (item.category) set.add(item.category)
  })
  categoryOptions.value = Array.from(set).sort((a, b) => a.localeCompare(b, 'zh-CN'))
}

function buildListParams(pageNo: number) {
  const params: Parameters<typeof merchantApi.list>[0] = {
    page: pageNo,
    pageSize: 20,
    keyword: keyword.value.trim() || undefined,
    category: categoryFilter.value || undefined,
    sort: '-rankOrder',
    propertyCompanyId: propertyCompanyId()
  }
  if (tab.value === 'official') {
    params.merchantLevel = MERCHANT_LEVEL.OFFICIAL_CERTIFIED
  } else if (tab.value === 'pending') {
    params.auditStatus = MERCHANT_AUDIT_STATUS.PENDING
  } else if (levelFilter.value) {
    params.merchantLevel = levelFilter.value
  }
  return params
}

async function load(pageNo = 1) {
  loading.value = true
  error.value = ''
  try {
    const res = await merchantApi.list(buildListParams(pageNo))
    merchants.value = res.list || []
    collectCategories(merchants.value)
    page.value = res.pagination?.page || pageNo
    totalPages.value = res.pagination?.totalPages || 1
    total.value = res.pagination?.total ?? merchants.value.length
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '商家列表加载失败'
  } finally {
    loading.value = false
  }
}

function canEdit(item: MerchantItem) {
  return item.auditStatus === MERCHANT_AUDIT_STATUS.APPROVED
}

function switchTab(next: TabKey) {
  tab.value = next
  levelFilter.value = ''
  reload()
}

function reload() {
  load(1)
}

function changePage(next: number) {
  load(next)
}

async function openDetail(id: string) {
  detailOpen.value = true
  detailLoading.value = true
  detailError.value = ''
  detailData.value = null
  try {
    detailData.value = await merchantApi.get(id, propertyCompanyId())
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

function applyDetailToEditForm(data: MerchantItem) {
  editForm.name = data.name || ''
  editForm.description = data.description || ''
  editForm.coverUrlsText = data.coverUrls?.join(', ') || ''
  editForm.videoUrl = data.videoUrl || ''
  editForm.contactPhone = data.contactPhone || ''
  editForm.businessHours = data.businessHours || ''
  editForm.address = data.address || ''
  editForm.deliveryFee = data.deliveryFee ?? ''
  editForm.freeDeliveryThreshold = data.freeDeliveryThreshold ?? ''
  editForm.rankOrder = data.rankOrder
}

async function openEdit(id: string) {
  editingId.value = id
  editOpen.value = true
  editLoading.value = true
  editError.value = ''
  try {
    const data = await merchantApi.get(id, propertyCompanyId())
    applyDetailToEditForm(data)
  } catch (e) {
    editError.value = e instanceof ApiError ? e.message : '详情加载失败'
  } finally {
    editLoading.value = false
  }
}

function closeEdit() {
  editOpen.value = false
  editingId.value = ''
  editSubmitting.value = false
}

async function submitEdit() {
  if (!editingId.value) return
  editSubmitting.value = true
  editError.value = ''
  try {
    const coverUrls = editForm.coverUrlsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    const payload: MerchantUpdatePayload = {
      name: editForm.name.trim() || undefined,
      description: editForm.description.trim() || undefined,
      coverUrls: coverUrls.length ? coverUrls : undefined,
      videoUrl: editForm.videoUrl.trim() || undefined,
      contactPhone: editForm.contactPhone.trim() || undefined,
      businessHours: editForm.businessHours.trim() || undefined,
      address: editForm.address.trim() || undefined,
      deliveryFee: editForm.deliveryFee !== '' ? editForm.deliveryFee : undefined,
      freeDeliveryThreshold: editForm.freeDeliveryThreshold !== '' ? editForm.freeDeliveryThreshold : undefined,
      rankOrder: editForm.rankOrder
    }
    await merchantApi.update(editingId.value, payload, propertyCompanyId())
    closeEdit()
    await load(page.value)
  } catch (e) {
    editError.value = e instanceof ApiError ? e.message : '保存失败'
  } finally {
    editSubmitting.value = false
  }
}

function applyMerchantToAuditForm(merchant: MerchantItem) {
  auditForm.auditResult = AUDIT_RESULT.APPROVED
  auditForm.merchantLevel = merchant.merchantLevel || MERCHANT_LEVEL.PROPERTY_CERTIFIED
  auditForm.category = merchant.category || ''
  auditForm.businessHours = merchant.businessHours || ''
  auditForm.deliveryFee = merchant.deliveryFee != null ? String(merchant.deliveryFee) : ''
  auditForm.freeDeliveryThreshold = merchant.freeDeliveryThreshold != null
    ? String(merchant.freeDeliveryThreshold)
    : ''
  auditForm.rejectReason = ''
  auditForm.remark = ''
}

function buildAuditPayload(): MerchantAuditPayload {
  const payload: MerchantAuditPayload = {
    auditResult: auditForm.auditResult
  }
  if (auditForm.remark.trim()) {
    payload.remark = auditForm.remark.trim()
  }
  if (auditForm.auditResult === AUDIT_RESULT.REJECTED) {
    payload.rejectReason = auditForm.rejectReason.trim()
  } else {
    payload.merchantLevel = auditForm.merchantLevel
    if (auditForm.category.trim()) payload.category = auditForm.category.trim()
    if (auditForm.businessHours.trim()) payload.businessHours = auditForm.businessHours.trim()
    if (auditForm.deliveryFee.trim()) payload.deliveryFee = auditForm.deliveryFee.trim()
    if (auditForm.freeDeliveryThreshold.trim()) {
      payload.freeDeliveryThreshold = auditForm.freeDeliveryThreshold.trim()
    }
  }
  return payload
}

function openAudit(item: MerchantItem) {
  if (item.auditStatus !== MERCHANT_AUDIT_STATUS.PENDING) {
    error.value = '该商家已审核，不可重复操作'
    return
  }
  auditTarget.value = item
  applyMerchantToAuditForm(item)
  auditError.value = ''
}

function closeAudit() {
  auditTarget.value = null
  auditing.value = false
}

async function submitAudit() {
  if (!auditTarget.value) return
  if (auditTarget.value.auditStatus !== MERCHANT_AUDIT_STATUS.PENDING) {
    auditError.value = '该商家已审核，不可重复操作'
    return
  }
  if (auditForm.auditResult === AUDIT_RESULT.REJECTED && !auditForm.rejectReason.trim()) {
    auditError.value = '请填写拒绝原因'
    return
  }
  auditing.value = true
  auditError.value = ''
  try {
    await merchantApi.audit(auditTarget.value.id, buildAuditPayload())
    closeAudit()
    await load(page.value)
  } catch (e) {
    auditError.value = e instanceof ApiError ? e.message : '审核失败，请确认是否有商家审核权限'
  } finally {
    auditing.value = false
  }
}

function onCoverError(e: Event) {
  const img = e.target as HTMLImageElement
  img.style.display = 'none'
}

onMounted(async () => {
  await portal.loadMy()
  await load(1)
})
</script>

<style scoped>
.page { max-width: 1280px; }
.header { margin-bottom: 24px; }
.title { font-size: 24px; font-weight: 600; color: #1f1f2e; margin-bottom: 8px; }
.desc { font-size: 14px; color: #8c8c9a; }
.tabs { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
.tab { padding: 8px 16px; border-radius: 8px; border: 1px solid #e8e8ec; background: #fff; color: #5c5c66; cursor: pointer; font-size: 14px; }
.tab:hover { border-color: #5c5c9e; color: #5c5c9e; }
.tab.active { background: #5c5c9e; color: #fff; border-color: #5c5c9e; }
.toolbar { display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; align-items: center; }
.searchInput { min-width: 240px; flex: 1; max-width: 360px; }
.input { padding: 8px 12px; border: 1px solid #e8e8ec; border-radius: 8px; background: #fff; outline: none; }
.input:focus { border-color: #5c5c9e; }
.btnPrimary { padding: 10px 18px; border-radius: 8px; background: #5c5c9e; color: #fff; border: none; cursor: pointer; }
.btnPrimary:hover { background: #52529a; }
.btnGhost { padding: 8px 14px; border-radius: 8px; border: 1px solid #e8e8ec; background: #fff; color: #5c5c66; font-size: 14px; cursor: pointer; }
.btnGhost:hover { border-color: #5c5c9e; color: #5c5c9e; }
.panel { background: #fff; border-radius: 12px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.tableWrap { overflow-x: auto; }
.table { width: 100%; border-collapse: collapse; font-size: 14px; min-width: 1100px; }
.table th, .table td { padding: 12px 10px; text-align: left; vertical-align: middle; }
.table th { color: #8c8c9a; font-weight: 500; white-space: nowrap; border-bottom: 1px solid #f0f0f3; }
.table tbody tr { border-bottom: 1px solid #f0f0f3; }
.table tbody td { border-bottom: none; }
.nameCell { max-width: 160px; }
.timeCell { font-size: 13px; color: #5c5c66; white-space: nowrap; }
.coverThumb { width: 44px; height: 44px; object-fit: cover; border-radius: 6px; background: #f5f5f7; }
.coverPlaceholder { color: #c0c0c8; }
.actions { height: 1px; }
.actionsInner {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}
.btnLink {
  border: none;
  background: none;
  color: #5c5c9e;
  cursor: pointer;
  font-size: 13px;
  line-height: 1.4;
  padding: 0;
  text-decoration: none;
  flex-shrink: 0;
}
.btnPrimarySm { padding: 6px 12px; border-radius: 6px; background: #5c5c9e; color: #fff; border: none; cursor: pointer; font-size: 13px; flex-shrink: 0; white-space: nowrap; }
.btnPrimarySm:hover { background: #52529a; }
.btnGhostSm { padding: 6px 12px; border-radius: 6px; border: 1px solid #e8e8ec; background: #fff; color: #5c5c66; cursor: pointer; font-size: 13px; flex-shrink: 0; white-space: nowrap; }
.btnGhostSm:hover { border-color: #5c5c9e; color: #5c5c9e; }
.badge { font-size: 12px; color: #5c5c9e; background: #f0f0ff; padding: 4px 8px; border-radius: 4px; flex-shrink: 0; white-space: nowrap; }
.loading, .empty, .error { font-size: 14px; color: #8c8c9a; padding: 12px 0; }
.error { color: #e05c5c; }
.pager { display: flex; align-items: center; gap: 12px; margin-top: 16px; font-size: 14px; }
.modalOverlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 16px; }
.modal { width: 480px; max-width: calc(100vw - 32px); background: #fff; border-radius: 12px; overflow: hidden; max-height: 90vh; overflow-y: auto; }
.modalWide { width: 640px; }
.modalHeader { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid #f0f0f3; }
.modalTitle { font-size: 16px; font-weight: 600; }
.modalClose { border: none; background: none; font-size: 22px; cursor: pointer; color: #8c8c9a; }
.modalBody { padding: 20px; }
.modalFooter { display: flex; justify-content: flex-end; gap: 10px; padding: 16px 20px; border-top: 1px solid #f0f0f3; }
.field { margin-bottom: 14px; }
.fieldRow { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.label { display: block; font-size: 13px; color: #8c8c9a; margin-bottom: 6px; }
.textarea { width: 100%; padding: 8px 12px; border: 1px solid #e8e8ec; border-radius: 8px; resize: vertical; box-sizing: border-box; }
.coverList { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; }
.coverList img { width: 80px; height: 80px; object-fit: cover; border-radius: 8px; }
.detailList { list-style: none; margin: 0; padding: 0; }
.detailList li { display: flex; justify-content: space-between; gap: 16px; padding: 10px 0; border-bottom: 1px solid #f0f0f3; font-size: 14px; }
.detailList span { color: #8c8c9a; flex-shrink: 0; }
.detailList strong { color: #1f1f2e; text-align: right; font-weight: 500; word-break: break-all; }
@media (max-width: 768px) {
  .page { max-width: none; }
  .header { margin-bottom: 16px; }
  .title { font-size: 21px; }
  .toolbar { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .searchInput { grid-column: 1 / -1; min-width: 0; max-width: none; }
  .toolbar .btnPrimary, .toolbar .btnGhost { width: 100%; }
  .panel { padding: 12px; border-radius: 14px; }
  .mobileCards thead { display: none; }
  .mobileCards, .mobileCards tbody, .mobileCards tr, .mobileCards td { display: block; width: 100%; }
  .mobileCards tr { padding: 14px 0; border-bottom: 1px solid #f0f0f3; }
  .mobileCards tr:last-child { border-bottom: 0; }
  .mobileCards td { display: flex; justify-content: space-between; gap: 12px; padding: 6px 0; text-align: right; }
  .mobileCards td::before { color: #8c8c9a; text-align: left; flex-shrink: 0; }
  .mobileCards td:nth-child(1)::before { content: '封面'; }
  .mobileCards td:nth-child(2)::before { content: '商家名称'; }
  .mobileCards td:nth-child(3)::before { content: '分类'; }
  .mobileCards td:nth-child(4)::before { content: '等级'; }
  .mobileCards td:nth-child(5)::before { content: '审核状态'; }
  .mobileCards td:nth-child(6)::before { content: '营业状态'; }
  .mobileCards td:nth-child(7)::before { content: '联系电话'; }
  .mobileCards td:nth-child(8)::before { content: '排序'; }
  .mobileCards td:nth-child(9)::before { content: '创建时间'; }
  .mobileCards td:nth-child(10)::before { content: '操作'; }
  .mobileCards .actions { height: auto; }
  .actionsInner { justify-content: flex-end; flex-wrap: wrap; }
  .pager { justify-content: center; }
  .modalOverlay { padding: 0; align-items: flex-end; }
  .modal.mobileSheet { max-width: 100%; max-height: 88vh; border-radius: 18px 18px 0 0; }
  .modalHeader, .modalBody, .modalFooter { padding-left: 16px; padding-right: 16px; }
  .fieldRow { grid-template-columns: 1fr; }
}
</style>
