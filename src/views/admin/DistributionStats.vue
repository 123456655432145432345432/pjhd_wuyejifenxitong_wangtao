<template>
  <div class="page" :class="{ mobilePage: isMobile }">
    <div class="header">
      <div>
        <h1 class="title">分成统计</h1>
        <p class="desc">账面分账汇总（待结算口径，非通道实时到账）</p>
      </div>
    </div>

    <div class="toolbar">
      <input
        v-if="isPlatformAdmin"
        v-model.trim="propertyCompanyId"
        class="input"
        placeholder="物业公司编号（可选）"
      />
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

    <p class="ledgerHint">
      商品分账与配送分账分别统计；“—”表示后端尚未返回该统计字段，前端不通过明细分页自行累加。
      公司商品收入 platformShare 与公司配送收入 platformDeliveryShare 不得合并。
    </p>

    <div v-if="loading" class="loading">加载中...</div>
    <p v-else-if="error" class="error">{{ error }}</p>
    <template v-else-if="stats">
      <div class="stats">
        <div class="statCard">
          <div class="label">商品金额</div>
          <div class="value">{{ formatOptionalMoney(stats.summary?.productAmount) }}</div>
        </div>
        <div class="statCard">
          <div class="label">订单总额（含配送费）</div>
          <div class="value">{{ formatOptionalMoney(stats.summary?.totalOrderAmount) }}</div>
        </div>
        <div class="statCard purple">
          <div class="label">可分配/平台盘总额</div>
          <div class="value">¥{{ formatMoney(stats.summary?.totalDistributableAmount) }}</div>
        </div>
        <div class="statCard">
          <div class="label">商家商品收入</div>
          <div class="value">{{ formatOptionalMoney(stats.summary?.merchantGoodsAmount) }}</div>
        </div>
        <div class="statCard">
          <div class="label">商家配送补贴</div>
          <div class="value">{{ formatOptionalMoney(stats.summary?.merchantDeliverySubsidyAmount) }}</div>
        </div>
        <div class="statCard">
          <div class="label">商家最终实得</div>
          <div class="value">{{ formatOptionalMoney(stats.summary?.merchantAmount) }}</div>
        </div>
        <div class="statCard">
          <div class="label">公司商品收入</div>
          <div class="value">{{ formatOptionalMoney(stats.summary?.platformAmount) }}</div>
        </div>
        <div class="statCard">
          <div class="label">公司配送收入</div>
          <div class="value">{{ formatOptionalMoney(stats.summary?.platformDeliveryAmount) }}</div>
        </div>
        <div class="statCard">
          <div class="label">配送员收入</div>
          <div class="value">{{ formatOptionalMoney(stats.summary?.courierAmount) }}</div>
        </div>
        <div class="statCard">
          <div class="label">成本击穿</div>
          <div class="value">{{ formatOptionalMoney(stats.summary?.deficitAmount) }}</div>
        </div>
        <div class="statCard">
          <div class="label">冲正金额</div>
          <div class="value">{{ formatOptionalMoney(stats.summary?.reversalAmount) }}</div>
        </div>
        <div class="statCard">
          <div class="label">物业分成</div>
          <div class="value">¥{{ formatMoney(stats.summary?.propertyAmount) }}</div>
        </div>
        <div class="statCard">
          <div class="label">管理盘合计</div>
          <div class="value">{{ formatOptionalMoney(stats.summary?.managementPoolAmount) }}</div>
        </div>
        <div class="statCard green">
          <div class="label">统筹分成</div>
          <div class="value">¥{{ formatMoney(stats.summary?.coordinatorAmount) }}</div>
        </div>
        <div class="statCard">
          <div class="label">板块分成</div>
          <div class="value">¥{{ formatMoney(stats.summary?.sectorLeaderAmount) }}</div>
        </div>
        <div class="statCard">
          <div class="label">个体分成</div>
          <div class="value">¥{{ formatMoney(stats.summary?.individualLeaderAmount) }}</div>
        </div>
      </div>

      <div class="grid">
        <div class="card">
          <h3 class="cardTitle">按物业</h3>
          <ul v-if="stats.byProperty?.length" class="list">
            <li v-for="item in stats.byProperty" :key="item.propertyCompanyId || item.propertyName">
              <span>{{ item.propertyName || item.propertyCompanyId }}</span>
              <strong>¥{{ formatMoney(item.amount) }}</strong>
            </li>
          </ul>
          <p v-else class="empty">暂无数据</p>
        </div>
        <div class="card">
          <h3 class="cardTitle">按区块</h3>
          <ul v-if="stats.bySector?.length" class="list">
            <li
              v-for="item in stats.bySector"
              :key="item.sectorLeaderId || item.sector || item.sectorName"
            >
              <span>{{ item.sectorName || item.sector || item.sectorLeaderId }}</span>
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
import { computed, onMounted, ref } from 'vue'
import { distributionApi } from '../../api/services'
import type { DistributionStats } from '../../api/types'
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

const stats = ref<DistributionStats | null>(null)
const loading = ref(false)
const error = ref('')
const startDate = ref('')
const endDate = ref('')
const propertyCompanyId = ref(auth.propertyCompanyId || '')

function formatMoney(value?: number) {
  if (value === undefined || value === null || Number.isNaN(Number(value))) return '0.00'
  return Number(value).toFixed(2)
}

function formatOptionalMoney(value?: number) {
  if (value === undefined || value === null || Number.isNaN(Number(value))) return '—'
  return `¥${Number(value).toFixed(2)}`
}

async function load() {
  loading.value = true
  error.value = ''
  // detail：与 summary 同填 5 项，并返回 byProperty / byCoordinator / bySector
  const params = {
    startDate: startDate.value || undefined,
    endDate: endDate.value || undefined,
    propertyCompanyId: propertyCompanyId.value || auth.propertyCompanyId || undefined,
    dimension: 'detail'
  }
  try {
    stats.value = await distributionApi.stats(params, { adminPath: useAdminPath.value })
  } catch (e) {
    if (useAdminPath.value) {
      try {
        stats.value = await distributionApi.stats(params)
        return
      } catch (fallbackError) {
        error.value = formatApiError(fallbackError, '统计数据加载失败')
        return
      }
    }
    error.value = formatApiError(e, '统计数据加载失败')
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
.toolbar { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; flex-wrap: wrap; }
.ledgerHint { margin: 0 0 16px; font-size: 13px; color: #8a6d1d; line-height: 1.5; }
.input { padding: 8px 12px; border: 1px solid #e8e8ec; border-radius: 8px; background: #fff; font-size: 14px; min-width: 160px; }
.dateInput { padding: 6px 4px; width: 132px; box-sizing: border-box; line-height: 1.2; }
.dateInput.empty { color: transparent; }
.dateInput.empty::-webkit-datetime-edit,
.dateInput.empty::-webkit-datetime-edit-fields-wrapper { padding: 0; opacity: 0; }
.dateInput.empty::-webkit-calendar-picker-indicator { opacity: 1; margin: 0; padding: 0; cursor: pointer; }
.dateInput:not(.empty) { color: #1f1f2e; padding: 6px 8px; }
.sep { color: #8c8c9a; font-size: 13px; }
.btnPrimary { padding: 10px 18px; border-radius: 8px; background: #5c5c9e; color: #fff; border: none; cursor: pointer; }
.loading, .error, .empty { font-size: 14px; color: #8c8c9a; }
.error { color: #e05c5c; }
.stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 16px; margin-bottom: 20px; }
.statCard { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.statCard.purple .value { color: #5c5c9e; }
.statCard.green .value { color: #3aaf7d; }
.statCard .label { font-size: 13px; color: #8c8c9a; margin-bottom: 8px; }
.statCard .value { font-size: 22px; font-weight: 600; }
.grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
.card { background: #fff; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.cardTitle { font-size: 16px; font-weight: 600; margin-bottom: 16px; }
.list { list-style: none; padding: 0; margin: 0; }
.list li { display: flex; justify-content: space-between; gap: 12px; padding: 10px 0; border-bottom: 1px solid #f0f0f3; font-size: 14px; }
@media (max-width: 960px) {
  .grid { grid-template-columns: 1fr; }
}
@media (max-width: 768px) {
  .page { max-width: none; }
  .toolbar { display: grid; grid-template-columns: 1fr; }
  .input, .dateInput { width: 100%; min-width: 0; }
  .toolbar .btnPrimary { width: 100%; }
}
</style>
