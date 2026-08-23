<template>
  <div class="page">
    <div class="header">
      <div>
        <h1 class="title">平台分成配置</h1>
        <p class="desc">
          配置订单收益、配送费和提现手续费在各参与方之间的分配比例。
          订单完成后，平台收益由微信支付分账结算；入账结果请到「平台收益」查看。
        </p>
      </div>
      <button class="btnPrimary" :disabled="loading || saving || !canEdit || Boolean(poolRateWarn)" @click="handleSave">
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
        <div class="cardHead">订单收益分配说明</div>
        <ol class="flowSteps">
          <li>
            <strong>用户实付金额</strong>由商品金额和配送费组成。
          </li>
          <li>
            <strong>商品金额</strong>先按商家抽佣比例分为商家收入和平台可分配收益；
            积分或物业币抵扣成本会从平台可分配收益中扣除，不足部分由积分池承担。
          </li>
          <li>
            <strong>平台可分配收益</strong>再分给我们公司、物业和管理团队
            （统筹、板块、个体）；配送员不参与这部分分配。
          </li>
          <li>
            <strong>配送结算基数</strong>仅在我们公司和配送员之间分配；满额减免时由明确承担方补贴，配送员收入不会随用户配送费归零。
          </li>
        </ol>
        <p class="flowNote">
          配送员的单笔收入以配送任务结算结果为准，累计可提现金额以配送员钱包余额为准。
        </p>
      </div>

      <p v-if="suggestOurCompany" class="bannerWarn">
        当前「我们公司」分配比例为 0%，建议确认是否符合实际经营规则。
        <button v-if="canEdit" type="button" class="linkBtn" @click="applyRecommendedOurCompany">应用推荐 10%</button>
      </p>
      <p v-if="poolRateWarn" class="bannerWarn">{{ poolRateWarn }}</p>

      <div class="grid">
        <div class="card">
          <div class="cardHead">我们公司（平台可分配收益）</div>
          <p class="cardDesc">
            从平台可分配收益中划给我们公司的比例；与配送费分配相互独立。
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
          <div class="cardHead">配送结算基数抽成（我们公司）</div>
          <p class="cardDesc">
            从配送结算基数中划给我们公司的比例，剩余部分归配送员；
            物业、统筹、板块和个体负责人不参与配送费分配。
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
          <p class="cardDesc">平台从提现手续费中获得的比例；该比例不影响订单收益或配送费分配。</p>
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
        <div class="cardHead">平台收益与管理团队分配明细</div>
        <div class="refGrid">
          <div><span class="refLabel">我们公司</span><strong>{{ formatPercent(percentToRate(form.platformSharePercent)) }}</strong></div>
          <div><span class="refLabel">物业</span><strong>{{ formatPercent(rates.propertyShareRate) }}</strong></div>
          <div><span class="refLabel">管理团队</span><strong>{{ formatPercent(rates.coordinatorShareRate) }}</strong></div>
          <div><span class="refLabel">板块负责人（从管理团队份额中分配）</span><strong>{{ formatPercent(rates.sectorLeaderRate) }}</strong></div>
          <div><span class="refLabel">个体负责人（抽板块）</span><strong>{{ formatPercent(rates.individualLeaderRate) }}</strong></div>
          <div>
              <span class="refLabel">配送结算基数</span>
            <strong>
              公司 {{ formatPercent(percentToRate(form.platformDeliverySharePercent)) }} ·
              骑手 {{ formatPercent(1 - percentToRate(form.platformDeliverySharePercent)) }}
            </strong>
          </div>
        </div>
        <p class="note">
          我们公司、物业和管理团队的比例合计必须为 100%。
          管理团队份额再按统筹、板块、个体的规则继续分配。
          物业及管理团队比例可在「参数配置 → 分账」查看。
        </p>
        <div class="preview">
          <div class="previewTitle">示例：商品平台盘 100 元 + 配送结算基数 1 元</div>
          <div class="refGrid previewSeven">
            <div><span class="refLabel">我们公司</span><strong>¥{{ formatMoney(poolPreview.ourCompany) }}</strong></div>
            <div><span class="refLabel">物业</span><strong>¥{{ formatMoney(poolPreview.property) }}</strong></div>
            <div><span class="refLabel">管理团队</span><strong>¥{{ formatMoney(poolPreview.management) }}</strong></div>
            <div><span class="refLabel">统筹实得</span><strong>¥{{ formatMoney(poolPreview.coordinatorNet) }}</strong></div>
            <div><span class="refLabel">板块</span><strong>¥{{ formatMoney(poolPreview.sector) }}</strong></div>
            <div><span class="refLabel">个体</span><strong>¥{{ formatMoney(poolPreview.individual) }}</strong></div>
            <div>
              <span class="refLabel">配送链路·公司</span>
              <strong>¥{{ formatMoney(deliveryPreview.platform) }}</strong>
            </div>
            <div>
              <span class="refLabel">配送链路·配送员</span>
              <strong>¥{{ formatMoney(deliveryPreview.courier) }}</strong>
            </div>
          </div>
          <p class="previewHint">
            商品平台盘与配送链路相互独立，实际金额以后端分成快照为准。
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
  if (Math.abs(sum - 1) > 0.005) {
    return `当前收益分配合计 ${(sum * 100).toFixed(2)}%，必须调整为 100%（我们公司 + 物业 + 管理团队）后才能保存。`
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
  if (poolRateWarn.value) {
    saveError.value = poolRateWarn.value
    return
  }

  const companyName =
    propertyCompanies.value.find((item) => item.id === propertyCompanyId)?.name || propertyCompanyId
  const confirmed = window.confirm(
    `确认保存「${companyName}」的分成配置？\n` +
      `我们公司：${Number(form.platformSharePercent).toFixed(1)}%\n` +
      `物业：${formatPercent(rates.propertyShareRate)}\n` +
      `管理团队：${formatPercent(rates.coordinatorShareRate)}\n` +
      `配送费公司分成：${Number(form.platformDeliverySharePercent).toFixed(1)}%\n` +
      `提现手续费分成：${Number(form.platformWithdrawalFeeSharePercent).toFixed(1)}%\n` +
      '保存后将影响后续业务结算。'
  )
  if (!confirmed) return

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
