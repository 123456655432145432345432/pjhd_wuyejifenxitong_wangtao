<template>
  <div class="page" :class="{ mobilePage: isMobile }">
    <div class="header">
      <div>
        <h1 class="title">分成明细</h1>
        <p class="desc">订单账面分账记录（待结算口径，以后端返回份额为准）</p>
      </div>
    </div>

    <div class="toolbar">
      <input
        v-if="isPlatformAdmin"
        v-model.trim="propertyCompanyId"
        class="input"
        placeholder="物业公司 ID（可选）"
      />
      <input v-model.trim="orderId" class="input" placeholder="订单 ID（可选）" />
      <input v-model.trim="merchantId" class="input" placeholder="商家 ID（可选）" />
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
import { computed, onMounted, ref } from 'vue'
import DistributionRecordsTable from '../../components/DistributionRecordsTable.vue'
import { distributionApi } from '../../api/services'
import type { DistributionRecordItem } from '../../api/types'
import { formatApiError } from '../../api/request'
import { useIsMobile } from '../../composables/useIsMobile'
import { USER_ROLE } from '../../constants/enums'
import { useAuthStore } from '../../stores/auth'

const auth = useAuthStore()
const { isMobile } = useIsMobile()
const isPlatformAdmin = computed(() => auth.profile?.role === USER_ROLE.PLATFORM_ADMIN)
const useAdminPath = computed(
  () =>
    auth.profile?.role === USER_ROLE.PLATFORM_ADMIN ||
    auth.profile?.role === USER_ROLE.PROPERTY_ADMIN
)

const records = ref<DistributionRecordItem[]>([])
const loading = ref(false)
const error = ref('')
const page = ref(1)
const totalPages = ref(1)
const startDate = ref('')
const endDate = ref('')
const orderId = ref('')
const merchantId = ref('')
const propertyCompanyId = ref(auth.propertyCompanyId || '')

async function load(pageNo = 1) {
  loading.value = true
  error.value = ''
  try {
    const res = await distributionApi.records(
      {
        page: pageNo,
        pageSize: 20,
        orderId: orderId.value || undefined,
        merchantId: merchantId.value || undefined,
        propertyCompanyId: propertyCompanyId.value || auth.propertyCompanyId || undefined,
        startDate: startDate.value || undefined,
        endDate: endDate.value || undefined,
        sort: '-createdAt'
      },
      { adminPath: useAdminPath.value }
    )
    records.value = res.list || []
    page.value = res.pagination?.page || pageNo
    totalPages.value = res.pagination?.totalPages || 1
  } catch (e) {
    // 管理路径失败时回退通用路径（部分环境只开了 /distribution/records）
    if (useAdminPath.value) {
      try {
        const res = await distributionApi.records({
          page: pageNo,
          pageSize: 20,
          orderId: orderId.value || undefined,
          merchantId: merchantId.value || undefined,
          propertyCompanyId: propertyCompanyId.value || auth.propertyCompanyId || undefined,
          startDate: startDate.value || undefined,
          endDate: endDate.value || undefined,
          sort: '-createdAt'
        })
        records.value = res.list || []
        page.value = res.pagination?.page || pageNo
        totalPages.value = res.pagination?.totalPages || 1
        return
      } catch (fallbackError) {
        error.value = formatApiError(fallbackError, '记录加载失败')
        return
      }
    }
    error.value = formatApiError(e, '记录加载失败')
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
.page { max-width: 1280px; }
.header { margin-bottom: 24px; }
.title { font-size: 24px; font-weight: 600; color: #1f1f2e; margin-bottom: 8px; }
.desc { font-size: 14px; color: #8c8c9a; }
.toolbar { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
.input { padding: 8px 12px; border: 1px solid #e8e8ec; border-radius: 8px; background: #fff; font-size: 14px; min-width: 140px; }
.dateInput {
  padding: 6px 4px;
  width: 132px;
  box-sizing: border-box;
  line-height: 1.2;
}
.dateInput.empty { color: transparent; }
.dateInput.empty::-webkit-datetime-edit,
.dateInput.empty::-webkit-datetime-edit-fields-wrapper { padding: 0; opacity: 0; }
.dateInput.empty::-webkit-calendar-picker-indicator { opacity: 1; margin: 0; padding: 0; cursor: pointer; }
.dateInput:not(.empty) { color: #1f1f2e; padding: 6px 8px; }
.sep { color: #8c8c9a; font-size: 13px; }
.btnPrimary { padding: 10px 18px; border-radius: 8px; background: #5c5c9e; color: #fff; border: none; cursor: pointer; }
.btnPrimary:hover { background: #52529a; }
@media (max-width: 768px) {
  .page { max-width: none; }
  .header { margin-bottom: 16px; }
  .title { font-size: 21px; }
  .toolbar { display: grid; grid-template-columns: 1fr; gap: 8px; }
  .input, .dateInput { width: 100%; min-width: 0; }
  .toolbar .btnPrimary { width: 100%; }
}
</style>
