<template>
  <div class="page">
    <div class="header">
      <div>
        <h1 class="title">服务需求</h1>
        <p class="desc">正式方案为表单报价（金额/币种/说明/有效小时），住户确认支付后生成服务订单</p>
      </div>
      <button type="button" class="btnSecondary" :disabled="loading" @click="loadList">刷新</button>
    </div>

    <div class="panel">
      <div v-if="loading" class="hint">加载中...</div>
      <p v-else-if="gateBlocked" class="bannerWarn">{{ gateBlocked }}</p>
      <p v-else-if="error" class="error">{{ error }}</p>
      <div v-else-if="list.length && isMobile" class="mobileList">
        <article v-for="item in list" :key="item.id" class="mobileCard">
          <div class="mobileCardHead"><strong>{{ item.matchedCategoryName || '未分类' }}</strong><span>{{ getEnumLabel(SERVICE_REQUEST_STATUS_LABEL, item.statusCode || item.status) }}</span></div>
          <p class="mobileDescription">{{ item.description || '—' }}</p>
          <p class="mobileMeta">{{ item.createdAt || '—' }} · {{ item.contactPhone || '—' }}</p>
          <div class="actions">
            <button type="button" class="linkBtn" :disabled="actionsDisabled" @click="accept(item.id)">接单</button>
            <button type="button" class="linkBtn" :disabled="actionsDisabled" @click="skip(item.id)">跳过</button>
            <button type="button" class="linkBtn" :disabled="actionsDisabled" @click="openQuote(item)">费用通知</button>
          </div>
        </article>
      </div>
      <table v-else-if="list.length" class="table">
        <thead>
          <tr>
            <th>时间</th>
            <th>需求描述</th>
            <th>分类</th>
            <th>状态</th>
            <th>联系电话</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in list" :key="item.id">
            <td>{{ item.createdAt || '—' }}</td>
            <td class="descCell">{{ item.description || '—' }}</td>
            <td>{{ item.matchedCategoryName || '—' }}</td>
            <td>{{ getEnumLabel(SERVICE_REQUEST_STATUS_LABEL, item.statusCode || item.status) }}</td>
            <td>{{ item.contactPhone || '—' }}</td>
            <td class="actions">
              <button type="button" class="linkBtn" :disabled="actionsDisabled" @click="accept(item.id)">接单</button>
              <button type="button" class="linkBtn" :disabled="actionsDisabled" @click="skip(item.id)">跳过</button>
              <button type="button" class="linkBtn" :disabled="actionsDisabled" @click="openQuote(item)">费用通知</button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else class="hint">暂无待响应需求</p>
    </div>

    <Teleport to="body">
      <div v-if="quoteOpen" class="modalOverlay" @click.self="quoteOpen = false">
        <div class="modal" :class="{ mobileSheet: isMobile }">
          <div class="modalHeader">
            <h3 class="modalTitle">发送费用通知</h3>
            <button type="button" class="modalClose" @click="quoteOpen = false">&times;</button>
          </div>
          <div class="modalBody">
            <div class="field">
              <label class="label">金额</label>
              <input v-model.number="quoteForm.amount" type="number" min="0.01" step="0.01" class="input" />
            </div>
            <div class="field">
              <label class="label">支付币种</label>
              <select v-model="quoteForm.currencyType" class="input">
                <option :value="PAYMENT_METHOD.PROPERTY_COIN">物业币</option>
                <option :value="PAYMENT_METHOD.POINT">积分</option>
              </select>
            </div>
            <div class="field">
              <label class="label">说明</label>
              <textarea v-model="quoteForm.description" class="textarea" rows="3" />
            </div>
            <div class="field">
              <label class="label">有效小时</label>
              <input v-model.number="quoteForm.validHours" type="number" min="1" class="input" />
            </div>
            <p v-if="quoteError" class="error">{{ quoteError }}</p>
            <div class="modalFooter">
              <button type="button" class="btnSecondary" @click="quoteOpen = false">取消</button>
              <button type="button" class="btnPrimary" :disabled="quoting" @click="submitQuote">
                {{ quoting ? '发送中...' : '发送' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { merchantPortalApi } from '../../api/services'
import { ApiError } from '../../api/request'
import type { ServiceRequestItem } from '../../api/types'
import {
  getEnumLabel,
  getPhase2ErrorMessage,
  PAYMENT_METHOD,
  SERVICE_REQUEST_STATUS_LABEL
} from '../../constants/enums'
import { useIsMobile } from '../../composables/useIsMobile'

const { isMobile } = useIsMobile()
const loading = ref(false)
const error = ref('')
const gateCode = ref<number | null>(null)
const list = ref<ServiceRequestItem[]>([])

const quoteOpen = ref(false)
const quoting = ref(false)
const quoteError = ref('')
const quoteId = ref('')
const quoteForm = ref({
  amount: 0,
  currencyType: PAYMENT_METHOD.PROPERTY_COIN,
  description: '',
  validHours: 24
})

const gateBlocked = computed(() => {
  if (gateCode.value == null) return ''
  return getPhase2ErrorMessage(gateCode.value, error.value)
})
const actionsDisabled = computed(() => gateCode.value === 60002 || gateCode.value === 60005)

function resolveError(e: unknown) {
  if (e instanceof ApiError) {
    if (e.code === 60002 || e.code === 60005) {
      gateCode.value = e.code
    }
    return getPhase2ErrorMessage(e.code, e.message)
  }
  if (e instanceof Error) return e.message
  return '操作失败'
}

async function loadList() {
  loading.value = true
  error.value = ''
  gateCode.value = null
  try {
    const res = await merchantPortalApi.serviceRequestPending({ page: 1, pageSize: 50 })
    list.value = res.list || []
  } catch (e) {
    error.value = resolveError(e)
    list.value = []
  } finally {
    loading.value = false
  }
}

async function accept(id: string) {
  if (actionsDisabled.value) return
  try {
    await merchantPortalApi.acceptServiceRequest(id)
    await loadList()
  } catch (e) {
    error.value = resolveError(e)
  }
}

async function skip(id: string) {
  if (actionsDisabled.value) return
  try {
    await merchantPortalApi.skipServiceRequest(id)
    await loadList()
  } catch (e) {
    error.value = resolveError(e)
  }
}

function openQuote(item: ServiceRequestItem) {
  if (actionsDisabled.value) return
  quoteId.value = item.id
  quoteForm.value = {
    amount: item.quote?.amount || 0,
    currencyType: item.quote?.currencyType || PAYMENT_METHOD.PROPERTY_COIN,
    description: item.quote?.description || '',
    validHours: item.quote?.validHours || 24
  }
  quoteError.value = ''
  quoteOpen.value = true
}

async function submitQuote() {
  if (actionsDisabled.value) return
  if (!quoteForm.value.amount || quoteForm.value.amount <= 0) {
    quoteError.value = '请填写有效金额'
    return
  }
  quoting.value = true
  quoteError.value = ''
  try {
    await merchantPortalApi.quoteServiceRequest(quoteId.value, {
      amount: quoteForm.value.amount,
      currencyType: quoteForm.value.currencyType,
      description: quoteForm.value.description.trim() || undefined,
      validHours: quoteForm.value.validHours
    })
    quoteOpen.value = false
    await loadList()
  } catch (e) {
    quoteError.value = resolveError(e)
  } finally {
    quoting.value = false
  }
}

onMounted(loadList)
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}
.title {
  margin: 0;
  font-size: 22px;
}
.desc {
  margin: 6px 0 0;
  color: #8c8c9a;
  font-size: 13px;
}
.panel {
  background: #fff;
  border: 1px solid #ececf2;
  border-radius: 12px;
  padding: 16px;
}
.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.table th,
.table td {
  border-bottom: 1px solid #f0f0f5;
  padding: 10px 6px;
  text-align: left;
  vertical-align: top;
}
.descCell {
  max-width: 280px;
}
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.linkBtn {
  border: none;
  background: transparent;
  color: #5c5c9e;
  padding: 0;
  cursor: pointer;
  font: inherit;
}
.linkBtn:disabled {
  color: #b0b0ba;
  cursor: not-allowed;
}
.bannerWarn {
  margin: 0 0 12px;
  padding: 10px 12px;
  border-radius: 8px;
  background: #fff7e6;
  color: #d48806;
  font-size: 13px;
}
.btnPrimary {
  padding: 10px 18px;
  border-radius: 8px;
  border: none;
  background: #5c5c9e;
  color: #ffffff;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
}
.btnPrimary:hover { background: #52529a; }
.btnPrimary:disabled { opacity: 0.6; cursor: not-allowed; }
.btnSecondary {
  padding: 10px 18px;
  border-radius: 8px;
  border: 1px solid #e8e8ec;
  background: #ffffff;
  color: #5c5c66;
  font-size: 14px;
  cursor: pointer;
}
.btnSecondary:hover { border-color: #5c5c9e; color: #5c5c9e; }
.hint {
  color: #8c8c9a;
}
.error {
  color: #d14343;
  font-size: 13px;
}
.modalOverlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}
.modal {
  background: #fff;
  border-radius: 12px;
  width: min(480px, 100%);
}
.modalHeader {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  border-bottom: 1px solid #eee;
}
.modalTitle {
  margin: 0;
}
.modalClose {
  border: none;
  background: transparent;
  font-size: 22px;
  cursor: pointer;
}
.modalBody {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.modalFooter {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.label {
  font-size: 13px;
  color: #666;
}
.input,
.textarea {
  border: 1px solid #e8e8ec;
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 14px;
  color: #1f1f2e;
  background: #ffffff;
  outline: none;
}
.input:focus,
.textarea:focus { border-color: #5c5c9e; }
.mobileList { display: flex; flex-direction: column; gap: 12px; }
.mobileCard { border: 1px solid #ececf2; border-radius: 10px; padding: 14px; }
.mobileCardHead { display: flex; justify-content: space-between; gap: 12px; font-size: 13px; }
.mobileDescription { margin: 10px 0; line-height: 1.5; }
.mobileMeta { margin-bottom: 12px; color: #8c8c9a; font-size: 12px; }
.mobileSheet { max-width: 100%; border-radius: 18px 18px 0 0; margin-top: auto; }
@media (max-width: 640px) {
  .header { flex-direction: column; gap: 12px; }
  .header .btnSecondary { width: 100%; min-height: 44px; }
  .panel { padding: 14px; }
  .modalOverlay { align-items: flex-end; padding: 0; }
  .modal { width: 100%; max-height: 92vh; overflow-y: auto; }
  .modalFooter { flex-direction: column-reverse; }
  .modalFooter .btnSecondary, .modalFooter .btnPrimary, .modalFooter .btnDanger { width: 100%; min-height: 44px; }
}
</style>
