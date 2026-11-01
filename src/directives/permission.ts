import type { Directive, DirectiveBinding } from 'vue'
import { useAuthStore } from '../stores/auth'

/**
 * 按钮级权限指令（v1.2）
 *
 * 用法：
 *   <button v-permission="'merchant:kickout'">踢出</button>
 *   <button v-permission="['permission:manage', 'permission:read']">保存</button>  // 命中任一即显示
 *
 * 语义与 auth.hasPermission 一致：
 * - 未传码 / platform_admin / 权限未加载或为空 → 显示（回落角色控制，不锁站）
 * - 其余 → 命中权限码才显示；不满足时以 display:none 隐藏（保留 DOM，便于调试）
 */
const SENTINEL = '__permission_default_display__'

function resolveCodes(value: string | string[] | undefined): string[] {
  if (!value) return []
  return (Array.isArray(value) ? value : [value]).filter(Boolean)
}

function apply(el: HTMLElement, binding: DirectiveBinding<string | string[] | undefined>) {
  const auth = useAuthStore()
  const codes = resolveCodes(binding.value)
  const allowed = !codes.length || codes.some((code) => auth.hasPermission(code))

  if (el.dataset.permissionDisplay === undefined) {
    el.dataset.permissionDisplay = el.style.display || SENTINEL
  }
  el.style.display = allowed
    ? el.dataset.permissionDisplay === SENTINEL
      ? ''
      : el.dataset.permissionDisplay
    : 'none'
}

export const vPermission: Directive<HTMLElement, string | string[] | undefined> = {
  mounted: apply,
  updated: apply
}

export default vPermission
