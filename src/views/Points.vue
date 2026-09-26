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
              <span class="sub">全平台发行与流通汇总</span>
            </div>
            <div class="value">{{ formattedTotal }}<span class="unit">物业币</span></div>
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
            <button type="button" class="btnPrimary" @click="openEarnModal()">发放物业币</button>
          </div>
        </div>
        <div v-if="!isMobile" class="tableScroll">
        <table class="table">
          <thead>
            <tr>
              <th>用户姓名</th>
              <th>房号</th>
              <th>个人积分</th>
              <th>家庭积分</th>
              <th>物业币余额（绿色）</th>
              <th>物业币</th>
              <th>账户状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="8" style="text-align:center;padding:24px;color:#8c8c9a">加载中...</td>
            </tr>
            <tr v-else-if="!users.length">
              <td colspan="8" style="text-align:center;padding:24px;color:#8c8c9a">暂无数据</td>
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
              <td><span class="badge purple soft">{{ user.familyPoints }}</span></td>
              <td><span class="badge green">{{ user.pcoin }}</span></td>
              <td>
                <span class="status" :class="user.coinFrozen ? 'frozen' : 'normal'">
                  {{ user.coinFrozen ? '币已冻结' : '正常' }}
                </span>
              </td>
              <td>
                <span class="status" :class="user.status === 'normal' ? 'normal' : 'frozen'">
                  {{ user.status === 'normal' ? '正常' : '已冻结' }}
                </span>
              </td>
              <td>
                <div class="actions">
                  <button type="button" class="detail" @click="openDetailModal(user)">详情</button>
                  <button type="button" class="detail" @click="openEarnModal(user)">发放</button>
                  <button
                    type="button"
                    class="toggle"
                    :class="user.coinFrozen ? 'unfreeze' : 'freeze'"
                    @click="openCoinModal(user, user.coinFrozen ? 'unfreeze' : 'freeze')"
                  >
                    {{ user.coinFrozen ? '解冻币' : '冻结币' }}
                  </button>
                  <button
                    type="button"
                    class="toggle"
                    :class="user.status === 'normal' ? 'freeze' : 'unfreeze'"
                    @click="openStatusModal(user, user.status === 'normal' ? 'freeze' : 'unfreeze')"
                  >
                    {{ user.status === 'normal' ? '冻结账号' : '解冻账号' }}
                  </button>
                </div>
              </td>
            </tr>
            </template>
          </tbody>
        </table>
        </div>
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
              <span class="badge purple">个人 {{ user.points }}</span>
              <span class="badge purple soft">家庭 {{ user.familyPoints }}</span>
              <span class="badge green">物业币 {{ user.pcoin }}</span>
            </div>
            <div class="assetCardActions">
              <button type="button" class="cardActionBtn detail" @click="openDetailModal(user)">详情</button>
              <button type="button" class="cardActionBtn detail" @click="openEarnModal(user)">发放</button>
              <button
                type="button"
                class="cardActionBtn toggle"
                :class="user.coinFrozen ? 'unfreeze' : 'freeze'"
                @click="openCoinModal(user, user.coinFrozen ? 'unfreeze' : 'freeze')"
              >
                {{ user.coinFrozen ? '解冻币' : '冻结币' }}
              </button>
              <button
                type="button"
                class="cardActionBtn toggle"
                :class="user.status === 'normal' ? 'freeze' : 'unfreeze'"
                @click="openStatusModal(user, user.status === 'normal' ? 'freeze' : 'unfreeze')"
              >
                {{ user.status === 'normal' ? '冻结账号' : '解冻账号' }}
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
      <div class="poolRecords">
        <div class="header">
          <div class="titleWrap">
            <h2 class="title">积分池流水</h2>
            <p class="subHint">来自积分池差额注入、清零与手工调整等记录</p>
          </div>
          <div class="toolbar">
            <select v-model="recordTypeFilter" class="filterSelect" @change="loadPoolRecords(1)">
              <option
                v-for="opt in POINT_POOL_RECORD_TYPE_OPTIONS"
                :key="opt.value || 'all'"
                :value="opt.value"
              >
                {{ opt.label }}
              </option>
            </select>
            <button type="button" class="refreshBtn" :disabled="recordsLoading" @click="loadPoolRecords(recordsPage)">
              {{ recordsLoading ? '加载中...' : '刷新' }}
            </button>
          </div>
        </div>
        <p v-if="recordsError" class="emptyChart">{{ recordsError }}</p>
        <div v-else class="tableWrap">
          <table class="table recordsTable">
            <thead>
              <tr>
                <th>类型</th>
                <th>金额</th>
                <th>变动前</th>
                <th>变动后</th>
                <th>来源</th>
                <th>时间</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="recordsLoading">
                <td colspan="6" class="emptyCell">加载中...</td>
              </tr>
              <tr v-else-if="!poolRecords.length">
                <td colspan="6" class="emptyCell">暂无流水</td>
              </tr>
              <tr v-for="row in poolRecords" v-else :key="row.id">
                <td>
                  <span class="typeBadge">{{ poolRecordTypeLabel(resolvePoolRecordType(row) || row.source) }}</span>
                </td>
                <td class="num">{{ formatMoney(row.amount) }}</td>
                <td class="num">{{ formatMoney(row.balanceBefore) }}</td>
                <td class="num">{{ formatMoney(row.balanceAfter ?? row.balance) }}</td>
                <td class="source">{{ poolRecordSourceText(row) }}</td>
                <td class="time">{{ row.createdAt || '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="!recordsError && recordsTotalPages > 1" class="footer">
          <span class="total">第 {{ recordsPage }} / {{ recordsTotalPages }} 页</span>
          <div class="pagination">
            <button class="pageBtn" :disabled="recordsPage <= 1 || recordsLoading" @click="loadPoolRecords(recordsPage - 1)">&lt;</button>
            <button class="pageBtn" :disabled="recordsPage >= recordsTotalPages || recordsLoading" @click="loadPoolRecords(recordsPage + 1)">&gt;</button>
          </div>
        </div>
      </div>
      <div class="charts">
        <div class="trendChart">
          <div class="header">
            <h3 class="title">本月发行趋势</h3>
            <span class="chartMeta">{{ trendMonth || '—' }} · 发放 {{ trendTotalEarned }} / 消耗 {{ trendTotalSpent }}</span>
          </div>
          <div v-if="trendLoading" class="emptyChart">加载中...</div>
          <div v-else-if="trendError" class="emptyChart">{{ trendError }}</div>
          <div v-else-if="trendBars.length" class="body">
            <div
              v-for="(item, idx) in trendBars"
              :key="item.date || idx"
              class="item"
              :class="{ active: idx === trendBars.length - 1 }"
            >
              <div class="barWrap">
                <div class="bar" :style="{ height: item.height + '%' }">
                  <span v-if="item.value > 0" class="label">{{ item.value }}</span>
                </div>
              </div>
              <span class="week">{{ item.label }}</span>
            </div>
          </div>
          <div v-else class="emptyChart">本月暂无趋势数据</div>
        </div>
        <div class="consumeChart">
          <h3 class="title">积分消耗结构</h3>
          <div v-if="consumeLoading" class="emptyChart">加载中...</div>
          <div v-else-if="consumeError" class="emptyChart">{{ consumeError }}</div>
          <ul v-else-if="consumeItems.length" class="consumeList">
            <li v-for="(item, idx) in consumeItems" :key="item.source || idx" class="consumeItem">
              <div class="consumeHead">
                <span>{{ getEnumLabel(POINT_POOL_RECORD_TYPE_LABEL, item.source, '其他') }}</span>
                <strong>{{ item.amount ?? 0 }}（{{ formatConsumePct(item) }}）</strong>
              </div>
              <div class="consumeBarTrack">
                <div class="consumeBarFill" :style="{ width: formatConsumePct(item) }" />
              </div>
            </li>
          </ul>
          <div v-else class="emptyChart">暂无消耗结构数据</div>
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

    <Teleport to="body">
      <div v-if="coinModal" class="modalOverlay" @click.self="closeCoinModal">
        <div class="modal" :class="{ mobileSheet: isMobile }">
          <div class="modalHeader">
            <h3 class="modalTitle">{{ coinModal === 'freeze' ? '冻结物业币' : '解冻物业币' }}</h3>
            <button type="button" class="modalClose" @click="closeCoinModal">&times;</button>
          </div>
          <form class="modalBody" @submit.prevent="submitCoinModal">
            <div class="field">
              <label class="label">用户</label>
              <div class="readonly">{{ coinTargetUser?.name }} · {{ coinTargetUser?.room }}</div>
            </div>
            <div v-if="coinModal === 'freeze'" class="field">
              <label class="label">冻结金额 <span class="required">*</span></label>
              <input
                v-model.number="coinForm.amount"
                type="number"
                min="0.01"
                step="0.01"
                class="input"
                :max="coinTargetUser?.coinBalance || undefined"
                required
              />
              <p class="hint">可用余额：¥{{ formatMoney(coinTargetUser?.coinBalance) }}</p>
            </div>
            <div class="field">
              <label class="label">{{ coinModal === 'freeze' ? '冻结原因' : '解冻原因' }} <span class="required">*</span></label>
              <textarea
                v-model="coinForm.reason"
                class="textarea"
                rows="3"
                maxlength="200"
                required
                :placeholder="coinModal === 'freeze' ? '请填写冻结原因，如：违规使用' : '请填写解冻原因，如：核实无误'"
              />
            </div>
            <p v-if="coinError" class="error">{{ coinError }}</p>
            <p v-if="coinSuccess" class="success">{{ coinSuccess }}</p>
            <div class="modalFooter">
              <button type="button" class="btnSecondary" @click="closeCoinModal">取消</button>
              <button type="submit" class="btnPrimary" :disabled="coinSubmitting || !coinForm.reason.trim()">
                {{ coinSubmitting ? '提交中...' : '确认' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="earnModalOpen" class="modalOverlay" @click.self="closeEarnModal">
        <div class="modal" :class="{ mobileSheet: isMobile }">
          <div class="modalHeader">
            <h3 class="modalTitle">发放物业币</h3>
            <button type="button" class="modalClose" @click="closeEarnModal">&times;</button>
          </div>
          <form class="modalBody" @submit.prevent="submitEarnModal">
            <div class="field">
              <label class="label">选择业主 <span class="required">*</span></label>
              <div v-if="earnLockedUser" class="readonly">
                {{ earnLockedUser.name }} · {{ earnLockedUser.room }}
              </div>
              <ResidentSearchSelect
                v-else
                :key="earnModalKey"
                v-model="earnForm.residentId"
                auto-open
                @select="onEarnResidentSelect"
              />
            </div>
            <div class="field">
              <label class="label">发放金额 <span class="required">*</span></label>
              <input
                v-model.number="earnForm.coinAmount"
                type="number"
                min="0.01"
                step="0.01"
                class="input"
                placeholder="最少 0.01"
                required
              />
            </div>
            <div class="field">
              <label class="label">来源</label>
              <div class="readonly">手动发放</div>
            </div>
            <div class="field">
              <label class="label">描述（选填）</label>
              <textarea
                v-model="earnForm.description"
                class="textarea"
                rows="3"
                maxlength="200"
                placeholder="如：管理员充值、测试账号补充物业币"
              />
            </div>
            <p v-if="earnError" class="error">{{ earnError }}</p>
            <p v-if="earnSuccess" class="success">{{ earnSuccess }}</p>
            <div class="modalFooter">
              <button type="button" class="btnSecondary" @click="closeEarnModal">取消</button>
              <button type="submit" class="btnPrimary" :disabled="earnSubmitting">
                {{ earnSubmitting ? '提交中...' : '确认发放' }}
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
import ResidentSearchSelect from '../components/ResidentSearchSelect.vue'
import SegmentedControl from '../components/SegmentedControl.vue'
import { dashboardApi, pointApi, propertyCoinApi, residentApi } from '../api/services'
import { formatMoney, mapPointPoolOverview, mapPointsOverview, mapPointsUsers, sortResidentsByAddress } from '../api/mappers'
import {
  getEnumLabel,
  POINT_POOL_RECORD_TYPE_ALIASES,
  POINT_POOL_RECORD_TYPE_LABEL,
  POINT_POOL_RECORD_TYPE_OPTIONS,
  PROPERTY_COIN_SOURCE,
  RESIDENT_STATUS,
  RESIDENT_STATUS_LABEL
} from '../constants/enums'
import { ApiError } from '../api/request'
import type { PointPoolRecordItem, PointsConsumptionItem, ResidentItem } from '../api/types'
import { useIsMobile } from '../composables/useIsMobile'
import { useAuthStore } from '../stores/auth'

const PAGE_SIZE = 20
type PointsUser = ReturnType<typeof mapPointsUsers>[number]
type StatusModalType = 'freeze' | 'unfreeze'
type CoinModalType = 'freeze' | 'unfreeze'
const { isMobile } = useIsMobile()
const auth = useAuthStore()

const loading = ref(true)
const poolLoading = ref(true)
const poolOverview = ref(mapPointPoolOverview())
const overview = ref(mapPointsOverview())
const formattedTotal = computed(() => overview.value.pcoinTotal.toLocaleString())
const formattedConsumed = computed(() =>
  overview.value.pcoinConsumed == null ? '—' : overview.value.pcoinConsumed.toLocaleString()
)
const formattedCirculating = computed(() =>
  overview.value.pcoinCirculating == null ? '—' : overview.value.pcoinCirculating.toLocaleString()
)

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

const coinModal = ref<CoinModalType | null>(null)
const coinTargetUser = ref<PointsUser | null>(null)
const coinSubmitting = ref(false)
const coinError = ref('')
const coinSuccess = ref('')
const coinForm = ref({ amount: 0, reason: '' })

const earnModalOpen = ref(false)
const earnModalKey = ref(0)
const earnLockedUser = ref<PointsUser | null>(null)
const earnSelectedName = ref('')
const earnSubmitting = ref(false)
const earnError = ref('')
const earnSuccess = ref('')
const earnForm = ref({
  residentId: '',
  coinAmount: 0,
  description: '管理员充值'
})

const trendLoading = ref(false)
const trendError = ref('')
const trendMonth = ref('')
const trendTotalEarned = ref(0)
const trendTotalSpent = ref(0)
const trendBars = ref<{ date?: string; label: string; value: number; height: number }[]>([])

const consumeLoading = ref(false)
const consumeError = ref('')
const consumeItems = ref<PointsConsumptionItem[]>([])

const recordsLoading = ref(false)
const recordsError = ref('')
const poolRecords = ref<PointPoolRecordItem[]>([])
const recordsPage = ref(1)
const recordsTotalPages = ref(1)
const recordTypeFilter = ref('')
const RECORDS_PAGE_SIZE = 10
/** 后端 pageSize 上限通常 ≤100，勿超过 */
const RECORDS_FETCH_PAGE_SIZE = 50
const RECORDS_FETCH_MAX_PAGES = 20

function resolvePoolRecordType(row: PointPoolRecordItem): string {
  if (row.recordType) return row.recordType
  // 部分返回把类型码放在 source
  if (row.source && POINT_POOL_RECORD_TYPE_LABEL[row.source]) return row.source
  return ''
}

function poolRecordTypeLabel(type?: string) {
  return getEnumLabel(POINT_POOL_RECORD_TYPE_LABEL, type, '—')
}

function poolRecordSourceText(row: PointPoolRecordItem) {
  if (row.description?.trim()) return row.description
  if (row.remark?.trim()) return row.remark
  return getEnumLabel(POINT_POOL_RECORD_TYPE_LABEL, row.source, '—')
}

function matchPoolRecordType(row: PointPoolRecordItem, filter: string): boolean {
  if (!filter) return true
  const raw = resolvePoolRecordType(row)
  const aliases = POINT_POOL_RECORD_TYPE_ALIASES[filter] || [filter]
  if (raw && aliases.includes(raw)) return true
  // 兜底：按展示文案匹配（兼容后端返回别名或仅有中文标签）
  const filterLabel = POINT_POOL_RECORD_TYPE_LABEL[filter]
  if (!filterLabel) return false
  if (raw && poolRecordTypeLabel(raw) === filterLabel) return true
  const display = poolRecordTypeLabel(row.recordType || row.source)
  return display === filterLabel
}

async function fetchPoolRecordsForFilter(companyId?: string) {
  const all: PointPoolRecordItem[] = []
  let page = 1
  let totalPages = 1
  while (page <= totalPages && page <= RECORDS_FETCH_MAX_PAGES) {
    const res = await pointApi.records({
      page,
      pageSize: RECORDS_FETCH_PAGE_SIZE,
      propertyCompanyId: companyId,
      sort: '-createdAt'
    })
    all.push(...(res.list || []))
    totalPages = Math.max(1, res.pagination?.totalPages ?? 1)
    if (!(res.list || []).length) break
    page += 1
  }
  return all
}

async function loadPoolRecords(page = 1) {
  recordsLoading.value = true
  recordsError.value = ''
  try {
    const filter = recordTypeFilter.value
    const companyId =
      auth.propertyCompanyId || auth.profile?.propertyCompanyId || undefined
    if (filter) {
      // 后端暂不按类型过滤：合法 pageSize 分页拉取后前端筛选
      const list = (await fetchPoolRecordsForFilter(companyId)).filter((row) =>
        matchPoolRecordType(row, filter)
      )
      const totalPages = Math.max(1, Math.ceil(list.length / RECORDS_PAGE_SIZE) || 1)
      const safePage = Math.min(Math.max(1, page), totalPages)
      const start = (safePage - 1) * RECORDS_PAGE_SIZE
      poolRecords.value = list.slice(start, start + RECORDS_PAGE_SIZE)
      recordsPage.value = safePage
      recordsTotalPages.value = list.length ? totalPages : 1
    } else {
      const res = await pointApi.records({
        page,
        pageSize: RECORDS_PAGE_SIZE,
        propertyCompanyId: companyId,
        sort: '-createdAt'
      })
      poolRecords.value = res.list || []
      recordsPage.value = res.pagination?.page ?? page
      recordsTotalPages.value = res.pagination?.totalPages ?? 1
    }
  } catch (e) {
    poolRecords.value = []
    const msg = e instanceof ApiError ? e.message : '积分池流水加载失败'
    recordsError.value = msg.includes('NullPointer')
      ? `${msg}（多为后端积分池流水映射异常，请后端排查积分池流水接口）`
      : msg
  } finally {
    recordsLoading.value = false
  }
}

function currentMonthParam() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function formatConsumePct(item: PointsConsumptionItem) {
  if (item.percentage !== undefined && item.percentage !== null) {
    const pct = item.percentage <= 1 ? item.percentage * 100 : item.percentage
    return `${Math.round(pct)}%`
  }
  return '0%'
}

async function loadCharts() {
  const month = currentMonthParam()
  trendLoading.value = true
  consumeLoading.value = true
  trendError.value = ''
  consumeError.value = ''
  try {
    const trend = await pointApi.trend({ month })
    trendMonth.value = trend.month || month
    trendTotalEarned.value = trend.totalEarned ?? 0
    trendTotalSpent.value = trend.totalSpent ?? 0
    const days = trend.daily || []
    const maxVal = Math.max(1, ...days.map((d) => Number(d.earned || 0)))
    trendBars.value = days.map((d) => {
      const value = Number(d.earned || 0)
      const date = d.date || ''
      return {
        date,
        label: date.length >= 10 ? date.slice(8, 10) : date.slice(-2) || '—',
        value,
        height: Math.max(8, Math.round((value / maxVal) * 100))
      }
    })
  } catch (e) {
    trendBars.value = []
    trendError.value = e instanceof ApiError ? e.message : '趋势加载失败'
  } finally {
    trendLoading.value = false
  }
  try {
    const structure = await pointApi.consumptionStructure({ month })
    consumeItems.value = structure.items || []
  } catch (e) {
    consumeItems.value = []
    consumeError.value = e instanceof ApiError ? e.message : '消耗结构加载失败'
  } finally {
    consumeLoading.value = false
  }
}

const detailRows = computed(() => {
  const d = detailData.value
  if (!d) return []
  return [
    { label: '姓名', value: d.name || '—' },
    { label: '手机号', value: d.phone || '—' },
    { label: '房号', value: [d.building, d.unit, d.room].filter(Boolean).join('-') || '—' },
    { label: '账户状态', value: getEnumLabel(RESIDENT_STATUS_LABEL, d.status) },
    { label: '物业币状态', value: d.coinFrozen ? '已冻结' : '正常' },
    { label: '物业币显示', value: d.coinHidden ? '用户已隐藏' : '显示中' },
    { label: '个人积分', value: `${formatMoney(d.pointBalance)} 积分` },
    {
      label: '家庭积分',
      value: d.familyPointBalance == null ? '—（无家庭）' : `${formatMoney(d.familyPointBalance)} 积分`
    },
    { label: '物业币余额', value: `${formatMoney(d.coinBalance)} 物业币` },
    { label: '累计消费', value: d.totalConsumption !== undefined ? `¥${formatMoney(d.totalConsumption)}` : '—' },
    { label: '累计订单', value: d.totalOrders !== undefined ? String(d.totalOrders) : '—' },
    { label: '注册时间', value: d.createdAt || '—' },
    { label: '更新时间', value: d.updatedAt || '—' }
  ]
})

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
      status: activeTab.value === 'all' ? undefined : activeTab.value,
      sort: '+building,+floor,+unit,+room'
    })
    users.value = sortResidentsByAddress(mapPointsUsers(res.list || []))
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

function openCoinModal(user: PointsUser, type: CoinModalType) {
  coinTargetUser.value = user
  coinModal.value = type
  coinForm.value = {
    amount: type === 'freeze' ? Number(user.coinBalance) || 0 : 0,
    reason: ''
  }
  coinError.value = ''
  coinSuccess.value = ''
}

function closeCoinModal() {
  coinModal.value = null
  coinTargetUser.value = null
  coinForm.value = { amount: 0, reason: '' }
  coinError.value = ''
  coinSuccess.value = ''
}

async function submitCoinModal() {
  const user = coinTargetUser.value
  if (!user || !coinModal.value) return
  const reason = coinForm.value.reason.trim()
  if (!reason) {
    coinError.value = coinModal.value === 'freeze' ? '请填写冻结原因' : '请填写解冻原因'
    return
  }

  coinSubmitting.value = true
  coinError.value = ''
  coinSuccess.value = ''

  try {
    if (coinModal.value === 'freeze') {
      const amount = Number(coinForm.value.amount)
      if (!amount || amount <= 0) {
        coinError.value = '请输入有效的冻结金额'
        return
      }
      await residentApi.freezeCoin(user.id, {
        amount,
        reason
      })
      coinSuccess.value = '物业币已冻结'
    } else {
      await residentApi.unfreezeCoin(user.id, {
        reason
      })
      coinSuccess.value = '物业币已解冻'
    }
    await loadUsers(currentPage.value)
    setTimeout(closeCoinModal, 1500)
  } catch (e) {
    coinError.value = resolveErrorMessage(e)
  } finally {
    coinSubmitting.value = false
  }
}

function resetEarnForm() {
  earnForm.value = {
    residentId: '',
    coinAmount: 0,
    description: '管理员充值'
  }
  earnSelectedName.value = ''
  earnError.value = ''
  earnSuccess.value = ''
}

function openEarnModal(user?: PointsUser) {
  resetEarnForm()
  earnLockedUser.value = user || null
  if (user) {
    earnForm.value.residentId = user.id
    earnSelectedName.value = user.name
  }
  earnModalKey.value++
  earnModalOpen.value = true
}

function closeEarnModal() {
  earnModalOpen.value = false
  earnLockedUser.value = null
  resetEarnForm()
}

function onEarnResidentSelect(item: ResidentItem) {
  earnSelectedName.value = item.name || item.phone || item.id
}

async function submitEarnModal() {
  const residentId = earnLockedUser.value?.id || earnForm.value.residentId.trim()
  const coinAmount = Number(earnForm.value.coinAmount)
  const description = earnForm.value.description.trim()

  if (!residentId) {
    earnError.value = '请选择业主'
    return
  }
  if (!coinAmount || coinAmount < 0.01) {
    earnError.value = '发放金额须不少于 0.01'
    return
  }

  earnSubmitting.value = true
  earnError.value = ''
  earnSuccess.value = ''

  try {
    const result = await propertyCoinApi.earn({
      residentId,
      coinAmount,
      source: PROPERTY_COIN_SOURCE.MANUAL,
      description: description || undefined
    })
    const name = earnLockedUser.value?.name || earnSelectedName.value || '该用户'
    const balance = result.newBalance ?? result.balance
    earnSuccess.value =
      balance !== undefined
        ? `已向 ${name} 发放 ${formatMoney(coinAmount)} 物业币，余额 ¥${formatMoney(balance)}`
        : `已向 ${name} 发放 ${formatMoney(coinAmount)} 物业币`
    await loadUsers(currentPage.value)
    try {
      const [pool, dashOverview] = await Promise.all([
        pointApi.pool(),
        dashboardApi.overview()
      ])
      poolOverview.value = mapPointPoolOverview(pool)
      overview.value = mapPointsOverview(pool, dashOverview)
    } catch {
      /* 列表已刷新，总览失败不影响发放结果 */
    }
    setTimeout(closeEarnModal, 1500)
  } catch (e) {
    earnError.value = resolveErrorMessage(e)
  } finally {
    earnSubmitting.value = false
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
  } catch (e) {
    // 测服常见：积分池未初始化 → 404「积分池不存在」，不阻断页面
    poolOverview.value = null
    overview.value = mapPointsOverview(undefined, undefined)
    console.warn('[Points] 积分池概览加载失败', e)
  } finally {
    poolLoading.value = false
  }
  loadUsers(1)
  loadCharts()
  loadPoolRecords(1)
})
</script>


<style scoped>
.page { max-width: 1200px; }
.charts { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.poolRecords {
  background: #fff;
  border-radius: 12px;
  margin-bottom: 20px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  overflow: hidden;
}
.poolRecords .header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  padding: 20px 24px;
  border-bottom: 1px solid #f0f0f3;
  flex-wrap: wrap;
}
.poolRecords .title { font-size: 18px; font-weight: 600; margin: 0 0 4px; color: #1f1f2e; }
.poolRecords .subHint { margin: 0; font-size: 13px; color: #8c8c9a; }
.poolRecords .toolbar { display: flex; gap: 10px; align-items: center; }
.poolRecords .filterSelect {
  padding: 8px 12px; border: 1px solid #e8e8ec; border-radius: 8px; font-size: 13px; background: #fafafc;
}
.poolRecords .refreshBtn {
  padding: 8px 14px; border: 1px solid #e8e8ec; border-radius: 8px; background: #fff; cursor: pointer;
}
.poolRecords .emptyChart { padding: 24px; text-align: center; color: #8c8c9a; margin: 0; }
.poolRecords .tableWrap { width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
.poolRecords .table {
  width: 100%;
  min-width: 720px;
  border-collapse: collapse;
  font-size: 14px;
}
.poolRecords .table thead th {
  text-align: left;
  padding: 14px 24px;
  color: #8c8c9a;
  font-weight: 500;
  background: #fafafc;
  border-bottom: 1px solid #f0f0f3;
  white-space: nowrap;
}
.poolRecords .table tbody td {
  padding: 14px 24px;
  color: #1f1f2e;
  border-bottom: 1px solid #f0f0f3;
  vertical-align: middle;
}
.poolRecords .table tbody tr:last-child td { border-bottom: none; }
.poolRecords .table tbody tr:hover td { background: #fcfcfd; }
.poolRecords .emptyCell { text-align: center; padding: 28px 24px; color: #8c8c9a; }
.poolRecords .typeBadge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  background: #f0f0ff;
  color: #5c5c9e;
  white-space: nowrap;
}
.poolRecords .num { font-variant-numeric: tabular-nums; white-space: nowrap; }
.poolRecords .source { max-width: 280px; color: #5c5c66; }
.poolRecords .time { color: #8c8c9a; white-space: nowrap; }
.poolRecords .footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 24px;
  border-top: 1px solid #f0f0f3;
  flex-wrap: wrap;
  gap: 12px;
}
.poolRecords .total { font-size: 13px; color: #8c8c9a; }
.poolRecords .pagination { display: flex; align-items: center; gap: 8px; }
.poolRecords .pageBtn {
  width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
  border-radius: 6px; border: 1px solid #e8e8ec; background: #ffffff; color: #5c5c66; font-size: 14px; cursor: pointer;
}
.poolRecords .pageBtn:disabled { color: #c8c8d0; cursor: not-allowed; }

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

.assetTable { background: #ffffff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); margin-bottom: 20px; overflow: hidden; min-width: 0; }
.assetTable .header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid #f0f0f3; flex-wrap: wrap; gap: 16px; }
.assetTable .titleWrap { display: flex; align-items: center; gap: 16px; }
.assetTable .title { font-size: 18px; font-weight: 600; color: #1f1f2e; margin-bottom: 0; }
.assetTable .toolbar { display: flex; align-items: center; gap: 12px; }
.assetTable .search { display: flex; align-items: center; gap: 8px; padding: 10px 14px; border: 1px solid #e8e8ec; border-radius: 8px; background: #fafafc; min-width: 220px; }
.assetTable .search svg { width: 18px; height: 18px; color: #8c8c9a; }
.assetTable .search input { border: none; background: transparent; font-size: 14px; color: #1f1f2e; outline: none; flex: 1; }
.assetTable .search input::placeholder { color: #8c8c9a; }
.assetTable .tableScroll { width: 100%; max-width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
.assetTable .table { width: 100%; min-width: 860px; font-size: 14px; }
.assetTable .table thead th { text-align: left; padding: 14px 24px; color: #8c8c9a; font-weight: 500; background: #fafafc; border-bottom: 1px solid #f0f0f3; }
.assetTable .table tbody td { padding: 16px 24px; color: #1f1f2e; border-bottom: 1px solid #f0f0f3; vertical-align: middle; }
.assetTable .table tbody tr:last-child td { border-bottom: none; }
.assetTable .userInfo { display: flex; align-items: center; gap: 12px; }
.assetTable .avatar { width: 36px; height: 36px; border-radius: 50%; color: #ffffff; font-size: 13px; font-weight: 500; display: flex; align-items: center; justify-content: center; }
.assetTable .name { font-weight: 500; color: #1f1f2e; }
.assetTable .badge { display: inline-block; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 500; }
.assetTable .badge.purple { background: #f0f0ff; color: #5c5c9e; }
.assetTable .badge.purple.soft { background: #f5f3ff; color: #7c6db5; font-weight: 500; }
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
.emptyChart {
  min-height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #8c8c9a;
  font-size: 13px;
  padding: 24px;
}

.trendChart { background: #ffffff; border-radius: 12px; padding: 20px 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.trendChart .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; gap: 12px; flex-wrap: wrap; }
.trendChart .title { font-size: 15px; font-weight: 500; color: #1f1f2e; margin-bottom: 0; }
.chartMeta { font-size: 12px; color: #8c8c9a; }
.consumeList { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 14px; }
.consumeItem { display: flex; flex-direction: column; gap: 6px; }
.consumeHead { display: flex; justify-content: space-between; gap: 12px; font-size: 13px; color: #5c5c66; }
.consumeHead strong { color: #1f1f2e; font-weight: 600; }
.consumeBarTrack { height: 8px; border-radius: 999px; background: #f0f0f3; overflow: hidden; }
.consumeBarFill { height: 100%; background: #5c5c9e; border-radius: 999px; }
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
.required { color: #e05c5c; }
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
  .assetTable .toolbar .btnPrimary { width: 100%; min-height: 44px; }
  .assetTable .footer { flex-direction: column; align-items: flex-start; padding: 14px 16px; }
  .assetTable .pagination { width: 100%; justify-content: flex-end; }
  .poolRecords .header { padding: 16px; }
  .poolRecords .toolbar { width: 100%; }
  .poolRecords .filterSelect { flex: 1; min-width: 0; }
  .poolRecords .table thead th,
  .poolRecords .table tbody td { padding: 12px 14px; }
  .poolRecords .footer { flex-direction: column; align-items: flex-start; padding: 14px 16px; }
  .poolRecords .pagination { width: 100%; justify-content: flex-end; }
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
