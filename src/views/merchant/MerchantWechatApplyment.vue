<template>
  <div class="page">
    <div class="header">
      <div>
        <h1 class="title">微信收款</h1>
        <p class="desc">提交微信电商收付通进件资料。未完成进件前，住户无法对该店使用微信支付，请引导积分或物业币。</p>
      </div>
      <button class="btnSecondary" :disabled="loading || saving" @click="load">刷新</button>
    </div>

    <p v-if="banner" class="bannerInfo">{{ banner }}</p>
    <p v-if="success" class="bannerSuccess">{{ success }}</p>
    <p v-if="error" class="bannerError">{{ error }}</p>

    <div v-if="loading" class="hint">加载中...</div>

    <template v-else>
      <section class="card statusCard">
        <div class="statusRow">
          <span class="statusBadge" :class="detail.applymentState || 'init'">
            {{ getEnumLabel(APPLYMENT_STATE_LABEL, detail.applymentState, '未填写') }}
          </span>
          <span v-if="detail.wxState" class="muted">微信侧：{{ getEnumLabel(APPLYMENT_WX_STATE_LABEL, detail.wxState, '—') }}</span>
        </div>
        <p class="hintText">{{ applymentStateHint(detail.applymentState) }}</p>
        <dl class="infoList">
          <div v-if="detail.merchantShortname"><dt>商户简称</dt><dd>{{ detail.merchantShortname }}</dd></div>
          <div v-if="detail.contactMobile"><dt>联系手机</dt><dd>{{ detail.contactMobile }}</dd></div>
          <div v-if="detail.bankName"><dt>开户银行</dt><dd>{{ detail.bankName }}</dd></div>
          <div v-if="detail.subMchid"><dt>二级商户号</dt><dd class="mono">{{ detail.subMchid }}</dd></div>
          <div v-if="detail.submitMode">
            <dt>提交方式</dt>
            <dd>{{ getEnumLabel(APPLYMENT_SUBMIT_MODE_LABEL, detail.submitMode) }}</dd>
          </div>
        </dl>
        <p v-if="detail.rejectReason" class="bannerError">驳回原因：{{ detail.rejectReason }}</p>
        <div v-if="detail.legalValidationUrl" class="linkBox">
          <p>请引导法人打开以下链接完成人脸核验（有时效）：</p>
          <a :href="detail.legalValidationUrl" target="_blank" rel="noopener">{{ detail.legalValidationUrl }}</a>
        </div>
        <div v-if="detail.signUrl" class="linkBox">
          <p>请打开以下链接完成签约（有时效）：</p>
          <a :href="detail.signUrl" target="_blank" rel="noopener">{{ detail.signUrl }}</a>
        </div>
      </section>

      <section v-if="canEdit" class="card">
        <h3 class="cardTitle">进件资料</h3>
        <p class="muted">
          身份证号、银行卡号、开户名接口不回显。图片请先上传拿 mediaId（约 3 天有效），建议提交前再传。
          小微商户无营业执照，信用卡日限额 1000 元。
        </p>
        <form class="form" @submit.prevent="saveDraft">
          <div class="fieldRow">
            <label class="field">
              <span class="label">主体类型</span>
              <select v-model="form.organizationType" class="input">
                <option v-for="opt in APPLYMENT_ORGANIZATION_TYPE_OPTIONS" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
            </label>
            <label class="field">
              <span class="label">商户简称</span>
              <input v-model.trim="form.merchantShortname" class="input" maxlength="64" required />
            </label>
          </div>
          <label class="field">
            <span class="label">经营类目</span>
            <input v-model.trim="form.merchantCategory" class="input" placeholder="如：生鲜水果" />
          </label>
          <div class="fieldRow">
            <label class="field">
              <span class="label">联系人姓名</span>
              <input v-model.trim="form.contactName" class="input" required />
            </label>
            <label class="field">
              <span class="label">联系人手机</span>
              <input v-model.trim="form.contactMobile" class="input" required />
            </label>
          </div>
          <label class="field">
            <span class="label">联系人邮箱</span>
            <input v-model.trim="form.contactEmail" class="input" type="email" />
          </label>
          <div class="fieldRow">
            <label class="field">
              <span class="label">法人/经营者姓名</span>
              <input v-model.trim="form.idCardName" class="input" required />
            </label>
            <label class="field">
              <span class="label">身份证号</span>
              <input v-model.trim="form.idCardNumber" class="input" required autocomplete="off" />
            </label>
          </div>
          <div class="fieldRow">
            <div class="field">
              <span class="label">身份证人像面</span>
              <ApplymentMediaField v-model="form.idCardCopyMedia" />
            </div>
            <div class="field">
              <span class="label">身份证国徽面</span>
              <ApplymentMediaField v-model="form.idCardNationalMedia" />
            </div>
          </div>
          <div class="field">
            <span class="label">营业执照{{ form.organizationType === APPLYMENT_ORGANIZATION_TYPE.MICRO ? '（小微可空）' : '' }}</span>
            <ApplymentMediaField v-model="form.businessLicenseMedia" />
          </div>
          <div class="fieldRow">
            <label class="field">
              <span class="label">结算账户类型</span>
              <select v-model="form.bankAccountType" class="input">
                <option v-for="opt in APPLYMENT_BANK_ACCOUNT_TYPE_OPTIONS" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
            </label>
            <label class="field">
              <span class="label">开户名</span>
              <input v-model.trim="form.bankAccountName" class="input" required autocomplete="off" />
            </label>
          </div>
          <div class="fieldRow">
            <label class="field">
              <span class="label">银行账号</span>
              <input v-model.trim="form.bankAccountNumber" class="input" required autocomplete="off" />
            </label>
            <label class="field">
              <span class="label">开户银行全称（含支行）</span>
              <input v-model.trim="form.bankName" class="input" maxlength="128" required />
            </label>
          </div>
          <p v-if="formError" class="bannerError">{{ formError }}</p>
          <div class="actions">
            <button type="submit" class="btnSecondary" :disabled="saving">
              {{ saving ? '保存中...' : '保存资料' }}
            </button>
            <button type="button" class="btnPrimary" :disabled="saving" @click="submitToWechat">
              {{ saving ? '提交中...' : '提交进件' }}
            </button>
          </div>
        </form>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import ApplymentMediaField from '../../components/ApplymentMediaField.vue'
import { merchantApplymentApi } from '../../api/services'
import { ApiError, formatApiError } from '../../api/request'
import type { ApplymentDetail, ApplymentSubmitPayload } from '../../api/types'
import {
  APPLYMENT_BANK_ACCOUNT_TYPE,
  APPLYMENT_BANK_ACCOUNT_TYPE_OPTIONS,
  APPLYMENT_ORGANIZATION_TYPE,
  APPLYMENT_ORGANIZATION_TYPE_OPTIONS,
  APPLYMENT_STATE_LABEL,
  APPLYMENT_SUBMIT_MODE_LABEL,
  APPLYMENT_WX_STATE_LABEL,
  getEnumLabel,
  isApplymentEditable
} from '../../constants/enums'
import { applymentStateHint, isApplymentNotFound } from '../../utils/ecommerce'

const loading = ref(true)
const saving = ref(false)
const error = ref('')
const success = ref('')
const formError = ref('')
const banner = ref('')
const detail = ref<ApplymentDetail>({})
const form = reactive({
  organizationType: APPLYMENT_ORGANIZATION_TYPE.INDIVIDUAL,
  merchantShortname: '',
  merchantCategory: '',
  contactName: '',
  contactMobile: '',
  contactEmail: '',
  idCardName: '',
  idCardNumber: '',
  idCardCopyMedia: '',
  idCardNationalMedia: '',
  businessLicenseMedia: '',
  bankAccountType: APPLYMENT_BANK_ACCOUNT_TYPE.PERSONAL,
  bankAccountName: '',
  bankAccountNumber: '',
  bankName: ''
})

const canEdit = computed(() => isApplymentEditable(detail.value.applymentState))

function fillFromDetail(data: ApplymentDetail) {
  detail.value = data
  form.organizationType = data.organizationType || APPLYMENT_ORGANIZATION_TYPE.INDIVIDUAL
  form.merchantShortname = data.merchantShortname || ''
  form.merchantCategory = data.merchantCategory || ''
  form.bankAccountType = data.bankAccountType || APPLYMENT_BANK_ACCOUNT_TYPE.PERSONAL
  form.bankName = data.bankName || ''
}

function buildPayload(): ApplymentSubmitPayload | string {
  if (!form.merchantShortname) return '请填写商户简称'
  if (!form.contactName) return '请填写联系人姓名'
  if (!form.contactMobile) return '请填写联系人手机'
  if (!form.idCardName) return '请填写法人/经营者姓名'
  if (!form.idCardNumber) return '请填写身份证号'
  if (!form.idCardCopyMedia) return '请上传身份证人像面'
  if (!form.idCardNationalMedia) return '请上传身份证国徽面'
  if (form.organizationType !== APPLYMENT_ORGANIZATION_TYPE.MICRO && !form.businessLicenseMedia) {
    return '请上传营业执照（小微商户可空）'
  }
  if (!form.bankAccountName) return '请填写开户名'
  if (!form.bankAccountNumber) return '请填写银行账号'
  if (!form.bankName) return '请填写开户银行全称（含支行）'
  return {
    organizationType: form.organizationType,
    merchantShortname: form.merchantShortname,
    merchantCategory: form.merchantCategory || undefined,
    contactName: form.contactName,
    contactMobile: form.contactMobile,
    contactEmail: form.contactEmail || undefined,
    idCardName: form.idCardName,
    idCardNumber: form.idCardNumber,
    idCardCopyMedia: form.idCardCopyMedia,
    idCardNationalMedia: form.idCardNationalMedia,
    businessLicenseMedia: form.businessLicenseMedia || undefined,
    bankAccountType: form.bankAccountType,
    bankAccountName: form.bankAccountName,
    bankAccountNumber: form.bankAccountNumber,
    bankName: form.bankName
  }
}

async function load() {
  loading.value = true
  error.value = ''
  banner.value = ''
  try {
    const data = await merchantApplymentApi.getMine()
    fillFromDetail(data || {})
  } catch (e) {
    if (isApplymentNotFound(e)) {
      detail.value = {}
      banner.value = '尚未填写进件资料，请先保存后再提交到微信。'
    } else {
      error.value = formatApiError(e, '加载进件状态失败')
    }
  } finally {
    loading.value = false
  }
}

async function saveDraft() {
  const payload = buildPayload()
  if (typeof payload === 'string') {
    formError.value = payload
    return
  }
  saving.value = true
  formError.value = ''
  success.value = ''
  error.value = ''
  try {
    const data = await merchantApplymentApi.save(payload)
    fillFromDetail(data)
    success.value = '资料已保存。默认由运营后台提交到微信，也可自行点「提交进件」。'
  } catch (e) {
    formError.value = formatApiError(e, '保存失败')
  } finally {
    saving.value = false
  }
}

async function submitToWechat() {
  const payload = buildPayload()
  if (typeof payload === 'string') {
    formError.value = payload
    return
  }
  saving.value = true
  formError.value = ''
  success.value = ''
  error.value = ''
  try {
    await merchantApplymentApi.save(payload)
    const data = await merchantApplymentApi.submit()
    fillFromDetail(data)
    success.value = '已提交微信审核，请等待 1–2 个工作日。'
  } catch (e) {
    if (e instanceof ApiError && e.code === 99007) {
      formError.value = formatApiError(e, '当前状态不可提交，审核中请勿重复提交')
    } else {
      formError.value = formatApiError(e, '提交进件失败')
    }
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.page { max-width: 880px; }
.header { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
.title { font-size: 22px; font-weight: 600; }
.desc { font-size: 14px; color: #8c8c9a; }
.card { background: #fff; border-radius: 12px; padding: 20px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.cardTitle { font-size: 16px; font-weight: 600; margin-bottom: 8px; }
.statusRow { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.statusBadge { display: inline-block; border-radius: 999px; padding: 4px 10px; font-size: 12px; font-weight: 600; background: #f4f5f7; }
.statusBadge.init { background: #f4f5f7; color: #5c5c66; }
.statusBadge.submitted, .statusBadge.auditing { background: #fff7e6; color: #b45309; }
.statusBadge.legal_validating, .statusBadge.signing { background: #eff4ff; color: #1d4ed8; }
.statusBadge.finished { background: #e8f5ee; color: #0f7b45; }
.statusBadge.rejected { background: #fdecec; color: #b91c1c; }
.hintText, .muted { font-size: 13px; color: #8c8c9a; line-height: 1.6; }
.infoList div { display: flex; gap: 12px; padding: 8px 0; border-bottom: 1px solid #f0f0f3; font-size: 14px; }
.infoList dt { width: 88px; color: #8c8c9a; }
.mono { font-family: Consolas, Monaco, monospace; }
.linkBox { margin-top: 12px; padding: 12px; background: #eff4ff; border-radius: 8px; font-size: 13px; word-break: break-all; }
.linkBox a { color: #2563eb; }
.form { display: flex; flex-direction: column; gap: 14px; margin-top: 12px; }
.field { display: flex; flex-direction: column; gap: 6px; }
.fieldRow { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.label { font-size: 13px; color: #8c8c9a; }
.input { padding: 8px 12px; border: 1px solid #e8e8ec; border-radius: 8px; font-size: 14px; }
.actions { display: flex; gap: 10px; }
.btnPrimary, .btnSecondary { padding: 10px 18px; border-radius: 8px; cursor: pointer; }
.btnPrimary { background: #5c5c9e; color: #fff; border: none; }
.btnSecondary { background: #fff; color: #5c5c66; border: 1px solid #e8e8ec; }
.btnPrimary:disabled, .btnSecondary:disabled { opacity: 0.5; }
.bannerSuccess { background: #f6ffed; color: #389e0d; padding: 10px 14px; border-radius: 8px; margin-bottom: 12px; font-size: 13px; }
.bannerError { background: #fff1f0; color: #cf1322; padding: 10px 14px; border-radius: 8px; margin-bottom: 12px; font-size: 13px; }
.bannerInfo { background: #eff4ff; color: #1e40af; padding: 10px 14px; border-radius: 8px; margin-bottom: 12px; font-size: 13px; }
.hint { padding: 24px 0; color: #8c8c9a; }
@media (max-width: 720px) {
  .header { flex-direction: column; }
  .fieldRow { grid-template-columns: 1fr; }
}
</style>
