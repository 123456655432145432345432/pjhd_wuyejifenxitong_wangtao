<template>
  <MobileShellLayout v-if="useMobileShell" />
  <div v-else class="appLayout" :class="{ appLayoutMobile: isMobile }">
    <AppSidebar v-if="!isMobile" />
    <Transition name="mobile-drawer">
      <div v-if="isMobile && mobileMenuOpen" class="mobileSidebarOverlay" @click.self="closeMobileMenu">
        <AppSidebar mobile @navigate="closeMobileMenu" />
      </div>
    </Transition>
    <div class="appLayoutRight">
      <AppHeader :mobile="isMobile" :menu-open="mobileMenuOpen" @toggle-menu="toggleMobileMenu" />
      <main class="appLayoutMain" :class="{ appLayoutMainMobile: isMobile }">
        <RouterView v-slot="{ Component, route: viewRoute }">
          <Transition name="page-fade" mode="out-in">
            <div
              v-if="Component"
              :key="`${viewRoute.fullPath}::${auth.propertyCompanyId || ''}`"
              class="pageView"
            >
              <component :is="Component" />
            </div>
          </Transition>
        </RouterView>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppSidebar from '../components/AppSidebar.vue'
import AppHeader from '../components/AppHeader.vue'
import { useIsMobile } from '../composables/useIsMobile'
import MobileShellLayout from './MobileShellLayout.vue'
import { usesMobileShell } from '../constants/mobilePortal'
import { useAuthStore } from '../stores/auth'

const route = useRoute()
const { isMobile } = useIsMobile()
const auth = useAuthStore()
const mobileMenuOpen = ref(false)
const useMobileShell = computed(() => isMobile.value && usesMobileShell(auth.profile))

function toggleMobileMenu() {
  mobileMenuOpen.value = !mobileMenuOpen.value
}

function closeMobileMenu() {
  mobileMenuOpen.value = false
}

watch(
  () => route.fullPath,
  () => {
    closeMobileMenu()
  }
)
</script>

<style scoped>
.appLayout {
  display: flex;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  background: #f4f5f7;
}

.appLayoutMobile {
  width: 100%;
}

.appLayoutRight {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.appLayoutMain {
  flex: 1;
  overflow: auto;
  overscroll-behavior: none;
  padding: 24px;
  min-width: 0;
}

.appLayoutMainMobile {
  padding: 14px;
  padding-bottom: calc(14px + env(safe-area-inset-bottom));
}

.pageView {
  min-height: 100%;
}

.mobileSidebarOverlay {
  position: fixed;
  inset: 0;
  z-index: 40;
  background: rgba(15, 23, 42, 0.42);
  display: flex;
}
</style>

<style>
.page-fade-enter-active,
.page-fade-leave-active {
  transition: opacity 0.22s ease;
}

.page-fade-enter-from,
.page-fade-leave-to {
  opacity: 0;
}

.mobile-drawer-enter-active,
.mobile-drawer-leave-active {
  transition: opacity 0.2s ease;
}

.mobile-drawer-enter-active .appSidebar,
.mobile-drawer-leave-active .appSidebar {
  transition: transform 0.22s ease;
}

.mobile-drawer-enter-from,
.mobile-drawer-leave-to {
  opacity: 0;
}

.mobile-drawer-enter-from .appSidebar,
.mobile-drawer-leave-to .appSidebar {
  transform: translateX(-100%);
}
</style>
