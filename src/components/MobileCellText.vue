<script setup lang="ts">
import { nextTick, onMounted, onUpdated, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    /** primary=标题单行省略；clamp=最多 N 行可点开；nowrap=短字段单行 */
    variant?: 'primary' | 'clamp' | 'nowrap'
    lines?: number
    /** clamp 超出时是否允许点击展开/收起 */
    expandable?: boolean
  }>(),
  {
    variant: 'clamp',
    lines: 2,
    expandable: true
  }
)

const root = ref<HTMLElement | null>(null)
const expanded = ref(false)
const overflowing = ref(false)

async function measure() {
  await nextTick()
  if (!root.value || props.variant !== 'clamp' || !props.expandable) {
    overflowing.value = false
    return
  }
  if (expanded.value) return
  overflowing.value = root.value.scrollHeight > root.value.clientHeight + 1
}

onMounted(measure)
onUpdated(measure)
watch(() => [props.lines, props.variant, props.expandable], measure)

function onClick() {
  if (props.variant !== 'clamp' || !props.expandable) return
  if (!overflowing.value && !expanded.value) return
  expanded.value = !expanded.value
  if (!expanded.value) {
    requestAnimationFrame(() => {
      void measure()
    })
  }
}
</script>

<template>
  <span
    ref="root"
    class="mCellText"
    :class="[
      `mCellText--${variant}`,
      {
        'is-expanded': expanded,
        'is-expandable': variant === 'clamp' && expandable && (overflowing || expanded)
      }
    ]"
    :style="variant === 'clamp' ? { '--m-clamp-lines': String(lines) } : undefined"
    @click.stop="onClick"
  >
    <slot />
  </span>
</template>
