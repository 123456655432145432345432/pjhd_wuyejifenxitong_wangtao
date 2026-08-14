import type { DistributionRecordItem } from '../api/types'

function pickNumber(source: Record<string, unknown>, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = source[key]
    if (value === undefined || value === null || value === '') continue
    const num = Number(value)
    if (!Number.isNaN(num)) return num
  }
  return undefined
}

function pickString(source: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = source[key]
    if (value === undefined || value === null || value === '') continue
    return String(value)
  }
  return undefined
}

/**
 * 归一化分账记录字段。
 * 对齐《分成明细接口对接文档》(2026-08-12)：
 * - 商品与配送两条链路的正式金额全部读取后端快照
 * - merchantShare 是扣除商家配送补贴后的最终实得
 * - 配送员正式收入只读取 courierEarning，不使用 courierShare
 * - 取消订单的负数记录必须原样保留，供前端展示冲账
 */
export function normalizeDistributionRecord(raw: unknown): DistributionRecordItem {
  const source = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}

  const totalAmount = pickNumber(source, ['totalAmount', 'total_amount', 'orderAmount', 'order_amount'])
  const deliveryFee = pickNumber(source, ['deliveryFee', 'delivery_fee'])
  const originalDeliveryFee = pickNumber(source, ['originalDeliveryFee', 'original_delivery_fee'])
  const deliveryWaiverAmount = pickNumber(source, ['deliveryWaiverAmount', 'delivery_waiver_amount'])
  const deliverySubsidyAmount = pickNumber(source, ['deliverySubsidyAmount', 'delivery_subsidy_amount'])
  const deliverySettlementBase = pickNumber(source, ['deliverySettlementBase', 'delivery_settlement_base'])
  const commissionRate = pickNumber(source, ['commissionRate', 'commission_rate'])
  const distributableAmount = pickNumber(source, [
    'distributableAmount',
    'distributable_amount',
    'platformPoolAmount',
    'platform_pool_amount'
  ])
  const deficitAmount = pickNumber(source, ['deficitAmount', 'deficit_amount'])
  const platformShareRate = pickNumber(source, ['platformShareRate', 'platform_share_rate'])
  const productCommission = pickNumber(source, ['productCommission', 'product_commission'])
  const productBase = pickNumber(source, ['productBase', 'product_base'])
  const pointCost = pickNumber(source, ['pointCost', 'point_cost'])
  const coinCost = pickNumber(source, ['coinCost', 'coin_cost'])
  const commissionBaseAmount = pickNumber(source, [
    'commissionBaseAmount',
    'commission_base_amount'
  ])

  const productAmount = pickNumber(source, [
    'productAmount',
    'product_amount',
    'goodsAmount',
    'goods_amount',
    'productPrice',
    'product_price'
  ])
  const merchantGoodsShare = pickNumber(source, ['merchantGoodsShare', 'merchant_goods_share'])
  const merchantDeliverySubsidy = pickNumber(source, [
    'merchantDeliverySubsidy',
    'merchant_delivery_subsidy'
  ])
  const merchantAdjustmentAmount = pickNumber(source, [
    'merchantAdjustmentAmount',
    'merchant_adjustment_amount'
  ])
  const merchantShare = pickNumber(source, [
    'merchantShare',
    'merchantAmount',
    'merchant_share',
    'merchant_amount'
  ])
  const propertyShare = pickNumber(source, ['propertyShare', 'propertyAmount', 'property_share', 'property_amount'])
  const managementPoolAmount = pickNumber(source, ['managementPoolAmount', 'management_pool_amount'])
  const sectorGrossAmount = pickNumber(source, ['sectorGrossAmount', 'sector_gross_amount'])
  const coordinatorShare = pickNumber(source, [
    'coordinatorShare',
    'coordinatorAmount',
    'coordinator_share',
    'coordinator_amount'
  ])
  const sectorLeaderShare = pickNumber(source, [
    'sectorLeaderShare',
    'sectorLeaderAmount',
    'sector_leader_share',
    'sector_leader_amount'
  ])
  const individualLeaderShare = pickNumber(source, [
    'individualLeaderShare',
    'individualLeaderAmount',
    'individual_leader_share',
    'individual_leader_amount'
  ])

  const platformShare = pickNumber(source, ['platformShare', 'platformAmount', 'platform_share', 'platform_amount'])

  const platformDeliveryShare = pickNumber(source, [
    'platformDeliveryShare',
    'platform_delivery_share',
    'platformDeliveryAmount',
    'platform_delivery_amount'
  ])
  // 仅保留旧字段兼容展示；正式配送员收入必须读取 courierEarning
  const courierShare = pickNumber(source, ['courierShare', 'courierAmount', 'courier_share', 'courier_amount'])
  const courierEarning = pickNumber(source, ['courierEarning', 'courier_earning'])

  return {
    ...(source as DistributionRecordItem),
    id: String(source.id ?? ''),
    orderId: pickString(source, ['orderId', 'order_id']),
    orderNo: pickString(source, ['orderNo', 'order_no']),
    merchantId: pickString(source, ['merchantId', 'merchant_id']),
    merchantName: pickString(source, ['merchantName', 'merchant_name']),
    residentId: pickString(source, ['residentId', 'resident_id']),
    residentName: pickString(source, ['residentName', 'resident_name']),
    propertyCompanyId: pickString(source, ['propertyCompanyId', 'property_company_id']),
    totalAmount,
    deliveryFee,
    originalDeliveryFee,
    deliveryWaiverAmount,
    deliverySubsidySponsor: pickString(source, [
      'deliverySubsidySponsor',
      'delivery_subsidy_sponsor'
    ]),
    deliverySubsidyAmount,
    deliverySettlementBase,
    productAmount,
    commissionRate,
    pointCost,
    coinCost,
    commissionBaseAmount,
    distributableAmount,
    deficitAmount,
    deficitSponsor: pickString(source, ['deficitSponsor', 'deficit_sponsor']),
    platformShareRate,
    productCommission,
    productBase,
    merchantGoodsShare,
    merchantDeliverySubsidy,
    merchantAdjustmentAmount,
    merchantShare,
    platformShare,
    platformAmount: platformShare,
    propertyShare,
    propertyAmount: propertyShare,
    managementPoolAmount,
    sectorGrossAmount,
    platformDeliveryShare,
    courierShare,
    courierAmount: courierShare,
    courierEarning,
    coordinatorShare,
    coordinatorAmount: coordinatorShare,
    sectorLeaderShare,
    sectorLeaderAmount: sectorLeaderShare,
    individualLeaderShare,
    individualLeaderAmount: individualLeaderShare,
    coordinatorId: pickString(source, ['coordinatorId', 'coordinator_id']),
    coordinatorName: pickString(source, ['coordinatorName', 'coordinator_name']),
    sectorLeaderId: pickString(source, ['sectorLeaderId', 'sector_leader_id']),
    sectorLeaderName: pickString(source, ['sectorLeaderName', 'sector_leader_name']),
    individualLeaderId: pickString(source, ['individualLeaderId', 'individual_leader_id']),
    individualLeaderName: pickString(source, ['individualLeaderName', 'individual_leader_name']),
    status: pickString(source, ['status', 'distributionStatus', 'distribution_status']),
    calculationVersion: pickString(source, ['calculationVersion', 'calculation_version']),
    createdAt: pickString(source, ['createdAt', 'created_at'])
  }
}

export function normalizeDistributionRecords(list: unknown[]): DistributionRecordItem[] {
  return (list || []).map((item) => normalizeDistributionRecord(item))
}
