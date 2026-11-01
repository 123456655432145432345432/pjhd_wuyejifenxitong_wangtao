<template>
  <div class="page">
    <div class="header">
      <div>
        <h1 class="title">结算配置</h1>
        <p class="desc">
          微信支付普通分账开关与结算参数。电商收付通进件、收款账号与待追回台账请走对应新页面；微信电商收付通总开关由后端配置，未打开前旧分账链路不变。
        </p>
      </div>
      <button
        class="btnPrimary"
        :disabled="loading || saving || !canEdit"
        :title="canEdit ? '' : '仅平台管理员可修改'"
        :class="{ btnDisabled: !canEdit }"
        @click="save"
      >
        保存
      </button>
    </div>
    <p v-if="!canEdit" class="subHint">
      v8.17 §103.1：本页可查看，但结算配置只有平台管理员（platform_admin）可以修改。
    </p>
    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="success" class="success">{{ success }}</p>
    <div v-if="loading" class="hint">加载中...</div>
    <div v-else class="panel">
      <div class="field">
        <label class="label">启用微信分账</label>
        <input v-model="form.wechatSplitEnabled" type="checkbox" :disabled="!canEdit" />
      </div>
      <p class="subHint">平台级商户号、回调地址由后端环境变量配置，本页仅维护业务开关。</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { settlementConfigApi } from '../../api/services'
import type { SettlementConfig } from '../../api/types'
import { formatApiError } from '../../api/request'
import { useAuthStore } from '../../stores/auth'
import { USER_ROLE } from '../../constants/enums'

const auth = useAuthStore()
/**
 * v8.17 §103.1 + 后端 2026-10-27 回复：
 * 结算 / 订单 / 分成三组资金配置接口均为「可读、仅平台管理员可写」，
 * 平台管理员唯一判据是 `role === 'platform_admin'`（无物业细分）。
 */
const canEdit = computed(() => auth.profile?.role === USER_ROLE.PLATFORM_ADMIN)

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
  if (!canEdit.value) {
    error.value = '仅平台管理员可修改结算配置'
    return
  }
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
.btnPrimary.btnDisabled { background: #c8c8d0; cursor: not-allowed; }
.error { color: #e05c5c; margin-bottom: 12px; }
.success { color: #389e6d; margin-bottom: 12px; }
.hint { color: #8c8c9a; }
</style>
