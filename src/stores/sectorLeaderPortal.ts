import { defineStore } from 'pinia'
import { ref } from 'vue'
import { sectorLeaderPortalApi } from '../api/services'
import type { SectorLeaderDetail } from '../api/types'
import { ApiError } from '../api/request'

export const useSectorLeaderPortalStore = defineStore('sectorLeaderPortal', () => {
  const detail = ref<SectorLeaderDetail | null>(null)
  const loading = ref(false)
  const loadError = ref('')

  async function loadMy(force = false) {
    if (detail.value && !force) return detail.value
    loading.value = true
    loadError.value = ''
    try {
      detail.value = await sectorLeaderPortalApi.my()
      return detail.value
    } catch (e) {
      loadError.value = e instanceof ApiError ? e.message : '板块信息加载失败'
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
