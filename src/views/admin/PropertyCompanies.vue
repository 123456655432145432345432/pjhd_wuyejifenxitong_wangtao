<template>
  <div class="page">
    <div class="header">
      <div>
        <h1 class="title">物业公司</h1>
        <p class="desc">
          创建须提供联系电话、至少一个小区、初始管理员（姓名+手机号）。成功后初始密码为
          <code>admin123456</code>（仅创建响应返回一次）。日常请用「停用」；硬删除仅适用于无小区/住户/商家等关联的空壳公司。
        </p>
      </div>
      <button class="btnPrimary" @click="openCreate">新增物业公司</button>
    </div>

    <p v-if="createSuccessTip" class="successBanner">
      {{ createSuccessTip }}
      <button class="btnGhostSm" type="button" @click="createSuccessTip = ''">关闭</button>
    </p>

    <div class="toolbar">
      <input v-model="keyword" class="input" placeholder="搜索名称/电话" @keyup.enter="reload" />
      <select v-model="statusFilter" class="input" @change="reload">
        <option v-for="opt in statusOptions" :key="opt.value || 'all'" :value="opt.value">
          {{ opt.label }}
        </option>
      </select>
      <button class="btnPrimary" :disabled="loading" @click="reload">搜索</button>
    </div>

    <div class="panel">
      <div v-if="loading" class="loading">加载中...</div>
      <p v-else-if="error" class="error">{{ error }}</p>
      <table v-else-if="list.length" class="table">
        <thead>
          <tr>
            <th>名称</th>
            <th>电话</th>
            <th>地址</th>
            <th>小区数</th>
            <th>状态</th>
            <th>创建时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in list" :key="item.id">
            <td>{{ item.name || item.id }}</td>
            <td>{{ item.contactPhone || '—' }}</td>
            <td>{{ item.address || '—' }}</td>
            <td>{{ item.communityCount ?? '—' }}</td>
            <td>
              <span class="statusTag" :class="item.status">{{ statusLabel(item.status) }}</span>
            </td>
            <td>{{ item.createdAt || '—' }}</td>
            <td class="actions">
              <button
                class="btnGhostSm"
                :disabled="statusId === item.id"
                @click="toggleStatus(item)"
              >
                {{ item.status === ENTITY_STATUS.ACTIVE ? '停用' : '启用' }}
              </button>
              <button
                class="btnDangerSm"
                :disabled="removingId === item.id"
                @click="removeCompany(item)"
              >
                硬删除
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else class="empty">暂无物业公司</p>
    </div>

    <div v-if="totalPages > 1" class="pager">
      <button class="btnGhost" :disabled="page <= 1 || loading" @click="changePage(page - 1)">上一页</button>
      <span>{{ page }} / {{ totalPages }}</span>
      <button class="btnGhost" :disabled="page >= totalPages || loading" @click="changePage(page + 1)">下一页</button>
    </div>

    <Teleport to="body">
      <div v-if="formOpen" class="modalOverlay" @click.self="formOpen = false">
        <div class="modal">
          <div class="modalHeader">
            <h3 class="modalTitle">新增物业公司</h3>
            <button class="modalClose" @click="formOpen = false">&times;</button>
          </div>
          <div class="modalBody">
            <div class="field">
              <label class="label">公司名称 <em>*</em></label>
              <input v-model="form.name" class="input full" maxlength="80" placeholder="须全局唯一，勿与「演示物业公司」等同名" />
            </div>
            <div class="field">
              <label class="label">联系电话 <em>*</em></label>
              <input v-model="form.contactPhone" class="input full" maxlength="20" placeholder="公司对外联系电话，如 0427-9999999" />
            </div>
            <div class="field">
              <label class="label">地址</label>
              <input v-model="form.address" class="input full" maxlength="200" />
            </div>
            <div class="field">
              <label class="label">首个小区名称 <em>*</em></label>
              <input v-model="form.communityName" class="input full" maxlength="80" placeholder="至少创建一个小区" />
            </div>
            <div class="field row">
              <div>
                <label class="label">楼栋数</label>
                <input v-model.number="form.totalBuildings" type="number" min="0" class="input full" />
              </div>
              <div>
                <label class="label">户数</label>
                <input v-model.number="form.totalUnits" type="number" min="0" class="input full" />
              </div>
            </div>
            <div class="field">
              <label class="label">初始管理员姓名 <em>*</em></label>
              <input v-model="form.adminName" class="input full" maxlength="50" />
            </div>
            <div class="field">
              <label class="label">初始管理员手机号 <em>*</em></label>
              <input
                v-model="form.adminPhone"
                class="input full"
                maxlength="11"
                placeholder="勿用 13800138000 / 13900000020 等已有账号"
              />
            </div>
            <p v-if="formError" class="formErrorBox">{{ formError }}</p>
          </div>
          <div class="modalFooter">
            <button class="btnGhost" @click="formOpen = false">取消</button>
            <button class="btnPrimary" :disabled="submitting" @click="submit">
              {{ submitting ? '提交中...' : '创建' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { propertyCompanyApi } from '../../api/services'
import type { PropertyCompanyCreatePayload, PropertyCompanyItem } from '../../api/types'
import { ApiError, formatApiError } from '../../api/request'
import { ENTITY_STATUS, ENTITY_STATUS_LABEL, ENTITY_STATUS_OPTIONS, getEnumLabel } from '../../constants/enums'

const loading = ref(false)
const error = ref('')
const list = ref<PropertyCompanyItem[]>([])
const keyword = ref('')
const statusFilter = ref('')
const page = ref(1)
const totalPages = ref(1)
const statusOptions = ENTITY_STATUS_OPTIONS

const formOpen = ref(false)
const submitting = ref(false)
const formError = ref('')
/** 创建成功提示（含初始密码，仅展示一次） */
const createSuccessTip = ref('')
const removingId = ref('')
const statusId = ref('')
const form = reactive({
  name: '',
  contactPhone: '',
  address: '',
  communityName: '',
  totalBuildings: 0,
  totalUnits: 0,
  adminName: '',
  adminPhone: ''
})

function statusLabel(status?: string) {
  return getEnumLabel(ENTITY_STATUS_LABEL, status, '—')
}

async function load(pageNo = 1) {
  loading.value = true
  error.value = ''
  try {
    const res = await propertyCompanyApi.list(
      {
        page: pageNo,
        pageSize: 20,
        keyword: keyword.value.trim() || undefined,
        status: statusFilter.value || undefined,
        sort: '-createdAt'
      },
      true
    )
    list.value = res.list || []
    page.value = res.pagination?.page || pageNo
    totalPages.value = res.pagination?.totalPages || 1
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '物业公司列表加载失败'
  } finally {
    loading.value = false
  }
}

function reload() {
  load(1)
}

function changePage(next: number) {
  load(next)
}

function openCreate() {
  form.name = ''
  form.contactPhone = ''
  form.address = ''
  form.communityName = ''
  form.totalBuildings = 0
  form.totalUnits = 0
  form.adminName = ''
  form.adminPhone = ''
  formError.value = ''
  formOpen.value = true
}

async function submit() {
  const name = form.name.trim()
  const contactPhone = form.contactPhone.trim()
  const communityName = form.communityName.trim()
  const adminName = form.adminName.trim()
  const adminPhone = form.adminPhone.trim()
  if (!name) {
    formError.value = '请填写公司名称'
    return
  }
  if (!contactPhone) {
    formError.value = '请填写联系电话'
    return
  }
  if (!communityName) {
    formError.value = '请填写首个小区名称（后端要求至少 1 个小区）'
    return
  }
  if (!adminName || !adminPhone) {
    formError.value = '请填写初始管理员姓名和手机号'
    return
  }
  if (!/^1\d{10}$/.test(adminPhone)) {
    formError.value = '管理员手机号须为 11 位（1 开头）'
    return
  }
  const community: PropertyCompanyCreatePayload['communities'][number] = {
    name: communityName
  }
  const buildings = Number(form.totalBuildings)
  const units = Number(form.totalUnits)
  if (Number.isFinite(buildings) && buildings > 0) community.totalBuildings = buildings
  if (Number.isFinite(units) && units > 0) community.totalUnits = units

  const payload: PropertyCompanyCreatePayload = {
    name,
    contactPhone,
    communities: [community],
    adminAccount: { name: adminName, phone: adminPhone }
  }
  if (form.address.trim()) payload.address = form.address.trim()
  submitting.value = true
  formError.value = ''
  createSuccessTip.value = ''
  try {
    const created = await propertyCompanyApi.create(payload)
    const pwd = created.adminAccount?.initialPassword || 'admin123456'
    const phone = created.adminAccount?.phone || adminPhone
    formOpen.value = false
    createSuccessTip.value = `已创建「${created.name || name}」。管理员手机号 ${phone}，初始密码 ${pwd}（请妥善告知对方，此密码仅此处展示一次）。`
    await load(1)
  } catch (e) {
    // v8.1：业务冲突为 HTTP 400 + message；兜底「违反唯一性约束」未必是公司名/手机号
    const tip = formatApiError(e, '创建失败')
    if (tip.includes('管理员手机号已被使用') || tip.includes('物业公司名称已存在')) {
      formError.value = `${tip}。请换一个公司名称或未占用的管理员手机号后重试。`
    } else if (tip.includes('唯一性') || tip.includes('数据已存在')) {
      formError.value = `${tip}。请核对公司名称、管理员手机号、小区名称是否与已有数据冲突。`
    } else {
      formError.value = tip
    }
  } finally {
    submitting.value = false
  }
}

async function toggleStatus(item: PropertyCompanyItem) {
  const next =
    item.status === ENTITY_STATUS.ACTIVE ? ENTITY_STATUS.INACTIVE : ENTITY_STATUS.ACTIVE
  const label = next === ENTITY_STATUS.ACTIVE ? '启用' : '停用'
  if (!confirm(`确认${label}物业公司「${item.name || item.id}」？`)) return
  statusId.value = item.id
  error.value = ''
  try {
    await propertyCompanyApi.updateStatus(item.id, next)
    await load(page.value)
  } catch (e) {
    error.value = formatApiError(e, `${label}失败`)
  } finally {
    statusId.value = ''
  }
}

async function removeCompany(item: PropertyCompanyItem) {
  if (
    !confirm(
      `硬删除「${item.name || item.id}」？\n` +
        `仅当公司下无小区/管理员/住户/商家/订单等关联时才会成功。\n` +
        `一般请用「停用」。继续？`
    )
  ) {
    return
  }
  removingId.value = item.id
  error.value = ''
  try {
    await propertyCompanyApi.remove(item.id)
    await load(page.value)
  } catch (e) {
    error.value = formatApiError(
      e,
      '硬删除被拒绝：请改用「停用」，或确认公司下无小区/住户/商家/订单等关联。'
    )
  } finally {
    removingId.value = ''
  }
}

onMounted(() => load(1))
</script>

<style scoped>
.page { max-width: 1200px; }
.header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 24px; }
.title { font-size: 24px; font-weight: 600; color: #1f1f2e; margin-bottom: 8px; }
.desc { font-size: 14px; color: #8c8c9a; }
.desc code { font-size: 13px; background: #f5f5f7; padding: 1px 6px; border-radius: 4px; }
.successBanner {
  display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;
  margin-bottom: 16px; padding: 12px 14px; border-radius: 8px;
  background: #e6f7ef; color: #237804; font-size: 14px; line-height: 1.5;
}
.btnGhostSm { padding: 4px 10px; border-radius: 6px; border: 1px solid #b7eb8f; background: #fff; color: #389e6d; cursor: pointer; flex-shrink: 0; }
.toolbar { display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
.input { padding: 8px 12px; border: 1px solid #e8e8ec; border-radius: 8px; min-width: 180px; }
.input.full { width: 100%; min-width: 0; box-sizing: border-box; }
.btnPrimary { padding: 10px 18px; border-radius: 8px; background: #5c5c9e; color: #fff; border: none; cursor: pointer; }
.panel { background: #fff; border-radius: 12px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); overflow-x: auto; }
.table { width: 100%; border-collapse: collapse; font-size: 14px; }
.table th, .table td { padding: 12px 10px; border-bottom: 1px solid #f0f0f3; text-align: left; }
.table th { color: #8c8c9a; font-weight: 500; }
.statusTag { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; }
.statusTag.active { background: #e6f7ef; color: #389e6d; }
.statusTag.inactive { background: #f5f5f5; color: #8c8c9a; }
.loading, .empty, .error { font-size: 14px; color: #8c8c9a; padding: 12px 0; }
.error { color: #e05c5c; }
.formErrorBox {
  margin: 4px 0 0; padding: 10px 12px; border-radius: 8px;
  background: #fff1f0; border: 1px solid #ffa39e; color: #cf1322; font-size: 13px; line-height: 1.5;
}
.pager { display: flex; align-items: center; gap: 12px; margin-top: 16px; font-size: 14px; }
.btnGhost { padding: 8px 14px; border-radius: 8px; border: 1px solid #e8e8ec; background: #fff; color: #5c5c66; cursor: pointer; }
.btnGhostSm { padding: 6px 12px; border-radius: 6px; border: 1px solid #e8e8ec; background: #fff; color: #5c5c66; cursor: pointer; font-size: 13px; margin-right: 6px; }
.btnDangerSm { padding: 6px 12px; border-radius: 6px; border: 1px solid #ffa39e; background: #fff1f0; color: #cf1322; cursor: pointer; font-size: 13px; }
.actions { white-space: nowrap; }
.modalOverlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal { width: 480px; max-width: calc(100vw - 32px); background: #fff; border-radius: 12px; overflow: hidden; }
.modalHeader { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid #f0f0f3; }
.modalTitle { font-size: 16px; font-weight: 600; }
.modalClose { border: none; background: none; font-size: 22px; cursor: pointer; color: #8c8c9a; }
.modalBody { padding: 20px; max-height: 70vh; overflow-y: auto; }
.modalFooter { display: flex; justify-content: flex-end; gap: 10px; padding: 16px 20px; border-top: 1px solid #f0f0f3; }
.field { margin-bottom: 14px; }
.field.row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.label { display: block; font-size: 13px; color: #8c8c9a; margin-bottom: 6px; }
.label em { color: #e05c5c; font-style: normal; }
</style>
