<template>
  <div class="page">
    <div class="header">
      <div>
        <h1 class="title">结算配置</h1>
        <p class="desc">
          微信支付普通分账开关与结算参数。电商收付通进件、收款账号与待追回台账请走对应新页面；微信电商收付通总开关由后端配置，未打开前旧分账链路不变。
        </p>
      </div>
      <button class="btnPrimary" :disabled="loading || saving" @click="save">保存</button>
    </div>
    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="success" class="success">{{ success }}</p>
    <div v-if="loading" class="hint">加载中...</div>
    <div v-else class="panel">
      <div class="field">
        <label class="label">启用微信分账</label>
        <input v-model="form.wechatSplitEnabled" type="checkbox" />
      </div>
      <p class="subHint">平台级商户号、回调地址由后端环境变量配置，本页仅维护业务开关。</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { settlementConfigApi } from '../../api/services'
import type { SettlementConfig } from '../../api/types'
import { formatApiError } from '../../api/request'

const loading = ref(true)
const saving = ref(false)
const error = ref('')
const success = ref('')
const form = reactive<SettlementConfig>({ wechatSplitEnabled: false })

async function load() {
  loading.value = true
  error.value = ''
  try {
    const data = await settlementConfigApi.get()
    form.wechatSplitEnabled = data.wechatSplitEnabled ?? false
  } catch (e) {
    error.value = formatApiError(e, '加载失败')
  } finally {
    loading.value = false
  }
}

async function save() {
  saving.value = true
  error.value = ''
  success.value = ''
  try {
    await settlementConfigApi.update({ wechatSplitEnabled: form.wechatSplitEnabled })
    success.value = '已保存'
  } catch (e) {
    error.value = formatApiError(e, '保存失败')
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.page { max-width: 720px; }
.header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 20px; }
.title { font-size: 22px; font-weight: 600; margin-bottom: 8px; }
.desc { font-size: 14px; color: #8c8c9a; }
.panel { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.field { margin-bottom: 12px; }
.label { display: block; font-size: 13px; color: #8c8c9a; margin-bottom: 6px; }
.subHint { font-size: 13px; color: #8c8c9a; }
.btnPrimary { padding: 10px 18px; border-radius: 8px; background: #5c5c9e; color: #fff; border: none; cursor: pointer; }
.error { color: #e05c5c; margin-bottom: 12px; }
.success { color: #389e6d; margin-bottom: 12px; }
.hint { color: #8c8c9a; }
</style>
