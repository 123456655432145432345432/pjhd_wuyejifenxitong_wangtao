<template>
  <div class="page">
    <div class="header">
      <div>
        <h1 class="title">提现记录</h1>
        <p class="desc">快递员配送收益提现申请与记录</p>
      </div>
      <button class="btnPrimary" @click="openApply">申请提现</button>
    </div>

    <div class="panel">
      <div v-if="loading" class="hint">加载中...</div>
      <p v-else-if="error" class="error">{{ error }}</p>
      <table v-else-if="list.length" class="table">
        <thead>
          <tr>
            <th>提现金额</th>
            <th>手续费</th>
            <th>实际到账</th>
            <th>状态</th>
            <th>申请时间</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in list" :key="item.id">
            <td>¥{{ formatMoney(item.amount) }}</td>
            <td>¥{{ formatMoney(item.feeAmount) }}</td>
            <td>¥{{ formatMoney(item.actualAmount) }}</td>
            <td>{{ getEnumLabel(WITHDRAWAL_AUDIT_STATUS_LABEL, item.status) }}</td>
            <td>{{ item.createdAt || '—' }}</td>
          </tr>
        </tbody>
      </table>
      <p v-else class="hint">暂无提现记录</p>
    </div>

    <Teleport to="body">
      <div v-if="modalOpen" class="modalOverlay" @click.self="modalOpen = false">
        <div class="modal">
          <div class="modalHeader">
            <h3 class="modalTitle">申请提现</h3>
            <button class="modalClose" @click="modalOpen = false">&times;</button>
          </div>
          <div class="modalBody">
            <div class="field">
              <label class="label">提现金额 (元)</label>
              <input v-model.number="amount" type="number" min="0" step="0.01" class="input" />
            </div>
            <p v-if="formError" class="error">{{ formError }}</p>
            <div class="modalFooter">
              <button class="btnSecondary" @click="modalOpen = false">取消</button>
              <button class="btnPrimary" :disabled="submitting" @click="submit">
                {{ submitting ? '提交中...' : '提交申请' }}
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
import { courierWithdrawalApi } from '../../api/services'
import type { RoleWithdrawalItem } from '../../api/types'
import { ApiError } from '../../api/request'
import { getEnumLabel, WITHDRAWAL_AUDIT_STATUS_LABEL } from '../../constants/enums'

const loading = ref(false)
const error = ref('')
const list = ref<RoleWithdrawalItem[]>([])

const modalOpen = ref(false)
const amount = ref(0)
const submitting = ref(false)
const formError = ref('')

function formatMoney(val?: number) {
  if (val === undefined || val === null) return '0.00'
  return Number(val).toFixed(2)
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await courierWithdrawalApi.list({ pageSize: 50 })
    list.value = res.list || []
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '加载失败'
  } finally {
    loading.value = false
  }
}

function openApply() {
  amount.value = 0
  formError.value = ''
  modalOpen.value = true
}

async function submit() {
  if (!amount.value || amount.value <= 0) {
    formError.value = '请输入有效提现金额'
    return
  }
  submitting.value = true
  formError.value = ''
  try {
    await courierWithdrawalApi.create({ amount: amount.value })
    modalOpen.value = false
    await load()
  } catch (e) {
    formError.value = e instanceof ApiError ? e.message : '申请失败'
  } finally {
    submitting.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.page { max-width: 960px; }
.header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; gap: 16px; flex-wrap: wrap; }
.title { font-size: 24px; font-weight: 600; color: #1f1f2e; margin-bottom: 8px; }
.desc { font-size: 14px; color: #8c8c9a; }
.panel { background: #fff; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.table { width: 100%; border-collapse: collapse; font-size: 14px; }
.table th, .table td { padding: 12px 16px; text-align: left; border-bottom: 1px solid #f0f0f3; }
.table th { color: #8c8c9a; font-weight: 500; background: #fafafc; }
.btnPrimary { padding: 10px 18px; border-radius: 8px; background: #5c5c9e; color: #fff; border: none; cursor: pointer; }
.btnSecondary { padding: 10px 18px; border-radius: 8px; border: 1px solid #e8e8ec; background: #fff; cursor: pointer; }
.hint, .error { font-size: 14px; color: #8c8c9a; text-align: center; padding: 24px 0; }
.error { color: #e05c5c; }
.modalOverlay { position: fixed; inset: 0; z-index: 1000; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; padding: 24px; }
.modal { background: #fff; border-radius: 12px; width: min(400px, 100%); }
.modalHeader { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid #f0f0f3; }
.modalTitle { font-size: 16px; font-weight: 600; margin: 0; }
.modalClose { border: none; background: none; font-size: 24px; cursor: pointer; color: #8c8c9a; }
.modalBody { padding: 24px; }
.field { margin-bottom: 16px; }
.label { display: block; font-size: 13px; color: #5c5c66; margin-bottom: 8px; }
.input { width: 100%; padding: 10px 14px; border: 1px solid #e8e8ec; border-radius: 8px; font-size: 14px; box-sizing: border-box; }
.modalFooter { display: flex; justify-content: flex-end; gap: 12px; margin-top: 8px; }
</style>
