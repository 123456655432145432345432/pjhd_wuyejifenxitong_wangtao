<template>
  <div class="page">
    <div v-if="loading" class="hint">加载中...</div>
    <div v-else-if="notPublic" class="emptyState">
      <h1 class="title">该店铺暂未对外展示</h1>
      <p class="desc">店主已关闭对外展示，或店铺当前不可访问。</p>
      <RouterLink class="btnSecondary" :to="{ name: 'public-resident-shops' }">返回橱窗列表</RouterLink>
    </div>
    <div v-else-if="error" class="emptyState">
      <h1 class="title">无法打开店铺</h1>
      <p class="error">{{ error }}</p>
      <RouterLink class="btnSecondary" :to="{ name: 'public-resident-shops' }">返回橱窗列表</RouterLink>
    </div>
    <template v-else-if="detail">
      <div class="header">
        <div>
          <h1 class="title">{{ detail.residentName || detail.residentId }}</h1>
          <p class="desc">
            对外橱窗 · 商品 {{ detail.listingCount ?? detail.listings?.length ?? 0 }} 件
          </p>
        </div>
        <RouterLink class="btnSecondary" :to="{ name: 'public-resident-shops' }">全部橱窗</RouterLink>
      </div>

      <div v-if="listings.length" class="grid">
        <article v-for="item in listings" :key="item.id" class="card">
          <div
            class="cover"
            :style="item.coverUrl ? { backgroundImage: `url(${item.coverUrl})` } : undefined"
          />
          <div class="body">
            <strong>{{ item.productName || item.id }}</strong>
            <p class="price">¥{{ formatMoney(item.retailPrice) }}</p>
            <small>分享 {{ item.shareCount ?? 0 }} 次</small>
          </div>
        </article>
      </div>
      <p v-else class="hint">暂无上架商品</p>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { residentMerchantApi } from '../../api/services'
import { ApiError } from '../../api/request'
import type { ResidentMerchantPublicDetail } from '../../api/types'
import { getPhase2ErrorMessage } from '../../constants/enums'

const route = useRoute()
const loading = ref(true)
const error = ref('')
const notPublic = ref(false)
const detail = ref<ResidentMerchantPublicDetail | null>(null)

const listings = computed(() => detail.value?.listings || [])

function formatMoney(value?: number) {
  if (value === undefined || value === null) return '0.00'
  return Number(value).toFixed(2)
}

async function load() {
  const residentId = String(route.params.residentId || '')
  if (!residentId) {
    error.value = '缺少店铺参数'
    loading.value = false
    return
  }
  loading.value = true
  error.value = ''
  notPublic.value = false
  detail.value = null
  try {
    detail.value = await residentMerchantApi.getPublic(residentId)
  } catch (e) {
    if (e instanceof ApiError && e.code === 90111) {
      notPublic.value = true
    } else {
      error.value = e instanceof ApiError ? getPhase2ErrorMessage(e.code, e.message) : '加载失败'
    }
  } finally {
    loading.value = false
  }
}

watch(
  () => route.params.residentId,
  () => {
    void load()
  }
)

onMounted(() => load())
</script>

<style scoped>
.page {
  max-width: 960px;
  margin: 0 auto;
  padding: 24px 16px 48px;
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 20px;
}
.title { margin: 0; font-size: 22px; }
.desc { margin: 6px 0 0; color: #8c8c9a; font-size: 13px; }
.emptyState {
  text-align: center;
  padding: 48px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}
.card {
  background: #fff;
  border: 1px solid #ececf2;
  border-radius: 12px;
  overflow: hidden;
}
.cover {
  height: 140px;
  background: #f1f5f9 center/cover no-repeat;
}
.body { padding: 12px; display: flex; flex-direction: column; gap: 6px; }
.price { margin: 0; color: #b45309; font-weight: 600; }
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
.error { color: #d14343; }
</style>
