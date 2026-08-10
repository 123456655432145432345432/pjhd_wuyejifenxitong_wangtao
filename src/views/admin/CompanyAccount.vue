<template>
  <div class="page">
    <div class="header">
      <div>
        <h1 class="title">公司账户</h1>
        <p class="desc">
          物业领导相关收益计入本账户，不走个人提现。注意：订单分成进「分成账户」（settlementBalance），与本页不是同一资金池。
        </p>
      </div>
      <button v-if="isPlatformAdmin" class="btnPrimary" @click="openAdjust">手动调整</button>
    </div>

    <p v-if="error" class="error">{{ error }}</p>
    <div v-if="loading" class="hint">加载中...</div>
    <div v-else class="summary">
      <div class="stat">
        <span>公司账户余额</span>
        <strong>¥{{ formatMoney(balance?.balance) }}</strong>
      </div>
      <div class="stat">
        <span>物业公司</span>
        <strong>{{ balance?.propertyCompanyId || auth.propertyCompanyId || '—' }}</strong>
      </div>
      <div class="stat">
        <span>最近更新</span>
        <strong>{{ balance?.lastUpdatedAt || '—' }}</strong>
      </div>
    </div>

    <div class="panel">
      <h3 class="subTitle">流水</h3>
      <div v-if="records.length" class="tableScroll">
        <table class="table">
          <thead><tr><th>金额</th><th>备注</th><th>操作人</th><th>时间</th></tr></thead>
          <tbody>
            <tr v-for="(r, i) in records" :key="r.id || i">
              <td>¥{{ formatMoney(r.amount) }}</td>
              <td>{{ r.remark || '—' }}</td>
              <td>{{ r.operatorName || '—' }}</td>
              <td>{{ r.createdAt || '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else class="hint">暂无流水</p>
      <div v-if="totalPages > 1" class="pager">
        <button class="pageBtn" :disabled="page <= 1" @click="changePage(page - 1)">&lt;</button>
        <span>{{ page }} / {{ totalPages }}</span>
        <button class="pageBtn" :disabled="page >= totalPages" @click="changePage(page + 1)">&gt;</button>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="adjustOpen" class="modalOverlay" @click.self="adjustOpen = false">
        <div class="modal">
          <div class="modalHeader">
            <h3 class="modalTitle">手动调整公司账户</h3>
            <button class="modalClose" @click="adjustOpen = false">&times;</button>
          </div>
          <div class="modalBody">
            <div class="field">
              <label class="label">金额（正数注入 / 负数扣减）</label>
              <input v-model.number="adjustAmount" type="number" step="0.01" class="input" />
            </div>
            <div class="field">
              <label class="label">备注</label>
              <input v-model.trim="adjustRemark" class="input" />
            </div>
            <p v-if="adjustError" class="error">{{ adjustError }}</p>
            <div class="modalFooter">
              <button class="btnSecondary" @click="adjustOpen = false">取消</button>
              <button class="btnPrimary" :disabled="adjusting" @click="submitAdjust">
                {{ adjusting ? '提交中...' : '确认' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { companyAccountApi } from '../../api/services'
import { formatMoney } from '../../api/mappers'
import { ApiError } from '../../api/request'
import type { CompanyAccountBalance, CompanyAccountRecord } from '../../api/types'
import { USER_ROLE } from '../../constants/enums'
import { useAuthStore } from '../../stores/auth'

const auth = useAuthStore()
const isPlatformAdmin = computed(() => auth.profile?.role === USER_ROLE.PLATFORM_ADMIN)
const loading = ref(false)
const error = ref('')
const balance = ref<CompanyAccountBalance | null>(null)
const records = ref<CompanyAccountRecord[]>([])
const page = ref(1)
const totalPages = ref(1)
const adjustOpen = ref(false)
const adjustAmount = ref<number | ''>('')
const adjustRemark = ref('')
const adjusting = ref(false)
const adjustError = ref('')

async function load(pageNo = 1) {
  loading.value = true
  error.value = ''
  try {
    const [b, rec] = await Promise.all([
      companyAccountApi.balance(),
      companyAccountApi.records({ page: pageNo, pageSize: 20 })
    ])
    balance.value = b
    records.value = rec.list || []
    page.value = rec.pagination?.page ?? pageNo
    totalPages.value = rec.pagination?.totalPages ?? 1
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '加载失败'
  } finally {
    loading.value = false
  }
}

function changePage(p: number) {
  load(p)
}

function openAdjust() {
  adjustAmount.value = ''
  adjustRemark.value = ''
  adjustError.value = ''
  adjustOpen.value = true
}

async function submitAdjust() {
  const pcId = auth.propertyCompanyId || balance.value?.propertyCompanyId
  if (!pcId || adjustAmount.value === '' || Number(adjustAmount.value) === 0) {
    adjustError.value = '请填写有效金额与物业公司'
    return
  }
  adjusting.value = true
  adjustError.value = ''
  try {
    await companyAccountApi.adjust({
      propertyCompanyId: pcId,
      amount: Number(adjustAmount.value),
      remark: adjustRemark.value || undefined
    })
    adjustOpen.value = false
    await load(page.value)
  } catch (e) {
    adjustError.value = e instanceof ApiError ? e.message : '调整失败'
  } finally {
    adjusting.value = false
  }
}

onMounted(() => load(1))
</script>

<style scoped>
.page { max-width: 960px; min-width: 0; width: 100%; box-sizing: border-box; }
.header { display: flex; justify-content: space-between; margin-bottom: 20px; }
.title { font-size: 24px; font-weight: 600; margin: 0 0 6px; }
.desc { margin: 0; color: #8c8c9a; font-size: 14px; }
.summary { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; }
.stat { background: #fafafc; border: 1px solid #f0f0f3; border-radius: 10px; padding: 14px 18px; min-width: 160px; }
.stat span { display: block; font-size: 12px; color: #8c8c9a; margin-bottom: 6px; }
.stat strong { font-size: 18px; word-break: break-all; }
.panel { border: 1px solid #f0f0f3; border-radius: 12px; padding: 16px; min-width: 0; overflow: hidden; }
.subTitle { margin: 0 0 12px; }
.tableScroll { width: 100%; max-width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
.table { width: 100%; min-width: 520px; border-collapse: collapse; font-size: 13px; }
.table th, .table td {
  padding: 10px 8px; border-bottom: 1px solid #f0f0f3; text-align: left;
  word-break: break-word; overflow-wrap: anywhere;
}
.pager { display: flex; gap: 10px; align-items: center; justify-content: flex-end; margin-top: 12px; }
.pageBtn { width: 32px; height: 32px; border: 1px solid #e8e8ec; border-radius: 6px; background: #fff; cursor: pointer; }
.btnPrimary, .btnSecondary { padding: 8px 16px; border-radius: 8px; border: none; cursor: pointer; }
.btnPrimary { background: #5c5c9e; color: #fff; }
.btnSecondary { background: #f0f0f3; }
.hint, .error { color: #8c8c9a; }
.error { color: #e05c5c; }
.modalOverlay { position: fixed; inset: 0; background: rgba(0,0,0,.45); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal { width: 100%; max-width: 420px; background: #fff; border-radius: 12px; }
.modalHeader { display: flex; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid #f0f0f3; }
.modalTitle { margin: 0; font-size: 16px; }
.modalClose { border: none; background: none; font-size: 22px; cursor: pointer; }
.modalBody { padding: 16px 20px; }
.field { margin-bottom: 12px; }
.label { display: block; font-size: 13px; margin-bottom: 6px; color: #5c5c66; }
.input { width: 100%; padding: 8px 12px; border: 1px solid #e8e8ec; border-radius: 8px; box-sizing: border-box; }
.modalFooter { display: flex; justify-content: flex-end; gap: 10px; }
</style>
