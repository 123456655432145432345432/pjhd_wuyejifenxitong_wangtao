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

function roundMoney(value: number) {
  return Math.round(value * 100) / 100
}

/**
 * 归一化分账记录字段。
 * 交付文档字段为 *Share；旧接口可能用 *Amount / snake_case。
 * B 方案：平台盘只从商品价计提；商家份额兜底 = 商品价×(1−抽佣)；配送费单独拆给我们公司与配送员。
 */
export function normalizeDistributionRecord(raw: unknown): DistributionRecordItem {
  const source = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}

  const totalAmount = pickNumber(source, ['totalAmount', 'total_amount', 'orderAmount', 'order_amount'])
  const deliveryFee = pickNumber(source, ['deliveryFee', 'delivery_fee'])
  const commissionRate = pickNumber(source, ['commissionRate', 'commission_rate'])
  const distributableAmount = pickNumber(source, [
    'distributableAmount',
    'distributable_amount',
    'platformPoolAmount',
    'platform_pool_amount'
  ])
  const pointCost = pickNumber(source, ['pointCost', 'point_cost'])
  const coinCost = pickNumber(source, ['coinCost', 'coin_cost'])

  let productAmount = pickNumber(source, [
    'productAmount',
    'product_amount',
    'goodsAmount',
    'goods_amount',
    'productPrice',
    'product_price'
  ])
  if (productAmount === undefined && totalAmount != null && deliveryFee != null) {
    productAmount = roundMoney(Math.max(totalAmount - deliveryFee, 0))
  }

  let merchantShare = pickNumber(source, [
    'merchantShare',
    'merchantAmount',
    'merchant_share',
    'merchant_amount'
  ])

  // B 方案：商家只分商品价；有商品价/可还原商品价时优先按商品价×(1−抽佣)
  if (merchantShare === undefined && productAmount != null && commissionRate != null) {
    merchantShare = roundMoney(productAmount * (1 - commissionRate))
  } else if (merchantShare === undefined && totalAmount != null && commissionRate != null && deliveryFee == null) {
    // 无配送费字段时回退旧口径（兼容存量）
    merchantShare = roundMoney(totalAmount * (1 - commissionRate))
  } else if (
    merchantShare === undefined &&
    totalAmount != null &&
    distributableAmount != null &&
    deliveryFee != null
  ) {
    // 商家 ≈ 商品价 − 平台盘 ≈ (订单额 − 配送费) − 平台盘
    merchantShare = roundMoney(Math.max(totalAmount - deliveryFee - distributableAmount, 0))
  } else if (
    merchantShare === undefined &&
    totalAmount != null &&
    distributableAmount != null &&
    distributableAmount < totalAmount - 0.0001
  ) {
    merchantShare = roundMoney(totalAmount - distributableAmount)
  }

  const platformShare = pickNumber(source, ['platformShare', 'platformAmount', 'platform_share', 'platform_amount'])
  const propertyShare = pickNumber(source, ['propertyShare', 'propertyAmount', 'property_share', 'property_amount'])
  const platformDeliveryShare = pickNumber(source, [
    'platformDeliveryShare',
    'platform_delivery_share',
    'platformDeliveryAmount',
    'platform_delivery_amount'
  ])
  const courierShareRaw = pickNumber(source, ['courierShare', 'courierAmount', 'courier_share', 'courier_amount'])
  let courierShare = courierShareRaw
  if (courierShare === undefined && deliveryFee != null && platformDeliveryShare != null) {
    courierShare = roundMoney(Math.max(deliveryFee - platformDeliveryShare, 0))
  }
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

  return {
    ...(source as DistributionRecordItem),
    id: String(source.id ?? ''),
    orderId: source.orderId != null ? String(source.orderId) : source.order_id != null ? String(source.order_id) : undefined,
    orderNo: (source.orderNo ?? source.order_no) != null ? String(source.orderNo ?? source.order_no) : undefined,
    merchantId:
      source.merchantId != null
        ? String(source.merchantId)
        : source.merchant_id != null
          ? String(source.merchant_id)
          : undefined,
    merchantName:
      source.merchantName != null
        ? String(source.merchantName)
        : source.merchant_name != null
          ? String(source.merchant_name)
          : undefined,
    totalAmount,
    deliveryFee,
    productAmount,
    commissionRate,
    pointCost,
    coinCost,
    distributableAmount,
    merchantShare,
    platformShare,
    platformAmount: platformShare,
    propertyShare,
    propertyAmount: propertyShare,
    platformDeliveryShare,
    courierShare,
    courierAmount: courierShare,
    coordinatorShare,
    coordinatorAmount: coordinatorShare,
    sectorLeaderShare,
    sectorLeaderAmount: sectorLeaderShare,
    individualLeaderShare,
    individualLeaderAmount: individualLeaderShare,
    createdAt:
      source.createdAt != null
        ? String(source.createdAt)
        : source.created_at != null
          ? String(source.created_at)
          : undefined
  }
}

export function normalizeDistributionRecords(list: unknown[]): DistributionRecordItem[] {
  return (list || []).map((item) => normalizeDistributionRecord(item))
}
