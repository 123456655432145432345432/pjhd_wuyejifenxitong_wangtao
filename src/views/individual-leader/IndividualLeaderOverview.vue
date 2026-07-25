<template>
  <div class="page" :class="{ mobile: isMobile }">
    <div class="header">
      <div>
        <h1 class="title">工作台</h1>
        <p class="desc">个体负责人工作概览</p>
      </div>
    </div>

    <div v-if="loading" class="loading">加载中...</div>
    <template v-else>
      <div class="stats">
        <div class="statCard purple">
          <div class="label">姓名</div>
          <div class="value small">{{ displayName }}</div>
        </div>
        <div class="statCard">
          <div class="label">所属物业</div>
          <div class="value small">{{ propertyCompanyName || '—' }}</div>
        </div>
        <div class="statCard green">
          <div class="label">我的服务数</div>
          <div class="value">{{ serviceCount }}</div>
        </div>
        <div class="statCard">
          <div class="label">账号状态</div>
          <div class="value small">{{ accountStatus }}</div>
        </div>
      </div>

      <div class="card">
        <h3 class="cardTitle">工作说明</h3>
        <ul class="tips">
          <li>在「商家管理」中设置管辖商家的分成比例与满额免配送门槛</li>
          <li>商家分成变更提交后需模块负责人审批通过方可生效</li>
          <li>在「我的服务」中发布和维护您负责的社区服务项目</li>
          <li>业主可通过小程序预约您发布的服务</li>
        </ul>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { serviceApi } from '../../api/services'
import { ApiError } from '../../api/request'
import { getEnumLabel, RESIDENT_STATUS_LABEL } from '../../constants/enums'
import { useAuthStore } from '../../stores/auth'
import { useIndividualLeaderPortalStore } from '../../stores/individualLeaderPortal'
import { useIsMobile } from '../../composables/useIsMobile'

const auth = useAuthStore()
const portal = useIndividualLeaderPortalStore()
const { isMobile } = useIsMobile()
const profile = computed(() => auth.profile)
const serviceCount = ref(0)
const propertyCompanyName = ref('')
const providerName = ref('')
const loading = ref(false)

const displayName = computed(
  () => providerName.value || profile.value?.name || auth.username || '—'
)
const accountStatus = computed(() =>
  getEnumLabel(RESIDENT_STATUS_LABEL, profile.value?.status, '—')
)

async function loadServices() {
  loading.value = true
  try {
    const [servicesRes, leader] = await Promise.all([
      serviceApi.list({ mine: true, page: 1, pageSize: 1, sort: '-createdAt' }),
      portal.loadMy()
    ])
    serviceCount.value = servicesRes.pagination?.total ?? servicesRes.list?.length ?? 0
    const first = servicesRes.list?.[0]
    propertyCompanyName.value = first?.propertyCompanyName || ''
    providerName.value = leader?.name || first?.providerName || ''
  } catch (e) {
    console.error(e instanceof ApiError ? e.message : e)
  } finally {
    loading.value = false
  }
}

onMounted(loadServices)
</script>

<style scoped>
.page { max-width: 1200px; }
.header { margin-bottom: 24px; }
.title { font-size: 24px; font-weight: 600; color: #1f1f2e; margin-bottom: 8px; }
.desc { font-size: 14px; color: #8c8c9a; }
.loading { color: #8c8c9a; font-size: 14px; }
.stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 20px; }
.statCard { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.statCard.purple .value { color: #5c5c9e; }
.statCard.green .value { color: #3aaf7d; }
.statCard .label { font-size: 13px; color: #8c8c9a; margin-bottom: 8px; }
.statCard .value { font-size: 22px; font-weight: 600; color: #1f1f2e; }
.statCard .value.small { font-size: 18px; }
.card { background: #fff; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.cardTitle { font-size: 16px; font-weight: 600; margin-bottom: 16px; }
.tips { padding-left: 18px; color: #5c5c66; line-height: 1.8; font-size: 14px; }
@media (max-width: 960px) { .stats { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 768px) {
  .page { padding: 0 var(--mobile-page-gap); }
  .header { margin-bottom: 18px; }
  .title { font-size: 22px; }
  .stats { gap: 10px; margin-bottom: 14px; }
  .statCard { padding: 14px; border-radius: var(--mobile-card-radius); }
  .statCard .value { font-size: 20px; }
  .statCard .value.small { font-size: 16px; }
  .card { padding: 18px 16px; border-radius: var(--mobile-card-radius); }
}
</style>
