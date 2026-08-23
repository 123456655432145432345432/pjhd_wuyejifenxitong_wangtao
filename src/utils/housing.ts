/** 楼栋/单元/房号归一化：忽略「栋/单元/号」等后缀，便于 3栋 与 3 视为同一房源 */
export function normalizeHousingPart(value?: string | null) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[栋幢座单元号室楼层#]/g, '')
    .replace(/\s+/g, '')
}

export function isSameHousing(
  a: { communityId?: string | null; building?: string | null; unit?: string | null; room?: string | null },
  b: { communityId?: string | null; building?: string | null; unit?: string | null; room?: string | null }
) {
  if (!a.communityId || !b.communityId || a.communityId !== b.communityId) return false
  return (
    normalizeHousingPart(a.building) === normalizeHousingPart(b.building) &&
    normalizeHousingPart(a.unit) === normalizeHousingPart(b.unit) &&
    normalizeHousingPart(a.room) === normalizeHousingPart(b.room)
  )
}
