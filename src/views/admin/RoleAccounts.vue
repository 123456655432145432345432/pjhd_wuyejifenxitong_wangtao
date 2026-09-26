<template>
  <div class="page" :class="{ mobilePage: isMobile }">
    <div class="header">
      <div>
        <h1 class="title">业务角色账号</h1>
        <p class="desc">
          直接创建商家、活动组长、技工、配送员账号。有历史业务数据时请用禁用或软删除，不要反复硬删。搜索支持姓名、手机号和商家名。
        </p>
      </div>
      <button type="button" class="btnPrimary" @click="openCreate">
        直建{{ currentRoleLabel }}
      </button>
    </div>

    <div class="tabs">
      <button
        v-for="opt in ROLE_TABS"
        :key="opt.value"
        type="button"
        class="tab"
        :class="{ active: activeRole === opt.value }"
        @click="switchRole(opt.value)"
      >
        {{ opt.label }}
      </button>
    </div>

    <div class="toolbar">
      <select
        v-if="isPlatformAdmin"
        v-model="filterPropertyCompanyId"
        class="input"
        @change="reload"
      >
        <option value="">全部物业公司</option>
        <option v-for="c in propertyCompanies" :key="c.id" :value="c.id">
          {{ c.name || c.id }}
        </option>
      </select>
      <input
        v-model="keyword"
        class="input"
        placeholder="搜索姓名/手机号/商家名"
        @keyup.enter="reload"
      />
      <button type="button" class="btnPrimary" :disabled="loading" @click="reload">搜索</button>
    </div>

    <div class="panel">
      <div v-if="loading" class="hint">加载中...</div>
      <p v-else-if="error" class="error">{{ error }}</p>
      <div v-else-if="list.length" class="tableScroll">
        <table class="table" :class="{ mobileCards: isMobile }">
          <thead>
            <tr>
              <th>姓名</th>
              <th>手机号</th>
              <th>小区</th>
              <th v-if="isPlatformAdmin">物业公司</th>
              <th>状态</th>
              <th>创建时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in list" :key="item.id">
              <td><MobileCellText variant="primary">{{ item.name || '—' }}</MobileCellText></td>
              <td><MobileCellText variant="nowrap">{{ item.phone || '—' }}</MobileCellText></td>
              <td class="mCellStack">
                <MobileCellText>{{ item.communityName || item.communityId || '—' }}</MobileCellText>
              </td>
              <td v-if="isPlatformAdmin" class="mCellStack">
                <MobileCellText>{{ item.propertyName || item.propertyCompanyId || '—' }}</MobileCellText>
              </td>
              <td>
                <MobileCellText variant="nowrap">
                  {{ getEnumLabel(RESIDENT_STATUS_LABEL, item.status, '—') }}
                </MobileCellText>
              </td>
              <td><MobileCellText variant="nowrap">{{ item.createdAt || '—' }}</MobileCellText></td>
              <td class="actions">
                <button type="button" class="linkBtn" @click="openDisable(item)">禁用</button>
                <button type="button" class="linkBtn" @click="openSoftDelete(item)">软删除</button>
                <button type="button" class="linkBtn danger" @click="openDelete(item)">彻底删除</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else class="hint">暂无{{ currentRoleLabel }}账号</p>
      <div v-if="totalPages > 1" class="pager">
        <button type="button" class="pageBtn" :disabled="page <= 1" @click="changePage(page - 1)">
          &lt;
        </button>
        <span>{{ page }} / {{ totalPages }}</span>
        <button
          type="button"
          class="pageBtn"
          :disabled="page >= totalPages"
          @click="changePage(page + 1)"
        >
          &gt;
        </button>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="createOpen" class="modalOverlay" @click.self="closeCreate">
        <div class="modal" :class="{ mobileSheet: isMobile }">
          <div class="modalHeader">
            <h3 class="modalTitle">直建{{ currentRoleLabel }}</h3>
            <button type="button" class="modalClose" @click="closeCreate">&times;</button>
          </div>
          <div class="modalBody">
            <div v-if="isPlatformAdmin" class="field">
              <label class="label">物业公司 <em>*</em></label>
              <select v-model="form.propertyCompanyId" class="input" @change="onFormPropertyChange">
                <option value="">请选择物业公司</option>
                <option v-for="c in propertyCompanies" :key="c.id" :value="c.id">
                  {{ c.name || c.id }}
                </option>
              </select>
            </div>
            <div class="field">
              <label class="label">姓名 <em>*</em></label>
              <input v-model="form.name" class="input" maxlength="50" placeholder="≤50 字" />
            </div>
            <div class="field">
              <label class="label">手机号 <em>*</em></label>
              <input
                v-model="form.phone"
                class="input"
                type="tel"
                maxlength="11"
                placeholder="1 开头 11 位，登录账号"
              />
            </div>
            <div class="field">
              <label class="label">登录密码 <em>*</em></label>
              <input
                v-model="form.password"
                class="input"
                type="password"
                maxlength="32"
                placeholder="6–32 位"
              />
            </div>
            <div class="field">
              <label class="label">所属小区</label>
              <select v-model="form.communityId" class="input" :disabled="communitiesLoading">
                <option value="">不指定</option>
                <option v-for="c in communities" :key="c.id" :value="c.id">
                  {{ c.name || c.id }}
                </option>
              </select>
            </div>

            <template v-if="activeRole === USER_ROLE.MERCHANT">
              <div class="field">
                <label class="label">品类</label>
                <select v-model="form.category" class="input">
                  <option value="">不指定</option>
                  <option v-for="opt in MERCHANT_CATEGORY_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                </select>
              </div>
              <div class="field">
                <label class="label">营业时间</label>
                <input v-model="form.businessHours" class="input" placeholder="09:00-22:00" />
              </div>
              <div class="field">
                <label class="label">地址</label>
                <input v-model="form.address" class="input" maxlength="200" />
              </div>
              <div class="field">
                <label class="label">店铺描述</label>
                <textarea v-model="form.description" class="textarea" rows="2" maxlength="200" />
              </div>
              <div class="fieldRow">
                <div class="field">
                  <label class="label">配送费</label>
                  <input v-model.number="form.deliveryFee" type="number" min="0" step="0.01" class="input" />
                </div>
                <div class="field">
                  <label class="label">抽佣比例</label>
                  <input
                    v-model.number="form.commissionRate"
                    type="number"
                    min="0"
                    max="1"
                    step="0.01"
                    class="input"
                    placeholder="默认 0.1"
                  />
                </div>
              </div>
              <div class="field">
                <label class="label">积分兑换比</label>
                <input
                  v-model.number="form.pointExchangeRate"
                  type="number"
                  min="1"
                  step="1"
                  class="input"
                  placeholder="默认 100（100 积分=1 元）"
                />
              </div>
            </template>

            <p class="fieldHint">{{ createHint }}</p>
            <p v-if="formError" class="error">{{ formError }}</p>
            <div class="modalFooter">
              <button type="button" class="btnSecondary" @click="closeCreate">取消</button>
              <button type="button" class="btnPrimary" :disabled="saving" @click="submitCreate">
                {{ saving ? '创建中...' : '创建' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div v-if="deleteOpen" class="modalOverlay" @click.self="closeDelete">
        <div class="modal" :class="{ mobileSheet: isMobile }">
          <div class="modalHeader">
            <h3 class="modalTitle">彻底删除账号</h3>
            <button type="button" class="modalClose" @click="closeDelete">&times;</button>
          </div>
          <div class="modalBody">
            <p class="deleteHint">
              确定彻底删除「{{ deleteTarget?.name || deleteTarget?.phone }}」？此为
              <strong>硬删除</strong>，将同步删除关联店铺，手机号释放后可重建。若已有订单/积分/提现等业务数据将返回 90120，请改用禁用或软删除。
            </p>
            <p v-if="formError" class="error">{{ formError }}</p>
            <div class="modalFooter">
              <button type="button" class="btnSecondary" @click="closeDelete">取消</button>
              <template v-if="hardDeleteBlocked">
                <button type="button" class="btnSecondary" :disabled="saving" @click="switchToDisable">改为禁用</button>
                <button type="button" class="btnPrimary" :disabled="saving" @click="submitSoftDeleteFromHard">
                  {{ saving ? '处理中...' : '改为软删除' }}
                </button>
              </template>
              <button v-else type="button" class="btnDanger" :disabled="saving" @click="submitDelete">
                {{ saving ? '删除中...' : '确认删除' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div v-if="disableOpen" class="modalOverlay" @click.self="closeDisable">
        <div class="modal" :class="{ mobileSheet: isMobile }">
          <div class="modalHeader">
            <h3 class="modalTitle">禁用账号</h3>
            <button type="button" class="modalClose" @click="closeDisable">&times;</button>
          </div>
          <div class="modalBody">
            <p class="deleteHint">
              禁用「{{ actionTarget?.name || actionTarget?.phone }}」后不可登录、不可接单，名下营业中店铺将停用（stopped），历史业务数据保留。
            </p>
            <div class="field">
              <label class="label">禁用原因 <em>*</em></label>
              <textarea v-model="disableReason" class="textarea" rows="3" maxlength="200" placeholder="如：存在业务数据，停用账号" />
            </div>
            <p v-if="formError" class="error">{{ formError }}</p>
            <div class="modalFooter">
              <button type="button" class="btnSecondary" @click="closeDisable">取消</button>
              <button type="button" class="btnPrimary" :disabled="saving" @click="submitDisable">
                {{ saving ? '处理中...' : '确认禁用' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div v-if="softDeleteOpen" class="modalOverlay" @click.self="closeSoftDelete">
        <div class="modal" :class="{ mobileSheet: isMobile }">
          <div class="modalHeader">
            <h3 class="modalTitle">软删除账号</h3>
            <button type="button" class="modalClose" @click="closeSoftDelete">&times;</button>
          </div>
          <div class="modalBody">
            <p class="deleteHint">
              账号将停用，历史业务数据保留。软删除后列表自动隐藏，手机号不会立即释放。
            </p>
            <p v-if="formError" class="error">{{ formError }}</p>
            <div class="modalFooter">
              <button type="button" class="btnSecondary" @click="closeSoftDelete">取消</button>
              <button type="button" class="btnDanger" :disabled="saving" @click="submitSoftDelete">
                {{ saving ? '处理中...' : '确认软删除' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import MobileCellText from '../../components/MobileCellText.vue'
import { propertyCompanyApi, residentApi, roleAccountApi, configApi } from '../../api/services'
import { ApiError } from '../../api/request'
import type {
  PropertyCompanyCommunity,
  PropertyCompanyItem,
  ResidentItem,
  RoleAccountRole
} from '../../api/types'
import {
  ENTITY_STATUS,
  MERCHANT_CATEGORY_OPTIONS,
  RESIDENT_STATUS_LABEL,
  USER_ROLE,
  getEnumLabel,
  getPhase2ErrorMessage
} from '../../constants/enums'
import { useAuthStore } from '../../stores/auth'
import { useIsMobile } from '../../composables/useIsMobile'

const ROLE_TABS: { value: RoleAccountRole; label: string }[] = [
  { value: USER_ROLE.MERCHANT as RoleAccountRole, label: '商家' },
  { value: USER_ROLE.ACTIVITY_LEADER as RoleAccountRole, label: '活动组长' },
  { value: USER_ROLE.TECHNICIAN as RoleAccountRole, label: '技工' },
  { value: USER_ROLE.COURIER as RoleAccountRole, label: '配送员' }
]
const HARD_DELETE_ROLES = new Set<string>(ROLE_TABS.map((item) => item.value))

const auth = useAuthStore()
const { isMobile } = useIsMobile()

const isPlatformAdmin = computed(() => auth.profile?.role === USER_ROLE.PLATFORM_ADMIN)
const activeRole = ref<RoleAccountRole>(USER_ROLE.MERCHANT as RoleAccountRole)
const currentRoleLabel = computed(
  () => ROLE_TABS.find((t) => t.value === activeRole.value)?.label || '账号'
)

const createHint = computed(() => {
  switch (activeRole.value) {
    case USER_ROLE.MERCHANT:
      return '创建后自动生成门店、平台商家与小区绑定，并发布「今日新店」公告。'
    case USER_ROLE.ACTIVITY_LEADER:
      return '创建后自动开通「{姓名}的小店」（group_leader）。'
    case USER_ROLE.TECHNICIAN:
      return '创建后自动开通「{姓名}的便民小店」（technician）。'
    case USER_ROLE.COURIER:
      return '仅创建配送员账号，不关联店铺。'
    default:
      return ''
  }
})

const keyword = ref('')
const filterPropertyCompanyId = ref('')
const propertyCompanies = ref<PropertyCompanyItem[]>([])
const communities = ref<PropertyCompanyCommunity[]>([])
const communitiesLoading = ref(false)

const list = ref<ResidentItem[]>([])
const loading = ref(false)
const error = ref('')
const page = ref(1)
const totalPages = ref(1)

const createOpen = ref(false)
const deleteOpen = ref(false)
const deleteTarget = ref<ResidentItem | null>(null)
const disableOpen = ref(false)
const softDeleteOpen = ref(false)
const actionTarget = ref<ResidentItem | null>(null)
const disableReason = ref('')
const hardDeleteBlocked = ref(false)
const saving = ref(false)
const formError = ref('')

const form = reactive({
  propertyCompanyId: '',
  name: '',
  phone: '',
  password: '',
  communityId: '',
  category: '',
  description: '',
  businessHours: '',
  address: '',
  deliveryFee: undefined as number | undefined,
  commissionRate: undefined as number | undefined,
  pointExchangeRate: undefined as number | undefined
})

const currentPropertyCompanyId = computed(() => {
  if (isPlatformAdmin.value) {
    return form.propertyCompanyId || filterPropertyCompanyId.value || auth.propertyCompanyId || ''
  }
  return auth.propertyCompanyId || auth.profile?.propertyCompanyId || ''
})

function switchRole(role: RoleAccountRole) {
  if (activeRole.value === role) return
  activeRole.value = role
  reload()
}

async function loadPropertyCompanies() {
  if (!isPlatformAdmin.value) return
  try {
    const res = await propertyCompanyApi.list({ page: 1, pageSize: 100, status: ENTITY_STATUS.ACTIVE })
    propertyCompanies.value = res.list || []
  } catch {
    propertyCompanies.value = []
  }
}

async function loadCommunities(propertyCompanyId?: string) {
  const id = propertyCompanyId || currentPropertyCompanyId.value
  communities.value = []
  if (!id) return
  communitiesLoading.value = true
  try {
    const res = await propertyCompanyApi.communities(id)
    communities.value = res.list || []
  } catch {
    communities.value = []
  }
  if (!communities.value.length) {
    try {
      const detail = await configApi.propertyCompany(id)
      communities.value = detail.communities || []
    } catch {
      // ignore
    }
  }
  communitiesLoading.value = false
}

function onFormPropertyChange() {
  form.communityId = ''
  loadCommunities(form.propertyCompanyId)
}

async function load(pageNo = 1) {
  loading.value = true
  error.value = ''
  try {
    const q = keyword.value.trim() || undefined
    const res = await residentApi.list({
      page: pageNo,
      pageSize: 20,
      role: activeRole.value,
      keyword: q,
      merchantName: q,
      propertyCompanyId: isPlatformAdmin.value
        ? filterPropertyCompanyId.value || undefined
        : undefined,
      sort: '-createdAt'
    })
    list.value = res.list || []
    page.value = res.pagination?.page ?? pageNo
    totalPages.value = res.pagination?.totalPages ?? 1
  } catch (e) {
    list.value = []
    error.value = e instanceof ApiError ? e.message : '加载失败'
  } finally {
    loading.value = false
  }
}

function reload() {
  load(1)
}

function changePage(p: number) {
  load(p)
}

function resetForm() {
  form.propertyCompanyId =
    filterPropertyCompanyId.value ||
    auth.propertyCompanyId ||
    propertyCompanies.value[0]?.id ||
    ''
  form.name = ''
  form.phone = ''
  form.password = ''
  form.communityId = ''
  form.category = ''
  form.description = ''
  form.businessHours = ''
  form.address = ''
  form.deliveryFee = undefined
  form.commissionRate = undefined
  form.pointExchangeRate = undefined
  formError.value = ''
}

async function openCreate() {
  resetForm()
  createOpen.value = true
  await loadCommunities(form.propertyCompanyId || currentPropertyCompanyId.value)
}

function closeCreate() {
  createOpen.value = false
  formError.value = ''
}

function openDelete(item: ResidentItem) {
  deleteTarget.value = item
  formError.value = ''
  hardDeleteBlocked.value = false
  deleteOpen.value = true
}

function closeDelete() {
  deleteOpen.value = false
  deleteTarget.value = null
  hardDeleteBlocked.value = false
  formError.value = ''
}

function openDisable(item: ResidentItem) {
  actionTarget.value = item
  disableReason.value = ''
  formError.value = ''
  disableOpen.value = true
}

function closeDisable() {
  disableOpen.value = false
  actionTarget.value = null
  disableReason.value = ''
  formError.value = ''
}

function openSoftDelete(item: ResidentItem) {
  actionTarget.value = item
  formError.value = ''
  softDeleteOpen.value = true
}

function closeSoftDelete() {
  softDeleteOpen.value = false
  actionTarget.value = null
  formError.value = ''
}

function resolveRoleError(e: unknown, fallback: string) {
  if (e instanceof ApiError) return getPhase2ErrorMessage(e.code, e.message || fallback)
  return fallback
}

function validateCreate(): string | null {
  if (isPlatformAdmin.value && !form.propertyCompanyId.trim()) {
    return '平台管理员须指定物业公司'
  }
  if (!form.name.trim()) return '请填写姓名'
  if (!/^1\d{10}$/.test(form.phone.trim())) return '手机号须为 1 开头的 11 位数字'
  if (form.password.length < 6 || form.password.length > 32) return '密码须为 6–32 位'
  return null
}

async function submitCreate() {
  const msg = validateCreate()
  if (msg) {
    formError.value = msg
    return
  }
  saving.value = true
  formError.value = ''
  try {
    const payload: Parameters<typeof roleAccountApi.create>[0] = {
      role: activeRole.value,
      name: form.name.trim(),
      phone: form.phone.trim(),
      password: form.password
    }
    if (isPlatformAdmin.value) {
      payload.propertyCompanyId = form.propertyCompanyId.trim()
    } else if (auth.propertyCompanyId || auth.profile?.propertyCompanyId) {
      // 物业管理员可不传；传了更稳妥
      payload.propertyCompanyId =
        auth.propertyCompanyId || auth.profile?.propertyCompanyId || undefined
    }
    if (form.communityId.trim()) payload.communityId = form.communityId.trim()

    if (activeRole.value === USER_ROLE.MERCHANT) {
      if (form.category.trim()) payload.category = form.category.trim()
      if (form.description.trim()) payload.description = form.description.trim()
      if (form.businessHours.trim()) payload.businessHours = form.businessHours.trim()
      if (form.address.trim()) payload.address = form.address.trim()
      if (form.deliveryFee !== undefined && form.deliveryFee !== null && !Number.isNaN(form.deliveryFee)) {
        payload.deliveryFee = form.deliveryFee
      }
      if (
        form.commissionRate !== undefined &&
        form.commissionRate !== null &&
        !Number.isNaN(form.commissionRate)
      ) {
        payload.commissionRate = form.commissionRate
      }
      if (
        form.pointExchangeRate !== undefined &&
        form.pointExchangeRate !== null &&
        !Number.isNaN(form.pointExchangeRate)
      ) {
        payload.pointExchangeRate = form.pointExchangeRate
      }
    }

    await roleAccountApi.create(payload)
    closeCreate()
    await load(1)
  } catch (e) {
    formError.value = e instanceof ApiError ? e.message : '创建失败'
  } finally {
    saving.value = false
  }
}

async function submitDelete() {
  if (!deleteTarget.value?.id) return
  const targetRole = deleteTarget.value.role || activeRole.value
  if (!HARD_DELETE_ROLES.has(targetRole)) {
    formError.value = '负责人和普通住户账号不能硬删除，请使用住户账号停用流程'
    return
  }
  saving.value = true
  formError.value = ''
  try {
    await roleAccountApi.remove(deleteTarget.value.id)
    closeDelete()
    await load(page.value)
  } catch (e) {
    if (e instanceof ApiError && e.code === 90120) {
      hardDeleteBlocked.value = true
      formError.value = getPhase2ErrorMessage(90120, e.message)
    } else {
      formError.value = resolveRoleError(e, '删除失败')
    }
  } finally {
    saving.value = false
  }
}

function switchToDisable() {
  const item = deleteTarget.value
  closeDelete()
  if (item) openDisable(item)
}

async function submitSoftDeleteFromHard() {
  if (!deleteTarget.value?.id) return
  saving.value = true
  formError.value = ''
  try {
    await roleAccountApi.softDelete(deleteTarget.value.id)
    closeDelete()
    await load(page.value)
  } catch (e) {
    formError.value = resolveRoleError(e, '软删除失败')
  } finally {
    saving.value = false
  }
}

async function submitDisable() {
  if (!actionTarget.value?.id) return
  const reason = disableReason.value.trim()
  if (!reason) {
    formError.value = '请填写禁用原因'
    return
  }
  saving.value = true
  formError.value = ''
  try {
    await roleAccountApi.disable(actionTarget.value.id, reason)
    closeDisable()
    await load(page.value)
  } catch (e) {
    formError.value = resolveRoleError(e, '禁用失败')
  } finally {
    saving.value = false
  }
}

async function submitSoftDelete() {
  if (!actionTarget.value?.id) return
  saving.value = true
  formError.value = ''
  try {
    await roleAccountApi.softDelete(actionTarget.value.id)
    closeSoftDelete()
    await load(page.value)
  } catch (e) {
    formError.value = resolveRoleError(e, '软删除失败')
  } finally {
    saving.value = false
  }
}

watch(filterPropertyCompanyId, () => {
  if (createOpen.value) {
    form.propertyCompanyId = filterPropertyCompanyId.value || form.propertyCompanyId
    loadCommunities(form.propertyCompanyId)
  }
})

onMounted(async () => {
  await loadPropertyCompanies()
  await loadCommunities()
  await load(1)
})
</script>

<style scoped>
.page { max-width: 1100px; min-width: 0; width: 100%; box-sizing: border-box; }
.header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; gap: 12px; }
.title { font-size: 24px; font-weight: 600; margin: 0 0 6px; }
.desc { margin: 0; color: #8c8c9a; font-size: 14px; line-height: 1.5; }
.tabs { display: flex; gap: 8px; margin-bottom: 14px; flex-wrap: wrap; }
.tab {
  padding: 8px 14px; border: 1px solid #e8e8ec; border-radius: 8px;
  background: #fff; cursor: pointer; font-size: 14px;
}
.tab.active { background: #5c5c9e; color: #fff; border-color: #5c5c9e; }
.toolbar { display: flex; gap: 10px; margin-bottom: 16px; align-items: center; flex-wrap: wrap; }
.panel { background: #fff; border-radius: 12px; padding: 16px; border: 1px solid #f0f0f3; }
.input, .textarea {
  min-width: 160px; width: 100%; padding: 8px 12px; border: 1px solid #e8e8ec;
  border-radius: 8px; box-sizing: border-box; font: inherit;
}
.textarea { resize: vertical; }
.btnPrimary, .btnSecondary, .btnDanger {
  padding: 8px 16px; border-radius: 8px; border: none; cursor: pointer; white-space: nowrap;
}
.btnPrimary { background: #5c5c9e; color: #fff; }
.btnPrimary:disabled, .btnDanger:disabled { opacity: 0.6; cursor: not-allowed; }
.btnSecondary { background: #f0f0f3; }
.btnDanger { background: #e05c5c; color: #fff; }
.tableScroll { width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
.table { width: 100%; min-width: 640px; border-collapse: collapse; font-size: 13px; }
.table th, .table td {
  padding: 10px 8px; border-bottom: 1px solid #f0f0f3; text-align: left;
  word-break: break-word; overflow-wrap: anywhere;
}
.actions { white-space: nowrap; }
.linkBtn { border: none; background: none; color: #5c5c9e; cursor: pointer; padding: 0; }
.linkBtn.danger { color: #e05c5c; }
.hint, .fieldHint { color: #8c8c9a; font-size: 13px; }
.fieldHint { margin: 0 0 12px; }
.error { color: #e05c5c; }
.pager { display: flex; align-items: center; gap: 12px; margin-top: 14px; color: #5c5c66; }
.pageBtn {
  width: 32px; height: 32px; border: 1px solid #e8e8ec; border-radius: 8px;
  background: #fff; cursor: pointer;
}
.pageBtn:disabled { opacity: 0.4; cursor: not-allowed; }
.modalOverlay {
  position: fixed; inset: 0; background: rgba(0, 0, 0, 0.45);
  display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 16px;
}
.modal {
  width: 100%; max-width: 520px; background: #fff; border-radius: 12px; max-height: 90vh;
  display: flex; flex-direction: column;
}
.modalHeader {
  display: flex; justify-content: space-between; align-items: center;
  padding: 16px 20px; border-bottom: 1px solid #f0f0f3;
}
.modalTitle { margin: 0; font-size: 16px; }
.modalClose { border: none; background: none; font-size: 22px; cursor: pointer; line-height: 1; }
.modalBody { padding: 16px 20px; overflow: auto; }
.field { margin-bottom: 12px; }
.fieldRow { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.label { display: block; font-size: 13px; margin-bottom: 6px; color: #5c5c66; }
.label em { color: #e05c5c; font-style: normal; }
.modalFooter { display: flex; justify-content: flex-end; gap: 10px; margin-top: 8px; }
.deleteHint { margin: 0 0 16px; color: #5c5c66; font-size: 14px; line-height: 1.6; }

@media (max-width: 768px) {
  .header { flex-direction: column; }
  .table { min-width: 0; }
  .fieldRow { grid-template-columns: 1fr; }
  .modal.mobileSheet { max-width: 100%; border-radius: 16px 16px 0 0; align-self: flex-end; }
}
</style>
