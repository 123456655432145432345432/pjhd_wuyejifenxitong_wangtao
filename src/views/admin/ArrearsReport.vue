<template>
  <div class="page">
    <div class="header noPrint">
      <div>
        <h1 class="title">欠费报表</h1>
        <p class="desc">按楼栋汇总欠费，支持导出 CSV、打印与批量催缴</p>
      </div>
      <div class="headerActions">
        <button class="btnSecondary" :disabled="!report || loading" @click="printReport">打印</button>
        <button
          class="btnWarn"
          :disabled="!report || loading || reminding || Number(report?.totalCount || 0) === 0"
          @click="openReminderModal"
        >
          催缴通知
        </button>
        <button class="btnPrimary" :disabled="loading || exporting" @click="exportCsv">
          {{ exporting ? '导出中...' : '导出 CSV' }}
        </button>
      </div>
    </div>

    <div class="printOnly printHeader">
      <h1>欠费报表</h1>
      <p>{{ printMeta }}</p>
    </div>

    <div class="toolbar noPrint">
      <select v-if="isPlatformAdmin" v-model="propertyCompanyId" class="input" @change="load">
        <option value="">请选择物业公司</option>
        <option v-for="pc in propertyCompanies" :key="pc.id" :value="pc.id">{{ pc.name }}</option>
      </select>
      <select v-model="communityId" class="input" @change="load">
        <option value="">全部小区</option>
        <option v-for="c in communities" :key="c.id" :value="c.id">{{ c.name || c.id }}</option>
      </select>
      <input v-model.trim="building" class="input" placeholder="楼栋（可选）" @change="load" />
      <button class="btnPrimary" :disabled="loading" @click="load">查询</button>
    </div>

    <div class="summary" v-if="report">
      <div class="stat"><span>欠费总额</span><strong>¥{{ formatMoney(report.totalArrearsAmount) }}</strong></div>
      <div class="stat"><span>欠费户数</span><strong>{{ report.totalCount ?? 0 }}</strong></div>
    </div>

    <p v-if="error" class="error noPrint">{{ error }}</p>
    <p v-if="reminderSuccess" class="success noPrint">{{ reminderSuccess }}</p>
    <div v-if="loading" class="hint noPrint">加载中...</div>
    <template v-else-if="report">
      <div v-if="report.groupByBuilding?.length" class="panel">
        <h3 class="subTitle">按楼栋汇总</h3>
        <table class="table">
          <thead><tr><th>楼栋</th><th>户数</th><th>金额</th></tr></thead>
          <tbody>
            <tr v-for="g in report.groupByBuilding" :key="g.building || 'x'">
              <td>{{ g.building || '—' }}</td>
              <td>{{ g.count ?? 0 }}</td>
              <td>¥{{ formatMoney(g.totalAmount) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="panel">
        <h3 class="subTitle">明细</h3>
        <div v-if="report.items?.length" class="tableScroll">
          <table class="table detailTable">
            <thead>
              <tr>
                <th>姓名</th><th>手机</th><th>地址</th><th>账期</th><th>金额</th><th>已缴</th><th>逾期天数</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, idx) in report.items" :key="item.residentId || idx">
                <td>{{ item.residentName || '—' }}</td>
                <td>{{ item.phone || '—' }}</td>
                <td>{{ [item.building, item.unit, item.room].filter(Boolean).join('-') || '—' }}</td>
                <td>{{ formatPeriod(item) }}</td>
                <td class="num">¥{{ formatMoney(item.amount) }}</td>
                <td class="num">¥{{ formatMoney(item.paidAmount) }}</td>
                <td class="num">{{ item.daysOverdue ?? '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-else class="hint">暂无欠费明细</p>
      </div>
    </template>

    <Teleport to="body">
      <div v-if="reminderOpen" class="modalOverlay" @click.self="reminderOpen = false">
        <div class="modal">
          <div class="modalHeader">
            <h3 class="modalTitle">发送催缴通知</h3>
            <button type="button" class="modalClose" @click="reminderOpen = false">&times;</button>
          </div>
          <div class="modalBody">
            <div v-if="reminderPreview" class="reminderSummary">
              <div><span>发送范围</span><strong>{{ reminderScopeText }}</strong></div>
              <div><span>本次发送</span><strong>{{ reminderPreview.inAppEligibleCount }} 户</strong></div>
              <div><span>欠费总额</span><strong>¥{{ formatMoney(reminderPreview.totalArrearsAmount) }}</strong></div>
              <div><span>已去重记录</span><strong>{{ reminderPreview.duplicateResidentCount }} 条</strong></div>
            </div>
            <div v-else-if="previewLoading" class="hint">正在计算本次发送人数...</div>
            <p v-if="previewLoading && reminderPreview" class="hint">正在刷新发送范围...</p>
            <p class="hint">
              催缴通知仅发送到住户端的物业聊天模块，不会发送微信提醒。
            </p>
            <p v-if="reminderPreview" class="previewExpiry">{{ previewRemainingText }}</p>
            <div class="field">
              <label class="label">标题</label>
              <input v-model.trim="reminderForm.title" class="input full" maxlength="100" />
            </div>
            <div class="field">
              <label class="label">内容</label>
              <textarea
                v-model.trim="reminderForm.content"
                class="textarea"
                rows="5"
                maxlength="1000"
              />
            </div>
            <p v-if="reminderHint" class="hint">{{ reminderHint }}</p>
            <p v-if="reminderError" class="error">{{ reminderError }}</p>
            <button
              v-if="!previewLoading && !reminderPreview"
              type="button"
              class="btnSecondary"
              @click="loadReminderPreview"
            >
              重新预览
            </button>
          </div>
          <div class="modalFooter">
            <button type="button" class="btnSecondary" @click="reminderOpen = false">取消</button>
            <button
              type="button"
              class="btnWarn"
              :disabled="
                previewLoading ||
                reminding ||
                !reminderPreview?.previewToken ||
                reminderPreview.inAppEligibleCount === 0 ||
                !reminderForm.title ||
                !reminderForm.content
              "
              @click="sendReminder"
            >
              {{ reminding ? '发送中...' : '确认发送' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { arrearsReportApi, propertyCompanyApi } from '../../api/services'
import { formatMoney } from '../../api/mappers'
import { ApiError } from '../../api/request'
import type {
  ArrearsReminderPreviewResult,
  ArrearsReminderResult,
  ArrearsReport,
  ArrearsReportItem,
  PropertyCompanyCommunity,
  PropertyCompanyItem
} from '../../api/types'
import {
  API_ERROR_CODE,
  ARREARS_REMINDER_CHANNEL,
  ARREARS_REMINDER_TEMPLATE,
  USER_ROLE
} from '../../constants/enums'
import { useAuthStore } from '../../stores/auth'

const auth = useAuthStore()
const route = useRoute()
const isPlatformAdmin = computed(() => auth.profile?.role === USER_ROLE.PLATFORM_ADMIN)
const propertyCompanies = ref<PropertyCompanyItem[]>([])
const propertyCompanyId = ref(auth.propertyCompanyId || '')
const communities = ref<PropertyCompanyCommunity[]>([])
const communityId = ref('')
const building = ref('')
const loading = ref(false)
const exporting = ref(false)
const error = ref('')
const report = ref<ArrearsReport | null>(null)

const reminderOpen = ref(false)
const previewLoading = ref(false)
const reminderPreview = ref<ArrearsReminderPreviewResult | null>(null)
const reminderRequestId = ref('')
const reminding = ref(false)
const reminderError = ref('')
const reminderHint = ref('')
const reminderSuccess = ref('')
const reminderForm = reactive({
  title: '物业费催缴通知',
  content: '您有未缴纳的物业费，请尽快缴纳，以免产生违约金。'
})

const PREVIEW_REFRESH_BUFFER_MS = 30_000
let previewKeepAliveTimer: ReturnType<typeof setTimeout> | null = null
const previewNow = ref(Date.now())
let previewNowTimer: ReturnType<typeof setInterval> | null = null

const reminderScopeText = computed(() => {
  const communityName =
    communities.value.find((item) => item.id === communityId.value)?.name || '全部小区'
  return building.value ? `${communityName} · ${building.value}栋` : communityName
})

const PREVIEW_TTL_MS = 30 * 60 * 1000

function parsePreviewExpiry(value?: string) {
  if (!value) return null
  const raw = value.trim()
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return null
  const remaining = date.getTime() - Date.now()
  // v6.5 带 +08:00 时区。仅当被误标成 UTC（...Z）导致剩余时间远超 30 分钟时，按本地时间理解。
  if (remaining > PREVIEW_TTL_MS + 5 * 60 * 1000 && /Z$/i.test(raw)) {
    const local = new Date(raw.replace(/Z$/i, ''))
    if (!Number.isNaN(local.getTime())) {
      const localRemaining = local.getTime() - Date.now()
      if (localRemaining > 0 && localRemaining <= PREVIEW_TTL_MS + 5 * 60 * 1000) {
        return local
      }
    }
  }
  return date
}

function isPreviewStale(preview: ArrearsReminderPreviewResult | null, bufferMs = 0) {
  if (!preview?.previewToken) return true
  const expires = parsePreviewExpiry(preview.expiresAt)
  if (!expires) return false
  return expires.getTime() - Date.now() <= bufferMs
}

function isPreviewExpiredError(e: unknown) {
  if (!(e instanceof ApiError)) return false
  // 2026-09-07 实测码 96033；97004 为历史规划值，兼容保留
  return (
    e.errorCode === API_ERROR_CODE.PREVIEW_EXPIRED ||
    e.code === 96033 ||
    e.code === 97004 ||
    /预览.*过期|过期.*预览|preview.*expir/i.test(e.message || '')
  )
}

function newReminderRequestId() {
  return `arrears_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

function isDuplicateReminderError(e: unknown) {
  if (!(e instanceof ApiError)) return false
  // 2026-09-07：重复提交走 10002 + message 含「已发送过」；97005 为历史规划值
  return (
    e.errorCode === API_ERROR_CODE.ARREARS_REMINDER_DUPLICATE ||
    e.code === 97005 ||
    (e.code === 10002 && /已发送过/.test(e.message || ''))
  )
}

function isWechatTemplateError(e: unknown) {
  return (
    e instanceof ApiError &&
    (e.errorCode === API_ERROR_CODE.WECHAT_TEMPLATE_NOT_CONFIGURED || e.code === 97003)
  )
}

const previewRemainingText = computed(() => {
  void previewNow.value
  const expires = parsePreviewExpiry(reminderPreview.value?.expiresAt)
  if (!expires) return '发送范围已锁定，请尽快确认发送'
  const ms = expires.getTime() - Date.now()
  if (ms <= 0) return '发送范围即将刷新，请稍候再发送'
  const minutes = Math.max(1, Math.ceil(ms / 60000))
  if (minutes > 40) return '发送范围已锁定，请尽快确认发送'
  return `发送范围已锁定，约 ${minutes} 分钟内有效`
})

function clearPreviewKeepAlive() {
  if (previewKeepAliveTimer) {
    clearTimeout(previewKeepAliveTimer)
    previewKeepAliveTimer = null
  }
  if (previewNowTimer) {
    clearInterval(previewNowTimer)
    previewNowTimer = null
  }
}

function schedulePreviewKeepAlive() {
  clearPreviewKeepAlive()
  if (!reminderOpen.value || !reminderPreview.value) return
  previewNow.value = Date.now()
  previewNowTimer = setInterval(() => {
    previewNow.value = Date.now()
  }, 30000)
  const expires = parsePreviewExpiry(reminderPreview.value.expiresAt)
  if (!expires) return
  const delay = expires.getTime() - Date.now() - PREVIEW_REFRESH_BUFFER_MS
  if (delay <= 0) return
  previewKeepAliveTimer = setTimeout(async () => {
    if (!reminderOpen.value || reminding.value || previewLoading.value) return
    await loadReminderPreview()
  }, delay)
}

function formatPeriod(item: ArrearsReportItem) {
  if (item.periodStart || item.periodEnd) {
    return `${item.periodStart || '—'} ~ ${item.periodEnd || '—'}`
  }
  return item.period || '—'
}

const printMeta = computed(() => {
  const communityName =
    communities.value.find((c) => c.id === communityId.value)?.name ||
    (communityId.value ? communityId.value : '全部小区')
  const buildingLabel = building.value ? ` · 楼栋 ${building.value}` : ''
  const date = new Date().toLocaleString('zh-CN')
  return `${communityName}${buildingLabel} · 打印时间 ${date}`
})

async function loadCommunities() {
  const id = propertyCompanyId.value || auth.propertyCompanyId
  if (!id) {
    communities.value = []
    return
  }
  try {
    const res = await propertyCompanyApi.communities(id)
    communities.value = res.list || []
  } catch {
    communities.value = []
  }
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    report.value = await arrearsReportApi.get({
      propertyCompanyId: propertyCompanyId.value || auth.propertyCompanyId || undefined,
      communityId: communityId.value || undefined,
      building: building.value || undefined
    })
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '加载失败'
    report.value = null
  } finally {
    loading.value = false
  }
}

async function exportCsv() {
  exporting.value = true
  try {
    const blob = await arrearsReportApi.exportCsv({
      propertyCompanyId: propertyCompanyId.value || auth.propertyCompanyId || undefined,
      communityId: communityId.value || undefined,
      building: building.value || undefined
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `arrears_report_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  } catch (e) {
    error.value = e instanceof Error ? e.message : '导出失败'
  } finally {
    exporting.value = false
  }
}

async function openReminderModal() {
  reminderError.value = ''
  reminderHint.value = ''
  reminderSuccess.value = ''
  reminderPreview.value = null
  reminderOpen.value = true
  reminderRequestId.value = newReminderRequestId()
  await loadReminderPreview()
}

function pickStr(row: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = row[key]
    if (typeof value === 'string' && value.trim()) return value
  }
  return ''
}

function pickNum(row: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = row[key]
    if (value === undefined || value === null || value === '') continue
    const n = Number(value)
    if (Number.isFinite(n)) return n
  }
  return 0
}

function normalizeReminderPreview(raw: ArrearsReminderPreviewResult) {
  const row = raw as ArrearsReminderPreviewResult & Record<string, unknown>
  return {
    templateCode: pickStr(row, 'templateCode', 'template_code'),
    previewToken: pickStr(row, 'previewToken', 'preview_token'),
    expiresAt: pickStr(row, 'expiresAt', 'expires_at'),
    recipientCount: pickNum(row, 'recipientCount', 'recipient_count', 'recipientCount', 'recipient_count'),
    totalArrearsAmount: pickNum(row, 'totalArrearsAmount', 'total_arrears_amount', 'totalArrearsAmount', 'total_arrears_amount'),
    inAppEligibleCount: pickNum(row, 'inAppEligibleCount', 'in_app_eligible_count', 'inAppEligibleCount', 'in_app_eligible_count'),
    wechatEligibleCount: pickNum(row, 'wechatEligibleCount', 'wechat_eligible_count', 'wechatEligibleCount', 'wechat_eligible_count'),
    wechatIneligibleCount: pickNum(row, 'wechatIneligibleCount', 'wechat_ineligible_count', 'wechatIneligibleCount', 'wechat_ineligible_count'),
    duplicateResidentCount: pickNum(row, 'duplicateResidentCount', 'duplicate_resident_count', 'duplicateResidentCount', 'duplicate_resident_count')
  } satisfies ArrearsReminderPreviewResult
}

function normalizeChannelResult(raw: unknown) {
  const row = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  return {
    successCount: pickNum(row, 'successCount', 'success_count', 'successCount', 'success_count'),
    skippedCount: pickNum(row, 'skippedCount', 'skipped_count', 'skippedCount', 'skipped_count'),
    failedCount: pickNum(row, 'failedCount', 'failed_count', 'failedCount', 'failed_count')
  }
}

function normalizeReminderResult(raw: ArrearsReminderResult) {
  const row = raw as ArrearsReminderResult & Record<string, unknown>
  const channels = (row.channels && typeof row.channels === 'object'
    ? row.channels
    : {}) as Record<string, unknown>
  return {
    batchId: pickStr(row, 'batchId', 'batch_id', 'batchId', 'batch_id'),
    recipientCount: pickNum(row, 'recipientCount', 'recipient_count', 'recipientCount', 'recipient_count'),
    notifiedCount: pickNum(row, 'notifiedCount', 'notified_count'),
    skippedCount: pickNum(row, 'skippedCount', 'skipped_count', 'skippedCount', 'skipped_count'),
    failedCount: pickNum(row, 'failedCount', 'failed_count', 'failedCount', 'failed_count'),
    channels: {
      inApp: normalizeChannelResult(channels.inApp ?? channels.in_app),
      wechat: channels.wechat ? normalizeChannelResult(channels.wechat) : undefined
    }
  } satisfies ArrearsReminderResult
}

async function loadReminderPreview() {
  previewLoading.value = true
  reminderError.value = ''
  reminderHint.value = ''
  try {
    const preview = await arrearsReportApi.previewReminder({
      propertyCompanyId: propertyCompanyId.value || auth.propertyCompanyId || undefined,
      communityId: communityId.value || undefined,
      building: building.value || undefined,
      templateCode: ARREARS_REMINDER_TEMPLATE.PROPERTY_FEE
    })
    reminderPreview.value = normalizeReminderPreview(preview)
    schedulePreviewKeepAlive()
  } catch (e) {
    reminderPreview.value = null
    reminderError.value = e instanceof ApiError ? e.message : '催缴人数预览失败，请重试'
    clearPreviewKeepAlive()
  } finally {
    previewLoading.value = false
  }
}

async function submitReminder(preview: ArrearsReminderPreviewResult) {
  const result = normalizeReminderResult(
    await arrearsReportApi.sendReminder({
      previewToken: preview.previewToken,
      propertyCompanyId: propertyCompanyId.value || auth.propertyCompanyId || undefined,
      communityId: communityId.value || undefined,
      building: building.value || undefined,
      templateCode: preview.templateCode || ARREARS_REMINDER_TEMPLATE.PROPERTY_FEE,
      channels: [ARREARS_REMINDER_CHANNEL.IN_APP],
      requestId: reminderRequestId.value,
      title: reminderForm.title,
      content: reminderForm.content
    })
  )
  reminderOpen.value = false
  clearPreviewKeepAlive()
  const inAppSuccess = result.channels.inApp.successCount || result.notifiedCount
  const skipped = result.skippedCount
  const batchNo = result.batchId || '—'
  reminderSuccess.value =
    `催缴批次 ${batchNo} 已处理：成功 ${inAppSuccess} 户` +
    (skipped ? `，跳过 ${skipped} 户（已有未读催缴）` : '') +
    (result.failedCount ? `，失败 ${result.failedCount} 户` : '')
}

function markReminderAlreadySubmitted() {
  reminderOpen.value = false
  clearPreviewKeepAlive()
  reminderSuccess.value = '该催缴已提交，系统未重复发送'
}

function isReminderWriteError(e: unknown) {
  if (!(e instanceof ApiError)) return false
  const message = e.message || ''
  return (
    e.code === 500 ||
    e.code >= 500 ||
    /数据访问失败|Internal Server Error|SQL|Unable to acquire/i.test(message)
  )
}

function handleReminderSendError(e: unknown) {
  if (isDuplicateReminderError(e)) {
    markReminderAlreadySubmitted()
    return
  }
  if (isPreviewExpiredError(e)) {
    reminderError.value = '催缴预览已过期，请关闭后重新预览再发送'
    return
  }
  if (isWechatTemplateError(e)) {
    reminderError.value = '当前只发送住户端物业聊天，请不要选择微信渠道后重试'
    return
  }
  if (isReminderWriteError(e)) {
    reminderError.value =
      '催缴发送失败：后端异常。请关闭后重新预览再发；若仍失败，把 Response 中 code/message/traceId 转后端。'
    return
  }
  reminderError.value = e instanceof ApiError ? e.message : '发送失败'
}

function confirmReminderSend(preview: ArrearsReminderPreviewResult) {
  return window.confirm(
    `确认发送物业费催缴通知？\n` +
      `范围：${reminderScopeText.value}\n` +
      `本次将向 ${preview.inAppEligibleCount} 户发送，欠费总额 ¥${formatMoney(preview.totalArrearsAmount)}\n` +
      '已有未读催缴通知的住户会被跳过。\n' +
      '通知仅进入住户端物业聊天模块，发送后无法撤回。'
  )
}

async function sendReminder() {
  if (reminding.value || previewLoading.value || !reminderForm.title || !reminderForm.content) return
  if (isPreviewStale(reminderPreview.value, PREVIEW_REFRESH_BUFFER_MS)) {
    await loadReminderPreview()
  }
  const preview = reminderPreview.value
  if (!preview?.previewToken || preview.inAppEligibleCount === 0) {
    reminderError.value = reminderError.value || '请先预览发送范围后再发送'
    return
  }
  if (!confirmReminderSend(preview)) return
  reminding.value = true
  reminderError.value = ''
  reminderHint.value = ''
  reminderSuccess.value = ''
  try {
    await submitReminder(preview)
  } catch (e) {
    if (isDuplicateReminderError(e)) {
      markReminderAlreadySubmitted()
      return
    }
    if (isPreviewExpiredError(e)) {
      reminderError.value = ''
      reminderHint.value = ''
      try {
        await loadReminderPreview()
        reminderHint.value = '名单已刷新，请再次确认发送'
      } catch {
        reminderError.value = '催缴预览已过期，请重新预览后再发送'
      }
      return
    }
    handleReminderSendError(e)
  } finally {
    reminding.value = false
  }
}

function printReport() {
  window.print()
}

function applyRouteQuery() {
  const q = route.query
  if (typeof q.communityId === 'string' && q.communityId) communityId.value = q.communityId
  if (typeof q.building === 'string') building.value = q.building
  if (typeof q.propertyCompanyId === 'string' && q.propertyCompanyId) {
    propertyCompanyId.value = q.propertyCompanyId
  }
}

watch(propertyCompanyId, async () => {
  communityId.value = ''
  await loadCommunities()
  await load()
})

watch(reminderOpen, (open) => {
  if (open) schedulePreviewKeepAlive()
  else clearPreviewKeepAlive()
})

onUnmounted(clearPreviewKeepAlive)

onMounted(async () => {
  applyRouteQuery()
  if (isPlatformAdmin.value) {
    try {
      const res = await propertyCompanyApi.list({ page: 1, pageSize: 100 }, true)
      propertyCompanies.value = res.list || []
      if (!propertyCompanyId.value && propertyCompanies.value[0]) {
        propertyCompanyId.value = propertyCompanies.value[0].id
      }
    } catch {
      propertyCompanies.value = []
    }
  }
  await loadCommunities()
  await load()
})
</script>

<style scoped>
.page { max-width: 1200px; min-width: 0; width: 100%; box-sizing: border-box; }
.header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; gap: 16px; }
.headerActions { display: flex; gap: 10px; flex-wrap: wrap; }
.title { font-size: 24px; font-weight: 600; margin: 0 0 6px; color: #1f1f2e; }
.desc { margin: 0; color: #8c8c9a; font-size: 14px; }
.toolbar { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 16px; }
.input { min-width: 160px; padding: 8px 12px; border: 1px solid #e8e8ec; border-radius: 8px; }
.input.full { width: 100%; min-width: 0; box-sizing: border-box; }
.btnPrimary, .btnSecondary, .btnWarn { padding: 8px 16px; border-radius: 8px; cursor: pointer; }
.btnPrimary { border: none; background: #5c5c9e; color: #fff; }
.btnSecondary { border: 1px solid #e8e8ec; background: #fff; color: #1f1f2e; }
.btnWarn { border: none; background: #e05c5c; color: #fff; }
.btnPrimary:disabled, .btnSecondary:disabled, .btnWarn:disabled { opacity: 0.6; cursor: not-allowed; }
.summary { display: flex; gap: 16px; margin-bottom: 16px; flex-wrap: wrap; }
.stat { background: #fafafc; border: 1px solid #f0f0f3; border-radius: 10px; padding: 14px 18px; min-width: 160px; }
.stat span { display: block; font-size: 12px; color: #8c8c9a; margin-bottom: 6px; }
.stat strong { font-size: 20px; color: #1f1f2e; }
.panel {
  background: #fff; border: 1px solid #f0f0f3; border-radius: 12px;
  padding: 16px; margin-bottom: 16px; min-width: 0; overflow: hidden;
}
.subTitle { margin: 0 0 12px; font-size: 15px; }
.tableScroll { width: 100%; max-width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
.table { width: 100%; border-collapse: collapse; font-size: 13px; }
.detailTable { min-width: 720px; table-layout: fixed; }
.table th, .table td {
  padding: 10px 8px; border-bottom: 1px solid #f0f0f3; text-align: left;
  vertical-align: top; word-break: break-word; overflow-wrap: anywhere;
}
.detailTable th:nth-child(1), .detailTable td:nth-child(1) { width: 12%; }
.detailTable th:nth-child(2), .detailTable td:nth-child(2) { width: 14%; }
.detailTable th:nth-child(3), .detailTable td:nth-child(3) { width: 16%; }
.detailTable th:nth-child(4), .detailTable td:nth-child(4) { width: 18%; }
.detailTable th:nth-child(5), .detailTable td:nth-child(5),
.detailTable th:nth-child(6), .detailTable td:nth-child(6) { width: 12%; }
.detailTable th:nth-child(7), .detailTable td:nth-child(7) { width: 12%; }
.detailTable td.num { white-space: nowrap; }
.hint, .error, .success { color: #8c8c9a; }
.error { color: #e05c5c; }
.success { color: #3aaf7d; margin-bottom: 12px; }
.printOnly { display: none; }

.modalOverlay {
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(0, 0, 0, 0.4);
  display: flex; align-items: center; justify-content: center; padding: 16px;
}
.modal {
  width: 100%; max-width: 480px; background: #fff; border-radius: 12px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
}
.modalHeader {
  display: flex; justify-content: space-between; align-items: center;
  padding: 16px 20px; border-bottom: 1px solid #f0f0f3;
}
.modalTitle { margin: 0; font-size: 16px; }
.modalClose { border: none; background: none; font-size: 22px; cursor: pointer; color: #8c8c9a; }
.modalBody { padding: 16px 20px; }
.reminderSummary {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 12px;
}
.reminderSummary div { padding: 10px; border-radius: 8px; background: #fafafc; }
.reminderSummary span { display: block; margin-bottom: 4px; color: #8c8c9a; font-size: 12px; }
.reminderSummary strong { color: #1f1f2e; font-size: 14px; }
.previewExpiry { margin: 8px 0 12px; color: #5c5c66; font-size: 12px; }
.modalFooter {
  display: flex; justify-content: flex-end; gap: 10px;
  padding: 12px 20px 16px; border-top: 1px solid #f0f0f3;
}
.field { margin-bottom: 12px; }
.label { display: block; font-size: 13px; color: #8c8c9a; margin-bottom: 6px; }
.textarea {
  width: 100%; box-sizing: border-box; padding: 10px 12px;
  border: 1px solid #e8e8ec; border-radius: 8px; resize: vertical; font: inherit;
}

@media (max-width: 640px) {
  .reminderSummary { grid-template-columns: 1fr; }
}

@media print {
  .noPrint { display: none !important; }
  .printOnly { display: block !important; }
  .printHeader { margin-bottom: 16px; }
  .printHeader h1 { font-size: 20px; margin: 0 0 6px; }
  .printHeader p { margin: 0; color: #444; font-size: 12px; }
  .page { max-width: none; }
  .panel { border: none; padding: 0; margin-bottom: 20px; box-shadow: none; overflow: visible; }
  .tableScroll { overflow: visible; }
  .detailTable { min-width: 0; }
  .stat { border: 1px solid #ccc; }
  .table th, .table td { border-bottom: 1px solid #ccc; padding: 6px 4px; }
}
</style>
