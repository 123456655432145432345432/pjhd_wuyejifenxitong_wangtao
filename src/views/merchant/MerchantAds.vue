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
          <small>
            {{ item.startDate || '—' }} ~ {{ item.endDate || '—' }}
            · {{ item.durationDays ?? '—' }} 天
            · ¥{{ formatMoney(item.payAmount) }}
            · 推送 {{ item.recipientCount ?? 0 }} 人
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
              :point-balance="pointBalance"
              :coin-balance="coinBalance"
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
              <label class="label">关联商品 ID（可选）</label>
              <input v-model="targetedForm.productId" class="input" placeholder="prd_xxx" />
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
              :point-balance="pointBalance"
              :coin-balance="coinBalance"
            />
            <div class="field">
              <label class="label">图片（可选）</label>
              <MediaUploader v-model="form.imageUrls" category="merchant" accept="image" :max="9" />
            </div>
            <div class="field">
              <label class="label">关联商品 ID（可选）</label>
              <input v-model="form.productId" class="input" placeholder="prd_xxx" />
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
import { ApiError } from '../../api/request'
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
  MERCHANT_AUDIT_STATUS
} from '../../constants/enums'
import { useIsMobile } from '../../composables/useIsMobile'
import { useAuthStore } from '../../stores/auth'
import MediaUploader from '../../components/MediaUploader.vue'

const { isMobile } = useIsMobile()
const auth = useAuthStore()
const loading = ref(false)
const error = ref('')
const list = ref<MerchantAdItem[]>([])
const quota = ref<MerchantAdQuota | null>(null)
const quoteHint = ref<MerchantAdQuote | null>(null)
const pointBalance = ref(0)
const coinBalance = computed(() => Number(auth.profile?.coinBalance ?? 0))

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

const form = ref({
  title: '',
  content: '',
  imageUrls: [] as string[],
  productId: '',
  durationDays: 7,
  paymentMethod: MERCHANT_AD_PAYMENT_METHOD.COIN
})
const targetedForm = ref({
  title: '',
  content: '',
  targetBuildingsText: '',
  targetGender: FILTER_GENDER.ALL,
  targetAgeBracketsText: '',
  productId: '',
  durationDays: 7,
  paymentMethod: MERCHANT_AD_PAYMENT_METHOD.COIN
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
  return getEnumLabel(MERCHANT_AD_PAYMENT_METHOD_LABEL, method, method || '—')
}

function resolveError(e: unknown) {
  if (e instanceof ApiError) return getPhase2ErrorMessage(e.code, e.message)
  if (e instanceof Error) return e.message
  return '操作失败'
}

function formatSuccess(item: MerchantAdItem) {
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
    pointBalance: { type: Number, default: 0 },
    coinBalance: { type: Number, default: 0 }
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
                value: MERCHANT_AD_PAYMENT_METHOD.COIN,
                label: `物业币（余额 ¥${formatMoney(props.coinBalance)}）`
              },
              {
                value: MERCHANT_AD_PAYMENT_METHOD.POINT,
                label: `商家积分（余额 ${props.pointBalance}）`
              },
              { value: MERCHANT_AD_PAYMENT_METHOD.WECHAT, label: '微信支付（模拟）' },
              { value: MERCHANT_AD_PAYMENT_METHOD.MOCK, label: '模拟支付' }
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
          freeDisabled.value
            ? h('p', { class: 'hint warn' }, '免费额度已用尽或已关闭，请选择付费投放')
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
watch(freeRemaining, (n) => {
  if (n <= 0 || !freeEnabled.value) {
    if (form.value.paymentMethod === MERCHANT_AD_PAYMENT_METHOD.FREE) {
      form.value.paymentMethod = MERCHANT_AD_PAYMENT_METHOD.COIN
    }
    if (targetedForm.value.paymentMethod === MERCHANT_AD_PAYMENT_METHOD.FREE) {
      targetedForm.value.paymentMethod = MERCHANT_AD_PAYMENT_METHOD.COIN
    }
  }
})

async function loadQuota() {
  try {
    quota.value = await merchantPortalApi.adQuota()
  } catch (e) {
    console.error(e)
  }
}

async function loadPointBalance() {
  try {
    const res = await merchantPortalApi.pointPurchases({
      page: 1,
      pageSize: 100,
      auditStatus: MERCHANT_AUDIT_STATUS.APPROVED
    })
    pointBalance.value = (res.list || []).reduce(
      (sum, item) => sum + (item.remainingPoints ?? 0),
      0
    )
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
    paymentMethod:
      freeRemaining.value > 0 && freeEnabled.value
        ? MERCHANT_AD_PAYMENT_METHOD.FREE
        : MERCHANT_AD_PAYMENT_METHOD.COIN
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
    paymentMethod:
      freeRemaining.value > 0 && freeEnabled.value
        ? MERCHANT_AD_PAYMENT_METHOD.FREE
        : MERCHANT_AD_PAYMENT_METHOD.COIN
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
    targetedFormError.value = '本周免费额度已用完，请选择付费投放'
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
    await Promise.all([loadList(), loadQuota(), loadPointBalance()])
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
    formError.value = '本周免费额度已用完，请选择付费投放'
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
    await Promise.all([loadList(), loadQuota(), loadPointBalance()])
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
  await Promise.all([loadMerchantId(), loadQuota(), loadList(), loadPointBalance(), fetchQuote(7, 'normal')])
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
