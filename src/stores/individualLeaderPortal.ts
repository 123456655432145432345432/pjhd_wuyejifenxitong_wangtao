import { defineStore } from 'pinia'
import { ref } from 'vue'
import { individualLeaderPortalApi } from '../api/services'
import type { IndividualLeaderItem } from '../api/types'
import { ApiError } from '../api/request'
import { useAuthStore } from './auth'

/**
 * 个体负责人工作台。
 * 写接口路径一律用 me，勿用 profile.id（res_）。
 * GET /individual-leaders/my 仅用于展示/缓存 il_ 信息，非调用写接口所必需。
 */
export const useIndividualLeaderPortalStore = defineStore('individualLeaderPortal', () => {
  const detail = ref<IndividualLeaderItem | null>(null)
  const loading = ref(false)
  const loadError = ref('')

  function persistIdToProfile(id: string) {
    const auth = useAuthStore()
    if (!auth.profile || !id || !/^il_/i.test(id)) return
    if (auth.profile.individualLeaderId === id) return
    auth.patchProfile({ individualLeaderId: id })
  }

  async function loadMy(force = false) {
    if (detail.value?.id && !force) return detail.value
    loading.value = true
    loadError.value = ''
    try {
      const mine = await individualLeaderPortalApi.my()
      detail.value = mine
      if (mine?.id) persistIdToProfile(mine.id)
      return detail.value
    } catch (e) {
      loadError.value = e instanceof ApiError ? e.message : '个体负责人信息加载失败'
      return null
    } finally {
      loading.value = false
    }
  }

  function reset() {
    detail.value = null
    loadError.value = ''
  }

  return { detail, loading, loadError, loadMy, reset }
})
