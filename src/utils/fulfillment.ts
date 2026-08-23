import type { OrderItem } from '../api/types'
import {
  CARRIER_TYPE,
  CARRIER_TYPE_LABEL,
  DELIVERY_STATUS,
  FULFILLMENT_CHOICE_ACTION_LABEL,
  FULFILLMENT_MODE,
  FULFILLMENT_MODE_LABEL,
  ORDER_STATUS,
  getEnumLabel,
  isDeliveryFinished
} from '../constants/enums'

const TERMINAL_ORDER_STATUS = new Set<string>([
  ORDER_STATUS.COMPLETED,
  ORDER_STATUS.CANCELLED,
  ORDER_STATUS.REFUNDED,
  ORDER_STATUS.REFUNDING,
  ORDER_STATUS.REFUND_REJECTED
])

export function orderStatusOf(order: Pick<OrderItem, 'orderStatus' | 'status'>) {
  return order.orderStatus || order.status || ''
}

/** 空履约 + 已有配送单视为历史大厅单（§68 对照） */
export function fulfillmentModeOf(order: OrderItem) {
  if (order.fulfillmentMode) return order.fulfillmentMode
  if (order.requiresDelivery === false) return FULFILLMENT_MODE.NONE
  if (order.deliveryId) return FULFILLMENT_MODE.COURIER_HALL
  return ''
}

export function fulfillmentModeLabelOf(order: OrderItem) {
  if (order.fulfillmentModeLabel) return order.fulfillmentModeLabel
  const mode = fulfillmentModeOf(order)
  if (!mode && order.deliveryId) return '平台配送（历史单）'
  return getEnumLabel(FULFILLMENT_MODE_LABEL, mode, '—')
}

export function carrierTypeOf(order: Pick<OrderItem, 'carrierType' | 'fulfillmentMode' | 'deliveryStatus'>) {
  if (order.carrierType) return order.carrierType
  if (
    order.fulfillmentMode === FULFILLMENT_MODE.MERCHANT_SELF ||
    order.deliveryStatus === DELIVERY_STATUS.MERCHANT_SELF
  ) {
    return CARRIER_TYPE.MERCHANT
  }
  return ''
}

export function carrierTypeLabelOf(order: OrderItem) {
  const carrier = carrierTypeOf(order)
  return getEnumLabel(CARRIER_TYPE_LABEL, carrier, '—')
}

export function isMerchantCarrier(order: Pick<OrderItem, 'carrierType' | 'fulfillmentMode' | 'deliveryStatus'>) {
  return carrierTypeOf(order) === CARRIER_TYPE.MERCHANT
}

export function isFulfillmentTerminal(order: OrderItem) {
  return TERMINAL_ORDER_STATUS.has(orderStatusOf(order))
}

export function isChoiceOverdue(order: OrderItem, now = Date.now()) {
  if (fulfillmentModeOf(order) !== FULFILLMENT_MODE.PENDING_CHOICE) return false
  if (!order.fulfillmentDeadline) return false
  const ts = Date.parse(order.fulfillmentDeadline)
  return Number.isFinite(ts) && ts < now
}

export function canAdminOverride(order: OrderItem) {
  if (order.requiresDelivery === false) return false
  if (fulfillmentModeOf(order) === FULFILLMENT_MODE.NONE) return false
  return !isFulfillmentTerminal(order)
}

export function canMerchantVerify(order: OrderItem) {
  return orderStatusOf(order) === ORDER_STATUS.PENDING_VERIFICATION
}

export function canMerchantChoose(order: OrderItem) {
  if (order.requiresDelivery === false) return false
  if (canMerchantVerify(order)) return false
  return (
    fulfillmentModeOf(order) === FULFILLMENT_MODE.PENDING_CHOICE &&
    orderStatusOf(order) === ORDER_STATUS.PAID
  )
}

export function canMerchantConfirmDelivery(order: OrderItem) {
  if (canMerchantVerify(order) || orderStatusOf(order) === ORDER_STATUS.VERIFIED) return false
  return (
    isMerchantCarrier(order) &&
    !isFulfillmentTerminal(order) &&
    !isDeliveryFinished(order.deliveryStatus)
  )
}

export function canAssignCourier(order: OrderItem) {
  if (canMerchantVerify(order) || orderStatusOf(order) === ORDER_STATUS.VERIFIED) return false
  if (isMerchantCarrier(order)) return false
  if (fulfillmentModeOf(order) === FULFILLMENT_MODE.PENDING_CHOICE) return false
  return Boolean(order.deliveryId)
}

export function fulfillmentActionLabel(action?: string) {
  if (!action) return '—'
  if (FULFILLMENT_CHOICE_ACTION_LABEL[action]) return FULFILLMENT_CHOICE_ACTION_LABEL[action]
  if (action.startsWith('choose')) return '商家选择履约'
  return action
}

export function deliverySettlementChecksum(item: {
  deliverySettlementBase?: number
  platformDeliveryShare?: number
  courierEarning?: number
  merchantDeliveryFeeShare?: number
}) {
  const fields = [
    item.deliverySettlementBase,
    item.platformDeliveryShare,
    item.courierEarning,
    item.merchantDeliveryFeeShare
  ]
  if (fields.some((value) => value == null || Number.isNaN(Number(value)))) {
    return { ok: null as boolean | null, sum: undefined as number | undefined }
  }
  const sum =
    Number(item.platformDeliveryShare) +
    Number(item.courierEarning) +
    Number(item.merchantDeliveryFeeShare)
  const base = Number(item.deliverySettlementBase)
  return { ok: Math.abs(base - sum) < 0.02, sum }
}
