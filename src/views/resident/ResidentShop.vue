<template>
  <div class="page">
    <div class="header">
      <div>
        <h1 class="title">我的店铺</h1>
        <p class="desc">管理业主商户对外展示状态；对外后任何人可通过公开橱窗与分享链接查看</p>
      </div>
    </div>

    <div v-if="loading" class="hint">加载中...</div>
    <p v-else-if="error" class="error">{{ error }}</p>
    <template v-else-if="detail">
      <div class="card">
        <div class="row">
          <span class="label">店铺状态</span>
          <strong>{{ getEnumLabel(RESIDENT_MERCHANT_STATUS_LABEL, detail.status || detail.statusCode) }}</strong>
        </div>
        <div class="row">
          <span class="label">保证金</span>
          <span>{{ detail.depositAmount ?? '—' }}（{{ getEnumLabel(RESIDENT_MERCHANT_DEPOSIT_STATUS_LABEL, detail.depositStatus) }}）</span>
        </div>
        <div class="row">
          <span class="label">上架商品</span>
          <span>{{ detail.listingCount ?? 0 }}</span>
        </div>
        <div class="row">
          <span class="label">对外展示</span>
          <span class="visibilityTag" :class="detail.visibility">
            {{ visibilityLabel(detail.visibility) }}
          </span>
        </div>

        <div v-if="isActive" class="toggleBlock">
          <p class="toggleDesc">开启后，店铺会出现在公开橱窗，支持微信/朋友圈分享落地页访问。</p>
          <label class="switch">
            <input
              type="checkbox"
              :checked="detail.visibility === RESIDENT_SHOP_VISIBILITY.PUBLIC"
              :disabled="toggling"
              @change="onToggle"
            />
            <span>{{ detail.visibility === RESIDENT_SHOP_VISIBILITY.PUBLIC ? '对外展示中' : '当前不对外' }}</span>
          </label>
          <p v-if="toggleError" class="error">{{ toggleError }}</p>
          <p v-if="toggleSuccess" class="success">{{ toggleSuccess }}</p>
        </div>
        <p v-else class="hint warn">仅营业中的店主可切换对外展示。</p>

        <div class="actions">
          <RouterLink
            v-if="detail.residentId"
            class="btnSecondary"
            :to="{ name: 'public-resident-shop', params: { residentId: detail.residentId } }"
          >
            预览公开橱窗
          </RouterLink>
          <RouterLink class="btnSecondary" :to="{ name: 'public-resident-shops' }">
            浏览公开橱窗列表
          </RouterLink>
        </div>
      </div>
    </template>
    <p v-else class="hint">您尚未开通业主商户，或申请尚未生效。</p>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { residentMerchantApi } from '../../api/services'
import { ApiError } from '../../api/request'
import type { ResidentMerchantMyDetail } from '../../api/types'
import {
  ENTITY_STATUS,
  getEnumLabel,
  getPhase2ErrorMessage,
  RESIDENT_MERCHANT_DEPOSIT_STATUS_LABEL,
  RESIDENT_MERCHANT_STATUS_LABEL,
  RESIDENT_SHOP_VISIBILITY,
  RESIDENT_SHOP_VISIBILITY_LABEL
} from '../../constants/enums'

const loading = ref(true)
const error = ref('')
const detail = ref<ResidentMerchantMyDetail | null>(null)
const toggling = ref(false)
const toggleError = ref('')
const toggleSuccess = ref('')

const isActive = computed(
  () =>
    detail.value?.statusCode === ENTITY_STATUS.ACTIVE ||
    detail.value?.status === ENTITY_STATUS.ACTIVE ||
    detail.value?.statusCode === 'active' ||
    detail.value?.status === '营业中'
)

function visibilityLabel(value?: string) {
  return getEnumLabel(RESIDENT_SHOP_VISIBILITY_LABEL, value, '—')
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    detail.value = await residentMerchantApi.my()
  } catch (e) {
    error.value = e instanceof ApiError ? getPhase2ErrorMessage(e.code, e.message) : '加载失败'
    detail.value = null
  } finally {
    loading.value = false
  }
}

async function onToggle(e: Event) {
  const checked = (e.target as HTMLInputElement).checked
  const next = checked ? RESIDENT_SHOP_VISIBILITY.PUBLIC : RESIDENT_SHOP_VISIBILITY.PRIVATE
  toggling.value = true
  toggleError.value = ''
  toggleSuccess.value = ''
  try {
    detail.value = await residentMerchantApi.updateVisibility(next)
    toggleSuccess.value = `已切换为「${visibilityLabel(next)}」`
  } catch (err) {
    toggleError.value =
      err instanceof ApiError ? getPhase2ErrorMessage(err.code, err.message) : '切换失败'
    ;(e.target as HTMLInputElement).checked =
      detail.value?.visibility === RESIDENT_SHOP_VISIBILITY.PUBLIC
  } finally {
    toggling.value = false
  }
}

onMounted(() => load())
</script>

<style scoped>
.page { max-width: 720px; display: flex; flex-direction: column; gap: 16px; }
.header { margin-bottom: 4px; }
.title { margin: 0; font-size: 22px; }
.desc { margin: 6px 0 0; color: #8c8c9a; font-size: 13px; }
.card {
  background: #fff;
  border: 1px solid #ececf2;
  border-radius: 12px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 14px;
}
.label { color: #8c8c9a; }
.visibilityTag {
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
}
.visibilityTag.public { background: #eaf7ee; color: #15803d; }
.visibilityTag.private { background: #f1f5f9; color: #64748b; }
.toggleBlock {
  border-top: 1px solid #f0f0f5;
  padding-top: 14px;
}
.toggleDesc { margin: 0 0 10px; font-size: 13px; color: #5c5c66; }
.switch { display: flex; align-items: center; gap: 8px; font-size: 14px; }
.actions { display: flex; flex-wrap: wrap; gap: 8px; }
.btnSecondary {
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px solid #e8e8ec;
  background: #fff;
  color: #5c5c66;
  text-decoration: none;
  font-size: 13px;
}
.hint { color: #8c8c9a; }
.hint.warn { color: #d48806; }
.error { color: #d14343; font-size: 13px; }
.success { color: #15803d; font-size: 13px; }
</style>
