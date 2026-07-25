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

export interface RolePreset {
  id: string
  code: string
  name: string
  role: string
  permissionCodes: string[]
}

export interface Account {
  id: string
  name: string
  phone: string
  initials: string
  role: string
  roleCode: string
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
  const loading = ref(false)
  const saving = ref(false)
  const error = ref('')
  const saveMessage = ref('')

  function setPermissionChecks(codes: string[]) {
    permissionList.value = buildPermissionGroups(permissionPool.value, codes)
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
      permissionList.value = buildPermissionGroups(permissionPool.value, [])
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
    activeAccount.value = account
    saveMessage.value = ''
    error.value = ''
    try {
      const data = await permissionApi.userPermissions(account.id)
      activePresetId.value = data.rolePresetId || ''
      activePresetName.value = data.rolePresetName || ''
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
      const current = getCheckedCodes()
      const original = new Set(originalEffective.value)
      const toGrant = current.filter(code => !original.has(code))
      const toRevoke = originalEffective.value.filter(code => !current.includes(code))

      if (!toGrant.length && !toRevoke.length) {
        saveMessage.value = '权限无变更'
        return
      }

      if (toGrant.length) {
        await permissionApi.grantPermissions(activeAccount.value.id, toGrant)
      }
      if (toRevoke.length) {
        await permissionApi.revokePermissions(activeAccount.value.id, toRevoke)
      }

      const data = await permissionApi.userPermissions(activeAccount.value.id)
      originalEffective.value = [...(data.effectivePermissions || [])]
      setPermissionChecks(data.effectivePermissions || [])
      activePresetId.value = data.rolePresetId || activePresetId.value
      activePresetName.value = data.rolePresetName || activePresetName.value

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
    loading,
    saving,
    error,
    saveMessage,
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
