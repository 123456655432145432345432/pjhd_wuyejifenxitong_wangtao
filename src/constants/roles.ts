import { PROPERTY_SUB_ROLE, USER_ROLE } from './enums'
import {
  activityLeaderMenus,
  adminMenus,
  buildingLeaderMenus,
  coordinatorMenus,
  courierMenus,
  individualLeaderMenus,
  merchantMenus,
  PLATFORM_ADMIN_ONLY_ROUTES,
  PROPERTY_LEADER_ONLY_ROUTES,
  propertyOperatorMenus,
  residentMenus,
  sectorLeaderMenus,
  technicianMenus,
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
  [USER_ROLE.INDIVIDUAL_LEADER]: individualLeaderMenus,
  [USER_ROLE.ACTIVITY_LEADER]: activityLeaderMenus,
  [USER_ROLE.TECHNICIAN]: technicianMenus,
  [USER_ROLE.RESIDENT]: residentMenus
}

const PORTAL_SUBTITLE: Record<string, string> = {
  [USER_ROLE.PLATFORM_ADMIN]: '管理后台',
  [USER_ROLE.PROPERTY_ADMIN]: '管理后台',
  [USER_ROLE.MERCHANT]: '商家工作台',
  [USER_ROLE.COURIER]: '配送工作台',
  [USER_ROLE.COORDINATOR]: '统筹工作台',
  [USER_ROLE.SECTOR_LEADER]: '板块工作台',
  [USER_ROLE.INDIVIDUAL_LEADER]: '个体工作台',
  [USER_ROLE.ACTIVITY_LEADER]: '活动组工作台',
  [USER_ROLE.TECHNICIAN]: '技工工作台',
  [USER_ROLE.RESIDENT]: '住户端'
}

/** 归一化 property_sub_role 取值（兼容大小写 / 简写 / 连字符） */
export function normalizePropertySubRole(raw?: string | null): string | undefined {
  if (raw == null) return undefined
  const value = String(raw).trim().toLowerCase().replace(/-/g, '_')
  if (!value) return undefined
  if (
    value === PROPERTY_SUB_ROLE.LEADER ||
    value === 'leader' ||
    value === 'propertyleader'
  ) {
    return PROPERTY_SUB_ROLE.LEADER
  }
  if (
    value === PROPERTY_SUB_ROLE.OPERATOR ||
    value === 'operator' ||
    value === 'propertyoperator'
  ) {
    return PROPERTY_SUB_ROLE.OPERATOR
  }
  return value
}

/**
 * 从登录/资料响应中尽量解析子角色（扁平字段、嵌套 resident、JWT claim）
 */
export function extractPropertySubRole(source?: unknown): string | undefined {
  if (!source || typeof source !== 'object') return undefined
  const obj = source as Record<string, unknown>
  const direct =
    obj.propertySubRole ??
    obj.property_sub_role ??
    obj.subRole ??
    obj.sub_role
  const nested =
    obj.resident && typeof obj.resident === 'object'
      ? extractPropertySubRole(obj.resident)
      : undefined
  const fromUser =
    obj.user && typeof obj.user === 'object' ? extractPropertySubRole(obj.user) : undefined
  return (
    normalizePropertySubRole(typeof direct === 'string' ? direct : null) ||
    nested ||
    fromUser
  )
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
  const sub = normalizePropertySubRole(profile?.propertySubRole)
  return {
    role: rawRole,
    // null / '' 一律视为未设置，不算 property_leader
    propertySubRole: sub
  }
}

/** 是否为物业操作员（整模块不含价格审批等领导能力） */
export function isPropertyOperator(profile?: Pick<UserProfile, 'role' | 'propertySubRole'> | null): boolean {
  if (!profile) return false
  // 历史兼容：极少数把子角色写成主角色
  if (profile.role === PROPERTY_SUB_ROLE.OPERATOR) return true
  const { role, propertySubRole } = normalizeAdminIdentity(profile)
  return role === USER_ROLE.PROPERTY_ADMIN && propertySubRole === PROPERTY_SUB_ROLE.OPERATOR
}

export function isPlatformAdmin(profile?: Pick<UserProfile, 'role' | 'propertySubRole'> | null): boolean {
  return (profile?.role || normalizeAdminIdentity(profile).role) === USER_ROLE.PLATFORM_ADMIN
}

/**
 * 物业领导：property_admin + property_leader
 * 兼容：极少数历史 JWT 把 role 写成 property_leader
 */
export function isPropertyLeader(profile?: Pick<UserProfile, 'role' | 'propertySubRole'> | null): boolean {
  if (!profile) return false
  if (profile.role === PROPERTY_SUB_ROLE.LEADER) return true
  const { role, propertySubRole } = normalizeAdminIdentity(profile)
  return role === USER_ROLE.PROPERTY_ADMIN && propertySubRole === PROPERTY_SUB_ROLE.LEADER
}

/** 显示「价格审批」菜单/路由：平台管理员或物业领导 */
export function canAccessPriceApprovalModule(
  profile?: Pick<UserProfile, 'role' | 'propertySubRole'> | null
): boolean {
  return isPlatformAdmin(profile) || isPropertyLeader(profile)
}

/** 显示「发起申请」：与板块准入一致 */
export function canCreatePriceApproval(
  profile?: Pick<UserProfile, 'role' | 'propertySubRole'> | null
): boolean {
  return canAccessPriceApprovalModule(profile)
}

/**
 * 显示「通过/拒绝」并调审批接口：仅物业领导
 * - platform_admin ❌（调 PUT → 20004）
 * - property_admin + property_leader ✅
 * - property_admin + property_operator ❌
 */
export function canAuditPriceApproval(
  profile?: Pick<UserProfile, 'role' | 'propertySubRole'> | null
): boolean {
  return isPropertyLeader(profile)
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
    case USER_ROLE.ACTIVITY_LEADER:
      return 'activity-leader-overview'
    case USER_ROLE.TECHNICIAN:
      return 'technician-overview'
    case USER_ROLE.RESIDENT:
      return 'resident-shop'
    // 过渡期兼容：SQL 回滚前旧 JWT 仍为 building_leader，直接进楼长工作台
    case USER_ROLE.BUILDING_LEADER:
      return 'building-leader-overview'
    case USER_ROLE.PLATFORM_ADMIN:
    case USER_ROLE.PROPERTY_ADMIN:
    default:
      return 'dashboard'
  }
}

function filterAdminMenusForRole(role: string, propertySubRole?: string): Menu[] {
  const identity = { role, propertySubRole }
  // 仅 property_leader 用领导菜单；operator / subRole 为空走操作员菜单
  let menus =
    role === USER_ROLE.PROPERTY_ADMIN && !isPropertyLeader(identity)
      ? [...propertyOperatorMenus]
      : [...adminMenus]

  if (role === USER_ROLE.PROPERTY_ADMIN) {
    menus = menus.filter(
      (m) => !(PLATFORM_ADMIN_ONLY_ROUTES as readonly string[]).includes(m.route)
    )
  }

  if (role === USER_ROLE.PLATFORM_ADMIN) {
    menus = menus.filter((m) => m.route !== 'transfer-accounts')
  }

  // 价格审批：必须用 canAccessPriceApprovalModule，禁止仅按 role===property_admin
  const priceItem = adminMenus.find((m) => m.route === 'price-approvals')
  const hasPrice = menus.some((m) => m.route === 'price-approvals')
  const allowPrice = canAccessPriceApprovalModule(identity)
  if (allowPrice && !hasPrice && priceItem) {
    const merchantIdx = menus.findIndex((m) => m.route === 'merchant')
    const insertAt = merchantIdx >= 0 ? merchantIdx + 1 : menus.length
    menus = [...menus.slice(0, insertAt), priceItem, ...menus.slice(insertAt)]
  } else if (!allowPrice && hasPrice) {
    menus = menus.filter((m) => m.route !== 'price-approvals')
  }

  return menus
}

export function getMenusForRole(
  role?: string | null,
  propertySubRole?: string | null,
  options?: { isBuildingLeader?: boolean | null }
): Menu[] {
  const { role: normalizedRole, propertySubRole: sub } = normalizeAdminIdentity({
    role: role || '',
    propertySubRole: propertySubRole || undefined
  })
  if (!normalizedRole) return adminMenus
  if (normalizedRole === USER_ROLE.PLATFORM_ADMIN || normalizedRole === USER_ROLE.PROPERTY_ADMIN) {
    return filterAdminMenusForRole(normalizedRole, sub)
  }
  // v8.9：楼长为「住户+楼长」复合身份，登录 role=resident，
  // 凭 isBuildingLeader 在住户菜单前动态插入楼长工作台
  if (normalizedRole === USER_ROLE.RESIDENT) {
    const base = ROLE_MENUS[normalizedRole] || residentMenus
    return options?.isBuildingLeader ? [...buildingLeaderMenus, ...base] : base
  }
  // 过渡期兼容：SQL 回滚前旧 JWT 仍为 building_leader，展示楼长+住户菜单
  if (normalizedRole === USER_ROLE.BUILDING_LEADER) {
    return [...buildingLeaderMenus, ...residentMenus]
  }
  return ROLE_MENUS[normalizedRole] || adminMenus
}

export function getMenusForProfile(
  profile?: Pick<UserProfile, 'role' | 'propertySubRole' | 'isBuildingLeader'> | null
): Menu[] {
  const { role, propertySubRole } = normalizeAdminIdentity(profile)
  return getMenusForRole(role, propertySubRole, {
    isBuildingLeader: profile?.isBuildingLeader === true
  })
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

/**
 * 路由是否仅领导可进（参数配置 / 权限 / 操作员管理 / 价格审批等）
 * - 价格审批：平台管理员 + 物业领导
 * - 其余领导专属：平台管理员或物业领导（操作员不可进）
 */
export function canAccessLeaderOnlyRoute(
  profile?: Pick<UserProfile, 'role' | 'propertySubRole'> | null,
  routeName?: string | null
): boolean {
  if (!routeName || !(PROPERTY_LEADER_ONLY_ROUTES as readonly string[]).includes(routeName)) {
    return true
  }
  if (routeName === 'price-approvals') {
    return canAccessPriceApprovalModule(profile)
  }
  return isPlatformAdmin(profile) || isPropertyLeader(profile)
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
