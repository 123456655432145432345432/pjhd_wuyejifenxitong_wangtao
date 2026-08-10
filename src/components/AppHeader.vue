<template>
  <header class="appHeader" :class="{ appHeaderMobile: mobile }">
    <div class="appHeaderLeft">
      <button v-if="mobile" class="appHeaderMenuBtn" @click="emit('toggle-menu')">
        <IconSvg :name="menuOpen ? 'close' : 'menu'" />
      </button>
      <span class="appHeaderBrand">邻里商城服务管理端</span>
      <span v-if="!mobile" class="appHeaderDivider">/</span>
      <span class="appHeaderCurrent">{{ pageTitle }}</span>
    </div>

    <div class="appHeaderRight">
      <div v-if="companies.length && isAdminRole(auth.profile?.role)" class="companySelectWrap">
        <select
          v-model="selectedCompanyId"
          class="companySelect"
          :disabled="!canSwitchCompany"
        >
          <option v-for="company in companies" :key="company.id" :value="company.id">
            {{ company.name }}
          </option>
        </select>
      </div>

      <div v-if="!mobile" class="appHeaderSeparator" />
      <span v-if="roleLabel" class="appHeaderRole">{{ roleLabel }}</span>
      <div v-if="!mobile" class="appHeaderSeparator" />
      <button class="appHeaderLogout" :class="{ appHeaderLogoutMobile: mobile }" @click="handleLogout">
        <span v-if="!mobile">退出</span>
        <IconSvg name="logout" />
      </button>
      <div v-if="!mobile" class="appHeaderAvatar">
        <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=admin" alt="avatar" />
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import IconSvg from './IconSvg.vue'
import { propertyCompanyApi } from '../api/services'
import type { PropertyCompanyItem } from '../api/types'
import { ENTITY_STATUS, getUserRoleDisplayLabel, USER_ROLE } from '../constants/enums'
import { isAdminRole } from '../constants/roles'
import { useAuthStore } from '../stores/auth'

withDefaults(
  defineProps<{
    mobile?: boolean
    menuOpen?: boolean
  }>(),
  {
    mobile: false,
    menuOpen: false
  }
)

const emit = defineEmits<{
  'toggle-menu': []
}>()

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const pageTitle = computed(() => (route.meta.title as string) || '')
const roleLabel = computed(() =>
  getUserRoleDisplayLabel(auth.profile?.role, auth.profile?.propertySubRole)
)

const companies = ref<PropertyCompanyItem[]>([])
const canSwitchCompany = computed(() => auth.profile?.role === USER_ROLE.PLATFORM_ADMIN)

const selectedCompanyId = computed({
  get: () => auth.propertyCompanyId,
  set: (id: string) => auth.setPropertyCompanyId(id)
})

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
  } catch (e) {
    console.error(e)
  }
}

function handleLogout() {
  auth.logout()
  router.push('/login')
}

onMounted(loadCompanies)
</script>

<style scoped>
.appHeader {
  height: 60px;
  background: #ffffff;
  border-bottom: 1px solid #e8e8ec;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  flex-shrink: 0;
}

.appHeaderMobile {
  height: auto;
  min-height: 60px;
  padding: 10px 14px;
  gap: 10px;
  position: sticky;
  top: 0;
  z-index: 20;
  flex-wrap: wrap;
}

.appHeaderLeft {
  display: flex;
  align-items: center;
  font-size: 14px;
  min-width: 0;
}

.appHeaderBrand {
  color: #1f1f2e;
  font-weight: 500;
}

.appHeaderMenuBtn {
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: #f4f5f7;
  color: #1f1f2e;
  margin-right: 8px;
}

.appHeaderMenuBtn svg {
  width: 18px;
  height: 18px;
}

.appHeaderDivider {
  margin: 0 8px;
  color: #8c8c9a;
}

.appHeaderCurrent {
  color: #5c5c9a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.appHeaderRole {
  font-size: 13px;
  color: #8c8c9a;
}

.appHeaderRight {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.companySelectWrap {
  max-width: 200px;
}

.companySelect {
  width: 100%;
  padding: 6px 10px;
  border: 1px solid #e8e8ec;
  border-radius: 8px;
  background: #ffffff;
  color: #5c5c66;
  font-size: 13px;
  outline: none;
  cursor: pointer;
}

.companySelect:focus {
  border-color: #5c5c9e;
}

.companySelect:disabled {
  cursor: default;
  background: #fafafc;
  color: #5c5c66;
}

.appHeaderIconBtn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #5c5c66;
  border-radius: 8px;
  transition: background 0.2s;
}

.appHeaderIconBtn:hover {
  background: #f4f5f7;
}

.appHeaderIconBtn svg {
  width: 20px;
  height: 20px;
}

.appHeaderSeparator {
  width: 1px;
  height: 20px;
  background: #e8e8ec;
  margin: 0 4px;
}

.appHeaderLogout {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #5c5c66;
  font-size: 14px;
}

.appHeaderLogoutMobile {
  width: 36px;
  height: 36px;
  justify-content: center;
  border-radius: 10px;
  background: #f4f5f7;
}

.appHeaderLogout svg {
  width: 18px;
  height: 18px;
}

.appHeaderAvatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  overflow: hidden;
  border: 1px solid #e8e8ec;
}

.appHeaderAvatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

@media (max-width: 768px) {
  .appHeaderBrand {
    display: none;
  }

  .appHeaderRight {
    width: 100%;
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: 8px;
  }

  .companySelectWrap {
    flex: 1;
    max-width: none;
    min-width: 0;
  }

  .companySelect {
    min-width: 0;
  }
}
</style>
