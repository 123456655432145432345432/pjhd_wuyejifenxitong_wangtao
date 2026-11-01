<template>
  <div class="page" :class="{ mobilePage: isMobile }">
    <div class="header">
      <div>
        <h1 class="title">经理概览</h1>
        <p class="desc">物业公司经理工作台：添加本物业楼长，并从楼长分成中按比例抽成</p>
      </div>
    </div>

    <p v-if="blockHint" class="blockHint">
      {{ blockHint }}（可尝试退出后重新登录以刷新身份；如仍有问题请联系平台管理人员）
    </p>

    <div v-if="loading" class="hint">加载中...</div>
    <p v-else-if="error && !blockHint" class="error">{{ error }}</p>

    <template v-else-if="info">
      <div class="identityCard">
        <div class="identityRow">
          <span class="identityLabel">经理身份</span>
          <strong class="identityValue">{{ info.residentName || info.residentId || '—' }}</strong>
        </div>
        <div class="identityRow">
          <span class="identityLabel">所属物业公司</span>
          <strong class="identityValue">{{ info.propertyCompanyName || info.propertyCompanyId || '—' }}</strong>
        </div>
        <div class="identityRow">
          <span class="identityLabel">抽成比例</span>
          <strong class="identityValue">{{ ratePercent }}（占楼长分成）</strong>
        </div>
        <div class="identityRow">
          <span class="identityLabel">状态</span>
          <strong class="identityValue" :class="info.status === 'active' ? 'ok' : 'off'">
            {{ info.status === 'active' ? '在职' : '已停用' }}
          </strong>
        </div>
      </div>

      <div class="stats">
        <div class="statCard green">
          <div class="label">可提现余额</div>
          <div class="value">¥{{ formatMoney(wallet?.withdrawableAmount) }}</div>
        </div>
        <div class="statCard">
          <div class="label">累计抽成</div>
          <div class="value">¥{{ formatMoney(wallet?.totalEarning) }}</div>
        </div>
        <div class="statCard">
          <div class="label">在途提现</div>
          <div class="value">¥{{ formatMoney(wallet?.pendingAmount) }}</div>
        </div>
        <div class="statCard">
          <div class="label">已提现</div>
          <div class="value">¥{{ formatMoney(wallet?.withdrawnAmount) }}</div>
        </div>
      </div>

      <div class="quickLinks">
        <RouterLink class="quickLink" :to="{ name: 'property-manager-leaders' }">名下楼长 →</RouterLink>
        <RouterLink class="quickLink" :to="{ name: 'property-manager-earnings' }">抽成收益 →</RouterLink>
        <RouterLink class="quickLink" :to="{ name: 'property-manager-wallet' }">钱包提现 →</RouterLink>
      </div>
    </template>

    <p v-else class="hint">暂无经理信息</p>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { propertyManagerPortalApi } from '../../api/services'
import type { PropertyManagerMy, PropertyManagerWallet } from '../../api/types'
import { ApiError } from '../../api/request'
import { useIsMobile } from '../../composables/useIsMobile'
import { useAuthStore } from '../../stores/auth'

const { isMobile } = useIsMobile()
const auth = useAuthStore()
const loading = ref(false)
const error = ref('')
const blockHint = ref('')
const info = ref<PropertyManagerMy | null>(null)
const wallet = ref<PropertyManagerWallet | null>(null)

const ratePercent = computed(() => {
  const rate = Number(info.value?.commissionRate)
  if (!Number.isFinite(rate) || rate <= 0) return '—'
  return `${(rate * 100).toFixed(2)}%`
})

function formatMoney(val?: number) {
  if (val === undefined || val === null) return '0.00'
  return Number(val).toFixed(2)
}

/** §100.2：91005 非经理 / 91007 身份已停用 */
function describeIdentityError(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.code === 91005) return e.message || '当前账号不是物业经理'
    if (e.code === 91007) return e.message || '物业经理身份已停用'
  }
  return ''
}

async function load() {
  loading.value = true
  error.value = ''
  blockHint.value = ''
  try {
    info.value = await propertyManagerPortalApi.my()
    // 同步经理身份标志，便于菜单入口展示
    auth.patchProfile({
      isPropertyManager: info.value.status === 'active',
      propertyManagerId: info.value.propertyManagerId
    })
    try {
      wallet.value = await propertyManagerPortalApi.wallet()
    } catch {
      wallet.value = null
    }
  } catch (e) {
    const hint = describeIdentityError(e)
    if (hint) {
      blockHint.value = hint
      auth.patchProfile({ isPropertyManager: false, propertyManagerId: null })
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
.quickLinks { display: flex; gap: 12px; flex-wrap: wrap; }
.quickLink { background: #fff; border-radius: 10px; padding: 12px 18px; color: #5c5c9e; font-size: 14px; text-decoration: none; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.quickLink:hover { color: #4a4a86; }
.blockHint { margin: 0 0 16px; font-size: 14px; color: #e05c5c; background: #fff; border-radius: 12px; padding: 16px 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.hint, .error { font-size: 14px; color: #8c8c9a; text-align: center; padding: 24px 0; }
.error { color: #e05c5c; }
@media (max-width: 768px) {
  .header { margin-bottom: 16px; }
  .title { font-size: 21px; }
}
</style>
