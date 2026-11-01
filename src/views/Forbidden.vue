<template>
  <div class="page">
    <div class="card">
      <div class="badge">403</div>
      <h1 class="title">无访问权限</h1>
      <p class="desc">
        <template v-if="isWorkspaceDenied">
          当前账号不具备管理端工作台身份（<code class="code">adminWorkspace = false</code>），
          无法进入该页面。请让管理员先确认该账号已开通对应的工作台身份。
        </template>
        <template v-else>
          当前账号的角色可以进入后台，但缺少该页面所需的功能权限。
          <template v-if="requiredCode">
            所需权限：<code class="code">{{ requiredCode }}</code>
            <template v-if="requiredName">（{{ requiredName }}）</template>
          </template>
        </template>
      </p>
      <p class="hint">
        如需开通，请联系物业管理员或平台管理员，在「权限配置」中为该账号授予对应权限后重新登录（或刷新页面）。
      </p>
      <div class="actions">
        <button class="btnGhost" type="button" @click="goBack">返回上一页</button>
        <button class="btnPrimary" type="button" @click="goHome">回到工作台</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { getHomeRouteForProfile } from '../constants/roles'
import { PERMISSION_CODE_LABEL } from '../constants/permissionCodes'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const requiredCode = computed(() => String(route.query.code || ''))
const requiredName = computed(() => PERMISSION_CODE_LABEL[requiredCode.value] || '')
/** 守卫用 admin_workspace 这个伪码表示「身份不足以进管理端」，不是真实权限码 */
const isWorkspaceDenied = computed(() => requiredCode.value === 'admin_workspace')

function goBack() {
  if (window.history.length > 1) router.back()
  else goHome()
}

function goHome() {
  router.replace({ name: getHomeRouteForProfile(auth.profile) })
}
</script>

<style scoped>
.page { max-width: 720px; }
.card {
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  padding: 36px 32px;
}
.badge {
  display: inline-block;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: #b8714a;
  background: #fdf2e9;
  border-radius: 999px;
  padding: 3px 10px;
  margin-bottom: 14px;
}
.title { font-size: 22px; font-weight: 600; color: #1f1f2e; margin: 0 0 10px; }
.desc { font-size: 14px; color: #5c5c66; line-height: 1.7; margin: 0 0 8px; }
.hint { font-size: 13px; color: #8c8c9a; line-height: 1.7; margin: 0 0 24px; }
.code {
  font-family: monospace;
  font-size: 12.5px;
  color: #5c5c9e;
  background: #f4f5f7;
  border-radius: 4px;
  padding: 1px 6px;
}
.actions { display: flex; gap: 12px; flex-wrap: wrap; }
.btnGhost {
  padding: 10px 20px;
  border-radius: 8px;
  border: 1px solid #e8e8ec;
  background: #ffffff;
  color: #5c5c66;
  font-size: 14px;
  cursor: pointer;
}
.btnPrimary {
  padding: 10px 20px;
  border-radius: 8px;
  border: none;
  background: #5c5c9e;
  color: #ffffff;
  font-size: 14px;
  cursor: pointer;
}
</style>
