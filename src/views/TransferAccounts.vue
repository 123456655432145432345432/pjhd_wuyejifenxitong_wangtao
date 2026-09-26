<template>
  <div class="page">
    <div class="header">
      <div>
        <h1 class="title">收款方式</h1>
        <p class="desc">绑定本人微信零钱或银行卡，作为平台内部结算（商家转账）的收款账户。银行卡号与持卡人不回显。</p>
      </div>
      <button class="btnPrimary" @click="openBind">绑定 / 更新</button>
    </div>

    <p class="bannerInfo">
      证书轮换后旧绑定可能失效，转账会一直处于处理中。若「显示已绑但一直不到账」，请重新绑定一次。
    </p>
    <p v-if="success" class="bannerSuccess">{{ success }}</p>
    <p v-if="error" class="bannerError">{{ error }}</p>

    <div class="panel">
      <div v-if="loading" class="hint">加载中...</div>
      <table v-else-if="list.length" class="table">
        <thead>
          <tr>
            <th>渠道</th>
            <th>账号信息</th>
            <th>核验</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in list" :key="item.id">
            <td>{{ getEnumLabel(TRANSFER_ACCOUNT_CHANNEL_LABEL, item.channel) }}</td>
            <td>
              <div v-if="item.channel === TRANSFER_ACCOUNT_CHANNEL.ZERO" class="mono">{{ item.openid || '—' }}</div>
              <div v-else>{{ item.bankName || '银行卡（卡号不回显）' }}</div>
            </td>
            <td>
              <span :class="['statusBadge', item.verified ? 'ok' : 'pending']">
                {{ item.verified ? '已核验' : '未核验' }}
              </span>
            </td>
            <td>
              <button class="linkBtn" :disabled="busyChannel === item.channel" @click="unbind(item.channel)">
                {{ busyChannel === item.channel ? '解绑中...' : '解绑' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else class="hint">尚未绑定收款账号。内部结算出款前请先绑定微信零钱或银行卡。</p>
    </div>

    <Teleport to="body">
      <div v-if="formOpen" class="overlay" @click.self="formOpen = false">
        <div class="modal">
          <h3>绑定收款账号</h3>
          <p class="modalHint">同渠道重复绑定会覆盖更新。</p>
          <select v-model="form.channel" class="input">
            <option v-for="opt in TRANSFER_ACCOUNT_CHANNEL_OPTIONS" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
          <input
            v-if="form.channel === TRANSFER_ACCOUNT_CHANNEL.ZERO"
            v-model.trim="form.openid"
            class="input"
            placeholder="微信收款账号"
          />
          <template v-else>
            <input v-model.trim="form.bankAccountNo" class="input" placeholder="银行卡号" autocomplete="off" />
            <input v-model.trim="form.bankName" class="input" placeholder="开户银行全称（含支行）" />
            <input v-model.trim="form.accountName" class="input" placeholder="持卡人姓名" />
          </template>
          <p v-if="formError" class="error">{{ formError }}</p>
          <div class="modalActions">
            <button type="button" @click="formOpen = false">取消</button>
            <button type="button" class="primary" :disabled="submitting" @click="submit">
              {{ submitting ? '保存中...' : '保存' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { transferAccountApi } from '../api/services'
import { formatApiError } from '../api/request'
import type { TransferAccountItem } from '../api/types'
import {
  TRANSFER_ACCOUNT_CHANNEL,
  TRANSFER_ACCOUNT_CHANNEL_LABEL,
  TRANSFER_ACCOUNT_CHANNEL_OPTIONS,
  getEnumLabel
} from '../constants/enums'

const list = ref<TransferAccountItem[]>([])
const loading = ref(false)
const error = ref('')
const success = ref('')
const formOpen = ref(false)
const submitting = ref(false)
const formError = ref('')
const busyChannel = ref('')
const form = reactive({
  channel: TRANSFER_ACCOUNT_CHANNEL.ZERO,
  openid: '',
  bankAccountNo: '',
  bankName: '',
  accountName: ''
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    list.value = await transferAccountApi.listMine()
  } catch (e) {
    error.value = formatApiError(e, '加载收款账号失败')
  } finally {
    loading.value = false
  }
}

function openBind() {
  form.channel = TRANSFER_ACCOUNT_CHANNEL.ZERO
  form.openid = ''
  form.bankAccountNo = ''
  form.bankName = ''
  form.accountName = ''
  formError.value = ''
  formOpen.value = true
}

async function submit() {
  if (form.channel === TRANSFER_ACCOUNT_CHANNEL.ZERO && !form.openid) {
    formError.value = '请填写微信 openid'
    return
  }
  if (form.channel === TRANSFER_ACCOUNT_CHANNEL.BANK) {
    if (!form.bankAccountNo || !form.bankName || !form.accountName) {
      formError.value = '请填写银行卡号、开户行和持卡人'
      return
    }
  }
  submitting.value = true
  formError.value = ''
  try {
    await transferAccountApi.bind(
      form.channel === TRANSFER_ACCOUNT_CHANNEL.ZERO
        ? { channel: form.channel, openid: form.openid }
        : {
            channel: form.channel,
            bankAccountNo: form.bankAccountNo,
            bankName: form.bankName,
            accountName: form.accountName
          }
    )
    formOpen.value = false
    success.value = '收款账号已保存'
    await load()
  } catch (e) {
    formError.value = formatApiError(e, '绑定失败')
  } finally {
    submitting.value = false
  }
}

async function unbind(channel?: string) {
  if (!channel) return
  if (!confirm(`确认解绑${getEnumLabel(TRANSFER_ACCOUNT_CHANNEL_LABEL, channel)}？`)) return
  busyChannel.value = channel
  error.value = ''
  success.value = ''
  try {
    await transferAccountApi.unbind(channel)
    success.value = '已解绑'
    await load()
  } catch (e) {
    error.value = formatApiError(e, '解绑失败')
  } finally {
    busyChannel.value = ''
  }
}

onMounted(load)
</script>

<style scoped>
.page { max-width: 860px; }
.header { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
.title { font-size: 22px; font-weight: 600; }
.desc { font-size: 14px; color: #8c8c9a; }
.panel { background: #fff; border-radius: 12px; padding: 16px; }
.table { width: 100%; border-collapse: collapse; font-size: 14px; }
.table th, .table td { padding: 10px; border-bottom: 1px solid #f0f0f3; text-align: left; }
.mono { font-family: Consolas, Monaco, monospace; word-break: break-all; }
.statusBadge { display: inline-block; border-radius: 999px; padding: 2px 8px; font-size: 12px; }
.statusBadge.ok { background: #e8f5ee; color: #0f7b45; }
.statusBadge.pending { background: #fff7e6; color: #b45309; }
.btnPrimary { padding: 8px 16px; background: #5c5c9e; color: #fff; border: none; border-radius: 8px; cursor: pointer; }
.linkBtn { background: none; border: none; color: #cf1322; cursor: pointer; }
.hint { color: #8c8c9a; font-size: 14px; }
.bannerSuccess { background: #f6ffed; color: #389e0d; padding: 10px 14px; border-radius: 8px; margin-bottom: 12px; font-size: 13px; }
.bannerError { background: #fff1f0; color: #cf1322; padding: 10px 14px; border-radius: 8px; margin-bottom: 12px; font-size: 13px; }
.bannerInfo { background: #eff4ff; color: #1e40af; padding: 10px 14px; border-radius: 8px; margin-bottom: 12px; font-size: 13px; }
.overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal { background: #fff; border-radius: 12px; padding: 20px; width: min(440px, calc(100vw - 32px)); display: flex; flex-direction: column; gap: 10px; }
.modalHint { margin: 0; font-size: 13px; color: #8c8c9a; }
.input { padding: 8px 12px; border: 1px solid #e8e8ec; border-radius: 8px; font-size: 14px; }
.modalActions { display: flex; justify-content: flex-end; gap: 8px; }
.primary { background: #5c5c9e; color: #fff; border: none; border-radius: 8px; padding: 8px 14px; }
.error { color: #cf1322; font-size: 13px; }
</style>
