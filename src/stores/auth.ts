import { defineStore } from 'pinia'
import { ref } from 'vue'
import { authApi } from '../api/services'
import { configureRequest } from '../api/request'
import {
  canUseProfileApi,
  extractPropertySubRole,
  normalizeAdminIdentity,
  normalizePropertySubRole
} from '../constants/roles'
import { USER_ROLE } from '../constants/enums'
import type { LoginResult, UserProfile } from '../api/types'
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

type LooseProfile = UserProfile & {
  property_sub_role?: string | null
  individual_leader_id?: string
  sector_leader_id?: string
  coordinator_id?: string
  is_building_leader?: boolean
  building_leader_id?: string | null
  resident?: LooseProfile
  user?: LooseProfile
}

/** 尝试从 JWT payload 读取子角色（部分环境会把 claim 打进 token） */
function readSubRoleFromAccessToken(token?: string): string | undefined {
  if (!token) return undefined
  try {
    const parts = token.split('.')
    if (parts.length < 2) return undefined
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const json = JSON.parse(atob(base64)) as Record<string, unknown>
    return extractPropertySubRole(json)
  } catch {
    return undefined
  }
}

function pickLoginUser(data: LoginResult & Record<string, unknown>): LooseProfile | null {
  const candidate = (data.resident || data.user || data.profile || null) as LooseProfile | null
  if (!candidate) return null
  const topLevelSub = extractPropertySubRole(data)
  if (topLevelSub && !extractPropertySubRole(candidate)) {
    return { ...candidate, propertySubRole: topLevelSub }
  }
  return candidate
}

/** 兼容 snake_case / 嵌套 resident / 子角色误作主角色 */
function normalizeProfile(raw: LooseProfile | UserProfile | null): UserProfile | null {
  if (!raw) return null
  const nested = (raw as LooseProfile).resident || (raw as LooseProfile).user
  const merged: LooseProfile = nested
    ? {
        ...nested,
        ...raw,
        role: raw.role || nested.role,
        propertySubRole:
          extractPropertySubRole(raw) ||
          extractPropertySubRole(nested) ||
          nested.propertySubRole ||
          raw.propertySubRole
      }
    : { ...raw }

  const rawSub =
    extractPropertySubRole(merged) ||
    normalizePropertySubRole(merged.propertySubRole) ||
    normalizePropertySubRole(merged.property_sub_role)

  const { role, propertySubRole } = normalizeAdminIdentity({
    role: merged.role,
    propertySubRole: rawSub
  })

  return {
    ...merged,
    role: role || merged.role,
    propertySubRole,
    individualLeaderId: merged.individualLeaderId || merged.individual_leader_id,
    sectorLeaderId: merged.sectorLeaderId || merged.sector_leader_id,
    coordinatorId: merged.coordinatorId || merged.coordinator_id,
    isBuildingLeader: merged.isBuildingLeader ?? merged.is_building_leader ?? false,
    buildingLeaderId: merged.buildingLeaderId || merged.building_leader_id || undefined
  }
}

export const useAuthStore = defineStore('auth', () => {
  const profile = ref<UserProfile | null>(normalizeProfile(readProfile()))
  const propertyCompanyId = ref(readCompanyId())
  const isLoggedIn = ref(
    hasValidSession() && (!!localStorage.getItem(AUTH_KEY) || !!normalizeProfile(readProfile()))
  )
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
    const tokenSub = readSubRoleFromAccessToken(access)
    const normalized = normalizeProfile(user)
    profile.value = normalized
      ? {
          ...normalized,
          propertySubRole: normalized.propertySubRole || tokenSub
        }
      : normalized
    propertyCompanyId.value = companyId
    username.value = profile.value?.name || username.value

    // 始终持久化 role + propertySubRole（JWT 无子角色时依赖 profile）
    if (profile.value) {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profile.value))
      if (profile.value.name) localStorage.setItem('wuyejifen_user', profile.value.name)
    }
    if (companyId) localStorage.setItem(COMPANY_KEY, companyId)

    if (remember) {
      localStorage.setItem(AUTH_KEY, '1')
    }
    isLoggedIn.value = true
  }

  async function login(phone: string, password: string, remember = true) {
    const data = (await authApi.adminLogin(phone, password)) as LoginResult & Record<string, unknown>
    const user = pickLoginUser(data)
    setSession(
      data.accessToken,
      data.refreshToken,
      user,
      user?.propertyCompanyId || propertyCompanyId.value,
      remember
    )
    localStorage.setItem(AUTH_KEY, '1')
    isLoggedIn.value = true

    const loginSub =
      extractPropertySubRole(user) ||
      extractPropertySubRole(data) ||
      readSubRoleFromAccessToken(data.accessToken)

    try {
      const roleForProfile = normalizeAdminIdentity(profile.value).role || user?.role
      if (canUseProfileApi(roleForProfile)) {
        const detail = (await authApi.profile({ softAuth: true })) as LooseProfile
        const detailSub = extractPropertySubRole(detail)
        persistProfile({
          ...detail,
          // 资料未带回子角色时，保留登录 / JWT 中的 property_leader
          propertySubRole: detailSub || loginSub || profile.value?.propertySubRole
        })
        username.value = profile.value?.name || username.value
        if (profile.value?.propertyCompanyId) {
          propertyCompanyId.value = profile.value.propertyCompanyId
          localStorage.setItem(COMPANY_KEY, profile.value.propertyCompanyId)
        }
      }
    } catch {
      // 保留 admin-login 返回的 resident（含 propertySubRole）
      if (loginSub && profile.value && !profile.value.propertySubRole) {
        patchProfile({ propertySubRole: loginSub })
      }
    }

    // 最终兜底：物业管理员若仍无子角色，无法展示领导菜单——再写一次登录侧解析结果
    if (
      profile.value?.role === USER_ROLE.PROPERTY_ADMIN &&
      !profile.value.propertySubRole &&
      loginSub
    ) {
      patchProfile({ propertySubRole: loginSub })
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
