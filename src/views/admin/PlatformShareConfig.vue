<template>
  <div class="page">
    <div class="header">
      <div>
        <h1 class="title">平台分成配置</h1>
        <p class="desc">
          平台管理员保留：平台盘三档比例、配送费抽成、提现手续费分成。
          真实份额以「分成明细 / 分成统计」为准（账面待结算）；通道直分（CBK）未接入，勿承诺「付款即到账」。
        </p>
      </div>
      <button class="btnPrimary" :disabled="loading || saving || !canEdit" @click="handleSave">
        {{ saving ? '保存中...' : '保存配置' }}
      </button>
    </div>

    <p v-if="loadError" class="bannerError">{{ loadError }}</p>
    <p v-if="saveError" class="bannerError">{{ saveError }}</p>
    <p v-if="saveSuccess" class="bannerSuccess">{{ saveSuccess }}</p>

    <div v-if="loading" class="loadingText">加载中...</div>
    <template v-else>
      <div v-if="isPlatformAdmin" class="field propertySelect">
        <label class="label">选择物业公司</label>
        <select v-model="selectedPropertyId" class="input" @change="loadRates">
          <option value="">请选择物业公司</option>
          <option v-for="pc in propertyCompanies" :key="pc.id" :value="pc.id">{{ pc.name }}</option>
        </select>
      </div>

      <div v-if="!canEdit && !isPlatformAdmin" class="hint">仅平台管理员可修改平台分成比例</div>

      <div class="flowCard">
        <div class="cardHead">现网分账口径（B 方案）</div>
        <ol class="flowSteps">
          <li>
            <strong>订单实付</strong> = 商品价格 + 配送费（用户实付口径 <code>totalAmount</code>）
          </li>
          <li>
            <strong>商品价线</strong>：按商家抽佣 <code>commissionRate</code> 拆成
            <em>商家实得</em> 与 <em>平台盘</em>
            （平台盘 ≈ 商品价 × 抽佣 − 积分/物业币成本 = <code>distributableAmount</code>）
          </li>
          <li>
            <strong>平台盘二次分</strong>（本页 + 参数页）：
            <em>我们公司 / 物业 / 管理（统筹→板块→个体）</em>；配送员<strong>不参与</strong>平台盘
          </li>
          <li>
            <strong>配送费线</strong>：仅 <em>我们公司</em> 与 <em>配送员</em> 分；
            平台抽 <code>platformDeliveryShareRate</code>，余额归配送员（无保底）
          </li>
        </ol>
        <p class="flowNote">
          骑手收入与分成明细 <code>courierShare</code> / 任务 <code>courierEarning</code> 合轨，来源是配送费而非平台盘。
        </p>
      </div>

      <p v-if="suggestOurCompany" class="bannerWarn">
        当前「我们公司」为 0%。按 B 方案默认建议设为 10%（占平台盘）。
        <button v-if="canEdit" type="button" class="linkBtn" @click="applyRecommendedOurCompany">应用推荐 10%</button>
      </p>
      <p v-if="poolRateWarn" class="bannerWarn">{{ poolRateWarn }}</p>

      <div class="grid">
        <div class="card">
          <div class="cardHead">我们公司（平台盘内）</div>
          <p class="cardDesc">
            落库 <code>platformShareRate</code>：平台盘三档之一（默认约 10%）。与配送费抽成是两条线。
          </p>
          <div class="inputWrap">
            <input
              v-model.number="form.platformSharePercent"
              type="number"
              min="0"
              max="100"
              step="0.1"
              class="input"
              :disabled="!canEdit"
            />
            <span class="unit">%</span>
          </div>
        </div>
        <div class="card">
          <div class="cardHead">平台配送费抽成（我们公司）</div>
          <p class="cardDesc">
            落库 <code>platformDeliveryShareRate</code>：从用户付的<strong>配送费</strong>中抽给我们公司，
            默认 10%；余额归配送员。物业 / 统筹 / 板块 / 个体不参与配送费分账。
          </p>
          <div class="inputWrap">
            <input
              v-model.number="form.platformDeliverySharePercent"
              type="number"
              min="0"
              max="100"
              step="0.1"
              class="input"
              :disabled="!canEdit"
            />
            <span class="unit">%</span>
          </div>
        </div>
        <div class="card">
          <div class="cardHead">提现手续费分成</div>
          <p class="cardDesc">独立链路：平台从提现手续费中抽取的比例，默认 100%。不参与订单两层分账。</p>
          <div class="inputWrap">
            <input
              v-model.number="form.platformWithdrawalFeeSharePercent"
              type="number"
              min="0"
              max="100"
              step="0.1"
              class="input"
              :disabled="!canEdit"
            />
            <span class="unit">%</span>
          </div>
        </div>
      </div>

      <div class="card reference">
        <div class="cardHead">平台盘三档 + 管理内拆分（只读物业侧）</div>
        <div class="refGrid">
          <div><span class="refLabel">我们公司</span><strong>{{ formatPercent(percentToRate(form.platformSharePercent)) }}</strong></div>
          <div><span class="refLabel">物业</span><strong>{{ formatPercent(rates.propertyShareRate) }}</strong></div>
          <div><span class="refLabel">管理/统筹盘</span><strong>{{ formatPercent(rates.coordinatorShareRate) }}</strong></div>
          <div><span class="refLabel">板块负责人（抽管理盘）</span><strong>{{ formatPercent(rates.sectorLeaderRate) }}</strong></div>
          <div><span class="refLabel">个体负责人（抽板块）</span><strong>{{ formatPercent(rates.individualLeaderRate) }}</strong></div>
          <div>
            <span class="refLabel">配送（B·配送费）</span>
            <strong>
              公司 {{ formatPercent(percentToRate(form.platformDeliverySharePercent)) }} ·
              骑手 {{ formatPercent(1 - percentToRate(form.platformDeliverySharePercent)) }}
            </strong>
          </div>
        </div>
        <p class="note">
          B 方案：平台盘三档（我们公司 + 物业 + 管理）之和应为 100%。
          管理盘内部默认 统筹:板块:个体 = 4:3:3（级联字段 sector=60%、individual=50%）。
          物业侧比例请在「参数配置 → 分账」查看（仅平台管理员可改）。
        </p>
        <div class="preview">
          <div class="previewTitle">示意：平台盘 100 元 + 配送费 1 元</div>
          <div class="refGrid previewSeven">
            <div><span class="refLabel">我们公司（盘内）</span><strong>¥{{ formatMoney(poolPreview.ourCompany) }}</strong></div>
            <div><span class="refLabel">物业</span><strong>¥{{ formatMoney(poolPreview.property) }}</strong></div>
            <div><span class="refLabel">管理盘</span><strong>¥{{ formatMoney(poolPreview.management) }}</strong></div>
            <div><span class="refLabel">统筹实得</span><strong>¥{{ formatMoney(poolPreview.coordinatorNet) }}</strong></div>
            <div><span class="refLabel">板块</span><strong>¥{{ formatMoney(poolPreview.sector) }}</strong></div>
            <div><span class="refLabel">个体</span><strong>¥{{ formatMoney(poolPreview.individual) }}</strong></div>
            <div>
              <span class="refLabel">配送费·公司</span>
              <strong>¥{{ formatMoney(deliveryPreview.platform) }}</strong>
            </div>
            <div>
              <span class="refLabel">配送费·配送员</span>
              <strong>¥{{ formatMoney(deliveryPreview.courier) }}</strong>
            </div>
          </div>
          <p class="previewHint">
            平台盘示意与配送费示意是两条独立账；实际合轨以分成明细为准。
          </p>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { platformShareApi, propertyCompanyApi } from '../../api/services'
import type { PlatformShareRates, PropertyCompanyItem } from '../../api/types'
import { ApiError } from '../../api/request'
import { rateToFormPercent } from '../../api/mappers'
import { useAuthStore } from '../../stores/auth'
import { USER_ROLE } from '../../constants/enums'
import {
  DEFAULT_PLATFORM_DELIVERY_SHARE_RATE,
  calcCourierEarningFromDeliveryFee,
  calcPlatformDeliveryShare
} from '../../constants/courierEarning'

const OUR_COMPANY_RECOMMENDED_PERCENT = 10

const auth = useAuthStore()
const isPlatformAdmin = computed(() => auth.profile?.role === USER_ROLE.PLATFORM_ADMIN)
const canEdit = computed(() => isPlatformAdmin.value)

const loading = ref(true)
const saving = ref(false)
const loadError = ref('')
const saveError = ref('')
const saveSuccess = ref('')

const propertyCompanies = ref<PropertyCompanyItem[]>([])
const selectedPropertyId = ref('')
const rates = reactive<PlatformShareRates>({})

const form = reactive({
  platformSharePercent: 0,
  platformDeliverySharePercent: rateToFormPercent(DEFAULT_PLATFORM_DELIVERY_SHARE_RATE),
  platformWithdrawalFeeSharePercent: 100
})

const suggestOurCompany = computed(() => {
  const current = Number(form.platformSharePercent) || 0
  return current < 0.0001
})

const poolRateWarn = computed(() => {
  const our = percentToRate(Number(form.platformSharePercent) || 0)
  const property = Number(rates.propertyShareRate ?? 0)
  const management = Number(rates.coordinatorShareRate ?? 0)
  const sum = our + property + management
  if (sum < 0.0001) return ''
  if (Math.abs(sum - 1) > 0.005) {
    return `当前平台盘三档合计 ${(sum * 100).toFixed(2)}%，B 方案要求约为 100%（我们公司 + 物业 + 管理）。`
  }
  return ''
})

/** B：平台盘三档并行；管理盘内级联 */
const poolPreview = computed(() => {
  const total = 100
  const ourCompany = total * percentToRate(Number(form.platformSharePercent) || 0)
  const property = total * Number(rates.propertyShareRate ?? 0)
  const management = total * Number(rates.coordinatorShareRate ?? 0)
  const sectorRate = Number(rates.sectorLeaderRate ?? 0)
  const individualRate = Number(rates.individualLeaderRate ?? 0)
  const sectorGross = management * sectorRate
  const individual = sectorGross * individualRate
  const sector = sectorGross - individual
  const coordinatorNet = management - sectorGross
  return { ourCompany, property, management, sector, individual, coordinatorNet }
})

const deliveryPreview = computed(() => {
  const fee = 1
  const rate = percentToRate(Number(form.platformDeliverySharePercent) || 0)
  return {
    platform: calcPlatformDeliveryShare(fee, rate) ?? 0,
    courier: calcCourierEarningFromDeliveryFee(fee, rate) ?? 0
  }
})

function formatPercent(rate?: number) {
  if (rate === undefined || rate === null) return '—'
  return `${(rate * 100).toFixed(2)}%`
}

function formatMoney(n: number) {
  return (Math.round(n * 100) / 100).toFixed(2)
}

function percentToRate(percent: number) {
  return Math.min(Math.max(percent / 100, 0), 1)
}

function applyRecommendedOurCompany() {
  form.platformSharePercent = OUR_COMPANY_RECOMMENDED_PERCENT
}

function applyRates(data: PlatformShareRates) {
  Object.assign(rates, data)
  form.platformSharePercent = rateToFormPercent(data.platformShareRate ?? 0)
  form.platformDeliverySharePercent = rateToFormPercent(
    data.platformDeliveryShareRate ?? DEFAULT_PLATFORM_DELIVERY_SHARE_RATE
  )
  form.platformWithdrawalFeeSharePercent = rateToFormPercent(data.platformWithdrawalFeeShareRate ?? 1)
}

async function loadPropertyCompanies() {
  if (!isPlatformAdmin.value) return
  try {
    const res = await propertyCompanyApi.list({ pageSize: 100 })
    propertyCompanies.value = res.list || []
  } catch (e) {
    console.error(e)
  }
}

async function loadRates() {
  const propertyCompanyId = isPlatformAdmin.value
    ? selectedPropertyId.value || undefined
    : auth.propertyCompanyId || undefined

  if (!propertyCompanyId) {
    loading.value = false
    return
  }

  loading.value = true
  loadError.value = ''
  try {
    const data = await platformShareApi.getRates(propertyCompanyId)
    applyRates(data)
  } catch (e) {
    loadError.value = e instanceof ApiError ? e.message : '加载失败'
  } finally {
    loading.value = false
  }
}

async function handleSave() {
  const propertyCompanyId = isPlatformAdmin.value
    ? selectedPropertyId.value
    : auth.propertyCompanyId

  if (!propertyCompanyId) {
    saveError.value = '请选择物业公司'
    return
  }

  saving.value = true
  saveError.value = ''
  saveSuccess.value = ''
  try {
    const data = await platformShareApi.updateRates({
      propertyCompanyId,
      platformShareRate: percentToRate(form.platformSharePercent),
      platformDeliveryShareRate: percentToRate(form.platformDeliverySharePercent),
      platformWithdrawalFeeShareRate: percentToRate(form.platformWithdrawalFeeSharePercent)
    })
    applyRates(data)
    saveSuccess.value = '配置已保存'
  } catch (e) {
    saveError.value = e instanceof ApiError ? e.message : '保存失败'
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  if (isPlatformAdmin.value) {
    await loadPropertyCompanies()
    if (auth.propertyCompanyId) selectedPropertyId.value = auth.propertyCompanyId
  } else {
    selectedPropertyId.value = auth.propertyCompanyId || ''
  }
  await loadRates()
})
</script>

<style scoped>
.page { max-width: 960px; }
.header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 24px; gap: 16px; flex-wrap: wrap; }
.title { font-size: 24px; font-weight: 600; color: #1f1f2e; margin-bottom: 8px; }
.desc { font-size: 14px; color: #8c8c9a; max-width: 640px; }
.bannerError { font-size: 13px; color: #e05c5c; margin-bottom: 12px; }
.bannerSuccess { font-size: 13px; color: #3aaf7d; margin-bottom: 12px; }
.bannerWarn {
  font-size: 13px;
  color: #92400e;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 8px;
  padding: 10px 14px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.linkBtn {
  border: none;
  background: transparent;
  color: #5c5c9e;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
}
.loadingText, .hint { text-align: center; color: #8c8c9a; padding: 32px 0; }
.propertySelect { margin-bottom: 20px; }
.label { display: block; font-size: 14px; color: #5c5c66; margin-bottom: 8px; }
.input { width: 100%; max-width: 320px; padding: 10px 14px; border: 1px solid #e8e8ec; border-radius: 8px; font-size: 14px; }
.flowCard {
  background: #f7f8fc;
  border: 1px solid #e8e8ec;
  border-radius: 12px;
  padding: 20px 24px;
  margin-bottom: 20px;
}
.flowSteps {
  margin: 10px 0 0;
  padding-left: 20px;
  font-size: 13.5px;
  color: #3a3a48;
  line-height: 1.7;
}
.flowSteps code { font-size: 12px; background: #eef1f6; padding: 1px 5px; border-radius: 4px; }
.flowSteps em { font-style: normal; font-weight: 600; color: #5c5c9e; }
.flowNote { margin: 12px 0 0; font-size: 12.5px; color: #8a6d1d; line-height: 1.55; }
.grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 20px; }
.card { background: #fff; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.cardHead { font-size: 15px; font-weight: 600; color: #1f1f2e; margin-bottom: 8px; }
.cardDesc { font-size: 13px; color: #8c8c9a; margin-bottom: 16px; line-height: 1.5; }
.cardDesc code { font-size: 12px; background: #eef1f6; padding: 1px 5px; border-radius: 4px; }
.inputWrap { display: flex; align-items: center; border: 1px solid #e8e8ec; border-radius: 8px; padding: 0 12px; height: 40px; background: #fff; }
.inputWrap .input { border: none; max-width: none; padding: 0; }
.unit { font-size: 13px; color: #8c8c9a; margin-left: 8px; }
.reference { margin-top: 0; }
.refGrid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 12px; }
.previewSeven { grid-template-columns: repeat(3, 1fr); }
.refLabel { display: block; font-size: 12px; color: #8c8c9a; margin-bottom: 4px; }
.note { font-size: 12px; color: #8c8c9a; line-height: 1.55; }
.preview { margin-top: 16px; padding-top: 16px; border-top: 1px solid #f0f0f3; }
.previewTitle { margin-bottom: 12px; font-size: 13px; font-weight: 600; color: #5c5c66; }
.previewHint { margin: 10px 0 0; font-size: 12px; color: #8a6d1d; line-height: 1.5; }
.btnPrimary { padding: 10px 20px; border-radius: 8px; background: #5c5c9e; color: #fff; border: none; cursor: pointer; }
.btnPrimary:disabled { opacity: 0.6; cursor: not-allowed; }
@media (max-width: 900px) { .grid, .refGrid, .previewSeven { grid-template-columns: 1fr; } }
</style>
