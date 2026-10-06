<template>
  <div class="page" :class="{ mobilePage: isMobile }">
    <div class="header">
      <div>
        <h1 class="title">楼长分成明细</h1>
        <p class="desc">本楼栋订单产生的楼长分成分项。负数表示退款冲账。</p>
      </div>
    </div>

    <p v-if="notLeader" class="blockHint">{{ notLeader }}</p>

    <DistributionRecordsTable
      :records="records"
      :loading="loading"
      :error="error"
      :page="page"
      :total-pages="totalPages"
      :show-resident="false"
      @page-change="changePage"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import DistributionRecordsTable from '../../components/DistributionRecordsTable.vue'
import { buildingLeaderPortalApi } from '../../api/services'
import type { DistributionRecordItem } from '../../api/types'
import { ApiError } from '../../api/request'
import { useIsMobile } from '../../composables/useIsMobile'

const { isMobile } = useIsMobile()
const records = ref<DistributionRecordItem[]>([])
const loading = ref(false)
const error = ref('')
const notLeader = ref('')
const page = ref(1)
const totalPages = ref(1)

async function load(pageNo = 1) {
  loading.value = true
  error.value = ''
  notLeader.value = ''
  try {
    const res = await buildingLeaderPortalApi.distributionRecords({ page: pageNo, pageSize: 20 })
    records.value = res.list || []
    page.value = res.pagination?.page || pageNo
    totalPages.value = res.pagination?.totalPages || 1
  } catch (e) {
    if (e instanceof ApiError && e.code === 91004) {
      notLeader.value = e.message || '当前账号不是启用中的单元楼长'
    } else {
      error.value = e instanceof ApiError ? e.message : '记录加载失败'
    }
  } finally {
    loading.value = false
  }
}

function changePage(next: number) {
  load(next)
}

onMounted(() => load(1))
</script>

<style scoped>
.page { max-width: 1200px; }
.mobilePage { max-width: none; }
.header { margin-bottom: 24px; }
.title { font-size: 24px; font-weight: 600; color: #1f1f2e; margin-bottom: 8px; }
.desc { font-size: 14px; color: #8c8c9a; }
.blockHint { margin: 0 0 16px; font-size: 14px; color: #e05c5c; background: #fff; border-radius: 12px; padding: 16px 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
@media (max-width: 768px) {
  .header { margin-bottom: 16px; }
  .title { font-size: 21px; }
}
</style>
