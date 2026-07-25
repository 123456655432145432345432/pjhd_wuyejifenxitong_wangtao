<template>
  <div ref="root" class="searchSelect">
    <div class="inputWrap">
      <IconSvg name="search" class="searchIcon" />
      <input
        v-model="keyword"
        type="text"
        class="input"
        placeholder="搜索姓名、手机号..."
        autocomplete="off"
        @focus="onFocus"
        @input="onInput"
      />
    </div>
    <div v-if="open" class="dropdown">
      <div v-if="loading" class="dropdownItem muted">加载中...</div>
      <div v-else-if="loadError" class="dropdownItem error">{{ loadError }}</div>
      <div v-else-if="!options.length" class="dropdownItem muted">暂无匹配业主</div>
      <button
        v-for="item in options"
        :key="item.id"
        type="button"
        class="dropdownItem"
        :class="{ active: item.id === modelValue }"
        @mousedown.prevent="select(item)"
      >
        <span class="name">{{ resolveResidentDisplayName(item) }}</span>
        <span class="meta">{{ formatRoom(item) }} · {{ formatBalance(item) }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import IconSvg from './IconSvg.vue'
import { residentApi } from '../api/services'
import type { ResidentItem } from '../api/types'
import { resolveResidentDisplayName } from '../api/mappers'
import { ApiError } from '../api/request'

const props = defineProps<{
  modelValue: string
  status?: string
  /** 挂载后自动加载并展开下拉（用于表单弹窗） */
  autoOpen?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const root = ref<HTMLElement | null>(null)
const keyword = ref('')
const open = ref(false)
const loading = ref(false)
const loadError = ref('')
const options = ref<ResidentItem[]>([])

let debounceTimer: ReturnType<typeof setTimeout>

function formatRoom(item: ResidentItem) {
  return [item.building, item.unit, item.room].filter(Boolean).join('') || '-'
}

function formatBalance(item: ResidentItem) {
  return item.coinBalance != null ? `${item.coinBalance} PCoin` : '-'
}

function formatLabel(item: ResidentItem) {
  return `${resolveResidentDisplayName(item)} · ${formatRoom(item)} · ${formatBalance(item)}`
}

async function fetchResidents() {
  loading.value = true
  loadError.value = ''
  try {
    const result = await residentApi.list({
      page: 1,
      pageSize: 20,
      keyword: keyword.value.trim() || undefined,
      status: props.status || undefined
    })
    options.value = result.list || []
  } catch (e) {
    loadError.value = e instanceof ApiError ? e.message : '加载失败'
    options.value = []
  } finally {
    loading.value = false
  }
}

function onFocus() {
  open.value = true
  fetchResidents()
}

function onInput() {
  open.value = true
  emit('update:modelValue', '')
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(fetchResidents, 300)
}

function select(item: ResidentItem) {
  emit('update:modelValue', item.id)
  keyword.value = formatLabel(item)
  open.value = false
}

function onClickOutside(e: MouseEvent) {
  if (root.value && !root.value.contains(e.target as Node)) {
    open.value = false
  }
}

watch(() => props.modelValue, (id) => {
  if (!id) keyword.value = ''
})

onMounted(() => {
  document.addEventListener('click', onClickOutside)
  if (props.autoOpen) {
    open.value = true
    fetchResidents()
  }
})
onUnmounted(() => {
  document.removeEventListener('click', onClickOutside)
  clearTimeout(debounceTimer)
})
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
