<template>
  <div class="page" :class="{ mobilePage: isMobile }">
    <div class="header">
      <div>
        <h1 class="title">分账对账台</h1>
        <p class="desc">
          按订单查看各分账腿：角色、金额、状态、通道单号、失败原因。补录收款账户后可手动重试。
        </p>
      </div>
      <button class="btnSecondary" :disabled="loading" @click="reload">刷新</button>
    </div>

    <p class="bannerInfo">
      「未录入」表示收款方账户尚未配置。先到
      <RouterLink :to="{ name: 'cbk-accounts' }">收款账户</RouterLink>
      补录，再点重试走缺户补冻。通道单号对应微信交易号 / 商户订单号。状态用冻结中、已提交结算、已完结等中性词。
    </p>

    <div class="toolbar">
      <select v-model="status" class="input" @change="reload">
        <option v-for="opt in CBK_RECONCILE_STATUS_OPTIONS" :key="opt.value || 'default'" :value="opt.value">
          {{ opt.label }}
        </option>
      </select>
      <select v-model.number="limit" class="input" @change="reload">
        <option :value="20">20 条</option>
        <option :value="50">50 条</option>
        <option :value="100">100 条</option>
      </select>
      <button class="btnPrimary" :disabled="loading" @click="reload">查询</button>
    </div>

    <p v-if="banner" class="bannerSuccess">{{ banner }}</p>
    <p v-if="error" class="bannerError">{{ error }}</p>

    <div class="tableScroll">
      <table class="table">
        <thead>
          <tr>
            <th>分账单号 / 通道单号</th>
            <th>状态</th>
            <th>角色</th>
            <th>收款方</th>
            <th>金额</th>
            <th>订单</th>
            <th>原因</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="8" class="emptyCell">加载中...</td>
          </tr>
          <tr v-else-if="error && !list.length">
            <td colspan="8" class="emptyCell errorCell">
              <p>{{ error }}</p>
              <button type="button" class="retryBtn" @click="load">重新加载</button>
            </td>
          </tr>
          <tr v-else-if="!list.length">
            <td colspan="8" class="emptyCell">暂无待介入流水</td>
          </tr>
          <tr v-for="item in list" v-else :key="item.splitNo">
            <td class="mono">{{ item.splitNo || '—' }}</td>
            <td>
              <span :class="['statusBadge', item.status || 'unknown']">
                {{ getEnumLabel(CBK_RECONCILE_STATUS_LABEL, item.status, '—') }}
              </span>
            </td>
            <td>{{ getEnumLabel(CBK_OWNER_TYPE_LABEL, item.ownerType) }}</td>
            <td>
              <div class="mono">{{ item.ownerId || '—' }}</div>
              <div v-if="item.accountNo" class="subText">{{ maskAccountNo(item.accountNo) }}</div>
            </td>
            <td>¥{{ formatCbkAmount(item.amount) }}</td>
            <td>
              <div>{{ item.orderNo || item.orderId || '—' }}</div>
              <div v-if="item.orderNo && item.orderId" class="subText mono">{{ item.orderId }}</div>
            </td>
            <td>{{ item.failReason || item.remark || '—' }}</td>
            <td>
              <button
                v-if="item.splitNo && canRetryCbkReconcile(item.status)"
                type="button"
                class="actionBtn"
                :disabled="retryingNo === item.splitNo"
                @click="retry(item)"
              >
                {{ retryingNo === item.splitNo ? '重试中...' : '重试' }}
              </button>
              <span v-else class="doneLabel">—</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { adminCbkApi } from '../../api/services'
import type { CbkReconcileItem } from '../../api/types'
import {
  CBK_OWNER_TYPE_LABEL,
  CBK_RECONCILE_STATUS,
  CBK_RECONCILE_STATUS_LABEL,
  CBK_RECONCILE_STATUS_OPTIONS,
  getEnumLabel
} from '../../constants/enums'
import { useIsMobile } from '../../composables/useIsMobile'
import {
  canRetryCbkReconcile,
  explainCbkApiError,
  formatCbkAmount,
  maskAccountNo
} from '../../utils/cbk'

const { isMobile } = useIsMobile()
const list = ref<CbkReconcileItem[]>([])
const loading = ref(false)
const error = ref('')
const banner = ref('')
const status = ref('')
const limit = ref(50)
const retryingNo = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    list.value = await adminCbkApi.listFailed({
      statuses: status.value || undefined,
      limit: limit.value
    })
  } catch (e) {
    list.value = []
    error.value = explainCbkApiError(e, '对账列表加载失败')
  } finally {
    loading.value = false
  }
}

function reload() {
  banner.value = ''
  void load()
}

async function retry(item: CbkReconcileItem) {
  if (!item.splitNo) return
  const ok = window.confirm(
    `确认重试该笔分账？\n状态：${getEnumLabel(CBK_RECONCILE_STATUS_LABEL, item.status, '—')}\n单号：${item.splitNo}`
  )
  if (!ok) return
  retryingNo.value = item.splitNo
  error.value = ''
  banner.value = ''
  try {
    const triggered = await adminCbkApi.retrySplit(item.splitNo)
    if (triggered === false) {
      error.value = '当前状态不可重试'
    } else {
      banner.value =
        item.status === CBK_RECONCILE_STATUS.SKIPPED
          ? '已触发缺户补冻，请刷新查看状态'
          : '已触发重试，请刷新查看状态'
      await load()
    }
  } catch (e) {
    error.value = explainCbkApiError(e, '重试失败')
  } finally {
    retryingNo.value = ''
  }
}

onMounted(() => {
  void load()
})
</script>

<style scoped>
.page { max-width: 1200px; }
.header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 16px; gap: 16px; }
.title { font-size: 24px; font-weight: 600; color: #1f1f2e; margin-bottom: 8px; }
.desc { font-size: 14px; color: #8c8c9a; max-width: 720px; line-height: 1.5; }
.bannerInfo { margin: 0 0 16px; padding: 10px 12px; border-radius: 8px; background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; font-size: 13px; line-height: 1.5; }
.bannerInfo a { color: #1d4ed8; }
.toolbar { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
.input { padding: 8px 12px; border: 1px solid #e8e8ec; border-radius: 8px; background: #fff; font-size: 14px; min-width: 140px; }
.btnPrimary, .btnSecondary, .actionBtn, .retryBtn { cursor: pointer; }
.btnPrimary { padding: 10px 18px; border-radius: 8px; background: #5c5c9e; color: #fff; border: none; }
.btnSecondary { padding: 10px 18px; border-radius: 8px; background: #fff; color: #5c5c9e; border: 1px solid #c9c9e6; }
.btnPrimary:disabled, .btnSecondary:disabled, .actionBtn:disabled { opacity: .5; cursor: not-allowed; }
.bannerError, .bannerSuccess { padding: 10px 12px; border-radius: 8px; margin-bottom: 12px; font-size: 13px; }
.bannerError { background: #fff1f0; color: #cf1322; }
.bannerSuccess { background: #f6ffed; color: #389e0d; }
.tableScroll { overflow-x: auto; background: #fff; border: 1px solid #eeeef3; border-radius: 12px; }
.table { width: 100%; border-collapse: collapse; font-size: 13px; }
.table th, .table td { padding: 12px 14px; text-align: left; border-bottom: 1px solid #f0f0f4; vertical-align: top; }
.table th { color: #8c8c9a; font-weight: 500; background: #fafafc; }
.emptyCell { text-align: center; color: #8c8c9a; padding: 32px 14px; }
.errorCell { color: #cf1322; }
.subText { font-size: 12px; color: #8c8c9a; margin-top: 2px; }
.mono { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; word-break: break-all; }
.actionBtn { padding: 6px 10px; border-radius: 6px; border: 1px solid #5c5c9e; background: #fff; color: #5c5c9e; font-size: 12px; }
.retryBtn { margin-top: 8px; padding: 6px 12px; border-radius: 6px; border: 1px solid #e8e8ec; background: #fff; }
.doneLabel { color: #8c8c9a; }
.statusBadge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 12px; }
.statusBadge.skipped { background: #fff7e6; color: #ad6800; }
.statusBadge.freeze_failed,
.statusBadge.finish_failed,
.statusBadge.withdraw_failed,
.statusBadge.reverse_failed,
.statusBadge.refund_failed,
.statusBadge.unknown { background: #fff1f0; color: #cf1322; }
</style>
