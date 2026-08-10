<template>
  <div class="page" :class="{ mobile: isMobile }">
    <div class="header">
      <div>
        <h1 class="title">工作台</h1>
        <p class="desc">技工工作概览</p>
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
          <div class="label">待处理工单</div>
          <div class="value">{{ pendingCount }}</div>
        </div>
        <div class="statCard green">
          <div class="label">已完成</div>
          <div class="value">{{ completedCount }}</div>
        </div>
        <div class="statCard">
          <div class="label">账号状态</div>
          <div class="value small">{{ accountStatus }}</div>
        </div>
      </div>

      <div class="grid">
        <div class="card">
          <h3 class="cardTitle">快捷入口</h3>
          <div class="actions">
            <RouterLink class="actionBtn" :to="{ name: 'technician-tasks' }">我的工单</RouterLink>
            <RouterLink class="actionBtn" :to="{ name: 'technician-services' }">我的服务</RouterLink>
            <RouterLink class="actionBtn" :to="{ name: 'technician-withdrawals' }">提现管理</RouterLink>
          </div>
          <ul class="tips">
            <li>在「我的工单」中查看分配给您的维修/上门任务</li>
            <li>可接单、开始处理并标记完成</li>
            <li>「我的服务」首次发布将自动开通技工档口，收入可提现</li>
          </ul>
          <p v-if="apiHint" class="hint">{{ apiHint }}</p>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { technicianPortalApi } from '../../api/services'
import { useAuthStore } from '../../stores/auth'
import { useIsMobile } from '../../composables/useIsMobile'

const auth = useAuthStore()
const { isMobile } = useIsMobile()
const loading = ref(false)
const pendingCount = ref(0)
const completedCount = ref(0)
const profileName = ref('')
const apiHint = ref('')

const displayName = computed(
  () => profileName.value || auth.profile?.name || auth.username || '—'
)
const accountStatus = computed(() => auth.profile?.status || 'active')

onMounted(async () => {
  loading.value = true
  apiHint.value = ''
  try {
    // 后端 /technicians/my* 未稳定时，概览优先用登录态，避免多次 500 刷屏
    const me = await technicianPortalApi.my().catch(() => null)
    if (me) {
      profileName.value = me.name || ''
      pendingCount.value = me.taskCount ?? 0
      completedCount.value = me.completedCount ?? 0
    } else {
      apiHint.value = '技工资料接口暂不可用，工单统计待后端联调'
    }
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.page { padding: 24px 32px; }
.header { margin-bottom: 24px; }
.title { font-size: 24px; font-weight: 600; color: #1f1f2e; margin: 0 0 6px; }
.desc { margin: 0; color: #8c8c9a; font-size: 14px; }
.loading { padding: 48px; text-align: center; color: #8c8c9a; }
.stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 20px; }
.statCard { background: #fff; border-radius: 12px; padding: 18px 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.statCard.purple { border-top: 3px solid #7c6cf0; }
.statCard.green { border-top: 3px solid #3db98a; }
.statCard .label { font-size: 13px; color: #8c8c9a; margin-bottom: 8px; }
.statCard .value { font-size: 22px; font-weight: 600; color: #1f1f2e; }
.statCard .value.small { font-size: 18px; }
.grid { display: grid; gap: 16px; }
.card { background: #fff; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.cardTitle { font-size: 16px; font-weight: 600; margin: 0 0 16px; }
.actions { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 14px; }
.actionBtn {
  display: inline-flex; align-items: center; padding: 10px 16px; border-radius: 8px;
  background: #f3f0ff; color: #5b4cdb; text-decoration: none; font-size: 14px; font-weight: 500;
}
.actionBtn:hover { background: #e8e2ff; }
.tips { padding-left: 18px; color: #5c5c66; line-height: 1.8; font-size: 14px; margin: 0; }
.hint { margin: 12px 0 0; font-size: 13px; color: #d48806; }
@media (max-width: 960px) { .stats { grid-template-columns: 1fr 1fr; } }
@media (max-width: 768px) {
  .page { padding: 0 var(--mobile-page-gap); }
  .header { margin-bottom: 18px; }
  .title { font-size: 22px; }
  .stats { grid-template-columns: 1fr; gap: 10px; margin-bottom: 14px; }
  .statCard { padding: 14px; border-radius: var(--mobile-card-radius); }
  .card { padding: 18px 16px; border-radius: var(--mobile-card-radius); }
}
</style>
