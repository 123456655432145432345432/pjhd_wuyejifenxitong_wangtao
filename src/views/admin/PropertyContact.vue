<template>
  <div class="page">
    <div class="header">
      <div>
        <h1 class="title">物业联系方式</h1>
        <p class="desc">
          当前接口为全局单条配置（再次保存会覆盖，不能新建第二条）。居民未绑定楼栋时，公开页仅在启用后展示本条。
        </p>
      </div>
      <button class="btnPrimary" :disabled="loading || saving" @click="handleSave">
        {{ saving ? '保存中...' : '保存配置' }}
      </button>
    </div>

    <p v-if="loadError" class="bannerError">{{ loadError }}</p>
    <p v-if="saveError" class="bannerError">{{ saveError }}</p>
    <p v-if="saveSuccess" class="bannerSuccess">{{ saveSuccess }}</p>
    <p v-if="!loading && !hasConfig" class="bannerHint">尚未配置，保存后将创建全局单条记录。</p>

    <div v-if="loading" class="hint">加载中...</div>
    <form v-else class="formCard" @submit.prevent="handleSave">
      <div class="fieldRow">
        <div class="field">
          <label class="label">物业名称 <span class="required">*</span></label>
          <input v-model.trim="form.propertyName" class="input" maxlength="100" placeholder="如：阳光花园物业服务中心" required />
        </div>
        <div class="field">
          <label class="label">联系电话 <span class="required">*</span></label>
          <input v-model.trim="form.contactPhone" class="input" maxlength="30" placeholder="座机 / 服务热线" required />
        </div>
      </div>
      <div class="fieldRow">
        <div class="field">
          <label class="label">备用手机</label>
          <input v-model.trim="form.contactMobile" class="input" maxlength="20" placeholder="选填" />
        </div>
        <div class="field">
          <label class="label">联系邮箱</label>
          <input v-model.trim="form.email" type="email" class="input" maxlength="80" placeholder="选填" />
        </div>
      </div>
      <div class="field">
        <label class="label">物业地址</label>
        <input v-model.trim="form.address" class="input" maxlength="200" placeholder="选填" />
      </div>
      <div class="field">
        <label class="label">服务时间</label>
        <input v-model.trim="form.serviceHours" class="input" maxlength="100" placeholder="如：周一至周日 8:00-20:00" />
      </div>
      <div class="field">
        <label class="label">备注（仅管理端可见）</label>
        <textarea v-model.trim="form.remark" class="textarea" rows="3" maxlength="200" placeholder="不下发公开接口" />
      </div>
      <label class="switch">
        <input v-model="form.enabled" type="checkbox" />
        <span>{{ form.enabled ? '已启用（公开接口可展示）' : '已关闭（公开接口返回空）' }}</span>
      </label>
      <p v-if="metaText" class="meta">{{ metaText }}</p>
    </form>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { propertyContactAdminApi } from '../../api/services'
import { ApiError } from '../../api/request'

const loading = ref(true)
const saving = ref(false)
const hasConfig = ref(false)
const loadError = ref('')
const saveError = ref('')
const saveSuccess = ref('')
const updatedAt = ref('')
const createdAt = ref('')

const form = reactive({
  propertyName: '',
  contactPhone: '',
  contactMobile: '',
  address: '',
  serviceHours: '',
  email: '',
  remark: '',
  enabled: true
})

const metaText = computed(() => {
  const parts: string[] = []
  if (createdAt.value) parts.push(`创建：${createdAt.value}`)
  if (updatedAt.value) parts.push(`更新：${updatedAt.value}`)
  return parts.join(' · ')
})

function applyConfig(data: {
  propertyName?: string
  contactPhone?: string
  contactMobile?: string
  address?: string
  serviceHours?: string
  email?: string
  remark?: string
  enabled?: boolean
  createdAt?: string
  updatedAt?: string
} | null) {
  if (!data) {
    hasConfig.value = false
    return
  }
  hasConfig.value = true
  form.propertyName = data.propertyName || ''
  form.contactPhone = data.contactPhone || ''
  form.contactMobile = data.contactMobile || ''
  form.address = data.address || ''
  form.serviceHours = data.serviceHours || ''
  form.email = data.email || ''
  form.remark = data.remark || ''
  form.enabled = data.enabled !== false
  createdAt.value = data.createdAt || ''
  updatedAt.value = data.updatedAt || ''
}

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const res = await propertyContactAdminApi.get()
    applyConfig(res)
  } catch (e) {
    loadError.value = e instanceof ApiError ? e.message : '加载失败'
  } finally {
    loading.value = false
  }
}

async function handleSave() {
  if (!form.propertyName.trim()) {
    saveError.value = '请填写物业名称'
    return
  }
  if (!form.contactPhone.trim()) {
    saveError.value = '请填写联系电话'
    return
  }
  saving.value = true
  saveError.value = ''
  saveSuccess.value = ''
  try {
    const res = await propertyContactAdminApi.save({
      propertyName: form.propertyName.trim(),
      contactPhone: form.contactPhone.trim(),
      contactMobile: form.contactMobile.trim() || undefined,
      address: form.address.trim() || undefined,
      serviceHours: form.serviceHours.trim() || undefined,
      email: form.email.trim() || undefined,
      remark: form.remark.trim() || undefined,
      enabled: form.enabled
    })
    applyConfig(res)
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
.page { max-width: 880px; }
.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}
.title { margin: 0; font-size: 22px; font-weight: 600; color: #1f1f2e; }
.desc { margin: 6px 0 0; color: #8c8c9a; font-size: 13px; line-height: 1.5; }
.required { color: #e05c5c; }
.formCard {
  background: #fff;
  border-radius: 12px;
  padding: 20px 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}
.fieldRow {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.field { margin-bottom: 16px; }
.label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: #5c5c66;
  margin-bottom: 8px;
}
.input,
.textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e8e8ec;
  border-radius: 8px;
  font-size: 14px;
  color: #1f1f2e;
  background: #fff;
  outline: none;
  box-sizing: border-box;
  font-family: inherit;
}
.input:focus,
.textarea:focus { border-color: #5c5c9e; }
.textarea { resize: vertical; min-height: 80px; }
.switch {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #5c5c66;
  margin-top: 4px;
  cursor: pointer;
}
.meta { margin: 16px 0 0; font-size: 12px; color: #8c8c9a; }
.btnPrimary {
  padding: 10px 18px;
  border-radius: 8px;
  border: none;
  background: #5c5c9e;
  color: #fff;
  cursor: pointer;
  font-size: 14px;
}
.btnPrimary:disabled { opacity: 0.6; cursor: not-allowed; }
.bannerError { color: #d14343; margin-bottom: 12px; font-size: 13px; }
.bannerSuccess { color: #15803d; margin-bottom: 12px; font-size: 13px; }
.bannerHint { color: #d48806; margin-bottom: 12px; font-size: 13px; }
.hint { color: #8c8c9a; }

@media (max-width: 700px) {
  .fieldRow { grid-template-columns: 1fr; }
}
</style>
