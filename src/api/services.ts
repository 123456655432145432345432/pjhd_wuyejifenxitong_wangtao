import { ApiError, buildQuery, request } from './request'
import { normalizeBuildingChangeApplication, normalizeMerchantItem } from './mappers'
import { getAccessToken } from '../stores/tokenStore'
import { normalizePageResult } from '../utils/pageResult'
import { normalizeDistributionRecords } from '../utils/distribution'
import { normalizeCbkAccount, normalizeCbkReconcileItem } from '../utils/cbk'
import { MERCHANT_AUDIT_STATUS, ORDER_STATUS } from '../constants/enums'
import type {
  AgeBracketItem,
  AnnouncementCreatePayload,
  AnnouncementItem,
  AnnouncementReadStats,
  AnnouncementUpdatePayload,
  CommunityEntityCreatePayload,
  CommunityEntityItem,
  CommunityPropertyBindPayload,
  CommunityPropertyBindingItem,
  CommunityPropertyPermissionPayload,
  ConsultantCreatePayload,
  ConsultantItem,
  ConsultantUpdatePayload,
  ConsultationSettings,
  DashboardOverview,
  DeliveryOrderItem,
  DeliveryCapacity,
  DeliveryCourierItem,
  DeliveryHourlyData,
  DeliveryOverview,
  DeliveryRule,
  DeliveryRuleUpsertPayload,
  DeliveryScopeOptions,
  DeliveryTaskItem,
  DeliveryTodayStats,
  DevicePushTokenPayload,
  DevicePushTokenResult,
  DirectedMessageCreatePayload,
  DirectedMessageRecipientItem,
  DirectedMessageSendResult,
  DirectedMessageTaskItem,
  DistributorProductCreatePayload,
  RecentDeliveryItem,
  LeaderItem,
  LoginResult,
  MerchantAdCreatePayload,
  MerchantAdItem,
  MerchantAdPackageItem,
  MerchantAdQuota,
  MerchantAdQuote,
  MerchantAdSettings,
  MerchantItem,
  MerchantKickPayload,
  MerchantKickResult,
  MerchantCommunityDistanceItem,
  MerchantCommunityDistancesPayload,
  MerchantMessageServicePayload,
  MerchantDeliveryFeesPayload,
  MerchantServiceScope,
  MerchantServiceScopeUpdatePayload,
  MerchantUpdatePayload,
  MerchantProfitSpace,
  MerchantAuditPayload,
  MerchantAuditResult,
  PlatformMerchantCreatePayload,
  PlatformMerchantItem,
  PlatformMerchantUpdatePayload,
  OperationLogItem,
  OrderConfirmResult,
  OrderItem,
  OrderVerifyPayload,
  OrderVerifyResult,
  AdminOrderConfig,
  PageResult,
  PermissionChangeLog,
  PermissionItemDto,
  AdminUserAccount,
  UserPermissionsDetail,
  PointPool,
  PropertyCompanyConfig,
  PropertyCompanyDetail,
  PropertyCompanyItem,
  PropertyCompanyCommunity,
  PropertyCompanyUpdatePayload,
  ArrearsReminderPayload,
  ArrearsReminderPreviewPayload,
  ArrearsReminderPreviewResult,
  ArrearsReminderResult,
  AdminConversationItem,
  AdminChatMessageItem,
  PropertyOperatorCreatePayload,
  PropertyOperatorItem,
  PropertyOperatorScopePayload,
  ResidentItem,
  ResidentCreatePayload,
  ResidentUpdatePayload,
  ResidentStatusPayload,
  BuildingChangeApplication,
  TransferToPropertyItem,
  RoleAccountCreatePayload,
  RoleAccountCreateResult,
  RoleAccountDeleteResult,
  RoleAccountDisableResult,
  FamilyMemberItem,
  ResidentMerchantApplicationItem,
  ResidentMerchantDepositItem,
  ResidentMerchantMyDetail,
  ResidentMerchantPublicDetail,
  ResidentMerchantPublicItem,
  ResidentMerchantSettlementItem,
  ResidentMerchantSettings,
  ResidentMerchantShareResult,
  RolePresetDto,
  CoinFreezePayload,
  CoinFreezeResult,
  CoinUnfreezePayload,
  CoinUnfreezeResult,
  CoinFreezeRecordItem,
  CommunityServiceCreatePayload,
  CommunityServiceItem,
  CommunityServiceUpdatePayload,
  CourierDeliveryItem,
  DeliveryCompletePayload,
  DistributionCalculateResult,
  DistributionRecordItem,
  DistributionStats,
  PropertySettlementBalance,
  MerchantPointGrantPayload,
  MerchantPointQuote,
  MerchantPointPurchaseItem,
  MerchantPointPurchasePayload,
  MerchantWithdrawalItem,
  MerchantWithdrawalPayload,
  MyMerchantDetail,
  ProductCreatePayload,
  ProductItem,
  ProductUpdatePayload,
  SectorLeaderDetail,
  SectorLeaderCreatePayload,
  SectorLeaderRemoveResult,
  SectorLeaderUpdatePayload,
  ServiceCategoryDictItem,
  ServiceRequestItem,
  ServiceRequestQuotePayload,
  CoordinatorDetail,
  ActivityGroupItem,
  ActivityGroupCreatePayload,
  ActivityGroupUpdatePayload,
  ActivityGroupMemberItem,
  ActivityPricingTier,
  ActivityPricingTierPayload,
  ActivityPricingTiersResult,
  SpecialOfferCreatePayload,
  SpecialOfferItem,
  SpecialOfferUpdatePayload,
  UserProfile,
  AdminMerchantPointPurchaseItem,
  AdminPointPurchaseAuditPayload,
  AdminPointPurchaseAuditResult,
  AdminMerchantWithdrawalItem,
  AdminWithdrawalAuditPayload,
  AdminWithdrawalAuditResult,
  MerchantWithdrawalSummary,
  AdminRoleWithdrawalItem,
  AdminRoleWithdrawalAuditPayload,
  AdminRoleWithdrawalAuditResult,
  RoleWithdrawalSummary,
  CoinWithdrawalSummary,
  AdminCoinWithdrawalItem,
  AdminCoinWithdrawalAuditPayload,
  PropertyContactConfig,
  PropertyContactPayload,
  CommunityCommentItem,
  CommunityPostItem,
  ContentReportItem,
  ContentReportHandlePayload,
  PlatformShareRates,
  UpdatePlatformShareRatesPayload,
  PlatformEarningsStats,
  PlatformEarningRecordItem,
  PlatformEarningsBalance,
  CourierManagerItem,
  CourierManagerCreatePayload,
  CourierManagerUpdatePayload,
  CourierManagerCourierItem,
  DeliveryPriceRangeItem,
  DeliveryPriceRangePayload,
  PriceApprovalItem,
  PriceApprovalCreatePayload,
  PriceApprovalAuditPayload,
  PropertyCoinEarnPayload,
  PropertyCoinEarnResult,
  MerchantCoinEarnPayload,
  PropertyCoinMallRules,
  RoleWithdrawalItem,
  RoleWithdrawalPayload,
  IndividualLeaderItem,
  IndividualLeaderCreatePayload,
  AdminIndividualLeaderCreatePayload,
  IndividualLeaderApplicationItem,
  IndividualLeaderApplicationAuditPayload,
  OrderRefundItem,
  OrderRefundAuditPayload,
  OrderRefundAuditResult,
  SectorLeaderMerchantAuditPayload,
  SectorLeaderMerchantCreatePayload,
  MerchantDistributionPayload,
  MerchantDeliveryFeePayload,
  CoordinatorSectorLeaderCreatePayload,
  CoordinatorIndividualLeaderCreatePayload,
  CoordinatorMerchantCreatePayload,
  CoordinatorMerchantFreezePayload,
  CoordinatorMerchantAuditPayload,
  ProductAnnouncementCreatePayload,
  ActivityAnnouncementCreatePayload,
  MerchantTargetedAdCreatePayload,
  DistributorProductBillingCyclePayload,
  DistributorProductItem,
  TechnicianDetail,
  TechnicianTaskItem,
  TechnicianTaskStatusPayload,
  CoinUseCondition,
  CoinUseConditionPayload,
  CoinWithdrawalSettings,
  WithdrawalBlockPayload,
  ProfileRewardItem,
  ProfileRewardPayload,
  CompanyAccountBalance,
  CompanyAccountRecord,
  CommunityPointPool,
  CommunityPointRecord,
  CommunityPointAdjustPayload,
  ArrearsReport,
  RoomStructure,
  AvailableRoomsResult,
  CommunityRoomItem,
  CommunityRoomListResult,
  CommunityRoomCreatePayload,
  CommunityRoomBatchCreatePayload,
  CommunityRoomUpdatePayload,
  PointsTrend,
  PointsConsumptionStructure,
  PointPoolRecordItem,
  RegionalLeaderItem,
  RegionalLeaderPayload,
  ProjectLeaderItem,
  ProjectLeaderPayload,
  MerchantRecommendPayload,
  MerchantKeywordsResult,
  MerchantKeywordItem,
  MerchantKeywordCreatePayload,
  MerchantKeywordBatchPayload,
  MerchantKeywordUpdatePayload,
  MerchantPostItem,
  MerchantPostPayload,
  CbkAccountItem,
  CbkAccountUpsertPayload,
  CanteenSettings,
  CanteenBindingItem,
  CanteenBindingCreatePayload,
  CanteenMerchantCreatePayload,
  CanteenQuotaAdjustPayload,
  CanteenQuotaAdjustResult,
  CanteenQuotaPurchaseItem,
  CanteenAdminRechargeItem,
  CanteenDirectedFlowItem
} from './types'



export const authApi = {

  adminLogin(phone: string, password: string) {
    return request<LoginResult>('/auth/admin-login', {
      method: 'POST',
      body: JSON.stringify({ phone, password })
    }, false)
  },

  refreshToken(refreshToken: string) {

    return request<LoginResult>('/auth/refresh-token', {

      method: 'POST',

      body: JSON.stringify({ refreshToken })

    }, false)

  },

  profile(options: { softAuth?: boolean } = {}) {
    return request<UserProfile>('/auth/profile', { softAuth: options.softAuth })
  }

}



export const dashboardApi = {
  /** 超管需传 propertyCompanyId，由 request 层按登录态自动附加 */
  overview() {
    return request<DashboardOverview>('/admin/dashboard/overview')
  }
}

export const operationLogApi = {
  list(params: {
    page?: number
    pageSize?: number
    keyword?: string
    module?: string
    operatorId?: string
    startDate?: string
    endDate?: string
  } = {}) {
    return request<PageResult<OperationLogItem>>(`/admin/operation-logs${buildQuery(params)}`)
  }
}



export const residentApi = {

  list(params: {
    page?: number
    pageSize?: number
    keyword?: string
    communityId?: string
    building?: string
    buildingIsNull?: boolean
    status?: string
    role?: string
    /** 按关联店铺名搜索；不依赖 resident.role，被踢出后仍可按店名找回账号 */
    merchantName?: string
    userType?: string
    propertyCompanyId?: string
    sort?: string
  } = {}) {

    return request<PageResult<ResidentItem>>(`/residents${buildQuery(params)}`)

  },

  get(id: string) {
    return request<ResidentItem>(`/residents/${id}`)
  },

  create(payload: ResidentCreatePayload) {
    return request<ResidentItem>('/residents', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  },

  update(id: string, payload: ResidentUpdatePayload) {
    return request<ResidentItem>(`/residents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    })
  },

  updateStatus(id: string, payload: ResidentStatusPayload) {
    return request<ResidentItem>(`/residents/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    })
  },

  remove(id: string) {
    return request<null>(`/residents/${id}`, { method: 'DELETE' })
  },

  freezeCoin(id: string, payload: CoinFreezePayload) {

    return request<CoinFreezeResult>(`/admin/residents/${id}/coin/freeze`, {

      method: 'POST',

      body: JSON.stringify(payload)

    })

  },

  unfreezeCoin(id: string, payload: CoinUnfreezePayload) {

    return request<CoinUnfreezeResult>(`/admin/residents/${id}/coin/unfreeze`, {

      method: 'POST',

      body: JSON.stringify(payload)

    })

  }

}

/** 住户转给物业流水对账（§42.2） */
export const transferToPropertyAdminApi = {
  points(params: {
    page?: number
    pageSize?: number
    propertyCompanyId?: string
    residentId?: string
  } = {}) {
    return request<PageResult<TransferToPropertyItem>>(
      `/admin/transfer-to-property/points${buildQuery(params)}`
    )
  },

  coins(params: {
    page?: number
    pageSize?: number
    propertyCompanyId?: string
    residentId?: string
  } = {}) {
    return request<PageResult<TransferToPropertyItem>>(
      `/admin/transfer-to-property/coins${buildQuery(params)}`
    )
  }
}

/** 物业端住户楼栋变更审批（§2.6.3） */
export const buildingChangeAdminApi = {
  async list(params: {
    page?: number
    pageSize?: number
    status?: string
    propertyCompanyId?: string
  } = {}) {
    const result = await request<PageResult<BuildingChangeApplication>>(
      `/admin/building-changes${buildQuery(params)}`
    )
    return {
      ...result,
      list: (result.list || []).map(normalizeBuildingChangeApplication)
    }
  },

  approve(id: string) {
    return request<BuildingChangeApplication>(`/admin/building-changes/${id}/approve`, {
      method: 'POST'
    })
  },

  reject(id: string, reason: string) {
    return request<BuildingChangeApplication>(
      `/admin/building-changes/${id}/reject${buildQuery({ reason })}`,
      { method: 'POST' }
    )
  }
}

function pickRefundNumber(source: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = source[key]
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value)
      if (Number.isFinite(parsed)) return parsed
    }
  }
  return undefined
}

function flattenRefundSource(raw: unknown): Record<string, unknown> {
  const source = raw && typeof raw === 'object' ? { ...(raw as Record<string, unknown>) } : {}
  for (const key of ['order', 'data', 'refund']) {
    const nested = source[key]
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
      Object.assign(source, nested as Record<string, unknown>, source)
    }
  }
  return source
}

function normalizeOrderRefundItem(raw: unknown): OrderRefundItem {
  const source = flattenRefundSource(raw)
  return {
    orderId: pickPrefixedId(source, 'ord_', ['orderId', 'order_id', 'id']) || '',
    orderNo: pickApplicationField(source, ['orderNo', 'order_no']),
    orderStatus: pickApplicationField(source, [
      'orderStatus',
      'order_status',
      'refundStatus',
      'refund_status',
      'status'
    ]),
    cancelReason: pickApplicationField(source, ['cancelReason', 'cancel_reason', 'reason', 'refundReason', 'refund_reason']),
    rejectReason: pickApplicationField(source, ['rejectReason', 'reject_reason']),
    residentName: pickApplicationField(source, ['residentName', 'resident_name', 'receiverName', 'receiver_name']),
    residentPhone: pickApplicationField(source, ['residentPhone', 'resident_phone', 'phone', 'contactPhone', 'receiverPhone']),
    receiverName: pickApplicationField(source, ['receiverName', 'receiver_name']),
    merchantName: pickApplicationField(source, ['merchantName', 'merchant_name']),
    totalAmount: pickRefundNumber(source, ['totalAmount', 'total_amount', 'payAmount', 'amount']),
    createdAt: pickApplicationField(source, ['createdAt', 'created_at']),
    requestedAt: pickApplicationField(source, ['requestedAt', 'requested_at', 'refundRequestedAt']),
    auditedAt: pickApplicationField(source, ['auditedAt', 'audited_at'])
  }
}

/** 管理端订单退货审核（v6.4 §60.11.1） */
export const adminOrderRefundApi = {
  async list(params: {
    page?: number
    pageSize?: number
    status?: string
    keyword?: string
    propertyCompanyId?: string
  } = {}) {
    const raw = await request<PageResult<OrderRefundItem> | unknown>(
      `/admin/orders/refunds${buildQuery(params)}`
    )
    const result = normalizePageResult<OrderRefundItem>(raw, params.page ?? 1, params.pageSize ?? 20)
    return {
      ...result,
      list: result.list.map(normalizeOrderRefundItem)
    }
  },

  audit(orderId: string, payload: OrderRefundAuditPayload) {
    return request<OrderRefundAuditResult>(`/admin/orders/refunds/${orderId}/audit`, {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  }
}

/**
 * §31.2 业务角色账号直建 / 直删
 * Roles: property_admin、platform_admin
 * role: merchant | activity_leader | technician | courier
 */
export const roleAccountApi = {
  create(payload: RoleAccountCreatePayload) {
    return request<RoleAccountCreateResult>('/admin/role-accounts', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  },

  /** 硬删除账号（含关联店铺）；id 为 res_ 前缀。有业务数据时返回 90120，应改用 disable / softDelete */
  remove(id: string) {
    return request<RoleAccountDeleteResult>(`/admin/role-accounts/${id}`, {
      method: 'DELETE'
    })
  },

  /** §31.2.3 禁用：账号不可登录，名下 active 店铺改为 stopped */
  disable(id: string, reason: string) {
    return request<RoleAccountDisableResult>(`/admin/role-accounts/${id}/disable`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    })
  },

  /** §31.2.4 软删除：账号从列表隐藏，名下 active 店铺改为 stopped，不释放手机号 */
  softDelete(id: string) {
    return request<RoleAccountDeleteResult>(`/admin/role-accounts/${id}/soft-delete`, {
      method: 'POST'
    })
  }
}

export const familyApi = {
  listMembers(familyId: string) {
    return request<{ list: FamilyMemberItem[] }>(`/families/${familyId}/members`)
  },

  addMember(familyId: string, payload: { phone: string; name?: string; relation: string }) {
    return request<{ memberId?: string; familyId?: string; name?: string; phone?: string; relation?: string }>(
      `/families/${familyId}/members`,
      { method: 'POST', body: JSON.stringify(payload) }
    )
  }
}

export const coinFreezeRecordApi = {
  list(params: {
    page?: number
    pageSize?: number
    residentId?: string
    action?: string
    sort?: string
  } = {}) {
    return request<PageResult<CoinFreezeRecordItem>>(
      `/admin/coin-freeze-records${buildQuery({ action: 'freeze', ...params })}`
    )
  }
}

function unwrapCommunityDistances(
  data:
    | MerchantCommunityDistanceItem[]
    | { list?: MerchantCommunityDistanceItem[]; items?: MerchantCommunityDistanceItem[] }
    | null
    | undefined
) {
  const raw = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : Array.isArray(data?.list) ? data.list : []
  return raw.map((item) => {
    const row = item as MerchantCommunityDistanceItem & { id?: string; name?: string; community_id?: string; community_name?: string; distance_km?: number }
    return {
      communityId: row.communityId || row.community_id || row.id || '',
      communityName: row.communityName || row.community_name || row.name,
      distanceKm: row.distanceKm ?? row.distance_km ?? null
    }
  }).filter((item) => item.communityId)
}

export const merchantApi = {

  list(params: {
    page?: number
    pageSize?: number
    keyword?: string
    category?: string
    merchantLevel?: string
    auditStatus?: string
    applyRole?: string
    /** 管理端营业状态：active / kicked / quit / inactive；不传返回全部 */
    status?: string
    /** 商家角色类型：goods / technician / group_leader / canteen（§7.1） */
    merchantType?: string
    propertyCompanyId?: string
    sort?: string
  } = {}) {

    return request<PageResult<MerchantItem>>(`/merchants${buildQuery(params)}`).then((raw) => {
      const page = normalizePageResult<MerchantItem>(raw, params.page, params.pageSize)
      return {
        ...page,
        list: page.list.map((item) => normalizeMerchantItem(item))
      }
    })

  },

  /** POST /admin/platform-merchants/batch-config — 批量/单条改挂接兑换比等 */
  batchConfig(payload: {
    merchantIds: string[]
    config: {
      commissionRate?: number
      pointExchangeRate?: number
      coinRebateRate?: number
      coinRebateEnabled?: boolean
    }
  }) {
    return request<{ updatedCount?: number; failedCount?: number }>(
      '/admin/platform-merchants/batch-config',
      { method: 'POST', body: JSON.stringify(payload) }
    )
  },

  get(id: string, propertyCompanyId?: string) {
    return request<MerchantItem>(`/merchants/${id}${buildQuery({ propertyCompanyId })}`).then(
      (item) => normalizeMerchantItem(item)
    )
  },

  update(id: string, payload: MerchantUpdatePayload, propertyCompanyId?: string) {
    return request<MerchantItem>(`/merchants/${id}${buildQuery({ propertyCompanyId })}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    })
  },

  listPlatform(params: {
    page?: number
    pageSize?: number
    keyword?: string
    category?: string
    status?: string
    sort?: string
  } = {}) {
    return request<PageResult<PlatformMerchantItem>>(`/admin/platform-merchants${buildQuery(params)}`)
  },

  createPlatform(payload: PlatformMerchantCreatePayload) {
    return request<PlatformMerchantItem>('/admin/platform-merchants', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  },

  getPlatform(id: string) {
    return request<PlatformMerchantItem>(`/admin/platform-merchants/${id}`)
  },

  updatePlatform(id: string, payload: PlatformMerchantUpdatePayload) {
    return request<PlatformMerchantItem>(`/admin/platform-merchants/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    })
  },

  async listPending(params: Record<string, string | number | undefined> = {}) {
    const query = { page: 1, pageSize: 50, sort: '-createdAt', ...params }
    const pendingAudit = await request<PageResult<MerchantItem>>(
      `/merchants${buildQuery({ ...query, auditStatus: MERCHANT_AUDIT_STATUS.PENDING })}`
    )
    let pendingLegacy: MerchantItem[] = []
    try {
      const extra = await request<PageResult<MerchantItem>>(
        `/merchants${buildQuery({ ...query, auditStatus: 'pending' })}`
      )
      pendingLegacy = extra.list || []
    } catch {
      pendingLegacy = []
    }
    const merged = new Map<string, MerchantItem>()
    for (const item of [...(pendingAudit.list || []), ...pendingLegacy]) {
      merged.set(item.id, item)
    }
    return {
      list: [...merged.values()],
      pagination: pendingAudit.pagination
    }
  },

  audit(id: string, payload: MerchantAuditPayload) {

    return request<MerchantAuditResult>(`/admin/merchants/${id}/audit`, {

      method: 'POST',

      body: JSON.stringify(payload)

    })

  },

  kick(id: string, payload: MerchantKickPayload) {
    return request<MerchantKickResult>(`/admin/merchants/${id}/kick`, {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  },

  /** POST /admin/merchants/{id}/coin/earn — 发放物业币到商家关联居民账户 */
  earnCoin(id: string, payload: MerchantCoinEarnPayload) {
    return request<PropertyCoinEarnResult>(`/admin/merchants/${id}/coin/earn`, {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  },

  profitSpace(
    platformMerchantId: string,
    params: { consumptionAmount: number }
  ) {
    return request<MerchantProfitSpace>(
      `/admin/platform-merchants/${platformMerchantId}/profit-space${buildQuery({
        consumptionAmount: params.consumptionAmount
      })}`
    )
  },

  /** GET /admin/merchants/{id}/community-distances — 商家×小区距离（§42.1） */
  async listCommunityDistances(merchantId: string) {
    const data = await request<
      MerchantCommunityDistanceItem[] | { list?: MerchantCommunityDistanceItem[]; items?: MerchantCommunityDistanceItem[] }
    >(`/admin/merchants/${merchantId}/community-distances`)
    return unwrapCommunityDistances(data)
  },

  async updateCommunityDistances(merchantId: string, payload: MerchantCommunityDistancesPayload) {
    const data = await request<
      MerchantCommunityDistanceItem[] | { list?: MerchantCommunityDistanceItem[]; items?: MerchantCommunityDistanceItem[] }
    >(`/admin/merchants/${merchantId}/community-distances`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    })
    return unwrapCommunityDistances(data)
  }

}



export const pointApi = {

  pool() {

    return request<PointPool>('/admin/point-pools')

  },

  records(params: {
    page?: number
    pageSize?: number
    /** 流水类型筛选，取值见 POINT_POOL_RECORD_TYPE */
    recordType?: string
    source?: string
    startDate?: string
    endDate?: string
    propertyCompanyId?: string
    sort?: string
  } = {}) {
    return request<PageResult<PointPoolRecordItem>>(`/admin/point-pools/records${buildQuery(params)}`)
  },

  trend(params: { month?: string; propertyCompanyId?: string } = {}) {
    return request<PointsTrend>(`/admin/points/trend${buildQuery(params)}`)
  },

  consumptionStructure(params: { month?: string; propertyCompanyId?: string } = {}) {
    return request<PointsConsumptionStructure>(
      `/admin/points/consumption-structure${buildQuery(params)}`
    )
  }

}



export const announcementApi = {

  list(params: {
    page?: number
    pageSize?: number
    announcementType?: string
    communityId?: string
    merchantId?: string
    readStatus?: string
    status?: string
    sort?: string
  } = {}) {

    return request<PageResult<AnnouncementItem>>(`/announcements${buildQuery(params)}`)

  },

  get(id: string) {

    return request<AnnouncementItem>(`/announcements/${id}`)

  },

  create(payload: AnnouncementCreatePayload) {

    return request<AnnouncementItem>('/announcements', {

      method: 'POST',

      body: JSON.stringify(payload)

    })

  },

  update(id: string, payload: AnnouncementUpdatePayload) {

    return request<AnnouncementItem>(`/announcements/${id}`, {

      method: 'PUT',

      body: JSON.stringify(payload)

    })

  },

  remove(id: string) {

    return request<{ id: string; status: string }>(`/announcements/${id}`, {

      method: 'DELETE'

    })

  },

  readStats(id: string) {
    return request<AnnouncementReadStats>(`/admin/announcements/${id}/read-stats`)
  }

}



export const deliveryApi = {

  overview(params: Record<string, string | number | undefined> = {}) {

    return request<DeliveryOverview>(`/admin/deliveries/overview${buildQuery(params)}`)

  },

  capacity(params: Record<string, string | number | undefined> = {}) {

    return request<DeliveryCapacity>(`/admin/deliveries/capacity${buildQuery(params)}`)

  },

  rules(params: Record<string, string | number | undefined> = {}) {

    return request<PageResult<DeliveryRule>>(`/admin/delivery-rules${buildQuery(params)}`)

  },

  orders(params: Record<string, string | number | undefined> = {}) {

    return request<PageResult<OrderItem>>(`/admin/delivery-orders${buildQuery(params)}`)

  },

  couriers(params: Record<string, string | number | undefined> = {}) {

    return request<PageResult<DeliveryTaskItem>>(`/admin/couriers${buildQuery(params)}`)

  }

}

/** 配送规则 / 可选项（§76） */
export const deliveryRulesApi = {
  /** GET /delivery-rules/scope-options — 公开字典 */
  scopeOptions() {
    return request<DeliveryScopeOptions>('/delivery-rules/scope-options', {}, false)
  },

  list(params: Record<string, string | number | undefined> = {}) {
    return request<PageResult<DeliveryRule> | DeliveryRule[]>(
      `/delivery-rules${buildQuery(params)}`
    )
  },

  create(payload: DeliveryRuleUpsertPayload) {
    return request<DeliveryRule>('/delivery-rules', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  },

  update(id: string, payload: DeliveryRuleUpsertPayload) {
    return request<DeliveryRule>(`/delivery-rules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    })
  }
}



export const propertyCompanyApi = {

  list(params: {
    page?: number
    pageSize?: number
    keyword?: string
    status?: string
    sort?: string
  } = {}, auth = false) {
    return request<PageResult<PropertyCompanyItem>>(
      `/property-companies${buildQuery(params)}`,
      {},
      auth
    )
  },

  /** 商家端当前物业（含自动提现开关/周期） */
  current() {
    return request<PropertyCompanyDetail>('/property-companies/current')
  },

  /**
   * 小区列表（后端已公开，无需登录 token）
   * - 有登录态时带 Token（管理端创建住户 / 楼宇等）
   * - 无 Token 时按公开接口调用（注册完善资料）；显式传 auth=false 可强制不带 Token
   */
  communities(id: string, auth?: boolean) {
    const withAuth = auth ?? Boolean(getAccessToken())
    return request<PageResult<PropertyCompanyCommunity>>(
      `/property-companies/${id}/communities`,
      {},
      withAuth
    )
  },

  /** PUT /admin/property-companies/{id} — v3.9 含积分分成比例等 */
  update(id: string, payload: PropertyCompanyUpdatePayload) {
    return request<PropertyCompanyDetail>(`/admin/property-companies/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    })
  }

}


export const adminOrderConfigApi = {
  /** GET/PUT /admin/order-config。v6.5 起核实入口由商品分类=团购决定，不再提交 merchantVerificationEnabled */
  get() {
    return request<AdminOrderConfig>('/admin/order-config')
  },

  update(payload: AdminOrderConfig) {
    return request<AdminOrderConfig>('/admin/order-config', {
      method: 'PUT',
      body: JSON.stringify(payload)
    })
  }
}

export const configApi = {

  propertyCompany(id: string) {

    return request<PropertyCompanyDetail>(`/admin/property-companies/${id}`)

  },

  /** GET /admin/property-companies/{id}/config — 配置回显（含 deliveryPerKgFee / pointExchangeRate） */
  getConfig(id: string) {
    return request<PropertyCompanyConfig | PropertyCompanyDetail>(
      `/admin/property-companies/${id}/config`
    )
  },

  updateConfig(id: string, config: PropertyCompanyConfig) {

    return request<PropertyCompanyDetail | PropertyCompanyConfig>(`/admin/property-companies/${id}/config`, {

      method: 'PATCH',

      body: JSON.stringify(config)

    })

  },

  updateDeliveryRule(id: string, payload: Partial<DeliveryRule>) {

    return request<DeliveryRule>(`/admin/delivery-rules/${id}`, {

      method: 'PUT',

      body: JSON.stringify(payload)

    })

  }

}



export const permissionApi = {

  users(params: { keyword?: string; page?: number; pageSize?: number } = {}) {
    return request<{ accounts: AdminUserAccount[]; total: number }>(
      `/admin/users${buildQuery(params)}`
    )
  },

  permissions() {
    return request<{ permissions: PermissionItemDto[] }>('/admin/permissions')
  },

  rolePresets() {
    return request<{ presets: RolePresetDto[] }>('/admin/role-presets')
  },

  userPermissions(userId: string) {
    return request<UserPermissionsDetail>(`/admin/users/${userId}/permissions`)
  },

  grantPermissions(userId: string, permissionCodes: string[], reason?: string) {
    return request<unknown>(`/admin/users/${userId}/permissions/grant`, {
      method: 'POST',
      body: JSON.stringify({ permissionCodes, reason })
    })
  },

  revokePermissions(userId: string, permissionCodes: string[]) {
    return request<unknown>(`/admin/users/${userId}/permissions/revoke`, {
      method: 'POST',
      body: JSON.stringify({ permissionCodes })
    })
  },

  changeLogs(params: {
    page?: number
    pageSize?: number
    userId?: string
    startDate?: string
    endDate?: string
    sort?: string
  } = {}) {
    return request<PageResult<PermissionChangeLog>>(
      `/admin/permission-change-logs${buildQuery(params)}`
    )
  }

}



export type { DeliveryOrderItem }

/**
 * 订单完成 / 确认收货。
 * 商家入账：orderStatus=completed 后立刻刷新 GET /merchants/my。
 * 配送入账：POST /deliveries/{id}/complete 后立刻刷新 GET /courier-managers/my（role=courier 即可）。
 */
export const ordersApi = {
  get(id: string) {
    return request<OrderItem>(`/orders/${id}`)
  },

  /** 管理员强制改履约方式 POST /admin/orders/{id}/override-fulfillment（§68.4） */
  overrideFulfillment(id: string, payload: { mode: string; remark?: string }) {
    return request<OrderItem>(`/admin/orders/${id}/override-fulfillment`, {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  },

  /** 商家核实纯团购单 POST /orders/{id}/verify（v6.5：整单商品 category=团购） */
  verify(id: string, payload: OrderVerifyPayload) {
    return request<OrderVerifyResult>(`/orders/${id}/verify`, {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  },

  /** 居民确认收货 → completed（商家侧入账） */
  confirm(id: string) {
    return request<OrderConfirmResult>(`/orders/${id}/confirm`, { method: 'POST' })
  },

  /** 商家 / 配送员将订单标为完成：body { orderStatus: 'completed' } */
  updateStatus(id: string, orderStatus: string) {
    return request<OrderItem>(`/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ orderStatus })
    })
  }
}

export const merchantPortalApi = {
  my() {
    return request<MyMerchantDetail>('/merchants/my')
  },

  update(id: string, payload: MerchantUpdatePayload) {
    return request<MyMerchantDetail>(`/merchants/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    })
  },

  updateDeliveryFees(payload: MerchantDeliveryFeesPayload) {
    return request<MyMerchantDetail>('/merchants/my/delivery-fees', {
      method: 'PUT',
      body: JSON.stringify(payload)
    })
  },

  orders(params: {
    page?: number
    pageSize?: number
    orderStatus?: string
    startDate?: string
    endDate?: string
    sort?: string
  } = {}) {
    return request<PageResult<OrderItem>>(`/orders${buildQuery(params)}`)
  },

  getOrder(id: string) {
    return request<OrderItem>(`/orders/${id}`)
  },

  verifyOrder(id: string, payload: OrderVerifyPayload) {
    return ordersApi.verify(id, payload)
  },

  /** 商家选择履约方式（§68.2）：merchant_self | courier_hall */
  chooseFulfillment(id: string, mode: string) {
    return request<{
      orderId?: string
      deliveryId?: string
      status?: string
      statusCode?: string
      statusLabel?: string
      sentAt?: string
    }>(`/orders/${id}/choose-fulfillment`, {
      method: 'POST',
      body: JSON.stringify({ mode })
    })
  },

  /** 商家确认自配送达（§68.3） */
  confirmMerchantDelivery(deliveryId: string, payload: DeliveryCompletePayload = {}) {
    return request<CourierDeliveryItem>(`/deliveries/${deliveryId}/merchant-confirm`, {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  },

  updateOrderStatus(id: string, orderStatus: string) {
    return ordersApi.updateStatus(id, orderStatus)
  },

  /** 商家确认订单完成 → 本单收入立即计入可提现 */
  completeOrder(id: string) {
    return ordersApi.updateStatus(id, ORDER_STATUS.COMPLETED)
  },

  /** 商家手动发送配送任务（POST /orders/{id}/send-delivery）。
   *  适用场景：历史已支付但当时未自动生成配送单的订单。
   *  若订单已存在配送单，后端会返回「该订单已有配送单」错误。 */
  sendDelivery(id: string) {
    return request<{
      orderId?: string
      deliveryId?: string
      status?: string
      sentAt?: string
    }>(`/orders/${id}/send-delivery`, { method: 'POST' })
  },

  /** 物业指派配送（POST /deliveries/{id}/assign） */
  assignDelivery(deliveryId: string, courierId: string) {
    return request<{ deliveryId?: string; courierId?: string; status?: string }>(
      `/deliveries/${deliveryId}/assign`,
      { method: 'POST', body: JSON.stringify({ courierId }) }
    )
  },

  /** 获取可用的快递员列表 */
  couriers(params: { page?: number; pageSize?: number } = {}) {
    return request<PageResult<DeliveryTaskItem>>(
      `/deliveries/couriers${buildQuery(params)}`
    )
  },

  products(params: {
    page?: number
    pageSize?: number
    merchantId?: string
    keyword?: string
    status?: string
    sort?: string
  } = {}) {
    return request<PageResult<ProductItem>>(`/products${buildQuery(params)}`)
  },

  createProduct(payload: ProductCreatePayload) {
    return request<ProductItem>('/products', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  },

  updateProduct(id: string, payload: ProductUpdatePayload) {
    return request<ProductItem>(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    })
  },

  purchasePoints(payload: MerchantPointPurchasePayload) {
    return request<MerchantPointPurchaseItem>('/merchant/points/purchase', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  },

  pointQuote(payAmount = 100) {
    return request<MerchantPointQuote>(
      `/merchant/points/quote${buildQuery({ payAmount })}`
    )
  },

  pointPurchases(params: {
    page?: number
    pageSize?: number
    auditStatus?: string
    startDate?: string
    endDate?: string
    sort?: string
  } = {}) {
    return request<PageResult<MerchantPointPurchaseItem>>(
      `/merchant/points/purchases${buildQuery(params)}`
    )
  },

  grantPoints(payload: MerchantPointGrantPayload) {
    return request<unknown>('/merchant/points/grant', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  },

  createWithdrawal(payload: MerchantWithdrawalPayload) {
    return request<MerchantWithdrawalItem>('/merchant/withdrawals', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  },

  withdrawals(params: {
    page?: number
    pageSize?: number
    auditStatus?: string
    startDate?: string
    endDate?: string
    sort?: string
  } = {}) {
    return request<PageResult<MerchantWithdrawalItem>>(
      `/merchant/withdrawals${buildQuery(params)}`
    )
  },

  getServiceScope() {
    return request<MerchantServiceScope>('/merchants/my/service-scope')
  },

  updateServiceScope(payload: MerchantServiceScopeUpdatePayload) {
    return request<MerchantServiceScope>('/merchants/my/service-scope', {
      method: 'PUT',
      body: JSON.stringify(payload)
    })
  },

  updateMessageService(payload: MerchantMessageServicePayload) {
    return request<{ enabled: boolean }>('/merchants/my/message-service', {
      method: 'PUT',
      body: JSON.stringify(payload)
    })
  },

  serviceRequestPending(params: { page?: number; pageSize?: number } = {}) {
    return request<PageResult<ServiceRequestItem>>(
      `/merchant/service-requests/pending${buildQuery(params)}`
    )
  },

  acceptServiceRequest(id: string) {
    return request<ServiceRequestItem>(`/merchant/service-requests/${id}/accept`, {
      method: 'POST'
    })
  },

  skipServiceRequest(id: string) {
    return request<ServiceRequestItem>(`/merchant/service-requests/${id}/skip`, {
      method: 'POST'
    })
  },

  quoteServiceRequest(id: string, payload: ServiceRequestQuotePayload) {
    return request<ServiceRequestItem>(`/merchant/service-requests/${id}/quote`, {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  },

  adQuota() {
    return request<MerchantAdQuota>('/merchant/ads/quota')
  },

  /** GET /merchant/ads/quote?days=N — 按天计价试算 */
  adQuote(days: number) {
    return request<MerchantAdQuote>(`/merchant/ads/quote${buildQuery({ days })}`)
  },

  ads(params: { page?: number; pageSize?: number } = {}) {
    return request<PageResult<MerchantAdItem>>(`/merchant/ads${buildQuery(params)}`)
  },

  createAd(payload: MerchantAdCreatePayload) {
    return request<MerchantAdItem>('/merchant/ads', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  }
}

export const courierPortalApi = {
  pending(params: { page?: number; pageSize?: number; sort?: string } = {}) {
    return request<PageResult<CourierDeliveryItem>>(`/deliveries/pending${buildQuery(params)}`)
  },

  available(params: { page?: number; pageSize?: number; sort?: string } = {}) {
    return request<PageResult<CourierDeliveryItem>>(`/deliveries/available${buildQuery(params)}`)
  },

  my(params: {
    page?: number
    pageSize?: number
    status?: string
    sort?: string
  } = {}) {
    return request<PageResult<CourierDeliveryItem>>(`/deliveries/my${buildQuery(params)}`)
  },

  grab(id: string) {
    return request<CourierDeliveryItem>(`/deliveries/${id}/grab`, { method: 'POST' })
  },

  /** 完成配送成功后立刻刷新 GET /courier-managers/my（本单 courierEarning 入可提现；B 方案来自配送费） */
  complete(id: string, payload: DeliveryCompletePayload = {}) {
    return request<CourierDeliveryItem>(`/deliveries/${id}/complete`, {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  },

  updateStatus(id: string, status: string) {
    return request<CourierDeliveryItem>(`/deliveries/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    })
  }
}

export const distributionApi = {
  /** 分账明细；管理端也可走 /admin/distribution-records（同结构） */
  async records(
    params: {
      page?: number
      pageSize?: number
      orderId?: string
      merchantId?: string
      coordinatorId?: string
      sectorLeaderId?: string
      individualLeaderId?: string
      propertyCompanyId?: string
      startDate?: string
      endDate?: string
      sort?: string
    } = {},
    options: { adminPath?: boolean } = {}
  ) {
    const path = options.adminPath ? '/admin/distribution-records' : '/distribution/records'
    const raw = await request<unknown>(`${path}${buildQuery(params)}`)
    const page = normalizePageResult<DistributionRecordItem>(
      raw,
      params.page || 1,
      params.pageSize || 20
    )
    return {
      ...page,
      list: normalizeDistributionRecords(page.list || [])
    }
  },

  async stats(
    params: {
      startDate?: string
      endDate?: string
      /** summary | detail | byProperty | byCoordinator | bySector */
      dimension?: string
      propertyCompanyId?: string
      coordinatorId?: string
    } = {},
    options: { adminPath?: boolean } = {}
  ) {
    const path = options.adminPath ? '/admin/distribution/statistics' : '/distribution/stats'
    return request<DistributionStats>(`${path}${buildQuery(params)}`)
  },

  /**
   * 分账试算，不落库。
   * 已存在订单应只传 orderId，由后端读取不可变快照；管理端假设试算传完整商品/配送参数。
   */
  calculate(params: {
    orderId?: string
    merchantId?: string
    productAmount?: number
    originalDeliveryFee?: number
    deliveryFee?: number
    deliverySubsidySponsor?: string
    pointUsed?: number
    coinUsed?: number
    propertyCompanyId?: string
  }) {
    return request<DistributionCalculateResult>(`/distribution/calculate${buildQuery(params)}`)
  }
}

/** 物业分成账户（settlement）— 管理端路径带 /admin（后端 AdminPropertyCompanyController） */
export const propertySettlementApi = {
  balance(propertyCompanyId: string) {
    return request<PropertySettlementBalance>(
      `/admin/property-companies/${propertyCompanyId}/settlement-balance`
    )
  },

  async withdrawals(
    propertyCompanyId: string,
    params: { page?: number; pageSize?: number; status?: string; settlementChannel?: string } = {}
  ) {
    const raw = await request<unknown>(
      `/admin/property-companies/${propertyCompanyId}/settlement-withdrawals${buildQuery(params)}`
    )
    return normalizePageResult<RoleWithdrawalItem>(raw, params.page || 1, params.pageSize || 20)
  },

  createWithdrawal(propertyCompanyId: string, payload: RoleWithdrawalPayload) {
    return request<RoleWithdrawalItem>(
      `/admin/property-companies/${propertyCompanyId}/settlement-withdrawals`,
      { method: 'POST', body: JSON.stringify(payload) }
    )
  },

  approve(propertyCompanyId: string, withdrawalId: string) {
    return request<RoleWithdrawalItem>(
      `/admin/property-companies/${propertyCompanyId}/settlement-withdrawals/${withdrawalId}/approve`,
      { method: 'POST' }
    )
  },

  reject(propertyCompanyId: string, withdrawalId: string, payload: { remark?: string } = {}) {
    return request<RoleWithdrawalItem>(
      `/admin/property-companies/${propertyCompanyId}/settlement-withdrawals/${withdrawalId}/reject`,
      { method: 'POST', body: JSON.stringify(payload) }
    )
  }
}

export const serviceApi = {
  list(params: {
    page?: number
    pageSize?: number
    category?: string
    /** v4.1：merchant / resident / individual_leader / technician */
    providerType?: string
    mine?: boolean
    sort?: string
  } = {}) {
    return request<PageResult<CommunityServiceItem>>(`/services${buildQuery(params)}`)
  },

  create(payload: CommunityServiceCreatePayload) {
    return request<CommunityServiceItem>('/services', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  },

  get(id: string) {
    return request<CommunityServiceItem>(`/services/${id}`)
  },

  update(id: string, payload: CommunityServiceUpdatePayload) {
    return request<CommunityServiceItem>(`/services/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    })
  },

  remove(id: string) {
    return request<{ id: string; status?: string; deletedAt?: string }>(`/services/${id}`, {
      method: 'DELETE'
    })
  }
}

export const sectorLeaderPortalApi = {
  my() {
    return request<SectorLeaderDetail>('/sector-leaders/my')
  },

  /** §39.7 申请提现 */
  createWithdrawal(id: string, payload: RoleWithdrawalPayload) {
    return request<RoleWithdrawalItem>(`/sector-leaders/${id}/withdrawals`, {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  },

  /** §39.8 提现记录 */
  withdrawals(
    id: string,
    params: {
      page?: number
      pageSize?: number
      auditStatus?: string
      startDate?: string
      endDate?: string
    } = {}
  ) {
    return request<PageResult<RoleWithdrawalItem>>(
      `/sector-leaders/${id}/withdrawals${buildQuery(params)}`
    )
  }
}

export const sectorLeaderAdminApi = {
  list(params: {
    page?: number
    pageSize?: number
    keyword?: string
    status?: string
    sort?: string
  } = {}) {
    return request<PageResult<SectorLeaderDetail>>(`/admin/sector-leaders${buildQuery(params)}`)
  },

  get(id: string) {
    return request<SectorLeaderDetail>(`/admin/sector-leaders/${id}`)
  },

  create(payload: SectorLeaderCreatePayload) {
    return request<SectorLeaderDetail>('/admin/sector-leaders', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  },

  update(id: string, payload: SectorLeaderUpdatePayload) {
    return request<SectorLeaderDetail>(`/admin/sector-leaders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    })
  },

  remove(id: string) {
    return request<SectorLeaderRemoveResult>(`/admin/sector-leaders/${id}`, {
      method: 'DELETE'
    })
  }
}

export const coordinatorPortalApi = {
  my() {
    return request<CoordinatorDetail>('/coordinators/my')
  },

  /** §64.6 申请提现 */
  createWithdrawal(id: string, payload: RoleWithdrawalPayload) {
    return request<RoleWithdrawalItem>(`/coordinators/${id}/withdrawals`, {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  },

  /** §64.7 提现记录 */
  withdrawals(
    id: string,
    params: {
      page?: number
      pageSize?: number
      auditStatus?: string
      startDate?: string
      endDate?: string
    } = {}
  ) {
    return request<PageResult<RoleWithdrawalItem>>(
      `/coordinators/${id}/withdrawals${buildQuery(params)}`
    )
  },

  sectorLeaders: sectorLeaderAdminApi.list.bind(sectorLeaderAdminApi),
  createSectorLeader: sectorLeaderAdminApi.create.bind(sectorLeaderAdminApi),
  updateSectorLeader: sectorLeaderAdminApi.update.bind(sectorLeaderAdminApi),
  removeSectorLeader: sectorLeaderAdminApi.remove.bind(sectorLeaderAdminApi)
}

export const activityGroupApi = {
  list(params: {
    page?: number
    pageSize?: number
    communityId?: string
    mine?: boolean
    activityType?: string
    sort?: string
  } = {}) {
    return request<PageResult<ActivityGroupItem>>(`/activity-groups${buildQuery(params)}`)
  },

  /** 活动组组长：我管理的活动组 */
  myLed(params: { page?: number; pageSize?: number; sort?: string } = {}) {
    return request<PageResult<ActivityGroupItem>>(`/activity-groups/my-led${buildQuery(params)}`)
  },

  get(id: string) {
    return request<ActivityGroupItem>(`/activity-groups/${id}`)
  },

  members(id: string) {
    return request<{ list: ActivityGroupMemberItem[]; total?: number }>(
      `/activity-groups/${id}/members`
    )
  },

  create(payload: ActivityGroupCreatePayload) {
    return request<ActivityGroupItem>('/activity-groups', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  },

  update(id: string, payload: ActivityGroupUpdatePayload) {
    return request<ActivityGroupItem>(`/activity-groups/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    })
  },

  /** §73.1 GET 课时价格列表（响应 list，非 tiers） */
  listPricingTiers(groupId: string) {
    return request<ActivityPricingTiersResult>(`/activity-groups/${groupId}/pricing-tiers`)
  },

  /** §73.2 POST 创建单档 */
  createPricingTier(groupId: string, payload: ActivityPricingTierPayload) {
    return request<ActivityPricingTier>(`/activity-groups/${groupId}/pricing-tiers`, {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  },

  /** §73.3 PUT 更新单档 */
  updatePricingTier(tierId: string, payload: Partial<ActivityPricingTierPayload>) {
    return request<ActivityPricingTier>(`/activity-groups/pricing-tiers/${tierId}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    })
  },

  /** §73.4 DELETE 删除单档 */
  deletePricingTier(tierId: string) {
    return request<void>(`/activity-groups/pricing-tiers/${tierId}`, { method: 'DELETE' })
  },

  /**
   * §73.5 PUT 批量替换课时价格
   * v4.0：请求体为数组，不要包 { tiers: [...] }
   */
  replacePricingTiers(groupId: string, tiers: ActivityPricingTierPayload[]) {
    return request<ActivityPricingTiersResult>(`/activity-groups/${groupId}/pricing-tiers`, {
      method: 'PUT',
      body: JSON.stringify(tiers)
    })
  }
}

/** 管理端 - 商家积分购买审核 */
export const adminMerchantPointPurchaseApi = {
  list(params: {
    page?: number
    pageSize?: number
    merchantId?: string
    auditStatus?: string
    status?: string
    startDate?: string
    endDate?: string
    propertyCompanyId?: string
    sort?: string
  } = {}) {
    return request<PageResult<AdminMerchantPointPurchaseItem>>(
      `/admin/merchant-point-purchases${buildQuery(params)}`
    )
  },
  audit(id: string, payload: AdminPointPurchaseAuditPayload) {
    return request<AdminPointPurchaseAuditResult>(
      `/admin/merchant-point-purchases/${id}/audit`,
      { method: 'POST', body: JSON.stringify(payload) }
    )
  }
}

/** 管理端 - 商家提现审核 */
export const adminMerchantWithdrawalApi = {
  list(params: {
    page?: number
    pageSize?: number
    merchantId?: string
    auditStatus?: string
    status?: string
    startDate?: string
    endDate?: string
    propertyCompanyId?: string
    sort?: string
    /** 仅审历史内部钱包；新单分账完结单不应出现 */
    settlementChannel?: string
  } = {}) {
    return request<PageResult<AdminMerchantWithdrawalItem>>(
      `/admin/merchant-withdrawals${buildQuery(params)}`
    )
  },
  audit(id: string, payload: AdminWithdrawalAuditPayload) {
    return request<AdminWithdrawalAuditResult>(
      `/admin/merchant-withdrawals/${id}/audit`,
      { method: 'POST', body: JSON.stringify(payload) }
    )
  },
  /** §34.5 审批看板汇总 */
  summary(params: { propertyCompanyId?: string; settlementChannel?: string } = {}) {
    return request<MerchantWithdrawalSummary>(
      `/admin/merchant-withdrawals/summary${buildQuery(params)}`
    )
  }
}

/** 管理端 - 配送员/多角色提现审核（v5.5 §70.5–70.7） */
export const adminRoleWithdrawalApi = {
  list(params: {
    page?: number
    pageSize?: number
    withdrawalType?: string
    auditStatus?: string
    keyword?: string
    startDate?: string
    endDate?: string
    propertyCompanyId?: string
    settlementChannel?: string
  } = {}) {
    return request<PageResult<AdminRoleWithdrawalItem>>(
      `/admin/role-withdrawals${buildQuery(params)}`
    )
  },

  summary(params: { propertyCompanyId?: string; settlementChannel?: string } = {}) {
    return request<RoleWithdrawalSummary>(
      `/admin/role-withdrawals/summary${buildQuery(params)}`
    )
  },

  audit(id: string, payload: AdminRoleWithdrawalAuditPayload) {
    return request<AdminRoleWithdrawalAuditResult>(
      `/admin/role-withdrawals/${id}/audit`,
      { method: 'POST', body: JSON.stringify(payload) }
    )
  }
}

export const specialOfferApi = {
  list(params: {
    page?: number
    pageSize?: number
    targetType?: string
    status?: string
  } = {}) {
    return request<PageResult<SpecialOfferItem>>(`/special-offers${buildQuery(params)}`)
  },

  get(id: string) {
    return request<SpecialOfferItem>(`/special-offers/${id}`)
  },

  create(payload: SpecialOfferCreatePayload) {
    return request<SpecialOfferItem>('/special-offers', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  },

  update(id: string, payload: SpecialOfferUpdatePayload) {
    return request<SpecialOfferItem>(`/special-offers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    })
  },

  remove(id: string) {
    return request<{ id: string }>(`/special-offers/${id}`, { method: 'DELETE' })
  }
}

export const directedMessageApi = {
  list(params: {
    page?: number
    pageSize?: number
    startDate?: string
    endDate?: string
    officialSenderType?: string
    propertyCompanyId?: string
  } = {}) {
    return request<PageResult<DirectedMessageTaskItem>>(
      `/admin/directed-messages${buildQuery(params)}`
    )
  },

  get(id: string) {
    return request<DirectedMessageTaskItem>(`/admin/directed-messages/${id}`)
  },

  create(payload: DirectedMessageCreatePayload) {
    return request<DirectedMessageSendResult>('/admin/directed-messages', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  },

  recipients(
    id: string,
    params: {
      page?: number
      pageSize?: number
      readStatus?: string
      buildingNo?: string
      gender?: string
      ageBracketId?: string
    } = {}
  ) {
    return request<PageResult<DirectedMessageRecipientItem>>(
      `/admin/directed-messages/${id}/recipients${buildQuery(params)}`
    )
  },

  ageBrackets() {
    return request<{ list: AgeBracketItem[] } | AgeBracketItem[]>('/admin/age-brackets')
  },

  updateAgeBrackets(brackets: AgeBracketItem[]) {
    return request<{ list: AgeBracketItem[] }>('/admin/age-brackets', {
      method: 'PUT',
      body: JSON.stringify({ brackets })
    })
  }
}

export const communityEntityApi = {
  list(params: { page?: number; pageSize?: number; keyword?: string } = {}) {
    return request<PageResult<CommunityEntityItem>>(
      `/admin/community-entities${buildQuery(params)}`
    )
  },

  create(payload: CommunityEntityCreatePayload) {
    return request<CommunityEntityItem>('/admin/community-entities', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  },

  propertyCompanies(id: string) {
    return request<{ list: CommunityPropertyBindingItem[] } | CommunityPropertyBindingItem[]>(
      `/admin/community-entities/${id}/property-companies`
    )
  },

  bindProperty(id: string, payload: CommunityPropertyBindPayload) {
    return request<CommunityPropertyBindingItem>(
      `/admin/community-entities/${id}/property-companies`,
      { method: 'POST', body: JSON.stringify(payload) }
    )
  },

  unbindProperty(id: string, propertyCompanyId: string) {
    return request<{ success?: boolean }>(
      `/admin/community-entities/${id}/property-companies/${propertyCompanyId}`,
      { method: 'DELETE' }
    )
  },

  updatePermissions(
    id: string,
    propertyCompanyId: string,
    payload: CommunityPropertyPermissionPayload
  ) {
    return request<CommunityPropertyBindingItem>(
      `/admin/community-entities/${id}/property-companies/${propertyCompanyId}/permissions`,
      { method: 'PUT', body: JSON.stringify(payload) }
    )
  }
}

export const propertyOperatorApi = {
  list(params: { page?: number; pageSize?: number; status?: string } = {}) {
    return request<PageResult<PropertyOperatorItem>>(
      `/admin/property-operators${buildQuery(params)}`
    )
  },

  create(payload: PropertyOperatorCreatePayload) {
    return request<PropertyOperatorItem>('/admin/property-operators', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  },

  updateScope(id: string, payload: PropertyOperatorScopePayload) {
    return request<PropertyOperatorItem>(`/admin/property-operators/${id}/scope`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    })
  },

  updateStatus(id: string, status: string) {
    return request<PropertyOperatorItem>(`/admin/property-operators/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    })
  }
}

export const serviceCategoryApi = {
  list() {
    return request<{ list: ServiceCategoryDictItem[] } | ServiceCategoryDictItem[]>(
      '/service-categories'
    )
  }
}

export const consultationAdminApi = {
  list(params: {
    page?: number
    pageSize?: number
    category?: string
    keyword?: string
    status?: string
  } = {}) {
    return request<PageResult<ConsultantItem>>(`/admin/consultants${buildQuery(params)}`)
  },

  create(payload: ConsultantCreatePayload) {
    return request<ConsultantItem>('/admin/consultants', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  },

  update(id: string, payload: ConsultantUpdatePayload) {
    return request<ConsultantItem>(`/admin/consultants/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    })
  },

  audit(id: string, auditResult: string, reason?: string) {
    return request<ConsultantItem>(`/admin/consultants/${id}/audit`, {
      method: 'PUT',
      body: JSON.stringify({ auditResult, reason })
    })
  },

  getSettings() {
    return request<ConsultationSettings>('/admin/consultation-settings')
  },

  updateSettings(payload: ConsultationSettings) {
    return request<ConsultationSettings>('/admin/consultation-settings', {
      method: 'PUT',
      body: JSON.stringify(payload)
    })
  }
}

export const residentMerchantAdminApi = {
  applications(params: {
    page?: number
    pageSize?: number
    status?: string
    keyword?: string
    propertyCompanyId?: string
  } = {}) {
    return request<PageResult<ResidentMerchantApplicationItem>>(
      `/admin/resident-merchant-applications${buildQuery(params)}`
    )
  },

  auditApplication(id: string, auditResult: string, reason?: string) {
    // 兼容新旧后端：旧 DTO 要求 auditStatus，新 DTO 使用 auditResult；备注字段同理
    return request<ResidentMerchantApplicationItem>(
      `/admin/resident-merchant-applications/${id}/audit`,
      {
        method: 'POST',
        body: JSON.stringify({
          auditStatus: auditResult,
          auditResult,
          reason,
          auditRemark: reason
        })
      }
    )
  },

  deposits(params: { page?: number; pageSize?: number; status?: string } = {}) {
    return request<PageResult<ResidentMerchantDepositItem>>(
      `/admin/resident-merchant-deposits${buildQuery(params)}`
    )
  },

  deductDeposit(id: string, amount: number, reason: string) {
    return request<ResidentMerchantDepositItem>(`/admin/resident-merchant-deposits/${id}/deduct`, {
      method: 'POST',
      body: JSON.stringify({ amount, reason })
    })
  },

  settlements(params: {
    page?: number
    pageSize?: number
    startDate?: string
    endDate?: string
  } = {}) {
    return request<PageResult<ResidentMerchantSettlementItem>>(
      `/admin/resident-merchant-settlements${buildQuery(params)}`
    )
  },

  getSettings() {
    return request<ResidentMerchantSettings>('/admin/resident-merchant-settings')
  },

  updateSettings(payload: ResidentMerchantSettings) {
    return request<ResidentMerchantSettings>('/admin/resident-merchant-settings', {
      method: 'PUT',
      body: JSON.stringify(payload)
    })
  },

  createDistributorProduct(payload: DistributorProductCreatePayload) {
    return request<{ id: string }>('/admin/distributor-products', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  }
}

/** 业主商户门户 / 公开橱窗（§60） */
export const residentMerchantApi = {
  /** GET /resident-merchants/my */
  my() {
    return request<ResidentMerchantMyDetail>('/resident-merchants/my')
  },

  /** PUT /resident-merchants/visibility — 仅营业中店主 */
  updateVisibility(visibility: string) {
    return request<ResidentMerchantMyDetail>('/resident-merchants/visibility', {
      method: 'PUT',
      body: JSON.stringify({ visibility })
    })
  },

  /** GET /resident-merchants/public — Auth Optional */
  listPublic(
    params: {
      page?: number
      pageSize?: number
      keyword?: string
      propertyCompanyId?: string
    } = {}
  ) {
    return request<PageResult<ResidentMerchantPublicItem>>(
      `/resident-merchants/public${buildQuery(params)}`,
      {},
      false
    )
  },

  /** GET /resident-merchants/public/{residentId} — Auth Optional */
  getPublic(residentId: string) {
    return request<ResidentMerchantPublicDetail>(
      `/resident-merchants/public/${residentId}`,
      {},
      false
    )
  },

  /** POST /resident-merchants/listings/{id}/share */
  shareListing(id: string) {
    return request<ResidentMerchantShareResult>(`/resident-merchants/listings/${id}/share`, {
      method: 'POST'
    })
  }
}

export const merchantAdAdminApi = {
  packages() {
    return request<{ list: MerchantAdPackageItem[] } | MerchantAdPackageItem[]>(
      '/admin/merchant-ad-packages'
    )
  },

  /** GET /admin/merchant-ad-settings — 单日价 / 免费额度配置 */
  getSettings() {
    return request<MerchantAdSettings>('/admin/merchant-ad-settings')
  },

  /** PUT /admin/merchant-ad-settings */
  updateSettings(payload: MerchantAdSettings) {
    return request<MerchantAdSettings>('/admin/merchant-ad-settings', {
      method: 'PUT',
      body: JSON.stringify(payload)
    })
  },

  /** §59.5 为商家增加本周付费广告额度 */
  addQuota(merchantId: string, purchasedQuota: number) {
    return request<MerchantAdQuota>(`/admin/merchants/${merchantId}/ad-quota`, {
      method: 'POST',
      body: JSON.stringify({ purchasedQuota })
    })
  },

  /** §D6 查询商家当前广告周额度 */
  getQuota(merchantId: string) {
    return request<MerchantAdQuota>(`/admin/merchants/${merchantId}/ad-quota`)
  }
}

/** 原生推送设备绑定（后端按契约实现；未上线时前端容错） */
export const devicePushApi = {
  register(payload: DevicePushTokenPayload) {
    return request<DevicePushTokenResult>('/devices/push-token', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  },

  unregister(params: { token: string; provider?: string }) {
    const provider = params.provider || 'jpush'
    return request<{ ok?: boolean }>(
      `/devices/push-token${buildQuery({ token: params.token, provider })}`,
      { method: 'DELETE' }
    )
  }
}

/** 平台管理员分成 */
export const platformShareApi = {
  getRates(propertyCompanyId?: string) {
    return request<PlatformShareRates>(
      `/admin/platform-share-rates${buildQuery({ propertyCompanyId })}`
    )
  },

  updateRates(payload: UpdatePlatformShareRatesPayload) {
    return request<PlatformShareRates>('/admin/platform-share-rates', {
      method: 'PUT',
      body: JSON.stringify(payload)
    })
  },

  earningsStats(params: {
    propertyCompanyId?: string
    startDate?: string
    endDate?: string
  } = {}) {
    return request<PlatformEarningsStats>(`/admin/platform-earnings/stats${buildQuery(params)}`)
  },

  earningsRecords(params: {
    propertyCompanyId?: string
    type?: string
    page?: number
    pageSize?: number
    startDate?: string
    endDate?: string
  } = {}) {
    return request<PageResult<PlatformEarningRecordItem>>(
      `/admin/platform-earnings/records${buildQuery(params)}`
    )
  },

  /** 平台收益对账快照（只读；微信支付分账无内部提现） */
  earningsBalance(params: { propertyCompanyId?: string } = {}) {
    return request<PlatformEarningsBalance>(
      `/admin/platform-earnings/balance${buildQuery(params)}`
    )
  }
  // 微信支付分账下平台侧无提现：勿再封装 /admin/platform-earnings/withdrawals
}

/** 快递负责人管理 */
export const courierManagerApi = {
  list(params: {
    page?: number
    pageSize?: number
    communityId?: string
    status?: string
    keyword?: string
  } = {}) {
    return request<PageResult<CourierManagerItem>>(`/courier-managers${buildQuery(params)}`)
  },

  get(id: string) {
    return request<CourierManagerItem>(`/courier-managers/${id}`)
  },

  create(payload: CourierManagerCreatePayload) {
    return request<CourierManagerItem>('/courier-managers', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  },

  update(id: string, payload: CourierManagerUpdatePayload) {
    return request<CourierManagerItem>(`/courier-managers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    })
  },

  remove(id: string) {
    return request<{ id: string; status?: string }>(`/courier-managers/${id}`, {
      method: 'DELETE'
    })
  },

  couriers(id: string) {
    return request<{ list: CourierManagerCourierItem[] } | CourierManagerCourierItem[]>(
      `/courier-managers/${id}/couriers`
    )
  },

  addCourier(id: string, residentId: string) {
    return request<CourierManagerCourierItem>(`/courier-managers/${id}/couriers`, {
      method: 'POST',
      body: JSON.stringify({ residentId })
    })
  },

  removeCourier(id: string, courierId: string) {
    return request<{ success?: boolean }>(`/courier-managers/${id}/couriers/${courierId}`, {
      method: 'DELETE'
    })
  },

  /** 钱包：role=courier 即可（负责人汇总 / 普通配送员本人），不强制快递负责人 */
  my() {
    return request<CourierManagerItem>('/courier-managers/my')
  }
}

/** 配送价格区间：列表接口返回 data 为数组，非分页 */
export const deliveryPriceRangeApi = {
  async list(params: {
    propertyCompanyId?: string
    status?: string
    distanceType?: string
    deliveryScope?: string
  } = {}) {
    const data = await request<DeliveryPriceRangeItem[] | PageResult<DeliveryPriceRangeItem>>(
      `/admin/delivery-price-ranges${buildQuery(params)}`
    )
    if (Array.isArray(data)) return data
    if (data && Array.isArray((data as PageResult<DeliveryPriceRangeItem>).list)) {
      return (data as PageResult<DeliveryPriceRangeItem>).list
    }
    return []
  },

  create(payload: DeliveryPriceRangePayload) {
    return request<DeliveryPriceRangeItem>('/admin/delivery-price-ranges', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  },

  update(id: string, payload: DeliveryPriceRangePayload) {
    return request<DeliveryPriceRangeItem>(`/admin/delivery-price-ranges/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    })
  },

  remove(id: string) {
    return request<{ id: string }>(`/admin/delivery-price-ranges/${id}`, { method: 'DELETE' })
  }
}

function isMissingEndpointError(e: unknown) {
  if (!(e instanceof ApiError)) return false
  if (e.code === 404) return true
  const msg = e.message || ''
  return /NoResourceFoundException|NoHandlerFoundException|not found|找不到|ID格式不正确/i.test(msg)
}

function pickApplicationField(source: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = source[key]
    if (value === undefined || value === null || value === '') continue
    return String(value)
  }
  return undefined
}

function pickPrefixedId(source: Record<string, unknown>, prefix: string, keys: string[]) {
  const values = keys
    .map((key) => pickApplicationField(source, [key]))
    .filter((value): value is string => Boolean(value))
  return values.find((value) => value.toLowerCase().startsWith(prefix)) || values[0]
}

function normalizeIndividualLeaderApplication(raw: unknown): IndividualLeaderApplicationItem {
  const source = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  return {
    id: pickPrefixedId(source, 'ila_', ['applicationId', 'application_id', 'id']) || '',
    residentId: pickApplicationField(source, ['residentId', 'resident_id']),
    residentName: pickApplicationField(source, ['residentName', 'resident_name', 'name']),
    residentPhone: pickApplicationField(source, ['residentPhone', 'resident_phone', 'phone']),
    phone: pickApplicationField(source, ['phone', 'residentPhone', 'resident_phone']),
    sector: pickApplicationField(source, ['sector']),
    sectorName: pickApplicationField(source, ['sectorName', 'sector_name']),
    remark: pickApplicationField(source, ['remark', 'intro', 'description']),
    message: pickApplicationField(source, ['message']),
    auditStatus: pickApplicationField(source, ['auditStatus', 'audit_status', 'status']),
    status: pickApplicationField(source, ['auditStatus', 'audit_status', 'status']),
    rejectReason: pickApplicationField(source, ['rejectReason', 'reject_reason', 'reason']),
    propertyCompanyId: pickApplicationField(source, ['propertyCompanyId', 'property_company_id']),
    propertyCompanyName: pickApplicationField(source, ['propertyCompanyName', 'property_company_name']),
    createdAt: pickApplicationField(source, ['createdAt', 'created_at', 'appliedAt', 'applied_at']),
    auditedAt: pickApplicationField(source, ['auditedAt', 'audited_at'])
  }
}

/** 管理端个体负责人（一级代理）§37 */
export const adminIndividualLeaderApi = {
  list(params: {
    page?: number
    pageSize?: number
    keyword?: string
    status?: string
    sort?: string
  } = {}) {
    return request<PageResult<IndividualLeaderItem>>(`/admin/individual-leaders${buildQuery(params)}`)
  },

  create(payload: AdminIndividualLeaderCreatePayload) {
    return request<IndividualLeaderItem>('/admin/individual-leaders', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  },

  update(id: string, payload: { sectorId?: string; description?: string; status?: string }) {
    return request<IndividualLeaderItem>(`/admin/individual-leaders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    })
  },

  /** 撤销：软删除为 inactive；reason 可选，不传不再报 99001 */
  remove(id: string, reason?: string) {
    return request<IndividualLeaderItem>(
      `/admin/individual-leaders/${id}${buildQuery({ reason })}`,
      { method: 'DELETE' }
    )
  },

  async listApplications(params: {
    page?: number
    pageSize?: number
    keyword?: string
    auditStatus?: string
    sector?: string
    propertyCompanyId?: string
  } = {}) {
    const query = buildQuery({
      page: params.page,
      pageSize: params.pageSize,
      keyword: params.keyword,
      auditStatus: params.auditStatus,
      sector: params.sector,
      propertyCompanyId: params.propertyCompanyId
    })
    const paths = [
      `/admin/individual-leaders/applications${query}`,
      `/admin/individual-leader-applications${query}`
    ]
    let lastError: unknown
    for (const path of paths) {
      try {
        const raw = await request<PageResult<IndividualLeaderApplicationItem> | unknown>(path)
        const result = normalizePageResult<IndividualLeaderApplicationItem>(
          raw,
          params.page ?? 1,
          params.pageSize ?? 20
        )
        return {
          ...result,
          list: result.list.map(normalizeIndividualLeaderApplication)
        }
      } catch (e) {
        lastError = e
        if (isMissingEndpointError(e)) continue
        throw e
      }
    }
    throw lastError
  },

  async auditApplication(id: string, payload: IndividualLeaderApplicationAuditPayload) {
    const applicationId = id.trim()
    const body = JSON.stringify({
      auditStatus: payload.auditResult,
      auditResult: payload.auditResult,
      rejectReason: payload.rejectReason,
      remark: payload.remark,
      sectorLeaderId: payload.sectorLeaderId,
      sector: payload.sector,
      name: payload.name,
      commissionRate: payload.commissionRate
    })
    const paths = [
      `/admin/individual-leaders/applications/${applicationId}/audit`,
      `/admin/individual-leader-applications/${applicationId}/audit`
    ]
    let lastError: unknown
    for (const path of paths) {
      try {
        return await request<IndividualLeaderApplicationItem>(path, {
          method: 'POST',
          body
        })
      } catch (e) {
        lastError = e
        if (isMissingEndpointError(e)) continue
        throw e
      }
    }
    throw lastError
  }
}

export const merchantCategoryApi = {
  async list() {
    try {
      const data = await request<{ list?: Array<{ name?: string }> } | Array<{ name?: string }>>(
        '/merchant-categories'
      )
      const rows = Array.isArray(data) ? data : data?.list || []
      return rows.map((item) => item.name).filter((name): name is string => Boolean(name))
    } catch {
      return []
    }
  }
}

/**
 * 价格审批（对接说明书）
 * - 菜单/列表/提交：platform_admin || property_leader
 * - PUT 审批：仅 property_leader（平台调 → 20004）
 * - 平台 POST 必须带 propertyCompanyId；领导勿传
 */
export const priceApprovalApi = {
  list(params: {
    page?: number
    pageSize?: number
    status?: string
    /** 平台管理员可跨物业筛选；不传=全部。领导勿传（后端限本公司） */
    propertyCompanyId?: string
  } = {}) {
    return request<PageResult<PriceApprovalItem>>(`/admin/price-approvals${buildQuery(params)}`)
  },

  create(payload: PriceApprovalCreatePayload) {
    return request<PriceApprovalItem>('/admin/price-approvals', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  },

  /** 仅物业领导；平台管理员勿调 */
  audit(id: string, payload: PriceApprovalAuditPayload) {
    return request<PriceApprovalItem>(`/admin/price-approvals/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    })
  }
}

/** 物业币发放 / 商城规则 */
export const propertyCoinApi = {
  /** POST /property-coins/earn — property_admin / platform_admin */
  earn(payload: PropertyCoinEarnPayload) {
    return request<PropertyCoinEarnResult>('/property-coins/earn', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  }
}

export const propertyCoinMallApi = {
  getRules(propertyCompanyId?: string) {
    return request<PropertyCoinMallRules>(
      `/admin/property-coin/mall-rules${buildQuery({ propertyCompanyId })}`
    )
  },

  updateRules(payload: PropertyCoinMallRules) {
    return request<PropertyCoinMallRules>('/admin/property-coin/mall-rules', {
      method: 'PUT',
      body: JSON.stringify(payload)
    })
  }
}

/** 板块负责人门户 */
export const sectorLeaderPortalApiExt = {
  listIndividualLeaders(
    sectorLeaderId: string,
    params: { page?: number; pageSize?: number } = {}
  ) {
    return request<PageResult<IndividualLeaderItem>>(
      `/sector-leaders/${sectorLeaderId}/individual-leaders${buildQuery(params)}`
    )
  },

  createIndividualLeader(sectorLeaderId: string, payload: IndividualLeaderCreatePayload) {
    return request<IndividualLeaderItem>(
      `/sector-leaders/${sectorLeaderId}/individual-leaders`,
      { method: 'POST', body: JSON.stringify(payload) }
    )
  },

  removeIndividualLeader(sectorLeaderId: string, subId: string) {
    return request<{ id: string; status?: string }>(
      `/sector-leaders/${sectorLeaderId}/individual-leaders/${subId}`,
      { method: 'DELETE' }
    )
  },

  createMerchant(sectorLeaderId: string, payload: SectorLeaderMerchantCreatePayload) {
    return request<MerchantItem>(`/sector-leaders/${sectorLeaderId}/merchants`, {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  },

  auditMerchant(sectorLeaderId: string, payload: SectorLeaderMerchantAuditPayload) {
    return request<MerchantAuditResult>(`/sector-leaders/${sectorLeaderId}/merchant-audit`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    })
  },

  updateIndividualDistribution(
    sectorLeaderId: string,
    subId: string,
    commissionRate: number
  ) {
    return request<IndividualLeaderItem>(
      `/sector-leaders/${sectorLeaderId}/individual-leaders/${subId}/distribution`,
      { method: 'PUT', body: JSON.stringify({ commissionRate }) }
    )
  }
}

/** 个体负责人门户 — 路径统一用 me，勿用 profile.id（res_） */
export const individualLeaderPortalApi = {
  /** 可选：进入工作台拉取本人信息（data.id 为 il_，可缓存展示） */
  my() {
    return request<IndividualLeaderItem>('/individual-leaders/my')
  },

  /** 设置商家分成（走审批，不立刻生效） */
  updateMerchantDistribution(payload: MerchantDistributionPayload) {
    return request<unknown>('/individual-leaders/me/merchant-distribution', {
      method: 'PUT',
      body: JSON.stringify(payload)
    })
  },

  /** 设置满额配送（直接生效） */
  updateDeliveryFee(payload: MerchantDeliveryFeePayload) {
    return request<unknown>('/individual-leaders/me/delivery-fee', {
      method: 'PUT',
      body: JSON.stringify(payload)
    })
  },

  createWithdrawal(payload: RoleWithdrawalPayload) {
    return request<RoleWithdrawalItem>('/individual-leaders/me/withdrawals', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  },

  withdrawals(params: { page?: number; pageSize?: number } = {}) {
    return request<PageResult<RoleWithdrawalItem>>(
      `/individual-leaders/me/withdrawals${buildQuery(params)}`
    )
  }
}

/** 统筹管理扩展 */
export const coordinatorManageApi = {
  createSectorLeader(coordinatorId: string, payload: CoordinatorSectorLeaderCreatePayload) {
    return request<SectorLeaderDetail>(`/coordinators/${coordinatorId}/sector-leaders`, {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  },

  createIndividualLeader(coordinatorId: string, payload: CoordinatorIndividualLeaderCreatePayload) {
    return request<IndividualLeaderItem>(`/coordinators/${coordinatorId}/individual-leaders`, {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  },

  createMerchant(coordinatorId: string, payload: CoordinatorMerchantCreatePayload) {
    return request<MerchantItem>(`/coordinators/${coordinatorId}/merchants`, {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  },

  freezeMerchant(coordinatorId: string, merchantId: string, payload: CoordinatorMerchantFreezePayload) {
    return request<MerchantItem>(
      `/coordinators/${coordinatorId}/merchants/${merchantId}/freeze`,
      { method: 'PUT', body: JSON.stringify(payload) }
    )
  },

  /** 统筹审核商家加入（仅 coordinator；板块负责人调用将 403） */
  auditMerchant(coordinatorId: string, payload: CoordinatorMerchantAuditPayload) {
    return request<MerchantAuditResult>(`/coordinators/${coordinatorId}/merchant-audit`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    })
  }
}

/** 产品/活动公告 */
export const announcementExtApi = {
  createProduct(payload: ProductAnnouncementCreatePayload) {
    return request<AnnouncementItem>('/announcements/product', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  },

  createActivity(payload: ActivityAnnouncementCreatePayload) {
    return request<AnnouncementItem>('/announcements/activity', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  }
}

/** 商家定向广告 */
export const merchantTargetedAdApi = {
  create(payload: MerchantTargetedAdCreatePayload) {
    return request<MerchantAdItem>('/merchant/ads/targeted', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  }
}

/**
 * 分销商品管理端：
 * - GET 列表（property_admin / platform_admin）
 * - POST 新建
 * - PUT 改收费周期（property_admin / platform_admin / merchant）
 * 商品 id 前缀为 dpr_，勿写死前缀判断。
 */
export const distributorProductApi = {
  list(params: {
    page?: number
    pageSize?: number
    keyword?: string
    propertyCompanyId?: string
  } = {}) {
    return request<PageResult<DistributorProductItem>>(
      `/admin/distributor-products${buildQuery(params)}`
    )
  },

  create(payload: DistributorProductCreatePayload) {
    return request<DistributorProductItem>('/admin/distributor-products', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  },

  updateBillingCycle(id: string, payload: DistributorProductBillingCyclePayload) {
    return request<{ id: string; billingCycle?: string }>(
      `/admin/distributor-products/${id}/billing-cycle`,
      { method: 'PUT', body: JSON.stringify(payload) }
    )
  }
}

/** 配送提现：role=courier 即可（负责人汇总 / 普通配送员看本人），不强制快递负责人 */
export const courierWithdrawalApi = {
  create(payload: RoleWithdrawalPayload) {
    return request<RoleWithdrawalItem>('/courier-managers/my/withdrawals', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  },

  list(params: {
    page?: number
    pageSize?: number
    auditStatus?: string
  } = {}) {
    return request<PageResult<RoleWithdrawalItem>>(
      `/courier-managers/my/withdrawals${buildQuery(params)}`
    )
  }
}

/** 技工门户 — 路径约定：/technicians/my* */
export const technicianPortalApi = {
  my() {
    return request<TechnicianDetail>('/technicians/my')
  },

  tasks(
    params: {
      page?: number
      pageSize?: number
      status?: string
      sort?: string
    } = {}
  ) {
    return request<PageResult<TechnicianTaskItem>>(
      `/technicians/my/tasks${buildQuery(params)}`
    )
  },

  updateTaskStatus(id: string, payload: TechnicianTaskStatusPayload) {
    return request<TechnicianTaskItem>(`/technicians/my/tasks/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    })
  }
}

/* ---------- v3.8 管理端扩展 API ---------- */

export const merchantRecommendApi = {
  listOfficial(params: {
    page?: number
    pageSize?: number
    propertyCompanyId?: string
  } = {}) {
    return request<PageResult<MerchantItem>>(`/merchants/official-recommended${buildQuery(params)}`)
  },
  set(id: string, payload: MerchantRecommendPayload) {
    return request<{ id?: string }>(`/admin/merchants/${id}/recommend`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    })
  }
}

export const coinUseConditionApi = {
  get() {
    return request<CoinUseCondition>('/property-coins/use-condition')
  },
  set(propertyCompanyId: string, payload: CoinUseConditionPayload) {
    return request<CoinUseCondition>(
      `/admin/property-companies/${propertyCompanyId}/coin-use-condition`,
      { method: 'PUT', body: JSON.stringify(payload) }
    )
  }
}

export const coinWithdrawalAdminApi = {
  /** §33.1 物业币提现/兑换审核列表 */
  list(params: {
    page?: number
    pageSize?: number
    merchantId?: string
    auditStatus?: string
    status?: string
    startDate?: string
    endDate?: string
    propertyCompanyId?: string
    sort?: string
  } = {}) {
    return request<PageResult<AdminCoinWithdrawalItem>>(
      `/admin/coin-withdrawals${buildQuery(params)}`
    )
  },
  /** 审核：body 用 auditResult（与商家提现/积分购买一致；勿用 auditStatus） */
  audit(id: string, payload: AdminCoinWithdrawalAuditPayload) {
    return request<AdminCoinWithdrawalItem>(`/admin/coin-withdrawals/${id}/audit`, {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  },
  getSettings() {
    return request<CoinWithdrawalSettings>('/admin/coin-withdrawals/settings')
  },
  updateSettings(payload: { autoEnabled?: boolean; periodDays?: number }) {
    return request<CoinWithdrawalSettings>('/admin/coin-withdrawals/settings', {
      method: 'PUT',
      body: JSON.stringify(payload)
    })
  },
  blockResident(id: string, payload: WithdrawalBlockPayload) {
    return request<{ success?: boolean }>(`/admin/coin-withdrawals/residents/${id}/block`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    })
  },
  blockMerchant(id: string, payload: WithdrawalBlockPayload) {
    return request<{ success?: boolean }>(`/admin/coin-withdrawals/merchants/${id}/block`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    })
  },
  /** §33.3 物业币提现审批汇总 */
  summary(params: { propertyCompanyId?: string } = {}) {
    return request<CoinWithdrawalSummary>(
      `/admin/coin-withdrawals/summary${buildQuery(params)}`
    )
  }
}

/** 管理端 — 物业联系方式（全局单条） */
export const propertyContactAdminApi = {
  get() {
    return request<PropertyContactConfig | null>('/admin/property-contact')
  },
  save(payload: PropertyContactPayload) {
    return request<PropertyContactConfig>('/admin/property-contact', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  }
}

/**
 * 社区论坛 — 管理端治理（§C.10–C.14）
 * 居民端发帖/点赞/评论不在本管理端仓库实现
 */
export const communityForumAdminApi = {
  listPosts(params: {
    page?: number
    pageSize?: number
    status?: string
    keyword?: string
  } = {}) {
    return request<PageResult<CommunityPostItem>>(
      `/admin/community/posts${buildQuery(params)}`
    )
  },
  deletePost(id: string) {
    return request<null>(`/admin/community/posts/${id}`, { method: 'DELETE' })
  },
  /** 该帖评论列表：优先管理端路径，未发布时回退居民端 §C.7 */
  async listComments(
    postId: string,
    params: { page?: number; pageSize?: number } = {}
  ) {
    const query = buildQuery(params)
    const page = params.page ?? 1
    const pageSize = params.pageSize ?? 50
    try {
      const raw = await request<unknown>(`/admin/community/posts/${postId}/comments${query}`)
      return normalizePageResult<CommunityCommentItem>(raw, page, pageSize)
    } catch (e) {
      const missing =
        e instanceof ApiError &&
        (e.code === 404 || /NoResourceFoundException|no static resource|Not Found/i.test(e.message || ''))
      if (!missing) throw e
      const raw = await request<unknown>(`/community/posts/${postId}/comments${query}`)
      return normalizePageResult<CommunityCommentItem>(raw, page, pageSize)
    }
  },
  deleteComment(id: string) {
    return request<null>(`/admin/community/comments/${id}`, { method: 'DELETE' })
  },
  listReports(params: {
    page?: number
    pageSize?: number
    status?: string
  } = {}) {
    return request<PageResult<ContentReportItem>>(
      `/admin/community/reports${buildQuery(params)}`
    )
  },
  handleReport(id: string, payload: ContentReportHandlePayload) {
    return request<ContentReportItem>(`/admin/community/reports/${id}/handle`, {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  }
}

export const profileRewardApi = {
  list(params: { scope?: string; scopeId?: string } = {}) {
    return request<{ list: ProfileRewardItem[] } | ProfileRewardItem[]>(
      `/admin/profile-rewards${buildQuery(params)}`
    )
  },
  create(payload: ProfileRewardPayload) {
    return request<ProfileRewardItem>('/admin/profile-rewards', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  },
  update(id: string, payload: Partial<ProfileRewardPayload>) {
    return request<ProfileRewardItem>(`/admin/profile-rewards/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    })
  },
  remove(id: string) {
    return request<{ id?: string }>(`/admin/profile-rewards/${id}`, { method: 'DELETE' })
  }
}

export const companyAccountApi = {
  balance() {
    return request<CompanyAccountBalance>('/admin/company-account/balance')
  },
  records(params: { page?: number; pageSize?: number } = {}) {
    return request<PageResult<CompanyAccountRecord>>(
      `/admin/company-account/records${buildQuery(params)}`
    )
  },
  adjust(payload: { propertyCompanyId: string; amount: number; remark?: string }) {
    return request<CompanyAccountBalance>('/admin/company-account/adjust', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  }
}

export const communityPointApi = {
  get(communityId: string) {
    return request<CommunityPointPool>(`/community-points/${communityId}`)
  },
  records(communityId: string, params: { page?: number; pageSize?: number } = {}) {
    return request<PageResult<CommunityPointRecord>>(
      `/community-points/${communityId}/records${buildQuery(params)}`
    )
  },
  adjust(communityId: string, payload: CommunityPointAdjustPayload) {
    return request<CommunityPointPool>(`/admin/community-points/${communityId}/adjust`, {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  }
}

export const arrearsReportApi = {
  get(params: {
    propertyCompanyId?: string
    communityId?: string
    building?: string
    feeType?: string
  } = {}) {
    return request<ArrearsReport>(`/admin/property-fees/arrears-report${buildQuery(params)}`)
  },

  async exportCsv(params: {
    propertyCompanyId?: string
    communityId?: string
    building?: string
    feeType?: string
  } = {}) {
    const { getAccessToken } = await import('../stores/tokenStore')
    const { API_PATH_PREFIX, API_REMOTE_BASE_URL } = await import('../config/api')
    const { isNativeApp } = await import('../utils/native')
    const base = import.meta.env.DEV && !isNativeApp() ? API_PATH_PREFIX : API_REMOTE_BASE_URL
    const token = getAccessToken()
    const res = await fetch(`${base}/admin/property-fees/arrears-report/export${buildQuery(params)}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
    if (!res.ok) throw new Error('导出失败')
    return res.blob()
  },

  /** POST /admin/property-fees/arrears-reminder/preview — v5.3 催缴快照 */
  previewReminder(payload: ArrearsReminderPreviewPayload) {
    return request<ArrearsReminderPreviewResult>('/admin/property-fees/arrears-reminder/preview', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  },

  /** POST /admin/property-fees/arrears-reminder — v6.5 统一催缴通知 */
  sendReminder(payload: ArrearsReminderPayload) {
    return request<ArrearsReminderResult>('/admin/property-fees/arrears-reminder', {
      method: 'POST',
      body: JSON.stringify({
        propertyCompanyId: payload.propertyCompanyId,
        communityId: payload.communityId,
        building: payload.building,
        feeType: payload.feeType,
        templateCode: payload.templateCode,
        previewToken: payload.previewToken,
        preview_token: payload.previewToken,
        channels: payload.channels,
        requestId: payload.requestId,
        request_id: payload.requestId,
        title: payload.title,
        content: payload.content
      })
    })
  }
}

/** §88 管理端 — 物业住户聊天 */
export const adminMessageApi = {
  conversations(params: { page?: number; pageSize?: number; keyword?: string } = {}) {
    return request<PageResult<AdminConversationItem>>(
      `/admin/messages/conversations${buildQuery(params)}`
    )
  },

  conversationMessages(
    residentId: string,
    params: { page?: number; pageSize?: number } = {}
  ) {
    return request<PageResult<AdminChatMessageItem>>(
      `/admin/messages/conversations/${residentId}${buildQuery(params)}`
    )
  },

  send(residentId: string, payload: { content: string }) {
    return request<AdminChatMessageItem>(`/admin/messages/conversations/${residentId}`, {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  }
}

export const communityRoomApi = {
  structure(communityId: string, params: { building?: string } = {}) {
    return request<RoomStructure>(
      `/communities/${communityId}/room-structure${buildQuery(params)}`
    )
  },
  availableRooms(communityId: string, params: { building?: string; unit?: string } = {}) {
    return request<AvailableRoomsResult>(
      `/communities/${communityId}/available-rooms${buildQuery(params)}`
    )
  },
  async list(communityId: string, params: { building?: string; unit?: string; status?: string } = {}) {
    const data = await request<
      CommunityRoomListResult | CommunityRoomItem[] | { list?: CommunityRoomItem[] }
    >(`/communities/${communityId}/rooms${buildQuery(params)}`)
    if (Array.isArray(data)) {
      return { communityId, total: data.length, rooms: data } as CommunityRoomListResult
    }
    const rooms = data.rooms || data.list || []
    return {
      communityId: data.communityId || communityId,
      total: data.total ?? rooms.length,
      rooms
    }
  },
  create(communityId: string, payload: CommunityRoomCreatePayload) {
    return request<CommunityRoomItem>(`/communities/${communityId}/rooms`, {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  },
  createBatch(communityId: string, payload: CommunityRoomBatchCreatePayload) {
    return request<CommunityRoomListResult | CommunityRoomItem[]>(
      `/communities/${communityId}/rooms/batch`,
      { method: 'POST', body: JSON.stringify(payload) }
    )
  },
  update(communityId: string, roomId: string, payload: CommunityRoomUpdatePayload) {
    return request<CommunityRoomItem>(`/communities/${communityId}/rooms/${roomId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    })
  },
  remove(communityId: string, roomId: string) {
    return request<unknown>(`/communities/${communityId}/rooms/${roomId}`, {
      method: 'DELETE'
    })
  }
}

export const regionalLeaderApi = {
  list(params: { propertyCompanyId?: string; sectorLeaderId?: string; page?: number; pageSize?: number } = {}) {
    return request<PageResult<RegionalLeaderItem> | { list: RegionalLeaderItem[] }>(
      `/regional-leaders${buildQuery(params)}`
    )
  },
  create(payload: RegionalLeaderPayload) {
    return request<RegionalLeaderItem>('/regional-leaders', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  },
  update(id: string, payload: Partial<RegionalLeaderPayload>) {
    return request<RegionalLeaderItem>(`/regional-leaders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    })
  },
  remove(id: string) {
    return request<{ id?: string }>(`/regional-leaders/${id}`, { method: 'DELETE' })
  }
}

export const projectLeaderApi = {
  list(params: { regionalLeaderId?: string; page?: number; pageSize?: number } = {}) {
    return request<PageResult<ProjectLeaderItem> | { list: ProjectLeaderItem[] }>(
      `/project-leaders${buildQuery(params)}`
    )
  },
  create(payload: ProjectLeaderPayload) {
    return request<ProjectLeaderItem>('/project-leaders', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  },
  update(id: string, payload: Partial<ProjectLeaderPayload>) {
    return request<ProjectLeaderItem>(`/project-leaders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    })
  },
  remove(id: string) {
    return request<{ id?: string }>(`/project-leaders/${id}`, { method: 'DELETE' })
  }
}

/** §77 商家关键词 */
export const merchantKeywordApi = {
  my() {
    return request<MerchantKeywordsResult>('/merchants/my/keywords')
  },
  add(payload: MerchantKeywordCreatePayload) {
    return request<MerchantKeywordItem>('/merchants/my/keywords', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  },
  addBatch(payload: MerchantKeywordBatchPayload) {
    return request<MerchantKeywordsResult>('/merchants/my/keywords/batch', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  },
  updateWeight(id: string, payload: MerchantKeywordUpdatePayload) {
    return request<MerchantKeywordItem>(`/merchants/keywords/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    })
  },
  remove(id: string) {
    return request<{ id?: string }>(`/merchants/keywords/${id}`, { method: 'DELETE' })
  }
}

/** §87 商家动态 */
export const merchantPostApi = {
  my(params: { page?: number; pageSize?: number } = {}) {
    return request<PageResult<MerchantPostItem>>(`/merchant-posts/my${buildQuery(params)}`)
  },
  get(id: string) {
    return request<MerchantPostItem>(`/merchant-posts/${id}`)
  },
  create(payload: MerchantPostPayload) {
    return request<MerchantPostItem>('/merchant-posts', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  },
  update(id: string, payload: Partial<MerchantPostPayload>) {
    return request<MerchantPostItem>(`/merchant-posts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    })
  },
  remove(id: string) {
    return request<{ id?: string }>(`/merchant-posts/${id}`, { method: 'DELETE' })
  }
}

/** 管理端社区食堂：创建食堂商家 / 主商家标记 / 绑定 / 手续费 / 三类流水（API §73） */
export const adminCanteenApi = {
  createMerchant(payload: CanteenMerchantCreatePayload) {
    return request<MerchantItem>('/admin/canteen/merchants', {
      method: 'POST',
      body: JSON.stringify(payload)
    }).then((item) => normalizeMerchantItem(item))
  },

  setMainMerchant(merchantId: string, main: boolean) {
    return request<null>(`/admin/canteen/merchants/${merchantId}/main${buildQuery({ main })}`, {
      method: 'PUT'
    })
  },

  adjustQuota(merchantId: string, payload: CanteenQuotaAdjustPayload) {
    return request<CanteenQuotaAdjustResult>(
      `/admin/canteen/merchants/${merchantId}/quota-adjust`,
      { method: 'POST', body: JSON.stringify(payload) }
    ).then((raw) => {
      const row = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
      const remaining = row.remainingQuota ?? row.remaining_quota
      const amount = row.amount
      return {
        merchantId: String(row.merchantId ?? row.merchant_id ?? merchantId),
        amount: amount as number | string | undefined,
        remainingQuota: remaining as number | string | undefined
      }
    })
  },

  createBinding(payload: CanteenBindingCreatePayload) {
    return request<CanteenBindingItem>('/admin/canteen/bindings', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  },

  deleteBinding(id: string) {
    return request<null>(`/admin/canteen/bindings/${id}`, { method: 'DELETE' })
  },

  updateBindingRate(id: string, supplyDiscountRate: number) {
    return request<CanteenBindingItem>(`/admin/canteen/bindings/${id}/rate`, {
      method: 'PUT',
      body: JSON.stringify({ supplyDiscountRate })
    })
  },

  listBindings(params: {
    page?: number
    pageSize?: number
    mainMerchantId?: string
    subMerchantId?: string
  } = {}) {
    return request<PageResult<CanteenBindingItem>>(
      `/admin/canteen/bindings${buildQuery(params)}`
    ).then((raw) => normalizePageResult<CanteenBindingItem>(raw, params.page, params.pageSize))
  },

  getSettings() {
    return request<CanteenSettings>('/admin/canteen/settings')
  },

  updateSettings(payload: CanteenSettings) {
    return request<CanteenSettings>('/admin/canteen/settings', {
      method: 'PUT',
      body: JSON.stringify(payload)
    })
  },

  listQuotaPurchases(params: {
    page?: number
    pageSize?: number
    merchantId?: string
    status?: string
    startDate?: string
    endDate?: string
  } = {}) {
    return request<PageResult<CanteenQuotaPurchaseItem>>(
      `/admin/canteen/quota-purchases${buildQuery(params)}`
    ).then((raw) => normalizePageResult<CanteenQuotaPurchaseItem>(raw, params.page, params.pageSize))
  },

  listRecharges(params: {
    page?: number
    pageSize?: number
    mainMerchantId?: string
    residentId?: string
    startDate?: string
    endDate?: string
  } = {}) {
    return request<PageResult<CanteenAdminRechargeItem>>(
      `/admin/canteen/recharges${buildQuery(params)}`
    ).then((raw) => normalizePageResult<CanteenAdminRechargeItem>(raw, params.page, params.pageSize))
  },

  listFlows(params: {
    page?: number
    pageSize?: number
    mainMerchantId?: string
    merchantId?: string
    residentId?: string
    flowType?: string
    startDate?: string
    endDate?: string
  } = {}) {
    return request<PageResult<CanteenDirectedFlowItem>>(
      `/admin/canteen/flows${buildQuery(params)}`
    ).then((raw) => normalizePageResult<CanteenDirectedFlowItem>(raw, params.page, params.pageSize))
  },

  async exportCsv(params: {
    type: string
    merchantId?: string
    startDate?: string
    endDate?: string
  }) {
    const { getAccessToken } = await import('../stores/tokenStore')
    const { API_PATH_PREFIX, API_REMOTE_BASE_URL } = await import('../config/api')
    const { isNativeApp } = await import('../utils/native')
    const base = import.meta.env.DEV && !isNativeApp() ? API_PATH_PREFIX : API_REMOTE_BASE_URL
    const token = getAccessToken()
    const res = await fetch(`${base}/admin/canteen/export${buildQuery(params)}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
    if (!res.ok) throw new Error('导出失败')
    return res.blob()
  }
}

/** 管理端微信收付通分账：收款账户 CRUD + 对账台（路径仍为 /admin/cbk） */
export const adminCbkApi = {
  listAccounts(params: {
    ownerType?: string
    ownerId?: string
    verified?: boolean
  } = {}) {
    return request<unknown>(`/admin/cbk/accounts${buildQuery(params)}`).then((raw) => {
      const page = normalizePageResult<unknown>(raw)
      return page.list.map(normalizeCbkAccount)
    })
  },

  getAccount(id: string) {
    return request<CbkAccountItem>(`/admin/cbk/accounts/${id}`).then(normalizeCbkAccount)
  },

  upsertAccount(payload: CbkAccountUpsertPayload) {
    return request<CbkAccountItem>('/admin/cbk/accounts', {
      method: 'POST',
      body: JSON.stringify(payload)
    }).then(normalizeCbkAccount)
  },

  updateAccount(id: string, payload: CbkAccountUpsertPayload) {
    return request<CbkAccountItem>(`/admin/cbk/accounts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    }).then(normalizeCbkAccount)
  },

  deleteAccount(id: string) {
    return request<void>(`/admin/cbk/accounts/${id}`, { method: 'DELETE' })
  },

  batchUpsertAccounts(payload: CbkAccountUpsertPayload[]) {
    return request<unknown>('/admin/cbk/accounts/batch', {
      method: 'POST',
      body: JSON.stringify(payload)
    }).then((raw) => {
      const page = normalizePageResult<unknown>(raw)
      if (page.list.length) return page.list.map(normalizeCbkAccount)
      if (Array.isArray(raw)) return raw.map(normalizeCbkAccount)
      return []
    })
  },

  verifyAccount(id: string, verified: boolean) {
    return request<CbkAccountItem>(
      `/admin/cbk/accounts/${id}/verify${buildQuery({ verified })}`,
      { method: 'POST' }
    ).then(normalizeCbkAccount)
  },

  listFailed(params: { statuses?: string; limit?: number } = {}) {
    return request<unknown>(`/admin/cbk/reconcile/failed${buildQuery(params)}`).then((raw) => {
      const page = normalizePageResult<unknown>(raw)
      return page.list.map(normalizeCbkReconcileItem)
    })
  },

  retrySplit(splitNo: string) {
    return request<boolean>(`/admin/cbk/reconcile/retry/${encodeURIComponent(splitNo)}`, {
      method: 'POST'
    })
  }
}

/** 文件模块：上传后返回 url，业务字段仍存 URL 字符串 */
export const fileApi = {
  upload(file: File, category: string) {
    const body = new FormData()
    body.append('file', file)
    // 与 API 文档 / C 端一致：category 走 multipart 字段，而非仅 query
    body.append('category', category)
    return request<import('./types').UploadFileResponse>('/files/upload', {
      method: 'POST',
      body
    })
  },
  uploadBatch(files: File[], category: string) {
    const body = new FormData()
    files.forEach((f) => body.append('files', f))
    body.append('category', category)
    return request<import('./types').BatchUploadFileItemResponse[]>('/files/upload-batch', {
      method: 'POST',
      body
    })
  },
  get(id: string) {
    return request<import('./types').FileDetailResponse>(`/files/${id}`)
  },
  remove(id: string) {
    return request<import('./types').DeleteFileResponse>(`/files/${id}`, { method: 'DELETE' })
  }
}

