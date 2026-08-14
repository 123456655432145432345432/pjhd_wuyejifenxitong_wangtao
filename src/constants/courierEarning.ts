/**
 * B 方案输入预览：配送结算基数单独分账 —— 我们公司抽成，余额归配送员。
 * 正式金额必须读取后端 platformDeliveryShare / courierEarning。
 * 平台盘只从商品价计提，配送员不参与平台盘二次分。
 */

/** 平台从配送费抽取比例默认值（platformDeliveryShareRate） */
export const DEFAULT_PLATFORM_DELIVERY_SHARE_RATE = 0

function roundMoney(value: number) {
  return Math.round(value * 100) / 100
}

/** 我们公司从配送费抽成金额 */
export function calcPlatformDeliveryShare(
  deliveryFee?: number | null,
  platformDeliveryShareRate = DEFAULT_PLATFORM_DELIVERY_SHARE_RATE
) {
  if (deliveryFee == null || Number.isNaN(Number(deliveryFee))) return undefined
  const fee = Number(deliveryFee)
  const rate = Math.min(Math.max(Number(platformDeliveryShareRate) || 0, 0), 1)
  if (!Number.isFinite(fee) || fee < 0) return undefined
  return roundMoney(fee * rate)
}

/** 配送员收入 = 配送费 − 平台抽成（无保底） */
export function calcCourierEarningFromDeliveryFee(
  deliveryFee?: number | null,
  platformDeliveryShareRate = DEFAULT_PLATFORM_DELIVERY_SHARE_RATE
) {
  if (deliveryFee == null || Number.isNaN(Number(deliveryFee))) return undefined
  const fee = Number(deliveryFee)
  if (!Number.isFinite(fee) || fee < 0) return undefined
  const platformCut = calcPlatformDeliveryShare(fee, platformDeliveryShareRate) ?? 0
  return roundMoney(Math.max(fee - platformCut, 0))
}

export function formatCourierPlanBHint() {
  const pct = (DEFAULT_PLATFORM_DELIVERY_SHARE_RATE * 100).toFixed(0)
  return `配送员收入按配送结算基数计算（我们公司抽成默认 ${pct}%，余额归配送员）；正式金额只读取 courierEarning，不使用 courierShare，也不从商品平台盘扣除。`
}
