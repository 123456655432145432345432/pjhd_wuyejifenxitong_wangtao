import { defineStore } from 'pinia'
import { ref } from 'vue'
import { authApi, propertyManagerPortalApi } from '../api/services'
import { ApiError, configureRequest } from '../api/request'
import {
  canUseProfileApi,
  extractPropertySubRole,
  getEffectiveRoles,
  isPlatformAdmin,
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
const PERMISSIONS_KEY = 'userPermissions'

type LooseProfile = UserProfile & {
  property_sub_role?: string | null
  individual_leader_id?: string
  sector_leader_id?: string
  coordinator_id?: string
  is_building_leader?: boolean
  building_leader_id?: string | null
  is_property_manager?: boolean
  property_manager_id?: string | null
  // v8.13/v8.14 负责人标签（后端可能下发 snake_case）
  is_coordinator?: boolean
  is_sector_leader?: boolean
  sector_leader_ids?: string[]
  is_individual_leader?: boolean
  is_activity_leader?: boolean
  activity_leader_id?: string | null
  is_resident_merchant?: boolean
  resident_merchant_id?: string | null
  is_distributor?: boolean
  distributor_id?: string | null
  /** v1.3：管理端工作台身份（后端可能下发 snake_case） */
  role_codes?: string[]
  admin_workspace?: boolean
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
    buildingLeaderId: merged.buildingLeaderId || merged.building_leader_id || undefined,
    // v8.11：物业经理标志后端 /auth/profile 暂未返回，保留 undefined 以便探测后回填（勿强制 false）
    isPropertyManager: merged.isPropertyManager ?? merged.is_property_manager ?? undefined,
    propertyManagerId: merged.propertyManagerId || merged.property_manager_id || undefined,
    // v8.13/v8.14：负责人 / 组长 / 店主 / 代理商标签，一律归一为布尔（缺失即 false）
    isCoordinator: merged.isCoordinator ?? merged.is_coordinator ?? false,
    isSectorLeader: merged.isSectorLeader ?? merged.is_sector_leader ?? false,
    sectorLeaderIds: merged.sectorLeaderIds || merged.sector_leader_ids || [],
    isIndividualLeader: merged.isIndividualLeader ?? merged.is_individual_leader ?? false,
    isActivityLeader: merged.isActivityLeader ?? merged.is_activity_leader ?? false,
    activityLeaderId: merged.activityLeaderId || merged.activity_leader_id || null,
    isResidentMerchant: merged.isResidentMerchant ?? merged.is_resident_merchant ?? false,
    residentMerchantId: merged.residentMerchantId || merged.resident_merchant_id || null,
    isDistributor: merged.isDistributor ?? merged.is_distributor ?? false,
    distributorId: merged.distributorId || merged.distributor_id || null,
    // v1.3：身份集合与管理端总开关。
    // roleCodes 必须是数组；adminWorkspace 缺失时保留 undefined（老环境不下发，不能当 false 拦）
    roleCodes: merged.roleCodes || merged.effectiveRoleCodes || merged.role_codes || undefined,
    adminWorkspace: merged.adminWorkspace ?? merged.admin_workspace ?? undefined
  }
}

export const useAuthStore = defineStore('auth', () => {
  const profile = ref<UserProfile | null>(normalizeProfile(readProfile()))
  const propertyCompanyId = ref(readCompanyId())
  const isLoggedIn = ref(
    hasValidSession() && (!!localStorage.getItem(AUTH_KEY) || !!normalizeProfile(readProfile()))
  )
  const username = ref(profile.value?.name || localStorage.getItem('wuyejifen_user') || '')
  /** v8.11：物业经理身份是否已探测（/auth/profile 不含该字段，需单独调 /property-managers/my） */
  const propertyManagerProbed = ref(false)
  /**
   * v1.2（2026-10-29）：当前登录人的有效权限码（`resource:action` 冒号格式）。
   * 优先来自 GET /auth/my-permissions；失败时回落 /auth/profile 的 effectivePermissions。
   * 持久化到 localStorage，避免刷新首屏在门控判定前闪烁。
   */
  const permissions = ref<string[]>(readPermissions())
  /** 是否已成功拉到过权限码；未拉到时门控一律回落角色判定（fail-open），防止整站锁死 */
  const permissionsLoaded = ref(false)

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

  function readPermissions(): string[] {
    const raw = localStorage.getItem(PERMISSIONS_KEY)
    if (!raw) return []
    try {
      const parsed = JSON.parse(raw) as unknown
      if (!Array.isArray(parsed)) return []
      return parsed.filter((item): item is string => typeof item === 'string' && !!item)
    } catch {
      return []
    }
  }

  function setPermissions(list: string[] | null) {
    if (!list) {
      permissions.value = []
      permissionsLoaded.value = false
      localStorage.removeItem(PERMISSIONS_KEY)
      return
    }
    const deduped = Array.from(new Set(list.filter(Boolean)))
    permissions.value = deduped
    permissionsLoaded.value = true
    localStorage.setItem(PERMISSIONS_KEY, JSON.stringify(deduped))
  }

  /**
   * v1.2：拉取当前登录人的有效权限码。
   * - 首选 GET /auth/my-permissions（任意角色可用，含 merchant/courier）
   * - 失败回落 /auth/profile 已下发的 effectivePermissions
   * - 都拿不到时保持「未加载」，门控回落角色判定，不锁站
   */
  async function loadMyPermissions(): Promise<string[]> {
    try {
      const data = await authApi.myPermissions()
      const list = data?.permissions ?? data?.effectivePermissions ?? []
      setPermissions(Array.isArray(list) ? list : [])
      // v1.3：同步管理端身份字段，避免 profile 与 my-permissions 不一致导致门控打架
      const workspace = data?.adminWorkspace
      const codes = data?.roleCodes
      if (workspace !== undefined || (Array.isArray(codes) && codes.length)) {
        patchProfile({
          ...(workspace !== undefined ? { adminWorkspace: workspace } : {}),
          ...(Array.isArray(codes) && codes.length ? { roleCodes: codes } : {})
        })
      }
      return permissions.value
    } catch {
      const fallback = profile.value?.effectivePermissions
      // 后端已在 profile 下发过集合（含空数组）→ 视为已加载，按真实值严格判定
      if (Array.isArray(fallback)) {
        setPermissions(fallback)
        return permissions.value
      }
      // 未拉到：保留本地缓存（若有），但标记为未加载 → 门控 fail-open
      permissionsLoaded.value = false
      return permissions.value
    }
  }

  /**
   * 权限码判定（v1.3 口径：effectivePermissions 为唯一依据）。
   * - 未传码 → 放行（该页面/按钮未纳入门控）
   * - platform_admin → 放行（与后端对超管的放行口径一致）
   * - 权限未加载 → 放行（接口失败时降级为角色控制，防整站锁死）
   * - 命中 → 放行
   * - property_admin 兜底放行（文档口径为全量菜单；缺码视为后端预设未配全，避免把物业管理员锁在门外）
   * - 其余（活动组长 / 统筹 / 板块 / 个体等标签身份）→ 必须命中，空数组即全部拒绝
   */
  function hasPermission(code?: string | null): boolean {
    if (!code) return true
    if (isPlatformAdmin(profile.value)) return true
    if (!permissionsLoaded.value) return true
    if (permissions.value.includes(code)) return true
    const identityRole = normalizeAdminIdentity(profile.value).role
    if (identityRole === USER_ROLE.PROPERTY_ADMIN) return true
    // v2：社区管理员默认持有 community:read / community:manage（文档 §4 明文），
    // 后端预设未下发时按默认口径放行社区模块，避免该角色登录即落 403（落地页就是社区论坛）。
    if (identityRole === USER_ROLE.COMMUNITY_ADMIN && code.startsWith('community:')) return true
    return false
  }

  /**
   * v2：严格权限码判定，用于「跨工作台开放入口」这种高风险场景。
   *
   * 与 hasPermission 的差别只有两点（都是收紧）：
   * - 权限未加载 → 拒绝（而不是放行），避免接口失败时把管理端入口误开给标签身份；
   * - 仍然保留 platform_admin / property_admin 的全量放行口径。
   *
   * 为什么需要两个函数：菜单渲染用 hasPermission（宁可多显示，后端兜底），
   * 路由守卫的权限放行通道用 hasPermissionStrict（宁可少放行，防止越权进入）。
   */
  function hasPermissionStrict(code?: string | null): boolean {
    if (!code) return true
    if (isPlatformAdmin(profile.value)) return true
    const identityRole = normalizeAdminIdentity(profile.value).role
    if (identityRole === USER_ROLE.PROPERTY_ADMIN) return true
    if (identityRole === USER_ROLE.COMMUNITY_ADMIN && code.startsWith('community:')) return true
    if (!permissionsLoaded.value) return false
    return permissions.value.includes(code)
  }

  /**
   * v1.3：是否具备管理端工作台身份。
   * 仅在 profile.adminWorkspace 明确为 false 时判定为否；缺失（老环境未下发）按放行处理，
   * 避免升级瞬间把全部管理员挡在 403。
   */
  function canEnterAdminWorkspace(): boolean {
    return profile.value?.adminWorkspace !== false
  }

  /** v1.3：有效角色码集合（优先后端 roleCodes，其次本地标签派生） */
  function roleCodes(): string[] {
    const fromServer = profile.value?.roleCodes
    if (Array.isArray(fromServer) && fromServer.length) return fromServer
    return getEffectiveRoles(profile.value)
  }

  /**
   * v8.11：探测当前登录人是否为在职物业经理。
   * 后端 /auth/profile 暂未返回 isPropertyManager，故调用 GET /property-managers/my：
   * - 成功 → 标记为经理并回填 propertyManagerId（用于菜单/路由入口）
   * - 91005（非经理）/ 91007（身份已停用）→ 标记为非经理
   * - 其他错误（网络/权限等）→ 保持未探测，允许下次重试
   */
  async function probePropertyManager(force = false) {
    if (propertyManagerProbed.value && !force) return
    // 非住户（或 profile 尚未就绪）不探测，也不标记，待角色就绪后再触发
    if (profile.value?.role !== USER_ROLE.RESIDENT) return
    try {
      const info = await propertyManagerPortalApi.my()
      patchProfile({
        isPropertyManager: true,
        propertyManagerId: info.propertyManagerId || profile.value?.propertyManagerId
      })
      propertyManagerProbed.value = true
    } catch (error) {
      if (error instanceof ApiError && (error.code === 91005 || error.code === 91007)) {
        patchProfile({ isPropertyManager: false, propertyManagerId: null })
        propertyManagerProbed.value = true
      }
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
        // v1.3：profile 已下发权限码时先落一份，避免随后 /auth/my-permissions 失败导致门控 fail-open
        if (Array.isArray(detail.effectivePermissions)) {
          setPermissions(detail.effectivePermissions)
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

    // v1.2：登录后立即拉权限码（任意角色可用；profile 对 merchant/courier 会 20004）
    await loadMyPermissions()

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
    propertyManagerProbed.value = false
    setPermissions(null)
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
    propertyManagerProbed,
    permissions,
    permissionsLoaded,
    hasPermission,
    hasPermissionStrict,
    canEnterAdminWorkspace,
    roleCodes,
    loadMyPermissions,
    login,
    logout,
    setPropertyCompanyId,
    patchProfile,
    probePropertyManager
  }
})
