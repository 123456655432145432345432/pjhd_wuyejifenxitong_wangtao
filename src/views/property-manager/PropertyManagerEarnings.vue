<template>
  <div class="page" :class="{ mobilePage: isMobile }">
    <div class="header">
      <div>
        <h1 class="title">抽成收益</h1>
        <p class="desc">经理从楼长分成中按比例抽取的收益流水（entryType=property_manager_share）</p>
      </div>
    </div>

    <p v-if="blockHint" class="blockHint">{{ blockHint }}</p>

    <div v-if="wallet" class="stats">
      <div class="statCard green">
        <div class="label">累计抽成</div>
        <div class="value">¥{{ formatMoney(wallet.totalEarning) }}</div>
      </div>
      <div class="statCard">
        <div class="label">可提现余额</div>
        <div class="value">¥{{ formatMoney(wallet.withdrawableAmount) }}</div>
      </div>
      <div class="statCard">
        <div class="label">在途提现</div>
        <div class="value">¥{{ formatMoney(wallet.pendingAmount) }}</div>
      </div>
      <div class="statCard">
        <div class="label">已提现</div>
        <div class="value">¥{{ formatMoney(wallet.withdrawnAmount) }}</div>
      </div>
    </div>

    <div class="panel">
      <div v-if="loading" class="hint">加载中...</div>
      <p v-else-if="error && !blockHint" class="error">{{ error }}</p>
      <table v-else-if="list.length" class="table">
        <thead>
          <tr>
            <th>流水 ID</th>
            <th>订单</th>
            <th>类型</th>
            <th>金额</th>
            <th>余额类型</th>
            <th>冲正关联</th>
            <th>时间</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in list" :key="item.id">
            <td>{{ item.id || '—' }}</td>
            <td>{{ item.orderId || '—' }}</td>
            <td>{{ entryTypeLabel(item.entryType) }}</td>
            <td :class="Number(item.amount) < 0 ? 'neg' : 'pos'">
              {{ Number(item.amount) < 0 ? '-' : '+' }}¥{{ formatMoney(Math.abs(Number(item.amount) || 0)) }}
            </td>
            <td>{{ balanceTypeLabel(item.balanceType) }}</td>
            <td>{{ item.refRecordId || '—' }}</td>
            <td>{{ item.createdAt || '—' }}</td>
          </tr>
        </tbody>
      </table>
      <p v-else class="hint">暂无收益流水</p>

      <div v-if="totalPages > 1" class="pager">
        <button class="pageBtn" :disabled="page <= 1 || loading" @click="changePage(page - 1)">&lt;</button>
        <span>{{ page }} / {{ totalPages }}</span>
        <button class="pageBtn" :disabled="page >= totalPages || loading" @click="changePage(page + 1)">&gt;</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { propertyManagerPortalApi } from '../../api/services'
import type { PropertyManagerEarningItem, PropertyManagerWallet } from '../../api/types'
import { ApiError } from '../../api/request'
import { useIsMobile } from '../../composables/useIsMobile'

const PAGE_SIZE = 20
const { isMobile } = useIsMobile()

const loading = ref(true)
const error = ref('')
const blockHint = ref('')
const list = ref<PropertyManagerEarningItem[]>([])
const wallet = ref<PropertyManagerWallet | null>(null)
const page = ref(1)
const totalPages = ref(1)

const ENTRY_TYPE_LABEL: Record<string, string> = { property_manager_share: '经理抽成' }
const BALANCE_TYPE_LABEL: Record<string, string> = { withdrawable: '可提现' }

function entryTypeLabel(type?: string) {
  if (!type) return '—'
  return ENTRY_TYPE_LABEL[type] || type
}

function balanceTypeLabel(type?: string) {
  if (!type) return '—'
  return BALANCE_TYPE_LABEL[type] || type
}

function formatMoney(val?: number) {
  if (val === undefined || val === null || Number.isNaN(Number(val))) return '0.00'
  return Number(val).toFixed(2)
}

function describeIdentityError(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.code === 91005) return e.message || '当前账号不是物业经理'
    if (e.code === 91007) return e.message || '物业经理身份已停用'
  }
  return ''
}

async function load(target = page.value) {
  loading.value = true
  error.value = ''
  blockHint.value = ''
  try {
    const res = await propertyManagerPortalApi.earnings({ page: target, pageSize: PAGE_SIZE })
    list.value = res.list || []
    page.value = res.pagination?.page ?? target
    totalPages.value = res.pagination?.totalPages ?? 1
    if (!wallet.value) {
      try {
        wallet.value = await propertyManagerPortalApi.wallet()
      } catch {
        wallet.value = null
      }
    }
  } catch (e) {
    const hint = describeIdentityError(e)
    if (hint) blockHint.value = hint
    else error.value = e instanceof ApiError ? e.message : '加载失败'
  } finally {
    loading.value = false
  }
}

function changePage(target: number) {
  if (target < 1 || target > totalPages.value || target === page.value) return
  void load(target)
}

onMounted(() => load(1))
</script>

<style scoped>
.page { max-width: 1000px; }
.mobilePage { max-width: none; }
.header { margin-bottom: 20px; }
.title { font-size: 24px; font-weight: 600; color: #1f1f2e; margin-bottom: 8px; }
.desc { font-size: 14px; color: #8c8c9a; }
.stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 12px; margin-bottom: 16px; }
.statCard { background: #fff; border-radius: 12px; padding: 16px 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.statCard.green .value { color: #3aaf7d; }
.statCard .label { font-size: 13px; color: #8c8c9a; margin-bottom: 8px; }
.statCard .value { font-size: 22px; font-weight: 600; color: #1f1f2e; }
.panel { background: #fff; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); overflow-x: auto; }
.table { width: 100%; min-width: 760px; border-collapse: collapse; font-size: 14px; }
.table th, .table td { padding: 12px 16px; text-align: left; border-bottom: 1px solid #f0f0f3; }
.table th { color: #8c8c9a; font-weight: 500; background: #fafafc; }
.pos { color: #3aaf7d; font-weight: 600; }
.neg { color: #e05c5c; font-weight: 600; }
.pager { display: flex; align-items: center; justify-content: center; gap: 12px; padding-top: 16px; }
.pageBtn { padding: 5px 10px; border: 1px solid #e8e8ec; border-radius: 6px; background: #fff; cursor: pointer; }
.pageBtn:disabled { opacity: .45; cursor: not-allowed; }
.blockHint { margin: 0 0 16px; font-size: 13px; color: #e05c5c; background: #fff; border-radius: 12px; padding: 14px 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.hint, .error { font-size: 14px; color: #8c8c9a; text-align: center; padding: 24px 0; }
.error { color: #e05c5c; }
@media (max-width: 768px) {
  .title { font-size: 21px; }
  .panel { padding: 16px; }
}
</style>
