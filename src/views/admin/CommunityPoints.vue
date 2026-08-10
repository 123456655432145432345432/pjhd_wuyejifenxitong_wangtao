<template>
  <div class="page">
    <div class="header">
      <div>
        <h1 class="title">建设积分</h1>
        <p class="desc">查看小区建设积分池并手动调整</p>
      </div>
    </div>

    <div class="toolbar">
      <select v-model="communityId" class="input" @change="load">
        <option value="">选择小区</option>
        <option v-for="c in communities" :key="c.id" :value="c.id">{{ c.name || c.id }}</option>
      </select>
      <button class="btnPrimary" :disabled="!communityId || loading" @click="load">刷新</button>
    </div>

    <p v-if="error" class="error">{{ error }}</p>
    <div v-if="pool" class="summary">
      <div class="stat"><span>当前余额</span><strong>{{ formatMoney(pool.balance) }}</strong></div>
      <div class="stat"><span>累计注入</span><strong>{{ formatMoney(pool.totalIn) }}</strong></div>
      <div class="stat"><span>累计消耗</span><strong>{{ formatMoney(pool.totalOut) }}</strong></div>
    </div>

    <div v-if="communityId" class="panel">
      <h3 class="subTitle">手动调整</h3>
      <div class="adjustRow">
        <input v-model.number="adjustAmount" type="number" step="0.01" class="input" placeholder="正数注入 / 负数消耗" />
        <input v-model.trim="adjustRemark" class="input wide" placeholder="备注" />
        <button class="btnPrimary" :disabled="adjusting" @click="submitAdjust">{{ adjusting ? '提交中...' : '提交' }}</button>
      </div>
    </div>

    <div class="panel">
      <h3 class="subTitle">流水</h3>
      <div v-if="recordsLoading" class="hint">加载中...</div>
      <div v-else-if="records.length" class="tableScroll">
        <table class="table">
          <thead><tr><th>金额</th><th>来源</th><th>备注</th><th>时间</th></tr></thead>
          <tbody>
            <tr v-for="(r, i) in records" :key="r.id || i">
              <td>{{ formatMoney(r.amount) }}</td>
              <td>{{ r.source || '—' }}</td>
              <td>{{ r.remark || '—' }}</td>
              <td>{{ r.createdAt || '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else class="hint">暂无流水</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { communityPointApi, propertyCompanyApi } from '../../api/services'
import { formatMoney } from '../../api/mappers'
import { formatApiError } from '../../api/request'
import type { CommunityPointPool, CommunityPointRecord, PropertyCompanyCommunity } from '../../api/types'
import { useAuthStore } from '../../stores/auth'

const auth = useAuthStore()
const communities = ref<PropertyCompanyCommunity[]>([])
const communityId = ref('')
const pool = ref<CommunityPointPool | null>(null)
const records = ref<CommunityPointRecord[]>([])
const loading = ref(false)
const recordsLoading = ref(false)
const adjusting = ref(false)
const error = ref('')
const adjustAmount = ref<number | ''>('')
const adjustRemark = ref('')

async function loadCommunities() {
  const id = auth.propertyCompanyId || auth.profile?.propertyCompanyId
  if (!id) return
  try {
    const res = await propertyCompanyApi.communities(id)
    communities.value = res.list || []
    if (!communityId.value && communities.value[0]) communityId.value = communities.value[0].id
  } catch {
    communities.value = []
  }
}

async function load() {
  if (!communityId.value) return
  loading.value = true
  recordsLoading.value = true
  error.value = ''
  try {
    const [p, rec] = await Promise.all([
      communityPointApi.get(communityId.value),
      communityPointApi.records(communityId.value, { page: 1, pageSize: 50 })
    ])
    pool.value = p
    records.value = rec.list || []
  } catch (e) {
    error.value = formatApiError(e, '加载失败')
    pool.value = null
    records.value = []
  } finally {
    loading.value = false
    recordsLoading.value = false
  }
}

async function submitAdjust() {
  if (!communityId.value || adjustAmount.value === '' || Number(adjustAmount.value) === 0) {
    error.value = '请输入非零调整金额'
    return
  }
  adjusting.value = true
  error.value = ''
  try {
    await communityPointApi.adjust(communityId.value, {
      communityId: communityId.value,
      amount: Number(adjustAmount.value),
      remark: adjustRemark.value.trim() || undefined
    })
    adjustAmount.value = ''
    adjustRemark.value = ''
    await load()
  } catch (e) {
    error.value = formatApiError(e, '调整失败')
  } finally {
    adjusting.value = false
  }
}

onMounted(async () => {
  await loadCommunities()
  if (communityId.value) await load()
})
</script>

<style scoped>
.page { max-width: 1000px; }
.header { margin-bottom: 20px; }
.title { font-size: 24px; font-weight: 600; margin: 0 0 6px; }
.desc { margin: 0; color: #8c8c9a; font-size: 14px; }
.toolbar { display: flex; gap: 10px; margin-bottom: 16px; }
.input { min-width: 160px; padding: 8px 12px; border: 1px solid #e8e8ec; border-radius: 8px; }
.input.wide { flex: 1; min-width: 200px; }
.btnPrimary { padding: 8px 16px; border: none; border-radius: 8px; background: #5c5c9e; color: #fff; cursor: pointer; }
.summary { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; }
.stat { background: #fafafc; border: 1px solid #f0f0f3; border-radius: 10px; padding: 14px 18px; min-width: 140px; }
.stat span { display: block; font-size: 12px; color: #8c8c9a; margin-bottom: 6px; }
.stat strong { font-size: 18px; }
.panel { border: 1px solid #f0f0f3; border-radius: 12px; padding: 16px; margin-bottom: 16px; min-width: 0; overflow: hidden; }
.subTitle { margin: 0 0 12px; font-size: 15px; }
.adjustRow { display: flex; gap: 10px; flex-wrap: wrap; }
.tableScroll { width: 100%; max-width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
.table { width: 100%; min-width: 520px; border-collapse: collapse; font-size: 13px; }
.table th, .table td {
  padding: 10px 8px; border-bottom: 1px solid #f0f0f3; text-align: left;
  word-break: break-word; overflow-wrap: anywhere;
}
.hint, .error { color: #8c8c9a; }
.error { color: #e05c5c; }
</style>
