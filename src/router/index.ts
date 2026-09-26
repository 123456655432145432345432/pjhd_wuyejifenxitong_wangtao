import { createRouter, createWebHistory } from 'vue-router'
import { USER_ROLE } from '../constants/enums'
import {
  ADMIN_ROLES,
  canAccessLeaderOnlyRoute,
  canAccessRoute,
  getRoleHomeRoute
} from '../constants/roles'
import { isMobileShellRole, MOBILE_SHELL_ROLES } from '../constants/mobilePortal'
import { useAuthStore } from '../stores/auth'
import AppLayout from '../layouts/AppLayout.vue'
import MobileHome from '../views/mobile/MobileHome.vue'
import MobileWorkbench from '../views/mobile/MobileWorkbench.vue'
import MobileProfile from '../views/mobile/MobileProfile.vue'
import Dashboard from '../views/Dashboard.vue'
import Permission from '../views/Permission.vue'
import Merchant from '../views/Merchant.vue'
import MerchantPointApproval from '../views/admin/MerchantPointApproval.vue'
import BuildingChangeApprovals from '../views/admin/BuildingChangeApprovals.vue'
import OrderRefundApprovals from '../views/admin/OrderRefundApprovals.vue'
import MerchantWithdrawalApproval from '../views/admin/MerchantWithdrawalApproval.vue'
import RoleWithdrawalApproval from '../views/admin/RoleWithdrawalApproval.vue'
import IndividualLeaders from '../views/admin/IndividualLeaders.vue'
import CoinWithdrawalApproval from '../views/admin/CoinWithdrawalApproval.vue'
import PropertyContact from '../views/admin/PropertyContact.vue'
import PlatformShareConfig from '../views/admin/PlatformShareConfig.vue'
import PlatformEarnings from '../views/admin/PlatformEarnings.vue'
import CourierManagers from '../views/admin/CourierManagers.vue'
import DeliveryPriceRanges from '../views/admin/DeliveryPriceRanges.vue'
import PriceApprovals from '../views/admin/PriceApprovals.vue'
import ArrearsReport from '../views/admin/ArrearsReport.vue'
import PropertyChat from '../views/admin/PropertyChat.vue'
import RoomStructure from '../views/admin/RoomStructure.vue'
import CommunityPoints from '../views/admin/CommunityPoints.vue'
import ProfileRewards from '../views/admin/ProfileRewards.vue'
import CompanyAccount from '../views/admin/CompanyAccount.vue'
import SettlementAccount from '../views/admin/SettlementAccount.vue'
import DistributionRecords from '../views/admin/DistributionRecords.vue'
import DistributionStats from '../views/admin/DistributionStats.vue'
import CbkAccounts from '../views/admin/CbkAccounts.vue'
import CbkReconcile from '../views/admin/CbkReconcile.vue'
import TransferToProperty from '../views/admin/TransferToProperty.vue'
import RegionalLeaders from '../views/admin/RegionalLeaders.vue'
import RoleAccounts from '../views/admin/RoleAccounts.vue'
import CommunityForum from '../views/admin/CommunityForum.vue'
import ResidentMerchants from '../views/admin/ResidentMerchants.vue'
import MerchantAdSettings from '../views/admin/MerchantAdSettings.vue'
import CanteenManage from '../views/admin/CanteenManage.vue'
import Points from '../views/Points.vue'
import Resident from '../views/Resident.vue'
import Param from '../views/Param.vue'
import Notice from '../views/Notice.vue'
import DirectedMessage from '../views/DirectedMessage.vue'
import CommunityEntity from '../views/CommunityEntity.vue'
import PropertyOperators from '../views/PropertyOperators.vue'
import Delivery from '../views/Delivery.vue'
import SectorLeaders from '../views/SectorLeaders.vue'
import Coordinators from '../views/admin/Coordinators.vue'
import PropertyCompanies from '../views/admin/PropertyCompanies.vue'
import SettlementConfig from '../views/admin/SettlementConfig.vue'
import RewardGrantApprovals from '../views/admin/RewardGrantApprovals.vue'
import PropertyBankCards from '../views/admin/PropertyBankCards.vue'
import PlatformConfig from '../views/admin/PlatformConfig.vue'
import NavigationItems from '../views/admin/NavigationItems.vue'
import RegionQuotas from '../views/admin/RegionQuotas.vue'
import ActivityGroupReviews from '../views/admin/ActivityGroupReviews.vue'
import ResidentDeletionReviews from '../views/admin/ResidentDeletionReviews.vue'
import SplitRecovery from '../views/admin/SplitRecovery.vue'
import MerchantApplyment from '../views/admin/MerchantApplyment.vue'
import MerchantRecommended from '../views/admin/MerchantRecommended.vue'
import TransferAccounts from '../views/TransferAccounts.vue'
import Login from '../views/Login.vue'
import ResidentShop from '../views/resident/ResidentShop.vue'
import PublicResidentShops from '../views/public/PublicResidentShops.vue'
import PublicResidentShop from '../views/public/PublicResidentShop.vue'
import MerchantOverview from '../views/merchant/MerchantOverview.vue'
import MerchantOrders from '../views/merchant/MerchantOrders.vue'
import MerchantProducts from '../views/merchant/MerchantProducts.vue'
import MerchantPoints from '../views/merchant/MerchantPoints.vue'
import MerchantWithdrawals from '../views/merchant/MerchantWithdrawals.vue'
import MerchantWechatApplyment from '../views/merchant/MerchantWechatApplyment.vue'
import MerchantServiceScope from '../views/merchant/MerchantServiceScope.vue'
import MerchantServiceRequests from '../views/merchant/MerchantServiceRequests.vue'
import MerchantAds from '../views/merchant/MerchantAds.vue'
import MerchantKeywords from '../views/merchant/MerchantKeywords.vue'
import MerchantPosts from '../views/merchant/MerchantPosts.vue'
import CourierAvailable from '../views/courier/CourierAvailable.vue'
import CourierTasks from '../views/courier/CourierTasks.vue'
import CourierOverview from '../views/courier/CourierOverview.vue'
import CoordinatorOverview from '../views/coordinator/CoordinatorOverview.vue'
import CoordinatorMerchants from '../views/coordinator/CoordinatorMerchants.vue'
import CoordinatorRanking from '../views/coordinator/CoordinatorRanking.vue'
import CoordinatorAnnouncements from '../views/coordinator/CoordinatorAnnouncements.vue'
import CoordinatorActivityGroups from '../views/coordinator/CoordinatorActivityGroups.vue'
import CoordinatorServices from '../views/coordinator/CoordinatorServices.vue'
import CoordinatorOffers from '../views/coordinator/CoordinatorOffers.vue'
import CoordinatorSectorLeaders from '../views/coordinator/CoordinatorSectorLeaders.vue'
import CoordinatorWithdrawals from '../views/coordinator/CoordinatorWithdrawals.vue'
import SectorLeaderOverview from '../views/sector-leader/SectorLeaderOverview.vue'
import SectorLeaderMerchants from '../views/sector-leader/SectorLeaderMerchants.vue'
import SectorLeaderRanking from '../views/sector-leader/SectorLeaderRanking.vue'
import SectorLeaderOffers from '../views/sector-leader/SectorLeaderOffers.vue'
import SectorLeaderWithdrawals from '../views/sector-leader/SectorLeaderWithdrawals.vue'
import IndividualLeaderOverview from '../views/individual-leader/IndividualLeaderOverview.vue'
import IndividualLeaderMerchants from '../views/individual-leader/IndividualLeaderMerchants.vue'
import IndividualLeaderServices from '../views/individual-leader/IndividualLeaderServices.vue'
import IndividualLeaderWithdrawals from '../views/individual-leader/IndividualLeaderWithdrawals.vue'
import ActivityLeaderOverview from '../views/activity-leader/ActivityLeaderOverview.vue'
import ActivityLeaderGroups from '../views/activity-leader/ActivityLeaderGroups.vue'
import TechnicianOverview from '../views/technician/TechnicianOverview.vue'
import TechnicianTasks from '../views/technician/TechnicianTasks.vue'
import CourierWithdrawals from '../views/courier/CourierWithdrawals.vue'

const ADMIN_ROLE_LIST = [...ADMIN_ROLES]
const MOBILE_SHELL_ROLE_LIST = [...MOBILE_SHELL_ROLES]
/** 平台管理员专属路由 */
const PLATFORM_ADMIN_ONLY = [USER_ROLE.PLATFORM_ADMIN]
/** 参数配置 / 权限分配 / 操作员管理：路由守卫另校验 property_sub_role */
const ADMIN_LEADER_ROLES = [...ADMIN_ROLES]
const DIRECTED_MESSAGE_ROLES = [
  ...ADMIN_ROLE_LIST,
  USER_ROLE.COORDINATOR
]
const TRANSFER_ACCOUNT_ROLES = [
  USER_ROLE.PROPERTY_ADMIN,
  USER_ROLE.COORDINATOR,
  USER_ROLE.SECTOR_LEADER,
  USER_ROLE.INDIVIDUAL_LEADER
]
const WECHAT_APPLYMENT_ROLES = [
  USER_ROLE.MERCHANT,
  USER_ROLE.ACTIVITY_LEADER,
  USER_ROLE.TECHNICIAN
]

const routes = [
  {
    path: '/login',
    name: 'login',
    component: Login,
    meta: { title: '登录', public: true }
  },
  {
    path: '/public/resident-shops',
    name: 'public-resident-shops',
    component: PublicResidentShops,
    meta: { title: '业主商户橱窗', public: true }
  },
  {
    path: '/public/resident-shops/:residentId',
    name: 'public-resident-shop',
    component: PublicResidentShop,
    meta: { title: '店铺详情', public: true }
  },
  {
    path: '/',
    component: AppLayout,
    children: [
      {
        path: 'mobile/home',
        name: 'mobile-home',
        component: MobileHome,
        meta: { title: '首页', roles: MOBILE_SHELL_ROLE_LIST }
      },
      {
        path: 'mobile/workbench',
        name: 'mobile-workbench',
        component: MobileWorkbench,
        meta: { title: '工作台', roles: MOBILE_SHELL_ROLE_LIST }
      },
      {
        path: 'mobile/profile',
        name: 'mobile-profile',
        component: MobileProfile,
        meta: { title: '我的', roles: MOBILE_SHELL_ROLE_LIST }
      },
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
        meta: { title: '住户管理', roles: [...ADMIN_ROLE_LIST, USER_ROLE.COORDINATOR] }
      },
      {
        path: 'building-change-approvals',
        name: 'building-change-approvals',
        component: BuildingChangeApprovals,
        meta: { title: '楼栋变更审批', roles: ADMIN_ROLE_LIST }
      },
      {
        path: 'order-refund-approvals',
        name: 'order-refund-approvals',
        component: OrderRefundApprovals,
        meta: { title: '退货审批', roles: ADMIN_ROLE_LIST }
      },
      {
        path: 'merchant/onboarding-approval',
        name: 'merchant-onboarding-approval',
        component: Merchant,
        meta: { title: '商家入驻审核', roles: ADMIN_ROLE_LIST }
      },
      {
        path: 'merchant',
        name: 'merchant',
        component: Merchant,
        meta: { title: '商家管理', roles: ADMIN_ROLE_LIST }
      },
      {
        path: 'merchant/:id/applyment',
        name: 'merchant-applyment',
        component: MerchantApplyment,
        meta: { title: '商家微信进件', roles: ADMIN_ROLE_LIST }
      },
      {
        path: 'merchant/recommended',
        name: 'merchant-recommended',
        component: MerchantRecommended,
        meta: {
          title: '物业推荐维护',
          roles: [
            ...ADMIN_ROLE_LIST
          ]
        }
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
        meta: { title: '商家提现审批', roles: ADMIN_ROLE_LIST }
      },
      {
        path: 'merchant/role-withdrawal-approval',
        name: 'role-withdrawal-approval',
        component: RoleWithdrawalApproval,
        meta: { title: '配送员提现审批', roles: ADMIN_ROLE_LIST }
      },
      {
        path: 'coin-withdrawal-approval',
        name: 'coin-withdrawal-approval',
        component: CoinWithdrawalApproval,
        meta: { title: '物业币提现审批', roles: ADMIN_ROLE_LIST }
      },
      {
        path: 'property-contact',
        name: 'property-contact',
        component: PropertyContact,
        meta: { title: '物业联系方式', roles: ADMIN_ROLE_LIST }
      },
      {
        path: 'permission',
        name: 'permission',
        component: Permission,
        meta: { title: '权限配置', roles: ADMIN_LEADER_ROLES, propertyLeaderOnly: true }
      },
      {
        path: 'property-companies',
        name: 'property-companies',
        component: PropertyCompanies,
        meta: { title: '物业公司', roles: PLATFORM_ADMIN_ONLY }
      },
      {
        path: 'coordinators',
        name: 'coordinators',
        component: Coordinators,
        meta: { title: '统筹人员', roles: ADMIN_LEADER_ROLES, propertyLeaderOnly: true }
      },
      {
        path: 'sector-leaders',
        name: 'sector-leaders',
        component: SectorLeaders,
        meta: { title: '板块负责人', roles: ADMIN_ROLE_LIST }
      },
      {
        path: 'individual-leaders',
        name: 'individual-leaders',
        component: IndividualLeaders,
        meta: { title: '一级代理', roles: ADMIN_ROLE_LIST }
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
        path: 'reward-grant-approvals',
        name: 'reward-grant-approvals',
        component: RewardGrantApprovals,
        meta: { title: '发放审批', roles: ADMIN_LEADER_ROLES, propertyLeaderOnly: true }
      },
      {
        path: 'property-bank-cards',
        name: 'property-bank-cards',
        component: PropertyBankCards,
        meta: { title: '物业银行卡', roles: ADMIN_LEADER_ROLES, propertyLeaderOnly: true }
      },
      {
        path: 'region-quotas',
        name: 'region-quotas',
        component: RegionQuotas,
        meta: { title: '区域配额', roles: ADMIN_LEADER_ROLES, propertyLeaderOnly: true }
      },
      {
        path: 'navigation-items',
        name: 'navigation-items',
        component: NavigationItems,
        meta: { title: '导航配置', roles: ADMIN_LEADER_ROLES, propertyLeaderOnly: true }
      },
      {
        path: 'activity-group-reviews',
        name: 'activity-group-reviews',
        component: ActivityGroupReviews,
        meta: { title: '活动组审核', roles: ADMIN_LEADER_ROLES }
      },
      {
        path: 'resident-deletion-reviews',
        name: 'resident-deletion-reviews',
        component: ResidentDeletionReviews,
        meta: { title: '住户注销终审', roles: PLATFORM_ADMIN_ONLY }
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
        path: 'resident-merchants',
        name: 'resident-merchants',
        component: ResidentMerchants,
        meta: { title: '业主商户', roles: ADMIN_ROLE_LIST }
      },
      {
        path: 'merchant-ad-settings',
        name: 'merchant-ad-settings',
        component: MerchantAdSettings,
        meta: { title: '商家广告设置', roles: ADMIN_ROLE_LIST }
      },
      {
        path: 'canteen',
        name: 'canteen-manage',
        component: CanteenManage,
        meta: { title: '社区食堂', roles: ADMIN_ROLE_LIST }
      },
      {
        path: 'resident-shop',
        name: 'resident-shop',
        component: ResidentShop,
        meta: { title: '我的店铺', roles: [USER_ROLE.RESIDENT] }
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
        meta: { title: '平台分成配置', roles: PLATFORM_ADMIN_ONLY }
      },
      {
        path: 'platform-config',
        name: 'platform-config',
        component: PlatformConfig,
        meta: { title: '平台配置', roles: PLATFORM_ADMIN_ONLY }
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
        path: 'role-accounts',
        name: 'role-accounts',
        component: RoleAccounts,
        meta: { title: '业务角色账号', roles: ADMIN_ROLE_LIST }
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
        // 板块：platform_admin || property_leader；审批仅领导（页内按钮控制）
        meta: { title: '价格审批', roles: ADMIN_LEADER_ROLES, propertyLeaderOnly: true }
      },
      {
        path: 'arrears-report',
        name: 'arrears-report',
        component: ArrearsReport,
        meta: { title: '欠费报表', roles: ADMIN_ROLE_LIST }
      },
      {
        path: 'property-chat',
        name: 'property-chat',
        component: PropertyChat,
        meta: { title: '住户消息', roles: ADMIN_ROLE_LIST }
      },
      {
        path: 'community-forum',
        name: 'community-forum',
        component: CommunityForum,
        meta: { title: '社区论坛', roles: ADMIN_ROLE_LIST }
      },
      {
        path: 'room-structure',
        name: 'room-structure',
        component: RoomStructure,
        meta: { title: '楼宇结构', roles: ADMIN_ROLE_LIST }
      },
      {
        path: 'community-points',
        name: 'community-points',
        component: CommunityPoints,
        meta: { title: '建设积分', roles: ADMIN_ROLE_LIST }
      },
      {
        path: 'transfer-to-property',
        name: 'transfer-to-property',
        component: TransferToProperty,
        meta: {
          title: '转给物业对账',
          roles: [
            ...ADMIN_ROLE_LIST,
            USER_ROLE.COORDINATOR,
            USER_ROLE.SECTOR_LEADER,
            USER_ROLE.INDIVIDUAL_LEADER
          ]
        }
      },
      {
        path: 'profile-rewards',
        name: 'profile-rewards',
        component: ProfileRewards,
        meta: { title: '资料奖励', roles: [...ADMIN_ROLE_LIST, USER_ROLE.COORDINATOR] }
      },
      {
        path: 'company-account',
        name: 'company-account',
        component: CompanyAccount,
        meta: { title: '公司账户', roles: ADMIN_ROLE_LIST }
      },
      {
        path: 'settlement-account',
        name: 'settlement-account',
        component: SettlementAccount,
        meta: { title: '分成账户', roles: ADMIN_ROLE_LIST }
      },
      {
        path: 'distribution-records',
        name: 'distribution-records',
        component: DistributionRecords,
        meta: {
          title: '分成明细',
          roles: [...ADMIN_ROLE_LIST, USER_ROLE.COORDINATOR]
        }
      },
      {
        path: 'distribution-stats',
        name: 'distribution-stats',
        component: DistributionStats,
        meta: {
          title: '分成统计',
          roles: [...ADMIN_ROLE_LIST, USER_ROLE.COORDINATOR]
        }
      },
      {
        path: 'settlement-config',
        name: 'settlement-config',
        component: SettlementConfig,
        meta: { title: '结算配置', roles: ADMIN_LEADER_ROLES, propertyLeaderOnly: true }
      },
      {
        path: 'split-recovery',
        name: 'split-recovery',
        component: SplitRecovery,
        meta: { title: '待追回台账', roles: ADMIN_ROLE_LIST }
      },
      {
        path: 'transfer-accounts',
        name: 'transfer-accounts',
        component: TransferAccounts,
        meta: { title: '收款方式', roles: TRANSFER_ACCOUNT_ROLES }
      },
      {
        path: 'cbk/accounts',
        name: 'cbk-accounts',
        component: CbkAccounts,
        meta: { title: '收款账户（历史）', roles: ADMIN_ROLE_LIST }
      },
      {
        path: 'cbk/reconcile',
        name: 'cbk-reconcile',
        component: CbkReconcile,
        meta: { title: '分账对账台', roles: ADMIN_ROLE_LIST }
      },
      {
        path: 'cbk/allocations',
        redirect: { name: 'cbk-reconcile' }
      },
      {
        path: 'regional-leaders',
        name: 'regional-leaders',
        component: RegionalLeaders,
        meta: { title: '区域/项目负责人', roles: [...ADMIN_ROLE_LIST, USER_ROLE.SECTOR_LEADER] }
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
        path: 'merchant-portal/posts',
        name: 'merchant-posts',
        component: MerchantPosts,
        meta: { title: '店铺动态', roles: [USER_ROLE.MERCHANT] }
      },
      {
        path: 'merchant-portal/keywords',
        name: 'merchant-keywords',
        component: MerchantKeywords,
        meta: { title: '服务关键词', roles: [USER_ROLE.MERCHANT] }
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
        path: 'wechat-applyment',
        name: 'wechat-applyment',
        component: MerchantWechatApplyment,
        meta: { title: '微信收款', roles: WECHAT_APPLYMENT_ROLES }
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
        component: DistributionStats,
        meta: { title: '分成统计', roles: [USER_ROLE.COORDINATOR] }
      },
      {
        path: 'coordinator/records',
        name: 'coordinator-records',
        component: DistributionRecords,
        meta: { title: '分成明细', roles: [USER_ROLE.COORDINATOR] }
      },
      {
        path: 'coordinator/withdrawals',
        name: 'coordinator-withdrawals',
        component: CoordinatorWithdrawals,
        meta: { title: '提现管理', roles: [USER_ROLE.COORDINATOR] }
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
        path: 'sector-leader/withdrawals',
        name: 'sector-leader-withdrawals',
        component: SectorLeaderWithdrawals,
        meta: { title: '提现管理', roles: [USER_ROLE.SECTOR_LEADER] }
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
      },
      {
        path: 'activity-leader/overview',
        name: 'activity-leader-overview',
        component: ActivityLeaderOverview,
        meta: { title: '工作台', roles: [USER_ROLE.ACTIVITY_LEADER] }
      },
      {
        path: 'activity-leader/groups',
        name: 'activity-leader-groups',
        component: ActivityLeaderGroups,
        meta: { title: '我的活动组', roles: [USER_ROLE.ACTIVITY_LEADER] }
      },
      {
        path: 'activity-leader/products',
        name: 'activity-leader-products',
        component: MerchantProducts,
        meta: { title: '我的小店', roles: [USER_ROLE.ACTIVITY_LEADER] }
      },
      {
        path: 'activity-leader/withdrawals',
        name: 'activity-leader-withdrawals',
        component: MerchantWithdrawals,
        meta: { title: '提现管理', roles: [USER_ROLE.ACTIVITY_LEADER] }
      },
      {
        path: 'technician/overview',
        name: 'technician-overview',
        component: TechnicianOverview,
        meta: { title: '工作台', roles: [USER_ROLE.TECHNICIAN] }
      },
      {
        path: 'technician/tasks',
        name: 'technician-tasks',
        component: TechnicianTasks,
        meta: { title: '我的工单', roles: [USER_ROLE.TECHNICIAN] }
      },
      {
        path: 'technician/services',
        name: 'technician-services',
        component: IndividualLeaderServices,
        meta: { title: '我的服务', roles: [USER_ROLE.TECHNICIAN] }
      },
      {
        path: 'technician/withdrawals',
        name: 'technician-withdrawals',
        component: MerchantWithdrawals,
        meta: { title: '提现管理', roles: [USER_ROLE.TECHNICIAN] }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

function getEntryRouteName(role?: string | null): string {
  if (
    typeof window !== 'undefined' &&
    window.innerWidth <= 768 &&
    isMobileShellRole(role)
  ) {
    return 'mobile-home'
  }
  return getRoleHomeRoute(role)
}

router.beforeEach((to) => {
  const auth = useAuthStore()
  const role = auth.profile?.role

  if (to.meta.public) {
    if (auth.isLoggedIn && to.name === 'login') {
      return { name: getEntryRouteName(role) }
    }
    return true
  }

  if (!auth.isLoggedIn) return '/login'

  const allowedRoles = to.meta.roles as string[] | undefined
  if (!canAccessRoute(role, allowedRoles)) {
    const entry = getEntryRouteName(role)
    // 防止未知角色首页与目标页相同导致无限重定向
    if (to.name === entry) return true
    return { name: entry }
  }

  if (to.meta.propertyLeaderOnly && !canAccessLeaderOnlyRoute(auth.profile, String(to.name || ''))) {
    const entry = getEntryRouteName(role)
    if (to.name === entry) return true
    return { name: entry }
  }

  return true
})

export default router
