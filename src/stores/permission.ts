import { defineStore } from 'pinia'
import { ref } from 'vue'
import { permissionApi } from '../api/services'
import {
  buildPermissionGroups,
  extractPermissionPool,
  mapAdminUserAccounts,
  mapPermissionChangeLogs,
  normalizeRolePresets
} from '../api/mappers'
import type { PermissionItemDto } from '../api/types'
import { ApiError } from '../api/request'
import { PERMISSION_CODES_WITHOUT_PAGE } from '../constants/permissionCodes'

export interface RolePreset {
  id: string
  code: string
  name: string
  role: string
  permissionCodes: string[]
  /** v1.3：内置预设（如活动组组长 rp_003）只允许改描述，权限码不可编辑 */
  isBuiltin?: boolean
}

export interface Account {
  id: string
  name: string
  phone: string
  initials: string
  role: string
  roleCode: string
  /** v1.3：roleCodes 派生的中文标签，如 ['活动组组长'] */
  roleTags?: string[]
  /** v1.3：是否具备管理端工作台身份；false 不可授权 */
  adminWorkspace?: boolean
  permissionCount: number
}

export interface PermissionItem {
  code: string
  name: string
  description: string
  checked: boolean
}

export interface PermissionCategory {
  category: string
  items: PermissionItem[]
}

export interface Log {
  id: string
  time: string
  operator: string
  target: string
  content: string
}

export const usePermissionStore = defineStore('permission', () => {
  const ACCOUNT_PAGE_SIZE = 20

  const roleList = ref<RolePreset[]>([])
  const accountList = ref<Account[]>([])
  const accountTotal = ref(0)
  const accountPage = ref(1)
  const accountsLoadingMore = ref(false)
  const permissionList = ref<PermissionCategory[]>([])
  const permissionPool = ref<PermissionItemDto[]>([])
  const logList = ref<Log[]>([])
  const activeAccount = ref<Account | null>(null)
  const activePresetId = ref('')
  const activePresetName = ref('')
  const originalEffective = ref<string[]>([])
  /** v2：授权/撤销原因，随 grant / revoke 一起提交，会写进变更日志 */
  const changeReason = ref('')
  const loading = ref(false)
  const saving = ref(false)
  const error = ref('')
  const saveMessage = ref('')

  /**
   * v1.3：标签身份（活动组长 / 统筹 / 板块 / 个体 / 社区管理员）。
   * 这些账号 residents.role 恒为 resident，靠 roleCodes 承载身份。
   */
  function isTagIdentityAccount(account: Account | null): boolean {
    if (!account) return false
    return account.roleCode === 'resident' || account.roleCode === 'community_admin'
  }

  /**
   * v1.3：按目标账号身份收敛「可授权限」列表（文档 §4.3）。
   * - 标签身份 → 仅 grantableToTagIdentities=true（当前为 community:read / community:manage）
   * - 平台管理员 → 全部
   * - 物业管理员等其他管理端身份 → 排除 isPlatformOnly
   * 兼容：后端未下发 grantableToTagIdentities（全为 undefined）时不过滤，
   * 否则标签身份会看到空列表，反而无法操作。
   *
   * 2026-10-30：先剔除「本期无前端页面」的码（`PERMISSION_CODES_WITHOUT_PAGE`）。
   * 这些码后端仍可授，但本仓没有页面，勾选后不会长出 tab，只会制造「配了没反应」的困惑。
   * 剔除只影响勾选列表，不影响已有授权——保存时撤销只针对本次可见项，不会误清空。
   */
  /**
   * 剔除「本期无前端页面」的权限码（`PERMISSION_CODES_WITHOUT_PAGE`，后端 2026-10-30 §5）。
   * 这些码后端仍可授、接口仍存在，但本仓没有页面，勾选后不会长出 tab，
   * 只会制造「配了没反应」的困惑，因此在勾选列表里隐藏。
   *
   * 只影响勾选列表，不影响已有授权：保存时撤销只针对本次可见项，不会误清空账号原有权限。
   */
  function stripUnreachable(pool: PermissionItemDto[]): PermissionItemDto[] {
    return pool.filter((item) => !PERMISSION_CODES_WITHOUT_PAGE.includes(item.code))
  }

  function visiblePool(): PermissionItemDto[] {
    const account = activeAccount.value
    const tagIdentity = isTagIdentityAccount(account)
    const hasTagFlag = permissionPool.value.some((item) => item.grantableToTagIdentities === true)
    return stripUnreachable(permissionPool.value).filter((item) => {
      if (tagIdentity && hasTagFlag) return item.grantableToTagIdentities === true
      if (account?.roleCode === 'platform_admin') return true
      return item.isPlatformOnly !== true
    })
  }

  function setPermissionChecks(codes: string[]) {
    permissionList.value = buildPermissionGroups(visiblePool(), codes)
  }

  function getCheckedCodes() {
    return permissionList.value.flatMap(group => group.items.filter(item => item.checked).map(item => item.code))
  }

  async function loadLogs(userId?: string) {
    const logs = await permissionApi.changeLogs({
      page: 1,
      pageSize: 20,
      userId,
      sort: '-createdAt'
    })
    logList.value = mapPermissionChangeLogs(logs.list || [])
  }

  async function loadAccounts(keyword = '', page = 1, append = false) {
    if (append) {
      accountsLoadingMore.value = true
    }
    const res = await permissionApi.users({
      keyword: keyword || undefined,
      page,
      pageSize: ACCOUNT_PAGE_SIZE
    })
    const mapped = mapAdminUserAccounts(res.accounts || [])
    accountTotal.value = res.total ?? mapped.length
    accountPage.value = page
    if (append) {
      accountList.value = [...accountList.value, ...mapped]
    } else {
      accountList.value = mapped
    }
    if (append) {
      accountsLoadingMore.value = false
    }
  }

  async function loadMoreAccounts(keyword = '') {
    if (accountsLoadingMore.value || loading.value) return
    if (accountList.value.length >= accountTotal.value) return
    try {
      await loadAccounts(keyword, accountPage.value + 1, true)
    } catch (e) {
      error.value = e instanceof ApiError ? e.message : '账号加载失败'
    }
  }

  async function load() {
    loading.value = true
    error.value = ''
    try {
      const [permissionsRes, rolesRes] = await Promise.all([
        permissionApi.permissions(),
        permissionApi.rolePresets()
      ])
      permissionPool.value = extractPermissionPool(permissionsRes)
      roleList.value = normalizeRolePresets(rolesRes)
      permissionList.value = buildPermissionGroups(stripUnreachable(permissionPool.value), [])
      await Promise.all([loadAccounts(), loadLogs()])
      if (accountList.value.length) {
        await selectAccount(accountList.value[0])
      }
    } catch (e) {
      error.value = e instanceof ApiError ? e.message : '权限数据加载失败'
    } finally {
      loading.value = false
    }
  }

  async function searchAccounts(keyword: string) {
    loading.value = true
    error.value = ''
    try {
      await loadAccounts(keyword)
    } catch (e) {
      error.value = e instanceof ApiError ? e.message : '账号搜索失败'
    } finally {
      loading.value = false
    }
  }

  async function selectAccount(account: Account) {
    // v2（文档 §5.1）：adminWorkspace=false 的账号不允许进入授权详情
    if (account.adminWorkspace === false) {
      activeAccount.value = account
      permissionList.value = []
      originalEffective.value = []
      error.value = '该账号不具备管理端工作台身份（adminWorkspace=false），不能配置管理端权限'
      return
    }
    activeAccount.value = account
    saveMessage.value = ''
    error.value = ''
    changeReason.value = ''
    try {
      const data = await permissionApi.userPermissions(account.id)
      // v1.3：appliedPreset 按 roleCodes 命中（活动组长返回 rp_003），兼容旧的 rolePresetId 字段
      activePresetId.value = data.rolePresetId || data.appliedPreset?.id || ''
      activePresetName.value = data.rolePresetName || data.appliedPreset?.name || ''
      originalEffective.value = [...(data.effectivePermissions || [])]
      setPermissionChecks(data.effectivePermissions || [])
      await loadLogs(account.id)
    } catch (e) {
      error.value = e instanceof ApiError ? e.message : '用户权限加载失败'
    }
  }

  function applyPreset(preset: RolePreset) {
    if (!activeAccount.value) {
      error.value = '请先选择要配置的账号'
      return
    }
    // v1.3（文档 §4.4）：活动组长等标签身份命中的是内置预设，权限码不可整体套用，
    // 只能在下方逐项勾选单独授权，否则会把预设里的权限覆盖到账号上。
    if (isTagIdentityAccount(activeAccount.value) && preset.isBuiltin === true) {
      error.value = '该账号命中的是内置预设，权限不可整体套用，请在下方直接勾选要授予的权限项'
      return
    }
    activePresetId.value = preset.id
    activePresetName.value = preset.name
    setPermissionChecks(preset.permissionCodes)
    saveMessage.value = `已应用预设「${preset.name}」，请点击保存生效`
    error.value = ''
  }

  function togglePermission(category: string, code: string) {
    const group = permissionList.value.find(item => item.category === category)
    if (!group) return
    const item = group.items.find(item => item.code === code)
    if (item) item.checked = !item.checked
    saveMessage.value = ''
  }

  function resetPermissions() {
    if (!activeAccount.value) return
    setPermissionChecks(originalEffective.value)
    saveMessage.value = '已恢复为当前生效权限'
    error.value = ''
  }

  async function savePermissions() {
    if (!activeAccount.value) {
      error.value = '请先选择账号'
      return
    }
    saving.value = true
    error.value = ''
    saveMessage.value = ''
    try {
      // v2（文档 §5.3）：adminWorkspace=false 的账号不进管理端，授予也无效，后端会 10002
      if (activeAccount.value.adminWorkspace === false) {
        error.value = '该账号不具备管理端工作台身份，不能授予管理端权限'
        return
      }
      const current = getCheckedCodes()
      const original = new Set(originalEffective.value)
      const toGrant = current.filter(code => !original.has(code))
      // v1.3：只撤销「本次可见且未勾选」的码。
      // 因 visiblePool 会按身份隐藏部分权限（如标签身份只显示社区论坛、物业端隐藏平台专属），
      // 若对所有 original 求差集，会把账号原有但当前不可见的权限一并静默撤销。
      const visibleCodes = new Set(
        permissionList.value.flatMap(group => group.items.map(item => item.code))
      )
      const toRevoke = originalEffective.value.filter(
        code => visibleCodes.has(code) && !current.includes(code)
      )

      if (!toGrant.length && !toRevoke.length) {
        saveMessage.value = '权限无变更'
        return
      }

      const reason = changeReason.value.trim() || undefined
      if (toGrant.length) {
        await permissionApi.grantPermissions(activeAccount.value.id, toGrant, reason)
      }
      if (toRevoke.length) {
        await permissionApi.revokePermissions(activeAccount.value.id, toRevoke, reason)
      }

      const data = await permissionApi.userPermissions(activeAccount.value.id)
      originalEffective.value = [...(data.effectivePermissions || [])]
      setPermissionChecks(data.effectivePermissions || [])
      activePresetId.value = data.rolePresetId || data.appliedPreset?.id || activePresetId.value
      activePresetName.value = data.rolePresetName || data.appliedPreset?.name || activePresetName.value
      changeReason.value = ''

      if (activeAccount.value) {
        activeAccount.value = {
          ...activeAccount.value,
          permissionCount: data.effectivePermissions?.length ?? activeAccount.value.permissionCount
        }
        const idx = accountList.value.findIndex(item => item.id === activeAccount.value!.id)
        if (idx >= 0) {
          accountList.value[idx] = { ...accountList.value[idx], permissionCount: data.effectivePermissions?.length ?? 0 }
        }
      }

      await loadLogs(activeAccount.value.id)
      saveMessage.value = '权限已保存并立即生效'
    } catch (e) {
      error.value = e instanceof ApiError ? e.message : '权限保存失败'
    } finally {
      saving.value = false
    }
  }

  return {
    roleList,
    accountList,
    accountTotal,
    accountsLoadingMore,
    permissionList,
    logList,
    activeAccount,
    activePresetId,
    activePresetName,
    changeReason,
    loading,
    saving,
    error,
    saveMessage,
    isTagIdentityAccount,
    load,
    searchAccounts,
    loadMoreAccounts,
    selectAccount,
    applyPreset,
    togglePermission,
    resetPermissions,
    savePermissions
  }
})
