import type { AuditResult } from '../constants/enums'

export interface ApiResponse<T = unknown> {
  code: number
  errorCode?: string
  message: string
  data: T
  timestamp?: string
}

export interface Pagination {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface PageResult<T> {
  list: T[]
  pagination: Pagination
}

export interface LoginResult {
  accessToken: string
  refreshToken: string
  expiresIn: number
  tokenType: string
  resident?: UserProfile
  /** 部分环境可能用 user / profile 承载登录用户 */
  user?: UserProfile
  profile?: UserProfile
  propertySubRole?: string
  property_sub_role?: string
}

export interface UserProfile {
  id: string
  name: string
  phone?: string
  avatarUrl?: string
  role: string
  /** 物业管理员子角色：property_leader | property_operator（仅 role=property_admin 时有意义） */
  propertySubRole?: string
  propertyCompanyId?: string
  propertyName?: string
  communityId?: string
  communityName?: string
  /** 操作员管辖小区（可选） */
  communityIds?: string[]
  /** 操作员管辖楼栋（可选） */
  buildingNos?: string[]
  coordinatorId?: string
  sectorLeaderId?: string
  individualLeaderId?: string
  status?: string
  wechatBound?: boolean
  newUser?: boolean
  pointBalance?: number
  coinBalance?: number
}

export interface ResidentItem {
  id: string
  name?: string
  phone?: string
  avatarUrl?: string
  gender?: number
  /** 生日（YYYY-MM-DD）；年龄由后端按生日计算 */
  birthday?: string
  age?: number
  maritalStatus?: string
  hasChildren?: boolean
  role?: string
  userType?: string
  propertyCompanyId?: string
  propertyName?: string
  communityId?: string
  communityName?: string
  building?: string
  /** v4.8 楼层 */
  floor?: string
  unit?: string
  room?: string
  familyId?: string
  /** 个人积分余额 */
  pointBalance?: number
  /** v4.8 家庭积分余额（无家庭为 null） */
  familyPointBalance?: number | null
  coinBalance?: number
  coinFrozen?: boolean
  coinHidden?: boolean
  withdrawalBlocked?: boolean
  wechatBound?: boolean
  totalConsumption?: number
  totalOrders?: number
  /** v3.9 是否有欠费 */
  hasArrears?: boolean
  /** v3.9 欠费笔数 */
  arrearsCount?: number
  /** v3.9 欠费金额合计 */
  arrearsAmount?: number
  /** v4.8 欠费最早账期起始日 */
  arrearsPeriodStart?: string
  /** v4.8 欠费最晚账期结束日 */
  arrearsPeriodEnd?: string
  status?: string
  createdAt?: string
  updatedAt?: string
}

export interface ResidentCreatePayload {
  name: string
  phone: string
  userType: string
  role: string
  propertyCompanyId: string
  communityId: string
  avatarUrl?: string
  gender?: number
  birthday?: string
  age?: number
  maritalStatus?: string
  hasChildren?: boolean
  building?: string
  floor?: string
  unit?: string
  room?: string
}

/** §31.2 业务角色账号直建：merchant / activity_leader / technician / courier */
export type RoleAccountRole = 'merchant' | 'activity_leader' | 'technician' | 'courier'

export interface RoleAccountCreatePayload {
  role: RoleAccountRole | string
  name: string
  phone: string
  password: string
  /** 平台管理员必填；物业管理员可不传（后端用当前物业） */
  propertyCompanyId?: string
  communityId?: string
  /** merchant 建议填 */
  category?: string
  description?: string
  businessHours?: string
  address?: string
  coverUrls?: string[]
  deliveryFee?: number
  commissionRate?: number
  pointExchangeRate?: number
}

export interface RoleAccountCreateResult {
  residentId: string
  name?: string
  phone?: string
  role?: string
  propertyCompanyId?: string
  /** role=merchant 时返回 */
  merchantId?: string | null
  status?: string
}

export interface RoleAccountDeleteResult {
  residentId: string
  deleted: boolean
  message?: string
}

export interface RoleAccountDisableResult {
  residentId: string
  status?: string
  merchantStatus?: string
  message?: string
}

export interface ResidentUpdatePayload {
  name?: string
  avatarUrl?: string
  gender?: number
  birthday?: string
  age?: number
  maritalStatus?: string
  hasChildren?: boolean
  building?: string
  floor?: string
  unit?: string
  room?: string
}

/** GET /admin/building-changes 列表项（§2.6.3） */
export interface BuildingChangeApplication {
  id: string
  residentId: string
  residentName?: string
  residentPhone?: string
  propertyCompanyId?: string
  propertyCompanyName?: string
  communityId?: string
  communityName?: string
  /** 后端字段：当前楼栋 */
  currentBuilding?: string
  /** 后端字段：当前单元 */
  currentUnit?: string
  /** 后端字段：当前房号 */
  currentRoom?: string
  /** 前端归一化后的原地址（来自 current*） */
  oldBuilding?: string
  oldUnit?: string
  oldFloor?: string
  oldRoom?: string
  building: string
  unit: string
  floor?: string
  room: string
  status: string
  rejectReason?: string | null
  /** 后端字段：申请时间 */
  appliedAt?: string
  createdAt?: string
  auditedAt?: string
}

export interface ResidentStatusPayload {
  status: string
  reason?: string
}

/** GET /families/{id}/members */
export interface FamilyMemberItem {
  id: string
  name?: string
  phone?: string
  avatarUrl?: string
  relation?: string
  isOwner?: boolean
  pointBalance?: number
  coinBalance?: number
  status?: string
  joinedAt?: string
}

export interface CoinFreezePayload {
  amount: number
  reason: string
}

export interface CoinFreezeResult {
  id: string
  residentId: string
  residentName: string
  action: string
  amount: number
  reason: string
  operatorId: string
  operatorName: string
  frozenAt: string
}

export interface CoinUnfreezePayload {
  reason: string
  frozenRecordId?: string
}

export interface CoinUnfreezeResult {
  residentId: string
  unfrozenAmount: number
  newBalance: number
  unfrozenAt: string
  operatorId: string
}

/** POST /property-coins/earn — 管理员发放物业币 */
export interface PropertyCoinEarnPayload {
  residentId: string
  coinAmount: number
  source: string
  description?: string
}

export interface PropertyCoinEarnResult {
  residentId?: string
  coinAmount?: number
  newBalance?: number
  balance?: number
}

/** POST /admin/merchants/{id}/coin/earn — 给商家关联居民账户发放物业币 */
export interface MerchantCoinEarnPayload {
  coinAmount: number
  /** 默认 manual */
  source?: string
  description?: string
  sourceId?: string
}

export interface CoinFreezeRecordItem {
  id: string
  residentId: string
  residentName: string
  residentPhone?: string
  residentBuilding?: string
  residentRoom?: string
  action: string
  amount: number | string
  reason: string
  operatorId?: string
  createdAt: string
}

export interface DeliveryFeeTier {
  id?: string
  minKm: number
  maxKm: number
  fee: number
  enabled: boolean
}

/** GET/PUT /admin/merchants/{id}/community-distances（§42.1） */
export interface MerchantCommunityDistanceItem {
  communityId: string
  communityName?: string
  distanceKm?: number | null
}

export interface MerchantCommunityDistancesPayload {
  items: Array<{
    communityId: string
    distanceKm: number | null
  }>
}

/** GET /admin/transfer-to-property/points|coins（§42.2） */
export interface TransferToPropertyItem {
  id: string
  type?: 'point' | 'coin' | string
  residentId?: string
  residentName?: string
  residentPhone?: string
  amount?: number
  remark?: string
  propertyCompanyId?: string
  createdAt?: string
}

export interface MerchantDuplicateBindingData {
  id?: string
  name?: string
  auditStatus?: string
  applyRole?: string
  merchantSource?: string
  propertyCompanyId?: string
  contactPhone?: string
}

export interface MerchantItem {
  id: string
  platformMerchantId?: string
  propertyCompanyId?: string
  name: string
  description?: string
  category?: string
  commissionRate?: number
  /** 商家挂接配置兑换比：1元=X积分（订单支付/返积分以此为准，默认100） */
  pointExchangeRate?: number
  coinRebateRate?: number
  memberDiscountPrice?: number | string | null
  auditStatus?: string
  status?: string
  /** 商家来源：platform / group_leader / technician（v4.1） */
  merchantSource?: string
  /** 商家角色类型：goods / technician / group_leader / canteen（v6.8） */
  merchantType?: string
  /** 是否社区食堂主商家（仅 merchantType=canteen 有意义） */
  isCanteenMainMerchant?: boolean
  /** 住户入驻时申请的业务身份 */
  applyRole?: string
  intendedRole?: string
  rejectReason?: string | null
  serveAllCommunities?: boolean
  communityIds?: string[]
  communityNames?: string[]
  coinRebateEnabled?: boolean
  merchantLevel?: string
  levelWeight?: number
  businessHours?: string
  contactPhone?: string
  address?: string
  deliveryFee?: string | number
  freeDeliveryThreshold?: string | number
  freeDeliveryEnabled?: boolean
  freeDeliverySponsor?: string
  coverUrls?: string[]
  videoUrl?: string | null
  qrCodeUrl?: string
  rankOrder?: number
  createdAt?: string
  updatedAt?: string
  totalOrders?: number
  totalRevenue?: number
  withdrawableAmount?: number
  totalWithdrawn?: number
  withdrawalBlocked?: boolean
  deliveryScope?: string
  distanceType?: string
  deliveryFeeTiers?: DeliveryFeeTier[]
  deliveryFees?: DeliveryFeeTier[]
  isOfficialRecommended?: boolean
  recommendedSort?: number
}

export interface MerchantUpdatePayload {
  name?: string
  description?: string
  coverUrls?: string[]
  videoUrl?: string
  businessHours?: string
  contactPhone?: string
  address?: string
  deliveryFee?: number | string
  freeDeliveryThreshold?: number | string
  freeDeliveryEnabled?: boolean
  freeDeliverySponsor?: string
  /** 配送范围：in_community / out_community / both（§76） */
  deliveryScope?: string
  /** 商家配送距离：any / radius / district / city */
  distanceType?: string
  deliveryFeeTiers?: DeliveryFeeTier[]
  rankOrder?: number
  merchantLevel?: string
  category?: string
}

export interface PlatformMerchantLinkedProperty {
  propertyCompanyId: string
  propertyName: string
  linkedAt: string
}

export interface PlatformMerchantItem {
  id: string
  name: string
  category?: string
  contactPhone?: string
  description?: string
  coverUrl?: string
  businessHours?: string
  address?: string
  status?: string
  linkedPropertyCount?: number
  linkedProperties?: PlatformMerchantLinkedProperty[]
  createdAt?: string
  updatedAt?: string
}

export interface PlatformMerchantCreatePayload {
  name: string
  category: string
  contactPhone: string
  description?: string
  coverUrl?: string
  businessHours?: string
  address?: string
}

export interface PlatformMerchantUpdatePayload {
  name?: string
  category?: string
  contactPhone?: string
  description?: string
  coverUrl?: string
  businessHours?: string
  address?: string
  status?: string
}

export interface MerchantKickPayload {
  reason: string
  notifyMerchant?: boolean
}

export interface MerchantKickResult {
  merchantId: string
  merchantName: string
  status: string
  reason: string
  kickedAt: string
  operatorId?: string
  notifySent?: boolean
}

export interface MerchantAuditPayload {
  auditResult: AuditResult
  rejectReason?: string
  remark?: string
  merchantLevel?: string
  category?: string
  businessHours?: string
  deliveryFee?: string
  freeDeliveryThreshold?: string
  applyRole?: string
  intendedRole?: string
}

export interface MerchantAuditResult {
  id: string
  name: string
  auditStatus: string
  auditResult: string
  rejectReason?: string | null
  merchantLevel?: string
  category?: string
  operatorId?: string
  operatorName?: string | null
  auditedAt?: string
}

export interface MerchantProfitSpace {
  platformMerchantId?: string
  platformMerchantName?: string
  merchantId?: string
  merchantName?: string
  propertyCompanyId?: string
  propertyName?: string
  period?: string
  startDate?: string
  endDate?: string
  metrics?: {
    totalOrders?: number
    totalRevenue?: number
    totalCommission?: number
    totalDeliveryFee?: number
    totalPointCost?: number
    totalCoinCost?: number
    netProfit?: number
    profitMargin?: number
  }
  breakdown?: {
    productAmount?: number
    commissionBaseAmount?: number
    merchantGoodsShare?: number
    merchantDeliverySubsidy?: number
    merchantShare?: number
    distributableAmount?: number
    propertyShare?: number
    managementPoolAmount?: number
    coordinatorShare?: number
    sectorGrossAmount?: number
    sectorLeaderShare?: number
    individualLeaderShare?: number
    platformShare?: number
    deficitAmount?: number
    deficitSponsor?: string | null
    originalDeliveryFee?: number
    deliveryFee?: number
    deliveryWaiverAmount?: number
    deliverySubsidySponsor?: string
    deliverySubsidyAmount?: number
    deliverySettlementBase?: number
    platformDeliveryShare?: number
    courierEarning?: number
    calculationVersion?: string
  }
  comparison?: {
    lastPeriodRevenue?: number
    revenueGrowthRate?: number
    lastPeriodProfit?: number
    profitGrowthRate?: number
  }
}

export interface AnnouncementCollectField {
  name: string
  label: string
  type: string
}

export interface AnnouncementItem {
  id: string
  title: string
  content?: string
  announcementType?: string
  propertyCompanyId?: string
  communityId?: string
  merchantId?: string | null
  coverUrls?: string[]
  targetRoles?: string[]
  targetBuildings?: string[]
  collectEnabled?: boolean
  collectFields?: AnnouncementCollectField[]
  deliveryChannel?: string
  pushToChat?: boolean
  status?: string
  publishedAt?: string
  createdAt?: string
  updatedAt?: string
  publisherName?: string
  publisher?: string
}

export interface AnnouncementCreatePayload {
  title: string
  content: string
  announcementType: string
  propertyCompanyId?: string
  communityId?: string
  merchantId?: string
  coverUrls?: string[]
  targetRoles?: string[]
  targetBuildings?: string[]
  collectEnabled?: boolean
  collectFields?: AnnouncementCollectField[]
  deliveryChannel?: string
  pushToChat?: boolean
  status?: string
}

export interface AnnouncementUpdatePayload {
  title?: string
  content?: string
  announcementType?: string
  communityId?: string
  coverUrls?: string[]
  targetRoles?: string[]
  targetBuildings?: string[]
  collectEnabled?: boolean
  collectFields?: AnnouncementCollectField[]
  deliveryChannel?: string
  pushToChat?: boolean
  status?: string
}

export interface AnnouncementReadStats {
  announcementId: string
  deliveryChannel?: string
  targetCount?: number
  readCount?: number
  unreadCount?: number
  readRate?: number
  byBuilding?: Array<{ buildingNo: string; readCount: number; unreadCount: number }>
}

export interface OperationLogItem {
  id?: string
  createdAt?: string
  time?: string
  operatorId?: string
  operatorName?: string
  operator?: string
  action?: string
  module?: string
  content?: string
  description?: string
  targetName?: string
  target?: string
  targetId?: string
  result?: string | boolean
  status?: string
  success?: boolean
}

export interface PermissionItemDto {
  code: string
  name: string
  module?: string
  action?: string
  description?: string
  category?: string
  group?: string
  enabled?: boolean
  granted?: boolean
}

export interface RolePresetDto {
  id: string
  code?: string
  name: string
  role?: string
  permissionCodes?: string[]
  permissions?: string[]
  isDefault?: boolean
  createdAt?: string
}

export interface AdminUserAccount {
  id: string
  name: string
  phone?: string
  role: string
  propertyCompanyId?: string
  status?: string
  effectivePermissionCount?: number
}

export interface UserPermissionsDetail {
  userId: string
  userName?: string
  role?: string
  rolePresetId?: string
  rolePresetName?: string
  effectivePermissions?: string[]
  grantedPermissions?: Array<{ code: string; reason?: string; grantedAt?: string }>
  revokedPermissions?: Array<{ code: string; reason?: string; revokedAt?: string }>
}

export interface PermissionChangeLog {
  id?: string
  userId?: string
  userName?: string
  operatorId?: string
  operatorName?: string
  action?: string
  permissionCode?: string
  reason?: string
  createdAt?: string
  targetName?: string
  targetUserName?: string
  content?: string
  changeContent?: string
}

export interface LeaderItem {
  id: string
  name: string
  role?: string
  roleName?: string
  phone?: string
  sector?: string
}

export interface DeliveryRule {
  id: string
  name?: string
  baseFee?: number
  perKgFee?: number
  propertyCompanyId?: string
  /** 默认 both（§76.2） */
  deliveryScope?: string
  distanceType?: string
}

/** GET /delivery-rules/scope-options（§76.1） */
export interface DeliveryScopeCodeOption {
  code: string
  description: string
}

export interface DeliveryScopeOptions {
  deliveryScopes: DeliveryScopeCodeOption[]
  distanceTypes: DeliveryScopeCodeOption[]
}

export interface DeliveryRuleUpsertPayload {
  name?: string
  baseFee?: number
  perKgFee?: number
  propertyCompanyId?: string
  /** 默认 both */
  deliveryScope?: string
  distanceType?: string
}

export interface PropertyCompanyCommunity {
  id: string
  name?: string
  address?: string
  totalBuildings?: number
  totalUnits?: number
  status?: string
  createdAt?: string
}

export interface PropertyCompanyAdmin {
  id: string
  name?: string
  phone?: string
  role?: string
}

export interface PropertyCompanyDetail {
  id: string
  name?: string
  logoUrl?: string
  contactPhone?: string
  address?: string
  status?: string
  communityCount?: number
  config?: PropertyCompanyConfig
  pointEnabled?: boolean
  pointDisplayEnabled?: boolean
  coinEnabled?: boolean
  coinDisplayEnabled?: boolean
  communities?: PropertyCompanyCommunity[]
  admins?: PropertyCompanyAdmin[]
  /** v3.9 详情回显补全 */
  deliveryPerKgFee?: number
  /** 物业级参考兑换比（默认100）；订单支付请用商家详情/挂接配置的 pointExchangeRate */
  pointExchangeRate?: number
  platformShareRate?: number
  platformDeliveryShareRate?: number
  platformWithdrawalFeeShareRate?: number
  regionalLeaderRate?: number
  projectLeaderRate?: number
  autoWithdrawalEnabled?: boolean
  autoWithdrawalPeriodDays?: number
  coinUseCondition?: string | null
  coinPointThreshold?: number
  companyAccountBalance?: number
  /** v3.9 积分分成比例（合计 ≤ 0.30） */
  residentPointShareRate?: number
  merchantPointShareRate?: number
  coinPointShareRate?: number
  sharedPointShareRate?: number
  createdAt?: string
  updatedAt?: string
}

/** PUT /property-companies/{id} / PUT /admin/property-companies/{id} */
export interface PropertyCompanyUpdatePayload {
  name?: string
  logoUrl?: string
  contactPhone?: string
  address?: string
  pointEnabled?: boolean
  pointDisplayEnabled?: boolean
  coinEnabled?: boolean
  coinDisplayEnabled?: boolean
  deliveryPerKgFee?: number
  pointExchangeRate?: number
  residentPointShareRate?: number
  merchantPointShareRate?: number
  coinPointShareRate?: number
  sharedPointShareRate?: number
}

export interface PropertyCompanyItem {
  id: string
  name: string
  logoUrl?: string
  contactPhone?: string
  address?: string
  communityCount?: number
  communityEntityIds?: string[]
  status?: string
  createdAt?: string
}

export interface PropertyCompanyConfig {
  propertyShareRate?: number
  coordinatorShareRate?: number
  sectorLeaderRate?: number
  individualLeaderRate?: number
  platformShareRate?: number
  platformDeliveryShareRate?: number
  platformWithdrawalFeeShareRate?: number
  /** 物业级区域负责人参考比例（主分成链外，个人 shareRate 仍走区域负责人页） */
  regionalLeaderRate?: number
  /** 物业级项目负责人参考比例 */
  projectLeaderRate?: number
  pointEnabled?: boolean
  pointDisplayEnabled?: boolean
  coinEnabled?: boolean
  coinDisplayEnabled?: boolean
  coinIssueMode?: string
  coinExpiryDays?: number
  coinFreezeDefault?: boolean
  coinMallEnabled?: boolean
  coinMallMaxRatio?: number
  coinMallMinAmount?: number
  deliveryBaseFee?: number
  deliveryCourierShareRate?: number
  withdrawalFeeRate?: number
  pointToFeeRate?: number
  twoYearClearEnabled?: boolean
  neighborDailyContactLimit?: number
  /** 物业级积分兑换比（参考展示，默认100；订单支付以商家挂接配置为准） */
  pointExchangeRate?: number
  deliveryPerKgFee?: number
  perKgFee?: number
}

export interface PointPool {
  propertyCompanyId?: string
  propertyCompanyName?: string
  balance?: number
  totalIn?: number
  totalOut?: number
  equivalentAmount?: number
  updatedAt?: string
}

export interface PointPoolRecordItem {
  id: string
  recordType?: string
  poolType?: string
  amount?: number
  balance?: number
  balanceBefore?: number
  balanceAfter?: number
  source?: string
  sourceId?: string
  description?: string
  remark?: string
  operatorId?: string
  createdAt?: string
  propertyCompanyId?: string
}

export interface DashboardOverview {
  /** 实际接口扁平字段 */
  totalResidents?: number
  totalFamilies?: number
  totalMerchants?: number
  propertyFeeCollectionRate?: number
  coinTotalIssued?: number
  frozenCoinCount?: number
  monthlyConsumption?: number
  pendingAuditCount?: number
  pointPoolBalance?: number
  /** 文档嵌套结构（兼容） */
  period?: string
  startDate?: string
  endDate?: string
  summary?: {
    totalOrders?: number
    totalRevenue?: number
    totalResidents?: number
    totalFamilies?: number
    activeResidents?: number
    newResidents?: number
    totalMerchants?: number
    activeMerchants?: number
    totalPointsIssued?: number
    totalPointsRedeemed?: number
    totalCoinIssued?: number
    coinConsumed?: number
    coinInCirculation?: number
    totalCoinRedeemed?: number
    propertyFeeCollectionRate?: number
    propertyFeeAmount?: number
    propertyFeeCollected?: number
  }
  trends?: {
    orderGrowthRate?: number
    revenueGrowthRate?: number
    residentGrowthRate?: number
    newResidentGrowthRate?: number
    merchantGrowthRate?: number
  }
  topMerchants?: Array<{
    id?: string
    name?: string
    merchantId?: string
    merchantName?: string
    orderCount?: number
    revenue?: number
  }>
  recentActivity?: Array<{
    type?: string
    description?: string
    time?: string
    timestamp?: string
  }>
}

export interface ReportsOverview {
  scope?: {
    propertyCompanyId?: string
    propertyCompanyName?: string
  }
  summary?: {
    residentCount?: number
    merchantCount?: number
    pointPoolBalance?: number
    propertyCoinCirculation?: number
    propertyFeeCollectionRate?: number
    totalConsumptionAmount?: number
  }
  comparison?: {
    consumptionGrowthRate?: number
    residentGrowthRate?: number
    orderGrowthRate?: number
  }
}

export interface DeliveryOrderItem {
  id?: string
  createdAt?: string
  time?: string
  residentName?: string
  userName?: string
  room?: string
  productName?: string
  product?: string
  deliveryFee?: number
  fee?: number | string
  status?: string
}

export interface DeliveryTodayStats {
  todayOrders?: number
  orderGrowth?: number
  onlineCouriers?: number
  totalCouriers?: number
  todayDeliveryFee?: number
  capacityLoad?: number
}

export interface DeliveryCourierItem {
  id: string
  name?: string
  todayCompleted?: number
  monthIncome?: number
  status?: string
}

export interface RecentDeliveryItem {
  id?: string
  time?: string
  residentName?: string
  productDesc?: string
  fee?: number
  status?: string
  fulfillmentMode?: string
  fulfillmentModeLabel?: string
  carrierType?: string
}

export interface DeliveryOverview {
  todayStats?: DeliveryTodayStats
  couriers?: DeliveryCourierItem[]
  recentDeliveries?: RecentDeliveryItem[]
}

export interface DeliveryHourlyData {
  hour?: number
  label?: string
  deliveryCount?: number
  avgResponseMinutes?: number
}

export interface DeliveryCapacity {
  dimension?: string
  peakHour?: string
  hourlyData?: DeliveryHourlyData[]
}

export interface DeliveryTaskItem {
  id: string
  courierName?: string
  courierId?: string
  status?: string
  createdAt?: string
}

export interface OrderLineItem {
  productId?: string
  productName?: string
  coverUrl?: string
  quantity?: number
  price?: number
  subtotal?: number
}

/** 履约选择审计（fulfillment_choice_logs） */
export interface FulfillmentChoiceLog {
  id?: string
  action?: string
  mode?: string
  operatorId?: string
  operatorName?: string
  remark?: string
  createdAt?: string
}

export interface OrderItem {
  id: string
  orderNo?: string
  createdAt?: string
  updatedAt?: string
  residentId?: string
  residentName?: string
  merchantId?: string
  merchantName?: string
  room?: string
  productSummary?: string
  items?: OrderLineItem[]
  totalAmount?: number
  /** 商品优惠后成交小计，不含配送费 */
  productAmount?: number
  /** 减免前按配送规则计算的配送费 */
  originalDeliveryFee?: number
  deliveryFee?: number
  deliveryWaiverAmount?: number
  deliverySubsidySponsor?: string
  deliverySubsidyAmount?: number
  deliverySettlementBase?: number
  freeDeliveryEligible?: boolean
  waiverReason?: string
  freeDeliveryThresholdSnapshot?: number
  merchantGoodsShare?: number
  merchantDeliverySubsidy?: number
  merchantShare?: number
  distributionStatus?: string
  calculationVersion?: string
  paymentMethod?: string
  pointUsed?: number
  coinUsed?: number
  cashAmount?: number
  /** 确认收货/订单完成时获得的积分 */
  pointEarned?: number
  /** 确认收货/订单完成时获得的物业币 */
  coinEarned?: number
  deliveryAddress?: string
  contactPhone?: string
  remark?: string
  courierId?: string | null
  courierName?: string | null
  deliveryId?: string | null
  deliveryStatus?: string
  deliveryStatusLabel?: string
  /** 是否需要配送；false 则无履约选择、无配送单 */
  requiresDelivery?: boolean
  /** pending_choice / courier_hall / merchant_self / none */
  fulfillmentMode?: string
  fulfillmentModeLabel?: string
  fulfillmentDeadline?: string | null
  fulfillmentChosenAt?: string | null
  /** courier / merchant */
  carrierType?: string
  /** 商家自配配送费分成（大厅单为 0） */
  merchantDeliveryFeeShare?: number
  fulfillmentChoiceLogs?: FulfillmentChoiceLog[]
  paidAt?: string | null
  completedAt?: string | null
  cancelledAt?: string | null
  orderStatus?: string
  status?: string
  /** 商家核实通过后的冻结截止（v6.3） */
  freezeEndDate?: string | null
  verifiedAt?: string | null
  verificationResult?: string
}

/** 居民确认收货 POST /orders/{id}/confirm */
export interface OrderConfirmResult {
  orderId: string
  orderStatus: string
  completedAt?: string
  pointEarned?: number
  coinEarned?: number
}

/** POST /orders/{id}/verify（v6.3 商家核实） */
export interface OrderVerifyPayload {
  approved: boolean
  reason?: string
}

export interface OrderVerifyResult {
  orderId?: string
  verificationResult?: string
  orderStatus?: string
  freezeEndDate?: string | null
  verifiedAt?: string | null
  message?: string
}

/** GET/PUT /admin/order-config（v6.5：核实入口由整单商品 category=团购决定） */
export interface AdminOrderConfig {
  /** v6.5 起失效，仅兼容回读，不再控制是否进入核实 */
  merchantVerificationEnabled?: boolean
  merchantVerificationHours?: number
  freezeDays?: number
  refundWindowDays?: number
}

/** GET /admin/orders/refunds（v6.4） */
export interface OrderRefundItem {
  orderId: string
  orderNo?: string
  orderStatus?: string
  cancelReason?: string
  rejectReason?: string
  residentName?: string
  residentPhone?: string
  receiverName?: string
  merchantName?: string
  totalAmount?: number
  createdAt?: string
  requestedAt?: string
  auditedAt?: string
}

/** POST /admin/orders/refunds/{orderId}/audit */
export interface OrderRefundAuditPayload {
  action: string
  rejectReason?: string
}

export interface OrderRefundAuditResult {
  orderId?: string
  orderStatus?: string
  requestedAt?: string
  message?: string
}

export interface MyMerchantDetail {
  id: string
  platformMerchantId?: string
  name: string
  description?: string
  coverUrls?: string[]
  videoUrl?: string | null
  merchantLevel?: string
  commissionRate?: number
  category?: string
  businessHours?: string
  contactPhone?: string
  address?: string
  deliveryFee?: number
  deliveryFeeTiers?: DeliveryFeeTier[]
  deliveryFees?: DeliveryFeeTier[]
  freeDeliveryThreshold?: number
  freeDeliveryEnabled?: boolean
  freeDeliverySponsor?: string
  /** 配送范围：in_community / out_community / both（§76） */
  deliveryScope?: string
  /** 商家配送距离：any / radius / district / city */
  distanceType?: string
  auditStatus?: string
  status?: string
  /** 商家来源：platform / group_leader / technician（v4.1） */
  merchantSource?: string
  /** 商家角色类型：goods / technician / group_leader / canteen（v6.8） */
  merchantType?: string
  /** 是否社区食堂主商家（仅 merchantType=canteen 有意义） */
  isCanteenMainMerchant?: boolean
  totalOrders?: number
  totalRevenue?: number
  /** 可提现余额（§A1） */
  withdrawableAmount?: number
  /** 待结算金额（v5.4） */
  pendingAmount?: number
  /** 冻结金额（v5.4） */
  frozenAmount?: number
  /** 应收/待偿金额（v5.4） */
  receivableAmount?: number
  /** 累计已提现成功 */
  totalWithdrawn?: number
  /** 是否被阻止提现 */
  withdrawalBlocked?: boolean
  /** 处理中占用金额（若后端提供） */
  pendingWithdrawalAmount?: number
  products?: ProductItem[]
  createdAt?: string
  updatedAt?: string
}

export interface MerchantDeliveryFeesPayload {
  deliveryFeeTiers: DeliveryFeeTier[]
  freeDeliveryEnabled: boolean
  freeDeliveryThreshold?: number
  freeDeliverySponsor?: string
}

export interface ProductItem {
  id: string
  merchantId?: string
  merchantName?: string
  name: string
  description?: string
  coverUrl?: string
  price?: number
  memberPrice?: number
  pointPrice?: number
  stock?: number
  category?: string
  status?: string
  salesCount?: number
  createdAt?: string
}

export interface ProductCreatePayload {
  name: string
  description?: string
  coverUrl?: string
  price: number
  memberPrice?: number
  pointPrice?: number
  stock?: number
  category?: string
  status?: string
}

export interface ProductUpdatePayload {
  name?: string
  description?: string
  coverUrl?: string
  price?: number
  memberPrice?: number
  pointPrice?: number
  stock?: number
  category?: string
  status?: string
}

export interface MerchantPointPurchaseItem {
  id: string
  merchantId?: string
  merchantName?: string
  pointAmount?: number
  remainingPoints?: number
  payAmount?: number
  status?: string
  auditRemark?: string
  createdAt?: string
  auditedAt?: string
}

export interface MerchantPointPurchasePayload {
  /** 购买积分数；支付金额由后端按商家兑换比计算，勿传 payAmount */
  pointAmount: number
}

export interface MerchantPointGrantPayload {
  phone: string
  pointAmount: number
  description?: string
}

export interface MerchantPointQuote {
  pointAmount: number
  payAmount: number
}

export interface MerchantWithdrawalItem {
  id: string
  merchantId?: string
  merchantName?: string
  amount?: number
  feeRate?: number
  feeAmount?: number
  actualAmount?: number
  status?: string
  createdAt?: string
  completedAt?: string
}

/** 管理员 - 积分购买审核记录 */
export interface AdminMerchantPointPurchaseItem {
  id: string
  merchantId: string
  merchantName: string
  pointAmount: number
  payAmount: number
  status: string
  /** 部分接口用 auditStatus，与 status 同义待审家族 */
  auditStatus?: string
  createdAt: string
  auditRemark?: string
  auditedAt?: string
  operatorId?: string
  auditResult?: string
}

/** 管理员 - 积分购买审核请求体 */
export interface AdminPointPurchaseAuditPayload {
  auditResult: string
  rejectReason?: string
  remark?: string
}

/** 管理员 - 积分购买审核结果 */
export interface AdminPointPurchaseAuditResult {
  id: string
  merchantId: string
  merchantName: string
  pointAmount: number
  payAmount: number
  status: string
  auditResult: string
  auditRemark?: string
  operatorId: string
  auditedAt: string
}

/** 管理员 - 提现审核记录 */
export interface AdminMerchantWithdrawalItem {
  id: string
  merchantId: string
  merchantName: string
  amount: number
  feeAmount: number
  actualAmount: number
  status: string
  /** 部分接口兼容字段，与 status 同义 */
  auditStatus?: string
  createdAt: string
  auditRemark?: string
  auditedAt?: string
  operatorId?: string
  auditResult?: string
  /** 资金来源切分：legacy 历史余额 / cbk 新单（新单不应出现在待审列表） */
  settlementChannel?: string
}

/** 管理员 - 提现审核请求体 */
export interface AdminWithdrawalAuditPayload {
  auditResult: string
  rejectReason?: string
  remark?: string
}

/** 管理员 - 提现审核结果 */
export interface AdminWithdrawalAuditResult {
  id: string
  merchantId: string
  merchantName: string
  amount: number
  feeAmount: number
  actualAmount: number
  status: string
  auditResult: string
  auditRemark?: string
  operatorId: string
  auditedAt: string
}

export interface MerchantWithdrawalPayload {
  amount: number
}

export interface CourierDeliveryItem {
  id: string
  orderId?: string
  orderNo?: string
  merchantId?: string
  merchantName?: string
  merchantAddress?: string
  pickupAddress?: string
  deliveryAddress?: string
  contactPhone?: string
  fee?: number
  originalDeliveryFee?: number
  deliverySubsidySponsor?: string
  deliverySubsidyAmount?: number
  deliverySettlementBase?: number
  platformDeliveryShare?: number
  courierEarning?: number
  settlementStatus?: string
  status?: string
  timeoutMinutes?: number
  acceptedAt?: string
  timeoutAt?: string
  deliveredAt?: string
  remark?: string
  proofImageUrls?: string[]
  createdAt?: string
  updatedAt?: string
  carrierType?: string
  merchantDeliveryFeeShare?: number
}

export interface DeliveryCompletePayload {
  proofImageUrls?: string[]
  remark?: string
}

/** 分账记录（字段名兼容交付 *Share 与旧 *Amount） */
export interface DistributionRecordItem {
  id: string
  orderId?: string
  orderNo?: string
  merchantId?: string
  merchantName?: string
  residentId?: string
  residentName?: string
  propertyCompanyId?: string
  /** 订单实付 = 商品价 + 配送费 */
  totalAmount?: number
  /** 商品价（B 方案平台盘计提基数） */
  productAmount?: number
  /** 配送费（B 方案单独分给我们公司 / 配送员） */
  deliveryFee?: number
  originalDeliveryFee?: number
  deliveryWaiverAmount?: number
  deliverySubsidySponsor?: string
  deliverySubsidyAmount?: number
  deliverySettlementBase?: number
  /** 抽佣比例（如 0.20 = 商品价中平台盘 20%） */
  commissionRate?: number
  pointCost?: number
  coinCost?: number
  /** 抽佣基础额 = (totalAmount − deliveryFee) × commissionRate，未扣成本 */
  commissionBaseAmount?: number
  /**
   * 可分配/平台盘金额（以后端返回为准）
   * = (totalAmount − deliveryFee) × commissionRate − pointCost − coinCost；击穿兜底 0
   */
  distributableAmount?: number
  /**
   * 平台盘被积分/物业币成本击穿的差额（若后端返回）；有值时 distributableAmount 应为 0
   */
  deficitAmount?: number
  deficitSponsor?: string
  /** 公司平台盘比例快照 */
  platformShareRate?: number
  /** 兼容旧字段，等价 commissionBaseAmount */
  productCommission?: number
  /** 商品实付 = productAmount - pointCost - coinCost */
  productBase?: number
  /** 未扣配送补贴前的商家商品收入 */
  merchantGoodsShare?: number
  /** 商家承担的配送补贴 */
  merchantDeliverySubsidy?: number
  /** 商家退款、补差或冲账调整额 */
  merchantAdjustmentAmount?: number
  /** 商家最终实得；可能已扣商家承担的配送补贴，前端不得重算 */
  merchantShare?: number
  /** 兼容旧字段名 */
  merchantAmount?: number
  /** 公司在商品平台盘中的正式收入 */
  platformShare?: number
  platformAmount?: number
  propertyShare?: number
  propertyAmount?: number
  managementPoolAmount?: number
  /** 板块毛额 = 管理盘 × 板块负责人比例 */
  sectorGrossAmount?: number
  /** 配送费中我们公司抽成（若有；与平台盘 platformShare 不同链路） */
  platformDeliveryShare?: number
  /** @deprecated 不得作为配送员正式收入 */
  courierShare?: number
  courierAmount?: number
  /** 配送员本单最终收入快照 */
  courierEarning?: number
  coordinatorShare?: number
  coordinatorAmount?: number
  sectorLeaderShare?: number
  sectorLeaderAmount?: number
  individualLeaderShare?: number
  individualLeaderAmount?: number
  /** 商家自配配送费分成；大厅为 0 */
  merchantDeliveryFeeShare?: number
  fulfillmentMode?: string
  fulfillmentModeLabel?: string
  carrierType?: string
  coordinatorId?: string
  coordinatorName?: string
  sectorLeaderId?: string
  sectorLeaderName?: string
  individualLeaderId?: string
  individualLeaderName?: string
  status?: string
  calculationVersion?: string
  createdAt?: string
}

export interface DistributionStats {
  summary?: {
    /** 有效：总可分配金额 */
    totalDistributableAmount?: number
    productAmount?: number
    merchantGoodsAmount?: number
    merchantDeliverySubsidyAmount?: number
    platformDeliveryAmount?: number
    managementPoolAmount?: number
    deficitAmount?: number
    reversalAmount?: number
    /** 有效：物业公司总额 */
    propertyAmount?: number
    /** 有效：协调员总额 */
    coordinatorAmount?: number
    /** 有效：片区负责人总额 */
    sectorLeaderAmount?: number
    /** 有效：个人负责人总额 */
    individualLeaderAmount?: number
    /** 兼容字段：成本击穿差额合计 */
    totalDeficitAmount?: number
    /** 商家最终实得合计 */
    merchantAmount?: number
    /** 总订单额合计（含配送费） */
    totalOrderAmount?: number
    /** 公司商品平台盘收入合计 */
    platformAmount?: number
    /** 配送员收入合计 */
    courierAmount?: number
  }
  byProperty?: Array<{ propertyCompanyId?: string; propertyName?: string; amount?: number }>
  byCoordinator?: Array<{ coordinatorId?: string; name?: string; amount?: number }>
  bySector?: Array<{
    sector?: string
    sectorId?: string
    sectorLeaderId?: string
    sectorName?: string
    amount?: number
  }>
}

/** GET /distribution/calculate 试算（无订单 id） */
export interface DistributionCalculateResult {
  merchantId?: string
  orderId?: string
  totalAmount?: number
  /** 商品价；缺省时可按 totalAmount − deliveryFee 理解 */
  productAmount?: number
  deliveryFee?: number
  originalDeliveryFee?: number
  deliveryWaiverAmount?: number
  deliverySubsidySponsor?: string
  deliverySubsidyAmount?: number
  deliverySettlementBase?: number
  commissionRate?: number
  pointCost?: number
  coinCost?: number
  /**
   * 抽佣基础额 = (totalAmount − deliveryFee) × commissionRate（未扣成本）
   */
  commissionBaseAmount?: number
  distributableAmount?: number
  /** 平台盘击穿差额（若返回） */
  deficitAmount?: number
  deficitSponsor?: string
  merchantGoodsShare?: number
  merchantDeliverySubsidy?: number
  merchantAdjustmentAmount?: number
  /** 后端返回的商家最终实得；前端不重算 */
  merchantShare?: number
  /** 平台盘残差；可直接读 */
  platformShare?: number
  propertyShare?: number
  managementPoolAmount?: number
  /** 配送费中我们公司抽成（若返回） */
  platformDeliveryShare?: number
  /** @deprecated 不得作为配送员正式收入 */
  courierShare?: number
  courierEarning?: number
  coordinatorShare?: number
  sectorLeaderShare?: number
  individualLeaderShare?: number
  merchantDeliveryFeeShare?: number
  fulfillmentMode?: string
  carrierType?: string
  coordinatorId?: string
  sectorLeaderId?: string
  individualLeaderId?: string
  calculationVersion?: string
}

/** 物业分成账户余额（与公司账户 /admin/company-account 不同） */
export interface PropertySettlementBalance {
  propertyCompanyId?: string
  settlementBalance?: number
}

/** 平台分成比例配置 */
export interface PlatformShareRates {
  propertyCompanyId?: string
  /** 平台盘内「我们公司」占比（B：与物业/管理三档之和约 100%） */
  platformShareRate?: number
  /** 配送费中我们公司抽成比例（B：默认 0；余额归配送员） */
  platformDeliveryShareRate?: number
  platformWithdrawalFeeShareRate?: number
  propertyShareRate?: number
  coordinatorShareRate?: number
  sectorLeaderRate?: number
  individualLeaderRate?: number
}

export interface UpdatePlatformShareRatesPayload {
  propertyCompanyId: string
  platformShareRate?: number
  platformDeliveryShareRate?: number
  platformWithdrawalFeeShareRate?: number
}

/** 平台收益统计 */
export interface PlatformEarningsStats {
  totalPlatformShare?: number
  totalDeliveryEarning?: number
  totalWithdrawalFeeShare?: number
  totalEarning?: number
  byProperty?: Array<{
    propertyCompanyId?: string
    propertyName?: string
    platformShare?: number
    deliveryEarning?: number
    withdrawalFeeShare?: number
  }>
}

/** 平台收益明细 */
export interface PlatformEarningRecordItem {
  id: string
  type?: string
  propertyCompanyId?: string
  propertyName?: string
  amount?: number
  orderId?: string
  withdrawalId?: string
  createdAt?: string
}

/** 平台收益对账快照（微信支付分账只读；无内部提现钱包） */
export interface PlatformEarningsBalance {
  /** 累计平台收益（已实时入账） */
  totalEarned?: number | string
  /** 平台已入账余额（通常 = totalEarned） */
  settledBalance?: number | string
  /** 处理中金额（真分账通常为 0） */
  pendingAmount?: number | string
  /** 结算方式，如 wechat_profit_sharing / cbk_real_split */
  settleMode?: string
  /** 结算状态文案 */
  settlementStatus?: string
  /** 是否可申请提现；分账模式下恒为 false */
  withdrawAvailable?: boolean
  /** 构成：订单分成 */
  distributionShare?: number | string
  /** 构成：配送费分成 */
  deliveryShare?: number | string
  /** 构成：提现手续费分成 */
  withdrawalFeeShare?: number | string
  /** @deprecated 旧内部钱包字段，兼容回退 */
  withdrawableAmount?: number
  totalWithdrawn?: number
  pendingWithdrawalAmount?: number
  totalEarning?: number
  withdrawalBlocked?: boolean
}

/** GET /courier-managers/my：负责人汇总或普通配送员本人钱包（§A1） */
export interface CourierManagerItem {
  id: string
  residentId?: string
  name?: string
  phone?: string
  communityId?: string
  communityName?: string
  responsibleArea?: string
  deliveryTimeConfig?: string
  courierCount?: number
  status?: string
  withdrawableAmount?: number
  totalWithdrawn?: number
  withdrawalBlocked?: boolean
  pendingWithdrawalAmount?: number
  createdAt?: string
  updatedAt?: string
}

export interface CourierManagerCreatePayload {
  residentId: string
  communityId: string
  name: string
  phone: string
  responsibleArea?: string
  deliveryTimeConfig?: string
}

export interface CourierManagerUpdatePayload {
  name?: string
  phone?: string
  communityId?: string
  responsibleArea?: string
  deliveryTimeConfig?: string
  status?: string
}

export interface CourierManagerCourierItem {
  id: string
  name?: string
  phone?: string
  status?: string
}

/** 配送价格区间 */
export interface DeliveryPriceRangeItem {
  id: string
  minPrice?: number
  maxPrice?: number
  propertyCompanyId?: string
  status?: string
  distanceType?: string
  deliveryScope?: string
  createdAt?: string
}

export interface DeliveryPriceRangePayload {
  minPrice: number
  maxPrice: number
  propertyCompanyId?: string
  /** 默认 any（§76.3） */
  distanceType?: string
  /** 默认 both（§76.3） */
  deliveryScope?: string
  status?: string
}

/** 价格审批 */
export interface PriceApprovalItem {
  id: string
  propertyCompanyId?: string
  applicantId?: string
  applicantName?: string
  applicantRole?: string
  itemType?: string
  itemId?: string
  oldValue?: string
  newValue?: string
  reason?: string
  status?: string
  /** 后端字段：审批人 */
  approverId?: string
  approverRemark?: string
  approvedAt?: string
  /** 兼容旧字段名 */
  auditorId?: string
  auditorName?: string
  remark?: string
  createdAt?: string
  auditedAt?: string
}

export interface PriceApprovalCreatePayload {
  /** 平台管理员提交时必填；物业领导勿传（后端取绑定公司） */
  propertyCompanyId?: string
  itemType: string
  itemId?: string
  oldValue?: string
  newValue: string
  reason?: string
}

export interface PriceApprovalAuditPayload {
  approved: boolean
  remark?: string
}

/** 物业币商城规则 */
export interface PropertyCoinMallRules {
  propertyCompanyId?: string
  coinMallEnabled?: boolean
  coinMallMaxRatio?: number
  coinMallMinAmount?: number
}

/** 多角色提现记录 */
export interface RoleWithdrawalItem {
  id: string
  amount?: number
  feeRate?: number
  feeAmount?: number
  actualAmount?: number
  status?: string
  withdrawalType?: string
  applicantId?: string
  residentId?: string
  propertyCompanyId?: string
  auditedAt?: string
  createdAt?: string
  completedAt?: string
  remark?: string
}

export interface RoleWithdrawalPayload {
  amount: number
}

/** GET /admin/role-withdrawals 列表项（v5.5 §70.5） */
export interface AdminRoleWithdrawalItem {
  id: string
  withdrawalType: string
  applicantId?: string
  applicantName?: string
  residentId?: string
  residentName?: string
  residentPhone?: string
  propertyCompanyId?: string
  amount?: number
  feeRate?: number
  feeAmount?: number
  actualAmount?: number
  auditStatus?: string
  auditorId?: string
  auditedAt?: string
  completedAt?: string
  disburseChannel?: string
  disburseStatus?: string
  transferProof?: string
  rejectReason?: string
  remark?: string
  createdAt?: string
  /** 资金来源切分：legacy 历史余额 / cbk 新单 */
  settlementChannel?: string
}

/** GET /admin/role-withdrawals/summary（v5.5 §70.6） */
export interface RoleWithdrawalSummary {
  pendingCount?: number
  pendingAmount?: number
  todayProcessedCount?: number
  todayProcessedAmount?: number
  approvedCount?: number
  approvedAmount?: number
}

/** POST /admin/role-withdrawals/{id}/audit（v5.5 §70.7） */
export interface AdminRoleWithdrawalAuditPayload {
  auditResult: 'approved' | 'rejected' | 'completed'
  transferProof?: string
  rejectReason?: string
  remark?: string
}

export interface AdminRoleWithdrawalAuditResult {
  id: string
  auditStatus?: string
  transferProof?: string
  disburseChannel?: string
  disburseStatus?: string
  auditedAt?: string
  auditorId?: string
  completedAt?: string
}

/** 板块负责人 - 个体负责人 */
export interface IndividualLeaderItem {
  id: string
  residentId?: string
  residentName?: string
  residentPhone?: string
  phone?: string
  name?: string
  sector?: string
  sectorLeaderId?: string
  sectorName?: string
  propertyCompanyId?: string
  propertyCompanyName?: string
  appointedAt?: string
  commissionRate?: number
  /** 累计收益（若后端返回） */
  totalEarnings?: number
  /** 可提现余额（GET /individual-leaders/my） */
  withdrawableAmount?: number
  /** 累计已提现成功 */
  totalWithdrawn?: number
  /** 处理中提现金额 */
  pendingWithdrawalAmount?: number
  /** 是否被阻止提现 */
  withdrawalBlocked?: boolean
  status?: string
  createdAt?: string
}

export interface IndividualLeaderCreatePayload {
  residentId: string
  sector: string
  name?: string
  commissionRate?: number
}

/** 管理端创建个体负责人 POST /admin/individual-leaders */
export interface AdminIndividualLeaderCreatePayload {
  residentId: string
  sectorLeaderId: string
  sector: string
  name?: string
  commissionRate?: number
}

/** 住户一级代理申请 GET /admin/individual-leaders/applications */
export interface IndividualLeaderApplicationItem {
  id: string
  residentId?: string
  residentName?: string
  residentPhone?: string
  phone?: string
  sector?: string
  sectorName?: string
  remark?: string
  message?: string
  /** 接口字段 auditStatus：pending / approved / rejected */
  auditStatus?: string
  status?: string
  rejectReason?: string
  propertyCompanyId?: string
  propertyCompanyName?: string
  createdAt?: string
  auditedAt?: string
}

/** POST /admin/individual-leaders/applications/{applicationId}/audit */
export interface IndividualLeaderApplicationAuditPayload {
  auditResult: string
  rejectReason?: string
  remark?: string
  sectorLeaderId?: string
  sector?: string
  name?: string
  commissionRate?: number
}

export interface SectorLeaderMerchantAuditPayload {
  merchantId: string
  approved: boolean
  reason?: string
}

/** PUT /coordinators/{id}/merchant-audit */
export interface CoordinatorMerchantAuditPayload {
  merchantId: string
  approved: boolean
  rejectReason?: string
  applyRole?: string
  intendedRole?: string
}

export interface SectorLeaderMerchantCreatePayload {
  platformMerchantId: string
  name: string
  category: string
  contactPhone: string
  address?: string
}

export interface MerchantDistributionPayload {
  merchantId: string
  commissionRate: number
  /** 审批备注，可选 */
  reason?: string
}

export interface MerchantDeliveryFeePayload {
  merchantId: string
  freeDeliveryThreshold: number
  freeDeliveryEnabled?: boolean
  freeDeliverySponsor?: string
}

/** 统筹管理 */
export interface CoordinatorSectorLeaderCreatePayload {
  residentId: string
  sector: string
  commissionRate?: number
}

export interface CoordinatorIndividualLeaderCreatePayload {
  residentId: string
  /** 必须为该统筹名下的板块负责人 sl_ ID */
  sectorLeaderId: string
  sector: string
  name?: string
  commissionRate?: number
}

export interface CoordinatorMerchantCreatePayload {
  platformMerchantId: string
  name: string
  category: string
  contactPhone: string
}

export interface CoordinatorMerchantFreezePayload {
  frozen: boolean
}

/** 产品/活动公告 */
export interface ProductAnnouncementCreatePayload {
  title: string
  content: string
  communityId: string
  merchantId: string
  productId: string
  coverUrl?: string
  publishedAt?: string
}

export interface ActivityAnnouncementCreatePayload {
  title: string
  content: string
  communityId: string
  activityGroupId: string
  publishedAt?: string
}

/** 商家定向广告 */
export interface MerchantTargetedAdCreatePayload {
  merchantId: string
  title: string
  content: string
  imageUrls?: string[]
  productId?: string
  targetBuildings?: string[]
  targetGender?: string
  targetAgeBrackets?: string[]
  /** 展示天数 1~30，必填 */
  durationDays: number
  /** free / coin / point / wechat / mock，必填 */
  paymentMethod: string
}

/** 分销商品收费周期 */
export interface DistributorProductBillingCyclePayload {
  billingCycle: string
}

export interface DistributorProductItem {
  id: string
  name?: string
  billingCycle?: string
  wholesalePrice?: number
  suggestedRetailPrice?: number
  status?: string
  createdAt?: string
}

export interface CommunityServiceItem {
  id: string
  name: string
  description?: string
  coverUrls?: string[]
  coverUrl?: string
  category?: string
  categoryName?: string
  price?: number
  memberPrice?: number
  priceUnit?: string
  providerId?: string
  providerName?: string
  providerType?: string
  isSubscription?: boolean
  subscriptionRequired?: boolean
  monthlyFee?: number | null
  yearlyFee?: number | null
  rankOrder?: number
  propertyCompanyId?: string
  propertyCompanyName?: string
  status?: string
  createdAt?: string
  updatedAt?: string
  deletedAt?: string
}

export interface CommunityServiceCreatePayload {
  name: string
  category: string
  description?: string
  coverUrls?: string[]
  price?: number
  memberPrice?: number
  priceUnit?: string
  isSubscription?: boolean
}

export interface CommunityServiceUpdatePayload {
  name?: string
  description?: string
  coverUrls?: string[]
  price?: number
  memberPrice?: number
  priceUnit?: string
  category?: string
  status?: string
}

export interface SectorLeaderDetail {
  id: string
  canManageIndividualLeaders?: boolean
  residentId?: string
  residentName?: string
  residentPhone?: string
  phone?: string
  coordinatorId?: string
  coordinatorName?: string
  sector?: string
  sectorName?: string
  propertyCompanyId?: string
  propertyCompanyName?: string
  description?: string
  individualLeaderCount?: number
  merchantCount?: number
  activeSpecialOfferCount?: number
  totalEarnings?: number
  /** v4.8 可提现余额 */
  withdrawableAmount?: number
  status?: string
  createdAt?: string
  updatedAt?: string
}

export interface SectorLeaderCreatePayload {
  residentId: string
  coordinatorId: string
  sector: string
  description?: string
}

export interface SectorLeaderUpdatePayload {
  coordinatorId?: string
  sector?: string
  description?: string
  status?: string
}

export interface SectorLeaderRemoveResult {
  id: string
  status?: string
  deletedAt?: string
}

export interface CoordinatorDetail {
  id: string
  residentId?: string
  residentName?: string
  residentPhone?: string
  phone?: string
  propertyCompanyId?: string
  propertyCompanyName?: string
  description?: string
  sectorCount?: number
  sectorLeaderCount?: number
  merchantCount?: number
  individualLeaderCount?: number
  activeSpecialOfferCount?: number
  commissionRate?: number
  totalEarnings?: number
  /** v4.8 可提现余额 */
  withdrawableAmount?: number
  status?: string
  createdAt?: string
  updatedAt?: string
}

/** GET /admin/merchant-withdrawals/summary */
export interface MerchantWithdrawalSummary {
  pendingCount?: number
  pendingAmount?: number
  todayProcessedCount?: number
  todayProcessedAmount?: number
  approvedCount?: number
  approvedAmount?: number
}

/** GET /admin/coin-withdrawals/summary */
export interface CoinWithdrawalSummary {
  pendingCount?: number
  pendingAmount?: number
  /** 今日完成（按 completedAt）；兼容 todayProcessed* */
  todayCompletedCount?: number
  todayCompletedAmount?: number
  todayProcessedCount?: number
  todayProcessedAmount?: number
  approvedCount?: number
  approvedAmount?: number
}

/** GET /admin/coin-withdrawals 列表项（物业币兑换/提现审批） */
export interface AdminCoinWithdrawalItem {
  id: string
  /** 申请主体可能是住户或商家（§24 申请角色为 merchant） */
  residentId?: string
  residentName?: string
  residentPhone?: string
  merchantId?: string
  merchantName?: string
  applicantId?: string
  applicantName?: string
  phone?: string
  contactPhone?: string
  communityName?: string
  community?: string
  propertyCompanyName?: string
  coinAmount?: number
  exchangeAmount?: number
  amount?: number
  status?: string
  auditStatus?: string
  createdAt?: string
  auditedAt?: string
  completedAt?: string
  auditRemark?: string
  remark?: string
  operatorId?: string
}

/**
 * 审核 body：与商家提现/积分购买一致用 auditResult。
 * 文档 §33.2 曾写 auditStatus，实测易触发「参数校验失败」。
 */
export interface AdminCoinWithdrawalAuditPayload {
  auditResult: string
  rejectReason?: string
  remark?: string
}

/** GET/POST /admin/property-contact */
export interface PropertyContactConfig {
  id?: string
  propertyName?: string
  contactPhone?: string
  contactMobile?: string
  address?: string
  serviceHours?: string
  email?: string
  /** 仅管理端可见，不下发公开接口 */
  remark?: string
  enabled?: boolean
  createdAt?: string
  updatedAt?: string
}

export interface PropertyContactPayload {
  propertyName: string
  contactPhone: string
  contactMobile?: string
  address?: string
  serviceHours?: string
  email?: string
  remark?: string
  enabled?: boolean
}

/* ---------- 社区论坛（管理端 §C.10–C.14，居民端接口不在本仓实现） ---------- */

export interface CommunityPostItem {
  id: string
  authorId?: string
  authorName?: string
  authorRole?: string
  content?: string
  imageUrls?: string[]
  status?: string
  likeCount?: number
  commentCount?: number
  likedByMe?: boolean
  createdAt?: string
  updatedAt?: string
}

export interface CommunityCommentItem {
  id: string
  postId?: string
  authorId?: string
  authorName?: string
  authorRole?: string
  content?: string
  parentId?: string | null
  replyToUserId?: string | null
  replyToUserName?: string | null
  status?: string
  createdAt?: string
}

export interface ContentReportItem {
  id: string
  reporterId?: string
  reporterName?: string
  targetType?: string
  targetId?: string
  reasonType?: string
  reasonDetail?: string
  status?: string
  communityId?: string
  propertyCompanyId?: string
  handlerId?: string | null
  handlerName?: string | null
  handleRemark?: string | null
  handledAt?: string | null
  createdAt?: string
  targetContent?: string
  targetAuthorName?: string
}

export interface ContentReportHandlePayload {
  action: string
  handleRemark?: string
}

export interface ActivityGroupItem {
  id: string
  name: string
  description?: string
  coverUrl?: string
  /** v3.8+ 多封面 */
  coverUrls?: string[] | string
  activityType?: string
  leaderId?: string
  leaderName?: string
  communityId?: string
  communityName?: string
  memberCount?: number
  subscriberCount?: number
  monthlyFee?: number
  yearlyFee?: number
  hasActiveSubscription?: boolean
  subscribedAmount?: number
  status?: string
  createdAt?: string
  updatedAt?: string
}

export interface ActivityGroupCreatePayload {
  name: string
  description?: string
  coverUrl?: string
  coverUrls?: string[] | string
  activityType?: string
  monthlyFee?: number
  yearlyFee?: number
}

export interface ActivityGroupUpdatePayload {
  name?: string
  description?: string
  coverUrl?: string
  coverUrls?: string[] | string
  activityType?: string
  monthlyFee?: number
  yearlyFee?: number
}

export interface ActivityGroupMemberItem {
  id: string
  name?: string
  avatarUrl?: string
  relation?: string
  isLeader?: boolean
  joinedAt?: string
  status?: string
}

/** §73 活动组课时价格档 */
export interface ActivityPricingTier {
  id?: string
  tierName: string
  tierCode: string
  price: number
  period?: string
  sortOrder?: number
  status?: string
}

export interface ActivityPricingTierPayload {
  tierName: string
  tierCode: string
  price: number
  period?: string
  sortOrder?: number
  status?: string
}

export interface ActivityPricingTiersResult {
  activityGroupId: string
  list: ActivityPricingTier[]
}

export interface SpecialOfferItem {
  id: string
  title: string
  content?: string
  targetType?: string
  targetTags?: string
  publisherName?: string
  publisherRole?: string
  merchantId?: string
  merchantName?: string
  communityId?: string
  coverUrl?: string
  discountInfo?: string
  minConsumption?: number
  startTime?: string
  endTime?: string
  totalQuota?: number
  perUserQuota?: number
  usedQuota?: number
  status?: string
  createdAt?: string
}

export interface SpecialOfferCreatePayload {
  title: string
  content: string
  targetType: string
  startTime: string
  endTime: string
  targetTags?: string
  communityId?: string
  merchantId?: string
  coverUrl?: string
  discountInfo?: string
  minConsumption?: number
  totalQuota?: number
  perUserQuota?: number
  status?: string
}

export interface SpecialOfferUpdatePayload {
  title?: string
  content?: string
  targetType?: string
  startTime?: string
  endTime?: string
  targetTags?: string
  communityId?: string
  merchantId?: string
  coverUrl?: string
  discountInfo?: string
  minConsumption?: number
  totalQuota?: number
  perUserQuota?: number
  status?: string
}

/* ---------- 二期 §52 定向消息 ---------- */

export interface AgeBracketItem {
  id: string
  label: string
  minAge?: number
  maxAge?: number | null
  sortOrder?: number
}

export interface DirectedMessageCreatePayload {
  title: string
  content: string
  imageUrls?: string[]
  officialSenderType: string
  filterBuildings?: string[]
  filterGender?: string
  filterAgeBracketIds?: string[]
  merchantIds?: string[]
  propertyCompanyId?: string
}

export interface DirectedMessageTaskItem {
  id: string
  title: string
  content?: string
  officialSenderType?: string
  filterSummary?: string
  filterBuildings?: string[]
  filterGender?: string
  filterAgeBracketIds?: string[]
  recipientCount?: number
  readCount?: number
  unreadCount?: number
  readRate?: number
  status?: string
  statusCode?: string
  createdAt?: string
  imageUrls?: string[]
}

export interface DirectedMessageRecipientItem {
  id: string
  residentId?: string
  residentName?: string
  /** 后端实际字段：住户 id */
  recipientId?: string
  /** 后端实际字段：住户姓名 */
  recipientName?: string
  buildingNo?: string
  /** male/female，或后端偶发返回住户数字编码 1/2 */
  gender?: string | number
  age?: number
  readStatus?: string
  readStatusCode?: string
  readAt?: string
  createdAt?: string
  /** 后端偶发嵌套住户对象 / 别名字段，展示前由前端归一化 */
  name?: string
  building?: string
  userId?: string
  recipient?: {
    id?: string
    name?: string
    building?: string
    buildingNo?: string
    gender?: string | number
  }
  resident?: {
    id?: string
    name?: string
    building?: string
    buildingNo?: string
    gender?: string | number
  }
  user?: {
    id?: string
    name?: string
    building?: string
    buildingNo?: string
    gender?: string | number
  }
}

export interface DirectedMessageSendResult {
  taskId: string
  recipientCount?: number
  status?: string
  statusCode?: string
  createdAt?: string
}

/* ---------- 二期 §53 社区多物业 ---------- */

export interface CommunityEntityItem {
  id: string
  name: string
  description?: string
  adminResidentId?: string
  adminName?: string
  propertyCompanyCount?: number
  createdAt?: string
}

export interface CommunityEntityCreatePayload {
  name: string
  description?: string
  adminResidentId?: string
}

export interface CommunityPropertyBindingItem {
  propertyCompanyId: string
  propertyCompanyName?: string
  permissionLevel?: string
  allowedModules?: string[]
  boundAt?: string
}

export interface CommunityPropertyBindPayload {
  propertyCompanyId: string
  permissionLevel?: string
}

export interface CommunityPropertyPermissionPayload {
  permissionLevel: string
  allowedModules?: string[]
}

/* ---------- 二期 §54 物业操作员 ---------- */

export interface PropertyOperatorItem {
  id: string
  residentId?: string
  phone?: string
  name?: string
  status?: string
  statusCode?: string
  communityIds?: string[]
  buildingNos?: string[]
  permissionPresetCode?: string
  createdAt?: string
}

export interface PropertyOperatorCreatePayload {
  phone: string
  name: string
  password: string
  communityIds?: string[]
  buildingNos?: string[]
  permissionPresetCode?: string
}

export interface PropertyOperatorScopePayload {
  communityIds?: string[]
  buildingNos?: string[]
  permissionPresetCode?: string
}

/* ---------- 二期 §55 商家服务范围 ---------- */

export interface MerchantServiceScopeCommunity {
  communityId: string
  communityName?: string
  selected?: boolean
}

export interface MerchantServiceScope {
  serveAllCommunities: boolean
  communities: MerchantServiceScopeCommunity[]
}

export interface MerchantServiceScopeUpdatePayload {
  serveAllCommunities: boolean
  communityIds?: string[]
}

export interface MerchantMessageServicePayload {
  enabled: boolean
  serviceRadius?: string
  categoryIds?: string[]
}

export interface ServiceCategoryDictItem {
  id: string
  name: string
  keywords?: string[]
}

/* ---------- 二期 §57 服务需求 ---------- */

export interface ServiceRequestQuote {
  amount?: number
  currencyType?: string
  description?: string
  validHours?: number
  quotedAt?: string
}

export interface ServiceRequestItem {
  id: string
  description?: string
  status?: string
  statusCode?: string
  matchedCategoryName?: string
  currentMerchantName?: string
  communityId?: string
  contactPhone?: string
  preferredTime?: string
  quote?: ServiceRequestQuote
  createdAt?: string
  expireAt?: string
}

export interface ServiceRequestQuotePayload {
  amount: number
  currencyType: string
  description?: string
  validHours?: number
}

/* ---------- 二期 §59 商家广告 ---------- */

export interface MerchantAdQuota {
  weekStart?: string
  weekEnd?: string
  freeQuota?: number
  purchasedQuota?: number
  usedCount?: number
  /** 本周免费额度已用条数（付费广告不占用） */
  freeUsedCount?: number
  remainingCount?: number
  freeQuotaRemaining?: number
  freeQuotaEnabled?: boolean
}

export interface MerchantAdQuote {
  durationDays: number
  dayPrice: number
  payAmount: number
  freeQuotaRemaining?: number
  freeQuotaEnabled?: boolean
}

export interface MerchantAdSettings {
  dayPrice?: number
  freeQuotaEnabled?: boolean
  freeQuotaPerWeek?: number
}

export interface MerchantAdItem {
  id: string
  title: string
  content?: string
  imageUrls?: string[]
  productId?: string
  status?: string
  createdAt?: string
  durationDays?: number
  startDate?: string
  endDate?: string
  payAmount?: number
  paymentMethod?: string
  recipientCount?: number
}

export interface MerchantAdCreatePayload {
  title: string
  content: string
  imageUrls?: string[]
  productId?: string
  /** 展示天数 1~30，必填 */
  durationDays: number
  /** free / coin / point / wechat / mock，必填 */
  paymentMethod: string
}

export interface MerchantAdPackageItem {
  id: string
  name?: string
  weeklyQuota?: number
  price?: number
}

/* ---------- 二期 §58 咨询 ---------- */

export interface ConsultantItem {
  id: string
  name: string
  title?: string
  organization?: string
  specialty?: string
  category?: string
  avatarUrl?: string
  chatPrice?: number
  appointmentEnabled?: boolean
  appointmentPrice?: number
  status?: string
  statusCode?: string
  auditStatus?: string
  createdAt?: string
}

export interface ConsultantCreatePayload {
  name: string
  title?: string
  organization?: string
  specialty?: string
  category: string
  avatarUrl?: string
  chatPrice?: number
  appointmentEnabled?: boolean
  appointmentPrice?: number
  phone?: string
  introduction?: string
}

export interface ConsultantUpdatePayload {
  name?: string
  title?: string
  organization?: string
  specialty?: string
  category?: string
  avatarUrl?: string
  chatPrice?: number
  appointmentEnabled?: boolean
  appointmentPrice?: number
  phone?: string
  introduction?: string
}

export interface ConsultationSettings {
  commissionRate?: number
}

/* ---------- 二期 §60 业主商户 ---------- */

export interface ResidentMerchantApplicationItem {
  id: string
  residentId?: string
  residentName?: string
  phone?: string
  communityId?: string
  communityName?: string
  depositAmount?: number
  depositStatus?: string
  status?: string
  statusCode?: string
  /** public=对外 / private=不对外 */
  visibility?: string
  createdAt?: string
  auditedAt?: string
}

export interface ResidentMerchantMyDetail {
  applicationId?: string
  status?: string
  statusCode?: string
  visibility?: string
  depositStatus?: string
  depositAmount?: number
  listingCount?: number
  residentId?: string
  residentName?: string
  propertyCompanyId?: string
}

export interface ResidentMerchantPublicItem {
  residentId: string
  residentName?: string
  propertyCompanyId?: string
  visibility?: string
  status?: string
  depositAmount?: number
  listingCount?: number
}

export interface ResidentMerchantPublicListing {
  id: string
  productName?: string
  coverUrl?: string
  retailPrice?: number
  shareCount?: number
}

export interface ResidentMerchantPublicDetail extends ResidentMerchantPublicItem {
  listings?: ResidentMerchantPublicListing[]
}

export interface ResidentMerchantShareResult {
  shareUrl?: string
  posterImageUrl?: string
  qrcodeUrl?: string
  visibility?: string
}

export interface ResidentMerchantDepositItem {
  id: string
  applicationId?: string
  residentId?: string
  residentName?: string
  amount?: number
  status?: string
  statusCode?: string
  deductedAmount?: number
  createdAt?: string
}

export interface ResidentMerchantSettlementItem {
  id: string
  orderId?: string
  residentMerchantId?: string
  residentName?: string
  wholesaleAmount?: number
  retailAmount?: number
  commissionAmount?: number
  settlementAmount?: number
  status?: string
  statusCode?: string
  settledAt?: string
  createdAt?: string
}

export interface ResidentMerchantSettings {
  defaultDepositAmount?: number
  platformCommissionRate?: number
  refundWindowDays?: number
}

export interface DistributorProductCreatePayload {
  name: string
  coverUrl?: string
  categoryId?: string
  wholesalePrice: number
  suggestedRetailPrice: number
  stock?: number
  description?: string
}

/** 设备推送 token 上报（极光 registrationId） */
export interface DevicePushTokenPayload {
  token: string
  provider: 'jpush'
  platform: 'android' | 'ios' | 'web'
  appId: string
  deviceId?: string
}

export interface DevicePushTokenResult {
  token: string
  provider: string
  platform: string
  userId?: string
}

/* ---------- 技工门户 ---------- */

export interface TechnicianDetail {
  id: string
  name?: string
  phone?: string
  specialty?: string
  status?: string
  propertyCompanyId?: string
  propertyName?: string
  taskCount?: number
  completedCount?: number
}

export interface TechnicianTaskItem {
  id: string
  title?: string
  description?: string
  address?: string
  contactPhone?: string
  contactName?: string
  status?: string
  statusCode?: string
  preferredTime?: string
  createdAt?: string
  updatedAt?: string
  completedAt?: string
}

export interface TechnicianTaskStatusPayload {
  status: string
  remark?: string
}

/* ---------- v3.8 管理端扩展 ---------- */

export interface CoinUseCondition {
  condition?: string
  pointThreshold?: number
  satisfied?: boolean
  eligible?: boolean
}

export interface CoinUseConditionPayload {
  condition: string
  pointThreshold?: number
}

export interface CoinWithdrawalSettings {
  autoEnabled?: boolean
  periodDays?: number
  feeRate?: number
}

export interface WithdrawalBlockPayload {
  blocked: boolean
  reason?: string
}

export interface ProfileRewardItem {
  id: string
  scope?: string
  scopeId?: string
  fieldName?: string
  rewardPoints?: number
  oncePerUser?: boolean
  status?: string
  createdAt?: string
}

export interface ProfileRewardPayload {
  scope: string
  scopeId: string
  fieldName: string
  rewardPoints: number
  oncePerUser?: boolean
}

export interface CompanyAccountBalance {
  propertyCompanyId?: string
  balance?: number
  lastUpdatedAt?: string
}

export interface CompanyAccountRecord {
  id?: string
  amount?: number
  remark?: string
  createdAt?: string
  operatorName?: string
}

export interface CommunityPointPool {
  communityId?: string
  balance?: number
  totalIn?: number
  totalOut?: number
}

export interface CommunityPointRecord {
  id?: string
  amount?: number
  source?: string
  remark?: string
  createdAt?: string
}

export interface CommunityPointAdjustPayload {
  communityId: string
  amount: number
  remark?: string
}

export interface ArrearsReportItem {
  residentId?: string
  residentName?: string
  phone?: string
  building?: string
  unit?: string
  room?: string
  feeType?: string
  period?: string
  /** v4.8 账期起始日 */
  periodStart?: string
  /** v4.8 账期结束日 */
  periodEnd?: string
  amount?: number
  paidAmount?: number
  dueDate?: string
  daysOverdue?: number
}

export interface ArrearsReport {
  totalArrearsAmount?: number
  totalCount?: number
  items?: ArrearsReportItem[]
  groupByBuilding?: Array<{ building?: string; totalAmount?: number; count?: number }>
}

/** POST /admin/property-fees/arrears-reminder/preview */
export interface ArrearsReminderPreviewPayload {
  propertyCompanyId?: string
  communityId?: string
  building?: string
  feeType?: string
  templateCode?: string
}

export interface ArrearsReminderPreviewResult {
  templateCode: string
  previewToken: string
  expiresAt: string
  recipientCount: number
  totalArrearsAmount: number
  inAppEligibleCount: number
  wechatEligibleCount: number
  wechatIneligibleCount: number
  duplicateResidentCount: number
}

/** POST /admin/property-fees/arrears-reminder */
export interface ArrearsReminderPayload extends ArrearsReminderPreviewPayload {
  previewToken: string
  channels: string[]
  /** 幂等键，对应文档 `requestId` */
  requestId?: string
  title: string
  content: string
}

export interface ArrearsReminderChannelResult {
  successCount: number
  skippedCount?: number
  failedCount: number
}

export interface ArrearsReminderResult {
  batchId: string
  recipientCount: number
  notifiedCount: number
  skippedCount: number
  failedCount: number
  channels: {
    inApp: ArrearsReminderChannelResult
    wechat?: ArrearsReminderChannelResult
  }
}

/** §88 物业住户聊天 */
export interface AdminConversationItem {
  peerId: string
  peerName?: string
  peerAvatarUrl?: string
  conversationType?: string
  officialSenderType?: string
  lastMessage?: string
  lastMessageTime?: string
  lastMessageFromMe?: boolean
  unreadCount?: number
}

export interface AdminChatMessageItem {
  id: string
  fromId?: string
  toId?: string
  content?: string
  messageType?: string
  chatType?: string
  readStatus?: string
  createdAt?: string
  fromMe?: boolean
}

export interface RoomStructureRoom {
  room?: string
  isOccupied?: boolean
  residentId?: string | null
  residentName?: string | null
  status?: string
}

export interface RoomStructureFloor {
  floor?: string
  rooms?: RoomStructureRoom[]
}

export interface RoomStructureUnit {
  unit?: string
  floors?: RoomStructureFloor[]
}

export interface RoomStructure {
  building?: string
  units?: RoomStructureUnit[]
}

export interface AvailableRoomItem {
  building?: string
  unit?: string
  floor?: string
  room?: string
  isOccupied?: boolean
  status?: string
}

export interface AvailableRoomsResult {
  communityId?: string
  totalAvailable?: number
  items?: AvailableRoomItem[]
}

/** GET /communities/{id}/rooms（§84.3） */
export interface CommunityRoomItem {
  id: string
  communityId?: string
  building?: string
  unit?: string
  floor?: string
  room?: string
  status?: string
  residentId?: string | null
  residentName?: string | null
  createdAt?: string
}

export interface CommunityRoomListResult {
  communityId?: string
  total?: number
  rooms?: CommunityRoomItem[]
}

export interface CommunityRoomCreatePayload {
  building: string
  unit: string
  floor?: string
  room: string
}

export interface CommunityRoomBatchCreatePayload {
  building: string
  unit: string
  rooms: Array<{ floor?: string; room: string }>
}

export interface CommunityRoomUpdatePayload {
  status?: string
  floor?: string
}

export interface PointsTrendDay {
  date?: string
  earned?: number
  spent?: number
}

export interface PointsTrend {
  month?: string
  totalEarned?: number
  totalSpent?: number
  daily?: PointsTrendDay[]
}

export interface PointsConsumptionItem {
  source?: string
  amount?: number
  percentage?: number
}

export interface PointsConsumptionStructure {
  month?: string
  totalSpent?: number
  items?: PointsConsumptionItem[]
}

export interface RegionalLeaderItem {
  id: string
  residentId?: string
  sectorLeaderId?: string
  name?: string
  phone?: string
  regionName?: string
  shareRate?: number
  status?: string
  createdAt?: string
}

export interface RegionalLeaderPayload {
  residentId: string
  sectorLeaderId: string
  name: string
  phone: string
  regionName: string
  shareRate?: number
}

export interface ProjectLeaderItem {
  id: string
  residentId?: string
  regionalLeaderId?: string
  name?: string
  phone?: string
  projectName?: string
  shareRate?: number
  status?: string
  createdAt?: string
}

export interface ProjectLeaderPayload {
  residentId: string
  regionalLeaderId: string
  name: string
  phone: string
  projectName: string
  shareRate?: number
}

export interface MerchantRecommendPayload {
  isRecommended: boolean
  recommendedSort?: number
}

/* ---------- §77 商家关键词 ---------- */

export interface MerchantKeywordItem {
  id: string
  keyword: string
  weight?: number
}

export interface MerchantKeywordsResult {
  merchantId?: string
  merchantName?: string
  keywords?: MerchantKeywordItem[]
}

export interface MerchantKeywordCreatePayload {
  keyword: string
  weight?: number
}

export interface MerchantKeywordBatchPayload {
  keywords: string[]
}

export interface MerchantKeywordUpdatePayload {
  weight: number
}

/* ---------- §87 商家动态 ---------- */

export interface MerchantPostItem {
  id: string
  merchantId?: string
  merchantName?: string
  title?: string
  content?: string
  /** 后端可能返回 JSON 字符串或数组 */
  imageUrls?: string[] | string
  videoUrl?: string | null
  status?: string
  viewCount?: number
  createdAt?: string
  updatedAt?: string
}

export interface MerchantPostPayload {
  title: string
  content: string
  imageUrls?: string[] | string
  videoUrl?: string
  status?: string
}

/* ---------- 文件模块 /files ---------- */

export interface UploadFileResponse {
  fileId: string
  originalName?: string
  storedName?: string
  url: string
  thumbnailUrl?: string
  size?: number
  mimeType?: string
  category?: string
}

export interface BatchUploadFileItemResponse extends UploadFileResponse {
  order?: number
}

export interface FileDetailResponse extends UploadFileResponse {
  uploaderId?: string
  propertyCompanyId?: string
  createdAt?: string
}

export interface DeleteFileResponse {
  fileId: string
  deleted: boolean
}

/* ---------- 微信收付通分账收款账户 / 对账台（管理端 · 路径仍为 /admin/cbk） ---------- */

/** GET /admin/cbk/accounts 账户行；accountNo 为微信收付通二级商户号 */
export interface CbkAccountItem {
  id: string
  ownerType?: string
  ownerId?: string
  accountNo?: string
  merchantNo?: string
  accountName?: string
  verified?: boolean
  createdAt?: string
  updatedAt?: string
}

/** POST /admin/cbk/accounts · PUT /admin/cbk/accounts/{id}；accountNo 为微信收付通二级商户号 */
export interface CbkAccountUpsertPayload {
  ownerType: string
  ownerId: string
  accountNo: string
  merchantNo?: string
  accountName?: string
  verified?: boolean
}

/** GET /admin/cbk/reconcile/failed 待人工介入流水 */
export interface CbkReconcileItem {
  splitNo: string
  status?: string
  ownerType?: string
  ownerId?: string
  accountNo?: string
  amount?: number | string
  orderId?: string
  orderNo?: string
  failReason?: string
  remark?: string
  createdAt?: string
  updatedAt?: string
}

/* ---------- §73 社区食堂（管理端） ---------- */

export interface CanteenSettings {
  quotaFeeRate: number
}

export interface CanteenBindingItem {
  id: string
  mainMerchantId: string
  mainMerchantName?: string
  subMerchantId: string
  subMerchantName?: string
  supplyDiscountRate?: number
  status?: string
  createdAt?: string
}

export interface CanteenBindingCreatePayload {
  mainMerchantId: string
  subMerchantId: string
  supplyDiscountRate?: number
}

/** POST /admin/canteen/merchants — 创建食堂主商家或窗口 */
export interface CanteenMerchantCreatePayload {
  name: string
  contactPhone: string
  propertyCompanyId: string
  isMain?: boolean
  category?: string
  description?: string
  address?: string
  businessHours?: string
  videoUrl?: string
  coverUrls?: string[]
  deliveryFee?: number
  freeDeliveryThreshold?: number
  deliveryScope?: string
}

/** POST /admin/canteen/merchants/{id}/quota-adjust */
export interface CanteenQuotaAdjustPayload {
  amount: number
  remark?: string
}

export interface CanteenQuotaAdjustResult {
  merchantId?: string
  amount?: number | string
  remainingQuota?: number | string
}

export interface CanteenQuotaPurchaseItem {
  id: string
  type?: string
  amount?: number | string
  feeAmount?: number | string
  actualQuota?: number | string
  status?: string
  remark?: string
  createdAt?: string
}

export interface CanteenAdminRechargeItem {
  id: string
  mainMerchantId?: string
  mainMerchantName?: string
  residentId?: string
  residentName?: string
  residentPhone?: string
  amount?: number | string
  balanceAfter?: number | string
  operatorId?: string
  remark?: string
  createdAt?: string
}

export interface CanteenDirectedFlowItem {
  id: string
  flowType?: string
  mainMerchantId?: string
  mainMerchantName?: string
  merchantId?: string
  merchantName?: string
  residentId?: string
  amount?: number | string
  balanceAfter?: number | string
  orderNo?: string | null
  remark?: string
  createdAt?: string
}
