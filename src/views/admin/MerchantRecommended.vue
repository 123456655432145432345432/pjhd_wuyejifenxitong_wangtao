<template>
  <div class="page">
    <header class="header">
      <div>
        <h1>物业推荐维护</h1>
        <p>
          控制小程序端"物业推荐"列表的展示商家。设为推荐后，
          小程序的物业推荐列表（<code>GET /merchants?recommended=true</code>，v8.7 §7.1）
          会出现；取消推荐仅置 <code>isRecommended=false</code>，不会隐藏商家本身。
        </p>
      </div>
    </header>

    <div class="panel">
      <div class="toolbar">
        <select
          v-model="selectedPropertyCompanyId"
          class="filterSelect companySelect"
          :disabled="companiesLoading"
          @change="onPropertyCompanyChange"
        >
          <option v-if="companiesLoading" value="">加载物业公司...</option>
          <option v-else-if="!propertyCompanies.length" value="">暂无物业公司</option>
          <option
            v-for="company in propertyCompanies"
            :key="company.id"
            :value="company.id"
          >
            {{ company.name }}
          </option>
        </select>

        <input
          v-model="keywordInput"
          class="input"
          placeholder="按商家名称搜索"
          @keyup.enter="applyKeyword"
        />
        <button type="button" @click="applyKeyword">查询</button>

        <select v-model="filterMode" class="filterSelect" @change="reload">
          <option value="recommended">仅推荐</option>
          <option value="all">全部审核通过</option>
          <option value="nonRecommended">仅未推荐</option>
        </select>

        <span class="hint">
          共 {{ total }} 条；当前页推荐 {{ recommendedCount }} 条
        </span>
      </div>

      <div v-if="companiesLoading || (loading && !list.length)" class="empty">加载中...</div>
      <div v-else-if="loadError" class="empty error">{{ loadError }}</div>
      <div v-else-if="!selectedPropertyCompanyId" class="empty">请选择物业公司</div>
      <div v-else-if="!list.length" class="empty">暂无商家</div>
      <div v-else class="tableWrap">
        <table>
          <thead>
            <tr>
              <th>商家</th>
              <th>分类</th>
              <th>联系</th>
              <th>推荐状态</th>
              <th>推荐排序</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in list" :key="item.id">
              <td>
                <strong>{{ item.name }}</strong>
                <small>ID: {{ item.id }}</small>
              </td>
              <td>{{ item.category || '—' }}</td>
              <td>
                <small>{{ item.contactPhone || '—' }}</small>
                <small>{{ item.address || '' }}</small>
              </td>
              <td>
                <span :class="['badge', isRecommended(item) ? 'badgeOn' : 'badgeOff']">
                  {{ isRecommended(item) ? '已推荐' : '未推荐' }}
                </span>
              </td>
              <td>
                <input
                  type="number"
                  class="input sortInput"
                  :value="sortDraft[item.id] ?? item.recommendedSort ?? ''"
                  :disabled="!isRecommended(item)"
                  @input="onSortInput(item.id, $event)"
                />
              </td>
              <td>
                <button
                  type="button"
                  class="primaryBtn"
                  :disabled="submitting[item.id]"
                  @click="toggleRecommend(item)"
                >
                  {{ isRecommended(item) ? '取消推荐' : '设为推荐' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <footer class="footer">
        <span>第 {{ page }} / {{ totalPages }} 页</span>
        <div v-if="totalPages > 1">
          <button :disabled="page <= 1" @click="load(page - 1)">上一页</button>
          <button :disabled="page >= totalPages" @click="load(page + 1)">下一页</button>
        </div>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { merchantApi, merchantRecommendApi, propertyCompanyApi } from '../../api/services'
import type { MerchantItem, PropertyCompanyItem } from '../../api/types'
import { ApiError } from '../../api/request'
import { useAuthStore } from '../../stores/auth'
import { USER_ROLE } from '../../constants/enums'

const PAGE_SIZE = 20

type FilterMode = 'recommended' | 'all' | 'nonRecommended'

const auth = useAuthStore()
const isPlatformAdmin = computed(() => auth.profile?.role === USER_ROLE.PLATFORM_ADMIN)

const filterMode = ref<FilterMode>('recommended')
const keywordInput = ref('')
const appliedKeyword = ref('')
const selectedPropertyCompanyId = ref('')
const propertyCompanies = ref<PropertyCompanyItem[]>([])
const companiesLoading = ref(true)
const list = ref<MerchantItem[]>([])
const loading = ref(false)
const loadError = ref('')
const page = ref(1)
const total = ref(0)
const totalPages = ref(1)
/** 按行保存草稿推荐排序，避免输入中就被覆盖 */
const sortDraft = reactive<Record<string, number | string>>({})
/** 正在提交的商家 ID，用于禁用按钮 */
const submitting = reactive<Record<string, boolean>>({})

const recommendedCount = computed(() => list.value.filter((m) => isRecommended(m)).length)

function isRecommended(item: MerchantItem) {
  if (typeof item.isRecommended === 'boolean') return item.isRecommended
  return Boolean(item.isOfficialRecommended)
}

function resolveErrorMessage(e: unknown) {
  if (e instanceof ApiError) return e.message
  if (e instanceof Error) return e.message
  return '操作失败'
}

function onSortInput(id: string, e: Event) {
  const target = e.target as HTMLInputElement
  sortDraft[id] = target.value
}

async function loadPropertyCompanies() {
  companiesLoading.value = true
  try {
    const res = await propertyCompanyApi.list()
    propertyCompanies.value = res.list || []
    const preferredId = auth.propertyCompanyId || import.meta.env.VITE_PROPERTY_COMPANY_ID || ''
    if (preferredId) {
      selectedPropertyCompanyId.value = preferredId
    } else if (isPlatformAdmin.value && propertyCompanies.value.length) {
      selectedPropertyCompanyId.value = propertyCompanies.value[0].id
    }
  } catch (e) {
    loadError.value = resolveErrorMessage(e)
  } finally {
    companiesLoading.value = false
  }
}

async function load(nextPage = page.value) {
  if (!selectedPropertyCompanyId.value) {
    list.value = []
    total.value = 0
    totalPages.value = 1
    return
  }
  loading.value = true
  loadError.value = ''
  try {
    const result = await merchantApi.list({
      page: nextPage,
      pageSize: PAGE_SIZE,
      keyword: appliedKeyword.value || undefined,
      propertyCompanyId: selectedPropertyCompanyId.value,
      recommended:
        filterMode.value === 'recommended'
          ? true
          : filterMode.value === 'nonRecommended'
            ? false
            : undefined
    })
    list.value = result.list || []
    page.value = result.pagination?.page ?? nextPage
    total.value = result.pagination?.total ?? list.value.length
    totalPages.value = result.pagination?.totalPages ?? 1
    list.value.forEach((item) => {
      if (sortDraft[item.id] === undefined) {
        sortDraft[item.id] = item.recommendedSort ?? ''
      }
    })
  } catch (e) {
    list.value = []
    loadError.value = resolveErrorMessage(e)
  } finally {
    loading.value = false
  }
}

function applyKeyword() {
  appliedKeyword.value = keywordInput.value.trim()
  load(1)
}

function reload() {
  load(1)
}

function onPropertyCompanyChange() {
  page.value = 1
  load(1)
}

async function toggleRecommend(item: MerchantItem) {
  if (!item.id || submitting[item.id]) return
  const next = !isRecommended(item)
  const sortRaw = sortDraft[item.id]
  const sortNum = sortRaw === '' || sortRaw === undefined ? NaN : Number(sortRaw)
  if (next && !Number.isFinite(sortNum)) {
    loadError.value = '请输入推荐排序（数字）'
    return
  }
  submitting[item.id] = true
  try {
    await merchantRecommendApi.set(item.id, {
      isRecommended: next,
      recommendedSort: next ? sortNum : undefined
    })
    const idx = list.value.findIndex((m) => m.id === item.id)
    if (idx >= 0) {
      const updated: MerchantItem = {
        ...list.value[idx],
        isRecommended: next,
        isOfficialRecommended: next,
        recommendedSort: next ? sortNum : undefined
      }
      list.value.splice(idx, 1, updated)
    }
  } catch (e) {
    loadError.value = resolveErrorMessage(e)
  } finally {
    submitting[item.id] = false
  }
}

onMounted(async () => {
  await loadPropertyCompanies()
  await load(1)
})
</script>

<style scoped>
.page { max-width: 1100px; }
.header { margin-bottom: 20px; }
h1 { margin: 0 0 8px; font-size: 24px; color: #1f1f2e; }
.header p { margin: 0; color: #8c8c9a; font-size: 13px; line-height: 1.6; }
.header p code {
  background: #f0f0f3;
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 12px;
  color: #5c5c66;
}
.panel {
  overflow: hidden;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}
.toolbar {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f3;
  align-items: center;
}
.filterSelect {
  box-sizing: border-box;
  padding: 9px 12px;
  border: 1px solid #e8e8ec;
  border-radius: 8px;
  background: #fff;
  color: #1f1f2e;
  font-size: 13px;
}
.companySelect { min-width: 200px; }
.input {
  box-sizing: border-box;
  min-width: 200px;
  flex: 1;
  padding: 10px 12px;
  border: 1px solid #e8e8ec;
  border-radius: 8px;
  font-size: 13px;
}
.sortInput { width: 90px; min-width: 0; padding: 6px 8px; font-size: 13px; }
button {
  padding: 9px 14px;
  border: 1px solid #e8e8ec;
  border-radius: 8px;
  background: #fff;
  color: #5c5c66;
  cursor: pointer;
  font-size: 13px;
}
button:disabled { opacity: 0.55; cursor: not-allowed; }
button.primaryBtn {
  background: #5c5c9e;
  border-color: #5c5c9e;
  color: #fff;
}
.hint { color: #8c8c9a; font-size: 12px; }
.tableWrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
th,
td {
  padding: 14px 16px;
  border-bottom: 1px solid #f0f0f3;
  text-align: left;
  vertical-align: middle;
}
th {
  background: #fafafc;
  color: #8c8c9a;
  font-weight: 500;
  white-space: nowrap;
}
td strong,
td small { display: block; }
td small { margin-top: 4px; color: #8c8c9a; }
.badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 12px;
}
.badgeOn { background: #e6f4ea; color: #1e8a4c; }
.badgeOff { background: #f0f0f3; color: #8c8c9a; }
.empty { padding: 40px; text-align: center; color: #8c8c9a; }
.error { color: #e05c5c; }
.footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 14px 20px;
  color: #8c8c9a;
  font-size: 13px;
}
.footer div { display: flex; align-items: center; gap: 10px; }
</style>
