<template>
  <section class="profileCard">
    <div class="avatar"><IconSvg name="person" /></div>
    <div class="profileInfo">
      <h2>{{ displayName }}</h2>
      <p>{{ roleText }}</p>
      <p v-if="auth.propertyCompanyId">当前公司：{{ auth.propertyCompanyId }}</p>
    </div>
  </section>

  <section v-if="companies.length && isAdminRole(auth.profile?.role)" class="profileCard">
    <h3 class="sectionTitle">公司切换</h3>
    <select v-model="selectedCompanyId" class="companySelect" :disabled="!canSwitchCompany">
      <option v-for="company in companies" :key="company.id" :value="company.id">
        {{ company.name }}
      </option>
    </select>
  </section>

  <section class="profileCard">
    <button class="actionBtn" @click="goRoleHome">{{ homeActionLabel }}</button>
    <button class="actionBtn actionDanger" @click="logout">退出登录</button>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import IconSvg from '../../components/IconSvg.vue'
import { ENTITY_STATUS, getUserRoleDisplayLabel, USER_ROLE } from '../../constants/enums'
import { useAuthStore } from '../../stores/auth'
import { getRoleHomeRoute, isAdminRole } from '../../constants/roles'
import { propertyCompanyApi } from '../../api/services'
import type { PropertyCompanyItem } from '../../api/types'

const auth = useAuthStore()
const router = useRouter()
const companies = ref<PropertyCompanyItem[]>([])
const canSwitchCompany = computed(() => auth.profile?.role === USER_ROLE.PLATFORM_ADMIN)
const selectedCompanyId = computed({
  get: () => auth.propertyCompanyId,
  set: (id: string) => auth.setPropertyCompanyId(id)
})

const displayName = computed(() => auth.profile?.name || auth.username || '未命名用户')
const roleText = computed(() =>
  getUserRoleDisplayLabel(auth.profile?.role, auth.profile?.propertySubRole) || '未识别角色'
)
const homeActionLabel = computed(() =>
  isAdminRole(auth.profile?.role) ? '进入数据大盘' : '进入角色首页'
)

async function loadCompanies() {
  if (!isAdminRole(auth.profile?.role)) return
  try {
    const res = await propertyCompanyApi.list(
      { page: 1, pageSize: 100, status: ENTITY_STATUS.ACTIVE, sort: '-createdAt' },
      true
    )
    companies.value = res.list || []
    if (!auth.propertyCompanyId && companies.value.length) {
      auth.setPropertyCompanyId(companies.value[0].id)
    }
  } catch (error) {
    console.error(error)
  }
}

function goRoleHome() {
  void router.push({ name: getRoleHomeRoute(auth.profile?.role) })
}

function logout() {
  auth.logout()
  void router.push('/login')
}

onMounted(loadCompanies)
</script>

<style scoped>
.profileCard {
  background: #ffffff;
  border-radius: 14px;
  padding: 14px;
}

.profileCard + .profileCard {
  margin-top: 12px;
}

.avatar {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: #f4f5f7;
  color: #5c5c9e;
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar svg {
  width: 24px;
  height: 24px;
}

.profileInfo {
  margin-top: 10px;
}

.profileInfo h2 {
  font-size: 16px;
  color: #1f1f2e;
}

.profileInfo p {
  margin-top: 4px;
  font-size: 13px;
  color: #8c8c9a;
}

.sectionTitle {
  font-size: 15px;
  color: #1f1f2e;
}

.companySelect {
  width: 100%;
  margin-top: 10px;
  height: 42px;
  border: 1px solid #e8e8ec;
  border-radius: 10px;
  background: #ffffff;
  color: #5c5c66;
  font-size: 13px;
  padding: 0 10px;
}

.companySelect:disabled {
  background: #fafafc;
}

.actionBtn {
  width: 100%;
  height: 44px;
  border-radius: 10px;
  background: #f4f5f7;
  color: #1f1f2e;
  font-size: 14px;
}

.actionBtn + .actionBtn {
  margin-top: 10px;
}

.actionDanger {
  color: #de5d5d;
}
</style>
