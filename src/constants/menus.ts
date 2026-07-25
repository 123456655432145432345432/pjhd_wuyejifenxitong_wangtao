export interface Menu {
  name: string
  icon: string
  route: string
  children?: Menu[]
}

export const adminMenus: Menu[] = [
  { name: '数据大盘', icon: 'dashboard', route: 'dashboard' },
  { name: '住户管理', icon: 'resident', route: 'resident' },
  {
    name: '商家管理', icon: 'merchant', route: 'merchant',
    children: [
      { name: '商家管理', icon: 'merchant', route: 'merchant' },
      { name: '积分审批', icon: 'points', route: 'merchant-point-approval' },
      { name: '提现审批', icon: 'wallet', route: 'merchant-withdrawal-approval' }
    ]
  },
  { name: '权限配置', icon: 'permission', route: 'permission' },
  { name: '板块负责人', icon: 'people', route: 'sector-leaders' },
  { name: '社区绑定', icon: 'home', route: 'community-entity' },
  { name: '物业操作员', icon: 'people', route: 'property-operators' },
  { name: '参数配置', icon: 'param', route: 'param' },
  { name: '积分管理', icon: 'points', route: 'points' },
  { name: '通告发布', icon: 'notice', route: 'notice' },
  { name: '定向推送', icon: 'target', route: 'directed-message' },
  { name: '咨询师管理', icon: 'people', route: 'consultants' },
  { name: '业主商户', icon: 'merchant', route: 'resident-merchants' },
  { name: '送货管理', icon: 'delivery', route: 'delivery' },
  { name: '快递负责人', icon: 'people', route: 'courier-managers' },
  { name: '配送价格区间', icon: 'delivery', route: 'delivery-price-ranges' },
  { name: '价格审批', icon: 'wallet', route: 'price-approvals' },
  { name: '平台分成配置', icon: 'money', route: 'platform-share-config' },
  { name: '平台收益', icon: 'chart', route: 'platform-earnings' }
]

/** 领导专属菜单（操作员侧栏不展示） */
export const PROPERTY_LEADER_ONLY_ROUTES = ['param', 'permission', 'property-operators'] as const

/** 平台管理员专属菜单（物业管理员侧栏不展示） */
export const PLATFORM_ADMIN_ONLY_ROUTES = ['platform-earnings'] as const

/** 物业操作员：日常操作权限，无参数配置 / 权限分配 / 人员管理 */
export const propertyOperatorMenus: Menu[] = adminMenus.filter(
  (m) => !(PROPERTY_LEADER_ONLY_ROUTES as readonly string[]).includes(m.route)
)

export const merchantMenus: Menu[] = [
  { name: '店铺概览', icon: 'dashboard', route: 'merchant-overview' },
  { name: '订单管理', icon: 'retail', route: 'merchant-orders' },
  { name: '商品管理', icon: 'merchant', route: 'merchant-products' },
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
  { name: '商家排名', icon: 'chart', route: 'coordinator-ranking' },
  { name: '统筹公告', icon: 'notice', route: 'coordinator-announcements' },
  { name: '定向推送', icon: 'target', route: 'directed-message' },
  { name: '活动组', icon: 'people', route: 'coordinator-activity-groups' },
  { name: '服务管理', icon: 'home', route: 'coordinator-services' },
  { name: '特惠推送', icon: 'retail', route: 'coordinator-offers' },
  { name: '板块管理', icon: 'permission', route: 'coordinator-sector-leaders' },
  { name: '分成统计', icon: 'money', route: 'coordinator-stats' },
  { name: '分成明细', icon: 'history', route: 'coordinator-records' }
]

export const sectorLeaderMenus: Menu[] = [
  { name: '工作台', icon: 'dashboard', route: 'sector-leader-overview' },
  { name: '板块商家', icon: 'merchant', route: 'sector-leader-merchants' },
  { name: '板块排名', icon: 'chart', route: 'sector-leader-ranking' },
  { name: '板块特惠', icon: 'retail', route: 'sector-leader-offers' }
]

export const individualLeaderMenus: Menu[] = [
  { name: '工作台', icon: 'dashboard', route: 'individual-leader-overview' },
  { name: '商家管理', icon: 'merchant', route: 'individual-leader-merchants' },
  { name: '我的服务', icon: 'home', route: 'individual-leader-services' },
  { name: '提现记录', icon: 'wallet', route: 'individual-leader-withdrawals' }
]

/** @deprecated 请使用 getMenusForRole */
export const menus = adminMenus
