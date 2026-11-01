/**
 * 权限码常量与页面门控映射（v1.2 契约，2026-10-29）
 *
 * 口径来源：后端《支付、分账与权限配置 · 前端对接说明 v1.2》
 * - 接口统一 `resource:action` 冒号格式；数据库存点号，接口返回时转换。
 * - 请求两种格式后端都兼容，但前端一律使用接口返回的冒号码，禁止硬编码文档示例里的
 *   `resident:read` / `permission.resident.read`（这两个码在权限池里都不存在）。
 * - 最终以 `GET /admin/permissions` 实时返回为准；本文件的 44 条仅用于映射表与补全，
 *   若后端新增权限码，此处需同步（不影响运行，未登记的码只影响按钮级使用）。
 */

export interface PermissionCodeMeta {
  /** 权限码，`resource:action` */
  code: string
  /** 中文名，与后端 permissions.name 对齐 */
  name: string
  /** 模块，用于菜单/权限页粗分组 */
  module: string
  /** 平台专属：仅 platform_admin 授予，物业端不展示 */
  platformOnly?: boolean
}

/**
 * 门控总开关。
 * 出现线上问题时改为 false 可一键退回「纯角色控制」，无需逐处改代码。
 */
export const PERMISSION_GUARD_ENABLED = true

/** 全量权限码（44 个，对应后端 permissions 表 26 个 module） */
export const PERMISSION_CODES: PermissionCodeMeta[] = [
  { code: 'activity_group:manage', name: '活动组管理', module: 'activity_group' },
  { code: 'announcement:publish', name: '发布公告', module: 'announcement' },
  { code: 'coin:freeze', name: '物业币冻结', module: 'coin' },
  { code: 'coin:display_control', name: '物业币显示控制', module: 'coin' },
  { code: 'coin:audit', name: '物业币兑换审核', module: 'coin' },
  { code: 'community_entity:manage', name: '社区管理', module: 'community_entity' },
  { code: 'community:read', name: '社区论坛-查看', module: 'community' },
  { code: 'community:manage', name: '社区论坛-管理', module: 'community' },
  { code: 'config:set', name: '参数配置', module: 'config' },
  { code: 'consultation:manage', name: '咨询板块管理', module: 'consultation' },
  { code: 'coordinator:read', name: '统筹查看', module: 'coordinator' },
  { code: 'coordinator:manage', name: '统筹管理', module: 'coordinator' },
  { code: 'data:view', name: '数据查看', module: 'data' },
  { code: 'delivery:grab', name: '送货抢单', module: 'delivery' },
  { code: 'distribution:read', name: '分成记录查看', module: 'distribution' },
  { code: 'individual:manage', name: '个体负责人管理', module: 'individual' },
  { code: 'log:read', name: '操作日志查看', module: 'log' },
  { code: 'merchant:audit', name: '商家审核', module: 'merchant' },
  { code: 'merchant:kickout', name: '踢出商家', module: 'merchant' },
  { code: 'merchant:create', name: '创建平台商家', module: 'merchant', platformOnly: true },
  { code: 'merchant:read', name: '平台商家查看', module: 'merchant', platformOnly: true },
  { code: 'merchant:update', name: '更新平台商家', module: 'merchant', platformOnly: true },
  { code: 'resident_merchant:audit', name: '业主商户审核', module: 'merchant' },
  { code: 'distributor:manage', name: '一级经销商管理', module: 'merchant' },
  { code: 'directed_message:send', name: '定向消息发送', module: 'message' },
  { code: 'directed_message:read', name: '定向消息查看', module: 'message' },
  { code: 'directed_message:stats', name: '定向消息统计', module: 'message' },
  { code: 'notice:collect', name: '通知征集', module: 'notice' },
  { code: 'permission:manage', name: '权限管理', module: 'permission' },
  { code: 'permission:read', name: '权限查看', module: 'permission' },
  { code: 'points:input', name: '积分录入', module: 'points' },
  { code: 'point:clear_run', name: '2年积分清零', module: 'points' },
  { code: 'pool:read', name: '积分池查看', module: 'pool' },
  { code: 'pool:adjust', name: '积分池调整', module: 'pool' },
  { code: 'promotion:push', name: '特惠推送', module: 'promotion' },
  { code: 'property_company:manage', name: '物业公司管理', module: 'property_company', platformOnly: true },
  { code: 'property_fee:manage', name: '物业费管理', module: 'property_fee' },
  { code: 'rank:drag', name: '排名拖拽', module: 'rank' },
  { code: 'refund:approve', name: '退费审批', module: 'refund' },
  { code: 'reports:view', name: '报表查看', module: 'reports' },
  { code: 'sector:manage', name: '板块管理', module: 'sector' },
  { code: 'sector:read', name: '板块负责人查看', module: 'sector' },
  { code: 'user:manage', name: '用户管理', module: 'user' },
  { code: 'property_operator:manage', name: '物业管理员管理', module: 'user' }
]

/**
 * 本期**没有前端页面**的权限码 —— 在权限配置页硬编码隐藏（后端 2026-10-30 回复 §5）。
 *
 * 为什么隐藏而不是删掉：
 * - 后端接口仍然存在、权限仍然可授，只是本仓没有对应页面，授了不会出现 tab；
 * - 后端不新增 `hidden` 字段（避免页面补齐后还要改后端），所以由前端维护这份清单。
 *
 * 恢复方式：页面做完后，把码从本数组移除、在 ROUTE_PERMISSION 登记路由、在
 * PERMISSION_MENU_CATALOG 补菜单项，三处齐了才会真正出现入口。
 *
 * `consultation:manage` 的页面 `views/admin/Consultants.vue` 已存在，只差路由 + 菜单；
 * 产品确认要做时按上面三步恢复，并从本数组删除该码。
 */
export const PERMISSION_CODES_WITHOUT_PAGE: string[] = [
  'log:read', // 操作日志页
  'coin:freeze', // 物业币冻结页
  'point:clear_run', // 2 年积分清零执行页
  'notice:collect', // 通知征集页
  'merchant:read', // 平台商家库
  'merchant:create', // 平台代建商家
  'merchant:update', // 平台改商家资料
  'consultation:manage' // 咨询管理（页面已存在，未挂路由）
]

/** 权限码 → 中文名（用于 403 提示、按钮 title 等） */
export const PERMISSION_CODE_LABEL: Record<string, string> = PERMISSION_CODES.reduce(
  (acc, item) => {
    acc[item.code] = item.name
    return acc
  },
  {} as Record<string, string>
)

/**
 * 页面级门控映射：路由 name → 权限码（v2 全量口径，2026-10-30）。
 *
 * ⚠️ 这是**声明式白名单**：只有在此登记的路由才受权限码控制；
 * 未登记的路由一律维持原有「按角色放行」逻辑，不会被隐藏。
 *
 * 登记策略（依据《管理端权限与工作台 v2》§3 总矩阵）：
 * - 矩阵里能对上本仓真实页面的，全部登记；
 * - 矩阵里给了码但本仓**没有对应页面**的（操作日志 / 物业币管控 / 2 年积分清零 /
 *   通知征集 / 平台商家库 / 优惠券），只保留常量，不登记路由 —— 没有页面可锁；
 * - 与标签身份工作台**共用同一路由**的（directed-message、profile-rewards、
 *   transfer-to-property、regional-leaders、points）不登记，否则统筹/板块会因缺码
 *   丢掉自己工作台里本来就该有的入口；
 * - 价格审批、平台收益、平台交易明细、平台分成配置按文档继续走角色控制，不登记。
 */
export const ROUTE_PERMISSION: Record<string, string> = {
  // §3.1 组织与负责人
  coordinators: 'coordinator:manage',
  'sector-leaders': 'sector:manage',
  'individual-leaders': 'individual:manage',
  'activity-group-reviews': 'activity_group:manage',
  'activity-leader-applications': 'activity_group:manage',
  'building-change-approvals': 'user:manage',
  'building-leaders': 'user:manage',
  'resident-deletion-reviews': 'user:manage',
  'property-chat': 'user:manage',
  'role-accounts': 'user:manage',
  'property-managers': 'property_operator:manage',
  'property-operators': 'property_operator:manage',

  // §3.2 商家与一级代理
  'merchant-onboarding-approval': 'merchant:audit',
  merchant: 'merchant:audit',
  'merchant-point-approval': 'merchant:audit',
  'merchant-withdrawal-approval': 'merchant:audit',
  'merchant-applyment': 'merchant:audit',
  'merchant-recommended': 'rank:drag',
  'merchant-ad-settings': 'promotion:push',
  'resident-merchants': 'resident_merchant:audit',
  'distributor-applications': 'distributor:manage',
  'canteen-manage': 'config:set',

  // §3.3 营销与内容
  notice: 'announcement:publish',
  /**
   * 社区论坛 tab 的显示条件是 community:read，不是 community:manage。
   * 依据《管理端权限与工作台》§6.1：只授 manage 时列表接口仍 403，不应显示完整 tab；
   * 只授 read 时 tab 可见、写按钮隐藏。删帖/禁言等写操作由页面内 v-permission="community:manage" 控制。
   */
  'community-forum': 'community:read',
  'community-entity': 'community_entity:manage',
  delivery: 'delivery:grab',
  'delivery-price-ranges': 'delivery:grab',
  'courier-managers': 'delivery:grab',

  // §3.4 资金与积分
  'coin-withdrawal-approval': 'coin:audit',
  'role-withdrawal-approval': 'coin:audit',
  'order-refund-approvals': 'refund:approve',
  /** 欠费报表在 §3.4 归入 property_fee:manage（不是 reports:view） */
  'arrears-report': 'property_fee:manage',
  'community-points': 'pool:read',
  'company-account': 'pool:read',
  'distribution-records': 'distribution:read',
  'distribution-stats': 'distribution:read',
  'split-recovery': 'distribution:read',

  // §3.5 数据、配置与权限
  dashboard: 'data:view',
  permission: 'permission:read',
  param: 'config:set',
  'navigation-items': 'config:set',
  'region-quotas': 'config:set',
  'property-bank-cards': 'config:set',
  'property-contact': 'config:set',
  'settlement-config': 'config:set',
  'platform-config': 'config:set',
  'property-companies': 'property_company:manage'
}

/** 取某路由的权限码；未登记返回 undefined（= 不受权限码控制） */
export function permissionForRoute(routeName?: string | null): string | undefined {
  if (!routeName) return undefined
  return ROUTE_PERMISSION[routeName]
}

/**
 * 按权限码过滤菜单（递归处理分组子项）。
 * 未登记权限码的菜单原样保留。
 */
export function filterMenusByPermission<T extends { route: string; children?: T[] }>(
  menus: T[],
  hasPermission: (code: string) => boolean
): T[] {
  const result: T[] = []
  for (const menu of menus) {
    const code = permissionForRoute(menu.route)
    if (code && !hasPermission(code)) continue
    if (menu.children?.length) {
      const children = filterMenusByPermission(menu.children, hasPermission)
      // 子项全被过滤时不渲染空分组
      if (!children.length) continue
      result.push({ ...menu, children })
      continue
    }
    result.push(menu)
  }
  return result
}

/**
 * 权限码驱动的「可追加菜单」（v2 全量目录）。
 *
 * 背景：活动组长 / 统筹 / 板块 / 个体 / 社区管理员这些标签身份，工作台菜单来自
 * activityLeaderMenus 等固定数组，天然没有管理端 tab。仅靠 filterMenusByPermission
 * （只删不加）永远不可能出现这些 tab，所以需要一层「有码则追加」。
 *
 * 依据《管理端权限与工作台 v2》§3 总矩阵：标签身份现在可以持有除「平台专属」
 * 「物业领导专属」以外的全部权限，因此目录覆盖到所有可授予的管理端入口。
 *
 * 约束：
 * - 只追加，不改动原有角色菜单，因此不会影响任何现有账号。
 * - 已存在同 route 的菜单不重复追加（管理员 adminMenus 里本来就有这些项）。
 * - 追加项排在末尾，避免打乱既有菜单顺序。
 * - console 端身份过滤见 AppSidebar：只对管理端 / 领导标签身份追加，
 *   商家 / 配送员 / 技工工作台不参与（避免给快递员凭空加出「送货管理」）。
 */
export const PERMISSION_MENU_CATALOG: Array<{
  code: string
  menu: { name: string; icon: string; route: string }
}> = [
  { code: 'community:read', menu: { name: '社区论坛', icon: 'notice', route: 'community-forum' } },
  {
    code: 'merchant:audit',
    menu: { name: '商家入驻审核', icon: 'merchant', route: 'merchant-onboarding-approval' }
  },
  { code: 'merchant:audit', menu: { name: '积分审批', icon: 'points', route: 'merchant-point-approval' } },
  {
    code: 'merchant:audit',
    menu: { name: '商家提现审批', icon: 'wallet', route: 'merchant-withdrawal-approval' }
  },
  { code: 'resident_merchant:audit', menu: { name: '业主商户', icon: 'merchant', route: 'resident-merchants' } },
  { code: 'distributor:manage', menu: { name: '一级代理申请', icon: 'people', route: 'distributor-applications' } },
  { code: 'rank:drag', menu: { name: '物业推荐', icon: 'merchant', route: 'merchant-recommended' } },
  { code: 'promotion:push', menu: { name: '商家广告设置', icon: 'retail', route: 'merchant-ad-settings' } },
  { code: 'refund:approve', menu: { name: '退货审批', icon: 'wallet', route: 'order-refund-approvals' } },
  { code: 'announcement:publish', menu: { name: '通告发布', icon: 'notice', route: 'notice' } },
  { code: 'activity_group:manage', menu: { name: '活动组审核', icon: 'people', route: 'activity-group-reviews' } },
  {
    code: 'activity_group:manage',
    menu: { name: '组长申请审核', icon: 'people', route: 'activity-leader-applications' }
  },
  { code: 'coordinator:manage', menu: { name: '统筹人员', icon: 'people', route: 'coordinators' } },
  { code: 'sector:manage', menu: { name: '板块负责人', icon: 'people', route: 'sector-leaders' } },
  { code: 'individual:manage', menu: { name: '个体负责人', icon: 'people', route: 'individual-leaders' } },
  { code: 'user:manage', menu: { name: '业务角色账号', icon: 'people', route: 'role-accounts' } },
  { code: 'user:manage', menu: { name: '楼栋变更审批', icon: 'home', route: 'building-change-approvals' } },
  { code: 'user:manage', menu: { name: '单元楼长', icon: 'people', route: 'building-leaders' } },
  { code: 'coin:audit', menu: { name: '物业币提现审批', icon: 'coin', route: 'coin-withdrawal-approval' } },
  { code: 'coin:audit', menu: { name: '配送员提现审批', icon: 'wallet', route: 'role-withdrawal-approval' } },
  { code: 'delivery:grab', menu: { name: '送货管理', icon: 'delivery', route: 'delivery' } },
  { code: 'delivery:grab', menu: { name: '配送价格区间', icon: 'wallet', route: 'delivery-price-ranges' } },
  { code: 'distribution:read', menu: { name: '分成明细', icon: 'history', route: 'distribution-records' } },
  { code: 'distribution:read', menu: { name: '分成统计', icon: 'chart', route: 'distribution-stats' } },
  { code: 'pool:read', menu: { name: '建设积分', icon: 'points', route: 'community-points' } },
  { code: 'community_entity:manage', menu: { name: '社区绑定', icon: 'home', route: 'community-entity' } },
  { code: 'data:view', menu: { name: '数据大盘', icon: 'dashboard', route: 'dashboard' } }
]

/** 兼容旧名（v1.3 只有社区论坛一项时引入），新代码请用 PERMISSION_MENU_CATALOG */
export const PERMISSION_EXTRA_MENUS = PERMISSION_MENU_CATALOG

export function appendMenusByPermission<T extends { route: string }>(
  menus: T[],
  hasPermission: (code: string) => boolean
): T[] {
  const existing = new Set(menus.map((menu) => menu.route))
  const extra: T[] = []
  for (const item of PERMISSION_MENU_CATALOG) {
    if (existing.has(item.menu.route)) continue
    if (!hasPermission(item.code)) continue
    existing.add(item.menu.route)
    extra.push(item.menu as unknown as T)
  }
  return extra.length ? [...menus, ...extra] : menus
}

/** 判断某身份是否属于「管理端工作台」口径（用于 adminWorkspace 缺省时的兜底） */
export function isAdminWorkspaceIdentity(role?: string | null): boolean {
  return role === 'platform_admin' || role === 'property_admin' || role === 'community_admin'
}
