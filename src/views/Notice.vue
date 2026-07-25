<template>
    <div class="page">
      <div class="header">
        <div>
          <h1 class="title">{{ editingId ? '编辑通告' : '通告发布' }}</h1>
          <p class="desc">发布新的物业通告或查看历史发布记录</p>
        </div>
        <div class="actions">
          <button
            v-if="editingId"
            type="button"
            class="btnSecondary"
            :disabled="formSubmitting"
            @click="resetForm"
          >
            取消编辑
          </button>
          <button
            type="button"
            class="btnSecondary"
            :disabled="formSubmitting"
            @click="submitForm(ANNOUNCEMENT_STATUS.DRAFT)"
          >
            {{ formSubmitting ? '保存中...' : '存为草稿' }}
          </button>
          <button
            type="button"
            class="btnPrimary"
            :disabled="formSubmitting"
            @click="submitForm(ANNOUNCEMENT_STATUS.PUBLISHED)"
          >
            <IconSvg name="play" />
            <span>{{ formSubmitting ? '发布中...' : '立即发布' }}</span>
          </button>
        </div>
      </div>
      <div class="grid">
        <div class="card">
          <div class="header">
            <IconSvg name="edit" class="icon" />
            <span>内容编辑</span>
          </div>
          <div class="form">
            <div class="field">
              <label class="label">公告类型</label>
              <select v-model="publishMode" class="input" :disabled="!!editingId">
                <option value="standard">标准公告</option>
                <option value="product">产品推荐</option>
                <option value="activity">活动内容</option>
              </select>
            </div>
            <div v-if="publishMode === 'standard'" class="field">
              <label class="label">公告子类型</label>
              <select v-model="form.announcementType" class="input">
                <option v-for="opt in ANNOUNCEMENT_TYPE_OPTIONS" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
            </div>
            <div v-if="publishMode === 'product'" class="fieldGroup">
              <div class="field">
                <label class="label">小区 ID</label>
                <input v-model="productForm.communityId" class="input" placeholder="com_xxx" />
              </div>
              <div class="field">
                <label class="label">商家 ID</label>
                <input v-model="productForm.merchantId" class="input" placeholder="mch_xxx" />
              </div>
              <div class="field">
                <label class="label">商品 ID</label>
                <input v-model="productForm.productId" class="input" placeholder="prd_xxx" />
              </div>
              <div class="field">
                <label class="label">封面 URL</label>
                <input v-model="productForm.coverUrl" class="input" placeholder="https://..." />
              </div>
            </div>
            <div v-if="publishMode === 'activity'" class="fieldGroup">
              <div class="field">
                <label class="label">小区 ID</label>
                <input v-model="activityForm.communityId" class="input" placeholder="com_xxx" />
              </div>
              <div class="field">
                <label class="label">活动组 ID</label>
                <input v-model="activityForm.activityGroupId" class="input" placeholder="ag_xxx" />
              </div>
            </div>
            <div class="field">
              <label class="label">通告标题</label>
              <input
                v-model="form.title"
                type="text"
                class="input"
                maxlength="200"
                placeholder="输入简洁明了的通告标题"
              />
            </div>
            <div class="field">
              <label class="label">详细内容</label>
              <textarea
                v-model="form.content"
                class="contentInput"
                rows="8"
                placeholder="在此输入通告正文..."
              />
            </div>
          </div>
        </div>
        <div class="card">
          <div class="header">
            <IconSvg name="target" class="icon" />
            <span>定向推送设置</span>
          </div>
          <div class="form">
            <div class="field">
              <label class="label">发布范围</label>
              <div class="readonlyRow">
                <span>物业公司</span>
                <strong>{{ propertyCompanyLabel }}</strong>
              </div>
              <div class="readonlyRow">
                <span>小区 ID</span>
                <strong>{{ DEFAULT_COMMUNITY_ID }}</strong>
              </div>
            </div>
            <div class="field">
              <label class="label">目标群体</label>
              <label class="checkbox inline">
                <input v-model="selectAllTargetRoles" type="checkbox" @change="onSelectAllTargetRoles" />
                <span class="checkmark"><IconSvg v-if="selectAllTargetRoles" name="check" /></span>
                <span>全部角色</span>
              </label>
              <div class="checkboxGroup rolesGroup" :class="{ disabledGroup: selectAllTargetRoles }">
                <label
                  v-for="opt in ANNOUNCEMENT_TARGET_ROLE_OPTIONS"
                  :key="opt.value"
                  class="checkbox"
                  :class="{ disabled: selectAllTargetRoles }"
                >
                  <input
                    v-model="form.selectedTargetRoles"
                    type="checkbox"
                    :value="opt.value"
                    :disabled="selectAllTargetRoles"
                  />
                  <span class="checkmark">
                    <IconSvg v-if="form.selectedTargetRoles.includes(opt.value)" name="check" />
                  </span>
                  <span>{{ opt.label }}</span>
                </label>
              </div>
            </div>
            <div v-if="form.announcementType === ANNOUNCEMENT_TYPE.MERCHANT" class="field">
              <label class="label">关联商家 ID</label>
              <input v-model="form.merchantId" class="input" placeholder="merchant_xxx，商家公告时填写" />
            </div>
            <div class="field">
              <label class="label">封面图片 URL</label>
              <textarea
                v-model="form.coverUrlsText"
                class="contentInput"
                rows="2"
                placeholder="每行一个图片地址，可选"
              />
            </div>
            <div class="field">
              <label class="label">覆盖楼栋</label>
              <div class="checkboxGroup">
                <label class="checkbox">
                  <input v-model="selectAllBuildings" type="checkbox" @change="onSelectAllBuildings" />
                  <span class="checkmark"><IconSvg v-if="selectAllBuildings" name="check" /></span>
                  <span>全部楼栋</span>
                </label>
                <label
                  v-for="building in buildingOptions"
                  :key="building"
                  class="checkbox"
                  :class="{ disabled: selectAllBuildings }"
                >
                  <input
                    v-model="form.selectedBuildings"
                    type="checkbox"
                    :value="building"
                    :disabled="selectAllBuildings"
                  />
                  <span class="checkmark">
                    <IconSvg v-if="form.selectedBuildings.includes(building)" name="check" />
                  </span>
                  <span>{{ building }}</span>
                </label>
              </div>
              <p v-if="!buildingOptions.length" class="hint">暂无楼栋数据，将默认覆盖全部楼栋</p>
            </div>
            <div class="field">
              <label class="label">投递渠道</label>
              <select v-model="form.deliveryChannel" class="input">
                <option v-for="opt in DELIVERY_CHANNEL_OPTIONS" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
            </div>
            <div class="field">
              <label class="checkbox inline">
                <input v-model="form.collectEnabled" type="checkbox" />
                <span class="checkmark"><IconSvg v-if="form.collectEnabled" name="check" /></span>
                <span>启用信息收集（如停水储水登记）</span>
              </label>
            </div>
            <div v-if="form.collectEnabled" class="field">
              <label class="label">收集字段</label>
              <div v-for="(field, index) in form.collectFields" :key="index" class="collectFieldRow">
                <input v-model="field.name" class="input sm" placeholder="字段 key" />
                <input v-model="field.label" class="input" placeholder="显示名称" />
                <select v-model="field.type" class="input sm">
                  <option v-for="opt in ANNOUNCEMENT_COLLECT_FIELD_TYPE_OPTIONS" :key="opt.value" :value="opt.value">
                    {{ opt.label }}
                  </option>
                </select>
                <button type="button" class="btnRemove" @click="removeCollectField(index)">删除</button>
              </div>
              <button type="button" class="btnAddField" @click="addCollectField">添加字段</button>
            </div>
            <div class="infoBox">
              <IconSvg name="info" />
              <span>
                目标群体：<strong>{{ targetRolesText }}</strong>；
                覆盖楼栋：<strong>{{ buildingsText }}</strong>。
                草稿可在下方列表继续编辑发布。
              </span>
            </div>
          </div>
        </div>
      </div>
      <p v-if="formError" class="formError">{{ formError }}</p>
      <p v-if="formSuccess" class="formSuccess">{{ formSuccess }}</p>

      <div class="history">
        <div class="head">
          <div class="header">
            <IconSvg name="history" class="icon" />
            <span>历史通告</span>
          </div>
          <div class="listFilters">
            <select v-model="listTypeFilter" class="filterSelect" @change="loadNotices(1)">
              <option v-for="opt in ANNOUNCEMENT_LIST_TYPE_OPTIONS" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
          </div>
          <form class="search" @submit.prevent="submitSearch">
            <IconSvg name="search" />
            <input
              v-model="searchKeyword"
              type="search"
              placeholder="搜索通告标题..."
              @input="onSearchInput"
            />
          </form>
        </div>
        <table v-if="!isMobile" class="table">
          <thead>
            <tr>
              <th>发布时间</th>
              <th>标题</th>
              <th>目标群体</th>
              <th>覆盖楼栋</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="5" style="text-align:center;padding:24px;color:#8c8c9a">加载中...</td>
            </tr>
            <tr v-else-if="!filteredNotices.length">
              <td colspan="5" style="text-align:center;padding:24px;color:#8c8c9a">暂无通告</td>
            </tr>
            <template v-else>
              <tr v-for="notice in filteredNotices" :key="notice.id">
                <td>{{ notice.publishTime }}</td>
                <td>
                  <div class="cellTitle">{{ notice.title }}</div>
                  <div class="cellPublisher">{{ notice.announcementTypeLabel }} · 发布人：{{ notice.publisher }}</div>
                </td>
                <td>
                  <div class="scope">
                    <span class="tag role">{{ notice.targetRolesLabel }}</span>
                  </div>
                </td>
                <td>
                  <div class="scope">
                    <span v-for="(item, index) in notice.scope" :key="index" class="tag">{{ item }}</span>
                  </div>
                </td>
                <td>
                  <div class="rowActions">
                    <button type="button" class="detail" @click="openDetailModal(notice.id)">详情</button>
                    <button type="button" class="detail" @click="openReadStats(notice.id)">已读统计</button>
                    <button
                      type="button"
                      class="detail"
                      :disabled="editingLoadingId === notice.id"
                      @click="startEdit(notice.id)"
                    >
                      {{ editingLoadingId === notice.id ? '加载中...' : '编辑' }}
                    </button>
                    <button type="button" class="danger" @click="openDeleteModal(notice.id, notice.title)">删除</button>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
        <div v-else class="mobileNoticeList">
          <p v-if="loading" class="mobileListState">加载中...</p>
          <p v-else-if="!filteredNotices.length" class="mobileListState">暂无通告</p>
          <article v-for="notice in filteredNotices" :key="notice.id" class="mobileNoticeCard">
            <div class="mobileNoticeTop">
              <span class="mobileNoticeTime">{{ notice.publishTime }}</span>
              <span class="tag role">{{ notice.announcementTypeLabel }}</span>
            </div>
            <h3 class="mobileNoticeTitle">{{ notice.title }}</h3>
            <p class="mobileNoticePublisher">发布人：{{ notice.publisher }}</p>
            <div class="mobileNoticeMeta">
              <span class="mobileMetaLabel">目标群体</span>
              <span class="tag role">{{ notice.targetRolesLabel }}</span>
            </div>
            <div class="mobileNoticeMeta">
              <span class="mobileMetaLabel">覆盖楼栋</span>
              <div class="scope">
                <span v-for="(item, index) in notice.scope" :key="index" class="tag">{{ item }}</span>
              </div>
            </div>
            <div class="mobileNoticeActions">
              <button type="button" class="detail" @click="openDetailModal(notice.id)">详情</button>
              <button type="button" class="detail" @click="openReadStats(notice.id)">已读统计</button>
              <button
                type="button"
                class="detail"
                :disabled="editingLoadingId === notice.id"
                @click="startEdit(notice.id)"
              >
                {{ editingLoadingId === notice.id ? '加载中...' : '编辑' }}
              </button>
              <button type="button" class="danger" @click="openDeleteModal(notice.id, notice.title)">删除</button>
            </div>
          </article>
        </div>
        <div class="footer">
          <span class="total">显示 {{ pageStart }} 到 {{ pageEnd }}，共 {{ noticesTotal.toLocaleString() }} 条记录</span>
          <div v-if="totalPages > 1" class="pagination">
            <button class="pageBtn" :disabled="currentPage <= 1 || loading" @click="changePage(currentPage - 1)">&lt;</button>
            <span class="pageInfo">{{ currentPage }} / {{ totalPages }}</span>
            <button class="pageBtn" :disabled="currentPage >= totalPages || loading" @click="changePage(currentPage + 1)">&gt;</button>
          </div>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="detailModalOpen" class="modalOverlay" @click.self="closeDetailModal">
        <div class="modal modalWide modalScroll" :class="{ mobileSheet: isMobile }">
          <div class="modalHeader">
            <h3 class="modalTitle">通告详情</h3>
            <button type="button" class="modalClose" @click="closeDetailModal">&times;</button>
          </div>
          <div class="modalBody">
            <div v-if="detailLoading" class="loadingText">加载中...</div>
            <div v-else-if="detailRows.length" class="detailGrid">
              <div v-for="row in detailRows" :key="row.label" class="detailItem">
                <span class="detailLabel">{{ row.label }}</span>
                <span class="detailValue">{{ row.value }}</span>
              </div>
              <div v-if="detailData?.content" class="detailContent">
                <span class="detailLabel">正文内容</span>
                <p class="detailValue content">{{ detailData.content }}</p>
              </div>
              <div v-if="detailData?.collectFields?.length" class="detailContent">
                <span class="detailLabel">收集字段</span>
                <ul class="collectFieldList">
                  <li v-for="field in detailData.collectFields" :key="field.name">
                    {{ field.label || field.name }}（{{ field.type }}）
                  </li>
                </ul>
              </div>
              <div v-if="detailData?.coverUrls?.length" class="detailContent">
                <span class="detailLabel">封面图片</span>
                <div class="coverList">
                  <a v-for="(url, idx) in detailData.coverUrls" :key="idx" :href="url" target="_blank" rel="noopener">
                    {{ url }}
                  </a>
                </div>
              </div>
            </div>
            <p v-if="detailError" class="error">{{ detailError }}</p>
            <div class="modalFooter">
              <button type="button" class="btnSecondary" @click="closeDetailModal">关闭</button>
              <button
                v-if="detailData"
                type="button"
                class="btnPrimary"
                @click="startEdit(detailData.id); closeDetailModal()"
              >
                编辑
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="readStatsOpen" class="modalOverlay" @click.self="readStatsOpen = false">
        <div class="modal" :class="{ mobileSheet: isMobile }">
          <div class="modalHeader">
            <h3 class="modalTitle">公告已读统计</h3>
            <button type="button" class="modalClose" @click="readStatsOpen = false">&times;</button>
          </div>
          <div class="modalBody">
            <div v-if="readStatsLoading" class="loadingText">加载中...</div>
            <template v-else-if="readStats">
              <div class="detailGrid">
                <div class="detailItem">
                  <span class="detailLabel">投递渠道</span>
                  <span class="detailValue">{{ getEnumLabel(DELIVERY_CHANNEL_LABEL, readStats.deliveryChannel) }}</span>
                </div>
                <div class="detailItem">
                  <span class="detailLabel">目标人数</span>
                  <span class="detailValue">{{ readStats.targetCount ?? 0 }}</span>
                </div>
                <div class="detailItem">
                  <span class="detailLabel">已读 / 未读</span>
                  <span class="detailValue">{{ readStats.readCount ?? 0 }} / {{ readStats.unreadCount ?? 0 }}</span>
                </div>
                <div class="detailItem">
                  <span class="detailLabel">已读率</span>
                  <span class="detailValue">{{ formatReadRate(readStats.readRate) }}</span>
                </div>
              </div>
              <table v-if="readStats.byBuilding?.length" class="table" style="margin-top:12px">
                <thead>
                  <tr>
                    <th>楼栋</th>
                    <th>已读</th>
                    <th>未读</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in readStats.byBuilding" :key="row.buildingNo">
                    <td>{{ row.buildingNo }}</td>
                    <td>{{ row.readCount }}</td>
                    <td>{{ row.unreadCount }}</td>
                  </tr>
                </tbody>
              </table>
            </template>
            <p v-if="readStatsError" class="error">{{ readStatsError }}</p>
            <div class="modalFooter">
              <button type="button" class="btnSecondary" @click="readStatsOpen = false">关闭</button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="deleteModalOpen" class="modalOverlay" @click.self="closeDeleteModal">
        <div class="modal" :class="{ mobileSheet: isMobile }">
          <div class="modalHeader">
            <h3 class="modalTitle">删除通告</h3>
            <button type="button" class="modalClose" @click="closeDeleteModal">&times;</button>
          </div>
          <div class="modalBody">
            <p class="confirmText">确定删除通告「{{ deleteTargetTitle }}」吗？删除后将归档，不可恢复展示。</p>
            <p v-if="deleteError" class="error">{{ deleteError }}</p>
            <div class="modalFooter">
              <button type="button" class="btnSecondary" @click="closeDeleteModal">取消</button>
              <button type="button" class="btnDanger" :disabled="deleteSubmitting" @click="submitDelete">
                {{ deleteSubmitting ? '删除中...' : '确认删除' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import IconSvg from '../components/IconSvg.vue'
import { useIsMobile } from '../composables/useIsMobile'
import { announcementApi, announcementExtApi, residentApi } from '../api/services'
import { mapAnnouncements } from '../api/mappers'
import { ApiError } from '../api/request'
import type {
  AnnouncementCollectField,
  AnnouncementCreatePayload,
  AnnouncementItem,
  AnnouncementReadStats,
  AnnouncementUpdatePayload,
  ResidentItem
} from '../api/types'
import { useAuthStore } from '../stores/auth'
import {
  ANNOUNCEMENT_COLLECT_FIELD_TYPE_OPTIONS,
  ANNOUNCEMENT_LIST_TYPE_OPTIONS,
  ANNOUNCEMENT_STATUS,
  ANNOUNCEMENT_TARGET_ROLE_OPTIONS,
  ANNOUNCEMENT_TYPE,
  ANNOUNCEMENT_TYPE_LABEL,
  ANNOUNCEMENT_TYPE_OPTIONS,
  DELIVERY_CHANNEL,
  DELIVERY_CHANNEL_LABEL,
  DELIVERY_CHANNEL_OPTIONS,
  formatAnnouncementTargetRoles,
  getEnumLabel,
  normalizeAnnouncementType,
  ROLE_LABEL,
  USER_ROLE
} from '../constants/enums'

const PAGE_SIZE = 20
const DEFAULT_COMMUNITY_ID = import.meta.env.VITE_COMMUNITY_ID || 'com_demo001'
const DEFAULT_COLLECT_FIELDS: AnnouncementCollectField[] = [
  { name: 'needWater', label: '是否需要储水', type: 'boolean' },
  { name: 'contactPhone', label: '联系电话', type: 'text' }
]

const authStore = useAuthStore()
const { isMobile } = useIsMobile()

const loading = ref(true)
const formSubmitting = ref(false)
const editingLoadingId = ref('')
const formError = ref('')
const formSuccess = ref('')
const editingId = ref('')
const publishMode = ref<'standard' | 'product' | 'activity'>('standard')

const productForm = ref({
  communityId: DEFAULT_COMMUNITY_ID,
  merchantId: '',
  productId: '',
  coverUrl: ''
})

const activityForm = ref({
  communityId: DEFAULT_COMMUNITY_ID,
  activityGroupId: ''
})

const form = ref<{
  title: string
  content: string
  announcementType: string
  selectedBuildings: string[]
  selectedTargetRoles: string[]
  merchantId: string
  collectEnabled: boolean
  collectFields: AnnouncementCollectField[]
  coverUrlsText: string
  deliveryChannel: string
}>({
  title: '',
  content: '',
  announcementType: ANNOUNCEMENT_TYPE.PROPERTY,
  selectedBuildings: [] as string[],
  selectedTargetRoles: [USER_ROLE.RESIDENT],
  merchantId: '',
  collectEnabled: false,
  collectFields: [] as AnnouncementCollectField[],
  coverUrlsText: '',
  deliveryChannel: DELIVERY_CHANNEL.ANNOUNCEMENT_BOARD
})
const selectAllBuildings = ref(true)
const selectAllTargetRoles = ref(false)
const buildingOptions = ref<string[]>([])
const listTypeFilter = ref('')

const rawNotices = ref<AnnouncementItem[]>([])
const notices = ref<ReturnType<typeof mapAnnouncements>>([])
const noticesTotal = ref(0)
const currentPage = ref(1)
const totalPages = ref(1)
const searchKeyword = ref('')
let searchTimer: ReturnType<typeof setTimeout>

const filteredNotices = computed(() => {
  const q = searchKeyword.value.trim().toLowerCase()
  if (!q) return notices.value
  return notices.value.filter((item) => item.title.toLowerCase().includes(q))
})

const detailModalOpen = ref(false)
const detailLoading = ref(false)
const detailError = ref('')
const detailData = ref<AnnouncementItem | null>(null)

const deleteModalOpen = ref(false)
const deleteTargetId = ref('')
const deleteTargetTitle = ref('')
const deleteSubmitting = ref(false)
const deleteError = ref('')

const readStatsOpen = ref(false)
const readStatsLoading = ref(false)
const readStatsError = ref('')
const readStats = ref<AnnouncementReadStats | null>(null)

function formatReadRate(rate?: number) {
  if (rate == null || Number.isNaN(rate)) return '—'
  return `${(rate <= 1 ? rate * 100 : rate).toFixed(1)}%`
}

async function openReadStats(id: string) {
  readStatsOpen.value = true
  readStatsLoading.value = true
  readStatsError.value = ''
  readStats.value = null
  try {
    readStats.value = await announcementApi.readStats(id)
  } catch (e) {
    readStatsError.value = resolveErrorMessage(e)
  } finally {
    readStatsLoading.value = false
  }
}

const propertyCompanyLabel = computed(() => authStore.propertyCompanyId || '—')

const targetRolesText = computed(() => {
  if (selectAllTargetRoles.value || !form.value.selectedTargetRoles.length) return '全部角色'
  return form.value.selectedTargetRoles.map((role) => getEnumLabel(ROLE_LABEL, role, role)).join('、')
})

const buildingsText = computed(() => {
  if (selectAllBuildings.value || !form.value.selectedBuildings.length) return '全部楼栋'
  return form.value.selectedBuildings.join('、')
})

const pageStart = computed(() => {
  if (!noticesTotal.value) return 0
  return (currentPage.value - 1) * PAGE_SIZE + 1
})

const pageEnd = computed(() => Math.min(currentPage.value * PAGE_SIZE, noticesTotal.value))

const detailRows = computed(() => {
  const d = detailData.value
  if (!d) return []
  return [
    { label: '标题', value: d.title || '—' },
    { label: '公告类型', value: getEnumLabel(ANNOUNCEMENT_TYPE_LABEL, normalizeAnnouncementType(d.announcementType)) },
    { label: '物业公司', value: d.propertyCompanyId || '—' },
    { label: '小区 ID', value: d.communityId || '—' },
    { label: '覆盖楼栋', value: d.targetBuildings?.length ? d.targetBuildings.join('、') : '全部楼栋' },
    { label: '目标群体', value: formatAnnouncementTargetRoles(d.targetRoles) },
    { label: '投递渠道', value: getEnumLabel(DELIVERY_CHANNEL_LABEL, d.deliveryChannel, '仅公告栏') },
    { label: '关联商家', value: d.merchantId || '—' },
    { label: '信息收集', value: d.collectEnabled ? '已启用' : '未启用' },
    { label: '发布时间', value: d.publishedAt || '—' },
    { label: '创建时间', value: d.createdAt || '—' },
    { label: '更新时间', value: d.updatedAt || '—' }
  ]
})

function resolveErrorMessage(e: unknown) {
  if (e instanceof ApiError) return e.message
  if (e instanceof Error) return e.message
  return '操作失败，请稍后重试'
}

function onSelectAllBuildings() {
  if (selectAllBuildings.value) {
    form.value.selectedBuildings = []
  }
}

function onSelectAllTargetRoles() {
  if (selectAllTargetRoles.value) {
    form.value.selectedTargetRoles = []
  }
}

watch(
  () => form.value.collectEnabled,
  (enabled) => {
    if (enabled && !form.value.collectFields.length) {
      form.value.collectFields = DEFAULT_COLLECT_FIELDS.map((field) => ({ ...field }))
    }
  }
)

watch(
  () => form.value.selectedBuildings,
  (buildings) => {
    if (buildings.length > 0) selectAllBuildings.value = false
  },
  { deep: true }
)

watch(
  () => form.value.selectedTargetRoles,
  (roles) => {
    if (roles.length > 0) selectAllTargetRoles.value = false
  },
  { deep: true }
)

function collectBuildings(list: ResidentItem[]) {
  const set = new Set(buildingOptions.value)
  list.forEach(item => {
    if (item.building) set.add(item.building)
  })
  buildingOptions.value = Array.from(set).sort((a, b) => a.localeCompare(b, 'zh-CN'))
}

async function loadBuildingOptions() {
  try {
    const res = await residentApi.list({
      page: 1,
      pageSize: 100,
      propertyCompanyId: authStore.propertyCompanyId || undefined
    })
    collectBuildings(res.list || [])
  } catch (e) {
    console.error(e)
  }
}

function parseCoverUrls(text: string) {
  return text
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function buildCollectFields() {
  if (!form.value.collectEnabled) return undefined
  const fields = form.value.collectFields
    .map((field, index) => ({
      name: field.name.trim() || `field_${index + 1}`,
      label: field.label.trim() || field.name.trim() || `字段${index + 1}`,
      type: field.type || 'text'
    }))
    .filter((field) => field.label)
  return fields.length ? fields : undefined
}

function buildTargetRoles() {
  if (selectAllTargetRoles.value || !form.value.selectedTargetRoles.length) return undefined
  return [...form.value.selectedTargetRoles]
}

function buildTargetBuildings() {
  if (selectAllBuildings.value || !form.value.selectedBuildings.length) return undefined
  return [...form.value.selectedBuildings]
}

function buildCreatePayload(status: string): AnnouncementCreatePayload {
  const payload: AnnouncementCreatePayload = {
    title: form.value.title.trim(),
    content: form.value.content.trim(),
    announcementType: form.value.announcementType,
    status,
    collectEnabled: form.value.collectEnabled || undefined
  }
  const buildings = buildTargetBuildings()
  if (buildings?.length) payload.targetBuildings = buildings
  const targetRoles = buildTargetRoles()
  if (targetRoles?.length) payload.targetRoles = targetRoles
  const coverUrls = parseCoverUrls(form.value.coverUrlsText)
  if (coverUrls.length) payload.coverUrls = coverUrls
  const collectFields = buildCollectFields()
  if (collectFields?.length) payload.collectFields = collectFields
  if (authStore.propertyCompanyId) payload.propertyCompanyId = authStore.propertyCompanyId
  payload.communityId = DEFAULT_COMMUNITY_ID
  if (form.value.announcementType === ANNOUNCEMENT_TYPE.MERCHANT && form.value.merchantId.trim()) {
    payload.merchantId = form.value.merchantId.trim()
  }
  payload.deliveryChannel = form.value.deliveryChannel
  return payload
}

function buildUpdatePayload(status: string): AnnouncementUpdatePayload {
  const payload: AnnouncementUpdatePayload = {
    title: form.value.title.trim(),
    content: form.value.content.trim(),
    status,
    collectEnabled: form.value.collectEnabled,
    deliveryChannel: form.value.deliveryChannel
  }
  if (!selectAllBuildings.value) {
    payload.targetBuildings = buildTargetBuildings() ?? []
  }
  if (!selectAllTargetRoles.value) {
    payload.targetRoles = buildTargetRoles() ?? []
  }
  const coverUrls = parseCoverUrls(form.value.coverUrlsText)
  if (coverUrls.length) payload.coverUrls = coverUrls
  const collectFields = buildCollectFields()
  if (collectFields?.length) payload.collectFields = collectFields
  return payload
}

function resetForm() {
  editingId.value = ''
  publishMode.value = 'standard'
  productForm.value = {
    communityId: DEFAULT_COMMUNITY_ID,
    merchantId: '',
    productId: '',
    coverUrl: ''
  }
  activityForm.value = {
    communityId: DEFAULT_COMMUNITY_ID,
    activityGroupId: ''
  }
  form.value = {
    title: '',
    content: '',
    announcementType: ANNOUNCEMENT_TYPE.PROPERTY,
    selectedBuildings: [],
    selectedTargetRoles: [USER_ROLE.RESIDENT],
    merchantId: '',
    collectEnabled: false,
    collectFields: [],
    coverUrlsText: '',
    deliveryChannel: DELIVERY_CHANNEL.ANNOUNCEMENT_BOARD
  }
  selectAllBuildings.value = true
  selectAllTargetRoles.value = false
  formError.value = ''
  formSuccess.value = ''
}

function addCollectField() {
  form.value.collectFields.push({
    name: `field_${form.value.collectFields.length + 1}`,
    label: '',
    type: 'text'
  })
}

function removeCollectField(index: number) {
  form.value.collectFields.splice(index, 1)
}

function applyDetailToForm(data: AnnouncementItem) {
  editingId.value = data.id
  form.value.title = data.title || ''
  form.value.content = data.content || ''
  form.value.announcementType = normalizeAnnouncementType(data.announcementType)
  form.value.selectedBuildings = data.targetBuildings ? [...data.targetBuildings] : []
  if (data.targetRoles?.length) {
    form.value.selectedTargetRoles = [...data.targetRoles]
    selectAllTargetRoles.value = false
  } else {
    form.value.selectedTargetRoles = []
    selectAllTargetRoles.value = true
  }
  form.value.merchantId = data.merchantId || ''
  form.value.collectEnabled = !!data.collectEnabled
  form.value.collectFields = data.collectFields?.length
    ? data.collectFields.map((field) => ({ ...field }))
    : []
  form.value.coverUrlsText = data.coverUrls?.join('\n') || ''
  form.value.deliveryChannel = data.deliveryChannel || DELIVERY_CHANNEL.ANNOUNCEMENT_BOARD
  selectAllBuildings.value = !data.targetBuildings?.length
  formError.value = ''
  formSuccess.value = ''
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

async function loadNotices(page = currentPage.value) {
  loading.value = true
  try {
    const res = await announcementApi.list({
      page,
      pageSize: PAGE_SIZE,
      announcementType: listTypeFilter.value || undefined,
      communityId: DEFAULT_COMMUNITY_ID,
      sort: '-publishedAt'
    })
    rawNotices.value = (res.list || []).filter((item) => item.status !== ANNOUNCEMENT_STATUS.ARCHIVED)
    notices.value = mapAnnouncements(rawNotices.value)
    noticesTotal.value = res.pagination?.total ?? notices.value.length
    currentPage.value = res.pagination?.page ?? page
    totalPages.value = res.pagination?.totalPages ?? 1
  } catch (e) {
    console.error(e)
    rawNotices.value = []
    notices.value = []
    noticesTotal.value = 0
    totalPages.value = 1
  } finally {
    loading.value = false
  }
}

async function submitForm(status: string) {
  const title = form.value.title.trim()
  const content = form.value.content.trim()
  if (!title) {
    formError.value = '请填写通告标题'
    formSuccess.value = ''
    return
  }
  if (!content) {
    formError.value = '请填写通告内容'
    formSuccess.value = ''
    return
  }
  if (
    form.value.announcementType === ANNOUNCEMENT_TYPE.MERCHANT &&
    !form.value.merchantId.trim()
  ) {
    formError.value = '商家公告请填写关联商家 ID'
    formSuccess.value = ''
    return
  }
  if (!selectAllTargetRoles.value && !form.value.selectedTargetRoles.length) {
    formError.value = '请选择目标群体，或勾选全部角色'
    formSuccess.value = ''
    return
  }

  formSubmitting.value = true
  formError.value = ''
  formSuccess.value = ''

  try {
    if (editingId.value) {
      await announcementApi.update(editingId.value, buildUpdatePayload(status))
      formSuccess.value = status === ANNOUNCEMENT_STATUS.PUBLISHED ? '通告已更新并发布' : '草稿已保存'
    } else if (publishMode.value === 'product') {
      if (!productForm.value.communityId || !productForm.value.merchantId || !productForm.value.productId) {
        formError.value = '产品推荐请填写小区、商家和商品 ID'
        formSubmitting.value = false
        return
      }
      await announcementExtApi.createProduct({
        title,
        content,
        communityId: productForm.value.communityId.trim(),
        merchantId: productForm.value.merchantId.trim(),
        productId: productForm.value.productId.trim(),
        coverUrl: productForm.value.coverUrl.trim() || undefined
      })
      formSuccess.value = '产品推荐发布成功'
      resetForm()
    } else if (publishMode.value === 'activity') {
      if (!activityForm.value.communityId || !activityForm.value.activityGroupId) {
        formError.value = '活动内容请填写小区和活动组 ID'
        formSubmitting.value = false
        return
      }
      await announcementExtApi.createActivity({
        title,
        content,
        communityId: activityForm.value.communityId.trim(),
        activityGroupId: activityForm.value.activityGroupId.trim()
      })
      formSuccess.value = '活动内容发布成功'
      resetForm()
    } else {
      await announcementApi.create(buildCreatePayload(status))
      formSuccess.value = status === ANNOUNCEMENT_STATUS.PUBLISHED ? '通告发布成功' : '草稿保存成功'
      resetForm()
    }
    await loadNotices(currentPage.value)
    if (status === ANNOUNCEMENT_STATUS.PUBLISHED && editingId.value) {
      resetForm()
    }
  } catch (e) {
    formError.value = resolveErrorMessage(e)
  } finally {
    formSubmitting.value = false
  }
}

async function startEdit(id: string) {
  formError.value = ''
  formSuccess.value = ''
  editingLoadingId.value = id
  try {
    const data = await announcementApi.get(id)
    applyDetailToForm(data)
  } catch (e) {
    const cached = rawNotices.value.find((item) => item.id === id)
    if (cached) {
      applyDetailToForm(cached)
    } else {
      formError.value = resolveErrorMessage(e)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  } finally {
    editingLoadingId.value = ''
  }
}

async function openDetailModal(id: string) {
  detailError.value = ''
  detailData.value = null
  detailModalOpen.value = true
  detailLoading.value = true
  try {
    detailData.value = await announcementApi.get(id)
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

function openDeleteModal(id: string, title: string) {
  deleteTargetId.value = id
  deleteTargetTitle.value = title
  deleteError.value = ''
  deleteModalOpen.value = true
}

function closeDeleteModal() {
  deleteModalOpen.value = false
  deleteTargetId.value = ''
  deleteTargetTitle.value = ''
  deleteError.value = ''
}

async function submitDelete() {
  if (!deleteTargetId.value) return
  deleteSubmitting.value = true
  deleteError.value = ''
  const deletedId = deleteTargetId.value
  try {
    await announcementApi.remove(deletedId)
    if (editingId.value === deletedId) resetForm()
    rawNotices.value = rawNotices.value.filter((item) => item.id !== deletedId)
    notices.value = mapAnnouncements(rawNotices.value)
    if (noticesTotal.value > 0) noticesTotal.value -= 1
    closeDeleteModal()
    await loadNotices(currentPage.value)
  } catch (e) {
    deleteError.value = resolveErrorMessage(e)
  } finally {
    deleteSubmitting.value = false
  }
}

function changePage(page: number) {
  if (page < 1 || page > totalPages.value || page === currentPage.value) return
  currentPage.value = page
  loadNotices(page)
}

function submitSearch() {
  clearTimeout(searchTimer)
}

function onSearchInput() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(submitSearch, 300)
}

onMounted(async () => {
  await loadBuildingOptions()
  await loadNotices(1)
})
</script>

<style scoped>
.page { max-width: 1200px; }
.header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 24px; }
.title { font-size: 24px; font-weight: 600; color: #1f1f2e; margin-bottom: 8px; }
.desc { font-size: 14px; color: #8c8c9a; }
.actions { display: flex; gap: 12px; }
.btnSecondary { padding: 10px 18px; border-radius: 8px; border: 1px solid #e8e8ec; background: #ffffff; color: #5c5c66; font-size: 14px; cursor: pointer; }
.btnSecondary:hover:not(:disabled) { border-color: #5c5c9e; color: #5c5c9e; }
.btnSecondary:disabled { opacity: 0.6; cursor: not-allowed; }
.btnPrimary { display: flex; align-items: center; gap: 6px; padding: 10px 18px; border-radius: 8px; background: #5c5c9e; color: #ffffff; font-size: 14px; border: none; cursor: pointer; }
.btnPrimary:disabled { opacity: 0.6; cursor: not-allowed; }
.btnPrimary svg { width: 16px; height: 16px; }
.grid { display: grid; grid-template-columns: 1.5fr 1fr; gap: 20px; margin-bottom: 12px; }
.formError { font-size: 13px; color: #e05c5c; margin-bottom: 12px; }
.formSuccess { font-size: 13px; color: #3aaf7d; margin-bottom: 12px; }

.card { background: #ffffff; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.card .header { display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 500; color: #5c5c9e; margin-bottom: 20px; }
.card .icon { width: 20px; height: 20px; }
.card .field { margin-bottom: 20px; }
.card .field:last-child { margin-bottom: 0; }
.card .label { display: block; font-size: 14px; color: #5c5c66; margin-bottom: 10px; }
.card .input,
.card .contentInput { width: 100%; padding: 10px 14px; border: 1px solid #e8e8ec; border-radius: 8px; background: #fafafc; font-size: 14px; color: #1f1f2e; outline: none; box-sizing: border-box; font-family: inherit; }
.card .input:focus,
.card .contentInput:focus { border-color: #5c5c9e; background: #ffffff; }
.card .contentInput { resize: vertical; min-height: 160px; }
.card .contentInput::placeholder,
.card .input::placeholder { color: #8c8c9a; }
.card .checkboxGroup { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.card .checkbox { display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 14px; color: #5c5c66; }
.card .checkbox.inline { margin-bottom: 0; }
.card .checkbox.disabled { opacity: 0.5; cursor: not-allowed; }
.card .checkbox input { position: absolute; opacity: 0; width: 0; height: 0; }
.card .checkmark { width: 18px; height: 18px; border-radius: 4px; border: 2px solid #d0d0d8; display: flex; align-items: center; justify-content: center; color: #ffffff; flex-shrink: 0; }
.card .checkbox input:checked + .checkmark { background: #5c5c9e; border-color: #5c5c9e; }
.card .checkmark svg { width: 14px; height: 14px; }
.card .hint { font-size: 12px; color: #8c8c9a; margin-top: 8px; }
.card .infoBox { display: flex; align-items: flex-start; gap: 10px; padding: 14px; background: #fff8e8; border-radius: 10px; font-size: 13px; color: #8c6a3a; line-height: 1.5; }
.card .infoBox svg { width: 18px; height: 18px; flex-shrink: 0; color: #f5a623; }

.history { background: #ffffff; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.history .head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; gap: 12px; flex-wrap: wrap; }
.listFilters { display: flex; gap: 8px; flex-wrap: wrap; }
.filterSelect { padding: 8px 12px; border: 1px solid #e8e8ec; border-radius: 8px; background: #fafafc; font-size: 13px; color: #1f1f2e; }
.collectFieldRow { display: grid; grid-template-columns: 1fr 1.2fr 100px auto; gap: 8px; margin-bottom: 8px; align-items: center; }
.collectFieldRow .input.sm { min-width: 0; }
.btnRemove { padding: 8px 10px; border: 1px solid #ffa39e; background: #fff1f0; color: #cf1322; border-radius: 6px; cursor: pointer; font-size: 12px; white-space: nowrap; }
.btnAddField { padding: 8px 12px; border: 1px dashed #d0d0d8; background: #fafafc; color: #5c5c66; border-radius: 6px; cursor: pointer; font-size: 13px; }
.collectFieldList { margin: 0; padding-left: 18px; color: #1f1f2e; font-size: 14px; line-height: 1.8; }
.coverList { display: flex; flex-direction: column; gap: 6px; }
.coverList a { font-size: 13px; color: #5c5c9e; word-break: break-all; }
.history .header { display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 500; color: #5c5c9e; margin-bottom: 0; }
.history .icon { width: 20px; height: 20px; }
.history .search { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border: 1px solid #e8e8ec; border-radius: 8px; background: #fafafc; min-width: 220px; }
.history .search svg { width: 16px; height: 16px; color: #8c8c9a; }
.history .search input { border: none; background: transparent; font-size: 14px; color: #1f1f2e; outline: none; flex: 1; }
.history .table { width: 100%; font-size: 14px; }
.history .table thead th { text-align: left; padding: 14px 24px; color: #8c8c9a; font-weight: 500; background: #fafafc; border-bottom: 1px solid #f0f0f3; }
.history .table tbody td { padding: 16px 24px; color: #1f1f2e; border-bottom: 1px solid #f0f0f3; vertical-align: middle; }
.history .table tbody tr:last-child td { border-bottom: none; }
.history .cellTitle { font-weight: 500; color: #1f1f2e; margin-bottom: 4px; }
.history .cellPublisher { font-size: 12px; color: #8c8c9a; }
.history .scope { display: flex; flex-wrap: wrap; gap: 6px; }
.history .tag { display: inline-block; padding: 3px 8px; border-radius: 10px; background: #e8f8f0; color: #3aaf7d; font-size: 12px; }
.history .tag.role { background: #eef0ff; color: #5c5c9e; }
.readonlyRow { display: flex; justify-content: space-between; gap: 12px; padding: 8px 0; font-size: 13px; border-bottom: 1px solid #f0f0f3; }
.readonlyRow span { color: #8c8c9a; }
.readonlyRow strong { color: #1f1f2e; font-weight: 500; }
.rolesGroup.disabledGroup { opacity: 0.55; }
.history .rowActions { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.history .detail { font-size: 14px; color: #5c5c9e; background: transparent; border: none; cursor: pointer; padding: 0; }
.history .detail:disabled { opacity: 0.6; cursor: wait; }
.history .danger { font-size: 14px; color: #e05c5c; background: transparent; border: none; cursor: pointer; padding: 0; }
.history .footer { display: flex; align-items: center; justify-content: space-between; padding: 14px 24px; border-top: 1px solid #f0f0f3; margin: 0 -24px -24px; flex-wrap: wrap; gap: 12px; }
.history .total { font-size: 13px; color: #8c8c9a; }
.history .pagination { display: flex; align-items: center; gap: 8px; }
.history .pageBtn { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 6px; border: 1px solid #e8e8ec; background: #ffffff; color: #5c5c66; font-size: 14px; cursor: pointer; }
.history .pageBtn:disabled { color: #c8c8d0; cursor: not-allowed; }
.history .pageInfo { font-size: 13px; color: #8c8c9a; min-width: 48px; text-align: center; }

.modalOverlay { position: fixed; inset: 0; z-index: 1000; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; padding: 24px; }
.modal { width: 100%; max-width: 480px; background: #ffffff; border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.12); }
.modalWide { max-width: 720px; }
.modalScroll { max-height: calc(100vh - 48px); display: flex; flex-direction: column; }
.modalScroll .modalBody { overflow-y: auto; }
.modalHeader { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid #f0f0f3; }
.modalTitle { font-size: 16px; font-weight: 600; color: #1f1f2e; margin: 0; }
.modalClose { width: 32px; height: 32px; border: none; background: transparent; font-size: 24px; color: #8c8c9a; cursor: pointer; }
.modalBody { padding: 24px; }
.detailGrid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px 24px; margin-bottom: 8px; }
.detailItem { display: flex; flex-direction: column; gap: 4px; }
.detailContent { grid-column: 1 / -1; display: flex; flex-direction: column; gap: 8px; }
.detailLabel { font-size: 12px; color: #8c8c9a; }
.detailValue { font-size: 14px; color: #1f1f2e; word-break: break-all; }
.detailValue.content { white-space: pre-wrap; line-height: 1.6; margin: 0; }
.loadingText { text-align: center; color: #8c8c9a; padding: 24px 0; }
.confirmText { font-size: 14px; color: #1f1f2e; line-height: 1.6; margin: 0 0 16px; }
.error { font-size: 13px; color: #e05c5c; margin-bottom: 12px; }
.modalFooter { display: flex; justify-content: flex-end; gap: 12px; margin-top: 8px; }
.btnDanger { padding: 10px 18px; border-radius: 8px; border: none; background: #e05c5c; color: #ffffff; font-size: 14px; cursor: pointer; }
.btnDanger:disabled { opacity: 0.6; cursor: not-allowed; }

@media (max-width: 900px) {
  .header { flex-direction: column; gap: 16px; }
  .actions { width: 100%; flex-direction: column; }
  .actions .btnSecondary, .actions .btnPrimary { width: 100%; justify-content: center; }
  .grid { grid-template-columns: 1fr; }
  .history .head { flex-direction: column; align-items: flex-start; }
  .history .search, .filterSelect { width: 100%; box-sizing: border-box; }
  .listFilters, .history .search { align-self: stretch; }
  .collectFieldRow { grid-template-columns: 1fr; }
  .card .checkboxGroup { grid-template-columns: repeat(2, 1fr); }
  .detailGrid { grid-template-columns: 1fr; }
  .mobileNoticeList { display: flex; flex-direction: column; gap: 12px; }
  .mobileListState { padding: 24px 0; text-align: center; color: #8c8c9a; font-size: 14px; }
  .mobileNoticeCard { padding: 16px; border: 1px solid #f0f0f3; border-radius: 10px; }
  .mobileNoticeTop, .mobileNoticeMeta { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
  .mobileNoticeTop { margin-bottom: 10px; }
  .mobileNoticeTime, .mobileMetaLabel, .mobileNoticePublisher { color: #8c8c9a; font-size: 12px; }
  .mobileNoticeTitle { margin: 0 0 4px; font-size: 15px; color: #1f1f2e; }
  .mobileNoticePublisher { margin: 0 0 12px; }
  .mobileNoticeMeta { padding: 8px 0; border-top: 1px solid #f5f5f7; font-size: 13px; }
  .mobileMetaLabel { flex-shrink: 0; line-height: 22px; }
  .mobileNoticeActions { display: flex; flex-wrap: wrap; gap: 14px; padding-top: 12px; }
  .mobileNoticeActions .detail, .mobileNoticeActions .danger { font-size: 13px; }
  .modalOverlay { align-items: flex-end; padding: 0; }
  .mobileSheet { width: 100%; max-width: none; max-height: calc(100vh - 24px); border-radius: 16px 16px 0 0; }
  .mobileSheet .modalHeader { padding: 16px 20px; }
  .mobileSheet .modalBody { padding: 20px; overflow-y: auto; }
  .mobileSheet .modalFooter { flex-direction: column-reverse; }
  .mobileSheet .modalFooter button { width: 100%; }
}
</style>
