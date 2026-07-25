<template>
  <div class="page">
    <div class="header">
      <div>
        <h1 class="title">平台分成配置</h1>
        <p class="desc">设置平台管理员在订单分成、配送费、提现手续费三条收益链路的分成比例</p>
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

      <div class="grid">
        <div class="card">
          <div class="cardHead">订单分成比例</div>
          <p class="cardDesc">平台从订单可分配金额中抽取的比例，默认 0%</p>
          <div class="inputWrap">
            <input v-model.number="form.platformSharePercent" type="number" min="0" max="100" step="0.1" class="input" :disabled="!canEdit" />
            <span class="unit">%</span>
          </div>
        </div>
        <div class="card">
          <div class="cardHead">配送费分成比例</div>
          <p class="cardDesc">平台从配送费中抽取的比例，默认 0%</p>
          <div class="inputWrap">
            <input v-model.number="form.platformDeliverySharePercent" type="number" min="0" max="100" step="0.1" class="input" :disabled="!canEdit" />
            <span class="unit">%</span>
          </div>
        </div>
        <div class="card">
          <div class="cardHead">提现手续费分成比例</div>
          <p class="cardDesc">平台从提现手续费中抽取的比例，默认 100%</p>
          <div class="inputWrap">
            <input v-model.number="form.platformWithdrawalFeeSharePercent" type="number" min="0" max="100" step="0.1" class="input" :disabled="!canEdit" />
            <span class="unit">%</span>
          </div>
        </div>
      </div>

      <div class="card reference">
        <div class="cardHead">当前四级分成参考（只读）</div>
        <div class="refGrid">
          <div><span class="refLabel">物业分成</span><strong>{{ formatPercent(rates.propertyShareRate) }}</strong></div>
          <div><span class="refLabel">统筹分成</span><strong>{{ formatPercent(rates.coordinatorShareRate) }}</strong></div>
          <div><span class="refLabel">板块负责人</span><strong>{{ formatPercent(rates.sectorLeaderRate) }}</strong></div>
          <div><span class="refLabel">个体负责人</span><strong>{{ formatPercent(rates.individualLeaderRate) }}</strong></div>
        </div>
        <p class="note">提高平台订单分成比例后，物业→统筹→板块→个体四级收益会按原有权重等比压缩。</p>
        <div class="preview">
          <div class="previewTitle">按当前输入值估算的四级实际占比</div>
          <div class="refGrid">
            <div><span class="refLabel">物业分成</span><strong>{{ formatPercent(previewRates.propertyShareRate) }}</strong></div>
            <div><span class="refLabel">统筹分成</span><strong>{{ formatPercent(previewRates.coordinatorShareRate) }}</strong></div>
            <div><span class="refLabel">板块负责人</span><strong>{{ formatPercent(previewRates.sectorLeaderRate) }}</strong></div>
            <div><span class="refLabel">个体负责人</span><strong>{{ formatPercent(previewRates.individualLeaderRate) }}</strong></div>
          </div>
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
  platformDeliverySharePercent: 0,
  platformWithdrawalFeeSharePercent: 100
})

const previewRates = computed(() => {
  const source = [
    Number(rates.propertyShareRate || 0),
    Number(rates.coordinatorShareRate || 0),
    Number(rates.sectorLeaderRate || 0),
    Number(rates.individualLeaderRate || 0)
  ]
  const sourceTotal = source.reduce((sum, value) => sum + value, 0)
  const remainder = 1 - percentToRate(Number(form.platformSharePercent) || 0)
  const scale = sourceTotal > 0 ? remainder / sourceTotal : 0
  return {
    propertyShareRate: source[0] * scale,
    coordinatorShareRate: source[1] * scale,
    sectorLeaderRate: source[2] * scale,
    individualLeaderRate: source[3] * scale
  }
})

function formatPercent(rate?: number) {
  if (rate === undefined || rate === null) return '—'
  return `${(rate * 100).toFixed(2)}%`
}

function percentToRate(percent: number) {
  return Math.min(Math.max(percent / 100, 0), 1)
}

function applyRates(data: PlatformShareRates) {
  Object.assign(rates, data)
  form.platformSharePercent = rateToFormPercent(data.platformShareRate ?? 0)
  form.platformDeliverySharePercent = rateToFormPercent(data.platformDeliveryShareRate ?? 0)
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
.desc { font-size: 14px; color: #8c8c9a; }
.bannerError { font-size: 13px; color: #e05c5c; margin-bottom: 12px; }
.bannerSuccess { font-size: 13px; color: #3aaf7d; margin-bottom: 12px; }
.loadingText, .hint { text-align: center; color: #8c8c9a; padding: 32px 0; }
.propertySelect { margin-bottom: 20px; }
.label { display: block; font-size: 14px; color: #5c5c66; margin-bottom: 8px; }
.input { width: 100%; max-width: 320px; padding: 10px 14px; border: 1px solid #e8e8ec; border-radius: 8px; font-size: 14px; }
.grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 20px; }
.card { background: #fff; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.cardHead { font-size: 15px; font-weight: 600; color: #1f1f2e; margin-bottom: 8px; }
.cardDesc { font-size: 13px; color: #8c8c9a; margin-bottom: 16px; }
.inputWrap { display: flex; align-items: center; border: 1px solid #e8e8ec; border-radius: 8px; padding: 0 12px; height: 40px; }
.inputWrap .input { border: none; max-width: none; padding: 0; }
.unit { font-size: 13px; color: #8c8c9a; margin-left: 8px; }
.reference { margin-top: 0; }
.refGrid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 12px; }
.refLabel { display: block; font-size: 12px; color: #8c8c9a; margin-bottom: 4px; }
.note { font-size: 12px; color: #8c8c9a; }
.preview { margin-top: 16px; padding-top: 16px; border-top: 1px solid #f0f0f3; }
.previewTitle { margin-bottom: 12px; font-size: 13px; font-weight: 600; color: #5c5c66; }
.btnPrimary { padding: 10px 20px; border-radius: 8px; background: #5c5c9e; color: #fff; border: none; cursor: pointer; }
.btnPrimary:disabled { opacity: 0.6; cursor: not-allowed; }
@media (max-width: 900px) { .grid, .refGrid { grid-template-columns: 1fr; } }
</style>
