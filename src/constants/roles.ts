import { getUserRoleDisplayLabel, PROPERTY_SUB_ROLE, USER_ROLE } from './enums'
import {
  activityLeaderMenus,
  adminMenus,
  buildingLeaderMenus,
  communityAdminMenus,
  coordinatorMenus,
  courierMenus,
  individualLeaderMenus,
  merchantMenus,
  PLATFORM_ADMIN_ONLY_ROUTES,
  PROPERTY_LEADER_ONLY_ROUTES,
  propertyManagerMenus,
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
  [USER_ROLE.COMMUNITY_ADMIN]: communityAdminMenus,
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
  [USER_ROLE.COMMUNITY_ADMIN]: '社区管理台',
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
    // v2：社区管理员默认只有社区论坛权限，落地页直接进社区论坛，
    // 避免落到 dashboard（data:view）时因缺码被拦到 403。
    case USER_ROLE.COMMUNITY_ADMIN:
      return 'community-forum'
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

/**
 * v8.13+ 负责人 / 组长标签画像
 * residents.role 恒为 resident，身份由业务表 active 记录派生的布尔标签表达。
 */
export type LeaderTagProfile = Pick<
  UserProfile,
  | 'role'
  | 'isBuildingLeader'
  | 'isPropertyManager'
  | 'isCoordinator'
  | 'isSectorLeader'
  | 'isIndividualLeader'
  | 'isActivityLeader'
  | 'isResidentMerchant'
  | 'isDistributor'
> | null | undefined

/** 标签 → 历史 role 值。用于在不改动既有 role 判断体系的前提下复用菜单/路由/权限 */
export const LEADER_TAG_ROLES: { tag: keyof NonNullable<LeaderTagProfile>; role: string }[] = [
  { tag: 'isCoordinator', role: USER_ROLE.COORDINATOR },
  { tag: 'isSectorLeader', role: USER_ROLE.SECTOR_LEADER },
  { tag: 'isIndividualLeader', role: USER_ROLE.INDIVIDUAL_LEADER },
  { tag: 'isActivityLeader', role: USER_ROLE.ACTIVITY_LEADER }
]

/** v8.13+：由标签派生出的历史角色值（去重，标签为 true 才有） */
export function getLeaderTagRoles(profile?: LeaderTagProfile): string[] {
  if (!profile) return []
  const obj = profile as Record<string, unknown>
  const derived: string[] = []
  for (const { tag, role } of LEADER_TAG_ROLES) {
    if (obj[tag] === true) derived.push(role)
  }
  return derived
}

/**
 * v8.13+：当前用户「有效角色」集合 = 真实 role + 标签派生的历史角色。
 * 迁移后负责人 role 变为 resident，路由 meta / 菜单仍按历史 role 配置，
 * 用本函数补回派生角色即可，无需逐处改动既有判断。
 */
export function getEffectiveRoles(profile?: LeaderTagProfile): string[] {
  const { role } = normalizeAdminIdentity(profile)
  const list = role ? [role] : []
  for (const derived of getLeaderTagRoles(profile)) {
    if (!list.includes(derived)) list.push(derived)
  }
  return list
}

/** 多角色版路由准入（兼容 property_leader / property_operator 归一化） */
export function canAccessRouteAny(
  roles: string[] | undefined | null,
  allowedRoles?: string[]
): boolean {
  if (!allowedRoles?.length) return true
  if (!roles?.length) return false
  return roles.some((role) => canAccessRoute(role, allowedRoles))
}

/** v8.13+：按「标签优先、role 回落」解析落地工作台 */
export function getHomeRouteForProfile(profile?: LeaderTagProfile): string {
  const { role } = normalizeAdminIdentity(profile)
  // 管理员身份不看标签，直接回落原逻辑
  if (role === USER_ROLE.PLATFORM_ADMIN || role === USER_ROLE.PROPERTY_ADMIN) {
    return getRoleHomeRoute(role)
  }
  const derived = getLeaderTagRoles(profile)
  if (derived.length) return getRoleHomeRoute(derived[0])
  // 楼长 / 物业经理沿用 v8.9 / v8.11 既有口径：落住户端，靠菜单插入进入工作台
  return getRoleHomeRoute(role)
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
  options?: {
    isBuildingLeader?: boolean | null
    isPropertyManager?: boolean | null
    isCoordinator?: boolean | null
    isSectorLeader?: boolean | null
    isIndividualLeader?: boolean | null
    isActivityLeader?: boolean | null
  }
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
  // v8.13/v8.14：统筹 / 板块 / 个体负责人、活动组组长同为此模式，role 恒为 resident
  if (normalizedRole === USER_ROLE.RESIDENT) {
    const base = ROLE_MENUS[normalizedRole] || residentMenus
    // v8.11：物业经理同为「住户 + 经理」复合身份，可与楼长身份叠加
    const prefix: Menu[] = [
      ...(options?.isPropertyManager ? propertyManagerMenus : []),
      ...(options?.isCoordinator ? coordinatorMenus : []),
      ...(options?.isSectorLeader ? sectorLeaderMenus : []),
      ...(options?.isIndividualLeader ? individualLeaderMenus : []),
      ...(options?.isActivityLeader ? activityLeaderMenus : []),
      ...(options?.isBuildingLeader ? buildingLeaderMenus : [])
    ]
    return prefix.length ? [...prefix, ...base] : base
  }
  // 过渡期兼容：SQL 回滚前旧 JWT 仍为 building_leader，展示楼长+住户菜单
  if (normalizedRole === USER_ROLE.BUILDING_LEADER) {
    return [...buildingLeaderMenus, ...residentMenus]
  }
  return ROLE_MENUS[normalizedRole] || adminMenus
}

export function getMenusForProfile(
  profile?: Pick<
    UserProfile,
    | 'role'
    | 'propertySubRole'
    | 'isBuildingLeader'
    | 'isPropertyManager'
    | 'isCoordinator'
    | 'isSectorLeader'
    | 'isIndividualLeader'
    | 'isActivityLeader'
  > | null
): Menu[] {
  const { role, propertySubRole } = normalizeAdminIdentity(profile)
  return getMenusForRole(role, propertySubRole, {
    isBuildingLeader: profile?.isBuildingLeader === true,
    isPropertyManager: profile?.isPropertyManager === true,
    isCoordinator: profile?.isCoordinator === true,
    isSectorLeader: profile?.isSectorLeader === true,
    isIndividualLeader: profile?.isIndividualLeader === true,
    isActivityLeader: profile?.isActivityLeader === true
  })
}

export function getPortalSubtitle(role?: string | null): string {
  if (!role) return '管理后台'
  if (role === PROPERTY_SUB_ROLE.LEADER || role === PROPERTY_SUB_ROLE.OPERATOR) {
    return PORTAL_SUBTITLE[USER_ROLE.PROPERTY_ADMIN]
  }
  return PORTAL_SUBTITLE[role] || '工作台'
}

/**
 * 复合身份标签文案表。
 * v8.13+：负责人 / 楼长 / 经理 / 店主 / 分销商的 role 恒为 resident，
 * 真实身份只能由布尔标签表达，因此展示层需要把标签拼到基础角色之后。
 * 顺序与 getMenusForRole 的菜单前缀保持一致（经理 → 统筹 → 板块 → 个体 → 活动组 → 楼长），
 * 商家类标签排后，保证「头部身份」与「侧边栏菜单」读起来是同一个顺序。
 */
export const IDENTITY_TAG_LABELS: { tag: keyof NonNullable<LeaderTagProfile>; label: string }[] = [
  { tag: 'isPropertyManager', label: '物业经理' },
  { tag: 'isCoordinator', label: '统筹负责人' },
  { tag: 'isSectorLeader', label: '板块负责人' },
  { tag: 'isIndividualLeader', label: '个体负责人' },
  { tag: 'isActivityLeader', label: '活动组组长' },
  { tag: 'isBuildingLeader', label: '楼长' },
  { tag: 'isResidentMerchant', label: '业主商家' },
  { tag: 'isDistributor', label: '分销商' }
]

/** 当前用户命中的复合身份标签（仅 true 才计入，缺失/undefined 一律不算） */
export function getIdentityTagLabels(profile?: LeaderTagProfile): string[] {
  if (!profile) return []
  const obj = profile as Record<string, unknown>
  return IDENTITY_TAG_LABELS.filter(({ tag }) => obj[tag] === true).map(({ label }) => label)
}

/**
 * 展示用复合身份文案，如「住户 · 楼长 · 统筹负责人」。
 * - platform_admin / property_admin：沿用 getUserRoleDisplayLabel（物业领导 / 物业管理员），无标签即单身份
 * - resident：基础「住户」+ 命中标签，按 IDENTITY_TAG_LABELS 顺序拼接
 * - 过渡期 role=building_leader：基础已是「楼长」，与标签重复项自动去重
 * - 角色文案为空时不拼接，避免出现「· 楼长」这种残缺串
 */
export function getIdentityDisplayLabel(
  profile?: (LeaderTagProfile & Pick<UserProfile, 'propertySubRole'>) | null
): string {
  if (!profile) return ''
  const { role, propertySubRole } = normalizeAdminIdentity(profile)
  const base = getUserRoleDisplayLabel(role, propertySubRole)
  const tags = getIdentityTagLabels(profile)
  if (!tags.length) return base
  const parts: string[] = []
  for (const part of [base, ...tags]) {
    if (part && !parts.includes(part)) parts.push(part)
  }
  return parts.join(' · ')
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
