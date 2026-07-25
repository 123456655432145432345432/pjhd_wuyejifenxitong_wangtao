import type {
  AnnouncementItem,
  DashboardOverview,
  DeliveryCourierItem,
  DeliveryHourlyData,
  DeliveryTodayStats,
  MerchantItem,
  MerchantProfitSpace,
  OperationLogItem,
  PermissionItemDto,
  PermissionChangeLog,
  PlatformMerchantItem,
  PointPool,
  PropertyCompanyConfig,
  PropertyCompanyDetail,
  RecentDeliveryItem,
  ReportsOverview,
  ResidentItem,
  RolePresetDto
} from './types'
import { getEnumLabel, ANNOUNCEMENT_STATUS, ANNOUNCEMENT_STATUS_LABEL, ANNOUNCEMENT_TYPE_LABEL, COURIER_STATUS, COURIER_STATUS_LABEL, DELIVERY_STATUS, DELIVERY_STATUS_LABEL, MERCHANT_AUDIT_STATUS_LABEL, MERCHANT_LEVEL_LABEL, MERCHANT_STATUS_LABEL, PERMISSION_MODULE_LABEL, RESIDENT_STATUS, RESIDENT_STATUS_LABEL, RESIDENT_USER_TYPE, ROLE_LABEL, normalizeAnnouncementType, formatAnnouncementTargetRoles } from '../constants/enums'

const avatarColors = ['#5c5c9e', '#3aaf7d', '#f5a623', '#e05c5c', '#6a6aae']

export function initials(name?: string | null) {
  return (name ?? '').trim().slice(0, 1) || '?'
}

export function avatarColor(seed?: string | null) {
  const text = seed ?? ''
  if (!text) return avatarColors[0]
  let hash = 0
  for (let i = 0; i < text.length; i++) hash += text.charCodeAt(i)
  return avatarColors[Math.abs(hash) % avatarColors.length]
}

export function formatMoney(value?: number) {
  if (value === undefined || value === null || Number.isNaN(value)) return '0'
  return value.toLocaleString('zh-CN', { maximumFractionDigits: 2 })
}

export function formatPercent(rate?: number) {
  if (rate === undefined || rate === null) return 0
  return rate <= 1 ? Math.round(rate * 100) : Math.round(rate)
}

const PROPERTY_COMPANY_CONFIG_KEYS: (keyof PropertyCompanyConfig)[] = [
  'propertyShareRate',
  'coordinatorShareRate',
  'sectorLeaderRate',
  'individualLeaderRate',
  'coinDisplayEnabled',
  'coinIssueMode',
  'coinExpiryDays',
  'coinFreezeDefault',
  'deliveryBaseFee',
  'deliveryCourierShareRate',
  'deliveryCourierPerOrder',
  'withdrawalFeeRate',
  'pointToFeeRate',
  'twoYearClearEnabled',
  'neighborDailyContactLimit',
  'pointExchangeRate',
  'deliveryPerKgFee',
  'perKgFee'
]

/** 兼容 config 嵌套与根级平铺两种响应结构 */
export function extractPropertyCompanyConfig(
  source?: Partial<PropertyCompanyDetail & PropertyCompanyConfig> | null
): PropertyCompanyConfig {
  if (!source) return {}
  const config: PropertyCompanyConfig = { ...(source.config || {}) }
  for (const key of PROPERTY_COMPANY_CONFIG_KEYS) {
    const value = source[key]
    if (value !== undefined && value !== null) {
      config[key] = value as never
    }
  }
  return config
}

export function normalizePropertyCompanyDetail(
  raw: Partial<PropertyCompanyDetail & PropertyCompanyConfig>,
  fallbackId = ''
): PropertyCompanyDetail {
  return {
    id: raw.id || fallbackId,
    name: raw.name,
    logoUrl: raw.logoUrl,
    contactPhone: raw.contactPhone,
    address: raw.address,
    status: raw.status,
    communityCount: raw.communityCount,
    communities: raw.communities,
    admins: raw.admins,
    config: extractPropertyCompanyConfig(raw)
  }
}

/** 表单展示用：保留小数精度，避免 0.006 被四舍五入成 1% */
export function rateToFormPercent(rate?: number) {
  if (rate === undefined || rate === null || Number.isNaN(rate)) return 0
  const pct = rate <= 1 ? rate * 100 : rate
  return Math.round(pct * 1000) / 1000
}

function resolveDashboardMetrics(overview: DashboardOverview) {
  const summary = overview.summary || {}
  return {
    totalRevenue: summary.totalRevenue ?? overview.monthlyConsumption,
    totalResidents: summary.totalResidents ?? overview.totalResidents,
    totalFamilies: summary.totalFamilies ?? overview.totalFamilies,
    totalOrders: summary.totalOrders,
    totalMerchants: summary.totalMerchants ?? overview.totalMerchants,
    coinInCirculation: summary.coinInCirculation,
    coinConsumed: summary.coinConsumed,
    totalCoinIssued: summary.totalCoinIssued ?? overview.coinTotalIssued
  }
}

function formatTrendBadge(rate?: number) {
  if (rate === undefined || rate === null) return undefined
  const prefix = rate >= 0 ? '↑' : '↓'
  return `${prefix} ${formatPercent(Math.abs(rate))}%`
}

function formatActivityTime(time?: string) {
  if (!time) return '-'
  return time.replace('T', ' ').slice(0, 16)
}

export function mapDashboardStats(overview: DashboardOverview) {
  const metrics = resolveDashboardMetrics(overview)
  const trends = overview.trends || {}
  const residentGrowth = trends.newResidentGrowthRate ?? trends.residentGrowthRate

  return [
    {
      code: 'revenue',
      title: '总收入',
      value: `¥${formatMoney(metrics.totalRevenue)}`,
      icon: 'money',
      badge: formatTrendBadge(trends.revenueGrowthRate),
      variant: 'default' as const
    },
    {
      code: 'residents',
      title: '总居民',
      value: `${metrics.totalResidents ?? 0} 人`,
      icon: 'resident',
      badge: formatTrendBadge(residentGrowth),
      variant: 'default' as const
    },
    {
      code: 'families',
      title: '总家庭',
      value: `${metrics.totalFamilies ?? 0} 户`,
      icon: 'resident',
      variant: 'purple' as const
    },
    {
      code: 'coinCirculation',
      title: '物业币流通中',
      value: `¥${formatMoney(metrics.coinInCirculation)}`,
      icon: 'coin',
      variant: 'green' as const
    },
    {
      code: 'orders',
      title: '总订单',
      value: `${metrics.totalOrders ?? 0} 单`,
      icon: 'chart',
      badge: formatTrendBadge(trends.orderGrowthRate),
      variant: 'default' as const
    },
    {
      code: 'merchants',
      title: '总商家',
      value: `${metrics.totalMerchants ?? 0} 家`,
      icon: 'merchant',
      badge: formatTrendBadge(trends.merchantGrowthRate),
      variant: 'default' as const
    }
  ]
}

export function mapTopMerchants(overview: DashboardOverview) {
  return (overview.topMerchants || []).map((item, index) => ({
    id: item.id || item.merchantId || `merchant-${index}`,
    name: item.name || item.merchantName || '—',
    orderCount: item.orderCount ?? 0,
    revenue: `¥${formatMoney(item.revenue)}`
  }))
}

export function mapPeriodDescription(overview: DashboardOverview) {
  if (overview.startDate && overview.endDate) {
    return `${overview.startDate} 至 ${overview.endDate} 运营数据`
  }
  if (overview.period === 'month') return '本月运营数据及最近动态'
  return '今日运营数据及最近动态'
}

export function mapRecentActivity(overview: DashboardOverview) {
  return (overview.recentActivity || []).map((item, index) => ({
    id: `${item.type || 'activity'}-${item.time || item.timestamp || index}`,
    type: item.type || '-',
    description: item.description || '-',
    timestamp: formatActivityTime(item.time || item.timestamp)
  }))
}

export function mapPendingAuditCount(overview: DashboardOverview) {
  return overview.pendingAuditCount ?? 0
}

export function mapConsumptionData(overview: DashboardOverview) {
  const list = overview.topMerchants || []
  if (!list.length) return [{ name: '暂无', value: 0 }]
  const max = Math.max(...list.map(item => item.revenue || item.orderCount || 0), 1)
  return list.slice(0, 5).map(item => ({
    name: item.name || item.merchantName || '商家',
    value: Math.round(((item.revenue || item.orderCount || 0) / max) * 100)
  }))
}

export function mapOperationLogs(logs: OperationLogItem[]) {
  return logs.map(log => ({
    id: log.id || '',
    time: log.createdAt || log.time || '-',
    operator: log.operatorName || log.operator || '-',
    content: log.content || log.description || log.action || '-',
    result: normalizeOperationResult(log)
  }))
}

function normalizeOperationResult(log: OperationLogItem): '成功' | '失败' {
  if (log.success === false) return '失败'
  if (log.success === true) return '成功'
  const raw = String(log.result ?? log.status ?? '').toLowerCase()
  if (['failed', 'fail', 'error', 'failure', 'false', '0'].includes(raw)) return '失败'
  if (/失败|错误|fail|error/.test(raw)) return '失败'
  return '成功'
}

export function resolveResidentDisplayName(item: ResidentItem) {
  return item.name || item.phone || '未知'
}

function resolveResidentName(item: ResidentItem) {
  return resolveResidentDisplayName(item)
}

export function mapResidents(list: ResidentItem[]) {
  return list.map(item => {
    const name = resolveResidentName(item)
    return {
      id: item.id,
      name,
      phone: item.phone || '-',
      initials: initials(name),
      avatarColor: avatarColor(item.id || name),
      building: [item.building, item.unit, item.room].filter(Boolean).join('') || '-',
      identity: item.userType === RESIDENT_USER_TYPE.OWNER ? 'owner' as const : 'tenant' as const,
      status: item.status || RESIDENT_STATUS.ACTIVE,
      statusLabel: getEnumLabel(RESIDENT_STATUS_LABEL, item.status),
      familyCount: item.familyId ? '—' : '—',
      registerTime: item.createdAt || '-'
    }
  })
}

export function resolvePlatformMerchantId(item: MerchantItem): string | null {
  if (item.platformMerchantId) return item.platformMerchantId
  if (item.id.startsWith('pm_') || item.id.startsWith('mch_')) return item.id
  return null
}

export function mapMerchants(list: MerchantItem[]) {
  return list.map(item => ({
    id: item.id,
    platformMerchantId: resolvePlatformMerchantId(item),
    name: item.name,
    category: item.category || '-',
    categoryCode: item.category?.includes('餐') ? 'dining' as const : 'retail' as const,
    merchantLevel: getEnumLabel(MERCHANT_LEVEL_LABEL, item.merchantLevel),
    auditStatus: getEnumLabel(MERCHANT_AUDIT_STATUS_LABEL, item.auditStatus),
    status: item.status,
    statusLabel: getEnumLabel(MERCHANT_STATUS_LABEL, item.status, '—'),
    commissionRate: item.commissionRate !== undefined ? `${formatPercent(item.commissionRate)}%` : '-',
    pointsRatio: item.pointExchangeRate !== undefined ? `${item.pointExchangeRate} / ¥1` : '-',
    cashbackRate: item.coinRebateRate !== undefined ? `${formatPercent(item.coinRebateRate)}%` : '0%',
    ownerPrice: item.memberDiscountPrice ? `${item.memberDiscountPrice}元` : '-'
  }))
}

export function mapPlatformMerchants(list: PlatformMerchantItem[]) {
  return list.map(item => ({
    id: item.id,
    name: item.name,
    category: item.category || '—',
    categoryCode: item.category?.includes('餐') ? 'dining' as const : 'retail' as const,
    contactPhone: item.contactPhone || '—',
    status: item.status,
    statusLabel: getEnumLabel(MERCHANT_STATUS_LABEL, item.status, '—'),
    linkedPropertyCount: item.linkedPropertyCount ?? 0,
    createdAt: item.createdAt || '—'
  }))
}

export function mapProfitSpaceDisplay(data: MerchantProfitSpace | null) {
  const metrics = data?.metrics || {}
  const breakdown = data?.breakdown || {}
  const revenue = metrics.totalRevenue ?? 0
  const commission = metrics.totalCommission ?? 0
  const deliveryFee = metrics.totalDeliveryFee ?? 0
  const pointCost = metrics.totalPointCost ?? 0
  const coinCost = metrics.totalCoinCost ?? 0
  const exchangeCost = pointCost + coinCost
  const netProfit = metrics.netProfit ?? Math.max(revenue - commission - deliveryFee - pointCost - coinCost, 0)
  const profitMargin = metrics.profitMargin ?? (revenue > 0 ? netProfit / revenue : 0)

  const propertyShare = breakdown.propertyShare ?? 0    // 已为百分比（如 2.945）
  const coordinatorShare = breakdown.coordinatorShare ?? 0
  const sectorLeaderShare = breakdown.sectorLeaderShare ?? 0
  const individualLeaderShare = breakdown.individualLeaderShare ?? 0
  const platformShare = breakdown.platformShare ?? 0

  const pctOfRevenue = (value: number) => (revenue > 0 ? formatPercent(value / revenue) : 0)
  const sharePercent = (pct: number) => `${pct}%`
  const shareAmount = (pct: number) => `¥${formatMoney((netProfit * pct) / 100)}`

  const periodLabels: Record<string, string> = {
    week: '本周',
    month: '本月',
    quarter: '本季度',
    year: '本年'
  }
  const periodPrefix = data?.period ? periodLabels[data.period] || '' : ''
  const dateRange = data?.startDate && data?.endDate ? `${data.startDate} ~ ${data.endDate}` : ''
  const periodLabel = [periodPrefix, dateRange].filter(Boolean).join(' · ')

  const mapShare = (label: string, pct: number) => ({
    label,
    percent: sharePercent(pct),       // API 已返回百分比，直接展示
    amount: shareAmount(pct)          // 根据百分比反算实际金额
  })

  return {
    merchantName: data?.merchantName || data?.platformMerchantName || '—',
    propertyName: data?.propertyName || '',
    periodLabel,
    totalOrders: metrics.totalOrders ?? 0,
    totalCommission: metrics.totalCommission,
    commission: `¥${formatMoney(commission)}`,
    commissionRate: `¥${formatMoney(commission)}`,
    commissionPct: pctOfRevenue(commission),
    revenue: `¥${formatMoney(revenue)}`,
    deliveryFee: `${pctOfRevenue(deliveryFee)}%`,
    deliveryFeeAmount: `¥${formatMoney(deliveryFee)}`,
    exchangeCost: `${pctOfRevenue(exchangeCost)}%`,
    exchangeCostDetail: `积分 ¥${formatMoney(pointCost)} + 物业币 ¥${formatMoney(coinCost)}`,
    profitSpace: `${formatPercent(profitMargin)}%`,
    profitSpaceAmount: `¥${formatMoney(netProfit)}`,
    propertyShare: sharePercent(propertyShare),
    propertyShareAmount: shareAmount(propertyShare),
    coordinatorShare: sharePercent(coordinatorShare),
    coordinatorShareAmount: shareAmount(coordinatorShare),
    shareBreakdown: [
      mapShare('物业收益', propertyShare),
      mapShare('统筹收益', coordinatorShare),
      mapShare('片区负责人', sectorLeaderShare),
      mapShare('个人负责人', individualLeaderShare),
      mapShare('平台收益', platformShare)
    ],
    revenueGrowth: data?.comparison?.revenueGrowthRate !== undefined
      ? `${formatPercent(data.comparison.revenueGrowthRate)}%`
      : undefined,
    profitGrowth: data?.comparison?.profitGrowthRate !== undefined
      ? `${formatPercent(data.comparison.profitGrowthRate)}%`
      : undefined
  }
}

export function mapPointsUsers(list: ResidentItem[]) {
  return list.map(item => {
    const name = resolveResidentName(item)
    return {
      id: item.id,
      name,
      initials: initials(name),
      avatarColor: avatarColor(item.id || name),
      room: [item.building, item.room].filter(Boolean).join('') || '-',
      points: `${formatMoney(item.pointBalance)} pts`,
      pcoin: `${formatMoney(item.coinBalance)} PCoin`,
      coinBalance: item.coinBalance ?? 0,
      status: item.status === RESIDENT_STATUS.FROZEN || item.status === RESIDENT_STATUS.DISABLED
        ? 'frozen' as const
        : 'normal' as const
    }
  })
}

export function mapAnnouncements(list: AnnouncementItem[]) {
  return list.map(item => ({
    id: item.id,
    publishTime: item.publishedAt || item.createdAt || '-',
    title: item.title,
    publisher: item.publisherName || item.publisher || '物业管理处',
    scope: item.targetBuildings?.length ? item.targetBuildings : ['全部楼栋'],
    targetRoles: item.targetRoles,
    targetRolesLabel: formatAnnouncementTargetRoles(item.targetRoles),
    status: item.status || ANNOUNCEMENT_STATUS.DRAFT,
    statusLabel: getEnumLabel(ANNOUNCEMENT_STATUS_LABEL, item.status, '—'),
    announcementType: item.announcementType,
    announcementTypeLabel: getEnumLabel(ANNOUNCEMENT_TYPE_LABEL, normalizeAnnouncementType(item.announcementType), '—'),
    communityId: item.communityId
  }))
}

export function extractPermissionPool(data: PermissionItemDto[] | { permissions?: PermissionItemDto[]; list?: PermissionItemDto[] } | undefined) {
  if (!data) return []
  if (Array.isArray(data)) return data
  if (data.permissions) return data.permissions
  if (data.list) return data.list
  return []
}

export function buildPermissionGroups(pool: PermissionItemDto[], effectiveCodes: string[] = []) {
  const effective = new Set(effectiveCodes)
  const map = new Map<string, PermissionItemDto[]>()
  pool.forEach(item => {
    const category = PERMISSION_MODULE_LABEL[item.module || ''] || item.module || item.category || item.group || '其他'
    if (!map.has(category)) map.set(category, [])
    map.get(category)!.push(item)
  })
  return Array.from(map.entries()).map(([category, items]) => ({
    category,
    items: items.map(item => ({
      code: item.code,
      name: item.name,
      description: item.description || '',
      checked: effective.has(item.code)
    }))
  }))
}

export function normalizePermissionGroups(data: PermissionItemDto[] | { permissions?: PermissionItemDto[]; list?: PermissionItemDto[]; groups?: Array<{ category: string; items: PermissionItemDto[] }> } | undefined, effectiveCodes: string[] = []) {
  if (data && 'groups' in data && data.groups) {
    const effective = new Set(effectiveCodes)
    return data.groups.map(group => ({
      category: group.category,
      items: group.items.map(item => ({
        code: item.code,
        name: item.name,
        description: item.description || '',
        checked: effective.has(item.code)
      }))
    }))
  }
  return buildPermissionGroups(extractPermissionPool(data), effectiveCodes)
}

export function normalizeRolePresets(data: RolePresetDto[] | { presets?: RolePresetDto[]; list?: RolePresetDto[] } | undefined) {
  if (!data) return []
  const list = Array.isArray(data) ? data : data.presets || data.list || []
  return list.map(item => ({
    id: item.id,
    code: item.id || item.code || item.name,
    name: item.name,
    role: item.role || '',
    permissionCodes: item.permissionCodes || item.permissions || []
  }))
}

export function mapAdminUserAccounts(list: Array<{ id: string; name: string; phone?: string; role: string; effectivePermissionCount?: number }>) {
  return list.map(item => ({
    id: item.id,
    name: item.name,
    phone: item.phone || '-',
    initials: initials(item.name),
    role: getEnumLabel(ROLE_LABEL, item.role, item.role),
    roleCode: item.role,
    permissionCount: item.effectivePermissionCount ?? 0
  }))
}

export function mapPermissionChangeLogs(list: PermissionChangeLog[]) {
  return list.map(item => {
    const actionLabel = item.action === 'grant' ? '授予' : item.action === 'revoke' ? '撤销' : item.action || '-'
    const content = item.permissionCode
      ? `${actionLabel} ${item.permissionCode}${item.reason ? `（${item.reason}）` : ''}`
      : item.content || item.changeContent || '-'
    return {
      id: item.id || `${item.createdAt}-${item.permissionCode}`,
      time: item.createdAt || '-',
      operator: item.operatorName || '-',
      target: item.userName || item.targetName || item.targetUserName || '-',
      content
    }
  })
}

/** @deprecated use mapPermissionChangeLogs */
export function mapPermissionLogs(list: Array<{ createdAt?: string; operatorName?: string; targetName?: string; targetUserName?: string; content?: string; changeContent?: string; action?: string; permissionCode?: string; reason?: string; userName?: string }>) {
  return mapPermissionChangeLogs(list as PermissionChangeLog[])
}

export function mapCollectionRate(overview: DashboardOverview) {
  const summary = overview.summary || {}
  return formatPercent(overview.propertyFeeCollectionRate ?? summary.propertyFeeCollectionRate)
}

export function mapReportsToDashboardOverview(reports: ReportsOverview, period: string): DashboardOverview {
  const summary = reports.summary || {}
  const comparison = reports.comparison || {}
  return {
    period,
    summary: {
      totalResidents: summary.residentCount,
      totalMerchants: summary.merchantCount,
      totalPointsIssued: summary.pointPoolBalance,
      totalCoinIssued: summary.propertyCoinCirculation,
      propertyFeeCollectionRate: summary.propertyFeeCollectionRate,
      totalRevenue: summary.totalConsumptionAmount
    },
    trends: {
      residentGrowthRate: comparison.residentGrowthRate,
      revenueGrowthRate: comparison.consumptionGrowthRate,
      orderGrowthRate: comparison.orderGrowthRate
    },
    topMerchants: []
  }
}

/** GET /admin/point-pools — 积分池概览卡片 */
export function mapPointPoolOverview(pool?: PointPool) {
  const amount = pool?.equivalentAmount ?? pool?.balance
  return {
    poolAmount: formatMoney(amount),
    balance: pool?.balance ?? 0,
    totalIn: pool?.totalIn ?? 0,
    totalOut: pool?.totalOut ?? 0,
    propertyCompanyName: pool?.propertyCompanyName ?? '',
    updatedAt: pool?.updatedAt ?? ''
  }
}

export function mapPointsOverview(pool?: PointPool, overview?: DashboardOverview) {
  const summary = overview?.summary || {}
  const circulation = overview?.coinTotalIssued ?? summary.totalCoinIssued ?? 0
  const consumed = summary.totalCoinRedeemed ?? Math.round(circulation * 0.25)
  const poolOverview = mapPointPoolOverview(pool)
  const hasPoolData = pool?.equivalentAmount != null || pool?.balance != null
  return {
    ...poolOverview,
    poolAmount: hasPoolData
      ? poolOverview.poolAmount
      : formatMoney(overview?.pointPoolBalance ?? summary.totalPointsIssued),
    pcoinTotal: circulation,
    pcoinConsumed: consumed,
    pcoinCirculating: Math.max(circulation - consumed, 0)
  }
}

function deliveryStatusClass(status?: string) {
  if (status === DELIVERY_STATUS.ACCEPTED || status === DELIVERY_STATUS.GRABBED) return 'grabbed'
  if (status === DELIVERY_STATUS.PENDING) return 'pending'
  if (status === DELIVERY_STATUS.DELIVERING) return 'delivering'
  return 'completed'
}

function courierStatusClass(status?: string) {
  return status === COURIER_STATUS.OFFLINE ? 'offline' : 'online'
}

function capacityLoadClass(load: number) {
  if (load >= 80) return 'high'
  if (load >= 50) return 'medium'
  return 'low'
}

export function mapDeliveryStats(stats?: DeliveryTodayStats) {
  const orderGrowth = stats?.orderGrowth ?? 0
  const capacityLoad = stats?.capacityLoad ?? 0
  const growthPrefix = orderGrowth > 0 ? '+' : ''
  return {
    todayOrders: stats?.todayOrders ?? 0,
    orderGrowth,
    orderGrowthText: `${growthPrefix}${orderGrowth}`,
    onlineCouriers: stats?.onlineCouriers ?? 0,
    totalCouriers: stats?.totalCouriers ?? 0,
    todayDeliveryFee: formatMoney(stats?.todayDeliveryFee),
    capacityLoad,
    capacityLoadText: `${Math.round(capacityLoad)}%`,
    loadLevelClass: capacityLoadClass(capacityLoad)
  }
}

export function mapDeliveryCouriers(list?: DeliveryCourierItem[]) {
  return (list || []).map(item => {
    const name = item.name || '快递员'
    const status = item.status || COURIER_STATUS.OFFLINE
    return {
      id: item.id,
      name,
      initials: initials(name),
      avatarColor: avatarColor(item.id),
      todayCompleted: item.todayCompleted ?? 0,
      monthIncome: `¥${formatMoney(item.monthIncome)}`,
      status,
      statusLabel: getEnumLabel(COURIER_STATUS_LABEL, status),
      statusClass: courierStatusClass(status)
    }
  })
}

export function mapRecentDeliveries(list?: RecentDeliveryItem[]) {
  return (list || []).map((item, index) => {
    const status = item.status || DELIVERY_STATUS.PENDING
    return {
      id: item.id || `delivery-${index}`,
      time: item.time || '—',
      residentName: item.residentName || '—',
      productDesc: item.productDesc || '—',
      fee: item.fee !== undefined ? `¥${formatMoney(item.fee)}` : '—',
      status,
      statusLabel: getEnumLabel(DELIVERY_STATUS_LABEL, status),
      statusClass: deliveryStatusClass(status)
    }
  })
}

export function mapCapacityBars(hourlyData?: DeliveryHourlyData[], peakHour?: string) {
  const items = hourlyData || []
  const maxCount = Math.max(...items.map(item => item.deliveryCount ?? 0), 1)
  return items.map(item => {
    const label = item.label || (item.hour !== undefined ? `${String(item.hour).padStart(2, '0')}:00` : '')
    const isPeak = Boolean(peakHour && label === peakHour)
    const deliveryCount = item.deliveryCount ?? 0
    return {
      key: label || String(item.hour ?? ''),
      hour: label,
      value: Math.max(Math.round((deliveryCount / maxCount) * 100), deliveryCount > 0 ? 8 : 0),
      deliveryCount,
      avgResponseMinutes: item.avgResponseMinutes ?? 0,
      isPeak,
      peakLabel: isPeak ? '高峰' : undefined
    }
  })
}
