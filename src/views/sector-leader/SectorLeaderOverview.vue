<template>
  <div class="page" :class="{ mobile: isMobile }">
    <div class="header">
      <div>
        <h1 class="title">工作台</h1>
        <p class="desc">板块负责人工作概览 · {{ sectorLabel }}</p>
      </div>
    </div>

    <p v-if="portal.loadError" class="bannerWarn">{{ portal.loadError }}，已展示登录缓存信息</p>

    <div v-if="loading" class="loading">加载中...</div>
    <template v-else>
      <div class="stats">
        <div class="statCard purple">
          <div class="label">负责人</div>
          <div class="value small">{{ displayName }}</div>
        </div>
        <div class="statCard">
          <div class="label">负责板块</div>
          <div class="value small">{{ sectorLabel }}</div>
        </div>
        <div class="statCard green">
          <div class="label">板块商家</div>
          <div class="value">{{ merchantCount }}</div>
        </div>
        <div class="statCard">
          <div class="label">进行中特惠</div>
          <div class="value">{{ activeOfferCount }}</div>
        </div>
      </div>

      <div class="grid">
        <div class="card">
          <h3 class="cardTitle">板块信息</h3>
          <ul class="infoList">
            <li><span>所属物业</span><strong>{{ propertyName }}</strong></li>
            <li><span>联系电话</span><strong>{{ phone || '—' }}</strong></li>
            <li><span>统筹负责人</span><strong>{{ coordinatorName }}</strong></li>
            <li><span>个体负责人</span><strong>{{ individualLeaderCount }} 人</strong></li>
            <li><span>累计收益</span><strong>¥{{ formatMoney(totalEarnings) }}</strong></li>
            <li><span>可提现</span><strong>¥{{ formatMoney(withdrawableAmount) }}</strong></li>
          </ul>
        </div>
        <div v-if="earningsRecords.length" class="card">
          <h3 class="cardTitle">收益明细</h3>
          <ul class="earningsList">
            <li v-for="(rec, idx) in earningsRecords" :key="rec.id || idx">
              <span>{{ rec.description || rec.type || '收益' }}</span>
              <strong>¥{{ formatMoney(rec.amount) }}</strong>
              <time>{{ rec.createdAt || '' }}</time>
            </li>
          </ul>
        </div>
        <div class="card">
          <h3 class="cardTitle">快捷入口</h3>
          <div class="actions">
            <RouterLink class="actionBtn" :to="{ name: 'sector-leader-merchants' }">管理板块商家</RouterLink>
            <RouterLink class="actionBtn" :to="{ name: 'sector-leader-ranking' }">调整板块排名</RouterLink>
            <RouterLink class="actionBtn" :to="{ name: 'sector-leader-offers' }">发布板块特惠</RouterLink>
            <RouterLink class="actionBtn" :to="{ name: 'transfer-accounts' }">收款方式</RouterLink>
          </div>
          <ul class="tips">
            <li>管理本板块下的商家，有权踢出不合格商家</li>
            <li>拖拽或调整商家排名，控制业主端展示顺序</li>
            <li>为本板块商家创建特惠推送，提升社区消费</li>
          </ul>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { sectorLeaderPortalApiExt } from '../../api/services'
import { useAuthStore } from '../../stores/auth'
import { useSectorLeaderPortalStore } from '../../stores/sectorLeaderPortal'
import { getEnumLabel, SECTOR_TYPE_LABEL } from '../../constants/enums'
import { useIsMobile } from '../../composables/useIsMobile'

const auth = useAuthStore()
const portal = useSectorLeaderPortalStore()
const { isMobile } = useIsMobile()
const loading = ref(false)

const detail = computed(() => portal.detail)
const displayName = computed(
  () => detail.value?.residentName || auth.username || '—'
)
const sectorLabel = computed(() => {
  if (detail.value?.sectorName) return detail.value.sectorName
  return getEnumLabel(SECTOR_TYPE_LABEL, detail.value?.sector, '—')
})
const propertyName = computed(() => detail.value?.propertyCompanyName || '—')
const phone = computed(() => detail.value?.phone || detail.value?.residentPhone || '')
const coordinatorName = computed(() => detail.value?.coordinatorName || '—')
const individualLeaderCount = computed(() => detail.value?.individualLeaderCount ?? 0)
const merchantCount = computed(() => detail.value?.merchantCount ?? 0)
const activeOfferCount = computed(() => detail.value?.activeSpecialOfferCount ?? 0)
const totalEarnings = computed(() => earnings.value?.totalEarnings ?? detail.value?.totalEarnings)
const withdrawableAmount = computed(() => earnings.value?.withdrawableAmount)
const earningsRecords = computed(() => earnings.value?.records || [])

const earnings = ref<{ totalEarnings?: number; withdrawableAmount?: number; records?: Array<{ id?: string; amount?: number; type?: string; description?: string; createdAt?: string }> } | null>(null)

function formatMoney(value?: number) {
  if (value === undefined || value === null) return '0.00'
  return Number(value).toFixed(2)
}

async function loadStats() {
  loading.value = true
  try {
    await portal.loadMy()
    const id = portal.detail?.id
    if (id) {
      earnings.value = await sectorLeaderPortalApiExt.getEarnings(id)
    }
  } finally {
    loading.value = false
  }
}

onMounted(loadStats)
</script>

<style scoped>
.page { max-width: 1200px; }
.header { margin-bottom: 24px; }
.title { font-size: 24px; font-weight: 600; color: #1f1f2e; margin-bottom: 8px; }
.desc { font-size: 14px; color: #8c8c9a; }
.bannerWarn { background: #fff7e6; color: #ad6800; padding: 10px 14px; border-radius: 8px; margin-bottom: 16px; font-size: 13px; }
.loading { color: #8c8c9a; font-size: 14px; }
.stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 20px; }
.statCard { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.statCard.purple .value { color: #5c5c9e; }
.statCard.green .value { color: #3aaf7d; }
.statCard .label { font-size: 13px; color: #8c8c9a; margin-bottom: 8px; }
.statCard .value { font-size: 28px; font-weight: 600; color: #1f1f2e; }
.statCard .value.small { font-size: 18px; }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.card { background: #fff; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.cardTitle { font-size: 16px; font-weight: 600; margin-bottom: 16px; }
.infoList { list-style: none; }
.infoList li { display: flex; justify-content: space-between; gap: 16px; padding: 10px 0; border-bottom: 1px solid #f0f0f3; font-size: 14px; }
.infoList span { color: #8c8c9a; flex-shrink: 0; }
.infoList strong { color: #1f1f2e; text-align: right; font-weight: 500; }
.actions { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 16px; }
.actionBtn { padding: 10px 16px; border-radius: 8px; background: #5c5c9e; color: #fff; text-decoration: none; font-size: 14px; }
.tips { padding-left: 18px; color: #5c5c66; line-height: 1.8; font-size: 14px; }
.earningsList { list-style: none; font-size: 14px; }
.earningsList li { display: grid; grid-template-columns: 1fr auto; gap: 4px 12px; padding: 10px 0; border-bottom: 1px solid #f0f0f3; }
.earningsList time { grid-column: 1 / -1; font-size: 12px; color: #8c8c9a; }
@media (max-width: 960px) {
  .stats { grid-template-columns: repeat(2, 1fr); }
  .grid { grid-template-columns: 1fr; }
}
@media (max-width: 768px) {
  .page { padding: 0 var(--mobile-page-gap); }
  .header { margin-bottom: 18px; }
  .title { font-size: 22px; }
  .stats { gap: 10px; margin-bottom: 14px; }
  .statCard { padding: 14px; border-radius: var(--mobile-card-radius); }
  .statCard .value { font-size: 24px; }
  .statCard .value.small { font-size: 16px; }
  .grid { gap: 14px; }
  .card { padding: 18px 16px; border-radius: var(--mobile-card-radius); }
  .actions { display: grid; grid-template-columns: 1fr; }
  .actionBtn { min-height: var(--mobile-touch-target); box-sizing: border-box; display: flex; align-items: center; justify-content: center; }
}
</style>
