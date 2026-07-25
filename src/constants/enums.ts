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
  PENDING: 'pending_audit',
  APPROVED: 'approved',
  REJECTED: 'rejected'
} as const

export const MERCHANT_AUDIT_STATUS_LABEL: Record<string, string> = {
  pending_audit: '待审核',
  approved: '已通过',
  rejected: '已拒绝'
}

/** 审核操作结果（POST /admin/merchants/{id}/audit 的 auditResult） */
export const AUDIT_RESULT = {
  APPROVED: 'approved',
  REJECTED: 'rejected'
} as const

export const MERCHANT_STATUS = {
  ACTIVE: 'active',
  FROZEN: 'frozen',
  DISABLED: 'disabled',
  INACTIVE: 'inactive',
  KICKED: 'kicked'
} as const

export const MERCHANT_STATUS_LABEL: Record<string, string> = {
  active: '营业中',
  frozen: '已冻结',
  disabled: '已禁用',
  inactive: '已停业',
  kicked: '已踢出'
}

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
  DELIVERING: 'delivering',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  REFUNDING: 'refunding',
  REFUNDED: 'refunded'
} as const

export const ORDER_STATUS_LABEL: Record<string, string> = {
  pending: '待支付',
  paid: '已支付',
  delivering: '配送中',
  completed: '已完成',
  cancelled: '已取消',
  refunding: '退款中',
  refunded: '已退款'
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
  KM3: '3km',
  KM5: '5km',
  DISTRICT: 'district',
  CITY: 'city'
} as const

export const SERVICE_RADIUS_LABEL: Record<string, string> = {
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
  90101: '同一用户当日定向消息已达上限',
  90102: '物业公司当日定向推送任务已达上限',
  90103: '今日新聊人数已达上限',
  90104: '商家响应已超时',
  90105: '本周广告发布额度不足',
  90106: '保证金未缴纳或状态不允许',
  90107: '存在进行中订单，无法退出',
  90108: '所有匹配商家均未响应，需求已关闭',
  90109: '超出管辖范围',
  90110: '该咨询师暂不可预约'
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
  APPROVED: 'approved',
  REJECTED: 'rejected',
  COMPLETED: 'completed'
} as const

export const WITHDRAWAL_AUDIT_STATUS_LABEL: Record<string, string> = {
  pending_audit: '待审核',
  approved: '已通过',
  rejected: '已拒绝',
  completed: '已完成'
}

/** 积分购买审核状态 */
export const POINT_PURCHASE_AUDIT_STATUS = {
  PENDING: 'pending_audit',
  APPROVED: 'approved',
  REJECTED: 'rejected'
} as const

export const POINT_PURCHASE_AUDIT_STATUS_LABEL: Record<string, string> = {
  pending_audit: '待审核',
  approved: '已通过',
  rejected: '已拒绝'
}

export const POINT_PURCHASE_AUDIT_STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  { value: POINT_PURCHASE_AUDIT_STATUS.PENDING, label: '待审核' },
  { value: POINT_PURCHASE_AUDIT_STATUS.APPROVED, label: '已通过' },
  { value: POINT_PURCHASE_AUDIT_STATUS.REJECTED, label: '已拒绝' }
]

export const WITHDRAWAL_AUDIT_STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  { value: WITHDRAWAL_AUDIT_STATUS.PENDING, label: '待审核' },
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
  { value: MERCHANT_AUDIT_STATUS.REJECTED, label: '已拒绝' }
]

export const PLATFORM_MERCHANT_STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  { value: MERCHANT_STATUS.ACTIVE, label: '营业中' },
  { value: MERCHANT_STATUS.INACTIVE, label: '已停业' }
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
  DELIVERED: 'delivered',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  FAILED: 'failed'
} as const

export const DELIVERY_STATUS_LABEL: Record<string, string> = {
  pending: '待抢单',
  accepted: '已接单',
  grabbed: '已抢单',
  delivering: '配送中',
  delivered: '已送达',
  completed: '已完成',
  cancelled: '已取消',
  failed: '配送失败'
}

export const COURIER_TASK_STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  { value: DELIVERY_STATUS.ACCEPTED, label: '已接单' },
  { value: DELIVERY_STATUS.DELIVERING, label: '配送中' },
  { value: DELIVERY_STATUS.COMPLETED, label: '已完成' },
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

export function getPhase2ErrorMessage(code?: number, fallback?: string) {
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
  MERCHANT_DISTRIBUTION: 'merchant_distribution'
} as const

export const PRICE_APPROVAL_ITEM_TYPE_LABEL: Record<string, string> = {
  delivery_fee: '配送费',
  product_price: '商品价格',
  merchant_ad: '商家广告',
  merchant_distribution: '商家分成'
}

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
  COURIER: 'courier'
} as const

export const WITHDRAWAL_TYPE_LABEL: Record<string, string> = {
  merchant: '商家',
  individual_leader: '个体负责人',
  courier: '快递员'
}

/** 公告内容类型（三期） */
export const ANNOUNCEMENT_CONTENT_TYPE = {
  PRODUCT: 'product',
  ACTIVITY: 'activity'
} as const

export const ANNOUNCEMENT_CONTENT_TYPE_LABEL: Record<string, string> = {
  product: '产品推荐',
  activity: '活动内容'
}
