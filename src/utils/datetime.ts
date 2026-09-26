/** 将 datetime-local / 常见本地时间串转为后端可接受的时间（优先 ISO8601 UTC） */
export function toApiDateTime(value: string): string {
  const raw = (value || '').trim()
  if (!raw) return ''

  // 已是带 Z / 偏移的 ISO
  if (/^\d{4}-\d{2}-\d{2}T/.test(raw) && /(?:Z|[+-]\d{2}:?\d{2})$/.test(raw)) {
    const d = new Date(raw)
    return Number.isNaN(d.getTime()) ? raw : d.toISOString()
  }

  // datetime-local: YYYY-MM-DDTHH:mm 或 YYYY-MM-DDTHH:mm:ss（勿再拼 :00 造成双秒）
  const local = raw.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/)
  if (local) {
    const [, ymd, hh, mm, ss] = local
    const normalized = `${ymd}T${hh}:${mm}:${ss || '00'}`
    const d = new Date(normalized)
    if (!Number.isNaN(d.getTime())) return d.toISOString()
    return `${ymd} ${hh}:${mm}:${ss || '00'}`
  }

  // 纯日期
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const d = new Date(`${raw}T00:00:00`)
    return Number.isNaN(d.getTime()) ? raw : d.toISOString()
  }

  const fallback = new Date(raw)
  return Number.isNaN(fallback.getTime()) ? raw : fallback.toISOString()
}
