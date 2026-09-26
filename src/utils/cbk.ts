import { ApiError, formatApiError, sanitizePayChannelMessage } from '../api/request'
import type { CbkAccountItem, CbkAccountUpsertPayload, CbkReconcileItem } from '../api/types'
import {
  CBK_OWNER_TYPE,
  CBK_PAYOUT_STATUS,
  CBK_PLATFORM_OWNER_ID,
  CBK_RECONCILE_STATUS,
  getEnumLabel,
  CBK_PAYOUT_STATUS_LABEL
} from '../constants/enums'

function asRecord(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
}

function pickStr(obj: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const val = obj[key]
    if (typeof val === 'string' && val.trim()) return val.trim()
    if (typeof val === 'number' && Number.isFinite(val)) return String(val)
  }
  return ''
}

function pickNum(obj: Record<string, unknown>, ...keys: string[]): number | undefined {
  for (const key of keys) {
    const val = obj[key]
    if (typeof val === 'number' && Number.isFinite(val)) return val
    if (typeof val === 'string' && val.trim() !== '' && !Number.isNaN(Number(val))) return Number(val)
  }
  return undefined
}

function pickBool(obj: Record<string, unknown>, ...keys: string[]): boolean | undefined {
  for (const key of keys) {
    const val = obj[key]
    if (typeof val === 'boolean') return val
    if (val === 1 || val === '1' || val === 'true' || val === 'TRUE' || val === '是') return true
    if (val === 0 || val === '0' || val === 'false' || val === 'FALSE' || val === '否') return false
  }
  return undefined
}

const OWNER_TYPE_ALIASES: Record<string, string> = {
  platform: CBK_OWNER_TYPE.PLATFORM,
  property: CBK_OWNER_TYPE.PROPERTY,
  merchant: CBK_OWNER_TYPE.MERCHANT,
  coordinator: CBK_OWNER_TYPE.COORDINATOR,
  sector_leader: CBK_OWNER_TYPE.SECTOR_LEADER,
  individual_leader: CBK_OWNER_TYPE.INDIVIDUAL_LEADER,
  courier: CBK_OWNER_TYPE.COURIER
}

export function normalizeCbkOwnerType(raw?: string | null): string {
  if (!raw) return ''
  const key = String(raw).trim()
  const lower = key.toLowerCase().replace(/-/g, '_')
  return OWNER_TYPE_ALIASES[lower] || key.toUpperCase()
}

export function maskAccountNo(accountNo?: string | null): string {
  const value = String(accountNo || '').trim()
  if (!value) return '—'
  if (value.length <= 8) return value
  return `${value.slice(0, 4)}…${value.slice(-4)}`
}

export function formatCbkAmount(value?: number | string | null): string {
  if (value === undefined || value === null || value === '') return '—'
  const num = Number(value)
  if (Number.isNaN(num)) return String(value)
  return num.toFixed(2)
}

export function canRetryCbkReconcile(status?: string | null): boolean {
  const key = String(status || '').trim().toLowerCase()
  return (Object.values(CBK_RECONCILE_STATUS) as string[]).includes(key)
}

export function cbkPayoutLabel(status?: string | null): string {
  return getEnumLabel(CBK_PAYOUT_STATUS_LABEL, status, '—')
}

const PAYOUT_ALIASES: Record<string, string> = {
  frozen: CBK_PAYOUT_STATUS.FROZEN,
  freeze: CBK_PAYOUT_STATUS.FROZEN,
  withdrawing: CBK_PAYOUT_STATUS.WITHDRAWING,
  withdraw: CBK_PAYOUT_STATUS.WITHDRAWING,
  payout_pending: CBK_PAYOUT_STATUS.WITHDRAWING,
  arrived: CBK_PAYOUT_STATUS.ARRIVED,
  finished: CBK_PAYOUT_STATUS.ARRIVED,
  payout_success: CBK_PAYOUT_STATUS.ARRIVED
}

export function normalizeCbkPayoutStatus(raw?: string | null): string {
  if (!raw) return ''
  const key = String(raw).trim().toLowerCase()
  return PAYOUT_ALIASES[key] || key
}

export function normalizeCbkAccount(raw: unknown): CbkAccountItem {
  const obj = asRecord(raw)
  return {
    id: pickStr(obj, 'id') || '',
    ownerType: normalizeCbkOwnerType(pickStr(obj, 'ownerType', 'owner_type')) || undefined,
    ownerId: pickStr(obj, 'ownerId', 'owner_id') || undefined,
    accountNo: pickStr(obj, 'accountNo', 'account_no') || undefined,
    merchantNo: pickStr(obj, 'merchantNo', 'merchant_no') || undefined,
    accountName: pickStr(obj, 'accountName', 'account_name') || undefined,
    verified: pickBool(obj, 'verified'),
    createdAt: pickStr(obj, 'createdAt', 'created_at') || undefined,
    updatedAt: pickStr(obj, 'updatedAt', 'updated_at') || undefined
  }
}

export function normalizeCbkReconcileItem(raw: unknown): CbkReconcileItem {
  const obj = asRecord(raw)
  const amount = pickNum(obj, 'amount')
  return {
    splitNo: pickStr(obj, 'splitNo', 'split_no', 'id') || '',
    status: pickStr(obj, 'status').toLowerCase() || undefined,
    ownerType: normalizeCbkOwnerType(pickStr(obj, 'ownerType', 'owner_type')) || undefined,
    ownerId: pickStr(obj, 'ownerId', 'owner_id') || undefined,
    accountNo: pickStr(obj, 'accountNo', 'account_no') || undefined,
    amount: amount !== undefined ? amount : pickStr(obj, 'amount') || undefined,
    orderId: pickStr(obj, 'orderId', 'order_id') || undefined,
    orderNo: pickStr(obj, 'orderNo', 'order_no') || undefined,
    failReason: pickStr(obj, 'failReason', 'fail_reason') || undefined,
    remark: pickStr(obj, 'remark', 'skipReason', 'skip_reason') || undefined,
    createdAt: pickStr(obj, 'createdAt', 'created_at') || undefined,
    updatedAt: pickStr(obj, 'updatedAt', 'updated_at') || undefined
  }
}

function toUpsertPayload(raw: unknown, index: number): CbkAccountUpsertPayload {
  const obj = asRecord(raw)
  const ownerType = normalizeCbkOwnerType(pickStr(obj, 'ownerType', 'owner_type'))
  const ownerId =
    ownerType === CBK_OWNER_TYPE.PLATFORM
      ? CBK_PLATFORM_OWNER_ID
      : pickStr(obj, 'ownerId', 'owner_id')
  const accountNo = pickStr(obj, 'accountNo', 'account_no')
  if (!ownerType || !ownerId || !accountNo) {
    throw new Error(`第 ${index + 1} 条缺少 ownerType / ownerId / accountNo`)
  }
  const merchantNo = pickStr(obj, 'merchantNo', 'merchant_no')
  const accountName = pickStr(obj, 'accountName', 'account_name')
  const verified = pickBool(obj, 'verified')
  return {
    ownerType,
    ownerId,
    accountNo,
    merchantNo: merchantNo || undefined,
    accountName: accountName || undefined,
    verified: verified === undefined ? undefined : verified
  }
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === ',' && !inQuotes) {
      cells.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  cells.push(current.trim())
  return cells
}

function parseCbkAccountCsv(text: string): CbkAccountUpsertPayload[] {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim())
  if (lines.length < 2) throw new Error('CSV 至少需要表头和一行数据')
  const headers = parseCsvLine(lines[0]).map((h) => h.replace(/[\s-]/g, '').toLowerCase())
  const indexOf = (name: string) => headers.indexOf(name.toLowerCase())
  const rows: CbkAccountUpsertPayload[] = []
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i])
    const get = (name: string) => {
      const idx = indexOf(name)
      return idx >= 0 ? cells[idx] || '' : ''
    }
    rows.push(
      toUpsertPayload(
        {
          ownerType: get('ownertype'),
          ownerId: get('ownerid'),
          accountNo: get('accountno'),
          accountName: get('accountname'),
          merchantNo: get('merchantno'),
          verified: get('verified')
        },
        i - 1
      )
    )
  }
  return rows
}

/** JSON 数组或 CSV（表头：ownerType,ownerId,accountNo,accountName,merchantNo,verified） */
export function parseCbkAccountBatchText(text: string): CbkAccountUpsertPayload[] {
  const trimmed = text.trim()
  if (!trimmed) throw new Error('请粘贴 JSON 数组或 CSV')
  if (trimmed.startsWith('[')) {
    let parsed: unknown
    try {
      parsed = JSON.parse(trimmed)
    } catch {
      throw new Error('JSON 解析失败，请检查格式')
    }
    if (!Array.isArray(parsed)) throw new Error('JSON 必须是数组')
    if (!parsed.length) throw new Error('数组不能为空')
    return parsed.map((item, index) => toUpsertPayload(item, index))
  }
  return parseCbkAccountCsv(trimmed)
}

export function explainCbkApiError(e: unknown, fallback: string): string {
  if (e instanceof ApiError) {
    const base = formatApiError(e, fallback)
    if (/NoResourceFoundException|404|Not Found|no static resource/i.test(e.message || '')) {
      return '分账管理接口尚未发布，请等后端公布路径后再刷新。'
    }
    if (e.errorCode) return `${base}（${e.errorCode}）`
    return base
  }
  return sanitizePayChannelMessage(formatApiError(e, fallback))
}
