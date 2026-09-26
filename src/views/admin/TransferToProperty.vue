<template>
  <div class="page">
    <header class="header">
      <div>
        <h1>转给物业对账</h1>
        <p>住户主动把积分或物业币转给物业，即时扣款、无需审批；物业币仅来源于家庭池。</p>
      </div>
    </header>

    <div class="panel">
      <div class="toolbar">
        <div class="seg">
          <button type="button" class="segBtn" :class="{ active: assetType === 'point' }" @click="switchType('point')">
            积分
          </button>
          <button type="button" class="segBtn" :class="{ active: assetType === 'coin' }" @click="switchType('coin')">
            物业币
          </button>
        </div>
        <input v-model="residentId" class="input" placeholder="住户编号（可选）" @keyup.enter="load(1)" />
        <button type="button" @click="load(1)">查询</button>
      </div>

      <div v-if="loading" class="empty">加载中...</div>
      <div v-else-if="loadError" class="empty error">{{ loadError }}</div>
      <div v-else-if="!list.length" class="empty">暂无转给物业流水</div>
      <div v-else class="tableWrap">
        <table>
          <thead>
            <tr>
              <th>住户</th>
              <th>类型</th>
              <th>数量</th>
              <th>备注</th>
              <th>时间</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in list" :key="item.id">
              <td>
                <strong>{{ item.residentName || '—' }}</strong>
                <small>{{ item.residentPhone || item.residentId || '—' }}</small>
              </td>
              <td>{{ typeLabel(item.type) }}</td>
              <td>{{ formatAmount(item) }}</td>
              <td>{{ item.remark || '—' }}</td>
              <td>{{ item.createdAt || '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <footer class="footer">
        <span>共 {{ total }} 条</span>
        <div v-if="totalPages > 1">
          <button :disabled="page <= 1" @click="load(page - 1)">上一页</button>
          <span>{{ page }} / {{ totalPages }}</span>
          <button :disabled="page >= totalPages" @click="load(page + 1)">下一页</button>
        </div>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { transferToPropertyAdminApi } from '../../api/services'
import { ApiError } from '../../api/request'
import type { TransferToPropertyItem } from '../../api/types'

const PAGE_SIZE = 20
const assetType = ref<'point' | 'coin'>('point')
const residentId = ref('')
const list = ref<TransferToPropertyItem[]>([])
const loading = ref(false)
const loadError = ref('')
const page = ref(1)
const total = ref(0)
const totalPages = ref(1)

function typeLabel(value?: string) {
  if (value === 'coin') return '物业币'
  if (value === 'point') return '积分'
  return assetType.value === 'coin' ? '物业币' : '积分'
}

function formatAmount(item: TransferToPropertyItem) {
  const amount = Number(item.amount)
  if (!Number.isFinite(amount)) return '—'
  const isCoin = (item.type || assetType.value) === 'coin'
  return isCoin ? amount.toFixed(2) : String(Math.round(amount))
}

function switchType(next: 'point' | 'coin') {
  if (assetType.value === next) return
  assetType.value = next
  load(1)
}

async function load(nextPage = page.value) {
  loading.value = true
  loadError.value = ''
  try {
    const params = {
      page: nextPage,
      pageSize: PAGE_SIZE,
      residentId: residentId.value.trim() || undefined
    }
    const result =
      assetType.value === 'coin'
        ? await transferToPropertyAdminApi.coins(params)
        : await transferToPropertyAdminApi.points(params)
    list.value = result.list || []
    page.value = result.pagination?.page ?? nextPage
    total.value = result.pagination?.total ?? list.value.length
    totalPages.value = result.pagination?.totalPages ?? 1
  } catch (error) {
    list.value = []
    loadError.value = error instanceof ApiError ? error.message : '流水加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(() => load(1))
</script>

<style scoped>
.page { max-width: 1100px; }
.header { margin-bottom: 20px; }
h1 { margin: 0 0 8px; font-size: 24px; color: #1f1f2e; }
.header p { margin: 0; color: #8c8c9a; font-size: 14px; }
.panel { overflow: hidden; border-radius: 12px; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,.04); }
.toolbar { display: flex; gap: 12px; flex-wrap: wrap; padding: 16px 20px; border-bottom: 1px solid #f0f0f3; align-items: center; }
.seg { display: inline-flex; border: 1px solid #e8e8ec; border-radius: 8px; overflow: hidden; }
.segBtn { border: none; background: #fff; padding: 8px 14px; cursor: pointer; font-size: 13px; color: #5c5c66; }
.segBtn.active { background: #5c5c9e; color: #fff; }
.input { box-sizing: border-box; min-width: 200px; flex: 1; padding: 10px 12px; border: 1px solid #e8e8ec; border-radius: 8px; }
button { padding: 9px 14px; border: 1px solid #e8e8ec; border-radius: 8px; background: #fff; color: #5c5c66; cursor: pointer; }
button:disabled { opacity: .55; cursor: not-allowed; }
.tableWrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
th, td { padding: 14px 16px; border-bottom: 1px solid #f0f0f3; text-align: left; vertical-align: top; }
th { background: #fafafc; color: #8c8c9a; font-weight: 500; white-space: nowrap; }
td strong, td small { display: block; }
td small { margin-top: 4px; color: #8c8c9a; }
.empty { padding: 40px; text-align: center; color: #8c8c9a; }
.error { color: #e05c5c; }
.footer { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 14px 20px; color: #8c8c9a; font-size: 13px; }
.footer div { display: flex; align-items: center; gap: 10px; }
</style>
