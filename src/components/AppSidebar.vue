<template>
  <aside class="appSidebar" :class="{ appSidebarMobile: mobile }">
    <div class="appSidebarHeader">
      <div class="appSidebarLogo">
        <img src="/favicon.png" alt="邻里商城服务管理端" />
      </div>
      <div class="appSidebarTitle">
        <div class="appSidebarBrand">邻里商城服务<wbr /><span class="appSidebarBrandTail">管理端</span></div>
        <div class="appSidebarSub">{{ portalSubtitle }}</div>
      </div>
    </div>
    <nav class="appSidebarNav">
      <template v-for="menu in menuList" :key="menu.name">
        <div v-if="menu.children" class="sidebarGroup">
          <div
            class="appSidebarItem groupHeader"
            :class="{ appSidebarItemActive: isGroupActive(menu) }"
            @click="toggleGroup(menu.route)"
          >
            <IconSvg :name="menu.icon" class="appSidebarIcon" />
            <span>{{ menu.name }}</span>
            <IconSvg :name="expandedGroups[menu.route] ? 'chevron-up' : 'chevron-down'" class="chevron" />
          </div>
          <div v-if="expandedGroups[menu.route]" class="subMenu">
            <RouterLink
              v-for="child in menu.children"
              :key="child.name"
              :to="{ name: child.route }"
              class="appSidebarItem subItem"
              :class="{ appSidebarItemActive: currentRoute.name === child.route }"
              @click="emitNavigate"
            >
              <span>{{ child.name }}</span>
            </RouterLink>
          </div>
        </div>
        <RouterLink
          v-else
          :to="{ name: menu.route }"
          class="appSidebarItem"
          :class="{ appSidebarItemActive: currentRoute.name === menu.route }"
          @click="emitNavigate"
        >
          <IconSvg :name="menu.icon" class="appSidebarIcon" />
          <span>{{ menu.name }}</span>
        </RouterLink>
      </template>
    </nav>
  </aside>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { useRoute } from 'vue-router'
import { getMenusForProfile, getPortalSubtitle } from '../constants/roles'
import { useAuthStore } from '../stores/auth'
import IconSvg from './IconSvg.vue'

withDefaults(
  defineProps<{
    mobile?: boolean
  }>(),
  {
    mobile: false
  }
)

const emit = defineEmits<{
  navigate: []
}>()

const currentRoute = useRoute()
const auth = useAuthStore()
const menuList = computed(() => getMenusForProfile(auth.profile))
const portalSubtitle = computed(() => getPortalSubtitle(auth.profile?.role))

const expandedGroups = reactive<Record<string, boolean>>({})

function isGroupActive(menu: { name: string; route: string; children?: { route: string }[] }): boolean {
  if (currentRoute.name === menu.route) return true
  if (menu.children) {
    return menu.children.some(child => currentRoute.name === child.route)
  }
  return false
}

function toggleGroup(route: string) {
  expandedGroups[route] = !expandedGroups[route]
}

function emitNavigate() {
  emit('navigate')
}

// 自动展开当前路由所在的组
watch(
  () => currentRoute.name,
  (name) => {
    if (!name) return
    for (const menu of menuList.value) {
      if (menu.children) {
        const match = menu.children.some(child => child.route === name)
        if (match) {
          expandedGroups[menu.route] = true
          break
        }
      }
    }
  },
  { immediate: true }
)
</script>

<style scoped>
.appSidebar {
  width: 220px;
  flex-shrink: 0;
  background: #ffffff;
  border-right: 1px solid #e8e8ec;
  display: flex;
  flex-direction: column;
}

.appSidebarMobile {
  width: min(84vw, 320px);
  height: 100%;
  border-right: none;
  box-shadow: 18px 0 48px rgba(31, 31, 46, 0.18);
}

.appSidebarHeader {
  min-height: 60px;
  display: flex;
  align-items: center;
  padding: 10px 20px;
  border-bottom: 1px solid #e8e8ec;
  box-sizing: border-box;
}

.appSidebarLogo {
  width: 40px;
  height: 40px;
  margin-right: 12px;
  flex-shrink: 0;
}

.appSidebarLogo img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: 8px;
  display: block;
}

.appSidebarBrand {
  font-size: 15px;
  font-weight: 600;
  color: #1f1f2e;
  line-height: 22px;
  word-break: keep-all;
}

.appSidebarBrandTail {
  white-space: nowrap;
}

.appSidebarSub {
  font-size: 12px;
  color: #8c8c9a;
  line-height: 18px;
}

.appSidebarNav {
  flex: 1;
  padding: 12px 16px;
  overflow: auto;
}

.appSidebarItem {
  display: flex;
  align-items: center;
  height: 44px;
  padding: 0 16px;
  border-radius: 8px;
  color: #5c5c66;
  font-size: 14px;
  transition: all 0.2s;
  margin-bottom: 4px;
  text-decoration: none;
  cursor: pointer;
}

.appSidebarItem:hover {
  background: #f4f5f7;
  color: #1f1f2e;
}

.appSidebarItemActive {
  background: #5c5c9e;
  color: #ffffff;
}

.appSidebarItemActive:hover {
  background: #5c5c9e;
  color: #ffffff;
}

.appSidebarIcon {
  width: 18px;
  height: 18px;
  margin-right: 12px;
}

.chevron {
  width: 14px;
  height: 14px;
  margin-left: auto;
  color: #8c8c9a;
  transition: transform 0.2s;
}

.sidebarGroup {
  margin-bottom: 4px;
}

.groupHeader {
  margin-bottom: 0;
}

.subMenu {
  margin-bottom: 4px;
}

.subItem {
  height: 36px;
  font-size: 13px;
  padding: 0 16px;
  justify-content: center;
}

.subItem:hover {
  background: rgba(92, 92, 158, 0.08);
}

.subItem.appSidebarItemActive {
  background: rgba(92, 92, 158, 0.12);
  color: #5c5c9e;
}

.subItem.appSidebarItemActive:hover {
  background: rgba(92, 92, 158, 0.12);
  color: #5c5c9e;
}
</style>
