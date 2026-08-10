<template>
  <div class="page">
    <div class="header">
      <div>
        <h1 class="title">业主商户橱窗</h1>
        <p class="desc">浏览对外展示的业主商户（无需登录）</p>
      </div>
    </div>

    <div class="toolbar">
      <input
        v-model="keyword"
        class="input"
        placeholder="搜索店主姓名/手机号"
        @keyup.enter="reload"
      />
      <button class="btnPrimary" :disabled="loading" @click="reload">搜索</button>
    </div>

    <div v-if="loading" class="hint">加载中...</div>
    <p v-else-if="error" class="error">{{ error }}</p>
    <div v-else-if="list.length" class="grid">
      <RouterLink
        v-for="item in list"
        :key="item.residentId"
        class="card"
        :to="{ name: 'public-resident-shop', params: { residentId: item.residentId } }"
      >
        <strong>{{ item.residentName || item.residentId }}</strong>
        <p>商品 {{ item.listingCount ?? 0 }} 件</p>
        <small>保证金 ¥{{ formatMoney(item.depositAmount) }}</small>
      </RouterLink>
    </div>
    <p v-else class="hint">暂无对外展示的店铺</p>

    <div v-if="totalPages > 1" class="pager">
      <button class="btnSecondary" :disabled="page <= 1 || loading" @click="changePage(page - 1)">
        上一页
      </button>
      <span>{{ page }} / {{ totalPages }}</span>
      <button
        class="btnSecondary"
        :disabled="page >= totalPages || loading"
        @click="changePage(page + 1)"
      >
        下一页
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { residentMerchantApi } from '../../api/services'
import { ApiError } from '../../api/request'
import type { ResidentMerchantPublicItem } from '../../api/types'
import { getPhase2ErrorMessage } from '../../constants/enums'

const loading = ref(false)
const error = ref('')
const list = ref<ResidentMerchantPublicItem[]>([])
const keyword = ref('')
const page = ref(1)
const totalPages = ref(1)

function formatMoney(value?: number) {
  if (value === undefined || value === null) return '0.00'
  return Number(value).toFixed(2)
}

async function load(pageNo = 1) {
  loading.value = true
  error.value = ''
  try {
    const res = await residentMerchantApi.listPublic({
      page: pageNo,
      pageSize: 20,
      keyword: keyword.value.trim() || undefined
    })
    list.value = res.list || []
    page.value = res.pagination?.page ?? pageNo
    totalPages.value = res.pagination?.totalPages ?? 1
  } catch (e) {
    error.value = e instanceof ApiError ? getPhase2ErrorMessage(e.code, e.message) : '加载失败'
    list.value = []
  } finally {
    loading.value = false
  }
}

function reload() {
  void load(1)
}

function changePage(p: number) {
  void load(p)
}

onMounted(() => load(1))
</script>

<style scoped>
.page {
  max-width: 960px;
  margin: 0 auto;
  padding: 24px 16px 48px;
}
.header { margin-bottom: 16px; }
.title { margin: 0; font-size: 22px; }
.desc { margin: 6px 0 0; color: #8c8c9a; font-size: 13px; }
.toolbar { display: flex; gap: 8px; margin-bottom: 16px; }
.input {
  flex: 1;
  border: 1px solid #e8e8ec;
  border-radius: 8px;
  padding: 10px 12px;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}
.card {
  display: block;
  background: #fff;
  border: 1px solid #ececf2;
  border-radius: 12px;
  padding: 16px;
  text-decoration: none;
  color: inherit;
}
.card p { margin: 8px 0; color: #5c5c66; font-size: 13px; }
.card small { color: #8c8c9a; }
.btnPrimary, .btnSecondary {
  padding: 10px 14px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
}
.btnPrimary { border: none; background: #5c5c9e; color: #fff; }
.btnSecondary { border: 1px solid #e8e8ec; background: #fff; color: #5c5c66; }
.btnPrimary:disabled, .btnSecondary:disabled { opacity: 0.6; cursor: not-allowed; }
.pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-top: 20px;
}
.hint { color: #8c8c9a; }
.error { color: #d14343; }
</style>
