<template>
  <div ref="root" class="searchSelect">
    <div class="inputWrap">
      <IconSvg name="search" class="searchIcon" />
      <input
        v-model="keyword"
        type="text"
        class="input"
        placeholder="搜索姓名、房号..."
        autocomplete="off"
        @focus="onFocus"
        @input="onInput"
      />
    </div>
    <div v-if="open" class="dropdown">
      <div v-if="loading" class="dropdownItem muted">加载中...</div>
      <div v-else-if="loadError" class="dropdownItem error">{{ loadError }}</div>
      <div v-else-if="!filteredRecords.length" class="dropdownItem muted">暂无冻结记录</div>
      <button
        v-for="record in filteredRecords"
        :key="record.id"
        type="button"
        class="dropdownItem"
        :class="{ active: record.id === frozenRecordId }"
        @mousedown.prevent="select(record)"
      >
        <span class="name">{{ record.residentName }} · {{ formatRoom(record) }}</span>
        <span class="meta">{{ formatAmount(record.amount) }} · {{ record.reason }} · {{ record.createdAt }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import IconSvg from './IconSvg.vue'
import { coinFreezeRecordApi } from '../api/services'
import type { CoinFreezeRecordItem } from '../api/types'
import { ApiError } from '../api/request'

const props = defineProps<{
  frozenRecordId: string
  residentId: string
}>()

const emit = defineEmits<{
  'update:frozenRecordId': [value: string]
  'update:residentId': [value: string]
}>()

const root = ref<HTMLElement | null>(null)
const keyword = ref('')
const open = ref(false)
const loading = ref(false)
const loadError = ref('')
const records = ref<CoinFreezeRecordItem[]>([])

const filteredRecords = computed(() => {
  const q = keyword.value.trim().toLowerCase()
  if (!q) return records.value
  return records.value.filter(record => {
    const text = [
      record.residentName,
      record.residentPhone,
      record.residentBuilding,
      record.residentRoom,
      record.reason,
      record.amount
    ].filter(Boolean).join(' ').toLowerCase()
    return text.includes(q)
  })
})

function formatRoom(record: CoinFreezeRecordItem) {
  return [record.residentBuilding, record.residentRoom].filter(Boolean).join('') || '-'
}

function formatAmount(amount: number | string) {
  return `${amount} 元`
}

function formatLabel(record: CoinFreezeRecordItem) {
  return `${record.residentName} · ${formatRoom(record)} · ${formatAmount(record.amount)}`
}

async function fetchRecords() {
  loading.value = true
  loadError.value = ''
  try {
    const result = await coinFreezeRecordApi.list({ page: 1, pageSize: 50, action: 'freeze' })
    records.value = result.list || []
  } catch (e) {
    loadError.value = e instanceof ApiError ? e.message : '加载失败'
    records.value = []
  } finally {
    loading.value = false
  }
}

function onFocus() {
  open.value = true
  if (!records.value.length) fetchRecords()
}

function onInput() {
  open.value = true
  emit('update:frozenRecordId', '')
  emit('update:residentId', '')
}

function select(record: CoinFreezeRecordItem) {
  emit('update:frozenRecordId', record.id)
  emit('update:residentId', record.residentId)
  keyword.value = formatLabel(record)
  open.value = false
}

function onClickOutside(e: MouseEvent) {
  if (root.value && !root.value.contains(e.target as Node)) {
    open.value = false
  }
}

watch(
  () => [props.frozenRecordId, props.residentId],
  ([recordId, residentId]) => {
    if (!recordId && !residentId) keyword.value = ''
  }
)

onMounted(() => document.addEventListener('click', onClickOutside))
onUnmounted(() => document.removeEventListener('click', onClickOutside))
</script>

<style scoped>
.searchSelect {
  position: relative;
}
.inputWrap {
  position: relative;
}
.searchIcon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 16px;
  color: #8c8c9a;
  pointer-events: none;
}
.input {
  width: 100%;
  padding: 10px 12px 10px 36px;
  border: 1px solid #e8e8ec;
  border-radius: 8px;
  font-size: 14px;
  color: #1f1f2e;
  background: #ffffff;
  outline: none;
  box-sizing: border-box;
}
.input:focus {
  border-color: #5c5c9e;
}
.dropdown {
  position: absolute;
  z-index: 10;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  max-height: 240px;
  overflow-y: auto;
  background: #ffffff;
  border: 1px solid #e8e8ec;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}
.dropdownItem {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  width: 100%;
  padding: 10px 12px;
  border: none;
  background: transparent;
  text-align: left;
  cursor: pointer;
  font-size: 14px;
  color: #1f1f2e;
}
.dropdownItem:hover,
.dropdownItem.active {
  background: #f4f4ff;
}
.dropdownItem.muted {
  color: #8c8c9a;
  cursor: default;
}
.dropdownItem.error {
  color: #e05c5c;
  cursor: default;
}
.dropdownItem .name {
  font-weight: 500;
}
.dropdownItem .meta {
  font-size: 12px;
  color: #8c8c9a;
}
</style>
