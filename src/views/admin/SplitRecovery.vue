<template>
  <div class="page">
    <div class="header">
      <div>
        <h1 class="title">待追回台账</h1>
        <p class="desc">
          电商收付通退款时，快递员等个人接收方不支持微信回退，由平台垫付并登记。线下追回后标记已追回，无法追回可核销坏账。
        </p>
      </div>
      <button class="btnSecondary" :disabled="loading" @click="load(page)">刷新</button>
    </div>

    <div class="toolbar">
      <select v-model="status" class="input" @change="load(1)">
        <option v-for="opt in SPLIT_RECOVERY_STATUS_OPTIONS" :key="opt.value || 'all'" :value="opt.value">
          {{ opt.label }}
        </option>
      </select>
      <select v-model="ownerType" class="input" @change="load(1)">
        <option v-for="opt in SPLIT_RECOVERY_OWNER_TYPE_OPTIONS" :key="opt.value || 'all'" :value="opt.value">
          {{ opt.label }}
        </option>
      </select>
      <button class="btnPrimary" :disabled="loading" @click="load(1)">查询</button>
    </div>

    <p v-if="success" class="bannerSuccess">{{ success }}</p>
    <p v-if="error" class="bannerError">{{ error }}</p>

    <div class="tableScroll">
      <table class="table">
        <thead>
          <tr>
            <th>订单</th>
            <th>角色</th>
            <th>金额</th>
            <th>状态</th>
            <th>备注</th>
            <th>登记时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="7" class="emptyCell">加载中...</td>
          </tr>
          <tr v-else-if="!list.length">
            <td colspan="7" class="emptyCell">暂无台账记录</td>
          </tr>
          <tr v-for="item in list" v-else :key="item.id">
            <td>
              <div class="mono">{{ item.orderId || '—' }}</div>
              <div class="subText mono">{{ item.splitRecordId || '' }}</div>
            </td>
            <td>
              {{ getEnumLabel(CBK_OWNER_TYPE_LABEL, item.ownerType) }}
              <div class="subText mono">{{ item.ownerId || '' }}</div>
            </td>
            <td>¥{{ formatMoney(Number(item.amount)) }}</td>
            <td>
              <span :class="['statusBadge', item.status || 'pending']">
                {{ getEnumLabel(SPLIT_RECOVERY_STATUS_LABEL, item.status) }}
              </span>
            </td>
            <td>{{ item.remark || '—' }}</td>
            <td>{{ item.createdAt || '—' }}</td>
            <td>
              <template v-if="item.status === SPLIT_RECOVERY_STATUS.PENDING">
                <button class="actionBtn" :disabled="busyId === item.id" @click="markRecovered(item)">已追回</button>
                <button class="actionBtn danger" :disabled="busyId === item.id" @click="writeOff(item)">核销</button>
              </template>
              <span v-else class="muted">—</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <footer v-if="totalPages > 1" class="footer">
      <span>共 {{ total }} 条</span>
      <div>
        <button :disabled="page <= 1" @click="load(page - 1)">上一页</button>
        <span>{{ page }} / {{ totalPages }}</span>
        <button :disabled="page >= totalPages" @click="load(page + 1)">下一页</button>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { splitRecoveryApi } from '../../api/services'
import { formatApiError } from '../../api/request'
import type { SplitRecoveryItem } from '../../api/types'
import {
  CBK_OWNER_TYPE_LABEL,
  SPLIT_RECOVERY_OWNER_TYPE_OPTIONS,
  SPLIT_RECOVERY_STATUS,
  SPLIT_RECOVERY_STATUS_LABEL,
  SPLIT_RECOVERY_STATUS_OPTIONS,
  getEnumLabel
} from '../../constants/enums'
import { formatMoney } from '../../api/mappers'

const PAGE_SIZE = 20
const status = ref(SPLIT_RECOVERY_STATUS.PENDING)
const ownerType = ref('')
const list = ref<SplitRecoveryItem[]>([])
const loading = ref(false)
const error = ref('')
const success = ref('')
const busyId = ref('')
const page = ref(1)
const total = ref(0)
const totalPages = ref(1)

async function load(nextPage = 1) {
  loading.value = true
  error.value = ''
  page.value = nextPage
  try {
    const res = await splitRecoveryApi.list({
      page: nextPage,
      pageSize: PAGE_SIZE,
      sort: '-createdAt',
      status: status.value || undefined,
      ownerType: ownerType.value || undefined
    })
    list.value = res.list || []
    total.value = res.pagination.total
    totalPages.value = res.pagination.totalPages
  } catch (e) {
    error.value = formatApiError(e, '加载台账失败')
    list.value = []
  } finally {
    loading.value = false
  }
}

async function markRecovered(item: SplitRecoveryItem) {
  const remark = window.prompt('可选备注（线下追回说明）', item.remark || '已线下追回') ?? null
  if (remark === null) return
  busyId.value = item.id
  error.value = ''
  success.value = ''
  try {
    await splitRecoveryApi.markRecovered(item.id, { remark: remark.trim() || undefined })
    success.value = '已标记追回'
    await load(page.value)
  } catch (e) {
    error.value = formatApiError(e, '标记失败')
  } finally {
    busyId.value = ''
  }
}

async function writeOff(item: SplitRecoveryItem) {
  const remark = window.prompt('核销后不再追回，请填写原因', item.remark || '核销坏账') ?? null
  if (remark === null) return
  busyId.value = item.id
  error.value = ''
  success.value = ''
  try {
    await splitRecoveryApi.writeOff(item.id, { remark: remark.trim() || undefined })
    success.value = '已核销'
    await load(page.value)
  } catch (e) {
    error.value = formatApiError(e, '核销失败')
  } finally {
    busyId.value = ''
  }
}

onMounted(() => load(1))
</script>

<style scoped>
.page { max-width: 1080px; }
.header { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
.title { font-size: 22px; font-weight: 600; }
.desc { font-size: 14px; color: #8c8c9a; }
.toolbar { display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; }
.input { padding: 8px 12px; border: 1px solid #e8e8ec; border-radius: 8px; }
.tableScroll { overflow: auto; background: #fff; border-radius: 12px; }
.table { width: 100%; border-collapse: collapse; font-size: 14px; }
.table th, .table td { padding: 10px; border-bottom: 1px solid #f0f0f3; text-align: left; vertical-align: top; }
.emptyCell { text-align: center; color: #8c8c9a; padding: 28px; }
.mono { font-family: Consolas, Monaco, monospace; }
.subText { font-size: 12px; color: #8c8c9a; }
.statusBadge { display: inline-block; border-radius: 999px; padding: 2px 8px; font-size: 12px; }
.statusBadge.pending { background: #fff7e6; color: #b45309; }
.statusBadge.recovered { background: #e8f5ee; color: #0f7b45; }
.statusBadge.written_off { background: #f4f5f7; color: #5c5c66; }
.actionBtn { margin-right: 8px; background: none; border: none; color: #5c5c9e; cursor: pointer; }
.actionBtn.danger { color: #cf1322; }
.muted { color: #8c8c9a; }
.btnPrimary, .btnSecondary { padding: 8px 16px; border-radius: 8px; cursor: pointer; }
.btnPrimary { background: #5c5c9e; color: #fff; border: none; }
.btnSecondary { background: #fff; border: 1px solid #e8e8ec; color: #5c5c66; }
.bannerSuccess { background: #f6ffed; color: #389e0d; padding: 10px 14px; border-radius: 8px; margin-bottom: 12px; font-size: 13px; }
.bannerError { background: #fff1f0; color: #cf1322; padding: 10px 14px; border-radius: 8px; margin-bottom: 12px; font-size: 13px; }
.footer { display: flex; justify-content: space-between; align-items: center; margin-top: 12px; font-size: 13px; color: #8c8c9a; }
.footer button { margin: 0 4px; }
</style>
