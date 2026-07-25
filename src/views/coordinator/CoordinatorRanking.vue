<template>
  <div class="page" :class="{ mobilePage: isMobile }">
    <div class="header">
      <div>
        <h1 class="title">商家排名</h1>
        <p class="desc">调整官方推荐商家展示顺序，数值越小越靠前</p>
      </div>
      <button class="btnPrimary" :disabled="loading || saving || !dirty" @click="saveAll">
        {{ saving ? '保存中...' : '保存排序' }}
      </button>
    </div>

    <p v-if="success" class="bannerSuccess">{{ success }}</p>
    <p v-if="error" class="error">{{ error }}</p>

    <div class="panel">
      <div v-if="loading" class="loading">加载中...</div>
      <table v-else-if="rows.length" class="table" :class="{ mobileCards: isMobile }">
        <thead>
          <tr>
            <th>当前序号</th>
            <th>商家名称</th>
            <th>等级</th>
            <th>分类</th>
            <th>排名权重</th>
            <th>调整</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, index) in rows" :key="item.id">
            <td>{{ index + 1 }}</td>
            <td>{{ item.name }}</td>
            <td>{{ getEnumLabel(MERCHANT_LEVEL_LABEL, item.merchantLevel) }}</td>
            <td>{{ item.category || '—' }}</td>
            <td>
              <input
                v-model.number="item.rankOrder"
                type="number"
                min="1"
                class="rankInput"
                @change="markDirty"
              />
            </td>
            <td class="actions">
              <button class="btnGhost" :disabled="index === 0" @click="move(index, -1)">上移</button>
              <button class="btnGhost" :disabled="index === rows.length - 1" @click="move(index, 1)">下移</button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else class="empty">暂无可排序商家</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { merchantApi } from '../../api/services'
import type { MerchantItem } from '../../api/types'
import { ApiError } from '../../api/request'
import { getEnumLabel, MERCHANT_LEVEL_LABEL } from '../../constants/enums'
import { useIsMobile } from '../../composables/useIsMobile'

interface RankRow extends MerchantItem {
  rankOrder: number
}

const rows = ref<RankRow[]>([])
const { isMobile } = useIsMobile()
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const success = ref('')
const dirty = ref(false)

function markDirty() {
  dirty.value = true
  success.value = ''
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await merchantApi.list({ page: 1, pageSize: 100, sort: '+rankOrder' })
    rows.value = (res.list || []).map((item, index) => ({
      ...item,
      rankOrder: item.rankOrder ?? index + 1
    }))
    dirty.value = false
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '商家列表加载失败'
  } finally {
    loading.value = false
  }
}

function move(index: number, delta: number) {
  const target = index + delta
  if (target < 0 || target >= rows.value.length) return
  const list = [...rows.value]
  const current = list[index]
  list[index] = list[target]
  list[target] = current
  list.forEach((item, idx) => {
    item.rankOrder = idx + 1
  })
  rows.value = list
  markDirty()
}

async function saveAll() {
  saving.value = true
  error.value = ''
  success.value = ''
  try {
    await Promise.all(
      rows.value.map((item) =>
        merchantApi.update(item.id, { rankOrder: item.rankOrder })
      )
    )
    dirty.value = false
    success.value = '排名已保存'
    await load()
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '保存失败，请确认是否有排名调整权限'
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.page { max-width: 1200px; }
.header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 24px; }
.title { font-size: 24px; font-weight: 600; color: #1f1f2e; margin-bottom: 8px; }
.desc { font-size: 14px; color: #8c8c9a; }
.btnPrimary { padding: 10px 18px; border-radius: 8px; background: #5c5c9e; color: #fff; border: none; cursor: pointer; }
.btnPrimary:hover { background: #52529a; }
.btnPrimary:disabled { opacity: 0.5; cursor: not-allowed; }
.bannerSuccess { background: #f6ffed; color: #389e0d; padding: 10px 14px; border-radius: 8px; margin-bottom: 12px; font-size: 13px; }
.error { color: #e05c5c; font-size: 14px; margin-bottom: 12px; }
.panel { background: #fff; border-radius: 12px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.table { width: 100%; border-collapse: collapse; font-size: 14px; }
.table th, .table td { padding: 12px 10px; border-bottom: 1px solid #f0f0f3; text-align: left; }
.table th { color: #8c8c9a; font-weight: 500; }
.rankInput { width: 80px; padding: 6px 8px; border: 1px solid #e8e8ec; border-radius: 6px; }
.actions { display: flex; gap: 8px; }
.btnGhost { padding: 6px 10px; border-radius: 6px; border: 1px solid #e8e8ec; background: #fff; color: #5c5c66; font-size: 14px; cursor: pointer; }
.btnGhost:hover:not(:disabled) { border-color: #5c5c9e; color: #5c5c9e; }
.btnGhost:disabled { opacity: 0.4; cursor: not-allowed; }
.loading, .empty { font-size: 14px; color: #8c8c9a; padding: 12px 0; }
@media (max-width: 768px) {
  .page { max-width: none; }
  .header { flex-direction: column; margin-bottom: 16px; }
  .title { font-size: 21px; }
  .header .btnPrimary { width: 100%; }
  .panel { padding: 12px; border-radius: 14px; }
  .mobileCards thead { display: none; }
  .mobileCards, .mobileCards tbody, .mobileCards tr, .mobileCards td { display: block; width: 100%; }
  .mobileCards tr { padding: 12px 0; border-bottom: 1px solid #f0f0f3; }
  .mobileCards td { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 6px 0; }
  .mobileCards td::before { color: #8c8c9a; }
  .mobileCards td:nth-child(1)::before { content: '当前序号'; }
  .mobileCards td:nth-child(2)::before { content: '商家名称'; }
  .mobileCards td:nth-child(3)::before { content: '等级'; }
  .mobileCards td:nth-child(4)::before { content: '分类'; }
  .mobileCards td:nth-child(5)::before { content: '排名权重'; }
  .mobileCards td:nth-child(6)::before { content: '调整'; }
  .actions { justify-content: flex-end; }
}
</style>
