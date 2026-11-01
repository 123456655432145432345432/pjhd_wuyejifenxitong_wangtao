import { API_PATH_PREFIX, API_REMOTE_BASE_URL } from '../config/api'
import type { ApiResponse } from './types'
import { getAccessToken, getRefreshToken } from '../stores/tokenStore'
import { isNativeApp } from '../utils/native'
import { formatMerchantDuplicateBindingMessage, API_ERROR_CODE } from '../constants/enums'

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
  /** v8.16 §102.5：从 94003+中文正则拆出的独立码，message 内带上限值「可提现余额不足（最多 ¥X）」 */
  94006: '可提现余额不足',
  97003: '未配置微信催缴模板',
  97004: '催缴预览已过期，请重新预览后再发送',
  97005: '该催缴批次已经提交，请勿重复发送',
  /** 2026-09-07 实测：催缴预览过期真实码（97004 为历史规划值） */
  96033: '催缴预览已过期，请重新预览后再发送',
  97006: '商品平台盘一级比例合计必须为 100%',
  97007: '配送费抽成比例不合法',
  97008: '满额门槛必须大于 0',
  97009: '订单金额快照已失效，请重新预览',
  97010: '订单已经完成分账',
  97011: '配送已经完成结算',
  97017: '催缴记录落库失败，请稍后重试',
  97012: '配送补贴承担方不合法',
  97013: '商家预计收入不足以覆盖配送补贴',
  97014: '分账金额不守恒',
  97015: '退款冲正已处理',
  97016: '分账比例不合法',
  97020: '订单已完成，不支持退款',
  97021: '分账账户未就绪',
  97022: '支付通道异常',
  /**
   * 后端 2026-10-30《遗留问题清单回复》§1：积分/物业币未启用的拒绝码。
   * 原规划占 97020/97021，与上两行存量码冲突，后端已改用 97070/97071。
   * 语义是「功能开关关闭导致的拒绝」，不是参数非法。
   */
  97070: '本小区未启用积分功能，请联系物业开通',
  97071: '本小区未启用物业币功能，请联系物业开通',
  97030: '个体负责人申请不存在',
  97031: '该申请已审核，不可重复审核',
  97033: '该物业公司存在关联数据，不可删除；如仅需隐藏请改用停用',
  /** v8.12.1 §60.16：一级代理（distributor）申请链路 */
  97040: '一级代理申请不存在',
  97041: '该申请已审核，不可重复审核',
  97042: '已有待审核申请，请勿重复提交',
  97043: '你已是一级代理，无需重复申请',
  70002: '订单当前状态不支持该操作',
  /** v8.19 §105.3：同一 X-Request-Id 首次请求仍在处理中，重复提交返回 409 */
  70003: '请求处理中，请稍后重试',
  70021: '已超时，系统已自动改派平台配送',
  70022: '本单无需配送（团购/食堂单）',
  70023: '请先选择履约方式',
  70024: '配送未完成，不可完成订单',
  70025: '已选择过履约方式，如需变更请联系物业',
  99002: '微信接口异常',
  99003: '电商收付通未配置或未启用',
  99004: '该商家暂未完成微信进件，请使用积分/物业币支付',
  99005: '微信平台证书未就绪，无法加密敏感信息',
  99006: '微信进件申请不存在',
  99007: '进件申请状态不允许该操作',
  99008: '该商家已存在进件申请',
  99009: '进件资料上传微信失败，请重试',
  99010: '商家核实时限已过，系统已自动通过',
  99011: '订单尚未通过商家核实',
  99012: '冻结期已过，不可申请退货',
  99013: '订单因商家超时未核实已自动通过',
  /** v8.4：价格区间；「非配送员承运单」改用 80020 */
  80010: '配送价格区间不存在',
  80020: '非配送员承运单，配送员不可抢单/操作',
  /** 履约：配送单不存在（404）；食堂绑定等场景后端也会复用 80021，优先展示 message */
  80021: '配送单不存在',
  80022: '该窗口已绑到这个主店',
  80023: '绑定关系不存在',
  30004: '该物业下已存在相同申请，请勿重复提交',
  60005: '商家已被踢出，无法继续经营，可重新申请入驻',
  60001: '商家不存在',
  90001: '特惠或不存在的资源（越权与不存在同码）',
  30001: '店主手机号未在该物业注册',
  90120: '账号存在关联业务数据，无法彻底删除，请改用禁用或软删除',
  90121: '账号已删除，无法再次操作',
  /** v8.9：单元楼长（§99.5） */
  91004: '楼长不存在或当前用户不是楼长',
  /** v8.11：一级代理 / 业主小店件数制（§60.12、§98） */
  60030: '该商家未开通一级代理权限',
  60031: '必须指定一级代理商家（distributorMerchantId）',
  60032: '拿货件数必须为不小于 1 的整数',
  60033: '一级代理货源库存不足',
  60034: '该上架存在未完成订单，不可取消',
  60035: '可售件数不足',
  60036: '业主小店店铺主体不存在',
  /** v8.11.1（2026-10-16）从 60030 拆出：商家未通过审核，不可管理一级代理权限 */
  60037: '仅审核通过的商家可管理一级代理权限',
  /** v8.11：物业公司经理（§100） */
  91005: '物业经理不存在或当前用户不是在职物业经理',
  91006: '该物业公司已存在在职物业经理',
  91007: '物业经理身份已停用',
  91008: '物业经理不可修改自己的分成比例',
  10001: '参数缺失',
  10002: '参数不合法',
  97001: '物业公司不存在',
  /** v8.14 社区论坛影子封禁（§C.15~C.17）——后端 2026-10-27 回复确认码值 */
  97050: '该用户已被禁言，无需重复操作',
  97051: '该用户没有被生效中的禁言记录',
  /** v8.24 管理端遗漏接口补录 */
  96011: '帖子不存在',
  80003: '该物业已存在配送规则'
}

const KNOWN_ERROR_CODE_MESSAGES: Record<string, string> = {
  [API_ERROR_CODE.CANTEEN_NOT_MAIN_MERCHANT]: '仅社区食堂主商家可调整可用充值额度',
  [API_ERROR_CODE.WECHAT_ECOMMERCE_NOT_CONFIGURED]: '电商收付通未配置或未启用',
  [API_ERROR_CODE.ORDER_PAY_UNAVAILABLE]: '该商家暂未完成微信进件，请使用积分/物业币支付',
  [API_ERROR_CODE.WECHAT_CERT_NOT_READY]: '微信平台证书未就绪，无法加密敏感信息',
  [API_ERROR_CODE.APPLYMENT_NOT_FOUND]: '微信进件申请不存在',
  [API_ERROR_CODE.APPLYMENT_STATE_INVALID]: '进件申请状态不允许该操作',
  [API_ERROR_CODE.APPLYMENT_ALREADY_EXISTS]: '该商家已存在进件申请',
  [API_ERROR_CODE.APPLYMENT_UPLOAD_FAILED]: '进件资料上传微信失败，请重试',
  [API_ERROR_CODE.TRANSFER_ACCOUNT_NOT_VERIFIED]: '收款账号未核验，无法转账',
  [API_ERROR_CODE.TRANSFER_NOT_FOUND]: '转账单不存在',
  [API_ERROR_CODE.TRANSFER_AMOUNT_INVALID]: '转账金额不合法',
  [API_ERROR_CODE.RECOVERY_NOT_FOUND]: '待追回台账记录不存在'
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
    return sanitizePayChannelMessage(
      e.message ||
        (e.errorCode ? KNOWN_ERROR_CODE_MESSAGES[e.errorCode] : '') ||
        KNOWN_ERROR_MESSAGES[e.code] ||
        fallback
    )
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

  // 物业公司列表/创建/详情/删除均为平台级或按路径 id 操作，禁止附带当前登录的 propertyCompanyId
  // （否则删除 pc_A 时会带 ?propertyCompanyId=pc_demo001 导致 400）
  if (
    pathname === '/admin/property-companies' ||
    pathname === '/property-companies' ||
    pathname.startsWith('/admin/property-companies/') ||
    pathname.startsWith('/property-companies/')
  ) {
    return path
  }

  // 按 id 操作的撤销/详情：勿附带 propertyCompanyId（测服 DELETE 个体负责人附带时曾 500）
  if (
    /^\/admin\/individual-leaders\/[^/]+$/.test(pathname) ||
    /^\/admin\/sector-leaders\/[^/]+$/.test(pathname) ||
    /^\/admin\/building-leaders\/[^/]+$/.test(pathname)
  ) {
    return path
  }

  // v8.12.1 §60.16：一级代理申请审核按 dap_ id 定位，附带当前物业会导致平台管理员串租户 404/97040
  if (/^\/admin\/distributor-applications\/[^/]+\/audit$/.test(pathname)) {
    return path
  }

  // v8.20 §106：平台交易明细为平台级账本。不传 propertyCompanyId 即「全部物业」，
  // 若在此注入头部物业切换器的当前物业，平台管理员选「全部」时也只会看到一家物业。
  // 该组接口的物业筛选由页面显式传参控制，故禁止自动注入。
  if (pathname.startsWith('/admin/transactions')) {
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
  /**
   * 可选鉴权（对应文档 Auth: Optional 的接口，如公开橱窗）：
   * 有 token 就带 Authorization，无 token 也照常发请求且不触发全局登出。
   * 后端是否真正放行匿名访问由网关白名单决定，前端不再自行假设。
   */
  optionalAuth?: boolean
}

export async function request<T>(
  path: string,
  options: RequestInit & RequestAuthOptions = {},
  auth = true,
  retried = false
): Promise<T> {
  const { softAuth, optionalAuth, ...fetchOptions } = options
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
    if (accessToken) {
      headers.set('Authorization', `Bearer ${accessToken}`)
    } else if (!optionalAuth) {
      throw new ApiError(20001, '登录已过期，请重新登录')
    }
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
    // 可选鉴权接口（公开橱窗等）：token 失效也只抛错，绝不把用户踢下线
    if (softAuth || optionalAuth) {
      throw new ApiError(json.code, json.message || '登录已过期，请重新登录', undefined, json.errorCode)
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

/**
 * CSV 等非 JSON 下载：走同一套鉴权与 propertyCompanyId 注入。
 * v8.20 §106：导出需要读取 X-Export-Rows / X-Export-Truncated 响应头，
 * 故保留返回原始 Response 的版本；requestBlob 复用它，行为不变。
 */
export async function requestBlobResponse(
  path: string,
  options: RequestInit = {},
  retried = false
): Promise<Response> {
  const headers = new Headers(options.headers || {})
  const { accessToken } = getTokens()
  if (!accessToken) {
    throw new ApiError(20001, '登录已过期，请重新登录')
  }
  headers.set('Authorization', `Bearer ${accessToken}`)
  if (!headers.has('Accept')) {
    headers.set('Accept', 'text/csv,application/json')
  }

  const res = await fetch(`${API_BASE_URL}${withCompanyQuery(path)}`, {
    ...options,
    headers
  })

  const contentType = res.headers.get('content-type') || ''
  const looksJson = contentType.includes('application/json')
  if (!res.ok || looksJson) {
    const json = await parseResponse<unknown>(res)
    if (res.status === 403 || FORBIDDEN_ERROR_CODES.has(json.code)) {
      handleForbidden(json, res)
    }
    if (!retried && AUTH_ERROR_CODES.has(json.code)) {
      if (json.code === 20002) {
        await tryRefreshToken()
        return requestBlobResponse(path, options, true)
      }
      handleAuthFailure(json, res)
    }
    if (json.code !== 0 || !res.ok) {
      const errors = (json as ApiResponse<unknown> & { errors?: ApiError['errors'] }).errors
      throw new ApiError(
        json.code || res.status,
        json.message || '导出失败',
        errors,
        json.errorCode,
        json.data
      )
    }
  }

  return res
}

export async function requestBlob(
  path: string,
  options: RequestInit = {},
  retried = false
): Promise<Blob> {
  const res = await requestBlobResponse(path, options, retried)
  return res.blob()
}

export async function requestRaw<T>(
  path: string,
  options: RequestInit & RequestAuthOptions = {},
  auth = true
): Promise<T> {
  return request<T>(path, options, auth)
}
