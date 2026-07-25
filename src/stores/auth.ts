import { defineStore } from 'pinia'
import { ref } from 'vue'
import { authApi } from '../api/services'
import { configureRequest } from '../api/request'
import { canUseProfileApi, normalizeAdminIdentity } from '../constants/roles'
import type { UserProfile } from '../api/types'
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  hasValidSession,
  setTokens
} from './tokenStore'
import { bindPushAfterLogin, unbindPushOnLogout } from '../composables/usePushNotifications'

const AUTH_KEY = 'wuyejifen_auth'
const PROFILE_KEY = 'userProfile'
const COMPANY_KEY = 'propertyCompanyId'

/** 兼容 snake_case / 子角色误作主角色 的 profile 字段 */
function normalizeProfile(
  raw:
    | UserProfile
    | (UserProfile & {
        property_sub_role?: string
        individual_leader_id?: string
        sector_leader_id?: string
        coordinator_id?: string
      })
    | null
): UserProfile | null {
  if (!raw) return null
  const snakeSub = raw.property_sub_role
  const { role, propertySubRole } = normalizeAdminIdentity({
    role: raw.role,
    propertySubRole: raw.propertySubRole || snakeSub
  })
  return {
    ...raw,
    role: role || raw.role,
    propertySubRole,
    individualLeaderId: raw.individualLeaderId || raw.individual_leader_id,
    sectorLeaderId: raw.sectorLeaderId || raw.sector_leader_id,
    coordinatorId: raw.coordinatorId || raw.coordinator_id
  }
}

export const useAuthStore = defineStore('auth', () => {
  const profile = ref<UserProfile | null>(normalizeProfile(readProfile()))
  const propertyCompanyId = ref(readCompanyId())
  const isLoggedIn = ref(!!localStorage.getItem(AUTH_KEY) && hasValidSession())
  const username = ref(profile.value?.name || localStorage.getItem('wuyejifen_user') || '')

  configureRequest({
    getTokens: () => ({
      accessToken: getAccessToken(),
      refreshToken: getRefreshToken()
    }),
    getPropertyCompanyId: () => propertyCompanyId.value || readCompanyId(),
    refreshTokens: async () => {
      const token = getRefreshToken()
      if (!token) return false
      try {
        const data = await authApi.refreshToken(token)
        setTokens(data.accessToken, data.refreshToken, true)
        return true
      } catch {
        return false
      }
    },
    onUnauthorized: () => {
      logout()
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.assign('/login')
      }
    },
    onForbidden: () => {
      // 403 仅提示，不跳转登录
    }
  })

  function readProfile(): UserProfile | null {
    const raw = localStorage.getItem(PROFILE_KEY)
    if (!raw) return null
    try {
      return JSON.parse(raw) as UserProfile
    } catch {
      return null
    }
  }

  function readCompanyId() {
    const stored = localStorage.getItem(COMPANY_KEY)
    if (stored) return stored
    return readProfile()?.propertyCompanyId || import.meta.env.VITE_PROPERTY_COMPANY_ID || ''
  }

  function persistProfile(user: UserProfile | null) {
    profile.value = normalizeProfile(user)
    if (profile.value) {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profile.value))
      if (profile.value.name) localStorage.setItem('wuyejifen_user', profile.value.name)
    }
  }

  function patchProfile(partial: Partial<UserProfile>) {
    if (!profile.value) return
    profile.value = normalizeProfile({ ...profile.value, ...partial })
    if (profile.value) {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profile.value))
    }
  }

  function setSession(
    access: string,
    refresh: string,
    user: UserProfile | null,
    companyId: string,
    remember: boolean
  ) {
    setTokens(access, refresh, remember)
    profile.value = normalizeProfile(user)
    propertyCompanyId.value = companyId
    username.value = profile.value?.name || username.value

    if (remember) {
      localStorage.setItem(AUTH_KEY, '1')
      localStorage.setItem(COMPANY_KEY, companyId)
      if (profile.value) localStorage.setItem(PROFILE_KEY, JSON.stringify(profile.value))
      if (profile.value?.name) localStorage.setItem('wuyejifen_user', profile.value.name)
    }
    isLoggedIn.value = true
  }

  async function login(phone: string, password: string, remember = true) {
    const data = await authApi.adminLogin(phone, password)
    const user = data.resident || null
    setSession(
      data.accessToken,
      data.refreshToken,
      user,
      user?.propertyCompanyId || propertyCompanyId.value,
      remember
    )
    try {
      if (canUseProfileApi(user?.role)) {
        persistProfile(await authApi.profile())
        username.value = profile.value?.name || username.value
        if (profile.value?.propertyCompanyId) {
          propertyCompanyId.value = profile.value.propertyCompanyId
          localStorage.setItem(COMPANY_KEY, profile.value.propertyCompanyId)
        }
      }
    } catch {
      // profile 获取失败不影响登录
    }
    void bindPushAfterLogin(profile.value?.id || user?.id)
    return true
  }

  function setPropertyCompanyId(companyId: string) {
    propertyCompanyId.value = companyId
    localStorage.setItem(COMPANY_KEY, companyId)
  }

  function logout() {
    void unbindPushOnLogout()
    clearTokens()
    profile.value = null
    isLoggedIn.value = false
    username.value = ''
    localStorage.removeItem(AUTH_KEY)
    localStorage.removeItem(PROFILE_KEY)
    localStorage.removeItem('wuyejifen_user')
  }

  return {
    isLoggedIn,
    username,
    accessToken: getAccessToken,
    refreshToken: getRefreshToken,
    profile,
    propertyCompanyId,
    login,
    logout,
    setPropertyCompanyId,
    patchProfile
  }
})
