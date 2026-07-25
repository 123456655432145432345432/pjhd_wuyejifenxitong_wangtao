<template>
  <div class="segmentedControl">
    <button
      v-for="tab in tabs"
      :key="tab.code"
      class="segmentedControlBtn"
      :class="{ segmentedControlBtnActive: modelValue === tab.code }"
      @click="$emit('update:modelValue', tab.code)"
    >
      <span>{{ tab.name }}</span>
      <span v-if="tab.count != null" class="segmentedControlBadge">{{ tab.count }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
interface Tab {
  code: string
  name: string
  count?: number | string
}

interface Props {
  tabs: Tab[]
  modelValue: string
}

defineProps<Props>()
defineEmits<{ (e: 'update:modelValue', value: string): void }>()
</script>

<style scoped>
.segmentedControl {
  display: inline-flex;
  padding: 4px;
  border: 1px solid #e8e8ec;
  border-radius: 10px;
  background: #f7f7f9;
}

.segmentedControlBtn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 8px;
  font-size: 14px;
  color: #5c5c66;
  border: none;
  background: transparent;
  transition: all 0.2s;
}

.segmentedControlBtnActive {
  background: #ffffff;
  color: #5c5c9e;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.segmentedControlBadge {
  padding: 2px 6px;
  border-radius: 10px;
  background: #e8e8ec;
  color: #5c5c66;
  font-size: 11px;
  font-weight: 500;
}

.segmentedControlBtnActive .segmentedControlBadge {
  background: #f0f0ff;
  color: #5c5c9e;
}
</style>
