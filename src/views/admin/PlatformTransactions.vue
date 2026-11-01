<template>
  <div class="page">
    <div class="header">
      <div>
        <h1 class="title">平台交易明细</h1>
        <p class="desc">
          平台内部对账工具，聚合支付/退款、钱包/分账、提现/结算、积分/物业币/食堂余额。
          <strong>仅平台管理员可见</strong>，不开放给物业管理员与其他角色；全部为只读查询。
        </p>
      </div>
      <div class="headerActions">
        <button class="btnSecondary" :disabled="loading || exporting" @click="resetFilters">
          重置筛选
        </button>
        <button class="btnPrimary" :disabled="loading || exporting" @click="exportCsv">
          {{ exporting ? '导出中...' : '导出 CSV' }}
        </button>
      </div>
    </div>

    <p v-if="note" class="bannerNote">口径说明：{{ note }}</p>
    <p v-if="exportHint" class="bannerNote exportHint">{{ exportHint }}</p>
    <p v-if="unitHint" class="bannerWarn">
      本区间存在多种计量单位（{{ unitHint }}），汇总已按单位分行，<strong>不可跨单位相加</strong>。
    </p>

    <div class="toolbar">
      <select v-model="selectedPropertyId" class="input" @change="onFilterChange">
        <option value="">全部物业</option>
        <option v-for="pc in propertyCompanies" :key="pc.id" :value="pc.id">{{ pc.name }}</option>
      </select>
      <input v-model="startDate" type="date" class="input dateInput" @change="onFilterChange" />
      <span class="sep">至</span>
      <input v-model="endDate" type="date" class="input dateInput" @change="onFilterChange" />
      <select v-model="filters.group" class="input" @change="onGroupChange">
        <option value="">全部分组</option>
        <option v-for="opt in GROUP_OPTIONS" :key="opt.value" :value="opt.value">
          {{ opt.label }}
        </option>
      </select>
      <select v-model="filters.category" class="input" @change="onFilterChange">
        <option value="">全部分类</option>
        <option v-for="opt in categoryOptions" :key="opt.value" :value="opt.value">
          {{ opt.label }}
        </option>
      </select>
      <select v-model="filters.direction" class="input" @change="onFilterChange">
        <option value="">全部方向</option>
        <option v-for="opt in DIRECTION_OPTIONS" :key="opt.value" :value="opt.value">
          {{ opt.label }}
        </option>
      </select>
      <input
        v-model.trim="filters.status"
        class="input statusInput"
        placeholder="状态码（如 paid）"
        @change="onFilterChange"
      />
      <input
        v-model.trim="filters.keyword"
        class="input keywordInput"
        placeholder="单号 / 主体 / 订单号 / 说明"
        @keyup.enter="onFilterChange"
      />
      <button class="btnPrimary" :disabled="loading" @click="onFilterChange">
        {{ loading ? '加载中...' : '查询' }}
      </button>
    </div>

    <div v-if="loading && !loadedOnce" class="loading">加载中...</div>
    <p v-else-if="error" class="error">{{ error }}</p>

    <template v-else>
      <!-- 1. 总览：分组汇总卡 -->
      <div class="summaryGrid">
        <div
          v-for="card in summaryCards"
          :key="card.group"
          class="statCard"
          :class="{ clickable: true, activeCard: filters.group === card.group }"
          @click="toggleGroupFilter(card.group)"
        >
          <div class="cardLabel">
            <span>{{ card.label }}</span>
            <span class="cardCount">{{ card.totalCount }} 笔</span>
          </div>
          <div v-if="card.units.length" class="unitRows">
            <div v-for="row in card.units" :key="row.unit" class="unitRow">
              <span class="unitName">{{ row.unitLabel }}</span>
              <span class="unitNums">
                <span class="income">收 {{ formatAmount(row.incomeAmount, row.unit) }}</span>
                <span class="expense">支 {{ formatAmount(row.expenseAmount, row.unit) }}</span>
              </span>
            </div>
            <div v-if="card.hasFee" class="unitRow sub">
              <span class="unitName">手续费 / 平台分成</span>
              <span class="unitNums">
                <span>{{ formatAmount(card.totalFee, card.mainUnit) }}</span>
                <span>{{ formatAmount(card.totalPlatform, card.mainUnit) }}</span>
              </span>
            </div>
          </div>
          <p v-else class="cardEmpty">暂无数据</p>
        </div>
      </div>

      <!-- 2. 日趋势 -->
      <div class="panel">
        <div class="panelHead">
          <h3 class="panelTitle">每日收入 / 支出</h3>
          <select v-if="trendUnits.length > 1" v-model="trendUnit" class="input small">
            <option v-for="u in trendUnits" :key="u.unit" :value="u.unit">{{ u.label }}</option>
          </select>
        </div>
        <div v-if="trendPoints.length" class="chart">
          <div class="chartBars">
            <div v-for="p in trendPoints" :key="p.date" class="barCol">
              <div class="barWrap" :title="barTitle(p)">
                <div
                  class="bar incomeBar"
                  :style="{ height: barHeight(p.incomeAmount) }"
                ></div>
                <div
                  class="bar expenseBar"
                  :style="{ height: barHeight(p.expenseAmount) }"
                ></div>
              </div>
              <span class="barLabel">{{ shortDate(p.date) }}</span>
            </div>
          </div>
          <div class="legend">
            <span><i class="dot incomeDot"></i>收入</span>
            <span><i class="dot expenseDot"></i>支出</span>
            <span class="legendHint">
              峰值 {{ formatAmount(trendMax, currentTrendUnit) }} · 共 {{ trendTotalCount }} 笔
            </span>
          </div>
        </div>
        <p v-else class="empty">当前条件下没有趋势数据</p>
      </div>

      <!-- 3. 状态分布 + 分类汇总 -->
      <div class="splitRow">
        <div class="panel">
          <h3 class="panelTitle">状态分布</h3>
          <ul v-if="statusRows.length" class="statList">
            <li v-for="row in statusRows" :key="row.key">
              <span class="statName">
                {{ row.categoryLabel }} · {{ row.statusLabel }}
                <em class="unitTag">{{ row.unitLabel }}</em>
              </span>
              <span class="statNums">
                {{ row.count }} 笔 / {{ formatAmount(row.volumeAmount, row.unit) }}
              </span>
            </li>
          </ul>
          <p v-else class="empty">暂无数据</p>
        </div>
        <div class="panel">
          <h3 class="panelTitle">分类汇总</h3>
          <ul v-if="categoryRows.length" class="statList">
            <li v-for="row in categoryRows" :key="row.key">
              <span class="statName">
                {{ row.groupLabel }} / {{ row.categoryLabel }}
                <em class="unitTag">{{ row.unitLabel }}</em>
              </span>
              <span class="statNums">
                {{ row.count }} 笔 ·
                <span class="income">收 {{ formatAmount(row.incomeAmount, row.unit) }}</span>
                <span class="expense">支 {{ formatAmount(row.expenseAmount, row.unit) }}</span>
              </span>
            </li>
          </ul>
          <p v-else class="empty">暂无数据</p>
        </div>
      </div>

      <!-- 4. 明细表 -->
      <div class="panel">
        <div class="panelHead">
          <h3 class="panelTitle">交易明细</h3>
          <div class="panelMeta">
            <span v-if="total > 0">共 {{ total }} 笔</span>
            <select v-model.number="pageSize" class="input small" @change="changePageSize">
              <option :value="20">20 条/页</option>
              <option :value="50">50 条/页</option>
              <option :value="100">100 条/页</option>
            </select>
          </div>
        </div>
        <div v-if="rows.length" class="tableScroll">
          <table class="table">
            <thead>
              <tr>
                <th>时间</th>
                <th>分类</th>
                <th>方向</th>
                <th class="num">金额</th>
                <th>状态</th>
                <th>业务类型</th>
                <th>主体</th>
                <th>物业</th>
                <th>订单号</th>
                <th>说明</th>
              </tr>
            </thead>
            <tbody>
              <template v-for="item in rows" :key="rowKey(item)">
                <tr class="dataRow" @click="toggleRow(rowKey(item))">
                  <td class="timeCell">{{ item.occurredAt || '—' }}</td>
                  <td>
                    {{ item.categoryLabel || item.category || '—' }}
                    <em class="groupTag">{{ item.groupLabel || item.group || '' }}</em>
                  </td>
                  <td :class="directionClass(item.direction)">
                    {{ item.directionLabel || item.direction || '—' }}
                  </td>
                  <td class="num" :class="directionClass(item.direction)">
                    {{ signedAmount(item) }}
                  </td>
                  <td>{{ item.statusLabel || item.status || '—' }}</td>
                  <td>{{ item.typeLabel || item.bizType || '—' }}</td>
                  <td>{{ item.partyName || '—' }}</td>
                  <td>{{ item.propertyCompanyName || '—' }}</td>
                  <td class="idCell">{{ item.orderId || item.bizId || '—' }}</td>
                  <td class="descCell">{{ item.description || '—' }}</td>
                </tr>
                <tr v-if="expandedRow === rowKey(item)" class="expandRow">
                  <td colspan="10">
                    <div class="expandGrid">
                      <span>交易ID：{{ item.id || '—' }}</span>
                      <span>业务单号：{{ item.bizId || '—' }}</span>
                      <span>渠道流水号：{{ item.tradeNo || '—' }}</span>
                      <span>手续费：{{ formatAmount(item.feeAmount, item.unit) }}</span>
                      <span>实收/实付：{{ formatAmount(item.netAmount, item.unit) }}</span>
                      <span>平台分成：{{ formatAmount(item.platformAmount, item.unit) }}</span>
                      <span>现金部分：{{ formatAmount(item.cashAmount, item.unit) }}</span>
                      <span>积分抵扣：{{ item.pointUsed ?? '—' }}</span>
                      <span>物业币抵扣：{{ item.coinUsed ?? '—' }}</span>
                      <span>定向余额抵扣：{{ item.directedUsed ?? '—' }}</span>
                    </div>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
        <p v-else class="empty">当前筛选条件下没有交易记录</p>
        <div v-if="totalPages > 1" class="pager">
          <button class="pageBtn" :disabled="page <= 1" @click="changePage(page - 1)">&lt;</button>
          <span>{{ page }} / {{ totalPages }}</span>
          <button class="pageBtn" :disabled="page >= totalPages" @click="changePage(page + 1)">
            &gt;
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { adminTransactionApi, propertyCompanyApi } from '../../api/services'
import { ApiError } from '../../api/request'
import type {
  PropertyCompanyItem,
  TransactionCategory,
  TransactionDirection,
  TransactionGroup,
  TransactionLedgerItem,
  TransactionOverview,
  TransactionQueryParams,
  TransactionSummaryBucket,
  TransactionTrendPoint,
  TransactionUnit
} from '../../api/types'

/** §106.2 分组与分类对照 */
const GROUP_OPTIONS: Array<{ value: TransactionGroup; label: string }> = [
  { value: 'PAYMENT', label: '支付与退款' },
  { value: 'WALLET', label: '钱包与分账' },
  { value: 'SETTLEMENT', label: '提现与结算' },
  { value: 'VALUE', label: '积分与物业币' }
]

const CATEGORY_OPTIONS: Array<{ value: TransactionCategory; label: string; group: TransactionGroup }> = [
  { value: 'payment', label: '支付', group: 'PAYMENT' },
  { value: 'refund', label: '退款', group: 'PAYMENT' },
  { value: 'wallet', label: '钱包流水', group: 'WALLET' },
  { value: 'distribution', label: '订单分账', group: 'WALLET' },
  { value: 'split', label: '微信分账', group: 'WALLET' },
  { value: 'withdrawal', label: '提现', group: 'SETTLEMENT' },
  { value: 'transfer', label: '内部转账', group: 'SETTLEMENT' },
  { value: 'settlement', label: '结算', group: 'SETTLEMENT' },
  { value: 'point', label: '积分', group: 'VALUE' },
  { value: 'coin', label: '物业币', group: 'VALUE' },
  { value: 'canteen', label: '食堂定向余额', group: 'VALUE' }
]

const DIRECTION_OPTIONS: Array<{ value: TransactionDirection; label: string }> = [
  { value: 'income', label: '收入' },
  { value: 'expense', label: '支出' },
  { value: 'neutral', label: '不计收支' }
]

const UNIT_FALLBACK_LABEL: Record<TransactionUnit, string> = {
  CNY: '元',
  POINT: '积分',
  COIN: '物业币',
  CNY_DIRECTED: '定向余额'
}

const loading = ref(false)
const loadedOnce = ref(false)
const exporting = ref(false)
const error = ref('')
const propertyCompanies = ref<PropertyCompanyItem[]>([])
const selectedPropertyId = ref('')

const overview = ref<TransactionOverview | null>(null)
const rows = ref<TransactionLedgerItem[]>([])
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const totalPages = ref(1)
const expandedRow = ref('')
const trendUnit = ref<TransactionUnit>('CNY')

const filters = reactive<{
  group: '' | TransactionGroup
  category: '' | TransactionCategory
  direction: '' | TransactionDirection
  status: string
  keyword: string
}>({
  group: '',
  category: '',
  direction: '',
  status: '',
  keyword: ''
})

function isoDate(date: Date) {
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${m}-${d}`
}

/** 不传时间后端默认最近 30 天，前端显式带上保证筛选与导出一致 */
function defaultRange() {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 29)
  return { start: isoDate(start), end: isoDate(end) }
}

const defaultedRange = defaultRange()
const startDate = ref(defaultedRange.start)
const endDate = ref(defaultedRange.end)

const note = computed(() => overview.value?.note || '')
const exportHint = ref('')
const categoryOptions = computed(() =>
  filters.group
    ? CATEGORY_OPTIONS.filter((opt) => opt.group === filters.group)
    : CATEGORY_OPTIONS
)

/* ------------------------------ 金额格式化 ------------------------------ */

function toNumber(val?: number | string | null) {
  if (val === undefined || val === null || val === '') return 0
  const n = Number(val)
  return Number.isFinite(n) ? n : 0
}

function unitLabel(unit?: TransactionUnit) {
  return UNIT_FALLBACK_LABEL[unit || 'CNY'] || '元'
}

/** 不同 unit 不可相加，展示时按单位各自成形 */
function formatAmount(val?: number | string | null, unit?: TransactionUnit) {
  const n = toNumber(val)
  if (!unit || unit === 'CNY' || unit === 'CNY_DIRECTED') return `¥${n.toFixed(2)}`
  if (unit === 'POINT') return `${Math.round(n)} 分`
  return `${n.toFixed(2)} 币`
}

function signedAmount(item: TransactionLedgerItem) {
  const base = formatAmount(item.amount, item.unit)
  if (item.direction === 'expense') return `-${base}`
  if (item.direction === 'income') return `+${base}`
  return base
}

function directionClass(direction?: TransactionDirection) {
  if (direction === 'income') return 'textIncome'
  if (direction === 'expense') return 'textExpense'
  return 'textNeutral'
}

/* ------------------------------ 汇总卡 ------------------------------ */

interface SummaryCard {
  group: TransactionGroup
  label: string
  units: Array<{
    unit: TransactionUnit
    unitLabel: string
    incomeAmount: number
    expenseAmount: number
  }>
  totalCount: number
  totalFee: number
  totalPlatform: number
  hasFee: boolean
  mainUnit: TransactionUnit
}

const summaryCards = computed<SummaryCard[]>(() => {
  const buckets = overview.value?.groups || []
  return GROUP_OPTIONS.map((opt) => {
    const matched = buckets.filter((b) => (b.group || '') === opt.value)
    const totalCount = matched.reduce((sum, b) => sum + toNumber(b.count), 0)
    const totalFee = matched.reduce((sum, b) => sum + toNumber(b.feeAmount), 0)
    const totalPlatform = matched.reduce((sum, b) => sum + toNumber(b.platformAmount), 0)
    return {
      group: opt.value,
      label: opt.label,
      totalCount,
      totalFee,
      totalPlatform,
      hasFee: totalFee > 0 || totalPlatform > 0,
      mainUnit: matched[0]?.unit || 'CNY',
      units: matched.map((b) => ({
        unit: (b.unit || 'CNY') as TransactionUnit,
        unitLabel: b.unitLabel || unitLabel(b.unit),
        incomeAmount: toNumber(b.incomeAmount),
        expenseAmount: toNumber(b.expenseAmount)
      }))
    }
  })
})

const unitHint = computed(() => {
  const labels = new Set<string>()
  summaryCards.value.forEach((card) => card.units.forEach((u) => labels.add(u.unitLabel)))
  return Array.from(labels).join(' / ')
})

function bucketKey(item: TransactionSummaryBucket, index: number) {
  return `${item.category || item.group || ''}-${item.status || ''}-${item.unit || ''}-${index}`
}

const statusRows = computed(() => {
  const list = overview.value?.statusBreakdown || []
  return list.slice(0, 12).map((item, index) => ({
    key: bucketKey(item, index),
    categoryLabel: item.categoryLabel || item.category || '—',
    statusLabel: item.statusLabel || item.status || '—',
    unit: (item.unit || 'CNY') as TransactionUnit,
    unitLabel: item.unitLabel || unitLabel(item.unit),
    count: toNumber(item.count),
    volumeAmount: toNumber(item.volumeAmount)
  }))
})

const categoryRows = computed(() => {
  const list = overview.value?.categories || []
  return list.map((item, index) => ({
    key: bucketKey(item, index),
    groupLabel: item.groupLabel || item.group || '—',
    categoryLabel: item.categoryLabel || item.category || '—',
    unit: (item.unit || 'CNY') as TransactionUnit,
    unitLabel: item.unitLabel || unitLabel(item.unit),
    count: toNumber(item.count),
    incomeAmount: toNumber(item.incomeAmount),
    expenseAmount: toNumber(item.expenseAmount)
  }))
})

/* ------------------------------ 趋势图 ------------------------------ */

const trendUnits = computed(() => {
  const list = overview.value?.trend || []
  const map = new Map<TransactionUnit, string>()
  list.forEach((item) => {
    const unit = (item.unit || 'CNY') as TransactionUnit
    if (!map.has(unit)) map.set(unit, item.unitLabel || unitLabel(unit))
  })
  return Array.from(map.entries()).map(([unit, label]) => ({ unit, label }))
})

const currentTrendUnit = computed<TransactionUnit>(() => {
  if (trendUnits.value.some((u) => u.unit === trendUnit.value)) return trendUnit.value
  return trendUnits.value[0]?.unit || 'CNY'
})

const trendPoints = computed(() => {
  const unit = currentTrendUnit.value
  const list = (overview.value?.trend || []).filter((item) => (item.unit || 'CNY') === unit)
  return [...list].sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')))
})

function toTrendValue(item: TransactionTrendPoint, key: 'incomeAmount' | 'expenseAmount') {
  return toNumber(item[key])
}

const trendMax = computed(() => {
  return trendPoints.value.reduce(
    (max, item) => Math.max(max, toTrendValue(item, 'incomeAmount'), toTrendValue(item, 'expenseAmount')),
    0
  )
})

const trendTotalCount = computed(() => trendPoints.value.reduce((sum, p) => sum + toNumber(p.count), 0))

function barHeight(val?: number) {
  if (!trendMax.value) return '0%'
  const pct = (toNumber(val) / trendMax.value) * 100
  return `${Math.max(pct, toNumber(val) > 0 ? 2 : 0)}%`
}

function barTitle(item: TransactionTrendPoint) {
  return `${item.date}\n收入 ${formatAmount(item.incomeAmount, currentTrendUnit.value)}\n支出 ${formatAmount(item.expenseAmount, currentTrendUnit.value)}\n${toNumber(item.count)} 笔`
}

function shortDate(date?: string) {
  if (!date) return ''
  return date.length >= 10 ? date.slice(5) : date
}

/* ------------------------------ 明细表 ------------------------------ */

function rowKey(item: TransactionLedgerItem) {
  return `${item.id || 'row'}-${item.occurredAt || ''}-${item.category || ''}-${item.amount ?? ''}`
}

function toggleRow(key: string) {
  expandedRow.value = expandedRow.value === key ? '' : key
}

/* ------------------------------ 取数 ------------------------------ */

function buildQuery(): TransactionQueryParams {
  return {
    propertyCompanyId: selectedPropertyId.value || undefined,
    startDate: startDate.value || undefined,
    endDate: endDate.value || undefined,
    group: filters.group || undefined,
    category: filters.category || undefined,
    direction: filters.direction || undefined,
    status: filters.status || undefined,
    keyword: filters.keyword || undefined
  }
}

function resolveError(e: unknown, fallback: string) {
  if (e instanceof ApiError) {
    // 后端已硬校验：非平台管理员 403 / 20004，前端提示后不再重试
    if (e.code === 403 || e.code === 20004 || e.errorCode === '20004') {
      return '仅平台管理员可查看交易明细'
    }
    if (e.code === 10003) return `分页参数超出限制：${e.message || '每页最多 100 条'}`
    return e.message || fallback
  }
  return e instanceof Error ? e.message : fallback
}

async function loadOverview() {
  try {
    overview.value = await adminTransactionApi.overview(buildQuery())
  } catch (e) {
    error.value = resolveError(e, '总览加载失败')
    overview.value = null
    throw e
  }
}

async function loadList() {
  try {
    const res = await adminTransactionApi.list({ ...buildQuery(), page: page.value, pageSize: pageSize.value })
    rows.value = res.list || []
    total.value = res.pagination?.total ?? 0
    totalPages.value = res.pagination?.totalPages ?? 1
    page.value = res.pagination?.page ?? page.value
  } catch (e) {
    // 总览已提示过权限错误时不覆盖；列表失败单独提示
    if (!error.value) error.value = resolveError(e, '明细加载失败')
    rows.value = []
    total.value = 0
    totalPages.value = 1
  }
}

async function reload() {
  loading.value = true
  error.value = ''
  try {
    await Promise.all([loadOverview(), loadList()])
  } catch {
    // 错误文案已在子流程写入
  } finally {
    loading.value = false
    loadedOnce.value = true
  }
}

/** 筛选变化统一回到第 1 页 */
function onFilterChange() {
  expandedRow.value = ''
  page.value = 1
  reload()
}

function onGroupChange() {
  // 分组切换后，旧分类可能不属于新分组
  if (filters.category) {
    const matched = CATEGORY_OPTIONS.find((opt) => opt.value === filters.category)
    if (!matched || (filters.group && matched.group !== filters.group)) {
      filters.category = ''
    }
  }
  onFilterChange()
}

function toggleGroupFilter(group: TransactionGroup) {
  filters.group = filters.group === group ? '' : group
  onGroupChange()
}

function changePage(next: number) {
  if (next < 1 || next > totalPages.value) return
  page.value = next
  expandedRow.value = ''
  loadList()
}

function changePageSize() {
  page.value = 1
  loadList()
}

function resetFilters() {
  const range = defaultRange()
  startDate.value = range.start
  endDate.value = range.end
  selectedPropertyId.value = ''
  filters.group = ''
  filters.category = ''
  filters.direction = ''
  filters.status = ''
  filters.keyword = ''
  onFilterChange()
}

async function exportCsv() {
  exporting.value = true
  exportHint.value = ''
  try {
    const { rows: exportedRows, truncated, blob } = await adminTransactionApi.exportCsv(buildQuery())
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `platform_transactions_${startDate.value || 'start'}_${endDate.value || 'end'}.csv`
    a.click()
    URL.revokeObjectURL(url)
    if (truncated) {
      exportHint.value =
        '导出结果超过 50000 行已被截断，建议缩小时间范围或按物业 / 分类分批导出。'
    } else if (exportedRows > 0) {
      exportHint.value = `已导出 ${exportedRows} 行。`
    }
  } catch (e) {
    error.value = resolveError(e, '导出失败')
  } finally {
    exporting.value = false
  }
}

async function loadPropertyCompanies() {
  try {
    const res = await propertyCompanyApi.list({ pageSize: 100 })
    propertyCompanies.value = res.list || []
  } catch {
    // 物业下拉失败不影响主流程
  }
}

onMounted(async () => {
  await Promise.all([loadPropertyCompanies(), reload()])
})
</script>

<style scoped>
.page { max-width: 1280px; min-width: 0; width: 100%; box-sizing: border-box; }
.header {
  display: flex; justify-content: space-between; align-items: flex-start;
  gap: 16px; margin-bottom: 16px; flex-wrap: wrap;
}
.title { font-size: 24px; font-weight: 600; color: #1f1f2e; margin-bottom: 8px; }
.desc { font-size: 14px; color: #8c8c9a; max-width: 780px; line-height: 1.55; }
.desc strong { color: #c8443a; }
.headerActions { display: flex; gap: 10px; flex-shrink: 0; }

.bannerNote, .bannerWarn {
  white-space: pre-wrap; padding: 10px 12px; border-radius: 8px;
  margin-bottom: 12px; font-size: 13px; line-height: 1.6;
}
.bannerNote { background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; }
.exportHint { background: #eefaf3; color: #1f6f5c; border-color: #c3e3d5; }
.bannerWarn { background: #fff7e6; color: #ad6800; border: 1px solid #ffe0a3; }

.toolbar { display: flex; align-items: center; gap: 10px; margin-bottom: 18px; flex-wrap: wrap; }
.input { padding: 8px 12px; border: 1px solid #e8e8ec; border-radius: 8px; font-size: 14px; }
.input.small { padding: 6px 10px; font-size: 12.5px; }
.dateInput { width: 148px; }
.statusInput { width: 130px; }
.keywordInput { width: 190px; }
.sep { color: #8c8c9a; font-size: 13px; }
.btnPrimary { padding: 9px 16px; border-radius: 8px; background: #5c5c9e; color: #fff; border: none; cursor: pointer; font-size: 14px; }
.btnPrimary:disabled { opacity: 0.55; cursor: not-allowed; }
.btnSecondary { padding: 9px 16px; border-radius: 8px; border: 1px solid #e8e8ec; background: #fff; cursor: pointer; font-size: 14px; }
.btnSecondary:disabled { opacity: 0.55; cursor: not-allowed; }

.loading, .error, .empty { font-size: 14px; color: #8c8c9a; text-align: center; padding: 24px 0; }
.error { color: #e05c5c; }

.summaryGrid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; margin-bottom: 18px; }
.statCard {
  background: #fff; border-radius: 12px; padding: 16px 18px; min-width: 0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04); border: 1px solid transparent;
}
.statCard.clickable { cursor: pointer; transition: border-color 0.15s ease; }
.statCard.clickable:hover { border-color: #cfcfe6; }
.statCard.activeCard { border-color: #5c5c9e; }
.cardLabel {
  display: flex; justify-content: space-between; align-items: baseline; gap: 8px;
  font-size: 13px; color: #8c8c9a; margin-bottom: 10px;
}
.cardCount { font-size: 12px; color: #5c5c66; }
.unitRows { display: grid; gap: 7px; }
.unitRow { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; font-size: 12.5px; }
.unitRow.sub { color: #8c8c9a; border-top: 1px dashed #f0f0f3; padding-top: 7px; }
.unitName { color: #8c8c9a; flex-shrink: 0; }
.unitNums { display: flex; gap: 12px; flex-wrap: wrap; justify-content: flex-end; text-align: right; }
.cardEmpty { font-size: 13px; color: #b8b8c4; margin: 6px 0 0; }

.panel {
  background: #fff; border-radius: 12px; padding: 20px; min-width: 0; overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04); margin-bottom: 16px;
}
.panelHead { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 14px; }
.panelTitle { font-size: 15px; font-weight: 600; color: #1f1f2e; margin: 0 0 12px; }
.panelHead .panelTitle { margin-bottom: 0; }
.panelMeta { display: flex; align-items: center; gap: 12px; font-size: 12.5px; color: #8c8c9a; }
.splitRow { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }

.chartBars { display: flex; align-items: flex-end; gap: 4px; height: 150px; overflow-x: auto; padding-bottom: 4px; }
.barCol { flex: 1 1 0; min-width: 14px; display: flex; flex-direction: column; align-items: center; gap: 4px; }
.barWrap { flex: 1 1 auto; width: 100%; display: flex; align-items: flex-end; justify-content: center; gap: 2px; }
.bar { width: 45%; min-height: 0; border-radius: 2px 2px 0 0; }
.incomeBar { background: #d96a5e; }
.expenseBar { background: #58b58c; }
.barLabel { font-size: 10px; color: #a0a0ae; white-space: nowrap; }
.legend { display: flex; align-items: center; gap: 16px; margin-top: 10px; font-size: 12px; color: #5c5c66; }
.dot { display: inline-block; width: 8px; height: 8px; border-radius: 2px; margin-right: 5px; }
.incomeDot { background: #d96a5e; }
.expenseDot { background: #58b58c; }
.legendHint { margin-left: auto; color: #8c8c9a; }

.statList { list-style: none; margin: 0; padding: 0; max-height: 260px; overflow-y: auto; }
.statList li {
  display: flex; justify-content: space-between; align-items: baseline; gap: 10px;
  padding: 9px 0; border-bottom: 1px solid #f0f0f3; font-size: 13px; flex-wrap: wrap;
}
.statName { color: #3c3c46; }
.statNums { color: #5c5c66; font-size: 12.5px; display: flex; gap: 10px; }
.unitTag { font-style: normal; font-size: 11px; color: #8c8c9a; background: #f4f4f7; padding: 1px 6px; border-radius: 999px; margin-left: 6px; }

.tableScroll { width: 100%; max-width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
.table { width: 100%; border-collapse: collapse; font-size: 13px; min-width: 1080px; }
.table th, .table td {
  padding: 11px 14px; text-align: left; border-bottom: 1px solid #f0f0f3;
  vertical-align: top; word-break: break-word; overflow-wrap: anywhere;
}
.table th { color: #8c8c9a; font-weight: 500; background: #fafafc; white-space: nowrap; }
.table th.num, .table td.num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
.table td.timeCell { white-space: nowrap; color: #5c5c66; }
.table td.idCell {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 11.5px; word-break: break-all;
}
.table td.descCell { max-width: 180px; color: #5c5c66; }
.dataRow { cursor: pointer; transition: background 0.12s ease; }
.dataRow:hover { background: #fafafc; }
.groupTag { display: block; font-style: normal; font-size: 11px; color: #a0a0ae; margin-top: 2px; }
.expandRow { background: #fbfbfd; }
.expandGrid {
  display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 8px 16px;
  font-size: 12.5px; color: #5c5c66;
}
.textIncome { color: #c8443a; }
.textExpense { color: #2f9e73; }
.textNeutral { color: #8c8c9a; }
.income { color: #c8443a; }
.expense { color: #2f9e73; }

.pager { display: flex; align-items: center; justify-content: center; gap: 12px; margin-top: 16px; }
.pageBtn { padding: 6px 12px; border: 1px solid #e8e8ec; border-radius: 8px; background: #fff; cursor: pointer; }
.pageBtn:disabled { opacity: 0.45; cursor: not-allowed; }

@media (max-width: 1100px) {
  .summaryGrid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .splitRow { grid-template-columns: 1fr; }
  .expandGrid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 640px) {
  .summaryGrid { grid-template-columns: 1fr; }
  .expandGrid { grid-template-columns: 1fr; }
}
</style>
