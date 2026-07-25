/** Access / Refresh Token 存储
 * - 浏览器：默认 sessionStorage（与既有安全约定一致）
 * - Capacitor 原生：localStorage，避免 WebView 回收后丢登录
 */

import { isNativeApp } from '../utils/native'

const SESSION_ACCESS_KEY = 'accessToken'
const SESSION_REFRESH_KEY = 'refreshToken'
const NATIVE_ACCESS_KEY = 'nativeAccessToken'
const NATIVE_REFRESH_KEY = 'nativeRefreshToken'

let accessToken = ''
let refreshToken = ''

function storage(): Storage | null {
  if (typeof window === 'undefined') return null
  try {
    return isNativeApp() ? localStorage : sessionStorage
  } catch {
    return null
  }
}

function accessKey() {
  return isNativeApp() ? NATIVE_ACCESS_KEY : SESSION_ACCESS_KEY
}

function refreshKey() {
  return isNativeApp() ? NATIVE_REFRESH_KEY : SESSION_REFRESH_KEY
}

function readPersisted(key: string) {
  const store = storage()
  if (!store) return ''
  return store.getItem(key) || ''
}

export function initTokensFromSession() {
  accessToken = readPersisted(accessKey())
  refreshToken = readPersisted(refreshKey())
  // 原生壳启动时兼容曾写入 sessionStorage 的旧值
  if (isNativeApp() && !accessToken && !refreshToken && typeof sessionStorage !== 'undefined') {
    const legacyAccess = sessionStorage.getItem(SESSION_ACCESS_KEY) || ''
    const legacyRefresh = sessionStorage.getItem(SESSION_REFRESH_KEY) || ''
    if (legacyAccess || legacyRefresh) {
      setTokens(legacyAccess, legacyRefresh, true)
      sessionStorage.removeItem(SESSION_ACCESS_KEY)
      sessionStorage.removeItem(SESSION_REFRESH_KEY)
    }
  }
}

export function getAccessToken() {
  return accessToken
}

export function getRefreshToken() {
  return refreshToken
}

export function setTokens(access: string, refresh: string, persistSession = true) {
  accessToken = access
  refreshToken = refresh
  const store = storage()
  if (!store) return
  // 原生环境始终持久化；浏览器仍尊重 remember / persistSession
  if (!persistSession && !isNativeApp()) return
  store.setItem(accessKey(), access)
  store.setItem(refreshKey(), refresh)
}

export function clearTokens() {
  accessToken = ''
  refreshToken = ''
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem(SESSION_ACCESS_KEY)
    sessionStorage.removeItem(SESSION_REFRESH_KEY)
  }
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(NATIVE_ACCESS_KEY)
    localStorage.removeItem(NATIVE_REFRESH_KEY)
  }
}

export function hasValidSession() {
  return !!accessToken || !!refreshToken
}

initTokensFromSession()
