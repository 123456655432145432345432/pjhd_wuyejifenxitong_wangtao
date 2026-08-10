<template>
  <div class="mobileShell">
    <header class="mobileShellHeader">
      <button v-if="!isTabPage" class="mobileBackBtn" @click="goBack">返回</button>
      <div class="mobileHeaderText">
        <h1 class="mobileHeaderTitle">{{ headerTitle }}</h1>
        <p class="mobileHeaderSubtitle">{{ portalLabel }}</p>
      </div>
      <button class="mobileHeaderAction" @click="goProfile">我的</button>
    </header>

    <main class="mobileShellMain">
      <RouterView v-slot="{ Component, route: viewRoute }">
        <div
          v-if="Component"
          :key="`${viewRoute.fullPath}::${auth.propertyCompanyId || ''}`"
          class="mobilePageView"
        >
          <component :is="Component" />
        </div>
      </RouterView>
    </main>

    <nav class="mobileBottomTabs" aria-label="移动主导航">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="mobileTabBtn"
        :class="{ mobileTabBtnActive: activeTab === tab.key }"
        @click="goTab(tab.routeName)"
      >
        <IconSvg :name="tab.icon" />
        <span>{{ tab.label }}</span>
      </button>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import IconSvg from '../components/IconSvg.vue'
import {
  getMappedWorkbenchTab,
  getMobilePortalConfig,
  isMobileTabRoute,
  type MobileTabKey
} from '../constants/mobilePortal'
import { useAuthStore } from '../stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const portalConfig = computed(() => getMobilePortalConfig(auth.profile))
const portalLabel = computed(() => portalConfig.value?.portalTitle || '移动工作台')
const isTabPage = computed(() => isMobileTabRoute(String(route.name || '')))
const activeTab = computed<MobileTabKey>(() => {
  if (!portalConfig.value) return 'home'
  return getMappedWorkbenchTab(String(route.name || ''), portalConfig.value)
})

const tabs = [
  { key: 'home' as const, label: '首页', icon: 'home', routeName: 'mobile-home' },
  { key: 'workbench' as const, label: '工作台', icon: 'dashboard', routeName: 'mobile-workbench' },
  { key: 'profile' as const, label: '我的', icon: 'person', routeName: 'mobile-profile' }
]

const headerTitle = computed(() => {
  const name = String(route.name || '')
  if (name === 'mobile-home') return '首页'
  if (name === 'mobile-workbench') return '工作台'
  if (name === 'mobile-profile') return '我的'
  return (route.meta.title as string) || '详情'
})

function goBack() {
  if (window.history.length > 1) {
    router.back()
    return
  }
  void router.push({ name: 'mobile-home' })
}

function goProfile() {
  if (route.name === 'mobile-profile') return
  void router.push({ name: 'mobile-profile' })
}

function goTab(routeName: string) {
  if (route.name === routeName) return
  void router.push({ name: routeName })
}
</script>

<style scoped>
.mobileShell {
  height: 100%;
  min-height: 100%;
  display: flex;
  flex-direction: column;
  background: #f4f5f7;
  overflow: hidden;
  overscroll-behavior: none;
}

.mobileShellHeader {
  position: sticky;
  top: 0;
  z-index: 30;
  min-height: 60px;
  padding: 10px 14px;
  background: #ffffff;
  border-bottom: 1px solid #e8e8ec;
  display: flex;
  align-items: center;
  gap: 10px;
}

.mobileBackBtn,
.mobileHeaderAction {
  height: 34px;
  border-radius: 9px;
  padding: 0 10px;
  background: #f4f5f7;
  color: #5c5c66;
  font-size: 13px;
}

.mobileHeaderText {
  min-width: 0;
  flex: 1;
}

.mobileHeaderTitle {
  font-size: 16px;
  line-height: 22px;
  color: #1f1f2e;
}

.mobileHeaderSubtitle {
  margin-top: 2px;
  font-size: 12px;
  line-height: 18px;
  color: #8c8c9a;
}

.mobileShellMain {
  flex: 1;
  padding: 14px;
  padding-bottom: calc(88px + env(safe-area-inset-bottom));
  overflow: auto;
  overscroll-behavior: none;
}

.mobilePageView {
  min-height: 100%;
}

.mobileBottomTabs {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 40;
  height: calc(64px + env(safe-area-inset-bottom));
  padding: 8px 12px calc(8px + env(safe-area-inset-bottom));
  background: #ffffff;
  border-top: 1px solid #e8e8ec;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.mobileTabBtn {
  border-radius: 12px;
  color: #8c8c9a;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-size: 12px;
}

.mobileTabBtn svg {
  width: 18px;
  height: 18px;
}

.mobileTabBtnActive {
  color: #5c5c9e;
  background: rgba(92, 92, 158, 0.08);
}
</style>
