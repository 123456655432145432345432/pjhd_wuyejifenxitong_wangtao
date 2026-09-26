<template>
  <div class="page" :class="{ mobile: isMobile }">
    <div class="header">
      <div>
        <h1 class="title">板块商家</h1>
        <p class="desc">
          管理<strong>本板块已挂接</strong>的商家与个体负责人；可审核本板块入驻申请。
          「接入商家」= 把已有平台商家挂进本板块，不是新建平台店。
        </p>
      </div>
      <div v-if="tab === 'individuals' && canManageIndividualLeaders" class="headerActions">
        <button class="btnPrimary" @click="openIndividualCreate">新增个体负责人</button>
      </div>
      <div v-else-if="tab === 'merchants'" class="headerActions">
        <button class="btnPrimary" @click="openMerchantCreate">接入商家</button>
      </div>
    </div>

    <div class="tabs">
      <button class="tab" :class="{ active: tab === 'merchants' }" @click="switchTab('merchants')">板块商家</button>
      <button v-if="canManageIndividualLeaders" class="tab" :class="{ active: tab === 'individuals' }" @click="switchTab('individuals')">个体负责人</button>
      <button class="tab" :class="{ active: tab === 'pending' }" @click="switchTab('pending')">待审核商家</button>
    </div>

    <div v-if="tab !== 'individuals'" class="toolbar">
      <input v-model="keyword" class="input" placeholder="搜索商家名称" @keyup.enter="reload" />
      <button class="btnPrimary" :disabled="loading" @click="reload">搜索</button>
    </div>

    <div class="panel">
      <div v-if="loading" class="loading">加载中...</div>
      <p v-else-if="error" class="error">{{ error }}</p>

      <template v-else-if="tab === 'merchants'">
        <table v-if="merchants.length && !isMobile" class="table">
          <thead>
            <tr>
              <th>商家名称</th>
              <th>分类</th>
              <th>等级</th>
              <th>排名</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in merchants" :key="item.id">
              <td>{{ item.name }}</td>
              <td>{{ item.category || '—' }}</td>
              <td>{{ getEnumLabel(MERCHANT_LEVEL_LABEL, item.merchantLevel) }}</td>
              <td>{{ item.rankOrder ?? '—' }}</td>
              <td>{{ getEnumLabel(MERCHANT_STATUS_LABEL, item.status) }}</td>
              <td class="actions">
                <button class="btnLink" @click="openDistance(item)">小区距离</button>
                <button
                  class="btnDanger"
                  :disabled="item.status === MERCHANT_STATUS.KICKED || kickingId === item.id"
                  @click="openKick(item)"
                >
                  踢出
                </button>
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
              <span>等级：{{ getEnumLabel(MERCHANT_LEVEL_LABEL, item.merchantLevel) }}</span>
              <span>排名：{{ item.rankOrder ?? '—' }}</span>
            </div>
            <button class="btnLink" @click="openDistance(item)">小区距离</button>
            <button class="btnDanger" :disabled="item.status === MERCHANT_STATUS.KICKED || kickingId === item.id" @click="openKick(item)">
              踢出商家
            </button>
          </article>
        </div>
        <p v-else class="empty">暂无商家</p>
      </template>

      <template v-else-if="tab === 'individuals'">
        <table v-if="individualLeaders.length" class="table">
          <thead>
            <tr>
              <th>姓名</th>
              <th>板块</th>
              <th>抽佣比例</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in individualLeaders" :key="item.id">
              <td>{{ item.name || item.residentId || '—' }}</td>
              <td>{{ getEnumLabel(SECTOR_TYPE_LABEL, item.sector) }}</td>
              <td>{{ formatRate(item.commissionRate) }}</td>
              <td>{{ getEnumLabel(ENTITY_STATUS_LABEL, item.status) }}</td>
              <td class="actions">
                <button class="btnLink" @click="openDistribution(item)">设置抽佣</button>
                <button class="btnLink danger" :disabled="removingIndividualId === item.id" @click="removeIndividual(item)">
                  移除
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <p v-else class="empty">暂无个体负责人</p>
      </template>

      <template v-else>
        <table v-if="pendingApprovals.length" class="table">
          <thead>
            <tr>
              <th>商家名称</th>
              <th>类型</th>
              <th>状态</th>
              <th>申请时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in pendingApprovals" :key="item.id">
              <td>{{ item.merchantName || item.merchantId || '—' }}</td>
              <td>{{ getEnumLabel(SECTOR_APPROVAL_TYPE_LABEL, item.type) }}</td>
              <td>{{ getEnumLabel(MERCHANT_AUDIT_STATUS_LABEL, item.status, '待审核') }}</td>
              <td>{{ item.createdAt || '—' }}</td>
              <td class="actions">
                <button class="btnLink" @click="openAudit(item)">审核</button>
              </td>
            </tr>
          </tbody>
        </table>
        <p v-else class="empty">暂无待审核商家</p>
      </template>
    </div>

    <div v-if="tab !== 'individuals' && totalPages > 1" class="pager">
      <button class="btnGhost" :disabled="page <= 1 || loading" @click="changePage(page - 1)">上一页</button>
      <span>{{ page }} / {{ totalPages }}</span>
      <button class="btnGhost" :disabled="page >= totalPages || loading" @click="changePage(page + 1)">下一页</button>
    </div>

    <Teleport to="body">
      <div v-if="kickTarget" class="modalOverlay" @click.self="closeKick">
        <div class="modal" :class="{ mobileSheet: isMobile }">
          <div class="modalHeader">
            <h3 class="modalTitle">踢出商家</h3>
            <button class="modalClose" @click="closeKick">&times;</button>
          </div>
          <div class="modalBody">
            <p class="hint">确认踢出「{{ kickTarget.name }}」？踢出后商品将自动下架，对方可重新申请入驻。</p>
            <div class="field">
              <label class="label">踢出原因</label>
              <textarea v-model="kickReason" class="textarea" rows="3" placeholder="请填写踢出原因" />
            </div>
            <p v-if="kickError" class="error">{{ kickError }}</p>
          </div>
          <div class="modalFooter">
            <button class="btnGhost" @click="closeKick">取消</button>
            <button class="btnDanger" :disabled="kicking" @click="confirmKick">
              {{ kicking ? '处理中...' : '确认踢出' }}
            </button>
          </div>
        </div>
      </div>

      <div v-if="individualModalOpen" class="modalOverlay" @click.self="closeIndividualModal">
        <div class="modal" :class="{ mobileSheet: isMobile }">
          <div class="modalHeader">
            <h3 class="modalTitle">新增个体负责人</h3>
            <button class="modalClose" @click="closeIndividualModal">&times;</button>
          </div>
          <div class="modalBody">
            <div class="field">
              <label class="label">选择业主</label>
              <ResidentSearchSelect v-model="individualForm.residentId" :status="RESIDENT_STATUS.ACTIVE" auto-open />
            </div>
            <div class="field">
              <label class="label">所属板块</label>
              <input
                class="input"
                :value="getEnumLabel(SECTOR_TYPE_LABEL, individualForm.sector)"
                disabled
              />
            </div>
            <div class="field">
              <label class="label">姓名</label>
              <input v-model="individualForm.name" class="input" maxlength="50" />
            </div>
            <div class="field">
              <label class="label">平台抽佣比例（0~1，如 0.10=平台盘10%）</label>
              <input v-model.number="individualForm.commissionRate" type="number" min="0" max="1" step="0.01" class="input" />
            </div>
            <p v-if="individualFormError" class="error">{{ individualFormError }}</p>
          </div>
          <div class="modalFooter">
            <button class="btnGhost" @click="closeIndividualModal">取消</button>
            <button class="btnPrimary" :disabled="individualSaving" @click="submitIndividual">
              {{ individualSaving ? '提交中...' : '保存' }}
            </button>
          </div>
        </div>
      </div>

      <div v-if="distributionTarget" class="modalOverlay" @click.self="closeDistribution">
        <div class="modal" :class="{ mobileSheet: isMobile }">
          <div class="modalHeader">
            <h3 class="modalTitle">设置抽佣 - {{ distributionTarget.name || distributionTarget.id }}</h3>
            <button class="modalClose" @click="closeDistribution">&times;</button>
          </div>
          <div class="modalBody">
            <div class="field">
              <label class="label">平台抽佣比例（0~1，如 0.10=平台盘10%）</label>
              <input v-model.number="distributionRate" type="number" min="0" max="1" step="0.01" class="input" />
            </div>
            <p v-if="distributionError" class="error">{{ distributionError }}</p>
          </div>
          <div class="modalFooter">
            <button class="btnGhost" @click="closeDistribution">取消</button>
            <button class="btnPrimary" :disabled="distributionSaving" @click="submitDistribution">
              {{ distributionSaving ? '保存中...' : '保存' }}
            </button>
          </div>
        </div>
      </div>

      <div v-if="auditTarget" class="modalOverlay" @click.self="closeAudit">
        <div class="modal" :class="{ mobileSheet: isMobile }">
          <div class="modalHeader">
            <h3 class="modalTitle">审核商家「{{ auditTarget.merchantName || auditTarget.merchantId }}」</h3>
            <button class="modalClose" @click="closeAudit">&times;</button>
          </div>
          <div class="modalBody">
            <div class="field">
              <label class="label">审核结果</label>
              <select v-model="auditForm.approved" class="input">
                <option :value="true">通过</option>
                <option :value="false">驳回</option>
              </select>
            </div>
            <div v-if="!auditForm.approved" class="field">
              <label class="label">驳回说明</label>
              <textarea v-model="auditForm.remark" class="textarea" rows="3" placeholder="请填写驳回原因" />
            </div>
            <p v-if="auditError" class="error">{{ auditError }}</p>
          </div>
          <div class="modalFooter">
            <button class="btnGhost" @click="closeAudit">取消</button>
            <button class="btnPrimary" :disabled="auditing" @click="submitAudit">
              {{ auditing ? '提交中...' : '提交审核' }}
            </button>
          </div>
        </div>
      </div>

      <div v-if="merchantModalOpen" class="modalOverlay" @click.self="closeMerchantModal">
        <div class="modal" :class="{ mobileSheet: isMobile }">
          <div class="modalHeader">
            <h3 class="modalTitle">接入商家</h3>
            <button class="modalClose" @click="closeMerchantModal">&times;</button>
          </div>
          <div class="modalBody">
            <p class="formHint">
              <strong>平台商家</strong>：全平台统一店档（「商家管理」里已通过的店）。
              <strong>板块商家</strong>：把该店挂到本板块，用于本板块抽佣、排名、特惠——不是再开一家新店。
            </p>
            <div class="field">
              <label class="label">平台商家编号</label>
              <input
                v-model="merchantForm.platformMerchantId"
                class="input"
                placeholder="在商家管理复制商家编号"
              />
            </div>
            <div class="field">
              <label class="label">商家名称</label>
              <input v-model="merchantForm.name" class="input" maxlength="100" />
            </div>
            <div class="field">
              <label class="label">分类</label>
              <input v-model="merchantForm.category" class="input" maxlength="50" />
            </div>
            <div class="field">
              <label class="label">联系电话</label>
              <input v-model="merchantForm.contactPhone" class="input" maxlength="20" />
            </div>
            <div class="field">
              <label class="label">地址</label>
              <input v-model="merchantForm.address" class="input" maxlength="200" />
            </div>
            <p v-if="merchantFormError" class="error">{{ merchantFormError }}</p>
          </div>
          <div class="modalFooter">
            <button class="btnGhost" @click="closeMerchantModal">取消</button>
            <button class="btnPrimary" :disabled="merchantSaving" @click="submitMerchant">
              {{ merchantSaving ? '提交中...' : '提交' }}
            </button>
          </div>
        </div>
      </div>

    </Teleport>
    <MerchantDistanceModal
      :open="distanceOpen"
      :merchant-id="distanceMerchantId"
      :merchant-name="distanceMerchantName"
      @close="closeDistance"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import ResidentSearchSelect from '../../components/ResidentSearchSelect.vue'
import MerchantDistanceModal from '../../components/MerchantDistanceModal.vue'
import { merchantApi, sectorLeaderPortalApiExt } from '../../api/services'
import type { IndividualLeaderItem, MerchantItem, SectorLeaderApprovalItem } from '../../api/types'
import { ApiError, formatApiError } from '../../api/request'
import {
  ENTITY_STATUS_LABEL,
  getEnumLabel,
  MERCHANT_AUDIT_STATUS,
  MERCHANT_AUDIT_STATUS_LABEL,
  MERCHANT_LEVEL_LABEL,
  MERCHANT_STATUS,
  MERCHANT_STATUS_LABEL,
  RESIDENT_STATUS,
  SECTOR_APPROVAL_TYPE_LABEL,
  SECTOR_TYPE,
  SECTOR_TYPE_LABEL
} from '../../constants/enums'
import { useIsMobile } from '../../composables/useIsMobile'
import { useSectorLeaderPortalStore } from '../../stores/sectorLeaderPortal'

type TabKey = 'merchants' | 'individuals' | 'pending'

const portal = useSectorLeaderPortalStore()
const { isMobile } = useIsMobile()
const tab = ref<TabKey>('merchants')
const merchants = ref<MerchantItem[]>([])
const pendingApprovals = ref<SectorLeaderApprovalItem[]>([])
const individualLeaders = ref<IndividualLeaderItem[]>([])
const loading = ref(false)
const error = ref('')
const keyword = ref('')
const page = ref(1)
const totalPages = ref(1)

const kickTarget = ref<MerchantItem | null>(null)
const distanceOpen = ref(false)
const distanceMerchantId = ref('')
const distanceMerchantName = ref('')
const kickReason = ref('')
const kickError = ref('')
const kicking = ref(false)
const kickingId = ref('')

const individualModalOpen = ref(false)
const individualSaving = ref(false)
const individualFormError = ref('')
const removingIndividualId = ref('')
const individualForm = reactive({
  residentId: '',
  sector: SECTOR_TYPE.CLEANING,
  name: '',
  commissionRate: undefined as number | undefined
})

const distributionTarget = ref<IndividualLeaderItem | null>(null)
const distributionRate = ref<number | undefined>(undefined)
const distributionSaving = ref(false)
const distributionError = ref('')

const merchantModalOpen = ref(false)
const merchantSaving = ref(false)
const merchantFormError = ref('')
const merchantForm = reactive({
  platformMerchantId: '',
  name: '',
  category: '',
  contactPhone: '',
  address: ''
})

const auditTarget = ref<SectorLeaderApprovalItem | null>(null)
const auditing = ref(false)
const auditError = ref('')
const auditForm = reactive({
  approved: true,
  remark: ''
})

const sectorLeaderId = computed(() => portal.detail?.id || '')
const canManageIndividualLeaders = computed(
  () => portal.detail?.canManageIndividualLeaders === true
)

function formatRate(value?: number) {
  if (value == null) return '—'
  return `${(Number(value) * 100).toFixed(0)}%`
}

async function ensurePortal() {
  if (!portal.detail) await portal.loadMy()
}

async function loadMerchants(pageNo = 1) {
  const res = await merchantApi.list({
    page: pageNo,
    pageSize: 20,
    keyword: keyword.value.trim() || undefined,
    sort: '+rankOrder'
  })
  merchants.value = res.list || []
  page.value = res.pagination?.page || pageNo
  totalPages.value = res.pagination?.totalPages || 1
}

async function loadPending() {
  if (!sectorLeaderId.value) {
    pendingApprovals.value = []
    return
  }
  const res = await sectorLeaderPortalApiExt.listApprovals(sectorLeaderId.value)
  pendingApprovals.value = (res.list || []).filter(
    (item) => !item.status || item.status === MERCHANT_AUDIT_STATUS.PENDING || item.status === 'pending'
  )
  page.value = 1
  totalPages.value = 1
}

async function loadIndividuals() {
  if (!sectorLeaderId.value || !canManageIndividualLeaders.value) {
    individualLeaders.value = []
    return
  }
  const res = await sectorLeaderPortalApiExt.listIndividualLeaders(sectorLeaderId.value, {
    page: 1,
    pageSize: 100
  })
  individualLeaders.value = res.list || []
}

async function load(pageNo = 1) {
  loading.value = true
  error.value = ''
  try {
    await ensurePortal()
    if (tab.value === 'merchants') await loadMerchants(pageNo)
    else if (tab.value === 'pending') await loadPending()
    else await loadIndividuals()
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '加载失败'
  } finally {
    loading.value = false
  }
}

function switchTab(next: TabKey) {
  if (next === 'individuals' && !canManageIndividualLeaders.value) return
  tab.value = next
  keyword.value = ''
  reload()
}

function reload() {
  load(1)
}

function changePage(next: number) {
  load(next)
}

function openDistance(item: MerchantItem) {
  distanceMerchantId.value = item.id
  distanceMerchantName.value = item.name
  distanceOpen.value = true
}

function closeDistance() {
  distanceOpen.value = false
  distanceMerchantId.value = ''
  distanceMerchantName.value = ''
}

function openKick(item: MerchantItem) {
  kickTarget.value = item
  kickReason.value = ''
  kickError.value = ''
}

function closeKick() {
  kickTarget.value = null
}

async function confirmKick() {
  if (!kickTarget.value) return
  const reason = kickReason.value.trim()
  if (!reason) {
    kickError.value = '请填写踢出原因'
    return
  }
  kicking.value = true
  kickError.value = ''
  kickingId.value = kickTarget.value.id
  try {
    await merchantApi.kick(kickTarget.value.id, { reason, notifyMerchant: true })
    closeKick()
    await load(page.value)
  } catch (e) {
    kickError.value = e instanceof ApiError ? e.message : '踢出失败'
  } finally {
    kicking.value = false
    kickingId.value = ''
  }
}

function openIndividualCreate() {
  if (!canManageIndividualLeaders.value) return
  individualForm.residentId = ''
  individualForm.sector = portal.detail?.sector || SECTOR_TYPE.CLEANING
  individualForm.name = ''
  individualForm.commissionRate = undefined
  individualFormError.value = ''
  individualModalOpen.value = true
}

function closeIndividualModal() {
  individualModalOpen.value = false
  individualSaving.value = false
}

async function submitIndividual() {
  if (!canManageIndividualLeaders.value) {
    individualFormError.value = '当前账号无个体负责人管理权限'
    return
  }
  if (!individualForm.residentId) {
    individualFormError.value = '请选择业主'
    return
  }
  if (!sectorLeaderId.value) {
    individualFormError.value = '板块信息未加载'
    return
  }
  const sector = portal.detail?.sector || individualForm.sector
  if (!sector) {
    individualFormError.value = '板块信息未加载'
    return
  }
  individualSaving.value = true
  individualFormError.value = ''
  try {
    await sectorLeaderPortalApiExt.createIndividualLeader(sectorLeaderId.value, {
      residentId: individualForm.residentId,
      sector,
      name: individualForm.name.trim() || undefined,
      commissionRate: individualForm.commissionRate
    })
    closeIndividualModal()
    await loadIndividuals()
  } catch (e) {
    individualFormError.value = formatApiError(e, '创建失败')
  } finally {
    individualSaving.value = false
  }
}

async function removeIndividual(item: IndividualLeaderItem) {
  if (!sectorLeaderId.value || !canManageIndividualLeaders.value) return
  if (!confirm(`确认移除个体负责人「${item.name || item.id}」？`)) return
  removingIndividualId.value = item.id
  try {
    await sectorLeaderPortalApiExt.removeIndividualLeader(sectorLeaderId.value, item.id)
    await loadIndividuals()
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '移除失败'
  } finally {
    removingIndividualId.value = ''
  }
}

function openDistribution(item: IndividualLeaderItem) {
  if (!canManageIndividualLeaders.value) return
  distributionTarget.value = item
  distributionRate.value = item.commissionRate
  distributionError.value = ''
}

function closeDistribution() {
  distributionTarget.value = null
  distributionSaving.value = false
}

async function submitDistribution() {
  if (!distributionTarget.value || !sectorLeaderId.value || !canManageIndividualLeaders.value) return
  if (distributionRate.value == null) {
    distributionError.value = '请填写平台抽佣比例'
    return
  }
  distributionSaving.value = true
  distributionError.value = ''
  try {
    await sectorLeaderPortalApiExt.updateIndividualDistribution(
      sectorLeaderId.value,
      distributionTarget.value.id,
      distributionRate.value
    )
    closeDistribution()
    await loadIndividuals()
  } catch (e) {
    distributionError.value = e instanceof ApiError ? e.message : '保存失败'
  } finally {
    distributionSaving.value = false
  }
}

function openMerchantCreate() {
  merchantForm.platformMerchantId = ''
  merchantForm.name = ''
  merchantForm.category = ''
  merchantForm.contactPhone = ''
  merchantForm.address = ''
  merchantFormError.value = ''
  merchantModalOpen.value = true
}

function closeMerchantModal() {
  merchantModalOpen.value = false
  merchantSaving.value = false
}

function openAudit(item: SectorLeaderApprovalItem) {
  auditTarget.value = item
  auditForm.approved = true
  auditForm.remark = ''
  auditError.value = ''
}

function closeAudit() {
  auditTarget.value = null
  auditing.value = false
}

async function submitAudit() {
  if (!auditTarget.value || !sectorLeaderId.value) return
  if (!auditForm.approved && !auditForm.remark.trim()) {
    auditError.value = '驳回时请填写说明'
    return
  }
  auditing.value = true
  auditError.value = ''
  try {
    await sectorLeaderPortalApiExt.auditApproval(sectorLeaderId.value, auditTarget.value.id, {
      approved: auditForm.approved,
      remark: auditForm.remark.trim() || undefined
    })
    closeAudit()
    await loadPending()
  } catch (e) {
    auditError.value = formatApiError(e, '审核失败')
  } finally {
    auditing.value = false
  }
}

async function submitMerchant() {
  if (!merchantForm.platformMerchantId.trim() || !merchantForm.name.trim() || !merchantForm.category.trim() || !merchantForm.contactPhone.trim()) {
    merchantFormError.value = '请填写完整商家信息'
    return
  }
  if (!sectorLeaderId.value) {
    merchantFormError.value = '板块信息未加载'
    return
  }
  merchantSaving.value = true
  merchantFormError.value = ''
  try {
    await sectorLeaderPortalApiExt.createMerchant(sectorLeaderId.value, {
      platformMerchantId: merchantForm.platformMerchantId.trim(),
      name: merchantForm.name.trim(),
      category: merchantForm.category.trim(),
      contactPhone: merchantForm.contactPhone.trim(),
      address: merchantForm.address.trim() || undefined
    })
    closeMerchantModal()
    tab.value = 'pending'
    await loadPending()
  } catch (e) {
    merchantFormError.value = e instanceof ApiError ? e.message : '提交失败'
  } finally {
    merchantSaving.value = false
  }
}

onMounted(() => load(1))
</script>

<style scoped>
.page { max-width: 1200px; }
.header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 24px; flex-wrap: wrap; }
.headerActions { display: flex; gap: 8px; }
.title { font-size: 24px; font-weight: 600; color: #1f1f2e; margin-bottom: 8px; }
.desc { font-size: 14px; color: #8c8c9a; }
.formHint { font-size: 13px; color: #5c5c66; line-height: 1.5; margin: 0 0 12px; padding: 10px 12px; background: #f6f7fb; border-radius: 8px; }
.formHint code { font-size: 12px; background: #eee; padding: 1px 4px; border-radius: 4px; }
.tabs { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
.tab { padding: 8px 16px; border-radius: 8px; border: 1px solid #e8e8ec; background: #fff; color: #5c5c66; cursor: pointer; font-size: 14px; }
.tab.active { background: #5c5c9e; color: #fff; border-color: #5c5c9e; }
.toolbar { display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
.input { padding: 8px 12px; border: 1px solid #e8e8ec; border-radius: 8px; min-width: 220px; }
.btnPrimary { padding: 10px 18px; border-radius: 8px; background: #5c5c9e; color: #fff; border: none; cursor: pointer; }
.btnPrimary:hover { background: #52529a; }
.panel { background: #fff; border-radius: 12px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.table { width: 100%; border-collapse: collapse; font-size: 14px; }
.table th, .table td { padding: 12px 10px; border-bottom: 1px solid #f0f0f3; text-align: left; }
.table th { color: #8c8c9a; font-weight: 500; }
.loading, .empty, .error { font-size: 14px; color: #8c8c9a; padding: 12px 0; }
.error { color: #e05c5c; }
.actions { display: flex; gap: 8px; flex-wrap: wrap; }
.btnLink { border: none; background: none; color: #5c5c9e; cursor: pointer; font-size: 13px; padding: 0; }
.btnLink.danger { color: #cf1322; }
.btnDanger { padding: 6px 12px; border-radius: 6px; background: #fff1f0; color: #cf1322; border: 1px solid #ffa39e; cursor: pointer; }
.btnDanger:disabled { opacity: 0.5; cursor: not-allowed; }
.pager { display: flex; align-items: center; gap: 12px; margin-top: 16px; font-size: 14px; }
.btnGhost { padding: 8px 14px; border-radius: 8px; border: 1px solid #e8e8ec; background: #fff; color: #5c5c66; font-size: 14px; cursor: pointer; }
.btnGhost:hover { border-color: #5c5c9e; color: #5c5c9e; }
.modalOverlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal { width: 420px; max-width: calc(100vw - 32px); background: #fff; border-radius: 12px; overflow: hidden; }
.modalHeader { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid #f0f0f3; }
.modalTitle { font-size: 16px; font-weight: 600; }
.modalClose { border: none; background: none; font-size: 22px; cursor: pointer; color: #8c8c9a; }
.modalBody { padding: 20px; }
.modalFooter { display: flex; justify-content: flex-end; gap: 10px; padding: 16px 20px; border-top: 1px solid #f0f0f3; }
.hint { font-size: 14px; color: #5c5c66; margin-bottom: 16px; }
.hintInline { font-size: 13px; color: #8c8c9a; }
.field { margin-bottom: 8px; }
.label { display: block; font-size: 13px; color: #8c8c9a; margin-bottom: 6px; }
.textarea { width: 100%; padding: 8px 12px; border: 1px solid #e8e8ec; border-radius: 8px; resize: vertical; box-sizing: border-box; }
@media (max-width: 768px) {
  .page { padding: 0 var(--mobile-page-gap); }
  .header { margin-bottom: 18px; }
  .title { font-size: 22px; }
  .toolbar { gap: 8px; }
  .input { flex: 1; min-width: 0; min-height: var(--mobile-touch-target); box-sizing: border-box; }
  .btnPrimary { min-height: var(--mobile-touch-target); }
  .panel { padding: 0; background: transparent; box-shadow: none; }
  .mobileCards { display: grid; gap: 10px; }
  .merchantCard { background: #fff; padding: 16px; border-radius: var(--mobile-card-radius); box-shadow: 0 1px 3px rgba(0,0,0,.04); }
  .cardHeading { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .cardMeta { display: grid; gap: 7px; margin: 12px 0; font-size: 13px; color: #5c5c66; }
  .statusTag { font-size: 12px; color: #5c5c9e; background: #f1f0ff; padding: 3px 8px; border-radius: 999px; white-space: nowrap; }
  .btnDanger { min-height: 38px; }
  .pager { justify-content: center; }
  .modalOverlay { align-items: flex-end; padding: 0; }
  .modal { width: 100%; max-width: 100%; max-height: 88vh; }
  .modalHeader, .modalBody, .modalFooter { padding-left: 16px; padding-right: 16px; }
  .modalFooter { padding-bottom: max(16px, env(safe-area-inset-bottom)); }
}
</style>
