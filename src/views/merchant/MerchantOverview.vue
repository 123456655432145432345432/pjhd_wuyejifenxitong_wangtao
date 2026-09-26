<template>
  <div class="page" :class="{ mobilePage: isMobile }">
    <div class="header">
      <div>
        <h1 class="title">店铺概览</h1>
        <p class="desc">查看经营数据，管理店铺基本信息。订单确认完成后，本单收入计入可提现。</p>
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
    <p v-if="applymentBanner" class="bannerWarn">
      {{ applymentBanner }}
      <RouterLink class="inlineLink" :to="{ name: 'wechat-applyment' }">去微信收款</RouterLink>
    </p>

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
        <div class="statCard">
          <div class="label">可提现余额</div>
          <div class="value">¥{{ formatMoney(shop.withdrawableAmount) }}</div>
        </div>
        <div class="statCard">
          <div class="label">待结算金额</div>
          <div class="value">¥{{ formatMoney(shop.pendingAmount) }}</div>
        </div>
        <div class="statCard">
          <div class="label">冻结金额</div>
          <div class="value">¥{{ formatMoney(shop.frozenAmount) }}</div>
        </div>
        <div class="statCard">
          <div class="label">应收/待偿</div>
          <div class="value">¥{{ formatMoney(shop.receivableAmount) }}</div>
        </div>
        <div class="statCard purple">
          <div class="label">在售商品</div>
          <div class="value">{{ shop.products?.length ?? 0 }}</div>
        </div>
      </div>

      <div class="grid">
        <div class="card">
          <h3 class="cardTitle">店铺信息</h3>

          <dl v-if="!editing" class="infoList">
            <div><dt>名称</dt><dd>{{ shop.name }}</dd></div>
            <div><dt>分类</dt><dd>{{ shop.category || '—' }}</dd></div>
            <div><dt>等级</dt><dd>{{ getEnumLabel(MERCHANT_LEVEL_LABEL, shop.merchantLevel) }}</dd></div>
            <div><dt>来源</dt><dd>{{ getEnumLabel(MERCHANT_SOURCE_LABEL, shop.merchantSource) }}</dd></div>
            <div><dt>审核</dt><dd>{{ getMerchantAuditDisplayLabel(shop.auditStatus, shop.status) }}</dd></div>
            <div><dt>电话</dt><dd>{{ shop.contactPhone || '—' }}</dd></div>
            <div><dt>地址</dt><dd>{{ shop.address || '—' }}</dd></div>
            <div><dt>营业时间</dt><dd>{{ shop.businessHours || '—' }}</dd></div>
            <div>
              <dt>距离配送费</dt>
              <dd>
                <span v-if="deliveryTiers.length" class="tierSummary">
                  <span v-for="(tier, index) in deliveryTiers" :key="index">
                    {{ tier.minKm }}–{{ tier.maxKm }}km：¥{{ formatMoney(tier.fee) }}{{ tier.enabled ? '' : '（停用）' }}
                  </span>
                </span>
                <span v-else>未设置</span>
              </dd>
            </div>
            <div><dt>满额减免</dt><dd>{{ shop.freeDeliveryEnabled ? '已启用' : '未启用' }}</dd></div>
            <div><dt>免配送门槛</dt><dd>{{ shop.freeDeliveryThreshold != null ? `¥${formatMoney(shop.freeDeliveryThreshold)}` : '—' }}</dd></div>
            <div><dt>默认承担方</dt><dd>{{ sponsorLabel(shop.freeDeliverySponsor) }}</dd></div>
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
              <label class="checkLabel">
                <input v-model="form.freeDeliveryEnabled" type="checkbox" />
                启用满额配送费减免
              </label>
            </div>
            <div class="tierEditor">
              <div class="tierEditorHead">
                <label class="label">距离配送费</label>
                <button type="button" class="btnGhost compact" @click="addTier">新增距离档</button>
              </div>
              <div v-for="(tier, index) in form.deliveryFeeTiers" :key="index" class="tierRow">
                <input v-model.number="tier.minKm" type="number" min="0" step="0.1" class="input" aria-label="起始公里" />
                <span>至</span>
                <input v-model.number="tier.maxKm" type="number" min="0.1" step="0.1" class="input" aria-label="结束公里" />
                <span>km</span>
                <input v-model.number="tier.fee" type="number" min="0" step="0.01" class="input" aria-label="配送费" />
                <span>元</span>
                <label class="checkLabel compactCheck"><input v-model="tier.enabled" type="checkbox" />启用</label>
                <button
                  type="button"
                  class="removeTier"
                  @click="removeTier(index)"
                >×</button>
              </div>
              <p class="riskHint">可新增、修改、删除档位；请至少保留一档启用。下单距离由管理端「小区距离」配置决定，不用经纬度计算。</p>
            </div>
            <div v-if="form.freeDeliveryEnabled" class="field">
              <label class="label">默认补贴承担方</label>
              <select v-model="form.freeDeliverySponsor" class="input">
                <option
                  v-for="option in DELIVERY_SUBSIDY_SPONSOR_OPTIONS"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </option>
              </select>
              <p class="riskHint">满额判断只看商品优惠后小计，不含配送费，且在积分、物业币抵扣前判断。</p>
              <p v-if="form.freeDeliverySponsor === DELIVERY_SUBSIDY_SPONSOR.MERCHANT" class="riskHint warn">
                满额减免默认由商家承担。满足条件时，商家商品结算收入将扣除本单配送补贴。
              </p>
            </div>
            <div v-if="form.freeDeliveryEnabled" class="estimateBox">
              <strong>最低门槛订单估算</strong>
              <span>预计商家商品实得：¥{{ formatMoney(thresholdEstimate.goodsShare) }}</span>
              <span>预计配送补贴：¥{{ formatMoney(thresholdEstimate.subsidy) }}</span>
              <span :class="{ danger: thresholdEstimate.finalShare < 0 }">
                预计商家最终实得：¥{{ formatMoney(thresholdEstimate.finalShare) }}
              </span>
              <small>仅为输入预览，正式金额以后端试算和订单快照为准。</small>
            </div>
            <div class="field">
              <label class="label">店铺地址</label>
              <input v-model="form.address" class="input" maxlength="200" />
            </div>
            <div class="field">
              <label class="label">满额免配送（元）</label>
              <input v-model.number="form.freeDeliveryThreshold" type="number" min="0" step="0.01" class="input" />
            </div>
            <div class="field">
              <label class="label">封面图</label>
              <MediaUploader v-model="form.coverUrls" category="merchant" accept="image" :max="9" />
            </div>
            <div class="field">
              <label class="label">视频</label>
              <MediaUploader v-model="form.videoUrl" category="merchant" accept="video" :max="1" />
            </div>
            <div class="readonlyRow">
              <span>分类：{{ shop.category || '—' }}</span>
              <span>等级：{{ getEnumLabel(MERCHANT_LEVEL_LABEL, shop.merchantLevel) }}</span>
              <span>来源：{{ getEnumLabel(MERCHANT_SOURCE_LABEL, shop.merchantSource) }}</span>
              <span>审核：{{ getMerchantAuditDisplayLabel(shop.auditStatus, shop.status) }}</span>
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
import { computed, onMounted, reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { merchantApplymentApi, merchantPortalApi } from '../../api/services'
import type { DeliveryFeeTier, MyMerchantDetail } from '../../api/types'
import { ApiError } from '../../api/request'
import {
  getEnumLabel,
  DELIVERY_SUBSIDY_SPONSOR,
  DELIVERY_SUBSIDY_SPONSOR_LABEL,
  DELIVERY_SUBSIDY_SPONSOR_OPTIONS,
  MERCHANT_LEVEL_LABEL,
  MERCHANT_SOURCE_LABEL,
  getMerchantAuditDisplayLabel,
  getPhase2ErrorMessage,
  isApplymentFinished
} from '../../constants/enums'
import { useIsMobile } from '../../composables/useIsMobile'
import MediaUploader from '../../components/MediaUploader.vue'
import { applymentStateHint, isApplymentNotFound } from '../../utils/ecommerce'

const { isMobile } = useIsMobile()
const shop = ref<MyMerchantDetail | null>(null)
const loading = ref(false)
const saving = ref(false)
const editing = ref(false)
const error = ref('')
const saveError = ref('')
const saveSuccess = ref('')
const applymentBanner = ref('')

const form = reactive({
  name: '',
  description: '',
  contactPhone: '',
  address: '',
  businessHours: '',
  deliveryFeeTiers: [] as DeliveryFeeTier[],
  freeDeliveryThreshold: undefined as number | undefined,
  freeDeliveryEnabled: false,
  freeDeliverySponsor: DELIVERY_SUBSIDY_SPONSOR.MERCHANT as string,
  coverUrls: [] as string[],
  videoUrl: ''
})

function formatMoney(value?: number | string | null) {
  if (value === undefined || value === null || value === '') return '0.00'
  return Number(value).toFixed(2)
}

function sponsorLabel(value?: string) {
  return getEnumLabel(DELIVERY_SUBSIDY_SPONSOR_LABEL, value, '—')
}

const thresholdEstimate = computed(() => {
  const threshold = Math.max(0, Number(form.freeDeliveryThreshold) || 0)
  const commissionRate = Math.min(1, Math.max(0, Number(shop.value?.commissionRate) || 0))
  const goodsShare = threshold * (1 - commissionRate)
  const maxDeliveryFee = form.deliveryFeeTiers
    .filter((tier) => tier.enabled)
    .reduce((max, tier) => Math.max(max, Number(tier.fee) || 0), 0)
  const subsidy =
    form.freeDeliverySponsor === DELIVERY_SUBSIDY_SPONSOR.MERCHANT
      ? maxDeliveryFee
      : 0
  return { goodsShare, subsidy, finalShare: goodsShare - subsidy }
})

const deliveryTiers = computed(() =>
  shop.value?.deliveryFeeTiers || shop.value?.deliveryFees || []
)

function addTier() {
  const previous = form.deliveryFeeTiers[form.deliveryFeeTiers.length - 1]
  const minKm = Number(previous?.maxKm) || 0
  form.deliveryFeeTiers.push({ minKm, maxKm: minKm + 1, fee: 0, enabled: true })
}

function removeTier(index: number) {
  form.deliveryFeeTiers.splice(index, 1)
}

function syncFormFromShop(data: MyMerchantDetail) {
  form.name = data.name || ''
  form.description = data.description || ''
  form.contactPhone = data.contactPhone || ''
  form.address = data.address || ''
  form.businessHours = data.businessHours || ''
  const tiers = data.deliveryFeeTiers || data.deliveryFees || []
  form.deliveryFeeTiers = tiers.map((tier) => ({ ...tier }))
  form.freeDeliveryThreshold =
    data.freeDeliveryThreshold != null ? Number(data.freeDeliveryThreshold) : undefined
  form.freeDeliveryEnabled = Boolean(data.freeDeliveryEnabled)
  form.freeDeliverySponsor = data.freeDeliverySponsor || DELIVERY_SUBSIDY_SPONSOR.MERCHANT
  form.coverUrls = Array.isArray(data.coverUrls) ? [...data.coverUrls] : []
  form.videoUrl = data.videoUrl || ''
}

async function load() {
  loading.value = true
  error.value = ''
  saveSuccess.value = ''
  applymentBanner.value = ''
  try {
    shop.value = await merchantPortalApi.my()
    if (shop.value) syncFormFromShop(shop.value)
  } catch (e) {
    shop.value = null
    error.value = e instanceof ApiError ? getPhase2ErrorMessage(e.code, e.message) : '店铺信息加载失败'
  } finally {
    loading.value = false
  }
  try {
    const applyment = await merchantApplymentApi.getMine()
    if (!isApplymentFinished(applyment?.applymentState)) {
      applymentBanner.value = applymentStateHint(applyment?.applymentState)
    }
  } catch (e) {
    if (isApplymentNotFound(e)) {
      applymentBanner.value = applymentStateHint()
    }
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
  if (form.freeDeliveryEnabled && (!form.freeDeliveryThreshold || form.freeDeliveryThreshold <= 0)) {
    saveError.value = '启用满额减免时，门槛必须大于 0'
    return
  }
  const sortedTiers = [...form.deliveryFeeTiers].sort((a, b) => Number(a.minKm) - Number(b.minKm))
  const invalidTier = sortedTiers.some((tier, index) => {
    const previous = sortedTiers[index - 1]
    return (
      !Number.isFinite(Number(tier.minKm)) ||
      !Number.isFinite(Number(tier.maxKm)) ||
      !Number.isFinite(Number(tier.fee)) ||
      Number(tier.minKm) < 0 ||
      Number(tier.maxKm) <= Number(tier.minKm) ||
      Number(tier.fee) < 0 ||
      (previous !== undefined && Number(tier.minKm) < Number(previous.maxKm))
    )
  })
  if (!sortedTiers.length || invalidTier) {
    saveError.value = '请配置有效且互不重叠的配送距离档'
    return
  }
  if (!sortedTiers.some((tier) => tier.enabled)) {
    saveError.value = '请至少启用一档配送费'
    return
  }

  saving.value = true
  saveError.value = ''
  saveSuccess.value = ''
  try {
    const coverUrls = form.coverUrls.filter(Boolean)
    const updated = await merchantPortalApi.update(shop.value.id, {
      name,
      description: form.description.trim() || undefined,
      contactPhone: form.contactPhone.trim() || undefined,
      address: form.address.trim() || undefined,
      businessHours: form.businessHours.trim() || undefined,
      coverUrls: coverUrls.length ? coverUrls : undefined,
      videoUrl: form.videoUrl.trim() || undefined
    })
    const deliveryPayload = {
      deliveryFeeTiers: sortedTiers.map((tier) => ({
        minKm: Number(tier.minKm),
        maxKm: Number(tier.maxKm),
        fee: Number(tier.fee),
        enabled: Boolean(tier.enabled)
      })),
      freeDeliveryThreshold: form.freeDeliveryThreshold,
      freeDeliveryEnabled: form.freeDeliveryEnabled,
      freeDeliverySponsor: form.freeDeliverySponsor
    }
    try {
      shop.value = await merchantPortalApi.updateDeliveryFees(deliveryPayload)
    } catch {
      shop.value = await merchantPortalApi.update(shop.value.id, deliveryPayload)
    }
    if (!shop.value) shop.value = updated
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
.bannerWarn { background: #fff7e6; color: #7c4a03; padding: 10px 14px; border-radius: 8px; margin-bottom: 12px; font-size: 13px; }
.inlineLink { margin-left: 8px; color: #2563eb; }
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
.tierSummary { display: flex; flex-direction: column; gap: 4px; }
.descText { font-size: 14px; line-height: 1.7; color: #5c5c66; white-space: pre-wrap; }
.form { display: flex; flex-direction: column; gap: 14px; }
.field { display: flex; flex-direction: column; gap: 6px; }
.fieldRow { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.label { font-size: 13px; color: #8c8c9a; }
.input, .textarea { padding: 8px 12px; border: 1px solid #e8e8ec; border-radius: 8px; font-size: 14px; box-sizing: border-box; width: 100%; }
.checkLabel { display: flex; align-items: center; gap: 8px; font-size: 14px; color: #3a3a48; }
.tierEditor { display: flex; flex-direction: column; gap: 10px; }
.tierEditorHead { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.btnGhost.compact { padding: 6px 10px; font-size: 12px; }
.tierRow { display: grid; grid-template-columns: minmax(70px, 1fr) auto minmax(70px, 1fr) auto minmax(70px, 1fr) auto auto 34px; align-items: center; gap: 6px; }
.compactCheck { white-space: nowrap; font-size: 12px; }
.removeTier { width: 34px; height: 34px; border: 1px solid #f0b8b8; border-radius: 8px; background: #fff; color: #e05c5c; font-size: 18px; cursor: pointer; }
.riskHint { margin: 0; font-size: 12px; color: #8c8c9a; line-height: 1.5; }
.riskHint.warn { color: #b45309; }
.estimateBox { display: grid; gap: 6px; padding: 12px; border: 1px solid #fde68a; border-radius: 8px; background: #fffbeb; font-size: 13px; }
.estimateBox small { color: #8c8c9a; }
.estimateBox .danger { color: #cf1322; font-weight: 600; }
.textarea { resize: vertical; min-height: 160px; }
.readonlyRow { display: flex; flex-wrap: wrap; gap: 12px; font-size: 13px; color: #8c8c9a; padding-top: 4px; }
@media (max-width: 960px) {
  .stats { grid-template-columns: repeat(2, 1fr); }
  .grid { grid-template-columns: 1fr; }
  .fieldRow { grid-template-columns: 1fr; }
  .tierRow { grid-template-columns: 1fr auto 1fr auto; }
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
