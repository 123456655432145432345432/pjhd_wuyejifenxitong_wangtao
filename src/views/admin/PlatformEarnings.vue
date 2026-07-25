<template>
  <div class="page">
    <div class="header">
      <div>
        <h1 class="title">平台收益</h1>
        <p class="desc">查看平台管理员在订单分成、配送费、提现手续费三条链路的收益统计与明细</p>
      </div>
    </div>

    <div class="tabs">
      <button class="tab" :class="{ active: tab === 'stats' }" @click="tab = 'stats'">收益统计</button>
      <button class="tab" :class="{ active: tab === 'records' }" @click="tab = 'records'">收益明细</button>
    </div>

    <div class="toolbar">
      <select v-model="selectedPropertyId" class="input">
        <option value="">全部物业</option>
        <option v-for="property in propertyCompanies" :key="property.id" :value="property.id">
          {{ property.name }}
        </option>
      </select>
      <input v-model="startDate" type="date" class="input dateInput" />
      <span class="sep">至</span>
      <input v-model="endDate" type="date" class="input dateInput" />
      <select v-if="tab === 'records'" v-model="filterType" class="input">
        <option v-for="opt in PLATFORM_EARNING_TYPE_OPTIONS" :key="opt.value || 'all'" :value="opt.value">
          {{ opt.label }}
        </option>
      </select>
      <button class="btnPrimary" :disabled="loading" @click="reload">查询</button>
    </div>

    <div v-if="loading" class="loading">加载中...</div>
    <p v-else-if="error" class="error">{{ error }}</p>

    <template v-else-if="tab === 'stats' && stats">
      <div class="stats">
        <div class="statCard purple">
          <div class="label">订单分成</div>
          <div class="value">¥{{ formatMoney(stats.totalPlatformShare) }}</div>
        </div>
        <div class="statCard">
          <div class="label">配送费分成</div>
          <div class="value">¥{{ formatMoney(stats.totalDeliveryEarning) }}</div>
        </div>
        <div class="statCard">
          <div class="label">提现手续费分成</div>
          <div class="value">¥{{ formatMoney(stats.totalWithdrawalFeeShare) }}</div>
        </div>
        <div class="statCard green">
          <div class="label">总收益</div>
          <div class="value">¥{{ formatMoney(stats.totalEarning) }}</div>
        </div>
      </div>
      <div class="card">
        <h3 class="cardTitle">按物业分布</h3>
        <ul v-if="stats.byProperty?.length" class="list">
          <li v-for="item in stats.byProperty" :key="item.propertyCompanyId">
            <span>{{ item.propertyName || item.propertyCompanyId }}</span>
            <span class="amounts">
              订单 ¥{{ formatMoney(item.platformShare) }} ·
              配送 ¥{{ formatMoney(item.deliveryEarning) }} ·
              提现 ¥{{ formatMoney(item.withdrawalFeeShare) }}
            </span>
          </li>
        </ul>
        <p v-else class="empty">暂无数据</p>
      </div>
    </template>

    <template v-else-if="tab === 'records'">
      <div class="panel">
        <table v-if="records.length" class="table">
          <thead>
            <tr>
              <th>时间</th>
              <th>类型</th>
              <th>物业</th>
              <th>金额</th>
              <th>关联单号</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in records" :key="item.id">
              <td>{{ item.createdAt || '—' }}</td>
              <td>{{ getEnumLabel(PLATFORM_EARNING_TYPE_LABEL, item.type) }}</td>
              <td>{{ item.propertyName || item.propertyCompanyId || '—' }}</td>
              <td>¥{{ formatMoney(item.amount) }}</td>
              <td>{{ item.orderId || item.withdrawalId || '—' }}</td>
            </tr>
          </tbody>
        </table>
        <p v-else class="empty">暂无明细</p>
        <div v-if="totalPages > 1" class="pager">
          <button class="pageBtn" :disabled="page <= 1" @click="changePage(page - 1)">&lt;</button>
          <span>{{ page }} / {{ totalPages }}</span>
          <button class="pageBtn" :disabled="page >= totalPages" @click="changePage(page + 1)">&gt;</button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { platformShareApi, propertyCompanyApi } from '../../api/services'
import type {
  PlatformEarningsStats,
  PlatformEarningRecordItem,
  PropertyCompanyItem
} from '../../api/types'
import { ApiError } from '../../api/request'
import {
  getEnumLabel,
  PLATFORM_EARNING_TYPE_LABEL,
  PLATFORM_EARNING_TYPE_OPTIONS
} from '../../constants/enums'

const tab = ref<'stats' | 'records'>('stats')
const loading = ref(false)
const error = ref('')
const startDate = ref('')
const endDate = ref('')
const filterType = ref('')
const selectedPropertyId = ref('')
const propertyCompanies = ref<PropertyCompanyItem[]>([])

const stats = ref<PlatformEarningsStats | null>(null)
const records = ref<PlatformEarningRecordItem[]>([])
const page = ref(1)
const totalPages = ref(1)

function formatMoney(val?: number) {
  if (val === undefined || val === null) return '0.00'
  return Number(val).toFixed(2)
}

async function loadStats() {
  loading.value = true
  error.value = ''
  try {
    stats.value = await platformShareApi.earningsStats({
      propertyCompanyId: selectedPropertyId.value || undefined,
      startDate: startDate.value || undefined,
      endDate: endDate.value || undefined
    })
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '统计加载失败'
  } finally {
    loading.value = false
  }
}

async function loadRecords(pageNo = 1) {
  loading.value = true
  error.value = ''
  try {
    const res = await platformShareApi.earningsRecords({
      page: pageNo,
      pageSize: 20,
      propertyCompanyId: selectedPropertyId.value || undefined,
      type: filterType.value || undefined,
      startDate: startDate.value || undefined,
      endDate: endDate.value || undefined
    })
    records.value = res.list || []
    page.value = res.pagination?.page ?? pageNo
    totalPages.value = res.pagination?.totalPages ?? 1
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '明细加载失败'
  } finally {
    loading.value = false
  }
}

function reload() {
  if (tab.value === 'stats') loadStats()
  else loadRecords(1)
}

function changePage(next: number) {
  loadRecords(next)
}

watch(tab, () => reload())

async function loadPropertyCompanies() {
  try {
    const res = await propertyCompanyApi.list({ pageSize: 100 })
    propertyCompanies.value = res.list || []
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '物业列表加载失败'
  }
}

onMounted(async () => {
  await loadPropertyCompanies()
  await reload()
})
</script>

<style scoped>
.page { max-width: 1200px; }
.header { margin-bottom: 24px; }
.title { font-size: 24px; font-weight: 600; color: #1f1f2e; margin-bottom: 8px; }
.desc { font-size: 14px; color: #8c8c9a; }
.tabs { display: flex; gap: 8px; margin-bottom: 16px; }
.tab { padding: 8px 16px; border-radius: 8px; border: 1px solid #e8e8ec; background: #fff; cursor: pointer; font-size: 14px; }
.tab.active { background: #5c5c9e; color: #fff; border-color: #5c5c9e; }
.toolbar { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
.input { padding: 8px 12px; border: 1px solid #e8e8ec; border-radius: 8px; font-size: 14px; }
.dateInput { width: 140px; }
.sep { color: #8c8c9a; font-size: 13px; }
.btnPrimary { padding: 10px 18px; border-radius: 8px; background: #5c5c9e; color: #fff; border: none; cursor: pointer; }
.loading, .error, .empty { font-size: 14px; color: #8c8c9a; text-align: center; padding: 24px 0; }
.error { color: #e05c5c; }
.stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 20px; }
.statCard { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.statCard.purple .value { color: #5c5c9e; }
.statCard.green .value { color: #3aaf7d; }
.statCard .label { font-size: 13px; color: #8c8c9a; margin-bottom: 8px; }
.statCard .value { font-size: 24px; font-weight: 600; }
.card, .panel { background: #fff; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.cardTitle { font-size: 16px; font-weight: 600; margin-bottom: 16px; }
.list { list-style: none; }
.list li { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f0f0f3; font-size: 14px; flex-wrap: wrap; gap: 8px; }
.amounts { color: #5c5c66; font-size: 13px; }
.table { width: 100%; border-collapse: collapse; font-size: 14px; }
.table th, .table td { padding: 12px 16px; text-align: left; border-bottom: 1px solid #f0f0f3; }
.table th { color: #8c8c9a; font-weight: 500; background: #fafafc; }
.pager { display: flex; align-items: center; justify-content: center; gap: 12px; margin-top: 16px; }
.pageBtn { padding: 6px 12px; border: 1px solid #e8e8ec; border-radius: 8px; background: #fff; cursor: pointer; }
@media (max-width: 960px) { .stats { grid-template-columns: repeat(2, 1fr); } }
</style>
