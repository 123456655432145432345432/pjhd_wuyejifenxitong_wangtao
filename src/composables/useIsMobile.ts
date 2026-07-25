import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const DEFAULT_BREAKPOINT = 768

export function useIsMobile(breakpoint = DEFAULT_BREAKPOINT) {
  const viewportWidth = ref<number>(
    typeof window !== 'undefined' ? window.innerWidth : breakpoint + 1
  )

  function syncViewportWidth() {
    viewportWidth.value = window.innerWidth
  }

  onMounted(() => {
    syncViewportWidth()
    window.addEventListener('resize', syncViewportWidth, { passive: true })
  })

  onBeforeUnmount(() => {
    window.removeEventListener('resize', syncViewportWidth)
  })

  const isMobile = computed(() => viewportWidth.value <= breakpoint)

  return {
    isMobile,
    viewportWidth
  }
}
