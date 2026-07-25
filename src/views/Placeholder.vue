<template>
  <div class="page">
    <div class="icon">
      <svg viewBox="0 0 120 120" fill="none">
        <rect x="10" y="30" width="100" height="60" rx="8" stroke="#d0d0d8" stroke-width="2" fill="#fafafc" />
        <path d="M35 50h50M35 60h30M35 70h40" stroke="#d0d0d8" stroke-width="2" stroke-linecap="round" />
        <circle cx="90" cy="80" r="12" fill="#5c5c9e" opacity="0.15" />
        <path d="M85 80l4 4 6-8" stroke="#5c5c9e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </div>
    <h2 class="title">{{ title }}</h2>
    <p class="desc">页面开发中，敬请期待</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const title = computed(() => (route.meta.title as string) || '')
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 500px;
  text-align: center;
}

.icon {
  width: 120px;
  height: 120px;
  margin-bottom: 24px;
}

.icon svg {
  width: 100%;
  height: 100%;
}

.title {
  font-size: 20px;
  font-weight: 600;
  color: #1f1f2e;
  margin-bottom: 8px;
}

.desc {
  font-size: 14px;
  color: #8c8c9a;
}
</style>
