<template>
  <div class="page">
    <div class="header">
      <div>
        <h1 class="title">广告推送</h1>
        <p class="desc">按天购买广告位，推送到服务范围内住户的聊天列表小横条</p>
      </div>
      <div class="headerActions">
        <button type="button" class="btnSecondary" @click="openTargetedCreate">定向广告</button>
        <button type="button" class="btnPrimary" @click="openCreate">发布广告</button>
      </div>
    </div>

    <div class="quotaCard" v-if="quota || quoteHint">
      <span v-if="quota">本周 {{ quota.weekStart || '—' }} ~ {{ quota.weekEnd || '—' }}</span>
      <span>
        免费剩余
        <strong>{{ freeRemaining }}</strong>
        <template v-if="quota?.freeQuotaEnabled === false">（已关闭）</template>
      </span>
      <span v-if="quoteHint">参考单价 ¥{{ formatMoney(quoteHint.dayPrice) }}/天</span>
    </div>

    <div class="panel">
      <div v-if="loading" class="hint">加载中...</div>
      <p v-else-if="error" class="error">{{ error }}</p>
      <div v-else-if="list.length && isMobile" class="mobileList">
        <article v-for="item in list" :key="item.id" class="mobileCard">
          <div class="mobileCardHead">
            <strong>{{ item.title }}</strong>
            <span>{{ paymentLabel(item.paymentMethod) }}</span>
          </div>
          <p>{{ item.content || '—' }}</p>
          <p v-if="isPendingPayment(item)" class="pendingHint">
            待支付，需在微信小程序内完成支付后才会开始投放
          </p>
          <small>
            {{ item.startDate || '—' }} ~ {{ item.endDate || '—' }}
            · {{ item.durationDays ?? '—' }} 天
            · ¥{{ formatMoney(item.payAmount) }}
            · 推送 {{ item.recipientCount ?? 0 }} 人
            <template v-if="item.status"> · {{ adStatusLabel(item.status) }}</template>
          </small>
        </article>
      </div>
      <table v-else-if="list.length" class="table">
        <thead>
          <tr>
            <th>投放期</th>
            <th>标题</th>
            <th>天数</th>
            <th>支付</th>
            <th>状态</th>
            <th>推送人数</th>
            <th>创建时间</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in list" :key="item.id">
            <td>{{ item.startDate || '—' }} ~ {{ item.endDate || '—' }}</td>
            <td>{{ item.title }}</td>
            <td>{{ item.durationDays ?? '—' }}</td>
            <td>{{ paymentLabel(item.paymentMethod) }} · ¥{{ formatMoney(item.payAmount) }}</td>
            <td>
              <span class="statusDot" :class="adStatusClass(item.status)">
                {{ adStatusLabel(item.status) }}
              </span>
            </td>
            <td>{{ item.recipientCount ?? 0 }}</td>
            <td>{{ item.createdAt || '—' }}</td>
          </tr>
        </tbody>
      </table>
      <p v-else class="hint">暂无广告记录</p>
    </div>

    <Teleport to="body">
      <div v-if="targetedModalOpen" class="modalOverlay" @click.self="targetedModalOpen = false">
        <div class="modal" :class="{ mobileSheet: isMobile }">
          <div class="modalHeader">
            <h3 class="modalTitle">发布定向广告</h3>
            <button type="button" class="modalClose" @click="targetedModalOpen = false">&times;</button>
          </div>
          <div class="modalBody">
            <div class="field">
              <label class="label">标题</label>
              <input v-model="targetedForm.title" class="input" maxlength="128" />
            </div>
            <div class="field">
              <label class="label">内容</label>
              <textarea v-model="targetedForm.content" class="textarea" rows="4" />
            </div>
            <AdPricingFields
              v-model:duration-days="targetedForm.durationDays"
              v-model:payment-method="targetedForm.paymentMethod"
              :quote="targetedQuote"
              :quote-loading="targetedQuoteLoading"
              :free-remaining="freeRemaining"
              :free-enabled="freeEnabled"
              :wechat-payment-enabled="wechatPaymentEnabled"
            />
            <div class="field">
              <label class="label">目标楼栋（每行一个）</label>
              <textarea v-model="targetedForm.targetBuildingsText" class="textarea" rows="2" placeholder="1栋&#10;2栋" />
            </div>
            <div class="field">
              <label class="label">目标性别</label>
              <select v-model="targetedForm.targetGender" class="input">
                <option value="all">全部</option>
                <option value="male">男</option>
                <option value="female">女</option>
              </select>
            </div>
            <div class="field">
              <label class="label">目标年龄段（每行一个，如 30-40）</label>
              <textarea v-model="targetedForm.targetAgeBracketsText" class="textarea" rows="2" />
            </div>
            <div class="field">
              <label class="label">关联商品编号（可选）</label>
              <input v-model="targetedForm.productId" class="input" placeholder="商品编号，如 prd_xxx" />
            </div>
            <p v-if="targetedFormError" class="error">{{ targetedFormError }}</p>
            <p v-if="targetedSuccessHint" class="success">{{ targetedSuccessHint }}</p>
            <div class="modalFooter">
              <button type="button" class="btnSecondary" @click="targetedModalOpen = false">取消</button>
              <button type="button" class="btnPrimary" :disabled="targetedSaving" @click="submitTargeted">
                {{ targetedSaving ? '发布中...' : '发布' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div v-if="modalOpen" class="modalOverlay" @click.self="modalOpen = false">
        <div class="modal" :class="{ mobileSheet: isMobile }">
          <div class="modalHeader">
            <h3 class="modalTitle">发布广告</h3>
            <button type="button" class="modalClose" @click="modalOpen = false">&times;</button>
          </div>
          <div class="modalBody">
            <div class="field">
              <label class="label">标题</label>
              <input v-model="form.title" class="input" maxlength="128" />
            </div>
            <div class="field">
              <label class="label">内容</label>
              <textarea v-model="form.content" class="textarea" rows="5" />
            </div>
            <AdPricingFields
              v-model:duration-days="form.durationDays"
              v-model:payment-method="form.paymentMethod"
              :quote="quote"
              :quote-loading="quoteLoading"
              :free-remaining="freeRemaining"
              :free-enabled="freeEnabled"
              :wechat-payment-enabled="wechatPaymentEnabled"
            />
            <div class="field">
              <label class="label">图片（可选）</label>
              <MediaUploader v-model="form.imageUrls" category="merchant" accept="image" :max="9" />
            </div>
            <div class="field">
              <label class="label">关联商品编号（可选）</label>
              <input v-model="form.productId" class="input" placeholder="商品编号，如 prd_xxx" />
            </div>
            <p v-if="formError" class="error">{{ formError }}</p>
            <p v-if="successHint" class="success">{{ successHint }}</p>
            <div class="modalFooter">
              <button type="button" class="btnSecondary" @click="modalOpen = false">取消</button>
              <button type="button" class="btnPrimary" :disabled="saving" @click="submit">
                {{ saving ? '发布中...' : '发布' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, onMounted, ref, watch } from 'vue'
import { merchantPortalApi, merchantTargetedAdApi } from '../../api/services'
import { ApiError, formatApiError } from '../../api/request'
import type {
  MerchantAdItem,
  MerchantAdQuota,
  MerchantAdQuote,
  MyMerchantDetail
} from '../../api/types'
import {
  FILTER_GENDER,
  getEnumLabel,
  getPhase2ErrorMessage,
  MERCHANT_AD_PAYMENT_METHOD,
  MERCHANT_AD_PAYMENT_METHOD_LABEL,
  MERCHANT_AD_STATUS,
  MERCHANT_AD_STATUS_LABEL
} from '../../constants/enums'
import { isOrderPayUnavailable } from '../../utils/ecommerce'
import { useIsMobile } from '../../composables/useIsMobile'
import MediaUploader from '../../components/MediaUploader.vue'

const { isMobile } = useIsMobile()
const loading = ref(false)
const error = ref('')
const list = ref<MerchantAdItem[]>([])
const quota = ref<MerchantAdQuota | null>(null)
const quoteHint = ref<MerchantAdQuote | null>(null)

const modalOpen = ref(false)
const targetedModalOpen = ref(false)
const saving = ref(false)
const targetedSaving = ref(false)
const formError = ref('')
const targetedFormError = ref('')
const successHint = ref('')
const targetedSuccessHint = ref('')
const merchantId = ref('')
const quote = ref<MerchantAdQuote | null>(null)
const targetedQuote = ref<MerchantAdQuote | null>(null)
const quoteLoading = ref(false)
const targetedQuoteLoading = ref(false)

/**
 * v8.26：微信支付入口是否可用，**只以** quote / quota 的 `wechatPaymentEnabled` 为准。
 * 不要再用商家进件状态推断，也不要写死「暂未开放」。
 *
 * 字段缺失（后端尚未升级到 v8.26）时回退 true：后端默认值就是 true，
 * 此时最多在提交时收到 10002「在线支付未开通」，用户仍可改用免费额度；
 * 若回退 false，会把微信入口直接藏掉，免费额度用尽的商家将完全无法投放。
 */
const wechatPaymentEnabled = computed(() => {
  if (quota.value?.wechatPaymentEnabled != null) return quota.value.wechatPaymentEnabled
  if (quote.value?.wechatPaymentEnabled != null) return quote.value.wechatPaymentEnabled
  if (quoteHint.value?.wechatPaymentEnabled != null) return quoteHint.value.wechatPaymentEnabled
  return true
})

const form = ref({
  title: '',
  content: '',
  imageUrls: [] as string[],
  productId: '',
  durationDays: 7,
  paymentMethod: MERCHANT_AD_PAYMENT_METHOD.FREE
})
const targetedForm = ref({
  title: '',
  content: '',
  targetBuildingsText: '',
  targetGender: FILTER_GENDER.ALL,
  targetAgeBracketsText: '',
  productId: '',
  durationDays: 7,
  paymentMethod: MERCHANT_AD_PAYMENT_METHOD.FREE
})

const freeRemaining = computed(() => {
  if (quota.value?.freeQuotaRemaining != null) return quota.value.freeQuotaRemaining
  if (quote.value?.freeQuotaRemaining != null) return quote.value.freeQuotaRemaining
  if (quota.value?.remainingCount != null) return quota.value.remainingCount
  return 0
})
const freeEnabled = computed(() => {
  if (quota.value?.freeQuotaEnabled === false) return false
  if (quote.value?.freeQuotaEnabled === false) return false
  return true
})

function formatMoney(value?: number) {
  if (value === undefined || value === null) return '0.00'
  return Number(value).toFixed(2)
}

function paymentLabel(method?: string) {
  return getEnumLabel(MERCHANT_AD_PAYMENT_METHOD_LABEL, method, '—')
}

function adStatusLabel(status?: string) {
  if (!status) return '—'
  return getEnumLabel(MERCHANT_AD_STATUS_LABEL, status, status)
}

function adStatusClass(status?: string) {
  if (status === MERCHANT_AD_STATUS.ACTIVE) return 'ok'
  if (status === MERCHANT_AD_STATUS.PENDING_PAYMENT) return 'warn'
  if (status === MERCHANT_AD_STATUS.CANCELLED) return 'muted'
  return ''
}

function isPendingPayment(item: MerchantAdItem) {
  return item.status === MERCHANT_AD_STATUS.PENDING_PAYMENT
}

/**
 * v8.26：可用支付方式只算 free / wechat。
 * 优先免费额度，否则落微信支付；两者都不可用时返回空串，由提交前校验拦住。
 */
function defaultPaymentMethod() {
  if (freeRemaining.value > 0 && freeEnabled.value) return MERCHANT_AD_PAYMENT_METHOD.FREE
  if (wechatPaymentEnabled.value) return MERCHANT_AD_PAYMENT_METHOD.WECHAT
  return ''
}

/** 当前支付方式失效时回退到默认值（不再回退到已下线的物业币） */
function fallbackPaymentMethod(current: string) {
  if (current === MERCHANT_AD_PAYMENT_METHOD.FREE && freeRemaining.value > 0 && freeEnabled.value) {
    return current
  }
  if (current === MERCHANT_AD_PAYMENT_METHOD.WECHAT && wechatPaymentEnabled.value) return current
  return defaultPaymentMethod()
}

function resolveError(e: unknown) {
  if (isOrderPayUnavailable(e)) {
    form.value.paymentMethod = fallbackPaymentMethod(form.value.paymentMethod)
    targetedForm.value.paymentMethod = fallbackPaymentMethod(targetedForm.value.paymentMethod)
  }
  if (e instanceof ApiError) return formatApiError(e, getPhase2ErrorMessage(e.code, e.message))
  if (e instanceof Error) return e.message
  return '操作失败'
}

/** 格式化为创建成功提示；待支付时提示未开始投放 */
function formatSuccess(item: MerchantAdItem) {
  if (isPendingPayment(item)) {
    return '广告已提交，待微信支付完成后开始投放（支付成功前不投放、不占免费额度）。'
  }
  const n = item.recipientCount ?? 0
  const end = item.endDate || '—'
  return `已推送给 ${n} 位住户，投放至 ${end}`
}

const AdPricingFields = defineComponent({
  name: 'AdPricingFields',
  props: {
    durationDays: { type: Number, required: true },
    paymentMethod: { type: String, required: true },
    quote: { type: Object as () => MerchantAdQuote | null, default: null },
    quoteLoading: { type: Boolean, default: false },
    freeRemaining: { type: Number, default: 0 },
    freeEnabled: { type: Boolean, default: true },
    wechatPaymentEnabled: { type: Boolean, default: false }
  },
  emits: ['update:durationDays', 'update:paymentMethod'],
  setup(props, { emit }) {
    const freeDisabled = computed(
      () => !props.freeEnabled || Number(props.freeRemaining) <= 0
    )
    return () =>
      h('div', { class: 'pricingBlock' }, [
        h('div', { class: 'field' }, [
          h('label', { class: 'label' }, '展示天数（1~30）'),
          h('input', {
            class: 'input',
            type: 'number',
            min: 1,
            max: 30,
            value: props.durationDays,
            onInput: (e: Event) => {
              const v = Number((e.target as HTMLInputElement).value)
              emit('update:durationDays', Number.isFinite(v) ? v : 1)
            }
          })
        ]),
        h('div', { class: 'quoteBox' }, [
          props.quoteLoading
            ? h('span', '计价中...')
            : props.quote
              ? h('span', [
                  `单日价 ¥${formatMoney(props.quote.dayPrice)} × ${props.quote.durationDays} 天 = `,
                  h('strong', `¥${formatMoney(props.quote.payAmount)}`)
                ])
              : h('span', { class: 'hint' }, '请选择天数后自动计价')
        ]),
        h('div', { class: 'field' }, [
          h('label', { class: 'label' }, '支付方式'),
          /** v8.26：coin / point / mock 已下线，只保留免费额度与微信支付 */
          h(
            'div',
            { class: 'payOptions' },
            [
              {
                value: MERCHANT_AD_PAYMENT_METHOD.FREE,
                label: `免费额度（剩 ${props.freeRemaining}）`,
                disabled: freeDisabled.value
              },
              {
                value: MERCHANT_AD_PAYMENT_METHOD.WECHAT,
                label: '微信支付',
                disabled: !props.wechatPaymentEnabled
              }
            ].map((opt) =>
              h('label', { class: ['payOption', opt.disabled ? 'disabled' : ''] }, [
                h('input', {
                  type: 'radio',
                  name: 'ad-pay',
                  value: opt.value,
                  checked: props.paymentMethod === opt.value,
                  disabled: opt.disabled,
                  onChange: () => {
                    if (!opt.disabled) emit('update:paymentMethod', opt.value)
                  }
                }),
                h('span', opt.label)
              ])
            )
          ),
          freeDisabled.value && !props.wechatPaymentEnabled
            ? h('p', { class: 'hint warn' }, '免费额度已用尽或已关闭，且微信支付当前不可用。请联系平台开通微信支付后再投放。')
            : freeDisabled.value
              ? h('p', { class: 'hint warn' }, '免费额度已用尽或已关闭，请选择微信支付')
              : !props.wechatPaymentEnabled
                ? h('p', { class: 'hint' }, '微信支付当前不可用，仅可使用免费额度')
                : null
        ])
      ])
  }
})

async function fetchQuote(days: number, target: 'normal' | 'targeted') {
  const safeDays = Math.min(30, Math.max(1, Math.floor(Number(days) || 1)))
  if (target === 'normal') quoteLoading.value = true
  else targetedQuoteLoading.value = true
  try {
    const res = await merchantPortalApi.adQuote(safeDays)
    if (target === 'normal') {
      quote.value = res
      quoteHint.value = res
    } else {
      targetedQuote.value = res
      quoteHint.value = res
    }
  } catch (e) {
    console.error(e)
    if (target === 'normal') quote.value = null
    else targetedQuote.value = null
  } finally {
    if (target === 'normal') quoteLoading.value = false
    else targetedQuoteLoading.value = false
  }
}

watch(
  () => form.value.durationDays,
  (days) => {
    if (modalOpen.value) void fetchQuote(days, 'normal')
  }
)
watch(
  () => targetedForm.value.durationDays,
  (days) => {
    if (targetedModalOpen.value) void fetchQuote(days, 'targeted')
  }
)
watch(freeRemaining, () => {
  form.value.paymentMethod = fallbackPaymentMethod(form.value.paymentMethod)
  targetedForm.value.paymentMethod = fallbackPaymentMethod(targetedForm.value.paymentMethod)
})
watch(wechatPaymentEnabled, () => {
  form.value.paymentMethod = fallbackPaymentMethod(form.value.paymentMethod)
  targetedForm.value.paymentMethod = fallbackPaymentMethod(targetedForm.value.paymentMethod)
})

async function loadQuota() {
  try {
    quota.value = await merchantPortalApi.adQuota()
  } catch (e) {
    console.error(e)
  }
}

async function loadMerchantId() {
  try {
    const detail: MyMerchantDetail = await merchantPortalApi.my()
    merchantId.value = detail.id
  } catch (e) {
    console.error(e)
  }
}

async function loadList() {
  loading.value = true
  error.value = ''
  try {
    const res = await merchantPortalApi.ads({ page: 1, pageSize: 50 })
    list.value = res.list || []
  } catch (e) {
    error.value = resolveError(e)
    list.value = []
  } finally {
    loading.value = false
  }
}

function openCreate() {
  form.value = {
    title: '',
    content: '',
    imageUrls: [],
    productId: '',
    durationDays: 7,
    paymentMethod: defaultPaymentMethod()
  }
  formError.value = ''
  successHint.value = ''
  modalOpen.value = true
  void fetchQuote(7, 'normal')
}

function openTargetedCreate() {
  targetedForm.value = {
    title: '',
    content: '',
    targetBuildingsText: '',
    targetGender: FILTER_GENDER.ALL,
    targetAgeBracketsText: '',
    productId: '',
    durationDays: 7,
    paymentMethod: defaultPaymentMethod()
  }
  targetedFormError.value = ''
  targetedSuccessHint.value = ''
  targetedModalOpen.value = true
  void fetchQuote(7, 'targeted')
}

function validateDays(days: number) {
  return Number.isInteger(days) && days >= 1 && days <= 30
}

async function submitTargeted() {
  if (!targetedForm.value.title.trim() || !targetedForm.value.content.trim()) {
    targetedFormError.value = '请填写标题和内容'
    return
  }
  if (!validateDays(targetedForm.value.durationDays)) {
    targetedFormError.value = '展示天数须为 1~30 的整数'
    return
  }
  if (!merchantId.value) {
    targetedFormError.value = '未获取到商家信息'
    return
  }
  if (
    targetedForm.value.paymentMethod === MERCHANT_AD_PAYMENT_METHOD.FREE &&
    (freeRemaining.value <= 0 || !freeEnabled.value)
  ) {
    targetedFormError.value = '本周免费额度已用完，请选择微信支付'
    return
  }
  if (!targetedForm.value.paymentMethod) {
    targetedFormError.value = '免费额度已用尽且微信支付不可用，暂时无法投放，请联系平台开通'
    return
  }
  if (
    targetedForm.value.paymentMethod === MERCHANT_AD_PAYMENT_METHOD.WECHAT &&
    !wechatPaymentEnabled.value
  ) {
    targetedFormError.value = '微信支付当前不可用，请改用免费额度或联系平台开通'
    return
  }
  targetedSaving.value = true
  targetedFormError.value = ''
  targetedSuccessHint.value = ''
  try {
    const targetBuildings = targetedForm.value.targetBuildingsText
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean)
    const targetAgeBrackets = targetedForm.value.targetAgeBracketsText
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean)
    const created = await merchantTargetedAdApi.create({
      merchantId: merchantId.value,
      title: targetedForm.value.title.trim(),
      content: targetedForm.value.content.trim(),
      targetBuildings: targetBuildings.length ? targetBuildings : undefined,
      targetGender: targetedForm.value.targetGender || undefined,
      targetAgeBrackets: targetAgeBrackets.length ? targetAgeBrackets : undefined,
      productId: targetedForm.value.productId.trim() || undefined,
      durationDays: targetedForm.value.durationDays,
      paymentMethod: targetedForm.value.paymentMethod
    })
    targetedSuccessHint.value = formatSuccess(created)
    await Promise.all([loadList(), loadQuota()])
    setTimeout(() => {
      targetedModalOpen.value = false
    }, 1200)
  } catch (e) {
    targetedFormError.value = resolveError(e)
  } finally {
    targetedSaving.value = false
  }
}

async function submit() {
  if (!form.value.title.trim() || !form.value.content.trim()) {
    formError.value = '请填写标题和内容'
    return
  }
  if (!validateDays(form.value.durationDays)) {
    formError.value = '展示天数须为 1~30 的整数'
    return
  }
  if (
    form.value.paymentMethod === MERCHANT_AD_PAYMENT_METHOD.FREE &&
    (freeRemaining.value <= 0 || !freeEnabled.value)
  ) {
    formError.value = '本周免费额度已用完，请选择微信支付'
    return
  }
  if (!form.value.paymentMethod) {
    formError.value = '免费额度已用尽且微信支付不可用，暂时无法投放，请联系平台开通'
    return
  }
  if (
    form.value.paymentMethod === MERCHANT_AD_PAYMENT_METHOD.WECHAT &&
    !wechatPaymentEnabled.value
  ) {
    formError.value = '微信支付当前不可用，请改用免费额度或联系平台开通'
    return
  }
  const imageUrls = form.value.imageUrls.filter(Boolean)
  saving.value = true
  formError.value = ''
  successHint.value = ''
  try {
    const created = await merchantPortalApi.createAd({
      title: form.value.title.trim(),
      content: form.value.content.trim(),
      imageUrls: imageUrls.length ? imageUrls : undefined,
      productId: form.value.productId.trim() || undefined,
      durationDays: form.value.durationDays,
      paymentMethod: form.value.paymentMethod
    })
    successHint.value = formatSuccess(created)
    await Promise.all([loadList(), loadQuota()])
    setTimeout(() => {
      modalOpen.value = false
    }, 1200)
  } catch (e) {
    formError.value = resolveError(e)
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  await Promise.all([
    loadMerchantId(),
    loadQuota(),
    loadList(),
    fetchQuote(7, 'normal')
  ])
})
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  flex-wrap: wrap;
}
.headerActions { display: flex; gap: 8px; flex-wrap: wrap; }
.title {
  margin: 0;
  font-size: 22px;
}
.desc {
  margin: 6px 0 0;
  color: #8c8c9a;
  font-size: 13px;
}
.quotaCard {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  background: #f5f7ff;
  border-radius: 10px;
  padding: 12px 16px;
  font-size: 13px;
}
.panel {
  background: #fff;
  border: 1px solid #ececf2;
  border-radius: 12px;
  padding: 16px;
}
.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.table th,
.table td {
  border-bottom: 1px solid #f0f0f5;
  padding: 10px 6px;
  text-align: left;
}
.hint {
  color: #8c8c9a;
}
.hint.warn { color: #d48806; }
/* v8.26 广告状态标签：pending_payment 待支付 / active 投放中 / cancelled 已取消 */
.statusDot {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
  background: #f2f3f7;
  color: #5c5c6b;
  white-space: nowrap;
}
.statusDot.ok { background: #e7f7ed; color: #15803d; }
.statusDot.warn { background: #fff7e6; color: #d48806; }
.statusDot.muted { background: #f2f3f7; color: #9a9aa8; }
.pendingHint {
  margin: 4px 0;
  font-size: 12px;
  color: #d48806;
}
.error {
  color: #d14343;
  font-size: 13px;
}
.success {
  color: #15803d;
  font-size: 13px;
}
.btnPrimary {
  padding: 10px 18px;
  border-radius: 8px;
  border: none;
  background: #5c5c9e;
  color: #ffffff;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
}
.btnPrimary:hover { background: #52529a; }
.btnPrimary:disabled { opacity: 0.6; cursor: not-allowed; }
.btnSecondary {
  padding: 10px 18px;
  border-radius: 8px;
  border: 1px solid #e8e8ec;
  background: #ffffff;
  color: #5c5c66;
  font-size: 14px;
  cursor: pointer;
}
.btnSecondary:hover { border-color: #5c5c9e; color: #5c5c9e; }
.modalOverlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}
.modal {
  background: #fff;
  border-radius: 12px;
  width: min(560px, 100%);
}
.modalHeader {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  border-bottom: 1px solid #eee;
}
.modalTitle {
  margin: 0;
}
.modalClose {
  border: none;
  background: transparent;
  font-size: 22px;
  cursor: pointer;
}
.modalBody {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 80vh;
  overflow-y: auto;
}
.modalFooter {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.label {
  font-size: 13px;
  color: #666;
}
.input,
.textarea {
  border: 1px solid #e8e8ec;
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 14px;
  color: #1f1f2e;
  background: #ffffff;
  outline: none;
}
.input:focus,
.textarea:focus { border-color: #5c5c9e; }
:deep(.pricingBlock) { display: flex; flex-direction: column; gap: 12px; }
:deep(.pricingBlock .field) {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
:deep(.pricingBlock .label) {
  font-size: 13px;
  color: #666;
}
:deep(.pricingBlock .input) {
  border: 1px solid #e8e8ec;
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 14px;
  color: #1f1f2e;
  background: #ffffff;
  outline: none;
}
:deep(.quoteBox) {
  background: #f8f8fc;
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 13px;
}
:deep(.payOptions) { display: flex; flex-direction: column; gap: 8px; }
:deep(.payOption) {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  cursor: pointer;
}
:deep(.payOption.disabled) { opacity: 0.5; cursor: not-allowed; }
:deep(.hint) { color: #8c8c9a; }
:deep(.hint.warn) { color: #d48806; }
.mobileList { display: flex; flex-direction: column; gap: 12px; }
.mobileCard { border: 1px solid #ececf2; border-radius: 10px; padding: 14px; }
.mobileCardHead { display: flex; justify-content: space-between; gap: 12px; }
.mobileCard p { margin: 10px 0; line-height: 1.5; color: #5c5c66; }
.mobileCard small { color: #8c8c9a; }
.mobileSheet { max-width: 100%; border-radius: 18px 18px 0 0; margin-top: auto; }
@media (max-width: 640px) {
  .header { flex-direction: column; gap: 12px; }
  .header .btnPrimary { width: 100%; min-height: 44px; }
  .quotaCard { display: grid; gap: 8px; padding: 12px; }
  .panel { padding: 14px; }
  .modalOverlay { align-items: flex-end; padding: 0; }
  .modal { width: 100%; max-height: 92vh; overflow-y: auto; }
  .modalFooter { flex-direction: column-reverse; }
  .modalFooter .btnSecondary, .modalFooter .btnPrimary { width: 100%; min-height: 44px; }
}
</style>
