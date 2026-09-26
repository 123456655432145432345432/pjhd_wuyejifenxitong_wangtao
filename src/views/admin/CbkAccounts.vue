<template>
  <div class="page" :class="{ mobilePage: isMobile }">
    <div class="header">
      <div>
        <h1 class="title">收款账户（微信收付通分账接收方）</h1>
        <p class="desc">
          由运营代录各收款方的微信收付通二级商户号。住户付款进入平台微信支付商户号，履约后按公式分给商家 / 物业 / 统筹 / 负责人 / 快递员。
          服务商商户号、应用编号、接口密钥与证书只放后端 / 运维配置，本页不录入密钥。
        </p>
      </div>
      <div class="headerActions">
        <button type="button" class="btnSecondary" @click="openBatch">批量导入</button>
        <button type="button" class="btnPrimary" @click="openCreate">录入账户</button>
      </div>
    </div>

    <p class="bannerWarn">
      通道已切至微信收付通分账。收款账户号即二级商户号。相同（角色、主体编号）再次提交会更新，不会建重复行。
      退款垫付请到
      <RouterLink class="inlineLink" :to="{ name: 'split-recovery' }">待追回台账</RouterLink>
      ；物业自身收款账号请到
      <RouterLink class="inlineLink" :to="{ name: 'transfer-accounts' }">我的收款方式</RouterLink>。
      <RouterLink class="inlineLink" :to="{ name: 'settlement-config' }">结算配置</RouterLink>
      为当前主入口；本页仅作历史兼容。
    </p>

    <div class="toolbar">
      <select v-model="ownerType" class="input" @change="reload">
        <option v-for="opt in CBK_OWNER_TYPE_OPTIONS" :key="opt.value || 'all'" :value="opt.value">
          {{ opt.label }}
        </option>
      </select>
      <select v-model="verifiedFilter" class="input" @change="reload">
        <option value="">全部校验状态</option>
        <option value="true">已校验</option>
        <option value="false">未校验</option>
      </select>
      <input v-model.trim="ownerId" class="input" placeholder="主体编号" @keyup.enter="reload" />
      <button class="btnPrimary" :disabled="loading" @click="reload">查询</button>
    </div>

    <p v-if="banner" class="bannerSuccess">{{ banner }}</p>
    <p v-if="error" class="bannerError">{{ error }}</p>

    <div class="tableScroll">
      <table class="table">
        <thead>
          <tr>
            <th>角色</th>
            <th>主体编号</th>
            <th>二级商户号</th>
            <th>商户号</th>
            <th>户名 / 备注</th>
            <th>校验</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="7" class="emptyCell">加载中...</td>
          </tr>
          <tr v-else-if="error && !list.length">
            <td colspan="7" class="emptyCell">{{ error }}</td>
          </tr>
          <tr v-else-if="!list.length">
            <td colspan="7" class="emptyCell">暂无账户。先录入后再到对账台处理「未录入」记录。</td>
          </tr>
          <tr v-for="item in list" v-else :key="item.id" :class="{ notReady: item.verified === false }">
            <td>{{ getEnumLabel(CBK_OWNER_TYPE_LABEL, item.ownerType) }}</td>
            <td class="mono">{{ item.ownerId || '—' }}</td>
            <td class="mono">{{ maskAccountNo(item.accountNo) }}</td>
            <td class="mono">{{ item.merchantNo || '—' }}</td>
            <td>{{ item.accountName || '—' }}</td>
            <td>
              <span :class="['statusBadge', item.verified ? 'ok' : 'pending']">
                {{ item.verified ? '已校验' : '未校验' }}
              </span>
            </td>
            <td class="actions">
              <button type="button" class="actionBtn" @click="openEdit(item)">编辑</button>
              <button
                type="button"
                class="actionBtn"
                :disabled="busyId === item.id"
                @click="toggleVerify(item)"
              >
                {{ item.verified ? '取消校验' : '标记已校验' }}
              </button>
              <button
                type="button"
                class="actionBtn danger"
                :disabled="busyId === item.id"
                @click="remove(item)"
              >
                删除
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <p class="footerHint">
      缺户跳过的分账请到
      <RouterLink :to="{ name: 'cbk-reconcile' }">分账对账台</RouterLink>
      补录后重试。
    </p>

    <Teleport to="body">
      <div v-if="formOpen" class="modalOverlay" @click.self="closeForm">
        <div class="modal">
          <div class="modalHeader">
            <h3>{{ editingId ? '编辑收款账户' : '录入收款账户' }}</h3>
            <button type="button" class="modalClose" @click="closeForm">&times;</button>
          </div>
          <form class="modalBody" @submit.prevent="submitForm">
            <p class="formHint">角色、主体编号、二级商户号必填。平台主体请填写固定编号 PLATFORM。</p>
            <div class="field">
              <label class="label">角色 <em>*</em></label>
              <select v-model="form.ownerType" class="input" :disabled="!!editingId" @change="onOwnerTypeChange">
                <option value="">请选择</option>
                <option v-for="opt in ownerTypeFormOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
            </div>
            <div class="field">
              <label class="label">主体编号 <em>*</em></label>
              <input
                v-model.trim="form.ownerId"
                class="input"
                :disabled="form.ownerType === CBK_OWNER_TYPE.PLATFORM || !!editingId"
                :placeholder="ownerIdHint"
              />
            </div>
            <div class="field">
              <label class="label">二级商户号 / 收款账户号 <em>*</em></label>
              <input v-model.trim="form.accountNo" class="input" placeholder="微信收付通二级商户号" />
            </div>
            <div class="field">
              <label class="label">该主体商户号</label>
              <input v-model.trim="form.merchantNo" class="input" placeholder="选填，该主体微信收付通商户号" />
            </div>
            <div class="field">
              <label class="label">户名 / 备注</label>
              <input v-model.trim="form.accountName" class="input" placeholder="选填" />
            </div>
            <label class="checkRow">
              <input v-model="form.verified" type="checkbox" />
              已通过微信收付通开户 / 进件校验
            </label>
            <p class="formHint">从微信收付通后台导出后录入。勿填服务商密钥或证书。</p>
            <p v-if="formError" class="formError">{{ formError }}</p>
            <div class="modalFooter">
              <button type="button" class="btnSecondary" @click="closeForm">取消</button>
              <button type="submit" class="btnPrimary" :disabled="saving">
                {{ saving ? '保存中...' : '保存' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="batchOpen" class="modalOverlay" @click.self="closeBatch">
        <div class="modal modalWide">
          <div class="modalHeader">
            <h3>批量导入</h3>
            <button type="button" class="modalClose" @click="closeBatch">&times;</button>
          </div>
          <form class="modalBody" @submit.prevent="submitBatch">
            <p class="formHint">
              可从微信收付通后台导出后粘贴 JSON 数组，或 CSV（表头：ownerType,ownerId,accountNo,accountName,merchantNo,verified）。逐条幂等更新。
            </p>
            <div class="field">
              <label class="label">从 CSV 文件导入</label>
              <input type="file" accept=".csv,text/csv,text/plain" @change="onCsvFile" />
            </div>
            <div class="field">
              <label class="label">JSON / CSV 文本</label>
              <textarea
                v-model="batchText"
                class="textarea"
                rows="10"
                :placeholder="batchPlaceholder"
              />
            </div>
            <p v-if="batchError" class="formError">{{ batchError }}</p>
            <div class="modalFooter">
              <button type="button" class="btnSecondary" @click="closeBatch">取消</button>
              <button type="submit" class="btnPrimary" :disabled="batchSaving">
                {{ batchSaving ? '导入中...' : '导入' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { adminCbkApi } from '../../api/services'
import type { CbkAccountItem, CbkAccountUpsertPayload } from '../../api/types'
import {
  CBK_OWNER_ID_HINT,
  CBK_OWNER_TYPE,
  CBK_OWNER_TYPE_LABEL,
  CBK_OWNER_TYPE_OPTIONS,
  CBK_PLATFORM_OWNER_ID,
  getEnumLabel
} from '../../constants/enums'
import { useIsMobile } from '../../composables/useIsMobile'
import {
  explainCbkApiError,
  maskAccountNo,
  parseCbkAccountBatchText
} from '../../utils/cbk'

const { isMobile } = useIsMobile()
const ownerTypeFormOptions = CBK_OWNER_TYPE_OPTIONS.filter((item) => item.value)
const batchPlaceholder = `[
  {"ownerType":"PROPERTY","ownerId":"pc_a8f3k2","accountNo":"6222000000000001","accountName":"阳光物业"},
  {"ownerType":"MERCHANT","ownerId":"mer_a8f3k2","accountNo":"6222000000000002","accountName":"XX便利店"}
]`

const list = ref<CbkAccountItem[]>([])
const loading = ref(false)
const error = ref('')
const banner = ref('')
const ownerType = ref('')
const ownerId = ref('')
const verifiedFilter = ref('')
const busyId = ref('')

const formOpen = ref(false)
const editingId = ref('')
const saving = ref(false)
const formError = ref('')
const form = reactive({
  ownerType: '',
  ownerId: '',
  accountNo: '',
  merchantNo: '',
  accountName: '',
  verified: true
})

const batchOpen = ref(false)
const batchText = ref('')
const batchError = ref('')
const batchSaving = ref(false)

const ownerIdHint = computed(
  () => CBK_OWNER_ID_HINT[form.ownerType] || '对应实体主键'
)

function onOwnerTypeChange() {
  if (form.ownerType === CBK_OWNER_TYPE.PLATFORM) {
    form.ownerId = CBK_PLATFORM_OWNER_ID
  } else if (form.ownerId === CBK_PLATFORM_OWNER_ID) {
    form.ownerId = ''
  }
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    list.value = await adminCbkApi.listAccounts({
      ownerType: ownerType.value || undefined,
      ownerId: ownerId.value || undefined,
      verified:
        verifiedFilter.value === 'true'
          ? true
          : verifiedFilter.value === 'false'
            ? false
            : undefined
    })
  } catch (e) {
    list.value = []
    error.value = explainCbkApiError(e, '账户列表加载失败')
  } finally {
    loading.value = false
  }
}

function reload() {
  banner.value = ''
  void load()
}

function resetForm() {
  form.ownerType = ''
  form.ownerId = ''
  form.accountNo = ''
  form.merchantNo = ''
  form.accountName = ''
  form.verified = true
  formError.value = ''
  editingId.value = ''
}

function openCreate() {
  resetForm()
  formOpen.value = true
}

function openEdit(item: CbkAccountItem) {
  editingId.value = item.id
  form.ownerType = item.ownerType || ''
  form.ownerId = item.ownerId || ''
  form.accountNo = item.accountNo || ''
  form.merchantNo = item.merchantNo || ''
  form.accountName = item.accountName || ''
  form.verified = item.verified !== false
  formError.value = ''
  formOpen.value = true
}

function closeForm() {
  formOpen.value = false
  resetForm()
}

function buildPayload(): CbkAccountUpsertPayload | null {
  const type = form.ownerType
  const id = type === CBK_OWNER_TYPE.PLATFORM ? CBK_PLATFORM_OWNER_ID : form.ownerId
  if (!type || !id || !form.accountNo) {
    formError.value = '请填写角色、主体编号和收款账户号'
    return null
  }
  return {
    ownerType: type,
    ownerId: id,
    accountNo: form.accountNo,
    merchantNo: form.merchantNo || undefined,
    accountName: form.accountName || undefined,
    verified: form.verified
  }
}

async function submitForm() {
  const payload = buildPayload()
  if (!payload) return
  saving.value = true
  formError.value = ''
  try {
    if (editingId.value) {
      await adminCbkApi.updateAccount(editingId.value, payload)
      banner.value = '已更新收款账户'
    } else {
      await adminCbkApi.upsertAccount(payload)
      banner.value = '已保存收款账户（相同角色+主体会覆盖）'
    }
    closeForm()
    await load()
  } catch (e) {
    formError.value = explainCbkApiError(e, '保存失败')
  } finally {
    saving.value = false
  }
}

async function toggleVerify(item: CbkAccountItem) {
  if (!item.id) return
  const next = !item.verified
  busyId.value = item.id
  error.value = ''
  banner.value = ''
  try {
    await adminCbkApi.verifyAccount(item.id, next)
    banner.value = next ? '已标记为已校验' : '已取消校验标记'
    await load()
  } catch (e) {
    error.value = explainCbkApiError(e, '校验标记失败')
  } finally {
    busyId.value = ''
  }
}

async function remove(item: CbkAccountItem) {
  if (!item.id) return
  const ok = window.confirm(
    `确认删除该收款账户？\n角色：${getEnumLabel(CBK_OWNER_TYPE_LABEL, item.ownerType)}\n主体：${item.ownerId || '—'}`
  )
  if (!ok) return
  busyId.value = item.id
  error.value = ''
  banner.value = ''
  try {
    await adminCbkApi.deleteAccount(item.id)
    banner.value = '已删除'
    await load()
  } catch (e) {
    error.value = explainCbkApiError(e, '删除失败')
  } finally {
    busyId.value = ''
  }
}

function openBatch() {
  batchText.value = ''
  batchError.value = ''
  batchOpen.value = true
}

function closeBatch() {
  batchOpen.value = false
  batchText.value = ''
  batchError.value = ''
}

function onCsvFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    batchText.value = String(reader.result || '')
  }
  reader.readAsText(file)
  input.value = ''
}

async function submitBatch() {
  let payload: CbkAccountUpsertPayload[]
  try {
    payload = parseCbkAccountBatchText(batchText.value)
  } catch (e) {
    batchError.value = e instanceof Error ? e.message : '解析失败'
    return
  }
  batchSaving.value = true
  batchError.value = ''
  try {
    await adminCbkApi.batchUpsertAccounts(payload)
    closeBatch()
    banner.value = `已导入 ${payload.length} 条（重复组合会覆盖）`
    await load()
  } catch (e) {
    batchError.value = explainCbkApiError(e, '批量导入失败')
  } finally {
    batchSaving.value = false
  }
}

onMounted(() => {
  void load()
})
</script>

<style scoped>
.page { max-width: 1200px; }
.header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 16px; gap: 16px; }
.headerActions { display: flex; gap: 8px; flex-shrink: 0; }
.title { font-size: 24px; font-weight: 600; color: #1f1f2e; margin-bottom: 8px; }
.desc { font-size: 14px; color: #8c8c9a; max-width: 720px; line-height: 1.5; }
.toolbar { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
.input, .textarea { padding: 8px 12px; border: 1px solid #e8e8ec; border-radius: 8px; background: #fff; font-size: 14px; min-width: 140px; }
.textarea { width: 100%; min-width: 0; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; line-height: 1.5; }
.btnPrimary, .btnSecondary, .actionBtn { cursor: pointer; }
.btnPrimary { padding: 10px 18px; border-radius: 8px; background: #5c5c9e; color: #fff; border: none; }
.btnSecondary { padding: 10px 18px; border-radius: 8px; background: #fff; color: #5c5c9e; border: 1px solid #c9c9e6; }
.btnPrimary:disabled, .actionBtn:disabled { opacity: .5; cursor: not-allowed; }
.bannerError, .bannerSuccess, .bannerWarn { padding: 10px 12px; border-radius: 8px; margin-bottom: 12px; font-size: 13px; line-height: 1.5; }
.bannerError { background: #fff1f0; color: #cf1322; }
.bannerSuccess { background: #f6ffed; color: #389e0d; }
.bannerWarn { background: #fff7e6; color: #ad6800; border: 1px solid #ffe7ba; }
.inlineLink { color: inherit; font-weight: 600; }
.tableScroll { overflow-x: auto; background: #fff; border: 1px solid #eeeef3; border-radius: 12px; }
.table { width: 100%; border-collapse: collapse; font-size: 13px; }
.table th, .table td { padding: 12px 14px; text-align: left; border-bottom: 1px solid #f0f0f4; vertical-align: top; }
.table th { color: #8c8c9a; font-weight: 500; background: #fafafc; }
.notReady { background: #fffbeb; }
.emptyCell { text-align: center; color: #8c8c9a; padding: 32px 14px; }
.mono { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; word-break: break-all; }
.actions { display: flex; flex-wrap: wrap; gap: 6px; }
.actionBtn { padding: 6px 10px; border-radius: 6px; border: 1px solid #5c5c9e; background: #fff; color: #5c5c9e; font-size: 12px; }
.actionBtn.danger { border-color: #e05c5c; color: #cf1322; }
.statusBadge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 12px; }
.statusBadge.ok { background: #ecfdf3; color: #15803d; }
.statusBadge.pending { background: #fff7e6; color: #ad6800; }
.footerHint { margin-top: 12px; font-size: 13px; color: #8c8c9a; }
.footerHint a { color: #5c5c9e; }
.modalOverlay { position: fixed; inset: 0; background: rgba(20, 20, 30, .45); display: flex; align-items: center; justify-content: center; z-index: 40; padding: 16px; }
.modal { width: min(520px, 100%); background: #fff; border-radius: 12px; overflow: hidden; }
.modalWide { width: min(680px, 100%); }
.modalHeader { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid #eeeef3; }
.modalClose { border: none; background: none; font-size: 22px; cursor: pointer; color: #8c8c9a; }
.modalBody { padding: 16px 20px 20px; display: flex; flex-direction: column; gap: 12px; }
.formHint { margin: 0; font-size: 13px; color: #8c8c9a; line-height: 1.5; }
.field { display: flex; flex-direction: column; gap: 6px; }
.label { font-size: 13px; color: #5c5c66; }
.label em { color: #e05c5c; font-style: normal; }
.checkRow { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #5c5c66; }
.formError { margin: 0; color: #cf1322; font-size: 13px; }
.modalFooter { display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; }
</style>
