export interface Menu {
  name: string
  icon: string
  route: string
  children?: Menu[]
}

export const adminMenus: Menu[] = [
  { name: '数据大盘', icon: 'dashboard', route: 'dashboard' },
  { name: '住户管理', icon: 'resident', route: 'resident' },
  { name: '楼栋变更审批', icon: 'home', route: 'building-change-approvals' },
  { name: '退货审批', icon: 'wallet', route: 'order-refund-approvals' },
  {
    name: '商家管理', icon: 'merchant', route: 'merchant',
    children: [
      { name: '商家入驻审核', icon: 'merchant', route: 'merchant-onboarding-approval' },
      { name: '商家管理', icon: 'merchant', route: 'merchant' },
      { name: '积分审批', icon: 'points', route: 'merchant-point-approval' },
      { name: '商家提现审批', icon: 'wallet', route: 'merchant-withdrawal-approval' },
      { name: '配送员提现审批', icon: 'wallet', route: 'role-withdrawal-approval' },
      { name: '物业币提现审批', icon: 'coin', route: 'coin-withdrawal-approval' }
    ]
  },
  { name: '价格审批', icon: 'wallet', route: 'price-approvals' },
  { name: '权限配置', icon: 'permission', route: 'permission' },
  { name: '板块负责人', icon: 'people', route: 'sector-leaders' },
  { name: '一级代理', icon: 'people', route: 'individual-leaders' },
  { name: '社区绑定', icon: 'home', route: 'community-entity' },
  { name: '物业操作员', icon: 'people', route: 'property-operators' },
  { name: '参数配置', icon: 'param', route: 'param' },
  { name: '物业联系方式', icon: 'notice', route: 'property-contact' },
  { name: '积分管理', icon: 'points', route: 'points' },
  { name: '通告发布', icon: 'notice', route: 'notice' },
  { name: '定向推送', icon: 'target', route: 'directed-message' },
  { name: '住户消息', icon: 'notice', route: 'property-chat' },
  { name: '社区论坛', icon: 'notice', route: 'community-forum' },
      { name: '业主商户（分销）', icon: 'merchant', route: 'resident-merchants' },
  { name: '商家广告设置', icon: 'retail', route: 'merchant-ad-settings' },
  { name: '送货管理', icon: 'delivery', route: 'delivery' },
  { name: '配送价格区间', icon: 'wallet', route: 'delivery-price-ranges' },
  { name: '快递负责人', icon: 'people', route: 'courier-managers' },
  { name: '业务角色账号', icon: 'people', route: 'role-accounts' },
  { name: '欠费报表', icon: 'chart', route: 'arrears-report' },
  { name: '楼宇结构', icon: 'home', route: 'room-structure' },
  { name: '建设积分', icon: 'points', route: 'community-points' },
  { name: '转给物业对账', icon: 'history', route: 'transfer-to-property' },
  { name: '资料奖励', icon: 'param', route: 'profile-rewards' },
  { name: '公司账户', icon: 'money', route: 'company-account' },
  { name: '分成账户', icon: 'wallet', route: 'settlement-account' },
  { name: '分成明细', icon: 'history', route: 'distribution-records' },
  { name: '分成统计', icon: 'chart', route: 'distribution-stats' },
  {
    name: '微信收付通分账', icon: 'bank', route: 'cbk-accounts',
    children: [
      { name: '收款账户（二级商户号）', icon: 'bank', route: 'cbk-accounts' },
      { name: '分账对账台', icon: 'history', route: 'cbk-reconcile' }
    ]
  },
  { name: '区域/项目负责人', icon: 'people', route: 'regional-leaders' },
  { name: '平台分成配置', icon: 'money', route: 'platform-share-config' },
  { name: '平台收益', icon: 'chart', route: 'platform-earnings' }
]

/** 领导专属菜单（操作员侧栏不展示；价格审批对平台管理员+领导开放，守卫见 canAccessLeaderOnlyRoute） */
export const PROPERTY_LEADER_ONLY_ROUTES = [
  'param',
  'permission',
  'property-operators',
  'company-account',
  'settlement-account',
  'profile-rewards',
  'community-points',
  'regional-leaders',
  'price-approvals'
] as const

/** 平台管理员专属菜单（其余角色侧栏不展示、路由不可进） */
export const PLATFORM_ADMIN_ONLY_ROUTES = ['platform-share-config', 'platform-earnings'] as const

/** 物业操作员：日常操作权限，无参数配置 / 权限分配 / 人员管理 */
export const propertyOperatorMenus: Menu[] = adminMenus.filter(
  (m) => !(PROPERTY_LEADER_ONLY_ROUTES as readonly string[]).includes(m.route)
)

export const merchantMenus: Menu[] = [
  { name: '店铺概览', icon: 'dashboard', route: 'merchant-overview' },
  { name: '订单管理', icon: 'retail', route: 'merchant-orders' },
  { name: '商品管理', icon: 'merchant', route: 'merchant-products' },
  { name: '店铺动态', icon: 'notice', route: 'merchant-posts' },
  { name: '服务关键词', icon: 'target', route: 'merchant-keywords' },
  { name: '配送范围', icon: 'home', route: 'merchant-service-scope' },
  { name: '服务需求', icon: 'notice', route: 'merchant-service-requests' },
  { name: '广告推送', icon: 'retail', route: 'merchant-ads' },
  { name: '积分管理', icon: 'points', route: 'merchant-points' },
  { name: '提现管理', icon: 'wallet', route: 'merchant-withdrawals' }
]

export const courierMenus: Menu[] = [
  { name: '工作台', icon: 'dashboard', route: 'courier-overview' },
  { name: '抢单大厅', icon: 'delivery', route: 'courier-available' },
  { name: '我的任务', icon: 'history', route: 'courier-tasks' },
  { name: '提现记录', icon: 'wallet', route: 'courier-withdrawals' }
]

export const coordinatorMenus: Menu[] = [
  { name: '工作台', icon: 'dashboard', route: 'coordinator-overview' },
  { name: '商家管理', icon: 'merchant', route: 'coordinator-merchants' },
  { name: '住户查看', icon: 'resident', route: 'resident' },
  { name: '商家排名', icon: 'chart', route: 'coordinator-ranking' },
  { name: '统筹公告', icon: 'notice', route: 'coordinator-announcements' },
  { name: '定向推送', icon: 'target', route: 'directed-message' },
  { name: '活动组', icon: 'people', route: 'coordinator-activity-groups' },
  { name: '服务管理', icon: 'home', route: 'coordinator-services' },
  { name: '特惠推送', icon: 'retail', route: 'coordinator-offers' },
  { name: '板块管理', icon: 'permission', route: 'coordinator-sector-leaders' },
  { name: '资料奖励', icon: 'param', route: 'profile-rewards' },
  { name: '转给物业对账', icon: 'history', route: 'transfer-to-property' },
  { name: '分成统计', icon: 'money', route: 'coordinator-stats' },
  { name: '分成明细', icon: 'history', route: 'coordinator-records' },
  { name: '提现管理', icon: 'wallet', route: 'coordinator-withdrawals' }
]

export const sectorLeaderMenus: Menu[] = [
  { name: '工作台', icon: 'dashboard', route: 'sector-leader-overview' },
  { name: '板块商家', icon: 'merchant', route: 'sector-leader-merchants' },
  { name: '板块排名', icon: 'chart', route: 'sector-leader-ranking' },
  { name: '板块特惠', icon: 'retail', route: 'sector-leader-offers' },
  { name: '区域负责人', icon: 'people', route: 'regional-leaders' },
  { name: '转给物业对账', icon: 'history', route: 'transfer-to-property' },
  { name: '提现管理', icon: 'wallet', route: 'sector-leader-withdrawals' }
]

export const individualLeaderMenus: Menu[] = [
  { name: '工作台', icon: 'dashboard', route: 'individual-leader-overview' },
  { name: '商家管理', icon: 'merchant', route: 'individual-leader-merchants' },
  { name: '转给物业对账', icon: 'history', route: 'transfer-to-property' },
  { name: '我的服务', icon: 'home', route: 'individual-leader-services' },
  { name: '提现记录', icon: 'wallet', route: 'individual-leader-withdrawals' }
]

export const activityLeaderMenus: Menu[] = [
  { name: '工作台', icon: 'dashboard', route: 'activity-leader-overview' },
  { name: '我的活动组', icon: 'people', route: 'activity-leader-groups' },
  { name: '我的小店', icon: 'merchant', route: 'activity-leader-products' },
  { name: '提现管理', icon: 'wallet', route: 'activity-leader-withdrawals' }
]

export const technicianMenus: Menu[] = [
  { name: '工作台', icon: 'dashboard', route: 'technician-overview' },
  { name: '我的工单', icon: 'delivery', route: 'technician-tasks' },
  { name: '我的服务', icon: 'home', route: 'technician-services' },
  { name: '提现管理', icon: 'wallet', route: 'technician-withdrawals' }
]

export const residentMenus: Menu[] = [
  { name: '我的店铺', icon: 'merchant', route: 'resident-shop' },
  { name: '公开橱窗', icon: 'retail', route: 'public-resident-shops' }
]

/** @deprecated 请使用 getMenusForRole */
export const menus = adminMenus
