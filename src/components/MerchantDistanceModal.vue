<template>
  <Teleport to="body">
    <div v-if="open" class="overlay" @click.self="close">
      <div class="modal">
        <div class="modalHeader">
          <h3>小区距离 — {{ merchantName || '商家' }}</h3>
          <button type="button" class="modalClose" @click="close">&times;</button>
        </div>
        <p class="hint">
          为该商家配置距各小区的公里数，用于命中多档配送费。留空表示未配置（不展示距离，下单回退单档配送费）。
        </p>
        <div v-if="loading" class="empty">加载中...</div>
        <p v-else-if="loadError" class="error">{{ loadError }}</p>
        <div v-else class="tableWrap">
          <table>
            <thead>
              <tr>
                <th>小区</th>
                <th>距离（km）</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in rows" :key="item.communityId">
                <td>{{ item.communityName || item.communityId }}</td>
                <td>
                  <input
                    v-model="item.input"
                    type="text"
                    inputmode="decimal"
                    class="input"
                    placeholder="未配置"
                  />
                </td>
              </tr>
              <tr v-if="!rows.length">
                <td colspan="2" class="empty">该物业下暂无小区</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-if="saveSuccess" class="success">{{ saveSuccess }}</p>
        <p v-if="saveError" class="error">{{ saveError }}</p>
        <div class="actions">
          <button type="button" @click="close">取消</button>
          <button type="button" class="primary" :disabled="saving || loading" @click="save">
            {{ saving ? '保存中...' : '保存' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { merchantApi } from '../api/services'
import { ApiError } from '../api/request'
import type { MerchantCommunityDistanceItem } from '../api/types'

const props = defineProps<{
  open: boolean
  merchantId: string
  merchantName?: string
}>()

const emit = defineEmits<{
  close: []
}>()

interface DistanceRow {
  communityId: string
  communityName?: string
  originalKm: number | null
  input: string
}

const loading = ref(false)
const saving = ref(false)
const loadError = ref('')
const saveError = ref('')
const saveSuccess = ref('')
const rows = ref<DistanceRow[]>([])

function close() {
  emit('close')
}

function toRow(item: MerchantCommunityDistanceItem): DistanceRow {
  const km = item.distanceKm == null || item.distanceKm === undefined ? null : Number(item.distanceKm)
  const originalKm = km != null && Number.isFinite(km) ? km : null
  return {
    communityId: item.communityId || (item as { id?: string }).id || '',
    communityName: item.communityName || (item as { name?: string }).name,
    originalKm,
    input: originalKm == null ? '' : String(originalKm)
  }
}

function rawInput(value: unknown) {
  return String(value ?? '').trim()
}

async function load() {
  if (!props.merchantId) return
  loading.value = true
  loadError.value = ''
  saveError.value = ''
  saveSuccess.value = ''
  try {
    const list = await merchantApi.listCommunityDistances(props.merchantId)
    rows.value = list.map(toRow)
  } catch (error) {
    rows.value = []
    loadError.value = error instanceof ApiError ? error.message : '距离配置加载失败'
  } finally {
    loading.value = false
  }
}

async function save() {
  if (saving.value || loading.value) return
  if (!props.merchantId) {
    saveError.value = '缺少商家编号，无法保存'
    return
  }
  saveError.value = ''
  saveSuccess.value = ''

  const items: Array<{ communityId: string; distanceKm: number | null }> = []
  for (const row of rows.value) {
    if (!row.communityId) {
      saveError.value = '小区数据缺少编号，请刷新后重试'
      return
    }
    const raw = rawInput(row.input)
    if (raw === '') {
      if (row.originalKm != null) {
        items.push({ communityId: row.communityId, distanceKm: null })
      }
      continue
    }
    const km = Number(raw)
    if (!Number.isFinite(km) || km < 0) {
      saveError.value = `${row.communityName || row.communityId} 的距离须为不小于 0 的数字`
      return
    }
    items.push({ communityId: row.communityId, distanceKm: km })
  }

  if (!items.length) {
    saveError.value = '请至少填写一个小区距离'
    return
  }

  saving.value = true
  try {
    const saved = await merchantApi.updateCommunityDistances(props.merchantId, { items })
    if (saved.length) {
      rows.value = saved.map(toRow)
    } else {
      const byId = new Map(items.map((item) => [item.communityId, item.distanceKm]))
      rows.value = rows.value.map((row) =>
        toRow({
          communityId: row.communityId,
          communityName: row.communityName,
          distanceKm: byId.has(row.communityId) ? byId.get(row.communityId) ?? null : row.originalKm
        })
      )
    }
    saveSuccess.value = '保存成功'
  } catch (error) {
    saveError.value = error instanceof ApiError ? error.message : '保存失败'
  } finally {
    saving.value = false
  }
}

watch(
  () => [props.open, props.merchantId] as const,
  ([open]) => {
    if (open) load()
  }
)
</script>

<style scoped>
.overlay {
  position: fixed; inset: 0; z-index: 1000;
  display: flex; align-items: center; justify-content: center;
  padding: 20px; background: rgba(0, 0, 0, 0.45);
}
.modal {
  width: min(560px, 100%); max-height: 86vh; overflow: auto;
  padding: 24px; border-radius: 12px; background: #fff;
}
.modalHeader { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 8px; }
.modal h3 { margin: 0; color: #1f1f2e; font-size: 18px; }
.modalClose { border: none; background: none; font-size: 22px; color: #8c8c9a; cursor: pointer; }
.hint { margin: 0 0 14px; font-size: 13px; color: #8c8c9a; line-height: 1.5; }
.tableWrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
th, td { padding: 10px 8px; border-bottom: 1px solid #f0f0f3; text-align: left; }
th { color: #8c8c9a; font-weight: 500; }
.input { box-sizing: border-box; width: 140px; padding: 8px 10px; border: 1px solid #e8e8ec; border-radius: 8px; }
.empty { padding: 20px 0; text-align: center; color: #8c8c9a; }
.error { color: #e05c5c; font-size: 13px; }
.success { color: #2f9e6f; font-size: 13px; }
.actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 18px; }
button { padding: 9px 14px; border: 1px solid #e8e8ec; border-radius: 8px; background: #fff; color: #5c5c66; cursor: pointer; }
button:disabled { opacity: 0.55; cursor: not-allowed; }
.primary { border-color: #5c5c9e; background: #5c5c9e; color: #fff; }
@media (max-width: 640px) {
  .overlay { align-items: flex-end; padding: 0; }
  .modal { border-radius: 16px 16px 0 0; }
}
</style>
