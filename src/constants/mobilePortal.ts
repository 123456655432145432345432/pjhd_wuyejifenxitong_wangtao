import type { UserProfile } from '../api/types'
import { USER_ROLE } from './enums'
import type { Menu } from './menus'
import { getMenusForProfile, getPortalSubtitle, normalizeAdminIdentity } from './roles'

export type MobileTabKey = 'home' | 'workbench' | 'profile'

export interface MobileWorkbenchItem {
  name: string
  icon: string
  route: string
  description?: string
  firstBatchOptimize?: boolean
}

export interface MobileWorkbenchSection {
  title: string
  items: MobileWorkbenchItem[]
}

export interface MobilePortalConfig {
  role: string
  portalTitle: string
  homeTitle: string
  homeSubtitle: string
  homeFocusCards: { title: string; description: string }[]
  quickActions: MobileWorkbenchItem[]
  workbenchSections: MobileWorkbenchSection[]
}

/** 管理端手工分组（保证高频入口优先，再按权限过滤） */
const ADMIN_WORKBENCH_BASE: MobileWorkbenchSection[] = [
  {
    title: '审批与运营',
    items: [
      { name: '商家入驻审核', icon: 'merchant', route: 'merchant-onboarding-approval', firstBatchOptimize: true },
      { name: '积分审批', icon: 'points', route: 'merchant-point-approval', firstBatchOptimize: true },
      { name: '商家提现审批', icon: 'wallet', route: 'merchant-withdrawal-approval', firstBatchOptimize: true },
      { name: '配送员提现审批', icon: 'wallet', route: 'role-withdrawal-approval', firstBatchOptimize: true },
      { name: '物业币提现审批', icon: 'coin', route: 'coin-withdrawal-approval', firstBatchOptimize: true },
      { name: '价格审批', icon: 'wallet', route: 'price-approvals', firstBatchOptimize: true },
      { name: '楼栋变更审批', icon: 'home', route: 'building-change-approvals' },
      { name: '退货审批', icon: 'wallet', route: 'order-refund-approvals', firstBatchOptimize: true },
      { name: '通告发布', icon: 'notice', route: 'notice', firstBatchOptimize: true },
      { name: '定向推送', icon: 'target', route: 'directed-message' }
    ]
  },
  {
    title: '基础管理',
    items: [
      { name: '数据大盘', icon: 'dashboard', route: 'dashboard' },
      { name: '住户管理', icon: 'resident', route: 'resident', firstBatchOptimize: true },
      { name: '商家管理', icon: 'merchant', route: 'merchant', firstBatchOptimize: true },
      { name: '社区食堂', icon: 'merchant', route: 'canteen-manage' },
      { name: '积分管理', icon: 'points', route: 'points' },
      { name: '送货管理', icon: 'delivery', route: 'delivery' },
      { name: '社区论坛', icon: 'notice', route: 'community-forum' },
      { name: '板块负责人', icon: 'people', route: 'sector-leaders' },
      { name: '一级代理', icon: 'people', route: 'individual-leaders' },
      { name: '业主商户（分销）', icon: 'merchant', route: 'resident-merchants' },
      { name: '商家广告设置', icon: 'retail', route: 'merchant-ad-settings' },
      { name: '物业联系方式', icon: 'notice', route: 'property-contact' }
    ]
  },
  {
    title: '组织与配置',
    items: [
      { name: '社区绑定', icon: 'home', route: 'community-entity' },
      { name: '物业操作员', icon: 'people', route: 'property-operators' },
      { name: '权限配置', icon: 'permission', route: 'permission' },
      { name: '参数配置', icon: 'param', route: 'param' },
      { name: '快递负责人', icon: 'people', route: 'courier-managers' },
      { name: '业务角色账号', icon: 'people', route: 'role-accounts' },
      { name: '公司账户', icon: 'money', route: 'company-account' },
      { name: '分成账户', icon: 'wallet', route: 'settlement-account' },
      { name: '分成明细', icon: 'history', route: 'distribution-records' },
      { name: '分成统计', icon: 'chart', route: 'distribution-stats' },
      { name: '收款账户', icon: 'bank', route: 'cbk-accounts' },
      { name: '分账对账台', icon: 'history', route: 'cbk-reconcile' },
      { name: '平台分成配置', icon: 'money', route: 'platform-share-config' },
      { name: '平台收益', icon: 'chart', route: 'platform-earnings' }
    ]
  }
]

interface RoleHomeMeta {
  homeTitle: string
  homeSubtitle: string
  homeFocusCards?: { title: string; description: string }[]
  quickRouteNames?: string[]
}

const ROLE_HOME_META: Record<string, RoleHomeMeta> = {
  [USER_ROLE.PLATFORM_ADMIN]: {
    homeTitle: '平台工作首页',
    homeSubtitle: '优先处理平台经营与审核高频任务',
    homeFocusCards: [],
    quickRouteNames: ['platform-earnings', 'platform-share-config', 'price-approvals', 'merchant']
  },
  [USER_ROLE.PROPERTY_ADMIN]: {
    homeTitle: '物业工作首页',
    homeSubtitle: '优先处理待办审批与社区运营高频任务',
    homeFocusCards: [],
    // 价格审批仅 property_leader / platform_admin；操作员无菜单时会跳过
    quickRouteNames: ['price-approvals', 'merchant-point-approval', 'merchant-withdrawal-approval', 'coin-withdrawal-approval']
  },
  [USER_ROLE.MERCHANT]: {
    homeTitle: '商家工作首页',
    homeSubtitle: '处理订单、商品与积分提现',
    homeFocusCards: [],
    quickRouteNames: ['merchant-orders', 'merchant-products', 'merchant-posts', 'merchant-keywords']
  },
  [USER_ROLE.COURIER]: {
    homeTitle: '配送工作首页',
    homeSubtitle: '抢单、送单与提现记录',
    homeFocusCards: [],
    quickRouteNames: ['courier-available', 'courier-tasks', 'courier-overview', 'courier-withdrawals']
  },
  [USER_ROLE.COORDINATOR]: {
    homeTitle: '统筹工作首页',
    homeSubtitle: '商家协同、公告推送与分成查看',
    homeFocusCards: [],
    quickRouteNames: [
      'coordinator-merchants',
      'resident',
      'profile-rewards',
      'coordinator-announcements',
      'directed-message',
      'coordinator-stats'
    ]
  },
  [USER_ROLE.SECTOR_LEADER]: {
    homeTitle: '板块工作首页',
    homeSubtitle: '板块商家、排名与特惠推送',
    homeFocusCards: [],
    quickRouteNames: ['sector-leader-merchants', 'sector-leader-ranking', 'sector-leader-offers', 'sector-leader-overview']
  },
  [USER_ROLE.INDIVIDUAL_LEADER]: {
    homeTitle: '个体工作首页',
    homeSubtitle: '商家管理、服务与提现',
    homeFocusCards: [],
    quickRouteNames: [
      'individual-leader-merchants',
      'individual-leader-services',
      'individual-leader-withdrawals',
      'individual-leader-overview'
    ]
  },
  [USER_ROLE.ACTIVITY_LEADER]: {
    homeTitle: '活动组工作首页',
    homeSubtitle: '管理活动组、小店商品与提现',
    homeFocusCards: [],
    quickRouteNames: [
      'activity-leader-groups',
      'activity-leader-products',
      'activity-leader-withdrawals',
      'activity-leader-overview'
    ]
  },
  [USER_ROLE.TECHNICIAN]: {
    homeTitle: '技工工作首页',
    homeSubtitle: '处理工单、上架服务与提现',
    homeFocusCards: [],
    quickRouteNames: [
      'technician-tasks',
      'technician-services',
      'technician-withdrawals',
      'technician-overview'
    ]
  }
}

/** 支持移动端小程序式壳层的角色 */
export const MOBILE_SHELL_ROLES = [
  USER_ROLE.PLATFORM_ADMIN,
  USER_ROLE.PROPERTY_ADMIN,
  USER_ROLE.MERCHANT,
  USER_ROLE.COURIER,
  USER_ROLE.COORDINATOR,
  USER_ROLE.SECTOR_LEADER,
  USER_ROLE.INDIVIDUAL_LEADER,
  USER_ROLE.ACTIVITY_LEADER,
  USER_ROLE.TECHNICIAN
] as const

const ROLE_PORTAL_TITLE: Record<string, string> = {
  [USER_ROLE.PLATFORM_ADMIN]: '平台移动端',
  [USER_ROLE.PROPERTY_ADMIN]: '物业移动端',
  [USER_ROLE.MERCHANT]: '商家移动端',
  [USER_ROLE.COURIER]: '配送移动端',
  [USER_ROLE.COORDINATOR]: '统筹移动端',
  [USER_ROLE.SECTOR_LEADER]: '板块移动端',
  [USER_ROLE.INDIVIDUAL_LEADER]: '个体移动端',
  [USER_ROLE.ACTIVITY_LEADER]: '活动组移动端',
  [USER_ROLE.TECHNICIAN]: '技工移动端'
}

/** @deprecated 使用 usesMobileShell / isMobileShellRole */
export const PILOT_MOBILE_ROLES = MOBILE_SHELL_ROLES

function flattenMenus(menus: Menu[]): MobileWorkbenchItem[] {
  const items: MobileWorkbenchItem[] = []
  for (const menu of menus) {
    if (menu.children?.length) {
      for (const child of menu.children) {
        items.push({ name: child.name, icon: child.icon || menu.icon, route: child.route })
      }
    } else {
      items.push({ name: menu.name, icon: menu.icon, route: menu.route })
    }
  }
  return items
}

function menusToWorkbenchSections(menus: Menu[]): MobileWorkbenchSection[] {
  const sections: MobileWorkbenchSection[] = []
  const singles: MobileWorkbenchItem[] = []

  for (const menu of menus) {
    if (menu.children?.length) {
      sections.push({
        title: menu.name,
        items: menu.children.map((child) => ({
          name: child.name,
          icon: child.icon || menu.icon,
          route: child.route
        }))
      })
    } else {
      singles.push({ name: menu.name, icon: menu.icon, route: menu.route })
    }
  }

  if (singles.length) {
    sections.unshift({ title: '功能入口', items: singles })
  }
  return sections
}

function collectAllowedRoutes(menus: Menu[]): Set<string> {
  return new Set(flattenMenus(menus).map((item) => item.route))
}

function filterSectionsByRoutes(
  sections: MobileWorkbenchSection[],
  allowed: Set<string>
): MobileWorkbenchSection[] {
  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => allowed.has(item.route))
    }))
    .filter((section) => section.items.length > 0)
}

function ensureAllMenuRoutesCovered(
  sections: MobileWorkbenchSection[],
  menus: Menu[]
): MobileWorkbenchSection[] {
  const present = new Set(sections.flatMap((section) => section.items.map((item) => item.route)))
  const missing = flattenMenus(menus).filter((item) => !present.has(item.route))
  if (!missing.length) return sections
  return [...sections, { title: '更多功能', items: missing }]
}

function pickQuickActions(
  sections: MobileWorkbenchSection[],
  preferredRoutes?: string[]
): MobileWorkbenchItem[] {
  const all = sections.flatMap((section) => section.items)
  if (!all.length) return []
  if (!preferredRoutes?.length) return all.slice(0, 4)

  const picked: MobileWorkbenchItem[] = []
  for (const route of preferredRoutes) {
    const hit = all.find((item) => item.route === route)
    if (hit) picked.push(hit)
  }
  if (picked.length >= 4) return picked.slice(0, 4)
  for (const item of all) {
    if (picked.some((p) => p.route === item.route)) continue
    picked.push(item)
    if (picked.length >= 4) break
  }
  return picked
}

function buildAdminWorkbench(profile?: Pick<UserProfile, 'role' | 'propertySubRole'> | null) {
  const menus = getMenusForProfile(profile)
  const allowed = collectAllowedRoutes(menus)
  const filtered = filterSectionsByRoutes(ADMIN_WORKBENCH_BASE, allowed)
  return ensureAllMenuRoutesCovered(filtered, menus)
}

function buildRoleWorkbench(profile?: Pick<UserProfile, 'role' | 'propertySubRole'> | null) {
  const menus = getMenusForProfile(profile)
  return menusToWorkbenchSections(menus)
}

export function isMobileShellRole(role?: string | null): boolean {
  if (!role) return false
  const { role: normalized } = normalizeAdminIdentity({ role, propertySubRole: undefined })
  return (MOBILE_SHELL_ROLES as readonly string[]).includes(normalized || role)
}

/** @deprecated 使用 isMobileShellRole */
export function isPilotMobileRole(role?: string | null): boolean {
  return isMobileShellRole(role)
}

export function usesMobileShell(
  profile?: Pick<UserProfile, 'role' | 'propertySubRole'> | null
): boolean {
  const { role } = normalizeAdminIdentity(profile)
  return isMobileShellRole(role)
}

export function getMobilePortalConfig(
  profile?: Pick<UserProfile, 'role' | 'propertySubRole'> | null
): MobilePortalConfig | null {
  const { role } = normalizeAdminIdentity(profile)
  if (!role || !isMobileShellRole(role)) return null

  const meta = ROLE_HOME_META[role]
  const isAdmin = role === USER_ROLE.PLATFORM_ADMIN || role === USER_ROLE.PROPERTY_ADMIN
  const workbenchSections = isAdmin ? buildAdminWorkbench(profile) : buildRoleWorkbench(profile)

  return {
    role,
    portalTitle: ROLE_PORTAL_TITLE[role] || getPortalSubtitle(role) || '移动工作台',
    homeTitle: meta?.homeTitle || '工作首页',
    homeSubtitle: meta?.homeSubtitle || '从快捷入口进入高频功能',
    homeFocusCards: meta?.homeFocusCards || [],
    quickActions: pickQuickActions(workbenchSections, meta?.quickRouteNames),
    workbenchSections
  }
}

export function isMobileTabRoute(routeName?: string | null): boolean {
  return routeName === 'mobile-home' || routeName === 'mobile-workbench' || routeName === 'mobile-profile'
}

export function getMappedWorkbenchTab(
  routeName?: string | null,
  config?: MobilePortalConfig | null
): MobileTabKey {
  if (!routeName) return 'home'
  if (routeName === 'mobile-home') return 'home'
  if (routeName === 'mobile-profile') return 'profile'
  if (routeName === 'mobile-workbench') return 'workbench'
  if (!config) return 'workbench'
  const routeInWorkbench = config.workbenchSections.some((section) =>
    section.items.some((item) => item.route === routeName)
  )
  return routeInWorkbench ? 'workbench' : 'home'
}
