<template>
  <div class="page" :class="{ mobilePage: isMobile }">
    <div class="header">
      <div>
        <h1 class="title">楼长概览</h1>
        <p class="desc">单元楼长工作台：绑定小区与楼栋，从物业公司分成中按比例获得定向分成</p>
      </div>
    </div>

    <p v-if="notLeader" class="blockHint">
      {{ notLeader }}（可尝试退出后重新登录以刷新身份；如仍有问题请联系物业管理人员）
    </p>

    <div v-if="loading" class="hint">加载中...</div>
    <p v-else-if="error && !notLeader" class="error">{{ error }}</p>

    <template v-else-if="info">
      <div class="identityCard">
        <div class="identityRow">
          <span class="identityLabel">管辖楼栋</span>
          <strong class="identityValue">{{ info.communityName || '—' }} · {{ info.building || '—' }}</strong>
        </div>
        <div class="identityRow">
          <span class="identityLabel">分成比例</span>
          <strong class="identityValue">{{ ratePercent }}（占物业公司分成）</strong>
        </div>
        <div class="identityRow">
          <span class="identityLabel">状态</span>
          <strong class="identityValue" :class="info.status === 'active' ? 'ok' : 'off'">
            {{ info.status === 'active' ? '启用中' : '已停用' }}
          </strong>
        </div>
      </div>

      <div class="stats">
        <div class="statCard green">
          <div class="label">可提现余额</div>
          <div class="value">¥{{ formatMoney(info.withdrawableAmount) }}</div>
        </div>
        <div class="statCard">
          <div class="label">累计分成</div>
          <div class="value">¥{{ formatMoney(info.totalEarning) }}</div>
        </div>
        <div class="statCard">
          <div class="label">在途提现</div>
          <div class="value">¥{{ formatMoney(info.pendingAmount) }}</div>
        </div>
        <div class="statCard">
          <div class="label">已提现</div>
          <div class="value">¥{{ formatMoney(info.withdrawnAmount) }}</div>
        </div>
      </div>
    </template>

    <p v-else class="hint">暂无楼长信息</p>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { buildingLeaderPortalApi } from '../../api/services'
import type { BuildingLeaderMy } from '../../api/types'
import { ApiError } from '../../api/request'
import { useIsMobile } from '../../composables/useIsMobile'

const { isMobile } = useIsMobile()
const loading = ref(false)
const error = ref('')
const notLeader = ref('')
const info = ref<BuildingLeaderMy | null>(null)

const ratePercent = computed(() => {
  const rate = Number(info.value?.commissionRate)
  if (!Number.isFinite(rate) || rate <= 0) return '—'
  return `${(rate * 100).toFixed(2)}%`
})

function formatMoney(val?: number) {
  if (val === undefined || val === null) return '0.00'
  return Number(val).toFixed(2)
}

async function load() {
  loading.value = true
  error.value = ''
  notLeader.value = ''
  try {
    info.value = await buildingLeaderPortalApi.my()
  } catch (e) {
    if (e instanceof ApiError && e.code === 91004) {
      notLeader.value = e.message || '当前账号不是启用中的单元楼长'
    } else {
      error.value = e instanceof ApiError ? e.message : '加载失败'
    }
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.page { max-width: 960px; }
.mobilePage { max-width: none; }
.header { margin-bottom: 24px; }
.title { font-size: 24px; font-weight: 600; color: #1f1f2e; margin-bottom: 8px; }
.desc { font-size: 14px; color: #8c8c9a; }
.identityCard { background: #fff; border-radius: 12px; padding: 18px 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); margin-bottom: 16px; }
.identityRow { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #f0f0f3; }
.identityRow:last-child { border-bottom: none; }
.identityLabel { font-size: 14px; color: #8c8c9a; }
.identityValue { font-size: 15px; font-weight: 600; color: #1f1f2e; }
.identityValue.ok { color: #3aaf7d; }
.identityValue.off { color: #e05c5c; }
.stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 16px; }
.statCard { background: #fff; border-radius: 12px; padding: 16px 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.statCard.green .value { color: #3aaf7d; }
.statCard .label { font-size: 13px; color: #8c8c9a; margin-bottom: 8px; }
.statCard .value { font-size: 22px; font-weight: 600; color: #1f1f2e; }
.blockHint { margin: 0 0 16px; font-size: 14px; color: #e05c5c; background: #fff; border-radius: 12px; padding: 16px 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.hint, .error { font-size: 14px; color: #8c8c9a; text-align: center; padding: 24px 0; }
.error { color: #e05c5c; }
@media (max-width: 768px) {
  .header { margin-bottom: 16px; }
  .title { font-size: 21px; }
}
</style>
