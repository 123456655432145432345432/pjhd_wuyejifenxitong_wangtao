<template>
  <div ref="root" class="searchSelect">
    <div class="inputWrap">
      <IconSvg name="search" class="searchIcon" />
      <input
        v-model="keyword"
        type="text"
        class="input"
        placeholder="搜索商家名称..."
        autocomplete="off"
        @focus="onFocus"
        @input="onInput"
      />
    </div>
    <div v-if="open" class="dropdown">
      <div v-if="loading" class="dropdownItem muted">加载中...</div>
      <div v-else-if="loadError" class="dropdownItem error">{{ loadError }}</div>
      <div v-else-if="!merchants.length" class="dropdownItem muted">暂无待审核商家</div>
      <button
        v-for="merchant in merchants"
        :key="merchant.id"
        type="button"
        class="dropdownItem"
        :class="{ active: merchant.id === modelValue }"
        @mousedown.prevent="select(merchant)"
      >
        <span class="name">{{ merchant.name }}</span>
        <span class="meta">{{ formatMeta(merchant) }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import IconSvg from './IconSvg.vue'
import { merchantApi } from '../api/services'
import type { MerchantItem } from '../api/types'
import { ApiError } from '../api/request'

const props = defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  select: [merchant: MerchantItem]
}>()

const root = ref<HTMLElement | null>(null)
const keyword = ref('')
const open = ref(false)
const loading = ref(false)
const loadError = ref('')
const merchants = ref<MerchantItem[]>([])

let debounceTimer: ReturnType<typeof setTimeout>

function formatMeta(merchant: MerchantItem) {
  const parts = [merchant.category || '未分类', '待审核']
  if (merchant.address) parts.push(merchant.address)
  return parts.join(' · ')
}

function formatLabel(merchant: MerchantItem) {
  return `${merchant.name} · ${merchant.category || '未分类'}`
}

async function fetchMerchants() {
  loading.value = true
  loadError.value = ''
  try {
    const result = await merchantApi.listPending({
      page: 1,
      pageSize: 20,
      keyword: keyword.value.trim() || undefined
    })
    merchants.value = result.list || []
  } catch (e) {
    loadError.value = e instanceof ApiError ? e.message : '加载失败'
    merchants.value = []
  } finally {
    loading.value = false
  }
}

function onFocus() {
  open.value = true
  fetchMerchants()
}

function onInput() {
  open.value = true
  emit('update:modelValue', '')
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(fetchMerchants, 300)
}

function select(merchant: MerchantItem) {
  emit('update:modelValue', merchant.id)
  emit('select', merchant)
  keyword.value = formatLabel(merchant)
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

onMounted(() => document.addEventListener('click', onClickOutside))
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
