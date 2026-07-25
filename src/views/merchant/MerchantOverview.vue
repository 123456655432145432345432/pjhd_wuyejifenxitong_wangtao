<template>
  <div class="page" :class="{ mobilePage: isMobile }">
    <div class="header">
      <div>
        <h1 class="title">店铺概览</h1>
        <p class="desc">查看经营数据，管理店铺基本信息</p>
      </div>
      <div class="headerActions">
        <template v-if="shop && !loading">
          <button v-if="!editing" class="btnPrimary" @click="startEdit">编辑信息</button>
          <template v-else>
            <button class="btnGhost" :disabled="saving" @click="cancelEdit">取消</button>
            <button class="btnPrimary" :disabled="saving" @click="save">
              {{ saving ? '保存中...' : '保存' }}
            </button>
          </template>
        </template>
        <button class="btnSecondary" :disabled="loading || saving" @click="load">刷新</button>
      </div>
    </div>

    <p v-if="saveSuccess" class="bannerSuccess">{{ saveSuccess }}</p>
    <p v-if="saveError" class="bannerError">{{ saveError }}</p>

    <div v-if="loading" class="loading">加载中...</div>
    <p v-else-if="error" class="error">{{ error }}</p>
    <template v-else-if="shop">
      <div class="stats">
        <div class="statCard">
          <div class="label">累计订单</div>
          <div class="value">{{ shop.totalOrders ?? 0 }}</div>
        </div>
        <div class="statCard green">
          <div class="label">累计收入</div>
          <div class="value">¥{{ formatMoney(shop.totalRevenue) }}</div>
        </div>
        <div class="statCard purple">
          <div class="label">在售商品</div>
          <div class="value">{{ shop.products?.length ?? 0 }}</div>
        </div>
        <div class="statCard">
          <div class="label">店铺状态</div>
          <div class="value small">{{ getEnumLabel(MERCHANT_STATUS_LABEL, shop.status) }}</div>
        </div>
      </div>

      <div class="grid">
        <div class="card">
          <h3 class="cardTitle">店铺信息</h3>

          <dl v-if="!editing" class="infoList">
            <div><dt>名称</dt><dd>{{ shop.name }}</dd></div>
            <div><dt>分类</dt><dd>{{ shop.category || '—' }}</dd></div>
            <div><dt>等级</dt><dd>{{ getEnumLabel(MERCHANT_LEVEL_LABEL, shop.merchantLevel) }}</dd></div>
            <div><dt>审核</dt><dd>{{ getEnumLabel(MERCHANT_AUDIT_STATUS_LABEL, shop.auditStatus) }}</dd></div>
            <div><dt>电话</dt><dd>{{ shop.contactPhone || '—' }}</dd></div>
            <div><dt>地址</dt><dd>{{ shop.address || '—' }}</dd></div>
            <div><dt>营业时间</dt><dd>{{ shop.businessHours || '—' }}</dd></div>
            <div><dt>配送费</dt><dd>¥{{ formatMoney(shop.deliveryFee) }}</dd></div>
            <div><dt>免配送门槛</dt><dd>{{ shop.freeDeliveryThreshold != null ? `¥${formatMoney(shop.freeDeliveryThreshold)}` : '—' }}</dd></div>
          </dl>

          <form v-else class="form" @submit.prevent="save">
            <div class="field">
              <label class="label">店铺名称</label>
              <input v-model="form.name" class="input" maxlength="100" />
            </div>
            <div class="fieldRow">
              <div class="field">
                <label class="label">联系电话</label>
                <input v-model="form.contactPhone" class="input" maxlength="20" />
              </div>
              <div class="field">
                <label class="label">营业时间</label>
                <input v-model="form.businessHours" class="input" maxlength="50" placeholder="08:00-22:00" />
              </div>
            </div>
            <div class="field">
              <label class="label">店铺地址</label>
              <input v-model="form.address" class="input" maxlength="200" />
            </div>
            <div class="fieldRow">
              <div class="field">
                <label class="label">配送费（元）</label>
                <input v-model.number="form.deliveryFee" type="number" min="0" step="0.01" class="input" />
              </div>
              <div class="field">
                <label class="label">满额免配送（元）</label>
                <input v-model.number="form.freeDeliveryThreshold" type="number" min="0" step="0.01" class="input" />
              </div>
            </div>
            <div class="field">
              <label class="label">封面图 URL</label>
              <input v-model="form.coverUrlsText" class="input" placeholder="多个 URL 用英文逗号分隔" />
            </div>
            <div class="field">
              <label class="label">视频 URL</label>
              <input v-model="form.videoUrl" class="input" maxlength="500" />
            </div>
            <div class="readonlyRow">
              <span>分类：{{ shop.category || '—' }}</span>
              <span>等级：{{ getEnumLabel(MERCHANT_LEVEL_LABEL, shop.merchantLevel) }}</span>
              <span>审核：{{ getEnumLabel(MERCHANT_AUDIT_STATUS_LABEL, shop.auditStatus) }}</span>
            </div>
          </form>
        </div>

        <div class="card">
          <h3 class="cardTitle">店铺简介</h3>
          <p v-if="!editing" class="descText">{{ shop.description || '暂无简介' }}</p>
          <textarea
            v-else
            v-model="form.description"
            class="textarea"
            rows="8"
            placeholder="填写店铺简介"
          />
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { merchantPortalApi } from '../../api/services'
import type { MyMerchantDetail } from '../../api/types'
import { ApiError } from '../../api/request'
import {
  getEnumLabel,
  MERCHANT_AUDIT_STATUS_LABEL,
  MERCHANT_LEVEL_LABEL,
  MERCHANT_STATUS_LABEL
} from '../../constants/enums'
import { useIsMobile } from '../../composables/useIsMobile'

const { isMobile } = useIsMobile()
const shop = ref<MyMerchantDetail | null>(null)
const loading = ref(false)
const saving = ref(false)
const editing = ref(false)
const error = ref('')
const saveError = ref('')
const saveSuccess = ref('')

const form = reactive({
  name: '',
  description: '',
  contactPhone: '',
  address: '',
  businessHours: '',
  deliveryFee: undefined as number | undefined,
  freeDeliveryThreshold: undefined as number | undefined,
  coverUrlsText: '',
  videoUrl: ''
})

function formatMoney(value?: number | string | null) {
  if (value === undefined || value === null || value === '') return '0.00'
  return Number(value).toFixed(2)
}

function syncFormFromShop(data: MyMerchantDetail) {
  form.name = data.name || ''
  form.description = data.description || ''
  form.contactPhone = data.contactPhone || ''
  form.address = data.address || ''
  form.businessHours = data.businessHours || ''
  form.deliveryFee = data.deliveryFee != null ? Number(data.deliveryFee) : undefined
  form.freeDeliveryThreshold =
    data.freeDeliveryThreshold != null ? Number(data.freeDeliveryThreshold) : undefined
  form.coverUrlsText = data.coverUrls?.join(', ') || ''
  form.videoUrl = data.videoUrl || ''
}

function parseCoverUrls(text: string) {
  return text
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

async function load() {
  loading.value = true
  error.value = ''
  saveSuccess.value = ''
  try {
    shop.value = await merchantPortalApi.my()
    if (shop.value) syncFormFromShop(shop.value)
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '店铺信息加载失败'
  } finally {
    loading.value = false
  }
}

function startEdit() {
  if (!shop.value) return
  syncFormFromShop(shop.value)
  saveError.value = ''
  saveSuccess.value = ''
  editing.value = true
}

function cancelEdit() {
  if (shop.value) syncFormFromShop(shop.value)
  saveError.value = ''
  editing.value = false
}

async function save() {
  if (!shop.value) return
  const name = form.name.trim()
  if (!name) {
    saveError.value = '店铺名称不能为空'
    return
  }

  saving.value = true
  saveError.value = ''
  saveSuccess.value = ''
  try {
    const coverUrls = parseCoverUrls(form.coverUrlsText)
    shop.value = await merchantPortalApi.update(shop.value.id, {
      name,
      description: form.description.trim() || undefined,
      contactPhone: form.contactPhone.trim() || undefined,
      address: form.address.trim() || undefined,
      businessHours: form.businessHours.trim() || undefined,
      deliveryFee: form.deliveryFee,
      freeDeliveryThreshold: form.freeDeliveryThreshold,
      coverUrls: coverUrls.length ? coverUrls : undefined,
      videoUrl: form.videoUrl.trim() || undefined
    })
    syncFormFromShop(shop.value)
    editing.value = false
    saveSuccess.value = '店铺信息已保存'
  } catch (e) {
    saveError.value = e instanceof ApiError ? e.message : '保存失败'
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.page { max-width: 1200px; }
.header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 24px; }
.headerActions { display: flex; gap: 10px; flex-wrap: wrap; }
.title { font-size: 24px; font-weight: 600; color: #1f1f2e; margin-bottom: 8px; }
.desc { font-size: 14px; color: #8c8c9a; }
.btnPrimary { padding: 10px 18px; border-radius: 8px; background: #5c5c9e; color: #fff; border: none; cursor: pointer; }
.btnPrimary:hover { background: #52529a; }
.btnSecondary { padding: 10px 18px; border-radius: 8px; border: 1px solid #e8e8ec; background: #fff; color: #5c5c66; font-size: 14px; cursor: pointer; }
.btnSecondary:hover { border-color: #5c5c9e; color: #5c5c9e; }
.btnGhost { padding: 10px 18px; border-radius: 8px; border: 1px solid #e8e8ec; background: #fff; color: #5c5c66; font-size: 14px; cursor: pointer; }
.btnGhost:hover { border-color: #5c5c9e; color: #5c5c9e; }
.btnPrimary:disabled, .btnSecondary:disabled, .btnGhost:disabled { opacity: 0.5; cursor: not-allowed; }
.bannerSuccess { background: #f6ffed; color: #389e0d; padding: 10px 14px; border-radius: 8px; margin-bottom: 12px; font-size: 13px; }
.bannerError { background: #fff1f0; color: #cf1322; padding: 10px 14px; border-radius: 8px; margin-bottom: 12px; font-size: 13px; }
.loading, .error { font-size: 14px; padding: 24px 0; }
.error { color: #e05c5c; }
.stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 20px; }
.statCard { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.statCard.green .value { color: #3aaf7d; }
.statCard.purple .value { color: #5c5c9e; }
.statCard .label { font-size: 13px; color: #8c8c9a; margin-bottom: 8px; }
.statCard .value { font-size: 28px; font-weight: 600; color: #1f1f2e; }
.statCard .value.small { font-size: 20px; }
.grid { display: grid; grid-template-columns: 1.2fr 1fr; gap: 20px; }
.card { background: #fff; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.cardTitle { font-size: 16px; font-weight: 600; color: #1f1f2e; margin-bottom: 16px; }
.infoList div { display: flex; gap: 12px; padding: 10px 0; border-bottom: 1px solid #f0f0f3; font-size: 14px; }
.infoList dt { width: 88px; color: #8c8c9a; flex-shrink: 0; }
.infoList dd { color: #1f1f2e; }
.descText { font-size: 14px; line-height: 1.7; color: #5c5c66; white-space: pre-wrap; }
.form { display: flex; flex-direction: column; gap: 14px; }
.field { display: flex; flex-direction: column; gap: 6px; }
.fieldRow { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.label { font-size: 13px; color: #8c8c9a; }
.input, .textarea { padding: 8px 12px; border: 1px solid #e8e8ec; border-radius: 8px; font-size: 14px; box-sizing: border-box; width: 100%; }
.textarea { resize: vertical; min-height: 160px; }
.readonlyRow { display: flex; flex-wrap: wrap; gap: 12px; font-size: 13px; color: #8c8c9a; padding-top: 4px; }
@media (max-width: 960px) {
  .stats { grid-template-columns: repeat(2, 1fr); }
  .grid { grid-template-columns: 1fr; }
  .fieldRow { grid-template-columns: 1fr; }
}
@media (max-width: 640px) {
  .header { flex-direction: column; margin-bottom: 16px; }
  .headerActions { width: 100%; }
  .headerActions button { flex: 1; min-height: 44px; }
  .title { font-size: 20px; }
  .stats { grid-template-columns: 1fr; gap: 10px; margin-bottom: 12px; }
  .statCard, .card { padding: 16px; }
  .grid { gap: 12px; }
  .infoList div { display: block; }
  .infoList dt { width: auto; margin-bottom: 4px; }
  .readonlyRow { flex-direction: column; gap: 6px; }
}
</style>
