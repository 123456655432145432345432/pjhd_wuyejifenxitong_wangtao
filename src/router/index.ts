import { createRouter, createWebHistory } from 'vue-router'
import { USER_ROLE } from '../constants/enums'
import {
  ADMIN_ROLES,
  canAccessLeaderOnlyRoute,
  canAccessRoute,
  getRoleHomeRoute
} from '../constants/roles'
import { useAuthStore } from '../stores/auth'
import AppLayout from '../layouts/AppLayout.vue'
import Dashboard from '../views/Dashboard.vue'
import Permission from '../views/Permission.vue'
import Merchant from '../views/Merchant.vue'
import MerchantPointApproval from '../views/admin/MerchantPointApproval.vue'
import MerchantWithdrawalApproval from '../views/admin/MerchantWithdrawalApproval.vue'
import PlatformShareConfig from '../views/admin/PlatformShareConfig.vue'
import PlatformEarnings from '../views/admin/PlatformEarnings.vue'
import CourierManagers from '../views/admin/CourierManagers.vue'
import DeliveryPriceRanges from '../views/admin/DeliveryPriceRanges.vue'
import PriceApprovals from '../views/admin/PriceApprovals.vue'
import Consultants from '../views/admin/Consultants.vue'
import ResidentMerchants from '../views/admin/ResidentMerchants.vue'
import Points from '../views/Points.vue'
import Resident from '../views/Resident.vue'
import Param from '../views/Param.vue'
import Notice from '../views/Notice.vue'
import DirectedMessage from '../views/DirectedMessage.vue'
import CommunityEntity from '../views/CommunityEntity.vue'
import PropertyOperators from '../views/PropertyOperators.vue'
import Delivery from '../views/Delivery.vue'
import SectorLeaders from '../views/SectorLeaders.vue'
import Login from '../views/Login.vue'
import MerchantOverview from '../views/merchant/MerchantOverview.vue'
import MerchantOrders from '../views/merchant/MerchantOrders.vue'
import MerchantProducts from '../views/merchant/MerchantProducts.vue'
import MerchantPoints from '../views/merchant/MerchantPoints.vue'
import MerchantWithdrawals from '../views/merchant/MerchantWithdrawals.vue'
import MerchantServiceScope from '../views/merchant/MerchantServiceScope.vue'
import MerchantServiceRequests from '../views/merchant/MerchantServiceRequests.vue'
import MerchantAds from '../views/merchant/MerchantAds.vue'
import CourierAvailable from '../views/courier/CourierAvailable.vue'
import CourierTasks from '../views/courier/CourierTasks.vue'
import CourierOverview from '../views/courier/CourierOverview.vue'
import CoordinatorStats from '../views/coordinator/CoordinatorStats.vue'
import CoordinatorRecords from '../views/coordinator/CoordinatorRecords.vue'
import CoordinatorOverview from '../views/coordinator/CoordinatorOverview.vue'
import CoordinatorMerchants from '../views/coordinator/CoordinatorMerchants.vue'
import CoordinatorRanking from '../views/coordinator/CoordinatorRanking.vue'
import CoordinatorAnnouncements from '../views/coordinator/CoordinatorAnnouncements.vue'
import CoordinatorActivityGroups from '../views/coordinator/CoordinatorActivityGroups.vue'
import CoordinatorServices from '../views/coordinator/CoordinatorServices.vue'
import CoordinatorOffers from '../views/coordinator/CoordinatorOffers.vue'
import CoordinatorSectorLeaders from '../views/coordinator/CoordinatorSectorLeaders.vue'
import SectorLeaderOverview from '../views/sector-leader/SectorLeaderOverview.vue'
import SectorLeaderMerchants from '../views/sector-leader/SectorLeaderMerchants.vue'
import SectorLeaderRanking from '../views/sector-leader/SectorLeaderRanking.vue'
import SectorLeaderOffers from '../views/sector-leader/SectorLeaderOffers.vue'
import IndividualLeaderOverview from '../views/individual-leader/IndividualLeaderOverview.vue'
import IndividualLeaderMerchants from '../views/individual-leader/IndividualLeaderMerchants.vue'
import IndividualLeaderServices from '../views/individual-leader/IndividualLeaderServices.vue'
import IndividualLeaderWithdrawals from '../views/individual-leader/IndividualLeaderWithdrawals.vue'
import CourierWithdrawals from '../views/courier/CourierWithdrawals.vue'

const ADMIN_ROLE_LIST = [...ADMIN_ROLES]
/** 平台管理员专属路由 */
const PLATFORM_ADMIN_ONLY = [USER_ROLE.PLATFORM_ADMIN]
/** 参数配置 / 权限分配 / 操作员管理：路由守卫另校验 property_sub_role */
const ADMIN_LEADER_ROLES = [...ADMIN_ROLES]
const DIRECTED_MESSAGE_ROLES = [
  ...ADMIN_ROLE_LIST,
  USER_ROLE.COORDINATOR
]

const routes = [
  {
    path: '/login',
    name: 'login',
    component: Login,
    meta: { title: '登录', public: true }
  },
  {
    path: '/',
    component: AppLayout,
    children: [
      {
        path: '',
        name: 'dashboard',
        component: Dashboard,
        meta: { title: '数据大盘', roles: ADMIN_ROLE_LIST }
      },
      {
        path: 'resident',
        name: 'resident',
        component: Resident,
        meta: { title: '住户管理', roles: ADMIN_ROLE_LIST }
      },
      {
        path: 'merchant',
        name: 'merchant',
        component: Merchant,
        meta: { title: '商家管理', roles: ADMIN_ROLE_LIST }
      },
      {
        path: 'merchant/point-approval',
        name: 'merchant-point-approval',
        component: MerchantPointApproval,
        meta: { title: '积分审批', roles: ADMIN_ROLE_LIST }
      },
      {
        path: 'merchant/withdrawal-approval',
        name: 'merchant-withdrawal-approval',
        component: MerchantWithdrawalApproval,
        meta: { title: '提现审批', roles: ADMIN_ROLE_LIST }
      },
      {
        path: 'permission',
        name: 'permission',
        component: Permission,
        meta: { title: '权限配置', roles: ADMIN_LEADER_ROLES, propertyLeaderOnly: true }
      },
      {
        path: 'sector-leaders',
        name: 'sector-leaders',
        component: SectorLeaders,
        meta: { title: '板块负责人', roles: ADMIN_ROLE_LIST }
      },
      {
        path: 'community-entity',
        name: 'community-entity',
        component: CommunityEntity,
        meta: { title: '社区绑定', roles: ADMIN_ROLE_LIST }
      },
      {
        path: 'property-operators',
        name: 'property-operators',
        component: PropertyOperators,
        meta: { title: '物业操作员', roles: ADMIN_LEADER_ROLES, propertyLeaderOnly: true }
      },
      {
        path: 'param',
        name: 'param',
        component: Param,
        meta: { title: '参数配置', roles: ADMIN_LEADER_ROLES, propertyLeaderOnly: true }
      },
      {
        path: 'points',
        name: 'points',
        component: Points,
        meta: { title: '积分管理', roles: ADMIN_ROLE_LIST }
      },
      {
        path: 'notice',
        name: 'notice',
        component: Notice,
        meta: { title: '通告发布', roles: ADMIN_ROLE_LIST }
      },
      {
        path: 'directed-message',
        name: 'directed-message',
        component: DirectedMessage,
        meta: { title: '定向推送', roles: DIRECTED_MESSAGE_ROLES }
      },
      {
        path: 'consultants',
        name: 'consultants',
        component: Consultants,
        meta: { title: '咨询师管理', roles: ADMIN_ROLE_LIST }
      },
      {
        path: 'resident-merchants',
        name: 'resident-merchants',
        component: ResidentMerchants,
        meta: { title: '业主商户', roles: ADMIN_ROLE_LIST }
      },
      {
        path: 'delivery',
        name: 'delivery',
        component: Delivery,
        meta: { title: '送货管理', roles: ADMIN_ROLE_LIST }
      },
      {
        path: 'platform-share-config',
        name: 'platform-share-config',
        component: PlatformShareConfig,
        meta: { title: '平台分成配置', roles: ADMIN_ROLE_LIST }
      },
      {
        path: 'platform-earnings',
        name: 'platform-earnings',
        component: PlatformEarnings,
        meta: { title: '平台收益', roles: PLATFORM_ADMIN_ONLY }
      },
      {
        path: 'courier-managers',
        name: 'courier-managers',
        component: CourierManagers,
        meta: { title: '快递负责人', roles: ADMIN_ROLE_LIST }
      },
      {
        path: 'delivery-price-ranges',
        name: 'delivery-price-ranges',
        component: DeliveryPriceRanges,
        meta: { title: '配送价格区间', roles: ADMIN_ROLE_LIST }
      },
      {
        path: 'price-approvals',
        name: 'price-approvals',
        component: PriceApprovals,
        meta: { title: '价格审批', roles: ADMIN_ROLE_LIST }
      },
      {
        path: 'merchant-portal/overview',
        name: 'merchant-overview',
        component: MerchantOverview,
        meta: { title: '店铺概览', roles: [USER_ROLE.MERCHANT] }
      },
      {
        path: 'merchant-portal/orders',
        name: 'merchant-orders',
        component: MerchantOrders,
        meta: { title: '订单管理', roles: [USER_ROLE.MERCHANT] }
      },
      {
        path: 'merchant-portal/products',
        name: 'merchant-products',
        component: MerchantProducts,
        meta: { title: '商品管理', roles: [USER_ROLE.MERCHANT] }
      },
      {
        path: 'merchant-portal/service-scope',
        name: 'merchant-service-scope',
        component: MerchantServiceScope,
        meta: { title: '配送范围', roles: [USER_ROLE.MERCHANT] }
      },
      {
        path: 'merchant-portal/service-requests',
        name: 'merchant-service-requests',
        component: MerchantServiceRequests,
        meta: { title: '服务需求', roles: [USER_ROLE.MERCHANT] }
      },
      {
        path: 'merchant-portal/ads',
        name: 'merchant-ads',
        component: MerchantAds,
        meta: { title: '广告推送', roles: [USER_ROLE.MERCHANT] }
      },
      {
        path: 'merchant-portal/points',
        name: 'merchant-points',
        component: MerchantPoints,
        meta: { title: '积分管理', roles: [USER_ROLE.MERCHANT] }
      },
      {
        path: 'merchant-portal/withdrawals',
        name: 'merchant-withdrawals',
        component: MerchantWithdrawals,
        meta: { title: '提现管理', roles: [USER_ROLE.MERCHANT] }
      },
      {
        path: 'courier/overview',
        name: 'courier-overview',
        component: CourierOverview,
        meta: { title: '工作台', roles: [USER_ROLE.COURIER] }
      },
      {
        path: 'courier/available',
        name: 'courier-available',
        component: CourierAvailable,
        meta: { title: '抢单大厅', roles: [USER_ROLE.COURIER] }
      },
      {
        path: 'courier/tasks',
        name: 'courier-tasks',
        component: CourierTasks,
        meta: { title: '我的任务', roles: [USER_ROLE.COURIER] }
      },
      {
        path: 'courier/withdrawals',
        name: 'courier-withdrawals',
        component: CourierWithdrawals,
        meta: { title: '提现记录', roles: [USER_ROLE.COURIER] }
      },
      {
        path: 'coordinator/overview',
        name: 'coordinator-overview',
        component: CoordinatorOverview,
        meta: { title: '工作台', roles: [USER_ROLE.COORDINATOR] }
      },
      {
        path: 'coordinator/merchants',
        name: 'coordinator-merchants',
        component: CoordinatorMerchants,
        meta: { title: '商家管理', roles: [USER_ROLE.COORDINATOR] }
      },
      {
        path: 'coordinator/ranking',
        name: 'coordinator-ranking',
        component: CoordinatorRanking,
        meta: { title: '商家排名', roles: [USER_ROLE.COORDINATOR] }
      },
      {
        path: 'coordinator/announcements',
        name: 'coordinator-announcements',
        component: CoordinatorAnnouncements,
        meta: { title: '统筹公告', roles: [USER_ROLE.COORDINATOR] }
      },
      {
        path: 'coordinator/activity-groups',
        name: 'coordinator-activity-groups',
        component: CoordinatorActivityGroups,
        meta: { title: '活动组', roles: [USER_ROLE.COORDINATOR] }
      },
      {
        path: 'coordinator/services',
        name: 'coordinator-services',
        component: CoordinatorServices,
        meta: { title: '服务管理', roles: [USER_ROLE.COORDINATOR] }
      },
      {
        path: 'coordinator/offers',
        name: 'coordinator-offers',
        component: CoordinatorOffers,
        meta: { title: '特惠推送', roles: [USER_ROLE.COORDINATOR] }
      },
      {
        path: 'coordinator/sector-leaders',
        name: 'coordinator-sector-leaders',
        component: CoordinatorSectorLeaders,
        meta: { title: '板块管理', roles: [USER_ROLE.COORDINATOR] }
      },
      {
        path: 'coordinator/stats',
        name: 'coordinator-stats',
        component: CoordinatorStats,
        meta: { title: '分成统计', roles: [USER_ROLE.COORDINATOR] }
      },
      {
        path: 'coordinator/records',
        name: 'coordinator-records',
        component: CoordinatorRecords,
        meta: { title: '分成明细', roles: [USER_ROLE.COORDINATOR] }
      },
      {
        path: 'sector-leader/overview',
        name: 'sector-leader-overview',
        component: SectorLeaderOverview,
        meta: { title: '工作台', roles: [USER_ROLE.SECTOR_LEADER] }
      },
      {
        path: 'sector-leader/merchants',
        name: 'sector-leader-merchants',
        component: SectorLeaderMerchants,
        meta: { title: '板块商家', roles: [USER_ROLE.SECTOR_LEADER] }
      },
      {
        path: 'sector-leader/ranking',
        name: 'sector-leader-ranking',
        component: SectorLeaderRanking,
        meta: { title: '板块排名', roles: [USER_ROLE.SECTOR_LEADER] }
      },
      {
        path: 'sector-leader/offers',
        name: 'sector-leader-offers',
        component: SectorLeaderOffers,
        meta: { title: '板块特惠', roles: [USER_ROLE.SECTOR_LEADER] }
      },
      {
        path: 'individual-leader/overview',
        name: 'individual-leader-overview',
        component: IndividualLeaderOverview,
        meta: { title: '工作台', roles: [USER_ROLE.INDIVIDUAL_LEADER] }
      },
      {
        path: 'individual-leader/merchants',
        name: 'individual-leader-merchants',
        component: IndividualLeaderMerchants,
        meta: { title: '商家管理', roles: [USER_ROLE.INDIVIDUAL_LEADER] }
      },
      {
        path: 'individual-leader/services',
        name: 'individual-leader-services',
        component: IndividualLeaderServices,
        meta: { title: '我的服务', roles: [USER_ROLE.INDIVIDUAL_LEADER] }
      },
      {
        path: 'individual-leader/withdrawals',
        name: 'individual-leader-withdrawals',
        component: IndividualLeaderWithdrawals,
        meta: { title: '提现记录', roles: [USER_ROLE.INDIVIDUAL_LEADER] }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  const role = auth.profile?.role

  if (to.meta.public) {
    if (auth.isLoggedIn && to.name === 'login') {
      return { name: getRoleHomeRoute(role) }
    }
    return true
  }

  if (!auth.isLoggedIn) return '/login'

  const allowedRoles = to.meta.roles as string[] | undefined
  if (!canAccessRoute(role, allowedRoles)) {
    return { name: getRoleHomeRoute(role) }
  }

  if (to.meta.propertyLeaderOnly && !canAccessLeaderOnlyRoute(auth.profile, String(to.name || ''))) {
    return { name: getRoleHomeRoute(role) }
  }

  return true
})

export default router
