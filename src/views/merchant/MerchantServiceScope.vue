<template>
  <div class="page" :class="{ mobilePage: isMobile }">
    <div class="header">
      <div>
        <h1 class="title">配送范围与消息服务</h1>
        <p class="desc">配置配送方式与距离、可选服务小区，以及用户消息服务</p>
      </div>
    </div>

    <div class="grid">
      <div class="card">
        <div class="cardHead">配送方式与距离</div>
        <p class="hint">可组合勾选小区内 / 小区外；距离维度用于匹配配送价格区间（§76）</p>
        <div v-if="modeLoading" class="hint">加载中...</div>
        <template v-else>
          <div class="field">
            <label class="label">配送方式（可组合）</label>
            <div class="checkboxGroup compact">
              <label class="checkbox">
                <input v-model="modeForm.inCommunity" type="checkbox" />
                <span>小区内配送（小区内部人员）</span>
              </label>
              <label class="checkbox">
                <input v-model="modeForm.outCommunity" type="checkbox" />
                <span>小区外配送（外部快递人员）</span>
              </label>
            </div>
          </div>
          <div class="field">
            <label class="label">配送距离</label>
            <select v-model="modeForm.distanceType" class="input">
              <option v-for="opt in distanceOptions" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
          </div>
          <p v-if="modeError" class="error">{{ modeError }}</p>
          <p v-if="modeSuccess" class="success">{{ modeSuccess }}</p>
          <button type="button" class="btnPrimary" :disabled="modeSaving" @click="saveDeliveryMode">
            {{ modeSaving ? '保存中...' : '保存配送方式' }}
          </button>
        </template>
      </div>

      <div class="card scopeCard">
        <div class="cardHead">服务小区</div>
        <div v-if="scopeLoading" class="hint">加载中...</div>
        <template v-else>
          <label class="checkbox">
            <input v-model="serveAll" type="checkbox" @change="onServeAllChange" />
            <span>配送至全部小区（本物业挂接下）</span>
          </label>
          <p v-if="!serveAll" class="hint">可多选多个小区；已选 {{ selectedIds.length }} 个</p>
          <div v-if="!serveAll && communities.length" class="scopeActions">
            <button type="button" class="btnLink" @click="selectAllCommunities">全选</button>
            <button type="button" class="btnLink" @click="clearCommunitySelection">清空</button>
          </div>
          <div class="checkboxGroup">
            <label v-for="c in communities" :key="communityKey(c)" class="checkbox">
              <input
                v-model="selectedIds"
                type="checkbox"
                :value="communityKey(c)"
                :disabled="serveAll"
              />
              <span>{{ c.communityName || c.communityId }}</span>
            </label>
          </div>
          <p v-if="!serveAll && !communities.length" class="hint">暂无可选小区</p>
          <p v-if="scopeError" class="error">{{ scopeError }}</p>
          <p v-if="scopeSuccess" class="success">{{ scopeSuccess }}</p>
          <button type="button" class="btnPrimary" :disabled="scopeSaving" @click="saveScope">
            {{ scopeSaving ? '保存中...' : '保存服务小区' }}
          </button>
        </template>
      </div>

      <div class="card">
        <div class="cardHead">用户消息服务</div>
        <div class="field">
          <label class="checkbox">
            <input v-model="msgForm.enabled" type="checkbox" />
            <span>开通用户消息服务（接收服务需求）</span>
          </label>
        </div>
        <div class="field">
          <label class="label">服务半径</label>
          <select v-model="msgForm.serviceRadius" class="input" :disabled="!msgForm.enabled">
            <option v-for="opt in SERVICE_RADIUS_OPTIONS" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </div>
        <div class="field">
          <label class="label">服务分类</label>
          <div class="checkboxGroup">
            <label v-for="cat in categories" :key="cat.id" class="checkbox">
              <input
                v-model="msgForm.categoryIds"
                type="checkbox"
                :value="cat.id"
                :disabled="!msgForm.enabled"
              />
              <span>{{ cat.name }}</span>
            </label>
          </div>
          <p v-if="!categories.length" class="hint">暂无分类字典</p>
        </div>
        <p v-if="msgError" class="error">{{ msgError }}</p>
        <p v-if="msgSuccess" class="success">{{ msgSuccess }}</p>
        <button type="button" class="btnPrimary" :disabled="msgSaving" @click="saveMessageService">
          {{ msgSaving ? '保存中...' : '保存消息服务' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { deliveryRulesApi, merchantPortalApi, serviceCategoryApi } from '../../api/services'
import { ApiError } from '../../api/request'
import type { MerchantServiceScopeCommunity, ServiceCategoryDictItem } from '../../api/types'
import {
  DELIVERY_SCOPE,
  MERCHANT_DISTANCE_TYPE,
  MERCHANT_DISTANCE_TYPE_OPTIONS,
  SERVICE_RADIUS,
  SERVICE_RADIUS_OPTIONS,
  getPhase2ErrorMessage
} from '../../constants/enums'
import { useIsMobile } from '../../composables/useIsMobile'

const { isMobile } = useIsMobile()

const modeLoading = ref(false)
const modeSaving = ref(false)
const modeError = ref('')
const modeSuccess = ref('')
const merchantId = ref('')
const modeForm = reactive({
  inCommunity: true,
  outCommunity: true,
  distanceType: MERCHANT_DISTANCE_TYPE.ANY as string
})
const distanceOptions = ref([...MERCHANT_DISTANCE_TYPE_OPTIONS])

const scopeLoading = ref(false)
const scopeSaving = ref(false)
const scopeError = ref('')
const scopeSuccess = ref('')
const serveAll = ref(false)
const selectedIds = ref<string[]>([])
const communities = ref<MerchantServiceScopeCommunity[]>([])

const categories = ref<ServiceCategoryDictItem[]>([])
const msgForm = ref({
  enabled: false,
  serviceRadius: SERVICE_RADIUS.KM3,
  categoryIds: [] as string[]
})
const msgSaving = ref(false)
const msgError = ref('')
const msgSuccess = ref('')

function resolveError(e: unknown) {
  if (e instanceof ApiError) return getPhase2ErrorMessage(e.code, e.message)
  if (e instanceof Error) return e.message
  return '操作失败'
}

function communityKey(c: MerchantServiceScopeCommunity) {
  return String(c.communityId ?? '')
}

function scopeFromCheckboxes() {
  if (modeForm.inCommunity && modeForm.outCommunity) return DELIVERY_SCOPE.BOTH
  if (modeForm.inCommunity) return DELIVERY_SCOPE.IN_COMMUNITY
  if (modeForm.outCommunity) return DELIVERY_SCOPE.OUT_COMMUNITY
  return ''
}

function applyScopeToCheckboxes(scope?: string) {
  const value = scope || DELIVERY_SCOPE.BOTH
  modeForm.inCommunity =
    value === DELIVERY_SCOPE.BOTH ||
    value === DELIVERY_SCOPE.IN_COMMUNITY ||
    value === DELIVERY_SCOPE.COMMUNITY_INSIDE
  modeForm.outCommunity =
    value === DELIVERY_SCOPE.BOTH ||
    value === DELIVERY_SCOPE.OUT_COMMUNITY ||
    value === DELIVERY_SCOPE.COMMUNITY_OUTSIDE
}

function onServeAllChange() {
  if (serveAll.value) selectedIds.value = []
}

function selectAllCommunities() {
  selectedIds.value = communities.value.map((c) => communityKey(c)).filter(Boolean)
}

function clearCommunitySelection() {
  selectedIds.value = []
}

async function loadScopeOptions() {
  try {
    const data = await deliveryRulesApi.scopeOptions()
    if (data.distanceTypes?.length) {
      distanceOptions.value = data.distanceTypes.map((item) => ({
        value: item.code,
        label: item.description
      }))
    }
  } catch {
    // 回退本地枚举
  }
}

async function loadDeliveryMode() {
  modeLoading.value = true
  modeError.value = ''
  try {
    const shop = await merchantPortalApi.my()
    merchantId.value = shop.id
    applyScopeToCheckboxes(shop.deliveryScope)
    modeForm.distanceType = shop.distanceType || MERCHANT_DISTANCE_TYPE.ANY
  } catch (e) {
    modeError.value = resolveError(e)
  } finally {
    modeLoading.value = false
  }
}

async function saveDeliveryMode() {
  if (!merchantId.value) {
    modeError.value = '店铺信息未加载'
    return
  }
  const deliveryScope = scopeFromCheckboxes()
  if (!deliveryScope) {
    modeError.value = '请至少勾选一种配送方式（小区内 / 小区外）'
    return
  }
  modeSaving.value = true
  modeError.value = ''
  modeSuccess.value = ''
  try {
    const shop = await merchantPortalApi.update(merchantId.value, {
      deliveryScope,
      distanceType: modeForm.distanceType || MERCHANT_DISTANCE_TYPE.ANY
    })
    merchantId.value = shop.id
    applyScopeToCheckboxes(shop.deliveryScope ?? deliveryScope)
    modeForm.distanceType = shop.distanceType || modeForm.distanceType
    modeSuccess.value = '配送方式与距离已保存'
  } catch (e) {
    modeError.value = resolveError(e)
  } finally {
    modeSaving.value = false
  }
}

async function loadScope() {
  scopeLoading.value = true
  scopeError.value = ''
  try {
    const data = await merchantPortalApi.getServiceScope()
    serveAll.value = !!data.serveAllCommunities
    communities.value = data.communities || []
    selectedIds.value = (data.communities || [])
      .filter((c) => c.selected)
      .map((c) => communityKey(c))
      .filter(Boolean)
  } catch (e) {
    scopeError.value = resolveError(e)
  } finally {
    scopeLoading.value = false
  }
}

async function loadCategories() {
  try {
    const data = await serviceCategoryApi.list()
    categories.value = Array.isArray(data) ? data : data.list || []
  } catch (e) {
    console.error(e)
  }
}

async function saveScope() {
  if (!serveAll.value && !selectedIds.value.length) {
    scopeError.value = '请至少选择一个配送小区，或勾选「配送至全部小区」'
    return
  }
  scopeSaving.value = true
  scopeError.value = ''
  scopeSuccess.value = ''
  try {
    await merchantPortalApi.updateServiceScope({
      serveAllCommunities: serveAll.value,
      communityIds: serveAll.value ? undefined : [...selectedIds.value]
    })
    scopeSuccess.value = '服务小区已保存'
    await loadScope()
  } catch (e) {
    scopeError.value = resolveError(e)
  } finally {
    scopeSaving.value = false
  }
}

async function saveMessageService() {
  msgSaving.value = true
  msgError.value = ''
  msgSuccess.value = ''
  try {
    await merchantPortalApi.updateMessageService({
      enabled: msgForm.value.enabled,
      serviceRadius: msgForm.value.serviceRadius,
      categoryIds: msgForm.value.categoryIds.length ? [...msgForm.value.categoryIds] : undefined
    })
    msgSuccess.value = '消息服务配置已保存'
  } catch (e) {
    msgError.value = resolveError(e)
  } finally {
    msgSaving.value = false
  }
}

onMounted(async () => {
  await Promise.all([loadScopeOptions(), loadDeliveryMode(), loadScope(), loadCategories()])
})
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.header .title {
  margin: 0;
  font-size: 22px;
}
.desc {
  margin: 6px 0 0;
  color: #8c8c9a;
  font-size: 13px;
}
.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
@media (max-width: 900px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
.card {
  background: #fff;
  border: 1px solid #ececf2;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.cardHead {
  font-weight: 600;
}
.scopeActions {
  display: flex;
  gap: 12px;
}
.scopeCard .btnLink {
  border: none;
  background: transparent;
  color: #5c5c9e;
  cursor: pointer;
  font: inherit;
  font-size: 13px;
  padding: 0;
}
.scopeCard .btnLink:hover {
  color: #4a4a82;
}
.checkbox input[type='checkbox'] {
  accent-color: #5c5c9e;
}
.checkboxGroup {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 280px;
  overflow-y: auto;
}
.checkboxGroup.compact {
  max-height: none;
}
.checkbox {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
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
.input {
  border: 1px solid #e8e8ec;
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 14px;
  color: #1f1f2e;
  background: #ffffff;
  outline: none;
}
.input:focus { border-color: #5c5c9e; }
.btnPrimary {
  align-self: flex-start;
  padding: 10px 18px;
  border-radius: 8px;
  border: none;
  background: #5c5c9e;
  color: #ffffff;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
}
.btnPrimary:hover:not(:disabled) { background: #52529a; }
.btnPrimary:disabled { opacity: 0.6; cursor: not-allowed; }
.hint {
  color: #8c8c9a;
  font-size: 13px;
  margin: 0;
}
.error {
  color: #d14343;
  font-size: 13px;
}
.success {
  color: #1f8a4c;
  font-size: 13px;
}
@media (max-width: 640px) {
  .header .title { font-size: 20px; }
  .grid { gap: 12px; }
  .card { padding: 14px; }
  .checkbox { align-items: flex-start; line-height: 1.45; }
  .checkbox input { margin-top: 3px; }
  .checkboxGroup { max-height: 220px; }
  .btnPrimary { width: 100%; min-height: 44px; }
  .scopeActions { justify-content: space-between; }
}
</style>
