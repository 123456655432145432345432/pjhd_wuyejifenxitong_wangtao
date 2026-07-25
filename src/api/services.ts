import { buildQuery, request } from './request'
import { MERCHANT_AUDIT_STATUS } from '../constants/enums'
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
  MerchantItem,
  MerchantKickPayload,
  MerchantKickResult,
  MerchantMessageServicePayload,
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
  OrderItem,
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
  PropertyOperatorCreatePayload,
  PropertyOperatorItem,
  PropertyOperatorScopePayload,
  ResidentItem,
  ResidentCreatePayload,
  ResidentUpdatePayload,
  ResidentStatusPayload,
  ResidentMerchantApplicationItem,
  ResidentMerchantDepositItem,
  ResidentMerchantSettlementItem,
  ResidentMerchantSettings,
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
  DistributionRecordItem,
  DistributionStats,
  MerchantPointGrantPayload,
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
  PlatformShareRates,
  UpdatePlatformShareRatesPayload,
  PlatformEarningsStats,
  PlatformEarningRecordItem,
  CourierManagerItem,
  CourierManagerCreatePayload,
  CourierManagerUpdatePayload,
  CourierManagerCourierItem,
  DeliveryPriceRangeItem,
  DeliveryPriceRangePayload,
  PriceApprovalItem,
  PriceApprovalCreatePayload,
  PriceApprovalAuditPayload,
  PropertyCoinMallRules,
  RoleWithdrawalItem,
  RoleWithdrawalPayload,
  IndividualLeaderItem,
  IndividualLeaderCreatePayload,
  AdminIndividualLeaderCreatePayload,
  SectorLeaderMerchantAuditPayload,
  SectorLeaderMerchantCreatePayload,
  MerchantDistributionPayload,
  MerchantDeliveryFeePayload,
  CoordinatorSectorLeaderCreatePayload,
  CoordinatorIndividualLeaderCreatePayload,
  CoordinatorMerchantCreatePayload,
  CoordinatorMerchantFreezePayload,
  ProductAnnouncementCreatePayload,
  ActivityAnnouncementCreatePayload,
  MerchantTargetedAdCreatePayload,
  DistributorProductBillingCyclePayload,
  DistributorProductItem
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

  profile() {

    return request<UserProfile>('/auth/profile')

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
    status?: string
    role?: string
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



export const merchantApi = {

  list(params: {
    page?: number
    pageSize?: number
    keyword?: string
    category?: string
    merchantLevel?: string
    auditStatus?: string
    propertyCompanyId?: string
    sort?: string
  } = {}) {

    return request<PageResult<MerchantItem>>(`/merchants${buildQuery(params)}`)

  },

  get(id: string, propertyCompanyId?: string) {
    return request<MerchantItem>(`/merchants/${id}${buildQuery({ propertyCompanyId })}`)
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

  listPending(params: Record<string, string | number | undefined> = {}) {

    return request<PageResult<MerchantItem>>(
      `/merchants${buildQuery({ auditStatus: MERCHANT_AUDIT_STATUS.PENDING, ...params })}`
    )

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

  profitSpace(
    platformMerchantId: string,
    params: { consumptionAmount: number }
  ) {
    return request<MerchantProfitSpace>(
      `/admin/platform-merchants/${platformMerchantId}/profit-space${buildQuery({
        consumptionAmount: params.consumptionAmount
      })}`
    )
  }

}



export const pointApi = {

  pool() {

    return request<PointPool>('/admin/point-pools')

  },

  records(params: Record<string, string | number | undefined> = {}) {

    return request<PageResult<unknown>>(`/admin/point-pools/records${buildQuery(params)}`)

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

  communities(id: string) {
    return request<PageResult<PropertyCompanyCommunity>>(`/property-companies/${id}/communities`)
  }

}



export const configApi = {

  propertyCompany(id: string) {

    return request<PropertyCompanyDetail>(`/admin/property-companies/${id}`)

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

  updateOrderStatus(id: string, orderStatus: string) {
    return request<OrderItem>(`/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ orderStatus })
    })
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
  records(params: {
    page?: number
    pageSize?: number
    orderId?: string
    merchantId?: string
    coordinatorId?: string
    sectorLeaderId?: string
    individualLeaderId?: string
    startDate?: string
    endDate?: string
    sort?: string
  } = {}) {
    return request<PageResult<DistributionRecordItem>>(`/distribution/records${buildQuery(params)}`)
  },

  stats(params: {
    startDate?: string
    endDate?: string
    dimension?: string
    propertyCompanyId?: string
  } = {}) {
    return request<DistributionStats>(`/distribution/stats${buildQuery(params)}`)
  }
}

export const serviceApi = {
  list(params: {
    page?: number
    pageSize?: number
    category?: string
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
    sort?: string
  } = {}) {
    return request<PageResult<ActivityGroupItem>>(`/activity-groups${buildQuery(params)}`)
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

export const merchantAdAdminApi = {
  packages() {
    return request<{ list: MerchantAdPackageItem[] } | MerchantAdPackageItem[]>(
      '/admin/merchant-ad-packages'
    )
  },

  /** §59.5 为商家增加本周付费广告额度 */
  addQuota(merchantId: string, purchasedQuota: number) {
    return request<MerchantAdQuota>(`/admin/merchants/${merchantId}/ad-quota`, {
      method: 'POST',
      body: JSON.stringify({ purchasedQuota })
    })
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
  }
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

  my() {
    return request<CourierManagerItem>('/courier-managers/my')
  }
}

/** 配送价格区间：列表接口返回 data 为数组，非分页 */
export const deliveryPriceRangeApi = {
  async list(params: { propertyCompanyId?: string; status?: string } = {}) {
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

/** 管理端个体负责人 */
export const adminIndividualLeaderApi = {
  create(payload: AdminIndividualLeaderCreatePayload) {
    return request<IndividualLeaderItem>('/admin/individual-leaders', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  }
}

/** 价格审批 */
export const priceApprovalApi = {
  list(params: { page?: number; pageSize?: number; status?: string } = {}) {
    return request<PageResult<PriceApprovalItem>>(`/admin/price-approvals${buildQuery(params)}`)
  },

  create(payload: PriceApprovalCreatePayload) {
    return request<PriceApprovalItem>('/admin/price-approvals', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  },

  audit(id: string, payload: PriceApprovalAuditPayload) {
    return request<PriceApprovalItem>(`/admin/price-approvals/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    })
  }
}

/** 物业币商城规则 */
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

/** 快递员提现（快递负责人 my） */
export const courierWithdrawalApi = {
  create(payload: RoleWithdrawalPayload) {
    return request<RoleWithdrawalItem>('/courier-managers/my/withdrawals', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  },

  list(params: { page?: number; pageSize?: number } = {}) {
    return request<PageResult<RoleWithdrawalItem>>(
      `/courier-managers/my/withdrawals${buildQuery(params)}`
    )
  }
}

