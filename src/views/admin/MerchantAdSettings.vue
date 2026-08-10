<template>
  <div class="page">
    <div class="header">
      <div>
        <h1 class="title">商家广告设置</h1>
        <p class="desc">配置广告单日价、免费额度开关与每周免费条数</p>
      </div>
      <button class="btnPrimary" :disabled="loading || saving" @click="handleSave">
        {{ saving ? '保存中...' : '保存配置' }}
      </button>
    </div>

    <p v-if="loadError" class="bannerError">{{ loadError }}</p>
    <p v-if="saveError" class="bannerError">{{ saveError }}</p>
    <p v-if="saveSuccess" class="bannerSuccess">{{ saveSuccess }}</p>

    <div v-if="loading" class="hint">加载中...</div>
    <div v-else class="grid">
      <div class="card">
        <div class="cardHead">单日价（元）</div>
        <p class="cardDesc">商家发布广告时按「单日价 × 天数」计价</p>
        <input v-model.number="form.dayPrice" type="number" min="0" step="0.01" class="input" />
      </div>
      <div class="card">
        <div class="cardHead">免费额度开关</div>
        <p class="cardDesc">关闭后商家不可使用免费投放</p>
        <label class="switch">
          <input v-model="form.freeQuotaEnabled" type="checkbox" />
          <span>{{ form.freeQuotaEnabled ? '已开启' : '已关闭' }}</span>
        </label>
      </div>
      <div class="card">
        <div class="cardHead">每周免费条数</div>
        <p class="cardDesc">每个商家每周可免费投放的广告条数</p>
        <input v-model.number="form.freeQuotaPerWeek" type="number" min="0" step="1" class="input" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { merchantAdAdminApi } from '../../api/services'
import { ApiError } from '../../api/request'

const loading = ref(true)
const saving = ref(false)
const loadError = ref('')
const saveError = ref('')
const saveSuccess = ref('')

const form = reactive({
  dayPrice: 10,
  freeQuotaEnabled: true,
  freeQuotaPerWeek: 1
})

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const res = await merchantAdAdminApi.getSettings()
    form.dayPrice = Number(res.dayPrice ?? 10)
    form.freeQuotaEnabled = res.freeQuotaEnabled !== false
    form.freeQuotaPerWeek = Number(res.freeQuotaPerWeek ?? 1)
  } catch (e) {
    loadError.value = e instanceof ApiError ? e.message : '加载失败'
  } finally {
    loading.value = false
  }
}

async function handleSave() {
  if (form.dayPrice < 0 || !Number.isFinite(form.dayPrice)) {
    saveError.value = '单日价须为不小于 0 的数字'
    return
  }
  if (!Number.isInteger(form.freeQuotaPerWeek) || form.freeQuotaPerWeek < 0) {
    saveError.value = '每周免费条数须为不小于 0 的整数'
    return
  }
  saving.value = true
  saveError.value = ''
  saveSuccess.value = ''
  try {
    const res = await merchantAdAdminApi.updateSettings({
      dayPrice: form.dayPrice,
      freeQuotaEnabled: form.freeQuotaEnabled,
      freeQuotaPerWeek: form.freeQuotaPerWeek
    })
    form.dayPrice = Number(res.dayPrice ?? form.dayPrice)
    form.freeQuotaEnabled = res.freeQuotaEnabled !== false
    form.freeQuotaPerWeek = Number(res.freeQuotaPerWeek ?? form.freeQuotaPerWeek)
    saveSuccess.value = '配置已保存'
  } catch (e) {
    saveError.value = e instanceof ApiError ? e.message : '保存失败'
  } finally {
    saving.value = false
  }
}

onMounted(() => load())
</script>

<style scoped>
.page { max-width: 960px; }
.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 20px;
}
.title { margin: 0; font-size: 22px; }
.desc { margin: 6px 0 0; color: #8c8c9a; font-size: 13px; }
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
}
.card {
  background: #fff;
  border: 1px solid #ececf2;
  border-radius: 12px;
  padding: 16px;
}
.cardHead { font-weight: 600; margin-bottom: 6px; }
.cardDesc { font-size: 12px; color: #8c8c9a; margin-bottom: 12px; }
.input {
  width: 100%;
  border: 1px solid #e8e8ec;
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 14px;
}
.switch {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}
.btnPrimary {
  padding: 10px 18px;
  border-radius: 8px;
  border: none;
  background: #5c5c9e;
  color: #fff;
  cursor: pointer;
}
.btnPrimary:disabled { opacity: 0.6; cursor: not-allowed; }
.bannerError { color: #d14343; margin-bottom: 12px; }
.bannerSuccess { color: #15803d; margin-bottom: 12px; }
.hint { color: #8c8c9a; }
</style>
