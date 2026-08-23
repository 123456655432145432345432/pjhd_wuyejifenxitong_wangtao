import { API_PATH_PREFIX, API_REMOTE_BASE_URL } from '../config/api'
import type { ApiResponse } from './types'
import { getAccessToken, getRefreshToken } from '../stores/tokenStore'
import { isNativeApp } from '../utils/native'
import { formatMerchantDuplicateBindingMessage } from '../constants/enums'

/**
 * - 浏览器开发：Vite 代理同源前缀
 * - Capacitor 原生 / 生产构建：直连远程 API（原生环境无 Vite 代理）
 */
const API_BASE_URL =
  import.meta.env.DEV && !isNativeApp() ? API_PATH_PREFIX : API_REMOTE_BASE_URL

export class ApiError extends Error {
  code: number
  errorCode?: string
  errors?: Array<{ field: string; message: string; value?: unknown }>
  data?: unknown

  constructor(
    code: number,
    message: string,
    errors?: ApiError['errors'],
    errorCode?: string,
    data?: unknown
  ) {
    super(message)
    this.code = code
    this.errors = errors
    this.errorCode = errorCode
    this.data = data
  }
}

/** 提现等业务常见错误码兜底文案（后端已返回 message 时仍优先用后端） */
const KNOWN_ERROR_MESSAGES: Record<number, string> = {
  94003: '可提现余额不足',
  94005: '当前账号已被阻止提现',
  97003: '未配置微信催缴模板',
  97004: '催缴发送范围已过期，请重新预览后再发送',
  97005: '该催缴批次已经提交，请勿重复发送',
  97006: '商品平台盘一级比例合计必须为 100%',
  97007: '配送费抽成比例不合法',
  97008: '满额门槛必须大于 0',
  97009: '订单金额快照已失效，请重新预览',
  97010: '订单已经完成分账',
  97011: '配送已经完成结算',
  97012: '配送补贴承担方不合法',
  97013: '商家预计收入不足以覆盖配送补贴',
  97014: '分账金额不守恒',
  97015: '退款冲正已处理',
  97016: '分账比例不合法',
  97020: '订单已完成，不支持退款',
  97021: '分账账户未就绪',
  97022: '支付通道异常',
  70021: '已超过履约选择时限，无法再选择',
  70022: '本单无需配送，不可选择履约方式（团购单）',
  70023: '请先选择履约方式',
  70024: '配送未完成，不可完成订单',
  70025: '履约方式已锁定，不可变更',
  99002: '微信支付接口异常',
  99003: '微信支付签名校验失败',
  99004: '微信支付未配置',
  99010: '商家核实时限已过，系统已自动通过',
  99011: '订单尚未通过商家核实',
  99012: '冻结期已过，不可申请退货',
  99013: '订单因商家超时未核实已自动通过',
  80010: '非配送员承运单，配送员不可抢单/操作',
  30004: '该物业下已存在相同申请，请勿重复提交',
  60005: '商家已被踢出，无法继续经营，可重新申请入驻',
  90120: '账号存在关联业务数据，无法彻底删除，请改用禁用或软删除',
  90121: '账号已删除，无法再次操作'
}

const PAY_CHANNEL_BRAND_RE = /扫呗|利楚商服|利楚|LCSW|lcsw/i

/** 后端若仍带旧通道品牌名，管理端展示为中性文案 */
export function sanitizePayChannelMessage(message: string): string {
  if (!PAY_CHANNEL_BRAND_RE.test(message)) return message
  return '支付通道异常'
}

/** 优先拼接后端 errors[].message，否则回退 message / 已知错误码文案 */
export function formatApiError(e: unknown, fallback = '操作失败') {
  if (e instanceof ApiError) {
    const detail = e.errors?.map((item) => item.message).filter(Boolean).join('；')
    if (detail) return sanitizePayChannelMessage(detail)
    if (e.code === 30004) {
      const data = e.data as { auditStatus?: string } | undefined
      return formatMerchantDuplicateBindingMessage(data, e.message || KNOWN_ERROR_MESSAGES[30004] || fallback)
    }
    return sanitizePayChannelMessage(e.message || KNOWN_ERROR_MESSAGES[e.code] || fallback)
  }
  if (e instanceof Error) return sanitizePayChannelMessage(e.message || fallback)
  return fallback
}

type TokenGetter = () => { accessToken: string; refreshToken: string }
type CompanyIdGetter = () => string
type TokenRefresher = () => Promise<boolean>
type LogoutHandler = () => void
type ForbiddenHandler = (message: string) => void

let getTokens: TokenGetter = () => ({
  accessToken: getAccessToken(),
  refreshToken: getRefreshToken()
})
let getPropertyCompanyId: CompanyIdGetter = () => ''
let refreshTokens: TokenRefresher = async () => false
let onUnauthorized: LogoutHandler = () => {}
let onForbidden: ForbiddenHandler = () => {}

let isRefreshing = false
let refreshWaiters: Array<(token: string) => void> = []

const AUTH_ERROR_CODES = new Set([20001, 20002, 20003])
const FORBIDDEN_ERROR_CODES = new Set([20004, 20005])

export function configureRequest(options: {
  getTokens?: TokenGetter
  getPropertyCompanyId?: CompanyIdGetter
  refreshTokens: TokenRefresher
  onUnauthorized: LogoutHandler
  onForbidden?: ForbiddenHandler
}) {
  if (options.getTokens) getTokens = options.getTokens
  if (options.getPropertyCompanyId) getPropertyCompanyId = options.getPropertyCompanyId
  refreshTokens = options.refreshTokens
  onUnauthorized = options.onUnauthorized
  if (options.onForbidden) onForbidden = options.onForbidden
}

function withCompanyQuery(path: string) {
  const qIndex = path.indexOf('?')
  const pathname = qIndex >= 0 ? path.slice(0, qIndex) : path
  if (
    pathname.includes('/profit-space') ||
    pathname === '/merchants/my' ||
    pathname === '/sector-leaders/my' ||
    pathname === '/coordinators/my' ||
    pathname === '/individual-leaders/my' ||
    pathname.startsWith('/individual-leaders/me')
  ) {
    return path
  }

  // 公告详情/更新/删除仅按 id 访问，不附加 propertyCompanyId，避免 GET/PUT 403
  if (/^\/announcements\/[^/]+$/.test(pathname)) {
    return path
  }

  if (
    !path.startsWith('/admin/') &&
    !path.startsWith('/reports/') &&
    !path.startsWith('/residents') &&
    !path.startsWith('/merchants') &&
    !path.startsWith('/announcements')
  ) {
    return path
  }

  const companyId = getPropertyCompanyId()
  if (!companyId) return path

  const search = new URLSearchParams(qIndex >= 0 ? path.slice(qIndex + 1) : '')
  if (!search.has('propertyCompanyId')) {
    search.set('propertyCompanyId', companyId)
  }
  const query = search.toString()
  return query ? `${pathname}?${query}` : pathname
}

export function buildQuery(params: Record<string, string | number | boolean | undefined | null>) {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value))
    }
  })
  const query = search.toString()
  return query ? `?${query}` : ''
}

async function parseResponse<T>(res: Response): Promise<ApiResponse<T>> {
  const text = await res.text()
  if (!text) {
    if (res.ok) {
      return { code: 0, message: 'success', data: undefined as T }
    }
    throw new ApiError(res.status, '服务器无响应')
  }
  try {
    return JSON.parse(text) as ApiResponse<T>
  } catch {
    throw new ApiError(res.status, '响应解析失败')
  }
}

function waitForTokenRefresh() {
  return new Promise<string>((resolve) => {
    refreshWaiters.push(resolve)
  })
}

async function tryRefreshToken() {
  if (isRefreshing) {
    return waitForTokenRefresh()
  }
  isRefreshing = true
  try {
    const refreshed = await refreshTokens()
    const { accessToken } = getTokens()
    if (refreshed && accessToken) {
      refreshWaiters.forEach((cb) => cb(accessToken))
      refreshWaiters = []
      return accessToken
    }
    refreshWaiters = []
    onUnauthorized()
    throw new ApiError(20002, '登录已过期，请重新登录')
  } finally {
    isRefreshing = false
  }
}

function handleAuthFailure(json: ApiResponse<unknown>, res: Response) {
  onUnauthorized()
  throw new ApiError(
    json.code || res.status,
    json.message || '登录已过期，请重新登录',
    undefined,
    json.errorCode
  )
}

function handleForbidden(json: ApiResponse<unknown>, res: Response) {
  const message = json.message || '您无权执行此操作'
  onForbidden(message)
  throw new ApiError(json.code || res.status, message, undefined, json.errorCode)
}

export type RequestAuthOptions = {
  /** 为 true 时鉴权失败只抛错，不触发全局登出（用于登录后补拉 profile） */
  softAuth?: boolean
}

export async function request<T>(
  path: string,
  options: RequestInit & RequestAuthOptions = {},
  auth = true,
  retried = false
): Promise<T> {
  const { softAuth, ...fetchOptions } = options
  const headers = new Headers(fetchOptions.headers || {})
  // FormData 须由浏览器自动带 multipart boundary，不可手动设 Content-Type
  if (
    !headers.has('Content-Type') &&
    fetchOptions.body &&
    !(fetchOptions.body instanceof FormData)
  ) {
    headers.set('Content-Type', 'application/json')
  }

  if (auth) {
    const { accessToken } = getTokens()
    if (!accessToken) {
      throw new ApiError(20001, '登录已过期，请重新登录')
    }
    headers.set('Authorization', `Bearer ${accessToken}`)
  }

  const res = await fetch(`${API_BASE_URL}${withCompanyQuery(path)}`, {
    ...fetchOptions,
    headers
  })

  if (res.status === 204 || res.status === 205) {
    return undefined as T
  }

  const json = await parseResponse<T>(res)

  if (res.status === 403 || FORBIDDEN_ERROR_CODES.has(json.code)) {
    handleForbidden(json, res)
  }

  if (auth && !retried && AUTH_ERROR_CODES.has(json.code)) {
    if (softAuth) {
      throw new ApiError(json.code, json.message || '登录已过期，请重新登录')
    }
    if (json.code === 20002) {
      await tryRefreshToken()
      return request<T>(path, options, auth, true)
    }
    handleAuthFailure(json, res)
  }

  if (json.code !== 0) {
    const errors = (json as ApiResponse<T> & { errors?: ApiError['errors'] }).errors
    throw new ApiError(json.code, json.message || '请求失败', errors, json.errorCode, json.data)
  }

  return json.data
}

export async function requestRaw<T>(
  path: string,
  options: RequestInit & RequestAuthOptions = {},
  auth = true
): Promise<T> {
  return request<T>(path, options, auth)
}
