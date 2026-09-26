<template>
  <div class="page">
    <div class="header">
      <div>
        <h1 class="title">商家微信进件</h1>
        <p class="desc">查看进件状态，资料就绪后手动提交到微信，或刷新微信侧状态以重新获取法人验证/签约链接。</p>
      </div>
      <div class="headerActions">
        <button class="btnSecondary" :disabled="loading" @click="goBack">返回商家管理</button>
        <button class="btnSecondary" :disabled="loading || acting" @click="load">刷新</button>
      </div>
    </div>

    <p v-if="success" class="bannerSuccess">{{ success }}</p>
    <p v-if="error" class="bannerError">{{ error }}</p>
    <div v-if="loading" class="hint">加载中...</div>

    <section v-else class="card">
      <div class="statusRow">
        <span class="statusBadge" :class="detail.applymentState || 'empty'">
          {{ getEnumLabel(APPLYMENT_STATE_LABEL, detail.applymentState, '未填写资料') }}
        </span>
        <span v-if="detail.wxState" class="muted">微信侧：{{ getEnumLabel(APPLYMENT_WX_STATE_LABEL, detail.wxState, '—') }}</span>
      </div>
      <p class="hintText">{{ applymentStateHint(detail.applymentState) }}</p>
      <p v-if="!detail.applymentState" class="bannerInfo">商家尚未填写进件资料，请通知店主到「微信收款」页填写。</p>

      <dl class="infoList">
        <div><dt>商家编号</dt><dd class="mono">{{ merchantId }}</dd></div>
        <div><dt>商户简称</dt><dd>{{ detail.merchantShortname || '—' }}</dd></div>
        <div><dt>主体类型</dt><dd>{{ getEnumLabel(APPLYMENT_ORGANIZATION_TYPE_LABEL, detail.organizationType) }}</dd></div>
        <div><dt>经营类目</dt><dd>{{ detail.merchantCategory || '—' }}</dd></div>
        <div><dt>联系手机</dt><dd>{{ detail.contactMobile || '—' }}</dd></div>
        <div><dt>结算账户</dt><dd>{{ getEnumLabel(APPLYMENT_BANK_ACCOUNT_TYPE_LABEL, detail.bankAccountType) }}</dd></div>
        <div><dt>开户银行</dt><dd>{{ detail.bankName || '—' }}</dd></div>
        <div><dt>是否已提交微信</dt><dd>{{ detail.submitted ? '是' : '否' }}</dd></div>
        <div><dt>提交方式</dt><dd>{{ getEnumLabel(APPLYMENT_SUBMIT_MODE_LABEL, detail.submitMode) }}</dd></div>
        <div><dt>二级商户号</dt><dd class="mono">{{ detail.subMchid || '—' }}</dd></div>
        <div><dt>重试次数</dt><dd>{{ detail.retryCount ?? '—' }}</dd></div>
        <div v-if="detail.lastError"><dt>最近错误</dt><dd>{{ detail.lastError }}</dd></div>
      </dl>
      <p v-if="detail.rejectReason" class="bannerError">驳回原因：{{ detail.rejectReason }}</p>
      <div v-if="detail.legalValidationUrl" class="linkBox">
        <p>法人验证链接（有时效）：</p>
        <a :href="detail.legalValidationUrl" target="_blank" rel="noopener">{{ detail.legalValidationUrl }}</a>
      </div>
      <div v-if="detail.signUrl" class="linkBox">
        <p>签约链接（有时效）：</p>
        <a :href="detail.signUrl" target="_blank" rel="noopener">{{ detail.signUrl }}</a>
      </div>

      <div class="actions">
        <button
          class="btnPrimary"
          :disabled="acting || !canSubmit"
          @click="submitApplyment"
        >
          {{ acting ? '处理中...' : '提交进件到微信' }}
        </button>
        <button
          class="btnSecondary"
          :disabled="acting || !detail.applymentState"
          @click="refreshApplyment"
        >
          {{ acting ? '处理中...' : '刷新进件状态' }}
        </button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { adminMerchantApplymentApi } from '../../api/services'
import { formatApiError } from '../../api/request'
import type { ApplymentDetail } from '../../api/types'
import {
  APPLYMENT_BANK_ACCOUNT_TYPE_LABEL,
  APPLYMENT_ORGANIZATION_TYPE_LABEL,
  APPLYMENT_STATE,
  APPLYMENT_STATE_LABEL,
  APPLYMENT_SUBMIT_MODE_LABEL,
  APPLYMENT_WX_STATE_LABEL,
  getEnumLabel
} from '../../constants/enums'
import { applymentStateHint, isApplymentNotFound } from '../../utils/ecommerce'

const route = useRoute()
const router = useRouter()
const merchantId = computed(() => String(route.params.id || ''))
const loading = ref(true)
const acting = ref(false)
const error = ref('')
const success = ref('')
const detail = ref<ApplymentDetail>({})

const canSubmit = computed(
  () =>
    detail.value.applymentState === APPLYMENT_STATE.INIT ||
    detail.value.applymentState === APPLYMENT_STATE.REJECTED
)

function goBack() {
  void router.push({ name: 'merchant' })
}

async function load() {
  if (!merchantId.value) {
    error.value = '缺少商家编号'
    loading.value = false
    return
  }
  loading.value = true
  error.value = ''
  try {
    detail.value = (await adminMerchantApplymentApi.get(merchantId.value)) || {}
  } catch (e) {
    if (isApplymentNotFound(e)) {
      detail.value = {}
    } else {
      error.value = formatApiError(e, '加载进件详情失败')
    }
  } finally {
    loading.value = false
  }
}

async function submitApplyment() {
  acting.value = true
  error.value = ''
  success.value = ''
  try {
    detail.value = await adminMerchantApplymentApi.submit(merchantId.value)
    success.value = '已提交到微信，请等待审核。'
  } catch (e) {
    error.value = formatApiError(e, '提交进件失败')
  } finally {
    acting.value = false
  }
}

async function refreshApplyment() {
  acting.value = true
  error.value = ''
  success.value = ''
  try {
    detail.value = await adminMerchantApplymentApi.refresh(merchantId.value)
    success.value = '已从微信刷新进件状态。'
  } catch (e) {
    error.value = formatApiError(e, '刷新进件状态失败')
  } finally {
    acting.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.page { max-width: 860px; }
.header { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
.headerActions { display: flex; gap: 8px; }
.title { font-size: 22px; font-weight: 600; }
.desc { font-size: 14px; color: #8c8c9a; }
.card { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.statusRow { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.statusBadge { display: inline-block; border-radius: 999px; padding: 4px 10px; font-size: 12px; font-weight: 600; background: #f4f5f7; }
.statusBadge.init { background: #f4f5f7; color: #5c5c66; }
.statusBadge.submitted, .statusBadge.auditing { background: #fff7e6; color: #b45309; }
.statusBadge.legal_validating, .statusBadge.signing { background: #eff4ff; color: #1d4ed8; }
.statusBadge.finished { background: #e8f5ee; color: #0f7b45; }
.statusBadge.rejected, .statusBadge.empty { background: #fdecec; color: #b91c1c; }
.hintText, .muted { font-size: 13px; color: #8c8c9a; line-height: 1.6; }
.infoList div { display: flex; gap: 12px; padding: 8px 0; border-bottom: 1px solid #f0f0f3; font-size: 14px; }
.infoList dt { width: 120px; color: #8c8c9a; flex-shrink: 0; }
.mono { font-family: Consolas, Monaco, monospace; }
.linkBox { margin-top: 12px; padding: 12px; background: #eff4ff; border-radius: 8px; font-size: 13px; word-break: break-all; }
.linkBox a { color: #2563eb; }
.actions { display: flex; gap: 10px; margin-top: 16px; flex-wrap: wrap; }
.btnPrimary, .btnSecondary { padding: 10px 18px; border-radius: 8px; cursor: pointer; }
.btnPrimary { background: #5c5c9e; color: #fff; border: none; }
.btnSecondary { background: #fff; color: #5c5c66; border: 1px solid #e8e8ec; }
.btnPrimary:disabled, .btnSecondary:disabled { opacity: 0.5; }
.bannerSuccess { background: #f6ffed; color: #389e0d; padding: 10px 14px; border-radius: 8px; margin-bottom: 12px; font-size: 13px; }
.bannerError { background: #fff1f0; color: #cf1322; padding: 10px 14px; border-radius: 8px; margin-bottom: 12px; font-size: 13px; }
.bannerInfo { background: #eff4ff; color: #1e40af; padding: 10px 14px; border-radius: 8px; margin: 12px 0; font-size: 13px; }
.hint { padding: 24px 0; color: #8c8c9a; }
@media (max-width: 720px) {
  .header { flex-direction: column; }
}
</style>
