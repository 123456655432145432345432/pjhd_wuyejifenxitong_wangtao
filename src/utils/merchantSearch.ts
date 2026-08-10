/** 审批列表接口仅支持 merchantId，不支持 keyword；名称需前端过滤 */

export function isLikelyMerchantId(value: string): boolean {
  const term = value.trim()
  if (!term) return false
  // Mongo ObjectId / UUID
  if (/^[a-f0-9]{24}$/i.test(term) || /^[0-9a-f-]{36}$/i.test(term)) return true
  // 业务前缀 ID，如 mch_xxx / merchant_xxx
  if (/^(mch|merchant|m)_[a-z0-9_-]+$/i.test(term)) return true
  return false
}

export function filterByMerchantKeyword<T extends { merchantId?: string; merchantName?: string }>(
  items: T[],
  keyword: string
): T[] {
  const q = keyword.trim().toLowerCase()
  if (!q) return items
  return items.filter(
    (item) =>
      item.merchantName?.toLowerCase().includes(q) ||
      String(item.merchantId || '').toLowerCase().includes(q)
  )
}

/** 仅当可识别为商家 ID 时传给后端；名称搜索不要带 keyword（后端会 400） */
export function buildMerchantSearchParams(keyword: string): { merchantId?: string } {
  const term = keyword.trim()
  if (!term) return {}
  if (isLikelyMerchantId(term)) return { merchantId: term }
  return {}
}
