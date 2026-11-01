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
        <p>
          法人验证链接（有时效）：
          <button class="btnCopy" type="button" @click="copyText(detail.legalValidationUrl || '', '法人验证链接')">复制</button>
        </p>
        <a :href="detail.legalValidationUrl" target="_blank" rel="noopener">{{ detail.legalValidationUrl }}</a>
      </div>
      <div v-if="detail.signUrl" class="linkBox">
        <p>
          签约链接（有时效）：
          <button class="btnCopy" type="button" @click="copyText(detail.signUrl || '', '签约链接')">复制</button>
        </p>
        <a :href="detail.signUrl" target="_blank" rel="noopener">{{ detail.signUrl }}</a>
        <div v-if="detail.signQrCodeUrl" class="qrBox">
          <img :src="detail.signQrCodeUrl" alt="签约二维码" class="qrImg" />
          <span class="muted">可直接让法定代表人扫码签约</span>
        </div>
        <p v-else class="muted">后端未下发二维码地址，请复制上方链接发给法定代表人扫码。</p>
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

    <section v-if="!loading" class="card">
      <div class="sectionHead">
        <h2 class="sectionTitle">微信二级商户号（sub_mchid）</h2>
        <span v-if="!canBind" class="muted">仅平台管理员可绑定/修正</span>
      </div>
      <p class="hintText">
        进件成功时后端会自动写入绑定，此处用于运营手工补录或纠正。
        只有 <code>status=active</code> 且 sub_mchid 非空时，该商家商城订单才可走服务商通道，
        否则下单会提示「该商家暂未完成微信进件，请使用积分/物业币支付」。
      </p>

      <p v-if="wechatSuccess" class="bannerSuccess">{{ wechatSuccess }}</p>
      <p v-if="wechatError" class="bannerError">{{ wechatError }}</p>

      <div v-if="wechatLoading" class="hint">加载中...</div>
      <template v-else>
        <dl class="infoList">
          <div><dt>当前绑定</dt><dd class="mono">{{ account?.subMchid || '未绑定' }}</dd></div>
          <div><dt>主体名称</dt><dd>{{ account?.merchantName || '—' }}</dd></div>
          <div>
            <dt>状态</dt>
            <dd>
              <span
                v-if="account?.status"
                class="statusBadge"
                :class="account.status === 'active' ? 'finished' : 'auditing'"
              >
                {{ getEnumLabel(WECHAT_SUB_MCH_STATUS_LABEL, account.status, account.status) }}
              </span>
              <span v-else>—</span>
            </dd>
          </div>
          <div v-if="account?.updatedAt"><dt>更新时间</dt><dd>{{ account.updatedAt }}</dd></div>
        </dl>

        <div class="bindForm">
          <div class="field">
            <label class="label">sub_mchid <em>*</em></label>
            <input
              v-model="wechatForm.subMchid"
              class="input"
              maxlength="20"
              inputmode="numeric"
              placeholder="8~20 位数字，如 1900000109"
              :disabled="!canBind || wechatSaving"
            />
          </div>
          <div class="field">
            <label class="label">特约商户主体名称</label>
            <input
              v-model="wechatForm.merchantName"
              class="input"
              maxlength="80"
              :disabled="!canBind || wechatSaving"
            />
          </div>
          <div class="field">
            <label class="label">状态</label>
            <select v-model="wechatForm.status" class="input" :disabled="!canBind || wechatSaving">
              <option v-for="opt in WECHAT_SUB_MCH_STATUS_OPTIONS" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
          </div>
          <button
            class="btnPrimary"
            :disabled="!canBind || wechatSaving"
            :title="canBind ? '' : '仅平台管理员可操作'"
            @click="saveWechatAccount"
          >
            {{ wechatSaving ? '保存中...' : account?.subMchid ? '保存修正' : '绑定' }}
          </button>
        </div>
      </template>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { adminMerchantApplymentApi } from '../../api/services'
import { formatApiError } from '../../api/request'
import type { ApplymentDetail, MerchantWechatAccount } from '../../api/types'
import {
  APPLYMENT_BANK_ACCOUNT_TYPE_LABEL,
  APPLYMENT_ORGANIZATION_TYPE_LABEL,
  APPLYMENT_STATE,
  APPLYMENT_STATE_LABEL,
  APPLYMENT_SUBMIT_MODE_LABEL,
  APPLYMENT_WX_STATE_LABEL,
  USER_ROLE,
  WECHAT_SUB_MCH_STATUS,
  WECHAT_SUB_MCH_STATUS_LABEL,
  WECHAT_SUB_MCH_STATUS_OPTIONS,
  getEnumLabel
} from '../../constants/enums'
import { useAuthStore } from '../../stores/auth'
import { applymentStateHint, isApplymentNotFound } from '../../utils/ecommerce'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const merchantId = computed(() => String(route.params.id || ''))
const loading = ref(true)
const acting = ref(false)
const error = ref('')
const success = ref('')
const detail = ref<ApplymentDetail>({})

// --- 附录 C.3.3 sub_mchid 绑定（PUT 仅 platform_admin） ---
const canBind = computed(() => auth.profile?.role === USER_ROLE.PLATFORM_ADMIN)
const account = ref<MerchantWechatAccount | null>(null)
const wechatLoading = ref(true)
const wechatSaving = ref(false)
const wechatError = ref('')
const wechatSuccess = ref('')
const wechatForm = reactive({
  subMchid: '',
  merchantName: '',
  status: WECHAT_SUB_MCH_STATUS.ACTIVE as string
})

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

async function loadWechatAccount() {
  if (!merchantId.value) {
    wechatLoading.value = false
    return
  }
  wechatLoading.value = true
  wechatError.value = ''
  try {
    // 未绑定时后端返回 data=null
    const res = await adminMerchantApplymentApi.getWechatAccount(merchantId.value)
    account.value = res || null
    wechatForm.subMchid = account.value?.subMchid || ''
    wechatForm.merchantName = account.value?.merchantName || ''
    wechatForm.status = account.value?.status || WECHAT_SUB_MCH_STATUS.ACTIVE
  } catch (e) {
    account.value = null
    wechatError.value = formatApiError(e, 'sub_mchid 绑定信息加载失败')
  } finally {
    wechatLoading.value = false
  }
}

async function saveWechatAccount() {
  const subMchid = wechatForm.subMchid.trim()
  wechatError.value = ''
  wechatSuccess.value = ''
  if (!/^\d{8,20}$/.test(subMchid)) {
    wechatError.value = 'sub_mchid 必须为 8~20 位数字'
    return
  }
  wechatSaving.value = true
  try {
    const saved = await adminMerchantApplymentApi.saveWechatAccount(merchantId.value, {
      subMchid,
      merchantName: wechatForm.merchantName.trim() || undefined,
      status: wechatForm.status || WECHAT_SUB_MCH_STATUS.ACTIVE
    })
    account.value = saved || { subMchid, status: wechatForm.status }
    wechatSuccess.value =
      account.value.status === WECHAT_SUB_MCH_STATUS.ACTIVE
        ? '已保存。该商家商城订单可走服务商通道（需服务商通道已配置）。'
        : '已保存，但状态不是 active，商城订单仍会提示未完成进件。'
  } catch (e) {
    wechatError.value = formatApiError(
      e,
      '保存失败：请确认 sub_mchid 未被其他商家占用，且不等于服务商 sp_mchid / 平台直连商户号'
    )
  } finally {
    wechatSaving.value = false
  }
}

async function copyText(text: string, label: string) {
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
    success.value = `${label}已复制，可发给法定代表人扫码。`
  } catch {
    success.value = `复制失败，请手动选中${label}后复制。`
  }
}

onMounted(() => {
  void load()
  void loadWechatAccount()
})
</script>

<style scoped>
.page { max-width: 860px; }
.header { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
.headerActions { display: flex; gap: 8px; }
.title { font-size: 22px; font-weight: 600; }
.desc { font-size: 14px; color: #8c8c9a; }
.card { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.card + .card { margin-top: 16px; }
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
.btnCopy { margin-left: 6px; padding: 2px 8px; font-size: 12px; border-radius: 6px; border: 1px solid #bfd3ff; background: #fff; color: #1d4ed8; cursor: pointer; }
.qrBox { display: flex; align-items: center; gap: 12px; margin-top: 10px; }
.qrImg { width: 120px; height: 120px; object-fit: contain; background: #fff; border-radius: 8px; }
.mt { margin-top: 16px; }
.sectionHead { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.sectionTitle { font-size: 16px; font-weight: 600; margin-bottom: 8px; }
.bindForm { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; align-items: end; margin-top: 12px; }
.field { display: flex; flex-direction: column; }
.label { font-size: 13px; color: #8c8c9a; margin-bottom: 6px; }
.label em { color: #e05c5c; font-style: normal; }
.input { padding: 9px 12px; border: 1px solid #e8e8ec; border-radius: 8px; font-size: 14px; background: #fff; }
.input:disabled { background: #f7f7fa; color: #a0a0ad; }
.bindForm .btnPrimary { grid-column: 1 / -1; justify-self: start; }
@media (max-width: 720px) {
  .bindForm { grid-template-columns: 1fr; }
}
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
