<template>
  <div class="page">
    <div class="header">
      <div>
        <h1 class="title">物业收款银行卡</h1>
        <p class="desc">积分收款卡与奖励金收款卡（§94.7），账号脱敏展示。</p>
      </div>
      <button class="btnPrimary" @click="openCreate">新增银行卡</button>
    </div>
    <p v-if="error" class="error">{{ error }}</p>
    <div class="panel">
      <div v-if="loading" class="hint">加载中...</div>
      <table v-else-if="list.length" class="table">
        <thead>
          <tr><th>用途</th><th>银行</th><th>账号</th><th>户名</th><th>默认</th><th>操作</th></tr>
        </thead>
        <tbody>
          <tr v-for="item in list" :key="item.id">
            <td>{{ getEnumLabel(BANK_CARD_PURPOSE_LABEL, item.purpose) }}</td>
            <td>{{ item.bankName || '—' }}</td>
            <td>{{ item.accountNo || '—' }}</td>
            <td>{{ item.accountName || '—' }}</td>
            <td>{{ item.isDefault ? '是' : '否' }}</td>
            <td>
              <button class="linkBtn" @click="removeItem(item)">删除</button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else class="hint">暂无银行卡</p>
    </div>
    <Teleport to="body">
      <div v-if="formOpen" class="overlay" @click.self="formOpen = false">
        <div class="modal">
          <h3>新增银行卡</h3>
          <select v-model="form.purpose" class="input">
            <option v-for="opt in BANK_CARD_PURPOSE_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
          <input v-model="form.bankName" class="input" placeholder="银行名称" />
          <input v-model="form.accountNo" class="input" placeholder="账号" />
          <input v-model="form.accountName" class="input" placeholder="户名" />
          <label><input v-model="form.isDefault" type="checkbox" /> 设为默认</label>
          <p v-if="formError" class="error">{{ formError }}</p>
          <div class="actions">
            <button @click="formOpen = false">取消</button>
            <button class="primary" :disabled="submitting" @click="submit">{{ submitting ? '提交中...' : '保存' }}</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { propertyBankCardApi } from '../../api/services'
import type { PropertyBankCardItem } from '../../api/types'
import { formatApiError } from '../../api/request'
import {
  BANK_CARD_PURPOSE,
  BANK_CARD_PURPOSE_LABEL,
  BANK_CARD_PURPOSE_OPTIONS,
  getEnumLabel
} from '../../constants/enums'

const list = ref<PropertyBankCardItem[]>([])
const loading = ref(false)
const error = ref('')
const formOpen = ref(false)
const submitting = ref(false)
const formError = ref('')
const form = reactive({
  purpose: BANK_CARD_PURPOSE.POINTS,
  bankName: '',
  accountNo: '',
  accountName: '',
  isDefault: false
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await propertyBankCardApi.list()
    list.value = Array.isArray(res) ? res : res.list || []
  } catch (e) {
    error.value = formatApiError(e, '加载失败')
  } finally {
    loading.value = false
  }
}

function openCreate() {
  form.purpose = BANK_CARD_PURPOSE.POINTS
  form.bankName = ''
  form.accountNo = ''
  form.accountName = ''
  form.isDefault = false
  formError.value = ''
  formOpen.value = true
}

async function submit() {
  if (!form.accountNo.trim()) {
    formError.value = '请填写账号'
    return
  }
  submitting.value = true
  formError.value = ''
  try {
    await propertyBankCardApi.create({
      purpose: form.purpose,
      bankName: form.bankName.trim() || undefined,
      accountNo: form.accountNo.trim(),
      accountName: form.accountName.trim() || undefined,
      isDefault: form.isDefault
    })
    formOpen.value = false
    await load()
  } catch (e) {
    formError.value = formatApiError(e, '保存失败')
  } finally {
    submitting.value = false
  }
}

async function removeItem(item: PropertyBankCardItem) {
  if (!confirm('确认删除该银行卡？')) return
  try {
    await propertyBankCardApi.remove(item.id)
    await load()
  } catch (e) {
    error.value = formatApiError(e, '删除失败')
  }
}

onMounted(load)
</script>

<style scoped>
.page { max-width: 900px; }
.header { display: flex; justify-content: space-between; margin-bottom: 16px; }
.title { font-size: 22px; font-weight: 600; }
.desc { font-size: 14px; color: #8c8c9a; }
.panel { background: #fff; border-radius: 12px; padding: 16px; }
.table { width: 100%; border-collapse: collapse; font-size: 14px; }
.table th, .table td { padding: 10px; border-bottom: 1px solid #f0f0f3; }
.btnPrimary { padding: 8px 16px; background: #5c5c9e; color: #fff; border: none; border-radius: 8px; cursor: pointer; }
.linkBtn { background: none; border: none; color: #cf1322; cursor: pointer; }
.overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal { background: #fff; padding: 20px; border-radius: 12px; width: 400px; display: flex; flex-direction: column; gap: 10px; }
.input { padding: 8px; border: 1px solid #e8e8ec; border-radius: 8px; }
.actions { display: flex; justify-content: flex-end; gap: 8px; }
.primary { background: #5c5c9e; color: #fff; border: none; padding: 8px 16px; border-radius: 6px; }
.error { color: #e05c5c; }
.hint { color: #8c8c9a; }
</style>
