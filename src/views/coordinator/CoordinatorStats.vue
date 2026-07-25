<template>
  <div class="page" :class="{ mobilePage: isMobile }">
    <div class="header">
      <div>
        <h1 class="title">分成统计</h1>
        <p class="desc">查看统筹分成汇总数据</p>
      </div>
    </div>

    <div class="toolbar">
      <input
        v-model="startDate"
        type="date"
        class="input dateInput"
        :class="{ empty: !startDate }"
      />
      <span class="sep">至</span>
      <input
        v-model="endDate"
        type="date"
        class="input dateInput"
        :class="{ empty: !endDate }"
      />
      <button class="btnPrimary" :disabled="loading" @click="load">查询</button>
    </div>

    <div v-if="loading" class="loading">加载中...</div>
    <p v-else-if="error" class="error">{{ error }}</p>
    <template v-else-if="stats">
      <div class="stats">
        <div class="statCard purple">
          <div class="label">可分配总额</div>
          <div class="value">¥{{ formatMoney(stats.summary?.totalDistributableAmount) }}</div>
        </div>
        <div class="statCard">
          <div class="label">物业分成</div>
          <div class="value">¥{{ formatMoney(stats.summary?.propertyAmount) }}</div>
        </div>
        <div class="statCard green">
          <div class="label">统筹分成</div>
          <div class="value">¥{{ formatMoney(stats.summary?.coordinatorAmount) }}</div>
        </div>
        <div class="statCard">
          <div class="label">板块分成</div>
          <div class="value">¥{{ formatMoney(stats.summary?.sectorLeaderAmount) }}</div>
        </div>
        <div class="statCard orange">
          <div class="label">平台分成</div>
          <div class="value">¥{{ formatMoney(stats.summary?.platformAmount) }}</div>
        </div>
      </div>

      <div class="grid">
        <div class="card">
          <h3 class="cardTitle">按板块</h3>
          <ul v-if="stats.bySector?.length" class="list">
            <li v-for="item in stats.bySector" :key="item.sector || item.sectorName">
              <span>{{ item.sectorName || item.sector }}</span>
              <strong>¥{{ formatMoney(item.amount) }}</strong>
            </li>
          </ul>
          <p v-else class="empty">暂无数据</p>
        </div>
        <div class="card">
          <h3 class="cardTitle">按统筹负责人</h3>
          <ul v-if="stats.byCoordinator?.length" class="list">
            <li v-for="item in stats.byCoordinator" :key="item.coordinatorId || item.name">
              <span>{{ item.name || item.coordinatorId }}</span>
              <strong>¥{{ formatMoney(item.amount) }}</strong>
            </li>
          </ul>
          <p v-else class="empty">暂无数据</p>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { distributionApi } from '../../api/services'
import type { DistributionStats } from '../../api/types'
import { ApiError } from '../../api/request'
import { useIsMobile } from '../../composables/useIsMobile'

const stats = ref<DistributionStats | null>(null)
const { isMobile } = useIsMobile()
const loading = ref(false)
const error = ref('')
const startDate = ref('')
const endDate = ref('')

function formatMoney(value?: number) {
  if (value === undefined || value === null) return '0.00'
  return Number(value).toFixed(2)
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    stats.value = await distributionApi.stats({
      startDate: startDate.value || undefined,
      endDate: endDate.value || undefined
    })
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '统计数据加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.page { max-width: 1200px; }
.header { margin-bottom: 24px; }
.title { font-size: 24px; font-weight: 600; color: #1f1f2e; margin-bottom: 8px; }
.desc { font-size: 14px; color: #8c8c9a; }
.toolbar { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
.input { padding: 8px 12px; border: 1px solid #e8e8ec; border-radius: 8px; background: #fff; font-size: 14px; }
.dateInput {
  padding: 6px 4px;
  width: 132px;
  box-sizing: border-box;
  line-height: 1.2;
}
.dateInput.empty {
  color: transparent;
}
.dateInput.empty::-webkit-datetime-edit,
.dateInput.empty::-webkit-datetime-edit-fields-wrapper {
  padding: 0;
  opacity: 0;
}
.dateInput.empty::-webkit-calendar-picker-indicator {
  opacity: 1;
  margin: 0;
  padding: 0;
  cursor: pointer;
}
.dateInput:not(.empty) {
  color: #1f1f2e;
  padding: 6px 8px;
}
.dateInput:not(.empty)::-webkit-datetime-edit {
  padding: 0;
}
.dateInput:not(.empty)::-webkit-calendar-picker-indicator {
  margin-left: 4px;
  cursor: pointer;
}
.sep { color: #8c8c9a; font-size: 13px; }
.btnPrimary { padding: 10px 18px; border-radius: 8px; background: #5c5c9e; color: #fff; border: none; cursor: pointer; }
.btnPrimary:hover { background: #52529a; }
.loading, .error, .empty { font-size: 14px; color: #8c8c9a; }
.error { color: #e05c5c; }
.stats { display: grid; grid-template-columns: repeat(5, 1fr); gap: 16px; margin-bottom: 20px; }
.statCard.orange .value { color: #e6953a; }
.statCard { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.statCard.purple .value { color: #5c5c9e; }
.statCard.green .value { color: #3aaf7d; }
.statCard .label { font-size: 13px; color: #8c8c9a; margin-bottom: 8px; }
.statCard .value { font-size: 24px; font-weight: 600; }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.card { background: #fff; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.cardTitle { font-size: 16px; font-weight: 600; margin-bottom: 16px; }
.list { list-style: none; }
.list li { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f0f0f3; font-size: 14px; }
@media (max-width: 960px) {
  .stats { grid-template-columns: repeat(2, 1fr); }
  .grid { grid-template-columns: 1fr; }
}
@media (max-width: 768px) {
  .page { max-width: none; }.header { margin-bottom: 16px; }.title { font-size: 21px; }
  .toolbar { display: grid; grid-template-columns: 1fr auto 1fr; gap: 8px; }.dateInput { width: 100%; }.toolbar .btnPrimary { grid-column: 1 / -1; width: 100%; }
  .stats, .grid { grid-template-columns: 1fr; gap: 12px; }.statCard, .card { padding: 16px; border-radius: 14px; }
}
</style>
