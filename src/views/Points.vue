<template>
    <div class="page">
      <div class="overview">
        <div class="card purple">
          <div class="header">
            <span>积分池概览</span>
            <IconSvg name="wallet" class="icon" />
          </div>
          <div class="body">
            <div class="value">{{ poolLoading ? '加载中...' : `¥ ${poolOverview.poolAmount}` }}</div>
            <div class="tag">
              <IconSvg name="info" />
              <span>来源：兑换比例差额自动注入</span>
            </div>
          </div>
        </div>
        <div class="card green">
          <div class="main">
            <div class="header">
              <span>物业币发行总览</span>
              <span class="sub">Property Coin Total Metrics</span>
            </div>
            <div class="value">{{ formattedTotal }}<span class="unit">PCoin</span></div>
          </div>
          <div class="stats">
            <div class="stat">
              <div class="label">已消费</div>
              <div class="statValue">{{ formattedConsumed }}</div>
            </div>
            <div class="stat">
              <div class="label">流通中</div>
              <div class="statValue">{{ formattedCirculating }}</div>
            </div>
          </div>
        </div>
      </div>
      <div class="assetTable">
        <div class="header">
          <div class="titleWrap">
            <h2 class="title">用户资产明细</h2>
            <SegmentedControl :tabs="tabs" v-model="activeTab" />
          </div>
          <div class="toolbar">
            <form class="search" @submit.prevent="submitSearch">
              <IconSvg name="search" />
              <input
                v-model="searchKeyword"
                type="search"
                placeholder="搜索房号、姓名..."
                @input="onSearchInput"
              />
            </form>
          </div>
        </div>
        <table v-if="!isMobile" class="table">
          <thead>
            <tr>
              <th>用户姓名</th>
              <th>房号</th>
              <th>积分余额（紫色）</th>
              <th>物业币余额（绿色）</th>
              <th>账户状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="6" style="text-align:center;padding:24px;color:#8c8c9a">加载中...</td>
            </tr>
            <tr v-else-if="!users.length">
              <td colspan="6" style="text-align:center;padding:24px;color:#8c8c9a">暂无数据</td>
            </tr>
            <template v-else>
            <tr v-for="user in users" :key="user.id">
              <td>
                <div class="userInfo">
                  <div class="avatar" :style="{ background: user.avatarColor }">{{ user.initials }}</div>
                  <span class="name">{{ user.name }}</span>
                </div>
              </td>
              <td>{{ user.room }}</td>
              <td><span class="badge purple">{{ user.points }}</span></td>
              <td><span class="badge green">{{ user.pcoin }}</span></td>
              <td>
                <span class="status" :class="user.status === 'normal' ? 'normal' : 'frozen'">
                  {{ user.status === 'normal' ? '正常' : '已冻结' }}
                </span>
              </td>
              <td>
                <div class="actions">
                  <button type="button" class="detail" @click="openDetailModal(user)">详情</button>
                  <button
                    type="button"
                    class="toggle"
                    :class="user.status === 'normal' ? 'freeze' : 'unfreeze'"
                    @click="openStatusModal(user, user.status === 'normal' ? 'freeze' : 'unfreeze')"
                  >
                    {{ user.status === 'normal' ? '冻结' : '解冻' }}
                  </button>
                </div>
              </td>
            </tr>
            </template>
          </tbody>
        </table>
        <div v-else class="assetCards">
          <div v-if="loading" class="emptyCardState">加载中...</div>
          <div v-else-if="!users.length" class="emptyCardState">暂无数据</div>
          <article v-for="user in users" v-else :key="user.id" class="assetCard">
            <div class="assetCardHeader">
              <div class="userInfo">
                <div class="avatar" :style="{ background: user.avatarColor }">{{ user.initials }}</div>
                <div>
                  <div class="name">{{ user.name }}</div>
                  <div class="room">{{ user.room }}</div>
                </div>
              </div>
              <span class="status" :class="user.status === 'normal' ? 'normal' : 'frozen'">
                {{ user.status === 'normal' ? '正常' : '已冻结' }}
              </span>
            </div>
            <div class="assetBalances">
              <span class="badge purple">积分 {{ user.points }}</span>
              <span class="badge green">物业币 {{ user.pcoin }}</span>
            </div>
            <div class="assetCardActions">
              <button type="button" class="cardActionBtn detail" @click="openDetailModal(user)">详情</button>
              <button
                type="button"
                class="cardActionBtn toggle"
                :class="user.status === 'normal' ? 'freeze' : 'unfreeze'"
                @click="openStatusModal(user, user.status === 'normal' ? 'freeze' : 'unfreeze')"
              >
                {{ user.status === 'normal' ? '冻结' : '解冻' }}
              </button>
            </div>
          </article>
        </div>
        <div class="footer">
          <span class="total">
            显示 {{ pageStart }} 到 {{ pageEnd }}，共 {{ totalRecords.toLocaleString() }} 条记录
          </span>
          <div v-if="totalPages > 1" class="pagination">
            <button class="pageBtn" :disabled="currentPage <= 1 || loading" @click="changePage(currentPage - 1)">&lt;</button>
            <span class="pageInfo">{{ currentPage }} / {{ totalPages }}</span>
            <button class="pageBtn" :disabled="currentPage >= totalPages || loading" @click="changePage(currentPage + 1)">&gt;</button>
          </div>
        </div>
      </div>
      <div class="charts">
        <div class="trendChart">
          <div class="header">
            <h3 class="title">本月发行趋势</h3>
            <button class="more"><IconSvg name="more" /></button>
          </div>
          <div class="body">
            <div v-for="item in trendData" :key="item.week" class="item" :class="{ active: item.active }">
              <div class="barWrap">
                <div class="bar" :style="{ height: `${item.value}%` }">
                  <div v-if="item.active && item.label" class="label">{{ item.label }}</div>
                </div>
              </div>
              <div class="week">{{ item.week }}</div>
            </div>
          </div>
        </div>
        <div class="consumeChart">
          <h3 class="title">积分消耗结构</h3>
          <div class="body">
            <div class="donut">
              <svg viewBox="0 0 120 120" class="svg">
                <circle class="track" cx="60" cy="60" r="45" />
                <circle v-for="segment in segments" :key="segment.name" class="segment" cx="60" cy="60" r="45" :stroke-dasharray="segment.dashArray" :stroke-dashoffset="segment.dashOffset" :stroke="segment.color" />
              </svg>
              <div class="center">
                <div class="percent">70%</div>
                <div class="label">缴费抵扣</div>
              </div>
            </div>
            <div class="legend">
              <div v-for="item in consumeData" :key="item.name" class="legendItem">
                <span class="dot" :style="{ background: item.color }" />
                <span class="name">{{ item.name }}</span>
                <span class="legendValue">（{{ item.value }}%）</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="detailModalOpen" class="modalOverlay" @click.self="closeDetailModal">
        <div class="modal modalWide modalScroll" :class="{ mobileSheet: isMobile }">
          <div class="modalHeader">
            <h3 class="modalTitle">用户资产详情</h3>
            <button type="button" class="modalClose" @click="closeDetailModal">&times;</button>
          </div>
          <div class="modalBody">
            <div v-if="detailLoading" class="loadingText">加载中...</div>
            <div v-else-if="detailRows.length" class="detailGrid">
              <div v-for="row in detailRows" :key="row.label" class="detailItem">
                <span class="detailLabel">{{ row.label }}</span>
                <span class="detailValue">{{ row.value }}</span>
              </div>
            </div>
            <p v-if="detailError" class="error">{{ detailError }}</p>
            <div class="modalFooter">
              <button type="button" class="btnSecondary" @click="closeDetailModal">关闭</button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="statusModal" class="modalOverlay" @click.self="closeStatusModal">
        <div class="modal" :class="{ mobileSheet: isMobile }">
          <div class="modalHeader">
            <h3 class="modalTitle">{{ statusModal === 'freeze' ? '冻结账号' : '解冻账号' }}</h3>
            <button type="button" class="modalClose" @click="closeStatusModal">&times;</button>
          </div>
          <form class="modalBody" @submit.prevent="submitStatusModal">
            <div class="field">
              <label class="label">用户</label>
              <div class="readonly">{{ statusTargetUser?.name }} · {{ statusTargetUser?.room }}</div>
            </div>
            <div class="field">
              <label class="label">操作原因</label>
              <textarea
                v-model="statusForm.reason"
                class="textarea"
                rows="3"
                maxlength="200"
                :placeholder="statusModal === 'freeze' ? '选填，如：异常登录' : '选填，如：问题已核实'"
              />
            </div>
            <p v-if="statusError" class="error">{{ statusError }}</p>
            <p v-if="statusSuccess" class="success">{{ statusSuccess }}</p>
            <div class="modalFooter">
              <button type="button" class="btnSecondary" @click="closeStatusModal">取消</button>
              <button type="submit" class="btnPrimary" :disabled="statusSubmitting">
                {{ statusSubmitting ? '提交中...' : '确认' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
</template>


<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import IconSvg from '../components/IconSvg.vue'
import SegmentedControl from '../components/SegmentedControl.vue'
import { dashboardApi, pointApi, residentApi } from '../api/services'
import { formatMoney, mapPointPoolOverview, mapPointsOverview, mapPointsUsers } from '../api/mappers'
import { getEnumLabel, RESIDENT_STATUS, RESIDENT_STATUS_LABEL } from '../constants/enums'
import { ApiError } from '../api/request'
import type { ResidentItem } from '../api/types'
import { useIsMobile } from '../composables/useIsMobile'

const PAGE_SIZE = 20
type PointsUser = ReturnType<typeof mapPointsUsers>[number]
type StatusModalType = 'freeze' | 'unfreeze'
const { isMobile } = useIsMobile()

const loading = ref(true)
const poolLoading = ref(true)
const poolOverview = ref(mapPointPoolOverview())
const overview = ref(mapPointsOverview())
const formattedTotal = computed(() => overview.value.pcoinTotal.toLocaleString())
const formattedConsumed = computed(() => overview.value.pcoinConsumed.toLocaleString())
const formattedCirculating = computed(() => overview.value.pcoinCirculating.toLocaleString())

const users = ref<ReturnType<typeof mapPointsUsers>>([])
const totalRecords = ref(0)
const currentPage = ref(1)
const totalPages = ref(1)
const tabs = [
  { code: 'all', name: '全部用户' },
  { code: RESIDENT_STATUS.FROZEN, name: '已冻结' }
]
const activeTab = ref('all')
const searchKeyword = ref('')
const appliedKeyword = ref('')

let searchTimer: ReturnType<typeof setTimeout>

const detailModalOpen = ref(false)
const detailLoading = ref(false)
const detailError = ref('')
const detailData = ref<ResidentItem | null>(null)

const statusModal = ref<StatusModalType | null>(null)
const statusTargetUser = ref<PointsUser | null>(null)
const statusSubmitting = ref(false)
const statusError = ref('')
const statusSuccess = ref('')
const statusForm = ref({ reason: '' })

const detailRows = computed(() => {
  const d = detailData.value
  if (!d) return []
  return [
    { label: '姓名', value: d.name || '—' },
    { label: '手机号', value: d.phone || '—' },
    { label: '房号', value: [d.building, d.unit, d.room].filter(Boolean).join(' ') || '—' },
    { label: '账户状态', value: getEnumLabel(RESIDENT_STATUS_LABEL, d.status) },
    { label: '物业币状态', value: d.coinFrozen ? '已冻结' : '正常' },
    { label: '积分余额', value: `${formatMoney(d.pointBalance)} pts` },
    { label: '物业币余额', value: `${formatMoney(d.coinBalance)} PCoin` },
    { label: '累计消费', value: d.totalConsumption !== undefined ? `¥${formatMoney(d.totalConsumption)}` : '—' },
    { label: '累计订单', value: d.totalOrders !== undefined ? String(d.totalOrders) : '—' },
    { label: '注册时间', value: d.createdAt || '—' },
    { label: '更新时间', value: d.updatedAt || '—' }
  ]
})

const trendData = ref<Array<{ week: string; value: number; label: string; active: boolean }>>([
  { week: 'W1', value: 30, label: '', active: false }
])

const consumeData = ref([
  { name: '物业费抵扣', value: 70, color: '#5c5c9e' },
  { name: '周边商超兑换', value: 20, color: '#f5a623' },
  { name: '礼品中心', value: 10, color: '#3aaf7d' }
])

const pageStart = computed(() => {
  if (!totalRecords.value) return 0
  return (currentPage.value - 1) * PAGE_SIZE + 1
})

const pageEnd = computed(() => {
  return Math.min(currentPage.value * PAGE_SIZE, totalRecords.value)
})

async function loadUsers(page = currentPage.value) {
  loading.value = true
  try {
    const res = await residentApi.list({
      page,
      pageSize: PAGE_SIZE,
      keyword: appliedKeyword.value || undefined,
      status: activeTab.value === 'all' ? undefined : activeTab.value
    })
    users.value = mapPointsUsers(res.list || [])
    totalRecords.value = res.pagination?.total ?? users.value.length
    currentPage.value = res.pagination?.page ?? page
    totalPages.value = res.pagination?.totalPages ?? 1
  } catch (e) {
    console.error(e)
    users.value = []
    totalRecords.value = 0
    totalPages.value = 1
  } finally {
    loading.value = false
  }
}

function changePage(page: number) {
  if (page < 1 || page > totalPages.value || page === currentPage.value) return
  currentPage.value = page
  loadUsers(page)
}

function submitSearch() {
  clearTimeout(searchTimer)
  appliedKeyword.value = searchKeyword.value.trim()
  currentPage.value = 1
  loadUsers(1)
}

function onSearchInput() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(submitSearch, 300)
}

function resolveErrorMessage(e: unknown) {
  if (e instanceof ApiError) return e.message
  if (e instanceof Error) return e.message
  return '操作失败，请稍后重试'
}

async function openDetailModal(user: PointsUser) {
  detailError.value = ''
  detailData.value = null
  detailModalOpen.value = true
  detailLoading.value = true
  try {
    detailData.value = await residentApi.get(user.id)
  } catch (e) {
    detailError.value = resolveErrorMessage(e)
  } finally {
    detailLoading.value = false
  }
}

function closeDetailModal() {
  detailModalOpen.value = false
  detailData.value = null
  detailError.value = ''
}

function openStatusModal(user: PointsUser, type: StatusModalType) {
  statusTargetUser.value = user
  statusModal.value = type
  statusForm.value = { reason: '' }
  statusError.value = ''
  statusSuccess.value = ''
}

function closeStatusModal() {
  statusModal.value = null
  statusTargetUser.value = null
  statusForm.value = { reason: '' }
  statusError.value = ''
  statusSuccess.value = ''
}

async function submitStatusModal() {
  const user = statusTargetUser.value
  if (!user || !statusModal.value) return

  statusSubmitting.value = true
  statusError.value = ''
  statusSuccess.value = ''

  try {
    await residentApi.updateStatus(user.id, {
      status: statusModal.value === 'freeze' ? RESIDENT_STATUS.FROZEN : RESIDENT_STATUS.ACTIVE,
      reason: statusForm.value.reason.trim() || undefined
    })
    statusSuccess.value = statusModal.value === 'freeze' ? '账号已冻结' : '账号已解冻'
    await loadUsers(currentPage.value)
    setTimeout(closeStatusModal, 1500)
  } catch (e) {
    statusError.value = resolveErrorMessage(e)
  } finally {
    statusSubmitting.value = false
  }
}

watch(activeTab, () => {
  currentPage.value = 1
  loadUsers(1)
})

onMounted(async () => {
  try {
    const [pool, dashOverview] = await Promise.all([
      pointApi.pool(),
      dashboardApi.overview()
    ])
    poolOverview.value = mapPointPoolOverview(pool)
    overview.value = mapPointsOverview(pool, dashOverview)
  } finally {
    poolLoading.value = false
  }
  loadUsers(1)
})
const radius = 45
const circumference = 2 * Math.PI * radius
const segments = computed(() => {
  let offset = 0
  return consumeData.value.map(item => {
    const length = (item.value / 100) * circumference
    const dashArray = `${length} ${circumference - length}`
    const dashOffset = -offset
    offset += length
    return { ...item, dashArray, dashOffset }
  })
})
</script>


<style scoped>
.page { max-width: 1200px; }
.charts { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }

.overview { display: grid; grid-template-columns: 1fr 2fr; gap: 20px; margin-bottom: 20px; }
.overview .card { border-radius: 12px; padding: 24px; min-height: 168px; color: #ffffff; }

.overview .card.purple {
  background: linear-gradient(135deg, #6a6aae 0%, #9a9ad8 100%);
  display: flex;
  flex-direction: column;
}
.overview .card.purple .header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 15px;
  font-weight: 500;
}
.overview .card.purple .icon { width: 22px; height: 22px; opacity: 0.8; }
.overview .card.purple .body {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 20px;
  margin-top: 8px;
}
.overview .card.purple .value { font-size: 36px; font-weight: 700; line-height: 1.1; }
.overview .card.purple .tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  align-self: flex-start;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 20px;
  font-size: 12px;
}
.overview .card.purple .tag svg { width: 14px; height: 14px; flex-shrink: 0; }

.overview .card.green {
  background: linear-gradient(135deg, #3aaf7d 0%, #6dd5a0 100%);
  display: flex;
  align-items: stretch;
  gap: 24px;
}
.overview .card.green .main {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-width: 0;
}
.overview .card.green .header {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 15px;
  font-weight: 500;
}
.overview .card.green .sub { font-size: 12px; font-weight: 400; opacity: 0.8; }
.overview .card.green .value { font-size: 36px; font-weight: 700; line-height: 1.1; margin-top: 16px; }
.overview .card.green .unit { font-size: 16px; font-weight: 500; margin-left: 6px; opacity: 0.9; }
.overview .card.green .stats { display: flex; gap: 16px; flex-shrink: 0; }
.overview .card.green .stat {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 10px;
  padding: 16px 20px;
  min-width: 132px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.overview .card.green .stat .label { font-size: 12px; opacity: 0.8; margin-bottom: 8px; }
.overview .card.green .statValue { font-size: 20px; font-weight: 600; }

.assetTable { background: #ffffff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); margin-bottom: 20px; overflow: hidden; }
.assetTable .header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid #f0f0f3; flex-wrap: wrap; gap: 16px; }
.assetTable .titleWrap { display: flex; align-items: center; gap: 16px; }
.assetTable .title { font-size: 18px; font-weight: 600; color: #1f1f2e; margin-bottom: 0; }
.assetTable .toolbar { display: flex; align-items: center; gap: 12px; }
.assetTable .search { display: flex; align-items: center; gap: 8px; padding: 10px 14px; border: 1px solid #e8e8ec; border-radius: 8px; background: #fafafc; min-width: 220px; }
.assetTable .search svg { width: 18px; height: 18px; color: #8c8c9a; }
.assetTable .search input { border: none; background: transparent; font-size: 14px; color: #1f1f2e; outline: none; flex: 1; }
.assetTable .search input::placeholder { color: #8c8c9a; }
.assetTable .table { width: 100%; font-size: 14px; }
.assetTable .table thead th { text-align: left; padding: 14px 24px; color: #8c8c9a; font-weight: 500; background: #fafafc; border-bottom: 1px solid #f0f0f3; }
.assetTable .table tbody td { padding: 16px 24px; color: #1f1f2e; border-bottom: 1px solid #f0f0f3; vertical-align: middle; }
.assetTable .table tbody tr:last-child td { border-bottom: none; }
.assetTable .userInfo { display: flex; align-items: center; gap: 12px; }
.assetTable .avatar { width: 36px; height: 36px; border-radius: 50%; color: #ffffff; font-size: 13px; font-weight: 500; display: flex; align-items: center; justify-content: center; }
.assetTable .name { font-weight: 500; color: #1f1f2e; }
.assetTable .badge { display: inline-block; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 500; }
.assetTable .badge.purple { background: #f0f0ff; color: #5c5c9e; }
.assetTable .badge.green { background: #e8f8f0; color: #3aaf7d; }
.assetTable .status { display: inline-flex; align-items: center; gap: 6px; font-size: 14px; }
.assetTable .status::before { content: ''; width: 6px; height: 6px; border-radius: 50%; }
.assetTable .status.normal::before { background: #3aaf7d; }
.assetTable .status.normal { color: #3aaf7d; }
.assetTable .status.frozen::before { background: #e05c5c; }
.assetTable .status.frozen { color: #e05c5c; }
.assetTable .actions { display: flex; align-items: center; gap: 16px; }
.assetTable .detail { font-size: 14px; color: #5c5c9e; cursor: pointer; background: transparent; border: none; }
.assetTable .toggle { font-size: 14px; cursor: pointer; background: transparent; border: none; }
.assetTable .toggle.freeze { color: #e05c5c; }
.assetTable .toggle.unfreeze { color: #5c5c9e; }
.assetTable .footer { display: flex; align-items: center; justify-content: space-between; padding: 14px 24px; border-top: 1px solid #f0f0f3; flex-wrap: wrap; gap: 12px; }
.assetTable .total { font-size: 13px; color: #8c8c9a; }
.assetTable .pagination { display: flex; align-items: center; gap: 8px; }
.assetTable .pageBtn { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 6px; border: 1px solid #e8e8ec; background: #ffffff; color: #5c5c66; font-size: 14px; }
.assetTable .pageBtn:disabled { color: #c8c8d0; cursor: not-allowed; }
.assetTable .pageBtn.active { background: #5c5c9e; color: #ffffff; border-color: #5c5c9e; }
.assetTable .pageInfo { font-size: 13px; color: #8c8c9a; min-width: 48px; text-align: center; }
.assetCards { display: grid; gap: 12px; padding: 14px; }
.assetCard { border: 1px solid #f0f0f3; border-radius: 14px; padding: 14px; background: #fafafc; }
.assetCardHeader { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.assetCard .userInfo { display: flex; align-items: center; gap: 12px; min-width: 0; }
.assetCard .avatar { width: 40px; height: 40px; border-radius: 50%; color: #ffffff; font-size: 13px; font-weight: 500; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.assetCard .name { font-weight: 600; color: #1f1f2e; }
.assetCard .room { font-size: 12px; color: #8c8c9a; margin-top: 4px; }
.assetBalances { display: flex; flex-wrap: wrap; gap: 8px; margin: 14px 0; }
.assetCard .badge { display: inline-block; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 500; }
.assetCardActions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.cardActionBtn { min-height: 40px; border-radius: 10px; border: 1px solid #e8e8ec; background: #ffffff; font-size: 14px; cursor: pointer; }
.cardActionBtn.detail { border-color: #5c5c9e; color: #5c5c9e; }
.cardActionBtn.toggle.freeze { border-color: #e05c5c; color: #e05c5c; }
.cardActionBtn.toggle.unfreeze { border-color: #5c5c9e; color: #5c5c9e; }
.emptyCardState { padding: 24px; text-align: center; color: #8c8c9a; }

.trendChart { background: #ffffff; border-radius: 12px; padding: 20px 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.trendChart .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
.trendChart .title { font-size: 15px; font-weight: 500; color: #1f1f2e; margin-bottom: 0; }
.trendChart .more { color: #8c8c9a; background: transparent; border: none; }
.trendChart .more svg { width: 20px; height: 20px; }
.trendChart .body { display: flex; align-items: flex-end; justify-content: space-around; height: 180px; gap: 16px; }
.trendChart .item { display: flex; flex-direction: column; align-items: center; gap: 12px; flex: 1; }
.trendChart .barWrap { width: 36px; height: 140px; background: #f7f7f9; border-radius: 18px; position: relative; overflow: hidden; }
.trendChart .bar { position: absolute; bottom: 0; left: 0; right: 0; background: #d8d8e8; border-radius: 18px; transition: height 0.6s ease; min-height: 8px; }
.trendChart .item.active .bar { background: #5c5c9e; }
.trendChart .bar .label { position: absolute; top: -24px; left: 50%; transform: translateX(-50%); padding: 2px 6px; border-radius: 4px; background: #5c5c9e; color: #ffffff; font-size: 11px; font-weight: 500; white-space: nowrap; }
.trendChart .week { font-size: 13px; color: #5c5c66; }

.consumeChart { background: #ffffff; border-radius: 12px; padding: 20px 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.consumeChart .title { font-size: 15px; font-weight: 500; color: #1f1f2e; margin-bottom: 20px; }
.consumeChart .body { display: flex; align-items: center; justify-content: center; gap: 24px; flex-wrap: wrap; }
.consumeChart .donut { position: relative; width: 140px; height: 140px; }
.consumeChart .svg { width: 100%; height: 100%; transform: rotate(-90deg); }
.consumeChart .track { fill: none; stroke: #f0f0f3; stroke-width: 10; }
.consumeChart .segment { fill: none; stroke-width: 10; stroke-linecap: round; transition: stroke-dashoffset 0.6s ease; }
.consumeChart .center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.consumeChart .percent { font-size: 20px; font-weight: 700; color: #1f1f2e; }
.consumeChart .center .label { font-size: 11px; color: #8c8c9a; }
.consumeChart .legend { display: flex; flex-direction: column; gap: 12px; }
.consumeChart .legendItem { display: flex; align-items: center; gap: 8px; font-size: 13px; }
.consumeChart .dot { width: 8px; height: 8px; border-radius: 50%; }
.consumeChart .legendItem .name { color: #5c5c66; }
.consumeChart .legendValue { color: #8c8c9a; }

@media (max-width: 900px) {
  .overview { grid-template-columns: 1fr; }
  .overview .card.green { flex-direction: column; }
  .overview .card.green .stats { width: 100%; }
  .overview .card.green .stat { flex: 1; }
  .charts { grid-template-columns: 1fr; }
  .assetTable .header { flex-direction: column; align-items: flex-start; }
  .assetTable .titleWrap { flex-direction: column; align-items: flex-start; }
  .assetTable .toolbar { width: 100%; }
}

.modalOverlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.modal {
  width: 100%;
  max-width: 480px;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
}
.mobileSheet {
  max-width: 100%;
  border-radius: 18px 18px 0 0;
  margin-top: auto;
}
.modalWide { max-width: 720px; }
.modalScroll { max-height: calc(100vh - 48px); display: flex; flex-direction: column; }
.modalScroll .modalBody { overflow-y: auto; }
.modalHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #f0f0f3;
}
.modalTitle { font-size: 16px; font-weight: 600; color: #1f1f2e; margin: 0; }
.modalClose {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  font-size: 24px;
  line-height: 1;
  color: #8c8c9a;
  cursor: pointer;
}
.modalClose:hover { color: #1f1f2e; }
.modalBody { padding: 24px; }
.field { margin-bottom: 16px; }
.field .label { display: block; font-size: 13px; font-weight: 500; color: #5c5c66; margin-bottom: 8px; }
.field .input,
.field .textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e8e8ec;
  border-radius: 8px;
  font-size: 14px;
  color: #1f1f2e;
  background: #ffffff;
  outline: none;
  box-sizing: border-box;
}
.field .input:focus,
.field .textarea:focus { border-color: #5c5c9e; }
.field .textarea { resize: vertical; min-height: 80px; font-family: inherit; }
.field .hint { font-size: 12px; color: #8c8c9a; margin-top: 6px; }
.readonly {
  padding: 10px 12px;
  border-radius: 8px;
  background: #fafafc;
  font-size: 14px;
  color: #1f1f2e;
}
.error { font-size: 13px; color: #e05c5c; margin-bottom: 12px; }
.success { font-size: 13px; color: #3aaf7d; margin-bottom: 12px; }
.loadingText { text-align: center; color: #8c8c9a; padding: 24px 0; }
.detailGrid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px 24px;
  margin-bottom: 8px;
}
.detailItem { display: flex; flex-direction: column; gap: 4px; }
.detailLabel { font-size: 12px; color: #8c8c9a; }
.detailValue { font-size: 14px; color: #1f1f2e; word-break: break-all; }
.modalFooter {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 8px;
}
.btnSecondary {
  padding: 10px 18px;
  border-radius: 8px;
  border: 1px solid #e8e8ec;
  background: #ffffff;
  color: #5c5c66;
  font-size: 14px;
  cursor: pointer;
}
.btnSecondary:hover { border-color: #5c5c9e; color: #5c5c9e; }
.btnPrimary {
  padding: 10px 18px;
  border-radius: 8px;
  border: none;
  background: #5c5c9e;
  color: #ffffff;
  font-size: 14px;
  cursor: pointer;
}
.btnPrimary:disabled { opacity: 0.6; cursor: not-allowed; }
@media (max-width: 640px) {
  .assetTable .header { padding: 16px; gap: 14px; }
  .assetTable .titleWrap { width: 100%; gap: 12px; }
  .assetTable .toolbar,
  .assetTable .search { width: 100%; min-width: 0; box-sizing: border-box; }
  .assetTable .footer { flex-direction: column; align-items: flex-start; padding: 14px 16px; }
  .assetTable .pagination { width: 100%; justify-content: flex-end; }
  .detailGrid { grid-template-columns: 1fr; }
  .modalOverlay { align-items: flex-end; padding: 0; }
  .modalScroll { max-height: min(88vh, 760px); }
  .modalHeader { padding: 18px 18px 14px; }
  .modalBody { padding: 18px; }
  .modalFooter { flex-direction: column-reverse; }
  .modalFooter .btnSecondary,
  .modalFooter .btnPrimary { width: 100%; min-height: 44px; }
}
</style>
