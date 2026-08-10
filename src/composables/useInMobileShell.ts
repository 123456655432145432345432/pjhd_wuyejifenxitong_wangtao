import { computed } from 'vue'
import { usesMobileShell } from '../constants/mobilePortal'
import { useAuthStore } from '../stores/auth'
import { useIsMobile } from './useIsMobile'

/** 是否处于角色的移动端三栏壳层内 */
export function useInMobileShell() {
  const auth = useAuthStore()
  const { isMobile } = useIsMobile()
  const inMobileShell = computed(() => isMobile.value && usesMobileShell(auth.profile))
  return { inMobileShell, isMobile }
}
