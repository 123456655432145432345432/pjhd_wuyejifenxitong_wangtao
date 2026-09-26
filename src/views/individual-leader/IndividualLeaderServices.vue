<template>
  <div class="page" :class="{ mobile: isMobile }">
    <div class="header">
      <div>
        <h1 class="title">{{ pageTitle }}</h1>
        <p class="desc">{{ pageDesc }}</p>
      </div>
      <button class="btnPrimary" @click="openCreate">发布服务</button>
    </div>

    <div class="panel">
      <div v-if="loading" class="loading">加载中...</div>
      <p v-else-if="error" class="error">{{ error }}</p>
      <table v-else-if="services.length && !isMobile" class="table">
        <thead>
          <tr>
            <th>封面</th>
            <th>服务名称</th>
            <th>分类</th>
            <th>价格</th>
            <th>会员价</th>
            <th>单位</th>
            <th>状态</th>
            <th>创建时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in services" :key="item.id">
            <td>
              <img
                v-if="getCoverUrls(item)[0]"
                :src="getCoverUrls(item)[0]"
                :alt="item.name"
                class="listCover"
              />
              <span v-else class="coverPlaceholder">无图</span>
            </td>
            <td>{{ item.name }}</td>
            <td>{{ getEnumLabel(SERVICE_CATEGORY_LABEL, item.category, item.categoryName || '—') }}</td>
            <td>{{ item.price != null ? `¥${formatMoney(item.price)}` : '—' }}</td>
            <td>{{ item.memberPrice != null ? `¥${formatMoney(item.memberPrice)}` : '—' }}</td>
            <td>{{ item.priceUnit || '—' }}</td>
            <td>
              <span class="tag" :class="item.status === ENTITY_STATUS.ACTIVE ? 'active' : 'inactive'">
                {{ statusLabel(item.status) }}
              </span>
            </td>
            <td>{{ item.createdAt || '—' }}</td>
            <td class="actions">
              <div class="actionsInner">
                <button class="linkBtn" @click="openDetail(item.id)">详情</button>
                <button class="linkBtn" @click="openEdit(item.id)">编辑</button>
                <button
                  class="linkBtn danger"
                  :disabled="removingId === item.id"
                  @click="removeService(item)"
                >
                  删除
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-else-if="services.length" class="mobileCards">
        <article v-for="item in services" :key="item.id" class="serviceCard">
          <div class="cardHeading">
            <img v-if="getCoverUrls(item)[0]" :src="getCoverUrls(item)[0]" :alt="item.name" class="listCover" />
            <span v-else class="coverPlaceholder">无图</span>
            <div class="serviceTitle">
              <strong>{{ item.name }}</strong>
              <span>{{ getEnumLabel(SERVICE_CATEGORY_LABEL, item.category, item.categoryName || '—') }}</span>
            </div>
            <span class="tag" :class="item.status === ENTITY_STATUS.ACTIVE ? 'active' : 'inactive'">{{ statusLabel(item.status) }}</span>
          </div>
          <div class="cardMeta">
            <span>价格：{{ item.price != null ? `¥${formatMoney(item.price)}` : '—' }} / {{ item.priceUnit || '—' }}</span>
            <span>会员价：{{ item.memberPrice != null ? `¥${formatMoney(item.memberPrice)}` : '—' }}</span>
            <span>创建时间：{{ item.createdAt || '—' }}</span>
          </div>
          <div class="cardActions">
            <button class="linkBtn" @click="openDetail(item.id)">详情</button>
            <button class="linkBtn" @click="openEdit(item.id)">编辑</button>
            <button class="linkBtn danger" :disabled="removingId === item.id" @click="removeService(item)">删除</button>
          </div>
        </article>
      </div>
      <p v-else class="empty">暂无服务，点击右上角发布</p>
    </div>

    <Teleport to="body">
      <div v-if="formModalOpen" class="modalOverlay" @click.self="closeFormModal">
        <div class="modal" :class="{ mobileSheet: isMobile }">
          <div class="modalHeader">
            <h3 class="modalTitle">{{ editingId ? '编辑服务' : '发布服务' }}</h3>
            <button class="modalClose" @click="closeFormModal">&times;</button>
          </div>
          <div class="modalBody">
            <p v-if="formError" class="error">{{ formError }}</p>
            <div class="field">
              <label class="label">服务名称 <span class="required">*</span></label>
              <input v-model="form.name" class="input" maxlength="100" placeholder="如：家电维修" />
            </div>
            <div class="field">
              <label class="label">服务分类</label>
              <select v-model="form.category" class="input">
                <option v-for="opt in SERVICE_CATEGORY_OPTIONS" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
            </div>
            <div class="field">
              <label class="label">封面图</label>
              <MediaUploader
                v-model="form.coverUrls"
                category="service"
                accept="image"
                :max="9"
              />
            </div>
            <div class="fieldRow">
              <div class="field">
                <label class="label">价格</label>
                <input v-model.number="form.price" type="number" min="0.01" step="0.01" class="input" />
              </div>
              <div class="field">
                <label class="label">会员价</label>
                <input v-model.number="form.memberPrice" type="number" min="0.01" step="0.01" class="input" />
              </div>
            </div>
            <div class="fieldRow">
              <div class="field">
                <label class="label">价格单位</label>
                <input v-model="form.priceUnit" class="input" maxlength="20" placeholder="次 / 月 / 年" />
              </div>
              <div v-if="editingId" class="field">
                <label class="label">状态</label>
                <select v-model="form.status" class="input">
                  <option :value="ENTITY_STATUS.ACTIVE">上架</option>
                  <option :value="ENTITY_STATUS.INACTIVE">下架</option>
                </select>
              </div>
            </div>
            <div class="field">
              <label class="label">服务描述</label>
              <textarea v-model="form.description" class="textarea" rows="3" />
            </div>
          </div>
          <div class="modalFooter">
            <button class="btnSecondary" @click="closeFormModal">取消</button>
            <button class="btnPrimary" :disabled="submitting" @click="submitForm">
              {{ submitting ? '保存中...' : editingId ? '保存' : '确认发布' }}
            </button>
          </div>
        </div>
      </div>

      <div v-if="detailOpen" class="modalOverlay" @click.self="closeDetail">
        <div class="modal" :class="{ mobileSheet: isMobile }">
          <div class="modalHeader">
            <h3 class="modalTitle">服务详情</h3>
            <button class="modalClose" @click="closeDetail">&times;</button>
          </div>
          <div class="modalBody">
            <div v-if="detailLoading" class="loading">加载中...</div>
            <p v-else-if="detailError" class="error">{{ detailError }}</p>
            <template v-else-if="detail">
              <div v-if="detailCoverUrls.length" class="coverPreviewList">
                <img
                  v-for="(url, index) in detailCoverUrls"
                  :key="url + index"
                  :src="url"
                  :alt="detail.name"
                  class="coverThumb"
                />
              </div>
              <ul class="infoList">
                <li><span>服务名称</span><strong>{{ detail.name }}</strong></li>
                <li><span>分类</span><strong>{{ getEnumLabel(SERVICE_CATEGORY_LABEL, detail.category, detail.categoryName || '—') }}</strong></li>
                <li><span>封面图</span><strong>{{ detailCoverUrls.length ? `${detailCoverUrls.length} 张` : '—' }}</strong></li>
                <li><span>提供者</span><strong>{{ detail.providerName || '—' }}</strong></li>
                <li><span>价格</span><strong>{{ detail.price != null ? `¥${formatMoney(detail.price)}` : '—' }}</strong></li>
                <li><span>会员价</span><strong>{{ detail.memberPrice != null ? `¥${formatMoney(detail.memberPrice)}` : '—' }}</strong></li>
                <li><span>价格单位</span><strong>{{ detail.priceUnit || '—' }}</strong></li>
                <li><span>状态</span><strong>{{ statusLabel(detail.status) }}</strong></li>
                <li><span>需订阅</span><strong>{{ detail.subscriptionRequired ? '是' : '否' }}</strong></li>
                <li v-if="detail.monthlyFee != null"><span>月费</span><strong>¥{{ formatMoney(detail.monthlyFee) }}</strong></li>
                <li v-if="detail.yearlyFee != null"><span>年费</span><strong>¥{{ formatMoney(detail.yearlyFee) }}</strong></li>
                <li><span>创建时间</span><strong>{{ detail.createdAt || '—' }}</strong></li>
                <li><span>更新时间</span><strong>{{ detail.updatedAt || '—' }}</strong></li>
              </ul>
              <div v-if="detail.description" class="descBlock">
                <div class="descLabel">服务描述</div>
                <p class="descText">{{ detail.description }}</p>
              </div>
            </template>
          </div>
          <div v-if="detail && !detailLoading" class="modalFooter">
            <button class="btnSecondary" @click="openEdit(detail.id); closeDetail()">编辑</button>
            <button class="btnPrimary" @click="closeDetail">关闭</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import MediaUploader from '../../components/MediaUploader.vue'
import { serviceApi } from '../../api/services'
import type { CommunityServiceItem } from '../../api/types'
import { ApiError } from '../../api/request'
import {
  ENTITY_STATUS,
  ENTITY_STATUS_LABEL,
  getEnumLabel,
  SERVICE_CATEGORY,
  SERVICE_CATEGORY_LABEL,
  SERVICE_CATEGORY_OPTIONS
} from '../../constants/enums'
import { useIsMobile } from '../../composables/useIsMobile'

const route = useRoute()
const { isMobile } = useIsMobile()
const isTechnicianPortal = computed(() => route.name === 'technician-services')
const pageTitle = '我的服务'
const pageDesc = computed(() =>
  isTechnicianPortal.value
    ? '首次发布服务将自动开通技工档口，providerType 由后端固定为 technician'
    : '发布和管理社区服务项目'
)

const services = ref<CommunityServiceItem[]>([])
const loading = ref(false)
const error = ref('')
const formModalOpen = ref(false)
const editingId = ref('')
const submitting = ref(false)
const formError = ref('')
const removingId = ref('')

const detailOpen = ref(false)
const detailLoading = ref(false)
const detailError = ref('')
const detail = ref<CommunityServiceItem | null>(null)

const form = reactive({
  name: '',
  category: SERVICE_CATEGORY.CLEANING_REPAIR,
  coverUrls: [] as string[],
  price: undefined as number | undefined,
  memberPrice: undefined as number | undefined,
  priceUnit: '次',
  description: '',
  status: ENTITY_STATUS.ACTIVE
})

const detailCoverUrls = computed(() => (detail.value ? getCoverUrls(detail.value) : []))

function getCoverUrls(item: CommunityServiceItem) {
  if (item.coverUrls?.length) return item.coverUrls
  if (item.coverUrl) return [item.coverUrl]
  return []
}

function formatMoney(value?: number | null) {
  if (value === undefined || value === null) return '0.00'
  return Number(value).toFixed(2)
}

function statusLabel(status?: string) {
  if (status === ENTITY_STATUS.ACTIVE) return '上架'
  if (status === ENTITY_STATUS.INACTIVE) return '下架'
  return getEnumLabel(ENTITY_STATUS_LABEL, status, '—')
}

function resetForm() {
  form.name = ''
  form.category = SERVICE_CATEGORY.CLEANING_REPAIR
  form.coverUrls = []
  form.price = undefined
  form.memberPrice = undefined
  form.priceUnit = '次'
  form.description = ''
  form.status = ENTITY_STATUS.ACTIVE
  formError.value = ''
}

function applyToForm(data: CommunityServiceItem) {
  form.name = data.name || ''
  form.category = data.category || SERVICE_CATEGORY.CLEANING_REPAIR
  form.coverUrls = [...getCoverUrls(data)]
  form.price = data.price
  form.memberPrice = data.memberPrice
  form.priceUnit = data.priceUnit || '次'
  form.description = data.description || ''
  form.status = data.status || ENTITY_STATUS.ACTIVE
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await serviceApi.list({ mine: true, page: 1, pageSize: 100, sort: '-createdAt' })
    services.value = res.list || []
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '服务加载失败'
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editingId.value = ''
  resetForm()
  formModalOpen.value = true
}

async function openEdit(id: string) {
  editingId.value = id
  formError.value = ''
  try {
    const data = await serviceApi.get(id)
    applyToForm(data)
    formModalOpen.value = true
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '服务详情加载失败'
  }
}

function closeFormModal() {
  formModalOpen.value = false
  editingId.value = ''
}

async function openDetail(id: string) {
  detailOpen.value = true
  detailLoading.value = true
  detailError.value = ''
  detail.value = null
  try {
    detail.value = await serviceApi.get(id)
  } catch (e) {
    detailError.value = e instanceof ApiError ? e.message : '服务详情加载失败'
  } finally {
    detailLoading.value = false
  }
}

function closeDetail() {
  detailOpen.value = false
  detail.value = null
  detailError.value = ''
}

function validateForm(): string | null {
  if (!form.name.trim()) return '请输入服务名称'
  if (form.name.trim().length > 100) return '服务名称不能超过 100 字'
  if (form.coverUrls.some((url) => url.length > 500)) return '单个封面图地址不能超过 500 字'
  if (form.priceUnit.trim().length > 20) return '价格单位不能超过 20 字'
  if (form.price != null && form.price < 0.01) return '价格需 ≥ 0.01'
  if (form.memberPrice != null && form.memberPrice < 0.01) return '会员价需 ≥ 0.01'
  return null
}

async function submitForm() {
  const validationError = validateForm()
  if (validationError) {
    formError.value = validationError
    return
  }
  submitting.value = true
  formError.value = ''
  try {
    const coverUrls = form.coverUrls.filter((url) => url.trim())
    if (editingId.value) {
      await serviceApi.update(editingId.value, {
        name: form.name.trim(),
        category: form.category,
        coverUrls: coverUrls.length ? coverUrls : [],
        price: form.price,
        memberPrice: form.memberPrice,
        priceUnit: form.priceUnit.trim() || undefined,
        description: form.description.trim() || undefined,
        status: form.status
      })
    } else {
      await serviceApi.create({
        name: form.name.trim(),
        category: form.category,
        coverUrls: coverUrls.length ? coverUrls : undefined,
        price: form.price,
        memberPrice: form.memberPrice,
        priceUnit: form.priceUnit.trim() || undefined,
        description: form.description.trim() || undefined
      })
    }
    closeFormModal()
    await load()
  } catch (e) {
    formError.value = e instanceof ApiError ? e.message : editingId.value ? '保存失败' : '发布失败'
  } finally {
    submitting.value = false
  }
}

async function removeService(item: CommunityServiceItem) {
  if (!confirm(`确认删除服务「${item.name}」？删除后将下架该服务。`)) return
  removingId.value = item.id
  error.value = ''
  try {
    await serviceApi.remove(item.id)
    await load()
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '删除失败，请确认是否有删除权限'
  } finally {
    removingId.value = ''
  }
}

onMounted(load)
</script>

<style scoped>
.page { max-width: 1200px; }
.header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 24px; }
.title { font-size: 24px; font-weight: 600; color: #1f1f2e; margin-bottom: 8px; }
.desc { font-size: 14px; color: #8c8c9a; }
.btnPrimary { padding: 10px 18px; border-radius: 8px; background: #5c5c9e; color: #fff; border: none; cursor: pointer; }
.btnPrimary:hover { background: #52529a; }
.btnSecondary { padding: 10px 18px; border-radius: 8px; border: 1px solid #e8e8ec; background: #fff; color: #5c5c66; font-size: 14px; cursor: pointer; }
.btnSecondary:hover { border-color: #5c5c9e; color: #5c5c9e; }
.panel { background: #fff; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); overflow-x: auto; }
.loading, .empty, .error { text-align: center; padding: 32px 0; color: #8c8c9a; font-size: 14px; }
.error { color: #e05c5c; }
.table { width: 100%; border-collapse: collapse; min-width: 960px; }
.table th, .table td {
  padding: 10px;
  text-align: left;
  font-size: 13px;
  vertical-align: middle;
  box-sizing: border-box;
}
.table th { color: #8c8c9a; font-weight: 500; border-bottom: 1px solid #f0f0f3; }
.table tbody tr { border-bottom: 1px solid #f0f0f3; }
.table tbody td { border-bottom: none; }
.listCover { width: 44px; height: 44px; object-fit: cover; border-radius: 6px; border: 1px solid #f0f0f3; display: block; }
.coverPlaceholder { display: inline-block; width: 44px; height: 44px; line-height: 44px; text-align: center; font-size: 11px; color: #8c8c9a; background: #f4f5f7; border-radius: 6px; }
.tag { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 12px; }
.tag.active { background: #f6ffed; color: #389e0d; }
.tag.inactive { background: #f4f5f7; color: #8c8c9a; }
.actions { height: 1px; }
.actionsInner {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  white-space: nowrap;
}
.linkBtn {
  color: #5c5c9e;
  cursor: pointer;
  background: none;
  border: none;
  padding: 0;
  font-size: 13px;
  line-height: 1.4;
  text-decoration: none;
}
.linkBtn.danger { color: #cf1322; }
.linkBtn:disabled { opacity: 0.6; cursor: not-allowed; }
.modalOverlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 16px; }
.modal { width: 560px; max-width: 100%; max-height: 90vh; background: #fff; border-radius: 12px; overflow: hidden; display: flex; flex-direction: column; }
.modalHeader { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid #f0f0f3; flex-shrink: 0; }
.modalTitle { font-size: 16px; font-weight: 600; }
.modalClose { font-size: 24px; color: #8c8c9a; cursor: pointer; background: none; border: none; }
.modalBody { padding: 24px; overflow-y: auto; }
.modalFooter { display: flex; justify-content: flex-end; gap: 12px; padding: 16px 24px 24px; flex-shrink: 0; }
.field { margin-bottom: 16px; }
.fieldRow { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.label { display: block; font-size: 13px; color: #5c5c66; margin-bottom: 8px; }
.required { color: #e05c5c; }
.input, .textarea { width: 100%; padding: 10px 12px; border: 1px solid #e8e8ec; border-radius: 8px; font-size: 14px; box-sizing: border-box; outline: none; }
.input:focus, .textarea:focus { border-color: #5c5c9e; }
.textarea { resize: vertical; font-family: inherit; }
.coverPreviewList { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
.coverThumb { width: 72px; height: 72px; object-fit: cover; border-radius: 8px; border: 1px solid #f0f0f3; }
.infoList { list-style: none; }
.infoList li { display: flex; justify-content: space-between; gap: 12px; padding: 10px 0; border-bottom: 1px solid #f7f7f9; font-size: 13px; }
.infoList span { color: #8c8c9a; flex-shrink: 0; }
.infoList strong { color: #1f1f2e; text-align: right; font-weight: 500; }
.descBlock { margin-top: 16px; }
.descLabel { font-size: 13px; color: #8c8c9a; margin-bottom: 8px; }
.descText { font-size: 14px; color: #1f1f2e; line-height: 1.6; white-space: pre-wrap; }
@media (max-width: 640px) { .fieldRow { grid-template-columns: 1fr; } }
@media (max-width: 768px) {
  .page { padding: 0 var(--mobile-page-gap); }
  .header { gap: 12px; margin-bottom: 18px; }
  .title { font-size: 22px; }
  .header .btnPrimary { min-height: var(--mobile-touch-target); }
  .panel { padding: 0; overflow: visible; background: transparent; box-shadow: none; }
  .mobileCards { display: grid; gap: 10px; }
  .serviceCard { padding: 16px; border-radius: var(--mobile-card-radius); background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,.04); }
  .cardHeading { display: flex; align-items: center; gap: 10px; }
  .serviceTitle { display: grid; min-width: 0; flex: 1; gap: 4px; }
  .serviceTitle strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .serviceTitle span, .cardMeta { color: #8c8c9a; font-size: 13px; }
  .cardMeta { display: grid; gap: 7px; margin: 12px 0; color: #5c5c66; }
  .cardActions { display: flex; gap: 16px; }
  .linkBtn { padding: 6px 0; font-size: 14px; }
  .modalOverlay { align-items: flex-end; padding: 0; }
  .modal { width: 100%; max-width: 100%; max-height: 88vh; border-radius: var(--mobile-sheet-radius) var(--mobile-sheet-radius) 0 0; }
  .modalHeader, .modalBody, .modalFooter { padding-left: 16px; padding-right: 16px; }
  .modalFooter { padding-bottom: max(16px, env(safe-area-inset-bottom)); }
}
</style>
