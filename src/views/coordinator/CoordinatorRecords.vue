<template>
  <div class="page" :class="{ mobilePage: isMobile }">
    <div class="header">
      <div>
        <h1 class="title">分成明细</h1>
        <p class="desc">查看订单分成记录</p>
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
      <button class="btnPrimary" :disabled="loading" @click="reload">查询</button>
    </div>

    <DistributionRecordsTable
      :records="records"
      :loading="loading"
      :error="error"
      :page="page"
      :total-pages="totalPages"
      @page-change="changePage"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import DistributionRecordsTable from '../../components/DistributionRecordsTable.vue'
import { distributionApi } from '../../api/services'
import type { DistributionRecordItem } from '../../api/types'
import { ApiError } from '../../api/request'
import { useIsMobile } from '../../composables/useIsMobile'

const records = ref<DistributionRecordItem[]>([])
const { isMobile } = useIsMobile()
const loading = ref(false)
const error = ref('')
const page = ref(1)
const totalPages = ref(1)
const startDate = ref('')
const endDate = ref('')

async function load(pageNo = 1) {
  loading.value = true
  error.value = ''
  try {
    const res = await distributionApi.records({
      page: pageNo,
      pageSize: 20,
      startDate: startDate.value || undefined,
      endDate: endDate.value || undefined,
      sort: '-createdAt'
    })
    records.value = res.list || []
    page.value = res.pagination?.page || pageNo
    totalPages.value = res.pagination?.totalPages || 1
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '记录加载失败'
  } finally {
    loading.value = false
  }
}

function reload() {
  load(1)
}

function changePage(next: number) {
  load(next)
}

onMounted(() => load(1))
</script>

<style scoped>
.page { max-width: 1200px; }
.header { margin-bottom: 24px; }
.title { font-size: 24px; font-weight: 600; color: #1f1f2e; margin-bottom: 8px; }
.desc { font-size: 14px; color: #8c8c9a; }
.toolbar { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
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
@media (max-width: 768px) {
  .page { max-width: none; }.header { margin-bottom: 16px; }.title { font-size: 21px; }
  .toolbar { display: grid; grid-template-columns: 1fr auto 1fr; gap: 8px; }.dateInput { width: 100%; }.toolbar .btnPrimary { grid-column: 1 / -1; width: 100%; }
}
</style>
