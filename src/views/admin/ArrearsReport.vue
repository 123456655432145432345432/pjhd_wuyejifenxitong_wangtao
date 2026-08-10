<template>
  <div class="page">
    <div class="header noPrint">
      <div>
        <h1 class="title">欠费报表</h1>
        <p class="desc">按楼栋汇总欠费，支持导出 CSV、打印与批量催缴</p>
      </div>
      <div class="headerActions">
        <button class="btnSecondary" :disabled="!report || loading" @click="printReport">打印</button>
        <button class="btnWarn" :disabled="loading || reminding" @click="openReminderModal">
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
            <p class="hint">
              将向当前报表中的欠费住户发送催缴：优先写入官方会话（不依赖微信绑定，便于测试）；同时尝试批量推送接口（已绑微信的可收到实时推送）。
            </p>
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
            <p v-if="reminderError" class="error">{{ reminderError }}</p>
          </div>
          <div class="modalFooter">
            <button type="button" class="btnSecondary" @click="reminderOpen = false">取消</button>
            <button
              type="button"
              class="btnWarn"
              :disabled="reminding || !reminderForm.title || !reminderForm.content"
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
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { adminMessageApi, arrearsReportApi, propertyCompanyApi } from '../../api/services'
import { formatMoney } from '../../api/mappers'
import { ApiError } from '../../api/request'
import type { ArrearsReport, ArrearsReportItem, PropertyCompanyCommunity, PropertyCompanyItem } from '../../api/types'
import { USER_ROLE } from '../../constants/enums'
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
const reminding = ref(false)
const reminderError = ref('')
const reminderSuccess = ref('')
const reminderForm = reactive({
  title: '物业费催缴通知',
  content: '您有未缴纳的物业费，请尽快缴纳，以免产生违约金。'
})

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

function openReminderModal() {
  reminderError.value = ''
  reminderSuccess.value = ''
  reminderOpen.value = true
}

function uniqueArrearsResidentIds(): string[] {
  const ids = (report.value?.items || [])
    .map((item) => item.residentId)
    .filter((id): id is string => !!id)
  return [...new Set(ids)]
}

async function sendReminder() {
  if (reminding.value || !reminderForm.title || !reminderForm.content) return
  reminding.value = true
  reminderError.value = ''
  reminderSuccess.value = ''
  try {
    // 1) 官方会话补发：不依赖 wechatBound，方便测试未绑定微信的住户
    const residentIds = uniqueArrearsResidentIds()
    let chatOk = 0
    let chatFail = 0
    const chatBody = `${reminderForm.title}\n\n${reminderForm.content}`
    for (const residentId of residentIds) {
      try {
        await adminMessageApi.send(residentId, { content: chatBody })
        chatOk += 1
      } catch {
        chatFail += 1
      }
    }

    // 2) 仍走批量催缴接口（已绑微信可收到推送；未绑定仍会计入 skipped）
    let pushOk = 0
    let pushSkip = 0
    let pushError = ''
    try {
      const result = await arrearsReportApi.sendReminder({
        propertyCompanyId: propertyCompanyId.value || auth.propertyCompanyId || undefined,
        title: reminderForm.title,
        content: reminderForm.content
      })
      pushOk = result.notifiedCount ?? 0
      pushSkip = result.skippedCount ?? 0
    } catch (e) {
      pushError = e instanceof ApiError ? e.message : '批量推送失败'
    }

    if (residentIds.length === 0 && pushError) {
      reminderError.value = pushError
      return
    }

    reminderOpen.value = false
    const parts = [
      `官方会话成功 ${chatOk} 户` + (chatFail ? `、失败 ${chatFail} 户` : ''),
      `批量推送成功 ${pushOk} 户、跳过 ${pushSkip} 户`
    ]
    if (pushError) parts.push(`（批量接口：${pushError}）`)
    if (residentIds.length === 0) {
      parts.unshift('当前报表无明细，仅走了批量接口')
    }
    reminderSuccess.value = `催缴已发送：${parts.join('；')}`
  } catch (e) {
    reminderError.value = e instanceof ApiError ? e.message : '发送失败'
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
