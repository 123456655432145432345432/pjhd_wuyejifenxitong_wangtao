<template>
  <section v-if="!sections.length" class="emptyPanel">
    <p>暂无可用功能，请联系管理员开通权限</p>
  </section>
  <section v-for="section in sections" :key="section.title" class="workbenchSection">
    <h2 class="sectionTitle">{{ section.title }}</h2>
    <div class="workbenchList">
      <button
        v-for="item in section.items"
        :key="item.route"
        class="workbenchItem"
        @click="goRoute(item.route)"
      >
        <div class="itemLeft">
          <span class="itemIcon"><IconSvg :name="item.icon" /></span>
          <div>
            <h3>{{ item.name }}</h3>
            <p v-if="item.description">{{ item.description }}</p>
          </div>
        </div>
        <div class="itemRight">
          <span v-if="item.firstBatchOptimize" class="optTag">首批优化</span>
          <IconSvg name="chevron-down" class="arrowIcon" />
        </div>
      </button>
    </div>
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
const sections = computed(() => config.value?.workbenchSections || [])

function goRoute(route: string) {
  void router.push({ name: route })
}
</script>

<style scoped>
.emptyPanel {
  background: #ffffff;
  border-radius: 14px;
  padding: 24px 14px;
  text-align: center;
  color: #8c8c9a;
  font-size: 13px;
}

.workbenchSection + .workbenchSection {
  margin-top: 12px;
}

.sectionTitle {
  margin-bottom: 8px;
  font-size: 15px;
  color: #1f1f2e;
}

.workbenchList {
  background: #ffffff;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid #efeff6;
}

.workbenchItem {
  width: 100%;
  min-height: 56px;
  padding: 10px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #f3f3f8;
}

.workbenchItem:last-child {
  border-bottom: none;
}

.itemLeft {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.itemIcon {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: #f4f5f7;
  color: #5c5c9e;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.itemIcon svg {
  width: 16px;
  height: 16px;
}

.itemLeft h3 {
  font-size: 14px;
  color: #1f1f2e;
  text-align: left;
}

.itemLeft p {
  margin-top: 2px;
  font-size: 12px;
  color: #8c8c9a;
  text-align: left;
}

.itemRight {
  display: flex;
  align-items: center;
  gap: 8px;
}

.optTag {
  font-size: 11px;
  color: #5c5c9e;
  padding: 2px 7px;
  border-radius: 999px;
  background: rgba(92, 92, 158, 0.12);
}

.arrowIcon {
  width: 16px;
  height: 16px;
  color: #b0b0be;
  transform: rotate(-90deg);
}
</style>
