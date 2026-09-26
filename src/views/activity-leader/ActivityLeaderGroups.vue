<template>
  <div class="page" :class="{ mobilePage: isMobile }">
    <div class="header">
      <div>
        <h1 class="title">我的活动组</h1>
        <p class="desc">维护活动组资料，并设置多档课时价格（对标商家设价）</p>
      </div>
    </div>

    <div class="panel">
      <div v-if="loading" class="loading">加载中...</div>
      <p v-else-if="error" class="error">{{ error }}</p>
      <table v-else-if="groups.length" class="table" :class="{ mobileCards: isMobile }">
        <thead>
          <tr>
            <th>名称</th>
            <th>类型</th>
            <th>成员</th>
            <th>订阅</th>
            <th>月费</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in groups" :key="item.id">
            <td data-label="名称">{{ item.name }}</td>
            <td data-label="类型">{{ item.activityType || '—' }}</td>
            <td data-label="成员">{{ item.memberCount ?? '—' }}</td>
            <td data-label="订阅">{{ item.subscriberCount ?? '—' }}</td>
            <td data-label="月费">
              {{ item.monthlyFee != null ? `¥${formatMoney(item.monthlyFee)}` : '—' }}
            </td>
            <td data-label="状态">
              {{ item.status === ENTITY_STATUS.ACTIVE ? '启用' : getEnumLabel(ENTITY_STATUS_LABEL, item.status) }}
            </td>
            <td data-label="操作" class="ops">
              <button type="button" class="btnGhostSm" @click="openEdit(item)">编辑资料</button>
              <button type="button" class="btnPrimarySm" @click="openPricing(item)">课时价格</button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else class="empty">暂无我管理的活动组</p>
    </div>

    <div v-if="totalPages > 1" class="pager">
      <button class="btnGhost" :disabled="page <= 1 || loading" @click="changePage(page - 1)">
        上一页
      </button>
      <span>{{ page }} / {{ totalPages }}</span>
      <button
        class="btnGhost"
        :disabled="page >= totalPages || loading"
        @click="changePage(page + 1)"
      >
        下一页
      </button>
    </div>

    <!-- 编辑活动组资料 -->
    <Teleport to="body">
      <div v-if="editOpen" class="modalOverlay" @click.self="closeEdit">
        <div class="modal" :class="{ mobileSheet: isMobile }">
          <div class="modalHeader">
            <h3 class="modalTitle">编辑活动组</h3>
            <button type="button" class="modalClose" @click="closeEdit">&times;</button>
          </div>
          <div class="modalBody">
            <p v-if="editError" class="error">{{ editError }}</p>
            <div class="field">
              <label class="label">名称</label>
              <input v-model="editForm.name" class="input" maxlength="100" placeholder="活动组名称" />
            </div>
            <div class="field">
              <label class="label">活动类型</label>
              <input
                v-model="editForm.activityType"
                class="input"
                maxlength="50"
                placeholder="如 piano / dance / english"
              />
            </div>
            <div class="field">
              <label class="label">简介</label>
              <textarea v-model="editForm.description" class="textarea" rows="3" />
            </div>
            <div class="field">
              <label class="label">封面图</label>
              <MediaUploader
                v-model="editForm.coverUrl"
                category="activity"
                accept="image"
                :max="1"
              />
            </div>
            <div class="fieldRow">
              <div class="field">
                <label class="label">月费（基础）</label>
                <input
                  v-model.number="editForm.monthlyFee"
                  type="number"
                  min="0"
                  step="0.01"
                  class="input"
                />
              </div>
              <div class="field">
                <label class="label">年费（基础）</label>
                <input
                  v-model.number="editForm.yearlyFee"
                  type="number"
                  min="0"
                  step="0.01"
                  class="input"
                />
              </div>
            </div>
            <p class="hint">多档课时价格请在「课时价格」中配置；此处为基础订阅价。</p>
          </div>
          <div class="modalFooter">
            <button type="button" class="btnGhost" @click="closeEdit">取消</button>
            <button type="button" class="btnPrimary" :disabled="editSubmitting" @click="submitEdit">
              {{ editSubmitting ? '保存中...' : '保存' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 课时价格档 -->
    <Teleport to="body">
      <div v-if="pricingOpen" class="modalOverlay" @click.self="closePricing">
        <div class="modal modalWide" :class="{ mobileSheet: isMobile }">
          <div class="modalHeader">
            <div>
              <h3 class="modalTitle">课时价格 · {{ pricingGroupName }}</h3>
              <p class="modalSub">设置多档价格（如一级/二级），保存时整表替换</p>
            </div>
            <button type="button" class="modalClose" @click="closePricing">&times;</button>
          </div>
          <div class="modalBody">
            <p v-if="pricingError" class="error">{{ pricingError }}</p>
            <div v-if="pricingLoading" class="loading compact">加载价格档...</div>
            <template v-else>
              <div class="tierToolbar">
                <button type="button" class="btnGhostSm" @click="addTierRow">+ 添加价格档</button>
              </div>
              <div v-if="!tierRows.length" class="empty">暂无价格档，点击上方添加</div>
              <div v-else class="tierList">
                <div v-for="(row, idx) in tierRows" :key="row._key" class="tierCard">
                  <div class="tierHead">
                    <strong>第 {{ idx + 1 }} 档</strong>
                    <button type="button" class="linkDanger" @click="removeTierRow(idx)">删除</button>
                  </div>
                  <div class="fieldRow">
                    <div class="field">
                      <label class="label">档位名称</label>
                      <input v-model="row.tierName" class="input" placeholder="如：一级" />
                    </div>
                    <div class="field">
                      <label class="label">档位编码</label>
                      <input v-model="row.tierCode" class="input" placeholder="如：level_1" />
                    </div>
                  </div>
                  <div class="fieldRow three">
                    <div class="field">
                      <label class="label">价格（元）</label>
                      <input
                        v-model.number="row.price"
                        type="number"
                        min="0"
                        step="0.01"
                        class="input"
                      />
                    </div>
                    <div class="field">
                      <label class="label">周期</label>
                      <select v-model="row.period" class="input">
                        <option
                          v-for="opt in BILLING_CYCLE_OPTIONS"
                          :key="opt.value"
                          :value="opt.value"
                        >
                          {{ opt.label }}
                        </option>
                      </select>
                    </div>
                    <div class="field">
                      <label class="label">排序</label>
                      <input
                        v-model.number="row.sortOrder"
                        type="number"
                        min="0"
                        step="1"
                        class="input"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </template>
          </div>
          <div class="modalFooter">
            <button type="button" class="btnGhost" @click="closePricing">取消</button>
            <button
              type="button"
              class="btnPrimary"
              :disabled="pricingSaving || pricingLoading"
              @click="submitPricing"
            >
              {{ pricingSaving ? '保存中...' : '保存价格档' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import MediaUploader from '../../components/MediaUploader.vue'
import { activityGroupApi } from '../../api/services'
import type { ActivityGroupItem, ActivityPricingTierPayload } from '../../api/types'
import { ApiError } from '../../api/request'
import { BILLING_CYCLE, BILLING_CYCLE_OPTIONS, ENTITY_STATUS, ENTITY_STATUS_LABEL, getEnumLabel } from '../../constants/enums'
import { useIsMobile } from '../../composables/useIsMobile'

interface TierRow extends ActivityPricingTierPayload {
  _key: string
  id?: string
}

const groups = ref<ActivityGroupItem[]>([])
const { isMobile } = useIsMobile()
const loading = ref(false)
const error = ref('')
const page = ref(1)
const totalPages = ref(1)

const editOpen = ref(false)
const editingId = ref<string | null>(null)
const editSubmitting = ref(false)
const editError = ref('')
const editForm = reactive({
  name: '',
  description: '',
  activityType: '',
  coverUrl: '',
  monthlyFee: undefined as number | undefined,
  yearlyFee: undefined as number | undefined
})

const pricingOpen = ref(false)
const pricingGroupId = ref('')
const pricingGroupName = ref('')
const pricingLoading = ref(false)
const pricingSaving = ref(false)
const pricingError = ref('')
const tierRows = ref<TierRow[]>([])
let tierKeySeq = 0

function formatMoney(value: number) {
  return Number(value).toFixed(2)
}

function nextTierKey() {
  tierKeySeq += 1
  return `tier-${tierKeySeq}`
}

function resolveCoverUrl(item: ActivityGroupItem) {
  if (item.coverUrl) return item.coverUrl
  if (Array.isArray(item.coverUrls) && item.coverUrls[0]) return item.coverUrls[0]
  if (typeof item.coverUrls === 'string') {
    try {
      const parsed = JSON.parse(item.coverUrls) as unknown
      if (Array.isArray(parsed) && typeof parsed[0] === 'string') return parsed[0]
    } catch {
      return item.coverUrls
    }
  }
  return ''
}

async function load(pageNo = page.value) {
  loading.value = true
  error.value = ''
  try {
    const res = await activityGroupApi.myLed({ page: pageNo, pageSize: 20, sort: '-createdAt' })
    groups.value = res.list || []
    page.value = res.pagination?.page || pageNo
    totalPages.value = res.pagination?.totalPages || 1
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '活动组加载失败'
  } finally {
    loading.value = false
  }
}

function changePage(next: number) {
  void load(next)
}

function openEdit(item: ActivityGroupItem) {
  editingId.value = item.id
  editForm.name = item.name || ''
  editForm.description = item.description || ''
  editForm.activityType = item.activityType || ''
  editForm.coverUrl = resolveCoverUrl(item)
  editForm.monthlyFee = item.monthlyFee
  editForm.yearlyFee = item.yearlyFee
  editError.value = ''
  editOpen.value = true
}

function closeEdit() {
  editOpen.value = false
  editingId.value = null
}

async function submitEdit() {
  if (!editingId.value) return
  if (!editForm.name.trim()) {
    editError.value = '请填写活动组名称'
    return
  }
  editSubmitting.value = true
  editError.value = ''
  try {
    await activityGroupApi.update(editingId.value, {
      name: editForm.name.trim(),
      description: editForm.description.trim() || undefined,
      activityType: editForm.activityType.trim() || undefined,
      coverUrl: editForm.coverUrl.trim() || undefined,
      monthlyFee: editForm.monthlyFee,
      yearlyFee: editForm.yearlyFee
    })
    closeEdit()
    await load(page.value)
  } catch (e) {
    editError.value = e instanceof ApiError ? e.message : '保存失败'
  } finally {
    editSubmitting.value = false
  }
}

async function openPricing(item: ActivityGroupItem) {
  pricingGroupId.value = item.id
  pricingGroupName.value = item.name || item.id
  pricingError.value = ''
  pricingOpen.value = true
  pricingLoading.value = true
  tierRows.value = []
  try {
    const res = await activityGroupApi.listPricingTiers(item.id)
    const list = res.list || []
    tierRows.value = list.map((t) => ({
      _key: nextTierKey(),
      id: t.id,
      tierName: t.tierName || '',
      tierCode: t.tierCode || '',
      price: Number(t.price) || 0,
      period: t.period || BILLING_CYCLE.MONTHLY,
      sortOrder: t.sortOrder ?? 0,
      status: t.status
    }))
  } catch (e) {
    pricingError.value = e instanceof ApiError ? e.message : '加载价格档失败'
  } finally {
    pricingLoading.value = false
  }
}

function closePricing() {
  pricingOpen.value = false
  pricingGroupId.value = ''
  tierRows.value = []
}

function addTierRow() {
  const n = tierRows.value.length + 1
  tierRows.value.push({
    _key: nextTierKey(),
    tierName: `${n}级`,
    tierCode: `level_${n}`,
    price: 0,
    period: BILLING_CYCLE.MONTHLY,
    sortOrder: n
  })
}

function removeTierRow(index: number) {
  tierRows.value.splice(index, 1)
}

async function submitPricing() {
  if (!pricingGroupId.value) return
  for (const row of tierRows.value) {
    if (!row.tierName.trim() || !row.tierCode.trim()) {
      pricingError.value = '请填写每一档的名称与编码'
      return
    }
    if (row.price == null || Number.isNaN(Number(row.price)) || Number(row.price) < 0) {
      pricingError.value = '请填写有效的价格'
      return
    }
  }
  pricingSaving.value = true
  pricingError.value = ''
  try {
    // v4.0：PUT 直接传数组
    const payload: ActivityPricingTierPayload[] = tierRows.value.map((row, idx) => ({
      tierName: row.tierName.trim(),
      tierCode: row.tierCode.trim(),
      price: Number(row.price),
      period: row.period || BILLING_CYCLE.MONTHLY,
      sortOrder: row.sortOrder ?? idx + 1
    }))
    await activityGroupApi.replacePricingTiers(pricingGroupId.value, payload)
    closePricing()
  } catch (e) {
    pricingError.value = e instanceof ApiError ? e.message : '保存价格档失败'
  } finally {
    pricingSaving.value = false
  }
}

onMounted(() => {
  void load(1)
})
</script>

<style scoped>
.page { padding: 24px 32px; }
.header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; gap: 16px; }
.title { font-size: 24px; font-weight: 600; color: #1f1f2e; margin: 0 0 6px; }
.desc { margin: 0; color: #8c8c9a; font-size: 14px; }
.panel { background: #fff; border-radius: 12px; padding: 8px 20px 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.loading, .empty { padding: 40px 0; text-align: center; color: #8c8c9a; }
.loading.compact { padding: 20px 0; }
.error { color: #d4380d; margin: 0 0 12px; }
.hint { margin: 0; font-size: 12px; color: #8c8c9a; line-height: 1.5; }
.table { width: 100%; border-collapse: collapse; }
.table th, .table td { text-align: left; padding: 14px 8px; border-bottom: 1px solid #f0f0f3; font-size: 14px; }
.table th { color: #8c8c9a; font-weight: 500; }
.ops { display: flex; flex-wrap: wrap; gap: 8px; }
.btnGhostSm, .btnPrimarySm, .btnGhost, .btnPrimary {
  border: none; border-radius: 8px; cursor: pointer; font-size: 13px; padding: 8px 12px;
}
.btnGhostSm, .btnGhost { background: #f5f5f7; color: #1f1f2e; }
.btnPrimarySm, .btnPrimary { background: #5b4cdb; color: #fff; }
.btnPrimary:disabled, .btnGhost:disabled, .btnPrimarySm:disabled { opacity: 0.5; cursor: not-allowed; }
.pager { display: flex; align-items: center; justify-content: center; gap: 12px; margin-top: 16px; color: #5c5c66; }
.modalOverlay {
  position: fixed; inset: 0; background: rgba(15, 15, 20, 0.45);
  display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 16px;
}
.modal { width: min(520px, calc(100vw - 32px)); background: #fff; border-radius: 14px; overflow: hidden; max-height: 90vh; display: flex; flex-direction: column; }
.modalWide { width: min(720px, calc(100vw - 32px)); }
.modalHeader { display: flex; align-items: flex-start; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid #f0f0f3; gap: 12px; }
.modalTitle { margin: 0; font-size: 16px; }
.modalSub { margin: 4px 0 0; font-size: 12px; color: #8c8c9a; }
.modalClose { border: none; background: transparent; font-size: 22px; cursor: pointer; color: #8c8c9a; }
.modalBody { padding: 16px 20px; display: grid; gap: 12px; overflow-y: auto; }
.modalFooter { padding: 12px 20px 16px; display: flex; justify-content: flex-end; gap: 10px; border-top: 1px solid #f0f0f3; }
.field { display: grid; gap: 6px; }
.fieldRow { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.fieldRow.three { grid-template-columns: 1fr 1fr 1fr; }
.label { font-size: 13px; color: #5c5c66; }
.input, .textarea {
  width: 100%; border: 1px solid #e6e6eb; border-radius: 8px; padding: 10px 12px; font-size: 14px; box-sizing: border-box;
}
.textarea { resize: vertical; }
.tierToolbar { display: flex; justify-content: flex-end; }
.tierList { display: grid; gap: 12px; }
.tierCard { border: 1px solid #f0f0f3; border-radius: 10px; padding: 12px; background: #fafafc; }
.tierHead { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.linkDanger { border: none; background: none; color: #e05c5c; cursor: pointer; font-size: 13px; }
@media (max-width: 768px) {
  .page { padding: 0 var(--mobile-page-gap); }
  .fieldRow, .fieldRow.three { grid-template-columns: 1fr; }
  .table.mobileCards thead { display: none; }
  .table.mobileCards, .table.mobileCards tbody, .table.mobileCards tr, .table.mobileCards td { display: block; width: 100%; }
  .table.mobileCards tr { border: 1px solid #f0f0f3; border-radius: 10px; padding: 10px 12px; margin-bottom: 10px; }
  .table.mobileCards td { border: none; padding: 6px 0; }
  .table.mobileCards td::before {
    content: attr(data-label);
    display: inline-block; min-width: 64px; color: #8c8c9a; font-size: 12px; margin-right: 8px;
  }
  .ops { justify-content: flex-start; }
}
</style>
