<template>
  <div class="page">
    <div class="header">
      <div>
        <h1 class="title">平台配置</h1>
        <p class="desc">
          平台级全局开关（§94.9）：奖励金默认归属物业还是住户、提现按角色/商家/住户拆单、分成用四级还是「平台+物业」简化。
          与「参数配置」不同：本页改的是全平台默认；单物业分成比例/积分规则请到参数配置。
        </p>
      </div>
      <button
        class="btnPrimary"
        :disabled="loading || saving || !canEdit"
        :title="canEdit ? '' : '仅平台管理员可修改'"
        @click="save"
      >
        保存
      </button>
    </div>
    <p v-if="!canEdit" class="subHint">
      本页可查看，但平台级配置只有平台管理员（platform_admin）可以更新（后端 §3.1：PUT 仅 platform_admin）。
    </p>
    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="success" class="success">{{ success }}</p>
    <div v-if="loading" class="hint">加载中...</div>
    <div v-else class="panel">
      <div class="field">
        <label>奖励金归属默认</label>
        <select v-model="form.rewardAttributionMode" class="input" :disabled="!canEdit">
          <option v-for="opt in ATTRIBUTION_MODE_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </select>
      </div>
      <div class="field">
        <label>提现粒度</label>
        <select v-model="form.withdrawalGranularity" class="input" :disabled="!canEdit">
          <option value="per_role">按角色</option>
          <option value="merchant">按商家</option>
          <option value="resident">按住户</option>
        </select>
      </div>
      <div class="field">
        <label>分成维度</label>
        <select v-model="form.shareDimension" class="input" :disabled="!canEdit">
          <option value="default">{{ SHARE_DIMENSION_LABEL.default }}</option>
          <option value="simple">{{ SHARE_DIMENSION_LABEL.simple }}</option>
        </select>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { platformConfigApi } from '../../api/services'
import type { PlatformConfigItem } from '../../api/types'
import { formatApiError } from '../../api/request'
import { useAuthStore } from '../../stores/auth'
import {
  ATTRIBUTION_MODE,
  ATTRIBUTION_MODE_OPTIONS,
  SHARE_DIMENSION,
  SHARE_DIMENSION_LABEL,
  USER_ROLE
} from '../../constants/enums'

const auth = useAuthStore()
/**
 * 后端 2026-10-27 回复 §3.1：`GET /admin/platform-config` 平台管理员与物业管理员均可读，
 * `PUT` 仅平台管理员可写（property_admin 提交返回 403 / 20004）。
 * 唯一判据 `role === 'platform_admin'`，不存在「平台管理员但限定某物业」的细分。
 */
const canEdit = computed(() => auth.profile?.role === USER_ROLE.PLATFORM_ADMIN)

const loading = ref(true)
const saving = ref(false)
const error = ref('')
const success = ref('')
const form = reactive<PlatformConfigItem>({
  rewardAttributionMode: ATTRIBUTION_MODE.PROPERTY,
  withdrawalGranularity: 'per_role',
  shareDimension: SHARE_DIMENSION.DEFAULT
})

async function load() {
  loading.value = true
  try {
    const data = await platformConfigApi.get()
    form.rewardAttributionMode = data.rewardAttributionMode || ATTRIBUTION_MODE.PROPERTY
    form.withdrawalGranularity = data.withdrawalGranularity || 'per_role'
    form.shareDimension = data.shareDimension || SHARE_DIMENSION.DEFAULT
  } catch (e) {
    error.value = formatApiError(e, '加载失败')
  } finally {
    loading.value = false
  }
}

async function save() {
  if (!canEdit.value) {
    error.value = '仅平台管理员可修改平台配置'
    return
  }
  saving.value = true
  error.value = ''
  success.value = ''
  try {
    await platformConfigApi.update({ ...form })
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
.page { max-width: 640px; }
.header { display: flex; justify-content: space-between; margin-bottom: 16px; }
.title { font-size: 22px; font-weight: 600; }
.desc { font-size: 14px; color: #8c8c9a; }
.panel { background: #fff; border-radius: 12px; padding: 20px; }
.field { margin-bottom: 14px; }
.field label { display: block; font-size: 13px; color: #8c8c9a; margin-bottom: 6px; }
.input { width: 100%; padding: 8px; border: 1px solid #e8e8ec; border-radius: 8px; box-sizing: border-box; }
.input:disabled { background: #f5f5f8; color: #8c8c9a; cursor: not-allowed; }
.btnPrimary { padding: 8px 16px; background: #5c5c9e; color: #fff; border: none; border-radius: 8px; cursor: pointer; }
.btnPrimary:disabled { opacity: 0.55; cursor: not-allowed; }
.subHint { font-size: 13px; color: #b76a00; background: #fff7e8; padding: 8px 12px; border-radius: 8px; margin-bottom: 12px; }
.error { color: #e05c5c; }
.success { color: #389e6d; }
.hint { color: #8c8c9a; }
</style>
