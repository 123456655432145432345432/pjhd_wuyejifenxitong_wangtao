<template>
  <section class="mobilePanel">
    <h2 class="panelTitle">{{ config?.homeTitle || '移动首页' }}</h2>
    <p class="panelSubtitle">{{ config?.homeSubtitle || '聚焦高频任务与关键入口' }}</p>

    <div v-if="focusCards.length" class="focusCards">
      <article v-for="card in focusCards" :key="card.title" class="focusCard">
        <h3>{{ card.title }}</h3>
        <p>{{ card.description }}</p>
      </article>
    </div>
  </section>

  <section class="mobilePanel">
    <div class="sectionHead">
      <h2 class="panelTitle">快捷入口</h2>
      <button class="linkBtn" @click="goWorkbench">全部功能</button>
    </div>
    <div class="quickGrid">
      <button
        v-for="action in quickActions"
        :key="action.route"
        class="quickCard"
        @click="goRoute(action.route)"
      >
        <IconSvg :name="action.icon" />
        <strong>{{ action.name }}</strong>
      </button>
    </div>
    <p v-if="!quickActions.length" class="emptyHint">暂无可用功能入口</p>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import IconSvg from '../../components/IconSvg.vue'
import { getMobilePortalConfig } from '../../constants/mobilePortal'
import { useAuthStore } from '../../stores/auth'

const auth = useAuthStore()
const router = useRouter()
const config = computed(() => getMobilePortalConfig(auth.profile))

const focusCards = computed(() => config.value?.homeFocusCards || [])
const quickActions = computed(() => config.value?.quickActions || [])

function goRoute(route: string) {
  void router.push({ name: route })
}

function goWorkbench() {
  void router.push({ name: 'mobile-workbench' })
}
</script>

<style scoped>
.mobilePanel {
  background: #ffffff;
  border-radius: 14px;
  padding: 14px;
}

.mobilePanel + .mobilePanel {
  margin-top: 12px;
}

.panelTitle {
  font-size: 16px;
  line-height: 22px;
  color: #1f1f2e;
}

.panelSubtitle {
  margin-top: 4px;
  font-size: 13px;
  color: #8c8c9a;
}

.focusCards {
  margin-top: 10px;
  display: grid;
  gap: 10px;
}

.focusCard {
  border-radius: 12px;
  padding: 12px;
  background: #f8f8fc;
}

.focusCard h3 {
  font-size: 14px;
  color: #1f1f2e;
}

.focusCard p {
  margin-top: 4px;
  font-size: 13px;
  line-height: 18px;
  color: #5c5c66;
}

.sectionHead {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.linkBtn {
  font-size: 13px;
  color: #5c5c9e;
}

.quickGrid {
  margin-top: 10px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.quickCard {
  border-radius: 12px;
  border: 1px solid #ececf5;
  min-height: 72px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: #5c5c66;
}

.quickCard svg {
  width: 18px;
  height: 18px;
}

.quickCard strong {
  font-size: 13px;
}

.emptyHint {
  margin-top: 10px;
  font-size: 13px;
  color: #8c8c9a;
}
</style>
