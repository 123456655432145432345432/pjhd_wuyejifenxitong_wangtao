<template>
  <div class="page">
    <div class="header">
      <div>
        <h1 class="title">{{ pageTitle }}</h1>
        <p class="desc">{{ pageDesc }}</p>
      </div>
      <button class="btnPrimary" :disabled="shopBlocked" @click="openCreate">新增商品</button>
    </div>

    <div class="panel">
      <div v-if="loading" class="loading">加载中...</div>
      <p v-else-if="error" class="error">{{ error }}</p>
      <template v-else>
        <p v-if="shopHint" class="hint">{{ shopHint }}</p>
        <div v-if="products.length && isMobile" class="mobileList">
          <article v-for="item in products" :key="item.id" class="mobileCard">
            <img v-if="item.coverUrl" :src="item.coverUrl" :alt="item.name" class="coverThumb" />
            <span v-else class="coverPlaceholder">无图</span>
            <div class="mobileContent">
              <div class="mobileCardHead"><strong>{{ item.name }}</strong><span class="tag" :class="item.status === ENTITY_STATUS.ACTIVE ? 'active' : 'inactive'">{{ statusLabel(item.status) }}</span></div>
              <p>{{ item.category || '未分类' }} · ¥{{ formatMoney(item.price) }} · 库存 {{ item.stock ?? '—' }}</p>
              <button class="linkBtn" @click="openEdit(item)">编辑</button>
            </div>
          </article>
        </div>
        <table v-else-if="products.length" class="table">
          <thead>
            <tr>
              <th>封面</th>
              <th>名称</th>
              <th>分类</th>
              <th>价格</th>
              <th>会员价</th>
              <th>积分价</th>
              <th>库存</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in products" :key="item.id">
              <td>
                <img
                  v-if="item.coverUrl"
                  :src="item.coverUrl"
                  :alt="item.name"
                  class="coverThumb"
                />
                <span v-else class="coverPlaceholder">无图</span>
              </td>
              <td>{{ item.name }}</td>
              <td>{{ item.category || '—' }}</td>
              <td>¥{{ formatMoney(item.price) }}</td>
              <td>{{ item.memberPrice != null ? `¥${formatMoney(item.memberPrice)}` : '—' }}</td>
              <td>{{ item.pointPrice != null ? item.pointPrice : '—' }}</td>
              <td>{{ item.stock ?? '—' }}</td>
              <td>
                <span class="tag" :class="item.status === ENTITY_STATUS.ACTIVE ? 'active' : 'inactive'">
                  {{ statusLabel(item.status) }}
                </span>
              </td>
              <td><button class="linkBtn" @click="openEdit(item)">编辑</button></td>
            </tr>
          </tbody>
        </table>
        <p v-else class="empty">暂无商品，点击右上角新增</p>
      </template>
    </div>

    <Teleport to="body">
      <div v-if="modalOpen" class="modalOverlay" @click.self="closeModal">
        <div class="modal" :class="{ mobileSheet: isMobile }">
          <div class="modalHeader">
            <h3 class="modalTitle">{{ editingId ? '编辑商品' : '新增商品' }}</h3>
            <button class="modalClose" @click="closeModal">&times;</button>
          </div>
          <div class="modalBody">
            <p v-if="formError" class="error">{{ formError }}</p>
            <div class="field">
              <label class="label">商品名称 <span class="required">*</span></label>
              <input
                v-model="form.name"
                class="input"
                maxlength="100"
                placeholder="如：可口可乐330ml"
              />
            </div>
            <div class="field">
              <label class="label">分类</label>
              <select v-model="form.category" class="input">
                <option value="">请选择平台分类</option>
                <option
                  v-for="opt in categorySelectOptions"
                  :key="opt.value"
                  :value="opt.value"
                >
                  {{ opt.label }}
                </option>
              </select>
              <p class="formHint">分类由平台统一设计。选「团购」且整单都是团购商品时，支付后走商家核实、无需配送。</p>
            </div>
            <div class="field">
              <label class="label">封面图</label>
              <MediaUploader v-model="form.coverUrl" category="merchant" accept="image" :max="1" />
            </div>
            <div class="field">
              <label class="label">描述</label>
              <textarea
                v-model="form.description"
                class="textarea"
                rows="3"
                placeholder="商品描述"
              />
            </div>
            <div class="fieldRow">
              <div class="field">
                <label class="label">价格 <span class="required">*</span></label>
                <input
                  v-model.number="form.price"
                  type="number"
                  min="0.01"
                  step="0.01"
                  class="input"
                  placeholder="0.00"
                />
              </div>
              <div class="field">
                <label class="label">会员价</label>
                <input
                  v-model.number="form.memberPrice"
                  type="number"
                  min="0.01"
                  step="0.01"
                  class="input"
                  placeholder="业主折扣价"
                />
              </div>
            </div>
            <div class="fieldRow">
              <div class="field">
                <label class="label">积分价</label>
                <input
                  v-model.number="form.pointPrice"
                  type="number"
                  min="1"
                  step="1"
                  class="input"
                  placeholder="积分兑换价格"
                />
              </div>
              <div class="field">
                <label class="label">库存</label>
                <input
                  v-model.number="form.stock"
                  type="number"
                  min="0"
                  step="1"
                  class="input"
                  placeholder="0"
                />
              </div>
            </div>
            <div class="field">
              <label class="label">状态</label>
              <select v-model="form.status" class="input">
                <option :value="ENTITY_STATUS.ACTIVE">上架</option>
                <option :value="ENTITY_STATUS.INACTIVE">下架</option>
              </select>
            </div>
          </div>
          <div class="modalFooter">
            <button class="btnSecondary" @click="closeModal">取消</button>
            <button class="btnPrimary" :disabled="submitting" @click="submit">
              {{ submitting ? '保存中...' : '保存' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { merchantPortalApi } from '../../api/services'
import type { ProductCreatePayload, ProductItem, ProductUpdatePayload } from '../../api/types'
import { ApiError } from '../../api/request'
import { ENTITY_STATUS, ENTITY_STATUS_LABEL, PRODUCT_CATEGORY_OPTIONS, getEnumLabel, getPhase2ErrorMessage } from '../../constants/enums'
import { useIsMobile } from '../../composables/useIsMobile'
import MediaUploader from '../../components/MediaUploader.vue'

const route = useRoute()
const { isMobile } = useIsMobile()
const isActivityLeaderShop = computed(() => route.name === 'activity-leader-products')
const pageTitle = computed(() => (isActivityLeaderShop.value ? '我的小店' : '商品管理'))
const pageDesc = computed(() =>
  isActivityLeaderShop.value
    ? '首次上架商品将自动开通组长小店，商品进入主商城'
    : '维护店铺商品与库存。分类选「团购」且顾客整单都是团购商品时，支付后走商家核实、无需配送。'
)

const products = ref<ProductItem[]>([])
const loading = ref(false)
const error = ref('')
const shopHint = ref('')
const shopBlocked = ref(false)
const modalOpen = ref(false)
const editingId = ref('')
const submitting = ref(false)
const formError = ref('')

const form = reactive({
  name: '',
  category: '',
  coverUrl: '',
  price: undefined as number | undefined,
  memberPrice: undefined as number | undefined,
  pointPrice: undefined as number | undefined,
  stock: undefined as number | undefined,
  description: '',
  status: ENTITY_STATUS.ACTIVE
})

/** 编辑时若历史分类不在平台列表中，临时并入选项以免丢失 */
const categorySelectOptions = computed(() => {
  const base = PRODUCT_CATEGORY_OPTIONS.map((o) => ({ value: o.value, label: o.label }))
  const current = form.category.trim()
  if (current && !base.some((o) => o.value === current)) {
    base.push({ value: current, label: `${current}（历史）` })
  }
  return base
})

function formatMoney(value?: number) {
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
  form.category = ''
  form.coverUrl = ''
  form.price = undefined
  form.memberPrice = undefined
  form.pointPrice = undefined
  form.stock = undefined
  form.description = ''
  form.status = ENTITY_STATUS.ACTIVE
  formError.value = ''
}

async function load() {
  loading.value = true
  error.value = ''
  shopHint.value = ''
  shopBlocked.value = false
  try {
    const shop = await merchantPortalApi.my()
    const res = await merchantPortalApi.products({
      merchantId: shop.id,
      page: 1,
      pageSize: 100,
      sort: '-createdAt'
    })
    products.value = res.list?.length ? res.list : shop.products || []
  } catch (e) {
    products.value = []
    if (e instanceof ApiError && (e.code === 60005 || e.code === 60002)) {
      shopBlocked.value = true
      error.value = getPhase2ErrorMessage(e.code, e.message)
    } else if (isActivityLeaderShop.value) {
      shopHint.value = '尚未开通小店：点击「新增商品」上架后将自动创建组长小店'
    } else {
      error.value = e instanceof ApiError ? getPhase2ErrorMessage(e.code, e.message) : '商品加载失败'
    }
  } finally {
    loading.value = false
  }
}

function openCreate() {
  if (shopBlocked.value) return
  editingId.value = ''
  resetForm()
  modalOpen.value = true
}

function openEdit(item: ProductItem) {
  editingId.value = item.id
  form.name = item.name
  form.category = item.category || ''
  form.coverUrl = item.coverUrl || ''
  form.price = item.price
  form.memberPrice = item.memberPrice
  form.pointPrice = item.pointPrice
  form.stock = item.stock
  form.description = item.description || ''
  form.status = item.status || ENTITY_STATUS.ACTIVE
  formError.value = ''
  modalOpen.value = true
}

function closeModal() {
  modalOpen.value = false
}

function validateForm(): string | null {
  const name = form.name.trim()
  if (!name) return '请输入商品名称'
  if (name.length > 100) return '商品名称不能超过 100 字'
  if (form.category.trim().length > 50) return '分类不能超过 50 字'
  if (form.coverUrl.trim().length > 500) return '封面图地址过长'
  if (form.price == null || form.price < 0.01) return '请输入有效价格（≥ 0.01）'
  if (form.memberPrice != null && form.memberPrice < 0.01) return '会员价需 ≥ 0.01'
  if (form.pointPrice != null && form.pointPrice < 1) return '积分价需 ≥ 1'
  if (form.stock != null && form.stock < 0) return '库存不能为负数'
  return null
}

function buildPayload(): ProductCreatePayload | ProductUpdatePayload {
  const coverUrl = form.coverUrl.trim() || undefined
  const payload = {
    name: form.name.trim(),
    description: form.description.trim() || undefined,
    coverUrl,
    category: form.category.trim() || undefined,
    price: form.price!,
    memberPrice: form.memberPrice,
    pointPrice: form.pointPrice,
    stock: form.stock,
    status: form.status
  }
  if (payload.memberPrice == null) delete payload.memberPrice
  if (payload.pointPrice == null) delete payload.pointPrice
  if (payload.stock == null) delete payload.stock
  return payload
}

async function submit() {
  const validationError = validateForm()
  if (validationError) {
    formError.value = validationError
    return
  }
  submitting.value = true
  formError.value = ''
  try {
    const payload = buildPayload()
    if (editingId.value) {
      await merchantPortalApi.updateProduct(editingId.value, payload)
    } else {
      await merchantPortalApi.createProduct(payload as ProductCreatePayload)
    }
    closeModal()
    await load()
  } catch (e) {
    formError.value = e instanceof ApiError ? e.message : '保存失败'
  } finally {
    submitting.value = false
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
.hint { font-size: 13px; color: #5c5c9e; background: #f5f5fb; border-radius: 8px; padding: 10px 12px; margin: 0 0 12px; text-align: left; }
.table { width: 100%; border-collapse: collapse; min-width: 880px; }
.table th, .table td { padding: 12px 10px; text-align: left; border-bottom: 1px solid #f0f0f3; font-size: 13px; vertical-align: middle; }
.table th { color: #8c8c9a; font-weight: 500; }
.coverThumb { width: 44px; height: 44px; object-fit: cover; border-radius: 6px; border: 1px solid #f0f0f3; }
.coverPlaceholder { display: inline-block; width: 44px; height: 44px; line-height: 44px; text-align: center; font-size: 11px; color: #8c8c9a; background: #f4f5f7; border-radius: 6px; }
.tag { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 12px; }
.tag.active { background: #f6ffed; color: #389e0d; }
.tag.inactive { background: #f4f5f7; color: #8c8c9a; }
.linkBtn { color: #5c5c9e; cursor: pointer; background: none; border: none; font-size: 13px; }
.modalOverlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal { width: 560px; max-width: calc(100vw - 32px); max-height: 90vh; background: #fff; border-radius: 12px; overflow: hidden; display: flex; flex-direction: column; }
.modalHeader { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid #f0f0f3; flex-shrink: 0; }
.modalTitle { font-size: 16px; font-weight: 600; }
.modalClose { font-size: 24px; color: #8c8c9a; cursor: pointer; background: none; border: none; }
.modalBody { padding: 24px; overflow-y: auto; }
.modalFooter { display: flex; justify-content: flex-end; gap: 12px; padding: 0 24px 24px; flex-shrink: 0; }
.field { margin-bottom: 16px; }
.fieldRow { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.label { display: block; font-size: 13px; color: #5c5c66; margin-bottom: 8px; }
.required { color: #e05c5c; }
.input, .textarea { width: 100%; padding: 10px 12px; border: 1px solid #e8e8ec; border-radius: 8px; font-size: 14px; box-sizing: border-box; }
.textarea { resize: vertical; font-family: inherit; }
.coverPreview { margin-top: 10px; }
.coverPreview img { width: 120px; height: 120px; object-fit: cover; border-radius: 8px; border: 1px solid #f0f0f3; }
.previewHint { margin-top: 6px; font-size: 12px; color: #e05c5c; }
.formHint { margin: 6px 0 0; font-size: 12px; color: #8c8c9a; }
.mobileList { display: flex; flex-direction: column; gap: 12px; }
.mobileCard { display: flex; gap: 12px; align-items: flex-start; border: 1px solid #ececf2; border-radius: 10px; padding: 12px; }
.mobileContent { flex: 1; min-width: 0; }
.mobileCardHead { display: flex; justify-content: space-between; gap: 8px; }
.mobileContent p { margin: 8px 0; color: #8c8c9a; font-size: 13px; }
.mobileSheet { max-width: 100%; border-radius: 18px 18px 0 0; margin-top: auto; }
@media (max-width: 640px) {
  .header { flex-direction: column; gap: 12px; margin-bottom: 16px; }
  .header .btnPrimary { width: 100%; min-height: 44px; }
  .panel { padding: 14px; }
  .modalOverlay { align-items: flex-end; padding: 0; }
  .modal { width: 100%; max-width: 100%; max-height: 92vh; }
  .modalHeader, .modalBody { padding: 16px; }
  .modalFooter { flex-direction: column-reverse; padding: 0 16px 16px; gap: 8px; }
  .modalFooter .btnSecondary, .modalFooter .btnPrimary, .modalFooter .btnDanger { width: 100%; min-height: 44px; }
  .fieldRow { grid-template-columns: 1fr; }
}
</style>
