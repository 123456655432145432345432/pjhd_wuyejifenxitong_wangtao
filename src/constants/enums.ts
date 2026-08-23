/** 与《前后端对齐规范》§5.1 保持一致，API 交互使用 snake_case 字符串常量，前端仅做展示映射 */

export const MERCHANT_LEVEL = {
  OFFICIAL_CERTIFIED: 'official_certified',
  PROPERTY_CERTIFIED: 'property_certified',
  NORMAL: 'normal'
} as const

export const MERCHANT_LEVEL_LABEL: Record<string, string> = {
  official_certified: '官方认证',
  property_certified: '物业认证',
  normal: '普通商家'
}

export const MERCHANT_AUDIT_STATUS = {
  NONE: 'none',
  PENDING: 'pending_audit',
  APPROVED: 'approved',
  /** 历史遗留：新审核拒绝会物理删除记录，不再产生 rejected */
  REJECTED: 'rejected',
  KICKED: 'kicked',
  STOPPED: 'stopped',
  CLOSED: 'closed'
} as const

export const MERCHANT_AUDIT_STATUS_LABEL: Record<string, string> = {
  none: '未申请',
  pending_audit: '待审核',
  pending: '待审核',
  approved: '已通过',
  rejected: '已拒绝',
  kicked: '已被踢出',
  stopped: '已停用',
  closed: '已退出'
}

/** 体系 A：商品商家/技工/组长入驻待审（兼容后端偶发 `pending`） */
export function isMerchantOnboardingPending(status?: string | null) {
  return status === MERCHANT_AUDIT_STATUS.PENDING || status === 'pending'
}

/** 审核操作结果（POST /admin/merchants/{id}/audit 的 auditResult） */
export const AUDIT_RESULT = {
  APPROVED: 'approved',
  REJECTED: 'rejected'
} as const

/** 住户楼栋变更申请状态 */
export const BUILDING_CHANGE_STATUS = {
  PENDING: 'pending',
  PENDING_AUDIT: 'pending_audit',
  APPROVED: 'approved',
  REJECTED: 'rejected'
} as const

export const BUILDING_CHANGE_STATUS_LABEL: Record<string, string> = {
  pending: '待审核',
  pending_audit: '待审核',
  approved: '已通过',
  rejected: '已拒绝'
}

export const BUILDING_CHANGE_STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  { value: BUILDING_CHANGE_STATUS.PENDING, label: '待审核' },
  { value: BUILDING_CHANGE_STATUS.APPROVED, label: '已通过' },
  { value: BUILDING_CHANGE_STATUS.REJECTED, label: '已拒绝' }
]

/** [ENUM] 一级代理（个体负责人）住户申请状态，对齐住户端 pending / approved / rejected */
export const INDIVIDUAL_LEADER_APPLICATION_STATUS = {
  PENDING: 'pending',
  PENDING_AUDIT: 'pending_audit',
  APPROVED: 'approved',
  REJECTED: 'rejected'
} as const

export const INDIVIDUAL_LEADER_APPLICATION_STATUS_LABEL: Record<string, string> = {
  pending: '待审核',
  pending_audit: '待审核',
  approved: '已通过',
  rejected: '已拒绝'
}

export const INDIVIDUAL_LEADER_APPLICATION_STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  { value: INDIVIDUAL_LEADER_APPLICATION_STATUS.PENDING, label: '待审核' },
  { value: INDIVIDUAL_LEADER_APPLICATION_STATUS.APPROVED, label: '已通过' },
  { value: INDIVIDUAL_LEADER_APPLICATION_STATUS.REJECTED, label: '已拒绝' }
]

export function isIndividualLeaderApplicationPending(status?: string | null) {
  return (
    status === INDIVIDUAL_LEADER_APPLICATION_STATUS.PENDING ||
    status === INDIVIDUAL_LEADER_APPLICATION_STATUS.PENDING_AUDIT
  )
}

/** 小区房号状态（§84 community_rooms） */
export const COMMUNITY_ROOM_STATUS = {
  VACANT: 'vacant',
  OCCUPIED: 'occupied',
  LOCKED: 'locked'
} as const

export const COMMUNITY_ROOM_STATUS_LABEL: Record<string, string> = {
  vacant: '空置',
  occupied: '已入住',
  locked: '锁定'
}

export const COMMUNITY_ROOM_STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  { value: COMMUNITY_ROOM_STATUS.VACANT, label: '空置' },
  { value: COMMUNITY_ROOM_STATUS.OCCUPIED, label: '已入住' },
  { value: COMMUNITY_ROOM_STATUS.LOCKED, label: '锁定' }
]

export const MERCHANT_STATUS = {
  ACTIVE: 'active',
  FROZEN: 'frozen',
  DISABLED: 'disabled',
  INACTIVE: 'inactive',
  STOPPED: 'stopped',
  KICKED: 'kicked',
  CLOSED: 'closed',
  /** GET /merchants 管理端筛选码（§7.1） */
  QUIT: 'quit'
} as const

export const MERCHANT_STATUS_LABEL: Record<string, string> = {
  active: '营业中',
  frozen: '已冻结',
  disabled: '已禁用',
  inactive: '已停业',
  stopped: '已停用',
  kicked: '已踢出',
  closed: '已退出',
  quit: '已退出'
}

/** 被踢 / 停用 / 退出：终态，不得再展示「已通过 / 营业中」 */
export function isMerchantTerminalStatus(status?: string | null) {
  return (
    status === MERCHANT_STATUS.KICKED ||
    status === MERCHANT_STATUS.STOPPED ||
    status === MERCHANT_STATUS.CLOSED ||
    status === MERCHANT_STATUS.QUIT
  )
}

export function canKickMerchant(status?: string | null) {
  return !isMerchantTerminalStatus(status)
}

/** 商家来源（v4.1 merchants.merchant_source） */
export const MERCHANT_SOURCE = {
  PLATFORM: 'platform',
  GROUP_LEADER: 'group_leader',
  TECHNICIAN: 'technician'
} as const

export const MERCHANT_SOURCE_LABEL: Record<string, string> = {
  platform: '平台入驻',
  group_leader: '组长小店',
  technician: '技工档口'
}

export const MERCHANT_SOURCE_OPTIONS = [
  { value: '', label: '全部来源' },
  ...Object.entries(MERCHANT_SOURCE_LABEL).map(([value, label]) => ({ value, label }))
]

/** 社区服务提供者类型（GET /services?providerType=） */
export const PROVIDER_TYPE = {
  MERCHANT: 'merchant',
  RESIDENT: 'resident',
  INDIVIDUAL_LEADER: 'individual_leader',
  TECHNICIAN: 'technician'
} as const

export const PROVIDER_TYPE_LABEL: Record<string, string> = {
  merchant: '商家',
  resident: '居民',
  individual_leader: '个体负责人',
  technician: '技工'
}

export const PROVIDER_TYPE_OPTIONS = [
  { value: '', label: '全部提供者' },
  ...Object.entries(PROVIDER_TYPE_LABEL).map(([value, label]) => ({ value, label }))
]

export const ANNOUNCEMENT_TYPE = {
  PROPERTY: 'property',
  COMMUNITY: 'community',
  PLATFORM: 'platform',
  SYSTEM: 'system',
  MERCHANT: 'merchant',
  ACTIVITY: 'activity'
} as const

export const ANNOUNCEMENT_TYPE_LABEL: Record<string, string> = {
  [ANNOUNCEMENT_TYPE.PROPERTY]: '物业公告',
  [ANNOUNCEMENT_TYPE.COMMUNITY]: '社区公告',
  [ANNOUNCEMENT_TYPE.PLATFORM]: '平台公告',
  [ANNOUNCEMENT_TYPE.SYSTEM]: '系统公告',
  [ANNOUNCEMENT_TYPE.MERCHANT]: '商家公告',
  [ANNOUNCEMENT_TYPE.ACTIVITY]: '活动组公告',
  property_announcement: '物业公告',
  community_announcement: '社区公告',
  platform_announcement: '平台公告',
  system_announcement: '系统公告',
  merchant_announcement: '商家公告',
  activity_announcement: '活动组公告',
  物业公告: '物业公告',
  社区公告: '社区公告',
  平台公告: '平台公告',
  统筹公告: '平台公告',
  统筹: '平台公告',
  系统公告: '系统公告',
  商家公告: '商家公告',
  活动组公告: '活动组公告'
}

const ANNOUNCEMENT_TYPE_ALIASES: Record<string, string> = {
  property_announcement: ANNOUNCEMENT_TYPE.PROPERTY,
  community_announcement: ANNOUNCEMENT_TYPE.COMMUNITY,
  platform_announcement: ANNOUNCEMENT_TYPE.PLATFORM,
  system_announcement: ANNOUNCEMENT_TYPE.SYSTEM,
  merchant_announcement: ANNOUNCEMENT_TYPE.MERCHANT,
  activity_announcement: ANNOUNCEMENT_TYPE.ACTIVITY,
  物业公告: ANNOUNCEMENT_TYPE.PROPERTY,
  社区公告: ANNOUNCEMENT_TYPE.COMMUNITY,
  平台公告: ANNOUNCEMENT_TYPE.PLATFORM,
  统筹公告: ANNOUNCEMENT_TYPE.PLATFORM,
  统筹: ANNOUNCEMENT_TYPE.PLATFORM,
  系统公告: ANNOUNCEMENT_TYPE.SYSTEM,
  商家公告: ANNOUNCEMENT_TYPE.MERCHANT,
  活动组公告: ANNOUNCEMENT_TYPE.ACTIVITY
}

export function normalizeAnnouncementType(value?: string) {
  if (!value) return ANNOUNCEMENT_TYPE.PROPERTY
  if (Object.values(ANNOUNCEMENT_TYPE).includes(value as (typeof ANNOUNCEMENT_TYPE)[keyof typeof ANNOUNCEMENT_TYPE])) {
    return value
  }
  return ANNOUNCEMENT_TYPE_ALIASES[value] || value
}

export const ANNOUNCEMENT_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ARCHIVED: 'archived'
} as const

export const ANNOUNCEMENT_STATUS_LABEL: Record<string, string> = {
  draft: '草稿',
  published: '已发布',
  archived: '已归档'
}

export const ORDER_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  PENDING_VERIFICATION: 'pending_verification',
  VERIFIED: 'verified',
  DELIVERING: 'delivering',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  REFUNDING: 'refunding',
  REFUNDED: 'refunded',
  REFUND_REJECTED: 'refund_rejected'
} as const

export const ORDER_STATUS_LABEL: Record<string, string> = {
  pending: '待支付',
  paid: '已支付',
  pending_verification: '待商家核实',
  verified: '已核实（冻结中）',
  delivering: '配送中',
  completed: '已完成',
  cancelled: '已取消',
  refunding: '退款中',
  refunded: '已退款',
  refund_rejected: '退货已驳回'
}

export const ORDER_STATUS_OPTIONS = [
  { value: ORDER_STATUS.PENDING, label: ORDER_STATUS_LABEL.pending },
  { value: ORDER_STATUS.PAID, label: ORDER_STATUS_LABEL.paid },
  { value: ORDER_STATUS.PENDING_VERIFICATION, label: ORDER_STATUS_LABEL.pending_verification },
  { value: ORDER_STATUS.VERIFIED, label: ORDER_STATUS_LABEL.verified },
  { value: ORDER_STATUS.DELIVERING, label: ORDER_STATUS_LABEL.delivering },
  { value: ORDER_STATUS.COMPLETED, label: ORDER_STATUS_LABEL.completed },
  { value: ORDER_STATUS.CANCELLED, label: ORDER_STATUS_LABEL.cancelled },
  { value: ORDER_STATUS.REFUNDING, label: ORDER_STATUS_LABEL.refunding },
  { value: ORDER_STATUS.REFUNDED, label: ORDER_STATUS_LABEL.refunded },
  { value: ORDER_STATUS.REFUND_REJECTED, label: ORDER_STATUS_LABEL.refund_rejected }
]

/** 管理端退货审核 POST /admin/orders/refunds/{orderId}/audit 的 action */
export const ORDER_REFUND_AUDIT_ACTION = {
  APPROVE: 'approve',
  REJECT: 'reject'
} as const

export const ORDER_REFUND_FILTER_OPTIONS = [
  { value: '', label: '全部' },
  { value: ORDER_STATUS.REFUNDING, label: '待审核' },
  { value: ORDER_STATUS.REFUNDED, label: '已通过' },
  { value: ORDER_STATUS.REFUND_REJECTED, label: '已驳回' }
]

const ORDER_REFUND_STATUS_ALIASES: Record<string, string> = {
  refunding: ORDER_STATUS.REFUNDING,
  退款中: ORDER_STATUS.REFUNDING,
  待审核: ORDER_STATUS.REFUNDING,
  pending_audit: ORDER_STATUS.REFUNDING,
  pending_review: ORDER_STATUS.REFUNDING,
  refunded: ORDER_STATUS.REFUNDED,
  已退款: ORDER_STATUS.REFUNDED,
  已通过: ORDER_STATUS.REFUNDED,
  refund_rejected: ORDER_STATUS.REFUND_REJECTED,
  已驳回: ORDER_STATUS.REFUND_REJECTED,
  退货已驳回: ORDER_STATUS.REFUND_REJECTED
}

export function normalizeOrderRefundStatus(value?: string | null) {
  const key = (value || '').trim()
  if (!key) return ''
  return ORDER_REFUND_STATUS_ALIASES[key] || ORDER_REFUND_STATUS_ALIASES[key.toLowerCase()] || key
}

export function isOrderRefundPending(status?: string | null) {
  const normalized = normalizeOrderRefundStatus(status)
  return Boolean(normalized) && normalized !== ORDER_STATUS.REFUNDED && normalized !== ORDER_STATUS.REFUND_REJECTED
}

export function isOrderPendingVerification(status?: string | null) {
  return status === ORDER_STATUS.PENDING_VERIFICATION
}

/** 订单履约方式（API v5.7 §68） */
export const FULFILLMENT_MODE = {
  PENDING_CHOICE: 'pending_choice',
  COURIER_HALL: 'courier_hall',
  MERCHANT_SELF: 'merchant_self',
  NONE: 'none'
} as const

export const FULFILLMENT_MODE_LABEL: Record<string, string> = {
  pending_choice: '待选择配送方式',
  courier_hall: '平台配送（抢单大厅）',
  merchant_self: '商家自配',
  none: '无需配送'
}

export const FULFILLMENT_MODE_OPTIONS = [
  { value: '', label: '全部履约' },
  ...Object.entries(FULFILLMENT_MODE_LABEL).map(([value, label]) => ({ value, label }))
]

/** 配送承运方（API v5.7 §68.5） */
export const CARRIER_TYPE = {
  COURIER: 'courier',
  MERCHANT: 'merchant'
} as const

export const CARRIER_TYPE_LABEL: Record<string, string> = {
  courier: '配送员',
  merchant: '商家自配'
}

export const CARRIER_TYPE_OPTIONS = [
  { value: '', label: '全部承运' },
  ...Object.entries(CARRIER_TYPE_LABEL).map(([value, label]) => ({ value, label }))
]

/** 履约选择审计 action（fulfillment_choice_logs） */
export const FULFILLMENT_CHOICE_ACTION = {
  CHOOSE_MERCHANT_SELF: 'choose_merchant_self',
  CHOOSE_COURIER_HALL: 'choose_courier_hall',
  TIMEOUT: 'timeout',
  OVERRIDE: 'override'
} as const

export const FULFILLMENT_CHOICE_ACTION_LABEL: Record<string, string> = {
  choose_merchant_self: '商家选自配',
  choose_courier_hall: '商家发大厅',
  choose_self: '商家选自配',
  choose_hall: '商家发大厅',
  timeout: '超时自动发大厅',
  override: '管理员改派'
}

export const PAYMENT_METHOD = {
  MIXED: 'mixed',
  POINT: 'point',
  COIN: 'coin',
  PROPERTY_COIN: 'property_coin',
  CASH: 'cash',
  WECHAT: 'wechat',
  ALIPAY: 'alipay'
} as const

export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  mixed: '混合支付',
  point: '积分支付',
  coin: '物业币支付',
  property_coin: '物业币支付',
  cash: '现金',
  wechat: '微信支付',
  alipay: '支付宝'
}

/** 商家广告投放支付方式（§59 按天计价） */
export const MERCHANT_AD_PAYMENT_METHOD = {
  FREE: 'free',
  COIN: 'coin',
  POINT: 'point',
  WECHAT: 'wechat',
  MOCK: 'mock'
} as const

export const MERCHANT_AD_PAYMENT_METHOD_LABEL: Record<string, string> = {
  free: '免费额度',
  coin: '物业币',
  point: '商家积分',
  wechat: '微信支付',
  mock: '模拟支付'
}

export const MERCHANT_AD_PAYMENT_METHOD_OPTIONS = Object.entries(
  MERCHANT_AD_PAYMENT_METHOD_LABEL
).map(([value, label]) => ({ value, label }))

/** 业主商户对外展示（§60.9） */
export const RESIDENT_SHOP_VISIBILITY = {
  PUBLIC: 'public',
  PRIVATE: 'private'
} as const

export const RESIDENT_SHOP_VISIBILITY_LABEL: Record<string, string> = {
  public: '对外展示',
  private: '不对外'
}

/** 体系 B：业主商户申请状态（§60；缴保证金后偶发 `pending_review`） */
export const RESIDENT_MERCHANT_STATUS = {
  PENDING_DEPOSIT: 'pending_deposit',
  PENDING_AUDIT: 'pending_audit',
  PENDING_REVIEW: 'pending_review',
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  QUITTING: 'quitting',
  CLOSED: 'closed',
  REJECTED: 'rejected'
} as const

export const RESIDENT_MERCHANT_STATUS_LABEL: Record<string, string> = {
  pending_deposit: '待缴保证金',
  pending_audit: '待审核',
  pending_review: '待审核',
  active: '营业中',
  suspended: '已暂停',
  quitting: '退出冷却中',
  closed: '已关闭',
  rejected: '已拒绝'
}

export const RESIDENT_MERCHANT_STATUS_OPTIONS = [
  { value: RESIDENT_MERCHANT_STATUS.PENDING_AUDIT, label: '待审核' },
  { value: RESIDENT_MERCHANT_STATUS.PENDING_DEPOSIT, label: '待缴保证金' },
  { value: RESIDENT_MERCHANT_STATUS.ACTIVE, label: '营业中' },
  { value: RESIDENT_MERCHANT_STATUS.REJECTED, label: '已拒绝' }
]

export function isResidentMerchantPendingAudit(status?: string | null) {
  return (
    status === RESIDENT_MERCHANT_STATUS.PENDING_AUDIT ||
    status === RESIDENT_MERCHANT_STATUS.PENDING_REVIEW
  )
}

export const VOTE_OPTION = {
  SUPPORT: 'support',
  OPPOSE: 'oppose',
  ABSTAIN: 'abstain'
} as const

export const VOTE_OPTION_LABEL: Record<string, string> = {
  support: '支持',
  oppose: '反对',
  abstain: '弃权'
}

/** 主角色（UserRole）。物业领导/操作员不是独立主角色，见 PROPERTY_SUB_ROLE */
export const USER_ROLE = {
  RESIDENT: 'resident',
  PROPERTY_ADMIN: 'property_admin',
  PLATFORM_ADMIN: 'platform_admin',
  MERCHANT: 'merchant',
  COURIER: 'courier',
  COORDINATOR: 'coordinator',
  SECTOR_LEADER: 'sector_leader',
  INDIVIDUAL_LEADER: 'individual_leader',
  ACTIVITY_LEADER: 'activity_leader',
  TECHNICIAN: 'technician'
} as const

/**
 * 物业管理员子角色（property_sub_role）
 * 主角色均为 property_admin，通过本字段区分领导与操作员
 */
export const PROPERTY_SUB_ROLE = {
  LEADER: 'property_leader',
  OPERATOR: 'property_operator'
} as const

export const PROPERTY_SUB_ROLE_LABEL: Record<string, string> = {
  [PROPERTY_SUB_ROLE.LEADER]: '物业领导',
  [PROPERTY_SUB_ROLE.OPERATOR]: '物业管理员'
}

export const PROPERTY_SUB_ROLE_OPTIONS = [
  { value: PROPERTY_SUB_ROLE.LEADER, label: PROPERTY_SUB_ROLE_LABEL[PROPERTY_SUB_ROLE.LEADER] },
  { value: PROPERTY_SUB_ROLE.OPERATOR, label: PROPERTY_SUB_ROLE_LABEL[PROPERTY_SUB_ROLE.OPERATOR] }
]

export const MESSAGE_TYPE = {
  PROPERTY: 'property_message',
  PLATFORM: 'platform_message',
  SYSTEM: 'system_message',
  COMMUNITY: 'community_message',
  RESIDENT: 'resident_message',
  TECHNICIAN: 'technician_message',
  OFFICIAL: 'official_message',
  MERCHANT_AD: 'merchant_ad',
  SERVICE_REQUEST: 'service_request'
} as const

export const MESSAGE_TYPE_LABEL: Record<string, string> = {
  property_message: '物业消息',
  platform_message: '统筹消息',
  system_message: '系统消息',
  community_message: '社区消息',
  resident_message: '业主消息',
  technician_message: '技工消息',
  official_message: '官方消息',
  merchant_ad: '商家广告',
  service_request: '服务需求'
}

/** 官方定向消息发送方身份 */
export const OFFICIAL_SENDER_TYPE = {
  COMMUNITY: 'community',
  PROPERTY: 'property',
  PLATFORM: 'platform',
  COORDINATOR: 'coordinator'
} as const

export const OFFICIAL_SENDER_TYPE_LABEL: Record<string, string> = {
  community: '社区官方',
  property: '物业官方',
  platform: '平台官方',
  coordinator: '统筹'
}

export const OFFICIAL_SENDER_TYPE_OPTIONS = Object.entries(OFFICIAL_SENDER_TYPE_LABEL).map(
  ([value, label]) => ({ value, label })
)

/** 定向推送性别筛选 */
export const FILTER_GENDER = {
  MALE: 'male',
  FEMALE: 'female',
  ALL: 'all'
} as const

export const FILTER_GENDER_LABEL: Record<string, string> = {
  male: '男',
  female: '女',
  all: '全部'
}

export const FILTER_GENDER_OPTIONS = Object.entries(FILTER_GENDER_LABEL).map(([value, label]) => ({
  value,
  label
}))

/** 定向推送已读状态 */
export const READ_STATUS = {
  READ: 'read',
  UNREAD: 'unread'
} as const

export const READ_STATUS_LABEL: Record<string, string> = {
  read: '已读',
  unread: '未读'
}

/** 住户 gender 数字编码 → 定向推送 FILTER_GENDER */
export function normalizeFilterGender(value?: string | number | null): string | undefined {
  if (value === null || value === undefined || value === '') return undefined
  if (value === 1 || value === '1' || value === FILTER_GENDER.MALE) return FILTER_GENDER.MALE
  if (value === 2 || value === '2' || value === FILTER_GENDER.FEMALE) return FILTER_GENDER.FEMALE
  if (value === 0 || value === '0' || value === FILTER_GENDER.ALL) return undefined
  return typeof value === 'string' ? value : undefined
}

/** 公告投递渠道 */
export const DELIVERY_CHANNEL = {
  ANNOUNCEMENT_BOARD: 'announcement_board',
  CHAT: 'chat',
  BOTH: 'both'
} as const

export const DELIVERY_CHANNEL_LABEL: Record<string, string> = {
  announcement_board: '仅公告栏',
  chat: '仅聊天列表',
  both: '公告栏 + 聊天'
}

export const DELIVERY_CHANNEL_OPTIONS = Object.entries(DELIVERY_CHANNEL_LABEL).map(
  ([value, label]) => ({ value, label })
)

/** 社区对物业的权限级别 */
export const COMMUNITY_PERMISSION_LEVEL = {
  READ_ONLY: 'read_only',
  OPERATE: 'operate'
} as const

export const COMMUNITY_PERMISSION_LEVEL_LABEL: Record<string, string> = {
  read_only: '只读',
  operate: '可操作'
}

export const COMMUNITY_PERMISSION_LEVEL_OPTIONS = Object.entries(
  COMMUNITY_PERMISSION_LEVEL_LABEL
).map(([value, label]) => ({ value, label }))

/** 商家消息服务半径 */
export const SERVICE_RADIUS = {
  KM1: '1km',
  KM3: '3km',
  KM5: '5km',
  DISTRICT: 'district',
  CITY: 'city'
} as const

export const SERVICE_RADIUS_LABEL: Record<string, string> = {
  '1km': '1公里',
  '3km': '3公里',
  '5km': '5公里',
  district: '本区',
  city: '本市'
}

export const SERVICE_RADIUS_OPTIONS = Object.entries(SERVICE_RADIUS_LABEL).map(([value, label]) => ({
  value,
  label
}))

/** 服务需求单状态 */
export const SERVICE_REQUEST_STATUS = {
  MATCHING: 'matching',
  PENDING_MERCHANT: 'pending_merchant_response',
  NEGOTIATING: 'negotiating',
  QUOTED: 'quoted',
  PAID: 'paid',
  CLOSED: 'closed',
  CANCELLED: 'cancelled'
} as const

export const SERVICE_REQUEST_STATUS_LABEL: Record<string, string> = {
  matching: '匹配中',
  pending_merchant_response: '待商家响应',
  negotiating: '协商中',
  quoted: '已报价',
  paid: '已支付',
  closed: '已关闭',
  cancelled: '已取消'
}

/** 技工工单状态 */
export const TECHNICIAN_TASK_STATUS = {
  PENDING: 'pending',
  ASSIGNED: 'assigned',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
} as const

export const TECHNICIAN_TASK_STATUS_LABEL: Record<string, string> = {
  pending: '待接单',
  assigned: '已分配',
  in_progress: '进行中',
  completed: '已完成',
  cancelled: '已取消'
}

/** 咨询领域 */
export const CONSULTATION_CATEGORY = {
  MEDICAL: 'medical',
  EDUCATION: 'education',
  ELDERLY: 'elderly'
} as const

export const CONSULTATION_CATEGORY_LABEL: Record<string, string> = {
  medical: '医疗',
  education: '教育',
  elderly: '养老'
}

export const CONSULTATION_CATEGORY_OPTIONS = Object.entries(CONSULTATION_CATEGORY_LABEL).map(
  ([value, label]) => ({ value, label })
)

/** 二期业务错误码提示 */
export const PHASE2_ERROR_MESSAGE: Record<number, string> = {
  70021: '已超过履约选择时限，无法再选择',
  70022: '本单无需配送，不可选择履约方式（团购单）',
  70023: '请先选择履约方式',
  70024: '配送未完成，不可完成订单',
  70025: '履约方式已锁定，不可变更',
  80010: '非配送员承运单，配送员不可抢单/操作',
  90101: '同一用户当日定向消息已达上限',
  90102: '物业公司当日定向推送任务已达上限',
  90103: '今日新聊人数已达上限',
  90104: '商家响应已超时',
  90105: '本周免费额度已用完，请选择付费投放',
  90106: '保证金未缴纳或状态不允许',
  90107: '存在进行中订单，无法退出',
  90108: '所有匹配商家均未响应，需求已关闭',
  90109: '超出管辖范围',
  90110: '该咨询师暂不可预约',
  90111: '该店铺暂未对外展示',
  90120: '账号存在关联业务数据，无法彻底删除，请改用禁用或软删除',
  90121: '账号已删除，无法再次操作',
  99002: '微信支付接口异常',
  99003: '微信支付签名校验失败',
  99004: '微信支付未配置',
  99010: '商家核实时限已过，系统已自动通过',
  99011: '订单尚未通过商家核实',
  99012: '冻结期已过，不可申请退货',
  99013: '订单因商家超时未核实已自动通过'
}

/** 商家入驻/接单资质（v4.1.1） */
export const MERCHANT_GATE_ERROR_MESSAGE: Record<number, string> = {
  60002: '入驻审核中，暂不能接单，请查看入驻进度',
  60005: '商家已被踢出，无法继续经营，可重新申请入驻'
}

export const RESIDENT_USER_TYPE = {
  OWNER: 'owner',
  TENANT: 'tenant'
} as const

export const RESIDENT_USER_TYPE_LABEL: Record<string, string> = {
  owner: '业主',
  tenant: '租住人员'
}

export const RESIDENT_USER_TYPE_OPTIONS = [
  { value: '', label: '全部身份' },
  { value: RESIDENT_USER_TYPE.OWNER, label: '业主' },
  { value: RESIDENT_USER_TYPE.TENANT, label: '租住人员' }
]

/** 家庭成员关系（API §3.5） */
export const FAMILY_RELATION = {
  OWNER: 'owner',
  SPOUSE: 'spouse',
  CHILD: 'child',
  PARENT: 'parent',
  SIBLING: 'sibling',
  OTHER: 'other'
} as const

export const FAMILY_RELATION_LABEL: Record<string, string> = {
  owner: '户主',
  spouse: '配偶',
  child: '子女',
  parent: '父母',
  sibling: '兄弟姐妹',
  other: '其他'
}

export const FAMILY_RELATION_OPTIONS = [
  { value: FAMILY_RELATION.SPOUSE, label: '配偶' },
  { value: FAMILY_RELATION.CHILD, label: '子女' },
  { value: FAMILY_RELATION.PARENT, label: '父母' },
  { value: FAMILY_RELATION.SIBLING, label: '兄弟姐妹' },
  { value: FAMILY_RELATION.OTHER, label: '其他' }
]

/** 商家分类字典兜底（与 GET /merchant-categories 对齐；接口优先） */
export const MERCHANT_CATEGORY_NAMES = [
  '外卖',
  '周围商家',
  '自营',
  '农家',
  '外卖小吃',
  '团购',
  '酒店民宿',
  '洗浴汗蒸',
  '按摩足疗',
  '美食',
  '外卖小区'
] as const

export const MERCHANT_CATEGORY_OPTIONS = MERCHANT_CATEGORY_NAMES.map((name) => ({
  value: name,
  label: name
}))

export const RESIDENT_STATUS = {
  ACTIVE: 'active',
  FROZEN: 'frozen',
  DISABLED: 'disabled'
} as const

export const RESIDENT_STATUS_LABEL: Record<string, string> = {
  active: '正常',
  frozen: '已冻结',
  disabled: '已禁用'
}

/** 通用实体启用状态（物业公司等资源的 status 查询参数） */
export const ENTITY_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive'
} as const

export const ENTITY_STATUS_LABEL: Record<string, string> = {
  [ENTITY_STATUS.ACTIVE]: '启用',
  [ENTITY_STATUS.INACTIVE]: '停用'
}

export const ENTITY_STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  { value: ENTITY_STATUS.ACTIVE, label: '启用' },
  { value: ENTITY_STATUS.INACTIVE, label: '停用' }
]

export const PERMISSION_MODULE_LABEL: Record<string, string> = {
  resident: '住户管理',
  merchant: '商家管理',
  reports: '报表数据',
  announcements: '通告管理',
  point_pool: '积分池',
  coordinator: '统筹管理',
  delivery: '配送管理',
  property_company: '物业公司',
  permission: '权限管理',
  activity: '活动管理',
  notice: '通知收集',
  refund: '退款审批',
  coin: '物业币'
}

export const ROLE_LABEL: Record<string, string> = {
  [USER_ROLE.PLATFORM_ADMIN]: '平台管理员',
  [USER_ROLE.PROPERTY_ADMIN]: '物业管理员',
  [USER_ROLE.RESIDENT]: '住户',
  [USER_ROLE.MERCHANT]: '商家',
  [USER_ROLE.COURIER]: '快递员',
  [USER_ROLE.COORDINATOR]: '统筹负责人',
  [USER_ROLE.SECTOR_LEADER]: '板块负责人',
  [USER_ROLE.INDIVIDUAL_LEADER]: '个体负责人',
  [USER_ROLE.ACTIVITY_LEADER]: '活动组组长',
  [USER_ROLE.TECHNICIAN]: '技工',
  /** 兼容：子角色值被误当作主角色返回时的展示 */
  [PROPERTY_SUB_ROLE.LEADER]: '物业领导',
  [PROPERTY_SUB_ROLE.OPERATOR]: '物业管理员',
  community_manager: '社区管理员',
  property_employee: '物业员工'
}

/** 展示用角色名：property_admin 优先按 property_sub_role 显示 */
export function getUserRoleDisplayLabel(role?: string | null, propertySubRole?: string | null) {
  if (role === USER_ROLE.PROPERTY_ADMIN && propertySubRole) {
    return getEnumLabel(PROPERTY_SUB_ROLE_LABEL, propertySubRole, ROLE_LABEL[USER_ROLE.PROPERTY_ADMIN])
  }
  return getEnumLabel(ROLE_LABEL, role, '')
}

export const SERVICE_CATEGORY = {
  CLEANING_REPAIR: 'cleaning_repair',
  CANTEEN: 'canteen',
  TUTORING: 'tutoring',
  ELDERLY_CARE: 'elderly_care',
  MEDICAL: 'medical',
  PET_MEDICAL: 'pet_medical',
  LIFE_SERVICE: 'life_service',
  DATING: 'dating'
} as const

export const SERVICE_CATEGORY_LABEL: Record<string, string> = {
  cleaning_repair: '清洁维修',
  canteen: '食堂',
  tutoring: '托管辅导',
  elderly_care: '养老',
  medical: '医疗',
  pet_medical: '宠物医疗',
  life_service: '生活服务',
  dating: '婚恋'
}

export const SERVICE_CATEGORY_OPTIONS = Object.entries(SERVICE_CATEGORY_LABEL).map(([value, label]) => ({
  value,
  label
}))

/** 板块类型（GET/POST /admin/sector-leaders） */
export const SECTOR_TYPE = {
  CLEANING: 'cleaning',
  REPAIR: 'repair',
  SECURITY: 'security',
  GREENING: 'greening',
  OTHER: 'other'
} as const

export const SECTOR_TYPE_LABEL: Record<string, string> = {
  cleaning: '保洁',
  repair: '维修',
  security: '安保',
  greening: '绿化',
  other: '其他'
}

export const SECTOR_TYPE_OPTIONS = [
  { value: SECTOR_TYPE.CLEANING, label: '保洁' },
  { value: SECTOR_TYPE.REPAIR, label: '维修' },
  { value: SECTOR_TYPE.SECURITY, label: '安保' },
  { value: SECTOR_TYPE.GREENING, label: '绿化' },
  { value: SECTOR_TYPE.OTHER, label: '其他' }
]

/** 特惠推送 targetType（API 值，与 SpecialOfferService.normalizeTargetType 对齐） */
export const SPECIAL_OFFER_TARGET_TYPE = {
  ALL: 'all',
  TAG: 'tag',
  BUILDING: 'building',
  ROLE: 'role'
} as const

export const SPECIAL_OFFER_TARGET_TYPE_LABEL: Record<string, string> = {
  [SPECIAL_OFFER_TARGET_TYPE.ALL]: '全体业主',
  [SPECIAL_OFFER_TARGET_TYPE.TAG]: '标签',
  [SPECIAL_OFFER_TARGET_TYPE.BUILDING]: '指定小区',
  [SPECIAL_OFFER_TARGET_TYPE.ROLE]: '指定商户',
  全体业主: '全体业主',
  指定小区: '指定小区',
  指定商户: '指定商户',
  全部: '全体业主',
  标签: '标签',
  小区: '指定小区',
  '商户/角色': '指定商户',
  community: '指定小区',
  merchant: '指定商户'
}

export const SPECIAL_OFFER_TARGET_TYPE_OPTIONS = [
  { value: SPECIAL_OFFER_TARGET_TYPE.ALL, label: '全体业主' },
  { value: SPECIAL_OFFER_TARGET_TYPE.BUILDING, label: '指定小区' },
  { value: SPECIAL_OFFER_TARGET_TYPE.ROLE, label: '指定商户' }
]

/** 统筹特惠推送可选 targetType（不可指定小区） */
export const SPECIAL_OFFER_COORDINATOR_TARGET_TYPE_OPTIONS = [
  { value: SPECIAL_OFFER_TARGET_TYPE.ALL, label: '全体业主' },
  { value: SPECIAL_OFFER_TARGET_TYPE.ROLE, label: '指定商户' }
]

const SPECIAL_OFFER_TARGET_TYPE_ALIASES: Record<string, string> = {
  全体业主: SPECIAL_OFFER_TARGET_TYPE.ALL,
  指定小区: SPECIAL_OFFER_TARGET_TYPE.BUILDING,
  指定商户: SPECIAL_OFFER_TARGET_TYPE.ROLE,
  全部: SPECIAL_OFFER_TARGET_TYPE.ALL,
  标签: SPECIAL_OFFER_TARGET_TYPE.TAG,
  小区: SPECIAL_OFFER_TARGET_TYPE.BUILDING,
  '商户/角色': SPECIAL_OFFER_TARGET_TYPE.ROLE,
  community: SPECIAL_OFFER_TARGET_TYPE.BUILDING,
  merchant: SPECIAL_OFFER_TARGET_TYPE.ROLE
}

export const SPECIAL_OFFER_DISCOUNT_TYPE = {
  FIXED: 'fixed',
  PERCENT: 'percent'
} as const

export const SPECIAL_OFFER_DISCOUNT_TYPE_LABEL: Record<string, string> = {
  fixed: '固定金额',
  percent: '百分比'
}

export const SPECIAL_OFFER_STATUS = {
  DRAFT: 'draft',
  PENDING_PUBLISH: 'active',
  PUBLISHED: 'published',
  ENDED: 'ended',
  ARCHIVED: 'archived'
} as const

export const SPECIAL_OFFER_STATUS_LABEL: Record<string, string> = {
  [SPECIAL_OFFER_STATUS.DRAFT]: '草稿',
  [SPECIAL_OFFER_STATUS.PENDING_PUBLISH]: '待发布',
  [SPECIAL_OFFER_STATUS.PUBLISHED]: '已发布',
  [SPECIAL_OFFER_STATUS.ENDED]: '已结束',
  [SPECIAL_OFFER_STATUS.ARCHIVED]: '已删除',
  草稿: '草稿',
  待发布: '待发布',
  已发布: '已发布',
  已结束: '已结束',
  pending_publish: '待发布'
}

/** 列表筛选 / 表单可选状态（不含已删除） */
export const SPECIAL_OFFER_STATUS_OPTIONS = [
  { value: SPECIAL_OFFER_STATUS.DRAFT, label: '草稿' },
  { value: SPECIAL_OFFER_STATUS.PENDING_PUBLISH, label: '待发布' },
  { value: SPECIAL_OFFER_STATUS.PUBLISHED, label: '已发布' },
  { value: SPECIAL_OFFER_STATUS.ENDED, label: '已结束' }
]

const SPECIAL_OFFER_STATUS_ALIASES: Record<string, string> = {
  草稿: SPECIAL_OFFER_STATUS.DRAFT,
  待发布: SPECIAL_OFFER_STATUS.PENDING_PUBLISH,
  已发布: SPECIAL_OFFER_STATUS.PUBLISHED,
  已结束: SPECIAL_OFFER_STATUS.ENDED,
  pending_publish: SPECIAL_OFFER_STATUS.PENDING_PUBLISH
}

export function normalizeSpecialOfferTargetType(value?: string) {
  if (!value) return SPECIAL_OFFER_TARGET_TYPE.ALL
  const canonical = Object.values(SPECIAL_OFFER_TARGET_TYPE) as string[]
  if (canonical.includes(value)) return value
  return SPECIAL_OFFER_TARGET_TYPE_ALIASES[value] || SPECIAL_OFFER_TARGET_TYPE.ALL
}

export function normalizeSpecialOfferStatus(value?: string) {
  if (!value) return SPECIAL_OFFER_STATUS.DRAFT
  if (Object.values(SPECIAL_OFFER_STATUS).includes(value as (typeof SPECIAL_OFFER_STATUS)[keyof typeof SPECIAL_OFFER_STATUS])) {
    return value
  }
  return SPECIAL_OFFER_STATUS_ALIASES[value] || value
}

export function normalizeSpecialOfferStatusClass(status?: string) {
  return normalizeSpecialOfferStatus(status)
}

export function isSpecialOfferArchived(status?: string) {
  const normalized = normalizeSpecialOfferStatus(status)
  return normalized === SPECIAL_OFFER_STATUS.ARCHIVED
}

export function isSpecialOfferEnded(status?: string) {
  const normalized = normalizeSpecialOfferStatus(status)
  return normalized === SPECIAL_OFFER_STATUS.ENDED
}

export const WITHDRAWAL_AUDIT_STATUS = {
  PENDING: 'pending_audit',
  /** 兼容：商家申请落库偶发 pending（移动端显示「处理中」） */
  PENDING_LEGACY: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  COMPLETED: 'completed',
  FAILED: 'failed'
} as const

export const WITHDRAWAL_AUDIT_STATUS_LABEL: Record<string, string> = {
  pending_audit: '待审核',
  /** 管理端将 pending 视为待审（与文档正式码对齐展示） */
  pending: '待审核',
  approved: '已通过',
  rejected: '已拒绝',
  completed: '已完成',
  failed: '失败'
}

/** 待审态：正式码 + 兼容码（v4.7：二者等价） */
export function isWithdrawalPendingStatus(status?: string | null): boolean {
  return status === WITHDRAWAL_AUDIT_STATUS.PENDING || status === WITHDRAWAL_AUDIT_STATUS.PENDING_LEGACY
}

/** 通用审核待审判定（提现 / 兑换 / 积分购买） */
export function isAuditPendingStatus(status?: string | null): boolean {
  return status === 'pending' || status === 'pending_audit'
}

/** 已终态：才应显示「已处理」 */
export function isWithdrawalTerminalStatus(status?: string | null): boolean {
  return (
    status === WITHDRAWAL_AUDIT_STATUS.APPROVED ||
    status === WITHDRAWAL_AUDIT_STATUS.REJECTED ||
    status === WITHDRAWAL_AUDIT_STATUS.COMPLETED ||
    status === WITHDRAWAL_AUDIT_STATUS.FAILED
  )
}

/** 积分购买审核状态 */
export const POINT_PURCHASE_AUDIT_STATUS = {
  PENDING: 'pending_audit',
  PENDING_LEGACY: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected'
} as const

export const POINT_PURCHASE_AUDIT_STATUS_LABEL: Record<string, string> = {
  pending_audit: '待审核',
  pending: '待审核',
  approved: '已通过',
  rejected: '已拒绝'
}

export const POINT_PURCHASE_AUDIT_STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  /** v4.7：传 pending，后端按 IN(pending, pending_audit) 覆盖全部待审 */
  { value: 'pending', label: '待审核' },
  { value: POINT_PURCHASE_AUDIT_STATUS.APPROVED, label: '已通过' },
  { value: POINT_PURCHASE_AUDIT_STATUS.REJECTED, label: '已拒绝' }
]

/** 积分池流水类型（GET /admin/point-pools/records 的 recordType） */
export const POINT_POOL_RECORD_TYPE = {
  DIFF: 'diff',
  EXPIRY_CLEAR: 'expiry_clear',
  FEE_CLEAR: 'fee_clear',
  MANUAL_ADJUST: 'manual_adjust',
  MANUAL_OUT: 'manual_out',
  SPEND: 'spend'
} as const

export const POINT_POOL_RECORD_TYPE_LABEL: Record<string, string> = {
  diff: '差额注入',
  exchange_diff: '差额注入',
  expiry_clear: '过期清零',
  coin_expired: '过期清零',
  fee_clear: '欠费清零',
  manual_adjust: '手工调整',
  manual_out: '手工支出',
  spend: '兑换支出',
  pool_in: '流入',
  pool_out: '流出'
}

export const POINT_POOL_RECORD_TYPE_OPTIONS = [
  { value: '', label: '全部类型' },
  { value: POINT_POOL_RECORD_TYPE.DIFF, label: '差额注入' },
  { value: POINT_POOL_RECORD_TYPE.EXPIRY_CLEAR, label: '过期清零' },
  { value: POINT_POOL_RECORD_TYPE.FEE_CLEAR, label: '欠费清零' },
  { value: POINT_POOL_RECORD_TYPE.MANUAL_ADJUST, label: '手工调整' },
  { value: POINT_POOL_RECORD_TYPE.MANUAL_OUT, label: '手工支出' },
  { value: POINT_POOL_RECORD_TYPE.SPEND, label: '兑换支出' }
]

/** 筛选值对应的后端可能别名（接口暂不按 recordType 过滤时，前端用此做匹配） */
export const POINT_POOL_RECORD_TYPE_ALIASES: Record<string, string[]> = {
  [POINT_POOL_RECORD_TYPE.DIFF]: ['diff', 'exchange_diff'],
  [POINT_POOL_RECORD_TYPE.EXPIRY_CLEAR]: ['expiry_clear', 'coin_expired'],
  [POINT_POOL_RECORD_TYPE.FEE_CLEAR]: ['fee_clear'],
  [POINT_POOL_RECORD_TYPE.MANUAL_ADJUST]: ['manual_adjust'],
  [POINT_POOL_RECORD_TYPE.MANUAL_OUT]: ['manual_out'],
  [POINT_POOL_RECORD_TYPE.SPEND]: ['spend']
}

export const WITHDRAWAL_AUDIT_STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  /** v4.7：传 pending，后端 IN(pending, pending_audit) 覆盖全部待审 */
  { value: WITHDRAWAL_AUDIT_STATUS.PENDING_LEGACY, label: '待审核' },
  { value: WITHDRAWAL_AUDIT_STATUS.APPROVED, label: '已通过' },
  { value: WITHDRAWAL_AUDIT_STATUS.REJECTED, label: '已拒绝' },
  { value: WITHDRAWAL_AUDIT_STATUS.COMPLETED, label: '已完成' }
]

export const RESIDENT_STATUS_OPTIONS = [
  { value: RESIDENT_STATUS.ACTIVE, label: '正常' },
  { value: RESIDENT_STATUS.FROZEN, label: '冻结' },
  { value: RESIDENT_STATUS.DISABLED, label: '禁用' }
]

export const MARITAL_STATUS = {
  SINGLE: 'single',
  MARRIED: 'married',
  DIVORCED: 'divorced',
  WIDOWED: 'widowed'
} as const

export const MARITAL_STATUS_LABEL: Record<string, string> = {
  single: '未婚',
  married: '已婚',
  divorced: '离异',
  widowed: '丧偶'
}

export const MARITAL_STATUS_OPTIONS = [
  { value: '', label: '未填写' },
  ...Object.entries(MARITAL_STATUS_LABEL).map(([value, label]) => ({ value, label }))
]

export const MERCHANT_AUDIT_STATUS_OPTIONS = [
  { value: '', label: '全部审核状态' },
  { value: MERCHANT_AUDIT_STATUS.PENDING, label: '待审核' },
  { value: MERCHANT_AUDIT_STATUS.APPROVED, label: '已通过' },
  /** 兼容历史数据；新审核拒绝会硬删，管理端不要再依赖此筛查看驳回记录 */
  { value: MERCHANT_AUDIT_STATUS.REJECTED, label: '已拒绝' }
]

export const MERCHANT_APPLY_ROLE_FILTER_OPTIONS = [
  { value: '', label: '全部' },
  { value: USER_ROLE.MERCHANT, label: '商品商家' },
  { value: USER_ROLE.TECHNICIAN, label: ROLE_LABEL[USER_ROLE.TECHNICIAN] },
  { value: USER_ROLE.ACTIVITY_LEADER, label: ROLE_LABEL[USER_ROLE.ACTIVITY_LEADER] }
]

export const PLATFORM_MERCHANT_STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  { value: MERCHANT_STATUS.ACTIVE, label: '营业中' },
  { value: MERCHANT_STATUS.INACTIVE, label: '已停业' }
]

/** 物业商家列表营业状态筛选（§7.1 status，默认营业中以免与踢出历史叠在一起） */
export const MERCHANT_OPERATING_STATUS_OPTIONS = [
  { value: MERCHANT_STATUS.ACTIVE, label: '营业中' },
  { value: MERCHANT_STATUS.KICKED, label: '已踢出' },
  { value: MERCHANT_STATUS.INACTIVE, label: '已停业' },
  { value: MERCHANT_STATUS.QUIT, label: '已退出' },
  { value: '', label: '全部状态' }
]

export const MERCHANT_LEVEL_OPTIONS = Object.entries(MERCHANT_LEVEL_LABEL).map(([value, label]) => ({
  value,
  label
}))

export const ANNOUNCEMENT_TYPE_OPTIONS = [
  { value: ANNOUNCEMENT_TYPE.PROPERTY, label: '物业公告' },
  { value: ANNOUNCEMENT_TYPE.COMMUNITY, label: '社区公告' },
  { value: ANNOUNCEMENT_TYPE.PLATFORM, label: '平台公告' },
  { value: ANNOUNCEMENT_TYPE.SYSTEM, label: '系统公告' },
  { value: ANNOUNCEMENT_TYPE.MERCHANT, label: '商家公告' },
  { value: ANNOUNCEMENT_TYPE.ACTIVITY, label: '活动组公告' }
]

export const ANNOUNCEMENT_STATUS_OPTIONS = [
  { value: ANNOUNCEMENT_STATUS.PUBLISHED, label: '立即发布' },
  { value: ANNOUNCEMENT_STATUS.DRAFT, label: '存为草稿' }
]

export const ANNOUNCEMENT_LIST_STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  { value: ANNOUNCEMENT_STATUS.DRAFT, label: '草稿' },
  { value: ANNOUNCEMENT_STATUS.PUBLISHED, label: '已发布' },
  { value: ANNOUNCEMENT_STATUS.ARCHIVED, label: '已归档' }
]

export const ANNOUNCEMENT_LIST_TYPE_OPTIONS = [
  { value: '', label: '全部类型' },
  ...ANNOUNCEMENT_TYPE_OPTIONS
]

export const ANNOUNCEMENT_COLLECT_FIELD_TYPE_OPTIONS = [
  { value: 'boolean', label: '是/否' },
  { value: 'text', label: '文本' },
  { value: 'number', label: '数字' }
]

/** 公告推送目标角色（targetRoles） */
export const ANNOUNCEMENT_TARGET_ROLE_OPTIONS = [
  { value: USER_ROLE.RESIDENT, label: ROLE_LABEL[USER_ROLE.RESIDENT] },
  { value: USER_ROLE.MERCHANT, label: ROLE_LABEL[USER_ROLE.MERCHANT] },
  { value: USER_ROLE.COURIER, label: ROLE_LABEL[USER_ROLE.COURIER] },
  { value: USER_ROLE.COORDINATOR, label: ROLE_LABEL[USER_ROLE.COORDINATOR] },
  { value: USER_ROLE.SECTOR_LEADER, label: ROLE_LABEL[USER_ROLE.SECTOR_LEADER] },
  { value: USER_ROLE.INDIVIDUAL_LEADER, label: ROLE_LABEL[USER_ROLE.INDIVIDUAL_LEADER] },
  { value: USER_ROLE.ACTIVITY_LEADER, label: ROLE_LABEL[USER_ROLE.ACTIVITY_LEADER] },
  { value: USER_ROLE.TECHNICIAN, label: ROLE_LABEL[USER_ROLE.TECHNICIAN] }
]

export function formatAnnouncementTargetRoles(roles?: string[]) {
  if (!roles?.length) return '全部角色'
  return roles.map((role) => getEnumLabel(ROLE_LABEL, role, role)).join('、')
}

export const COIN_ISSUE_MODE = {
  AUTO: 'auto',
  MANUAL: 'manual'
} as const

export const COIN_ISSUE_MODE_LABEL: Record<string, string> = {
  auto: '自动发放',
  manual: '手动发放'
}

export const COIN_ISSUE_MODE_OPTIONS = Object.entries(COIN_ISSUE_MODE_LABEL).map(([value, label]) => ({
  value,
  label
}))

export const COURIER_STATUS = {
  ONLINE: 'online',
  OFFLINE: 'offline'
} as const

export const COURIER_STATUS_LABEL: Record<string, string> = {
  online: '在线',
  offline: '离线'
}

export const DELIVERY_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  GRABBED: 'grabbed',
  DELIVERING: 'delivering',
  /** 商家自配进行中（API v5.7 §68） */
  MERCHANT_SELF: 'merchant_self',
  /** 已送达（配送完成；配送侧可提现在 complete 成功后刷新 /courier-managers/my） */
  DELIVERED: 'delivered',
  /**
   * @deprecated 历史脏数据/旧契约；后端已归一为 delivered，展示与判定请兼容两者
   */
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  FAILED: 'failed'
} as const

export const DELIVERY_STATUS_LABEL: Record<string, string> = {
  pending: '待抢单',
  accepted: '已接单',
  grabbed: '已抢单',
  delivering: '配送中',
  merchant_self: '商家自配中',
  delivered: '已送达',
  completed: '已完成',
  cancelled: '已取消',
  failed: '配送失败'
}

/** 配送是否已完成（兼容 delivered / 历史 completed） */
export function isDeliveryFinished(status?: string | null) {
  return status === DELIVERY_STATUS.DELIVERED || status === DELIVERY_STATUS.COMPLETED
}

export const COURIER_TASK_STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  { value: DELIVERY_STATUS.ACCEPTED, label: '已接单' },
  { value: DELIVERY_STATUS.DELIVERING, label: '配送中' },
  { value: DELIVERY_STATUS.DELIVERED, label: '已送达' },
  { value: DELIVERY_STATUS.CANCELLED, label: '已取消' }
]

export const DELIVERY_CAPACITY_DIMENSION = {
  H24: '24h',
  D7: '7d'
} as const

export type AuditResult = (typeof AUDIT_RESULT)[keyof typeof AUDIT_RESULT]

export function getEnumLabel(map: Record<string, string>, value?: string | null, fallback = '-') {
  if (!value) return fallback
  return map[value] ?? value
}

/** 终态优先：被踢/停用/退出时不得再展示「已通过」 */
export function resolveMerchantAuditDisplayStatus(
  auditStatus?: string | null,
  operatingStatus?: string | null
) {
  if (isMerchantTerminalStatus(operatingStatus)) return operatingStatus as string
  if (isMerchantTerminalStatus(auditStatus)) return auditStatus as string
  return auditStatus || ''
}

export function getMerchantAuditDisplayLabel(
  auditStatus?: string | null,
  operatingStatus?: string | null,
  fallback = '-'
) {
  return getEnumLabel(
    MERCHANT_AUDIT_STATUS_LABEL,
    resolveMerchantAuditDisplayStatus(auditStatus, operatingStatus),
    fallback
  )
}

/** 终态优先：被踢/停用/退出时不得再展示「营业中」 */
export function resolveMerchantOperatingDisplayStatus(
  operatingStatus?: string | null,
  auditStatus?: string | null
) {
  if (isMerchantTerminalStatus(operatingStatus)) return operatingStatus as string
  if (isMerchantTerminalStatus(auditStatus)) return auditStatus as string
  return operatingStatus || ''
}

export function getMerchantOperatingDisplayLabel(
  operatingStatus?: string | null,
  auditStatus?: string | null,
  fallback = '—'
) {
  return getEnumLabel(
    MERCHANT_STATUS_LABEL,
    resolveMerchantOperatingDisplayStatus(operatingStatus, auditStatus),
    fallback
  )
}

/** 30004 重复申请：按 data.auditStatus 展示真实状态，严禁默认 pending_audit */
export function formatMerchantDuplicateBindingMessage(
  data?: { auditStatus?: string | null } | null,
  fallback = '该物业下已存在相同申请，请勿重复提交'
) {
  const status = data?.auditStatus
  if (!status) return fallback
  return `该物业下已存在相同申请（当前状态：${getMerchantAuditDisplayLabel(status, status)}），请勿重复提交`
}

export function getPhase2ErrorMessage(code?: number, fallback?: string) {
  if (code != null && MERCHANT_GATE_ERROR_MESSAGE[code]) return MERCHANT_GATE_ERROR_MESSAGE[code]
  if (code != null && PHASE2_ERROR_MESSAGE[code]) return PHASE2_ERROR_MESSAGE[code]
  return fallback || '操作失败'
}

/** 平台收益明细类型 */
export const PLATFORM_EARNING_TYPE = {
  DISTRIBUTION: 'distribution',
  DELIVERY: 'delivery',
  WITHDRAWAL: 'withdrawal'
} as const

export const PLATFORM_EARNING_TYPE_LABEL: Record<string, string> = {
  distribution: '订单分成',
  delivery: '配送费分成',
  withdrawal: '提现手续费分成'
}

export const PLATFORM_EARNING_TYPE_OPTIONS = [
  { value: '', label: '全部类型' },
  ...Object.entries(PLATFORM_EARNING_TYPE_LABEL).map(([value, label]) => ({ value, label }))
]

/** 价格审批状态 */
export const PRICE_APPROVAL_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected'
} as const

export const PRICE_APPROVAL_STATUS_LABEL: Record<string, string> = {
  pending: '待审批',
  approved: '已通过',
  rejected: '已拒绝'
}

export const PRICE_APPROVAL_STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  { value: PRICE_APPROVAL_STATUS.PENDING, label: '待审批' },
  { value: PRICE_APPROVAL_STATUS.APPROVED, label: '已通过' },
  { value: PRICE_APPROVAL_STATUS.REJECTED, label: '已拒绝' }
]

/** 价格审批项类型 */
export const PRICE_APPROVAL_ITEM_TYPE = {
  DELIVERY_FEE: 'delivery_fee',
  PRODUCT_PRICE: 'product_price',
  MERCHANT_AD: 'merchant_ad',
  MERCHANT_DISTRIBUTION: 'merchant_distribution',
  PROPERTY_FEE_PRICE: 'property_fee_price',
  RESIDENT_SHARE_RATE: 'resident_share_rate'
} as const

export const PRICE_APPROVAL_ITEM_TYPE_LABEL: Record<string, string> = {
  delivery_fee: '配送费',
  product_price: '商品价格',
  merchant_ad: '商家广告',
  merchant_distribution: '商家分成',
  property_fee_price: '物业费价格',
  resident_share_rate: '积分分成比例'
}

/** 物业币流水来源（property_coin_records.source） */
export const PROPERTY_COIN_SOURCE = {
  ORDER: 'order',
  PROPERTY_FEE: 'property_fee',
  MANUAL: 'manual',
  COIN_EXPIRED: 'coin_expired'
} as const

export const PROPERTY_COIN_SOURCE_LABEL: Record<string, string> = {
  order: '订单返现',
  property_fee: '物业费相关',
  manual: '手动发放',
  coin_expired: '过期清零'
}

/** 物业币使用条件 */
export const COIN_USE_CONDITION = {
  NONE: 'none',
  POINT_THRESHOLD: 'point_threshold',
  PROPERTY_FEE_PAID: 'property_fee_paid',
  MANUAL_ISSUE: 'manual_issue'
} as const

export const COIN_USE_CONDITION_LABEL: Record<string, string> = {
  none: '无限制',
  point_threshold: '积分达阈值可用',
  property_fee_paid: '缴清物业费可用',
  manual_issue: '仅物业配发可用'
}

export const COIN_USE_CONDITION_OPTIONS = [
  { value: COIN_USE_CONDITION.NONE, label: '无限制' },
  { value: COIN_USE_CONDITION.POINT_THRESHOLD, label: '积分达阈值可用' },
  { value: COIN_USE_CONDITION.PROPERTY_FEE_PAID, label: '缴清物业费可用' },
  { value: COIN_USE_CONDITION.MANUAL_ISSUE, label: '仅物业配发可用' }
]

/**
 * 配送距离类型（价格区间 §76：1km/3km/5km/citywide/any；
 * 商家 distanceType 另见 MERCHANT_DISTANCE_TYPE）
 */
export const DISTANCE_TYPE = {
  KM_1: '1km',
  KM_3: '3km',
  KM_5: '5km',
  CITYWIDE: 'citywide',
  ANY: 'any'
} as const

export const DISTANCE_TYPE_LABEL: Record<string, string> = {
  '1km': '1公里',
  '3km': '3公里',
  '5km': '5公里',
  citywide: '同城',
  any: '不限',
  /** 商家 distanceType 兼容展示 */
  radius: '按半径',
  district: '本区',
  city: '本市'
}

export const DISTANCE_TYPE_OPTIONS = [
  { value: DISTANCE_TYPE.ANY, label: '不限' },
  { value: DISTANCE_TYPE.KM_1, label: '1公里' },
  { value: DISTANCE_TYPE.KM_3, label: '3公里' },
  { value: DISTANCE_TYPE.KM_5, label: '5公里' },
  { value: DISTANCE_TYPE.CITYWIDE, label: '同城' }
]

/** 商家 distanceType（any / radius / district / city） */
export const MERCHANT_DISTANCE_TYPE = {
  ANY: 'any',
  RADIUS: 'radius',
  DISTRICT: 'district',
  CITY: 'city'
} as const

export const MERCHANT_DISTANCE_TYPE_OPTIONS = [
  { value: MERCHANT_DISTANCE_TYPE.ANY, label: '不限' },
  { value: MERCHANT_DISTANCE_TYPE.RADIUS, label: '按半径' },
  { value: MERCHANT_DISTANCE_TYPE.DISTRICT, label: '本区' },
  { value: MERCHANT_DISTANCE_TYPE.CITY, label: '本市' }
]

/** 配送范围（价格区间 / 规则） */
export const DELIVERY_SCOPE = {
  IN_COMMUNITY: 'in_community',
  OUT_COMMUNITY: 'out_community',
  BOTH: 'both',
  COMMUNITY_INSIDE: 'community_inside',
  COMMUNITY_OUTSIDE: 'community_outside'
} as const

export const DELIVERY_SCOPE_LABEL: Record<string, string> = {
  in_community: '小区内',
  out_community: '小区外',
  both: '小区内外',
  community_inside: '小区内',
  community_outside: '小区外'
}

export const DELIVERY_SCOPE_OPTIONS = [
  { value: DELIVERY_SCOPE.BOTH, label: '小区内外' },
  { value: DELIVERY_SCOPE.IN_COMMUNITY, label: '小区内' },
  { value: DELIVERY_SCOPE.OUT_COMMUNITY, label: '小区外' }
]

/** 满额配送费减免承担方（商品分账 B 方案） */
export const DELIVERY_SUBSIDY_SPONSOR = {
  NONE: 'none',
  MERCHANT: 'merchant',
  PROPERTY: 'property',
  PLATFORM: 'platform',
  UNKNOWN: 'unknown'
} as const

export const DELIVERY_SUBSIDY_SPONSOR_LABEL: Record<string, string> = {
  [DELIVERY_SUBSIDY_SPONSOR.NONE]: '无补贴',
  [DELIVERY_SUBSIDY_SPONSOR.MERCHANT]: '商家承担',
  [DELIVERY_SUBSIDY_SPONSOR.PROPERTY]: '物业承担',
  [DELIVERY_SUBSIDY_SPONSOR.PLATFORM]: '平台承担',
  [DELIVERY_SUBSIDY_SPONSOR.UNKNOWN]: '历史数据未知'
}

export const DELIVERY_SUBSIDY_SPONSOR_OPTIONS = [
  { value: DELIVERY_SUBSIDY_SPONSOR.MERCHANT, label: '商家承担' },
  { value: DELIVERY_SUBSIDY_SPONSOR.PROPERTY, label: '物业承担' },
  { value: DELIVERY_SUBSIDY_SPONSOR.PLATFORM, label: '平台承担' }
]

/** [ENUM] 配送费减免原因 */
export const WAIVER_REASON = {
  THRESHOLD: 'threshold',
  CAMPAIGN: 'campaign',
  MANUAL: 'manual',
  NONE: 'none',
  UNKNOWN: 'unknown'
} as const

export const WAIVER_REASON_LABEL: Record<string, string> = {
  [WAIVER_REASON.THRESHOLD]: '满额减免',
  [WAIVER_REASON.CAMPAIGN]: '活动减免',
  [WAIVER_REASON.MANUAL]: '人工减免',
  [WAIVER_REASON.NONE]: '未减免',
  [WAIVER_REASON.UNKNOWN]: '未知'
}

/** [ENUM] 分账记录状态 */
export const DISTRIBUTION_RECORD_STATUS = {
  PENDING: 'pending',
  DISTRIBUTED: 'distributed',
  REVERSED: 'reversed',
  PARTIALLY_REVERSED: 'partially_reversed'
} as const

export const DISTRIBUTION_RECORD_STATUS_LABEL: Record<string, string> = {
  [DISTRIBUTION_RECORD_STATUS.PENDING]: '待分账',
  [DISTRIBUTION_RECORD_STATUS.DISTRIBUTED]: '已分账',
  [DISTRIBUTION_RECORD_STATUS.REVERSED]: '已冲正',
  [DISTRIBUTION_RECORD_STATUS.PARTIALLY_REVERSED]: '部分冲正'
}

/** [ENUM] 配送结算状态 */
export const DELIVERY_SETTLEMENT_STATUS = {
  PENDING: 'pending',
  SETTLED: 'settled',
  REVERSED: 'reversed'
} as const

export const DELIVERY_SETTLEMENT_STATUS_LABEL: Record<string, string> = {
  [DELIVERY_SETTLEMENT_STATUS.PENDING]: '待结算',
  [DELIVERY_SETTLEMENT_STATUS.SETTLED]: '已结算',
  [DELIVERY_SETTLEMENT_STATUS.REVERSED]: '已冲正'
}

/** 资料奖励 scope */
export const PROFILE_REWARD_SCOPE = {
  PROPERTY_COMPANY: 'property_company',
  COMMUNITY: 'community',
  PLATFORM: 'platform',
  COORDINATOR: 'coordinator'
} as const

export const PROFILE_REWARD_SCOPE_LABEL: Record<string, string> = {
  property_company: '物业公司',
  community: '小区',
  platform: '平台',
  coordinator: '统筹'
}

export const PROFILE_REWARD_SCOPE_OPTIONS = Object.entries(PROFILE_REWARD_SCOPE_LABEL).map(
  ([value, label]) => ({ value, label })
)

/** 分销商品收费周期 */
export const BILLING_CYCLE = {
  ONE_TIME: 'one_time',
  MONTHLY: 'monthly',
  QUARTERLY: 'quarterly',
  YEARLY: 'yearly'
} as const

export const BILLING_CYCLE_LABEL: Record<string, string> = {
  one_time: '一次性',
  monthly: '月付',
  quarterly: '季付',
  yearly: '年付'
}

export const BILLING_CYCLE_OPTIONS = Object.entries(BILLING_CYCLE_LABEL).map(([value, label]) => ({
  value,
  label
}))

/** 多角色提现类型 */
export const WITHDRAWAL_TYPE = {
  MERCHANT: 'merchant',
  INDIVIDUAL_LEADER: 'individual_leader',
  COURIER: 'courier',
  COORDINATOR: 'coordinator',
  SECTOR_LEADER: 'sector_leader'
} as const

export const WITHDRAWAL_TYPE_LABEL: Record<string, string> = {
  merchant: '商家',
  individual_leader: '个体负责人',
  courier: '配送员',
  coordinator: '统筹',
  sector_leader: '板块负责人'
}

/** GET /admin/role-withdrawals 的角色提现筛选（商家提现使用独立接口） */
export const ROLE_WITHDRAWAL_TYPE_OPTIONS = [
  { value: '', label: '全部角色' },
  { value: WITHDRAWAL_TYPE.COURIER, label: WITHDRAWAL_TYPE_LABEL[WITHDRAWAL_TYPE.COURIER] },
  {
    value: WITHDRAWAL_TYPE.INDIVIDUAL_LEADER,
    label: WITHDRAWAL_TYPE_LABEL[WITHDRAWAL_TYPE.INDIVIDUAL_LEADER]
  },
  {
    value: WITHDRAWAL_TYPE.COORDINATOR,
    label: WITHDRAWAL_TYPE_LABEL[WITHDRAWAL_TYPE.COORDINATOR]
  },
  {
    value: WITHDRAWAL_TYPE.SECTOR_LEADER,
    label: WITHDRAWAL_TYPE_LABEL[WITHDRAWAL_TYPE.SECTOR_LEADER]
  }
]

/** 公告内容类型（三期） */
export const ANNOUNCEMENT_CONTENT_TYPE = {
  PRODUCT: 'product',
  ACTIVITY: 'activity'
} as const

export const ANNOUNCEMENT_CONTENT_TYPE_LABEL: Record<string, string> = {
  product: '产品推荐',
  activity: '活动内容'
}

/**
 * 平台商品分类体系（发布商品时选择；与商家 category 自由文本不同）
 * API 仍以字符串传 category，无独立分类 CRUD 接口时以前端常量对齐平台设计。
 */
export const PRODUCT_CATEGORY = {
  CLOTHING: '服装衣帽',
  DRINKS: '饮品',
  SUPERMARKET: '商超',
  FOOD: '餐饮外卖',
  FRESH: '生鲜果蔬',
  DAILY: '日用百货',
  HOME: '家居家电',
  BEAUTY: '美妆个护',
  DIGITAL: '数码配件',
  SERVICE: '到家服务',
  OTHER: '其他'
} as const

export const PRODUCT_CATEGORY_OPTIONS = [
  { value: PRODUCT_CATEGORY.CLOTHING, label: '服装衣帽' },
  { value: PRODUCT_CATEGORY.DRINKS, label: '饮品' },
  { value: PRODUCT_CATEGORY.SUPERMARKET, label: '商超' },
  { value: PRODUCT_CATEGORY.FOOD, label: '餐饮外卖' },
  { value: PRODUCT_CATEGORY.FRESH, label: '生鲜果蔬' },
  { value: PRODUCT_CATEGORY.DAILY, label: '日用百货' },
  { value: PRODUCT_CATEGORY.HOME, label: '家居家电' },
  { value: PRODUCT_CATEGORY.BEAUTY, label: '美妆个护' },
  { value: PRODUCT_CATEGORY.DIGITAL, label: '数码配件' },
  { value: PRODUCT_CATEGORY.SERVICE, label: '到家服务' },
  { value: PRODUCT_CATEGORY.OTHER, label: '其他' }
] as const

/** 商家动态发布状态 */
export const MERCHANT_POST_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published'
} as const

export const MERCHANT_POST_STATUS_LABEL: Record<string, string> = {
  draft: '草稿',
  published: '已发布'
}

export const MERCHANT_POST_STATUS_OPTIONS = [
  { value: MERCHANT_POST_STATUS.PUBLISHED, label: '发布' },
  { value: MERCHANT_POST_STATUS.DRAFT, label: '存为草稿' }
]

/** [ENUM] 社区论坛 — 帖子状态 */
export const COMMUNITY_POST_STATUS = {
  PUBLISHED: 'published',
  HIDDEN: 'hidden',
  DELETED: 'deleted'
} as const

export const COMMUNITY_POST_STATUS_LABEL: Record<string, string> = {
  published: '已发布',
  hidden: '已隐藏',
  deleted: '已删除'
}

export const COMMUNITY_POST_STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  { value: COMMUNITY_POST_STATUS.PUBLISHED, label: '已发布' },
  { value: COMMUNITY_POST_STATUS.HIDDEN, label: '已隐藏' },
  { value: COMMUNITY_POST_STATUS.DELETED, label: '已删除' }
]

/** [ENUM] 社区论坛 — 评论状态 */
export const COMMUNITY_COMMENT_STATUS = {
  PUBLISHED: 'published',
  DELETED: 'deleted'
} as const

/** [ENUM] 社区论坛 — 举报目标 */
export const COMMUNITY_REPORT_TARGET = {
  POST: 'post',
  COMMENT: 'comment'
} as const

export const COMMUNITY_REPORT_TARGET_LABEL: Record<string, string> = {
  post: '帖子',
  comment: '评论'
}

/** [ENUM] 社区论坛 — 举报原因 */
export const COMMUNITY_REPORT_REASON = {
  SPAM: 'spam',
  ABUSE: 'abuse',
  POLITICS: 'politics',
  PORN: 'porn',
  OTHER: 'other'
} as const

export const COMMUNITY_REPORT_REASON_LABEL: Record<string, string> = {
  spam: '垃圾广告',
  abuse: '辱骂骚扰',
  politics: '政治敏感',
  porn: '色情低俗',
  other: '其他'
}

/** [ENUM] 社区论坛 — 举报处理状态 */
export const COMMUNITY_REPORT_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected'
} as const

export const COMMUNITY_REPORT_STATUS_LABEL: Record<string, string> = {
  pending: '待处理',
  accepted: '已通过',
  rejected: '已驳回'
}

export const COMMUNITY_REPORT_STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  { value: COMMUNITY_REPORT_STATUS.PENDING, label: '待处理' },
  { value: COMMUNITY_REPORT_STATUS.ACCEPTED, label: '已通过' },
  { value: COMMUNITY_REPORT_STATUS.REJECTED, label: '已驳回' }
]

/** [ENUM] 社区论坛 — 处理动作 */
export const COMMUNITY_REPORT_ACTION = {
  ACCEPT: 'accept',
  REJECT: 'reject'
} as const

/** 社区论坛错误码（98xxx） */
export const COMMUNITY_FORUM_ERROR_MESSAGE: Record<number, string> = {
  98001: '帖子不存在',
  98002: '评论不存在',
  98003: '举报记录不存在',
  98004: '已举报过该内容',
  98005: '内容包含敏感词',
  98006: '无权删除该内容',
  98007: '帖子内容过长',
  98008: '评论内容过长',
  98009: '该举报已处理'
}

/**
 * 文件上传分类（POST /files/upload multipart 字段 category）
 * 契约：avatar | announcement | merchant | service | activity
 * C 端另用 proof / community，后端已兼容时可用
 */
export const FILE_CATEGORY = {
  AVATAR: 'avatar',
  ANNOUNCEMENT: 'announcement',
  MERCHANT: 'merchant',
  SERVICE: 'service',
  ACTIVITY: 'activity',
  PROOF: 'proof',
  COMMUNITY: 'community'
} as const

export type FileCategory = (typeof FILE_CATEGORY)[keyof typeof FILE_CATEGORY]

export const FILE_CATEGORY_LABEL: Record<string, string> = {
  avatar: '头像',
  announcement: '公告图片',
  merchant: '商家图片/视频',
  service: '服务图片',
  activity: '活动组图片',
  proof: '送达凭证',
  community: '社区论坛'
}

/** v5.3 催缴通知发送渠道 */
export const ARREARS_REMINDER_CHANNEL = {
  IN_APP: 'in_app',
  WECHAT: 'wechat'
} as const

export const ARREARS_REMINDER_TEMPLATE = {
  PROPERTY_FEE: 'property_fee_arrears_reminder_v1'
} as const

/** v5.3 后端稳定业务错误标识 */
export const API_ERROR_CODE = {
  INVALID_SHARE_RATE_TOTAL: 'INVALID_SHARE_RATE_TOTAL',
  WECHAT_TEMPLATE_NOT_CONFIGURED: 'WECHAT_TEMPLATE_NOT_CONFIGURED',
  PREVIEW_EXPIRED: 'PREVIEW_EXPIRED',
  ARREARS_REMINDER_DUPLICATE: 'ARREARS_REMINDER_DUPLICATE'
} as const

/** 新旧资金切分：上线前内部钱包 vs 上线后微信支付分账 */
export const SETTLEMENT_CHANNEL = {
  LEGACY: 'legacy',
  CBK: 'cbk'
} as const

export const SETTLEMENT_CHANNEL_LABEL: Record<string, string> = {
  legacy: '历史余额',
  cbk: '微信支付分账'
}

/**
 * CBK 收款主体。联调指南 / API §90 使用大写枚举（PLATFORM 等），
 * 与仓库通用 snake_case 约定不同；请求体按此常量提交。
 */
export const CBK_OWNER_TYPE = {
  PLATFORM: 'PLATFORM',
  PROPERTY: 'PROPERTY',
  MERCHANT: 'MERCHANT',
  COORDINATOR: 'COORDINATOR',
  SECTOR_LEADER: 'SECTOR_LEADER',
  INDIVIDUAL_LEADER: 'INDIVIDUAL_LEADER',
  COURIER: 'COURIER'
} as const

/** 平台主体 ownerId 固定值 */
export const CBK_PLATFORM_OWNER_ID = 'PLATFORM'

export const CBK_OWNER_TYPE_LABEL: Record<string, string> = {
  PLATFORM: '平台抽成',
  PROPERTY: '物业公司',
  MERCHANT: '商家',
  COORDINATOR: '统筹',
  SECTOR_LEADER: '板块负责人',
  INDIVIDUAL_LEADER: '个体负责人',
  COURIER: '快递员',
  platform: '平台抽成',
  property: '物业公司',
  merchant: '商家',
  coordinator: '统筹',
  sector_leader: '板块负责人',
  individual_leader: '个体负责人',
  courier: '快递员'
}

export const CBK_OWNER_ID_HINT: Record<string, string> = {
  PLATFORM: '固定填 PLATFORM',
  PROPERTY: '物业 ID（pc_xxx）',
  MERCHANT: '商家 ID（mer_xxx）',
  COORDINATOR: '统筹账号 ID',
  SECTOR_LEADER: '板块负责人 ID',
  INDIVIDUAL_LEADER: '个体负责人 ID',
  COURIER: '快递员 ID（cour_xxx）'
}

export const CBK_OWNER_TYPE_OPTIONS = [
  { value: '', label: '全部角色' },
  { value: CBK_OWNER_TYPE.PLATFORM, label: CBK_OWNER_TYPE_LABEL.PLATFORM },
  { value: CBK_OWNER_TYPE.PROPERTY, label: CBK_OWNER_TYPE_LABEL.PROPERTY },
  { value: CBK_OWNER_TYPE.MERCHANT, label: CBK_OWNER_TYPE_LABEL.MERCHANT },
  { value: CBK_OWNER_TYPE.COORDINATOR, label: CBK_OWNER_TYPE_LABEL.COORDINATOR },
  { value: CBK_OWNER_TYPE.SECTOR_LEADER, label: CBK_OWNER_TYPE_LABEL.SECTOR_LEADER },
  { value: CBK_OWNER_TYPE.INDIVIDUAL_LEADER, label: CBK_OWNER_TYPE_LABEL.INDIVIDUAL_LEADER },
  { value: CBK_OWNER_TYPE.COURIER, label: CBK_OWNER_TYPE_LABEL.COURIER }
]

/** GET /admin/cbk/reconcile/failed 待人工介入状态 */
export const CBK_RECONCILE_STATUS = {
  FREEZE_FAILED: 'freeze_failed',
  FINISH_FAILED: 'finish_failed',
  WITHDRAW_FAILED: 'withdraw_failed',
  REVERSE_FAILED: 'reverse_failed',
  REFUND_FAILED: 'refund_failed',
  SKIPPED: 'skipped'
} as const

export const CBK_RECONCILE_STATUS_LABEL: Record<string, string> = {
  freeze_failed: '冻结分账失败',
  finish_failed: '完结分账失败',
  withdraw_failed: '结算提交失败',
  reverse_failed: '冲正失败',
  refund_failed: '退款失败',
  skipped: '缺户跳过'
}

export const CBK_RECONCILE_STATUS_OPTIONS = [
  { value: '', label: '默认（失败 + 缺户）' },
  { value: CBK_RECONCILE_STATUS.SKIPPED, label: CBK_RECONCILE_STATUS_LABEL.skipped },
  { value: CBK_RECONCILE_STATUS.FREEZE_FAILED, label: CBK_RECONCILE_STATUS_LABEL.freeze_failed },
  { value: CBK_RECONCILE_STATUS.FINISH_FAILED, label: CBK_RECONCILE_STATUS_LABEL.finish_failed },
  { value: CBK_RECONCILE_STATUS.WITHDRAW_FAILED, label: CBK_RECONCILE_STATUS_LABEL.withdraw_failed },
  { value: CBK_RECONCILE_STATUS.REVERSE_FAILED, label: CBK_RECONCILE_STATUS_LABEL.reverse_failed },
  { value: CBK_RECONCILE_STATUS.REFUND_FAILED, label: CBK_RECONCILE_STATUS_LABEL.refund_failed }
]

/** 订单详情分账三态（冻结中 → 已提交结算 → 已完结） */
export const CBK_PAYOUT_STATUS = {
  FROZEN: 'frozen',
  WITHDRAWING: 'withdrawing',
  ARRIVED: 'arrived'
} as const

export const CBK_PAYOUT_STATUS_LABEL: Record<string, string> = {
  frozen: '冻结中',
  withdrawing: '已提交结算',
  arrived: '已完结'
}

export const CBK_ERROR_MESSAGE: Record<number, string> = {
  97020: '订单已完成，不支持退款',
  97021: '分账账户未就绪',
  97022: '支付通道异常',
  99002: '微信支付接口异常',
  99003: '微信支付签名校验失败',
  99004: '微信支付未配置'
}
