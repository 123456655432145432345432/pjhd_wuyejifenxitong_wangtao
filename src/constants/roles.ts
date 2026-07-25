import { PROPERTY_SUB_ROLE, USER_ROLE } from './enums'
import {
  adminMenus,
  coordinatorMenus,
  courierMenus,
  individualLeaderMenus,
  merchantMenus,
  PLATFORM_ADMIN_ONLY_ROUTES,
  PROPERTY_LEADER_ONLY_ROUTES,
  propertyOperatorMenus,
  sectorLeaderMenus,
  type Menu
} from './menus'
import type { UserProfile } from '../api/types'

export const ADMIN_ROLES = [USER_ROLE.PLATFORM_ADMIN, USER_ROLE.PROPERTY_ADMIN] as const

const ROLE_MENUS: Record<string, Menu[]> = {
  [USER_ROLE.PLATFORM_ADMIN]: adminMenus,
  [USER_ROLE.PROPERTY_ADMIN]: adminMenus,
  [USER_ROLE.MERCHANT]: merchantMenus,
  [USER_ROLE.COURIER]: courierMenus,
  [USER_ROLE.COORDINATOR]: coordinatorMenus,
  [USER_ROLE.SECTOR_LEADER]: sectorLeaderMenus,
  [USER_ROLE.INDIVIDUAL_LEADER]: individualLeaderMenus
}

const PORTAL_SUBTITLE: Record<string, string> = {
  [USER_ROLE.PLATFORM_ADMIN]: '管理后台',
  [USER_ROLE.PROPERTY_ADMIN]: '管理后台',
  [USER_ROLE.MERCHANT]: '商家工作台',
  [USER_ROLE.COURIER]: '配送工作台',
  [USER_ROLE.COORDINATOR]: '统筹工作台',
  [USER_ROLE.SECTOR_LEADER]: '板块工作台',
  [USER_ROLE.INDIVIDUAL_LEADER]: '个体工作台'
}

/** 兼容：旧 token 把子角色当成主角色返回 */
export function normalizeAdminIdentity(profile?: Pick<UserProfile, 'role' | 'propertySubRole'> | null): {
  role: string | undefined
  propertySubRole: string | undefined
} {
  const rawRole = profile?.role || undefined
  if (rawRole === PROPERTY_SUB_ROLE.LEADER) {
    return { role: USER_ROLE.PROPERTY_ADMIN, propertySubRole: PROPERTY_SUB_ROLE.LEADER }
  }
  if (rawRole === PROPERTY_SUB_ROLE.OPERATOR) {
    return { role: USER_ROLE.PROPERTY_ADMIN, propertySubRole: PROPERTY_SUB_ROLE.OPERATOR }
  }
  return {
    role: rawRole,
    propertySubRole: profile?.propertySubRole || undefined
  }
}

/** 是否为物业操作员（无参数配置 / 权限分配等） */
export function isPropertyOperator(profile?: Pick<UserProfile, 'role' | 'propertySubRole'> | null): boolean {
  const { role, propertySubRole } = normalizeAdminIdentity(profile)
  return role === USER_ROLE.PROPERTY_ADMIN && propertySubRole === PROPERTY_SUB_ROLE.OPERATOR
}

/**
 * 是否具备物业领导级权限（参数配置、权限分配、人员管理）
 * - 平台管理员视为具备
 * - property_admin 且子角色为领导，或未下发子角色（兼容旧账号）
 */
export function isPropertyLeader(profile?: Pick<UserProfile, 'role' | 'propertySubRole'> | null): boolean {
  const { role, propertySubRole } = normalizeAdminIdentity(profile)
  if (role === USER_ROLE.PLATFORM_ADMIN) return true
  if (role !== USER_ROLE.PROPERTY_ADMIN) return false
  if (propertySubRole === PROPERTY_SUB_ROLE.OPERATOR) return false
  return true
}

export function getRoleHomeRoute(role?: string | null): string {
  const normalized =
    role === PROPERTY_SUB_ROLE.LEADER || role === PROPERTY_SUB_ROLE.OPERATOR
      ? USER_ROLE.PROPERTY_ADMIN
      : role
  switch (normalized) {
    case USER_ROLE.MERCHANT:
      return 'merchant-overview'
    case USER_ROLE.COURIER:
      return 'courier-overview'
    case USER_ROLE.COORDINATOR:
      return 'coordinator-overview'
    case USER_ROLE.SECTOR_LEADER:
      return 'sector-leader-overview'
    case USER_ROLE.INDIVIDUAL_LEADER:
      return 'individual-leader-overview'
    case USER_ROLE.PLATFORM_ADMIN:
    case USER_ROLE.PROPERTY_ADMIN:
    default:
      return 'dashboard'
  }
}

function filterAdminMenusForRole(role: string, propertySubRole?: string): Menu[] {
  let menus = role === USER_ROLE.PROPERTY_ADMIN && propertySubRole === PROPERTY_SUB_ROLE.OPERATOR
    ? propertyOperatorMenus
    : adminMenus

  if (role === USER_ROLE.PROPERTY_ADMIN) {
    menus = menus.filter(
      (m) => !(PLATFORM_ADMIN_ONLY_ROUTES as readonly string[]).includes(m.route)
    )
  }
  return menus
}

export function getMenusForRole(
  role?: string | null,
  propertySubRole?: string | null
): Menu[] {
  const { role: normalizedRole, propertySubRole: sub } = normalizeAdminIdentity({
    role: role || '',
    propertySubRole: propertySubRole || undefined
  })
  if (!normalizedRole) return adminMenus
  if (normalizedRole === USER_ROLE.PLATFORM_ADMIN || normalizedRole === USER_ROLE.PROPERTY_ADMIN) {
    return filterAdminMenusForRole(normalizedRole, sub)
  }
  return ROLE_MENUS[normalizedRole] || adminMenus
}

export function getMenusForProfile(profile?: Pick<UserProfile, 'role' | 'propertySubRole'> | null): Menu[] {
  const { role, propertySubRole } = normalizeAdminIdentity(profile)
  return getMenusForRole(role, propertySubRole)
}

export function getPortalSubtitle(role?: string | null): string {
  if (!role) return '管理后台'
  if (role === PROPERTY_SUB_ROLE.LEADER || role === PROPERTY_SUB_ROLE.OPERATOR) {
    return PORTAL_SUBTITLE[USER_ROLE.PROPERTY_ADMIN]
  }
  return PORTAL_SUBTITLE[role] || '工作台'
}

export function canAccessRoute(role: string | undefined | null, allowedRoles?: string[]): boolean {
  if (!allowedRoles?.length) return true
  if (!role) return false
  const normalized =
    role === PROPERTY_SUB_ROLE.LEADER || role === PROPERTY_SUB_ROLE.OPERATOR
      ? USER_ROLE.PROPERTY_ADMIN
      : role
  return allowedRoles.includes(normalized) || allowedRoles.includes(role)
}

/** 路由是否仅领导可进（参数配置 / 权限 / 操作员管理） */
export function canAccessLeaderOnlyRoute(
  profile?: Pick<UserProfile, 'role' | 'propertySubRole'> | null,
  routeName?: string | null
): boolean {
  if (!routeName || !(PROPERTY_LEADER_ONLY_ROUTES as readonly string[]).includes(routeName)) {
    return true
  }
  return isPropertyLeader(profile)
}

export function isAdminRole(role?: string | null): boolean {
  if (!role) return false
  if (role === PROPERTY_SUB_ROLE.LEADER || role === PROPERTY_SUB_ROLE.OPERATOR) return true
  return role === USER_ROLE.PLATFORM_ADMIN || role === USER_ROLE.PROPERTY_ADMIN
}

/** GET /auth/profile 仅以下角色可调用 */
export const PROFILE_API_ROLES = [
  USER_ROLE.RESIDENT,
  USER_ROLE.PROPERTY_ADMIN,
  USER_ROLE.PLATFORM_ADMIN
] as const

export function canUseProfileApi(role?: string | null): boolean {
  if (!role) return false
  if (role === PROPERTY_SUB_ROLE.LEADER || role === PROPERTY_SUB_ROLE.OPERATOR) return true
  return (PROFILE_API_ROLES as readonly string[]).includes(role)
}
