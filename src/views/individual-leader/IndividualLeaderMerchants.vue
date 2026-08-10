<template>
  <div class="page" :class="{ mobile: isMobile }">
    <div class="header">
      <div>
        <h1 class="title">商家管理</h1>
        <p class="desc">设置管辖商家的平台抽佣比例与满额免配送门槛（抽佣变更需模块负责人审批）</p>
      </div>
    </div>

    <p v-if="successMsg" class="bannerSuccess">{{ successMsg }}</p>

    <div class="toolbar">
      <input v-model="keyword" class="input" placeholder="搜索商家名称" @keyup.enter="reload" />
      <button class="btnPrimary" :disabled="loading" @click="reload">搜索</button>
    </div>

    <div class="panel">
      <div v-if="loading" class="hint">加载中...</div>
      <p v-else-if="error" class="error">{{ error }}</p>
      <table v-else-if="merchants.length && !isMobile" class="table">
        <thead>
          <tr>
            <th>商家名称</th>
            <th>分类</th>
            <th>抽佣比例</th>
            <th>满额免配送</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in merchants" :key="item.id">
            <td>{{ item.name }}</td>
            <td>{{ item.category || '—' }}</td>
            <td>{{ formatRate(item.commissionRate) }}</td>
            <td>{{ formatThreshold(item.freeDeliveryThreshold) }}</td>
            <td>{{ getEnumLabel(MERCHANT_STATUS_LABEL, item.status) }}</td>
            <td class="actions">
              <button class="linkBtn" @click="openDistribution(item)">设置抽佣</button>
              <button class="linkBtn" @click="openDeliveryFee(item)">满额配送</button>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-else-if="merchants.length" class="mobileCards">
        <article v-for="item in merchants" :key="item.id" class="merchantCard">
          <div class="cardHeading">
            <strong>{{ item.name }}</strong>
            <span class="statusTag">{{ getEnumLabel(MERCHANT_STATUS_LABEL, item.status) }}</span>
          </div>
          <div class="cardMeta">
            <span>分类：{{ item.category || '—' }}</span>
            <span>抽佣：{{ formatRate(item.commissionRate) }}</span>
            <span>满额免配送：{{ formatThreshold(item.freeDeliveryThreshold) }}</span>
          </div>
          <div class="cardActions">
            <button class="linkBtn" @click="openDistribution(item)">设置抽佣</button>
            <button class="linkBtn" @click="openDeliveryFee(item)">满额配送</button>
          </div>
        </article>
      </div>
      <p v-else class="hint">暂无管辖商家</p>
      <div v-if="totalPages > 1" class="pager">
        <button class="pageBtn" :disabled="page <= 1" @click="changePage(page - 1)">&lt;</button>
        <span>{{ page }} / {{ totalPages }}</span>
        <button class="pageBtn" :disabled="page >= totalPages" @click="changePage(page + 1)">&gt;</button>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="distributionTarget" class="modalOverlay" @click.self="closeDistribution">
        <div class="modal">
          <div class="modalHeader">
            <h3 class="modalTitle">设置商家抽佣 - {{ distributionTarget.name }}</h3>
            <button class="modalClose" @click="closeDistribution">&times;</button>
          </div>
          <div class="modalBody">
            <p class="note">
              抽佣比例 = 平台盘占比（如 0.10 表示商家直分 90%、平台盘 10%）。提交后生成价格审批单（merchant_distribution），通过后生效。
            </p>
            <div class="field">
              <label class="label">平台抽佣比例 (0~1)</label>
              <input v-model.number="distributionRate" type="number" min="0" max="1" step="0.01" class="input" />
            </div>
            <div class="field">
              <label class="label">备注（可选）</label>
              <input v-model="distributionReason" class="input" maxlength="200" placeholder="如：与商家协商一致" />
            </div>
            <p v-if="distributionError" class="error">{{ distributionError }}</p>
            <div class="modalFooter">
              <button class="btnSecondary" @click="closeDistribution">取消</button>
              <button class="btnPrimary" :disabled="distributionSaving" @click="submitDistribution">
                {{ distributionSaving ? '提交中...' : '提交审批' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div v-if="deliveryTarget" class="modalOverlay" @click.self="closeDeliveryFee">
        <div class="modal">
          <div class="modalHeader">
            <h3 class="modalTitle">满额免配送 - {{ deliveryTarget.name }}</h3>
            <button class="modalClose" @click="closeDeliveryFee">&times;</button>
          </div>
          <div class="modalBody">
            <p class="note">保存后立即生效，无需审批</p>
            <div class="field">
              <label class="label">满额免配送门槛 (元)</label>
              <input v-model.number="deliveryThreshold" type="number" min="0" step="0.01" class="input" />
            </div>
            <p v-if="deliveryError" class="error">{{ deliveryError }}</p>
            <div class="modalFooter">
              <button class="btnSecondary" @click="closeDeliveryFee">取消</button>
              <button class="btnPrimary" :disabled="deliverySaving" @click="submitDeliveryFee">
                {{ deliverySaving ? '保存中...' : '保存' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { individualLeaderPortalApi, merchantApi } from '../../api/services'
import type { MerchantItem } from '../../api/types'
import { ApiError } from '../../api/request'
import { getEnumLabel, MERCHANT_STATUS_LABEL } from '../../constants/enums'
import { useIndividualLeaderPortalStore } from '../../stores/individualLeaderPortal'
import { useIsMobile } from '../../composables/useIsMobile'

const portal = useIndividualLeaderPortalStore()
const { isMobile } = useIsMobile()

const loading = ref(false)
const error = ref('')
const successMsg = ref('')
const merchants = ref<MerchantItem[]>([])
const page = ref(1)
const totalPages = ref(1)
const keyword = ref('')

const distributionTarget = ref<MerchantItem | null>(null)
const distributionRate = ref<number | undefined>(undefined)
const distributionReason = ref('')
const distributionSaving = ref(false)
const distributionError = ref('')

const deliveryTarget = ref<MerchantItem | null>(null)
const deliveryThreshold = ref<number | undefined>(undefined)
const deliverySaving = ref(false)
const deliveryError = ref('')

function formatRate(value?: number) {
  if (value == null) return '—'
  return `${(Number(value) * 100).toFixed(0)}%`
}

function formatThreshold(value?: string | number) {
  if (value == null || value === '') return '—'
  return `¥${Number(value).toFixed(2)}`
}

async function load(pageNo = 1) {
  loading.value = true
  error.value = ''
  try {
    // 可选：拉本人信息做展示缓存；写接口一律走 /me，不依赖此结果
    void portal.loadMy()
    const res = await merchantApi.list({
      page: pageNo,
      pageSize: 20,
      keyword: keyword.value.trim() || undefined,
      sort: '+rankOrder'
    })
    merchants.value = res.list || []
    page.value = res.pagination?.page || pageNo
    totalPages.value = res.pagination?.totalPages || 1
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '加载失败'
  } finally {
    loading.value = false
  }
}

function reload() {
  load(1)
}

function changePage(next: number) {
  load(next)
}

function openDistribution(item: MerchantItem) {
  distributionTarget.value = item
  distributionRate.value = item.commissionRate
  distributionReason.value = ''
  distributionError.value = ''
}

function closeDistribution() {
  distributionTarget.value = null
  distributionSaving.value = false
}

async function submitDistribution() {
  if (!distributionTarget.value) return
  if (distributionRate.value == null || distributionRate.value < 0 || distributionRate.value > 1) {
    distributionError.value = '请填写 0~1 之间的平台抽佣比例'
    return
  }
  distributionSaving.value = true
  distributionError.value = ''
  try {
    await individualLeaderPortalApi.updateMerchantDistribution({
      merchantId: distributionTarget.value.id,
      commissionRate: distributionRate.value,
      reason: distributionReason.value.trim() || undefined
    })
    closeDistribution()
    // 分成走审批，列表比例不会立刻变
    successMsg.value = '已提交审批。商家抽佣需模块负责人通过后才会生效，当前列表比例暂不更新。'
    window.setTimeout(() => {
      if (successMsg.value.startsWith('已提交审批')) successMsg.value = ''
    }, 5000)
  } catch (e) {
    distributionError.value = e instanceof ApiError ? e.message : '提交失败'
  } finally {
    distributionSaving.value = false
  }
}

function openDeliveryFee(item: MerchantItem) {
  deliveryTarget.value = item
  deliveryThreshold.value =
    item.freeDeliveryThreshold != null && item.freeDeliveryThreshold !== ''
      ? Number(item.freeDeliveryThreshold)
      : undefined
  deliveryError.value = ''
}

function closeDeliveryFee() {
  deliveryTarget.value = null
  deliverySaving.value = false
}

async function submitDeliveryFee() {
  if (!deliveryTarget.value) return
  if (deliveryThreshold.value == null || deliveryThreshold.value < 0) {
    deliveryError.value = '请填写有效的满额免配送门槛'
    return
  }
  deliverySaving.value = true
  deliveryError.value = ''
  try {
    await individualLeaderPortalApi.updateDeliveryFee({
      merchantId: deliveryTarget.value.id,
      freeDeliveryThreshold: deliveryThreshold.value
    })
    closeDeliveryFee()
    successMsg.value = '满额免配送已保存并立即生效'
    await load(page.value)
    window.setTimeout(() => {
      if (successMsg.value.startsWith('满额免配送')) successMsg.value = ''
    }, 4000)
  } catch (e) {
    deliveryError.value = e instanceof ApiError ? e.message : '保存失败'
  } finally {
    deliverySaving.value = false
  }
}

onMounted(() => load(1))
</script>

<style scoped>
.page { max-width: 1100px; }
.header { margin-bottom: 24px; }
.title { font-size: 24px; font-weight: 600; color: #1f1f2e; margin-bottom: 8px; }
.desc { font-size: 14px; color: #8c8c9a; }
.toolbar { display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; }
.panel { background: #fff; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.table { width: 100%; border-collapse: collapse; font-size: 14px; }
.table th, .table td { padding: 12px 16px; text-align: left; border-bottom: 1px solid #f0f0f3; }
.table th { color: #8c8c9a; font-weight: 500; background: #fafafc; }
.actions { display: flex; gap: 8px; flex-wrap: wrap; }
.linkBtn { border: none; background: none; color: #5c5c9e; cursor: pointer; font-size: 13px; padding: 0; }
.btnPrimary { padding: 10px 18px; border-radius: 8px; background: #5c5c9e; color: #fff; border: none; cursor: pointer; }
.btnSecondary { padding: 10px 18px; border-radius: 8px; border: 1px solid #e8e8ec; background: #fff; cursor: pointer; }
.input { height: 40px; border: 1px solid #e8e8ec; border-radius: 8px; padding: 0 12px; font-size: 14px; min-width: 200px; }
.hint, .error { font-size: 14px; color: #8c8c9a; text-align: center; padding: 24px 0; }
.error { color: #e05c5c; }
.bannerSuccess { font-size: 13px; color: #3aaf7d; background: #f0fdf4; border-radius: 8px; padding: 10px 14px; margin-bottom: 16px; }
.note { font-size: 13px; color: #8c8c9a; margin: 0 0 16px; }
.pager { display: flex; align-items: center; justify-content: center; gap: 12px; margin-top: 16px; color: #8c8c9a; font-size: 13px; }
.pageBtn { border: 1px solid #e8e8ec; background: #fff; border-radius: 6px; width: 32px; height: 32px; cursor: pointer; }
.pageBtn:disabled { opacity: 0.4; cursor: not-allowed; }
.modalOverlay { position: fixed; inset: 0; z-index: 1000; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; padding: 24px; }
.modal { background: #fff; border-radius: 12px; width: min(420px, 100%); }
.modalHeader { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid #f0f0f3; }
.modalTitle { font-size: 16px; font-weight: 600; margin: 0; }
.modalClose { border: none; background: none; font-size: 24px; cursor: pointer; color: #8c8c9a; }
.modalBody { padding: 24px; }
.modalFooter { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
.field { margin-bottom: 16px; }
.label { display: block; font-size: 14px; color: #5c5c66; margin-bottom: 8px; }
.field .input { width: 100%; min-width: 0; box-sizing: border-box; }
.mobileCards { display: flex; flex-direction: column; gap: 12px; }
.merchantCard { border: 1px solid #f0f0f3; border-radius: 10px; padding: 14px; }
.cardHeading { display: flex; justify-content: space-between; gap: 8px; margin-bottom: 8px; }
.statusTag { font-size: 12px; color: #8c8c9a; }
.cardMeta { display: flex; flex-direction: column; gap: 4px; font-size: 13px; color: #5c5c66; margin-bottom: 10px; }
.cardActions { display: flex; gap: 12px; }
@media (max-width: 768px) {
  .page { padding: 0 var(--mobile-page-gap); }
  .panel { padding: 16px; border-radius: var(--mobile-card-radius); }
  .toolbar .input { min-width: 0; flex: 1; }
}
</style>
