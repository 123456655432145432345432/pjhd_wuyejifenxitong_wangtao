import { App } from '@capacitor/app'
import type { PluginListenerHandle } from '@capacitor/core'
import { JPush } from 'capacitor-plugin-jpush'
import { devicePushApi } from '../api/services'
import { NATIVE_APP_ID } from '../config/api'
import { getNativePlatform, isNativeApp } from '../utils/native'
import type { Router } from 'vue-router'

const LAST_REG_ID_KEY = 'jpushRegistrationId'

let initialized = false
let listeners: PluginListenerHandle[] = []
let routerRef: Router | null = null

function readLastRegistrationId() {
  if (typeof localStorage === 'undefined') return ''
  return localStorage.getItem(LAST_REG_ID_KEY) || ''
}

function writeLastRegistrationId(id: string) {
  if (typeof localStorage === 'undefined') return
  if (id) localStorage.setItem(LAST_REG_ID_KEY, id)
  else localStorage.removeItem(LAST_REG_ID_KEY)
}

function extractRouteFromExtras(extras: unknown): { name?: string; path?: string } {
  if (!extras || typeof extras !== 'object') return {}
  const data = extras as Record<string, unknown>
  const raw =
    data.rawData && typeof data.rawData === 'object'
      ? (data.rawData as Record<string, unknown>)
      : data
  const nested =
    raw.data && typeof raw.data === 'object' ? (raw.data as Record<string, unknown>) : raw
  const routeName =
    (typeof nested.routeName === 'string' && nested.routeName) ||
    (typeof raw.routeName === 'string' && raw.routeName) ||
    (typeof data.routeName === 'string' && data.routeName) ||
    undefined
  const path =
    (typeof nested.path === 'string' && nested.path) ||
    (typeof raw.path === 'string' && raw.path) ||
    (typeof data.path === 'string' && data.path) ||
    undefined
  return { name: routeName, path }
}

async function navigateFromPushExtras(extras: unknown) {
  if (!routerRef) return
  const { name, path } = extractRouteFromExtras(extras)
  try {
    if (name) {
      await routerRef.push({ name })
      return
    }
    if (path) {
      await routerRef.push(path)
    }
  } catch (e) {
    console.warn('[jpush] navigate failed', e)
  }
}

async function reportRegistrationId(registrationId: string, userAlias?: string) {
  if (!registrationId) return
  writeLastRegistrationId(registrationId)
  if (userAlias) {
    try {
      await JPush.setAlias({ alias: userAlias })
    } catch (e) {
      console.warn('[jpush] setAlias failed', e)
    }
  }
  try {
    await devicePushApi.register({
      token: registrationId,
      provider: 'jpush',
      platform: getNativePlatform() === 'ios' ? 'ios' : 'android',
      appId: NATIVE_APP_ID
    })
  } catch (e) {
    // 后端契约未上线时不阻断登录
    console.warn('[jpush] register push-token failed (backend may be pending)', e)
  }
}

/**
 * 初始化极光推送（仅原生环境）。可在应用启动时调用一次。
 */
export async function initPushNotifications(router: Router) {
  routerRef = router
  if (!isNativeApp() || initialized) return
  initialized = true

  try {
    listeners.push(
      await JPush.addListener('notificationOpened', (data) => {
        void navigateFromPushExtras(data)
      })
    )
    listeners.push(
      await JPush.addListener('notificationReceived', (data) => {
        console.info('[jpush] notificationReceived', data)
      })
    )

    const permission = await JPush.checkPermissions()
    if (permission.permission !== 'granted') {
      await JPush.requestPermissions()
    }

    await JPush.startJPush()
    const { registrationId } = await JPush.getRegistrationID()
    if (registrationId) writeLastRegistrationId(registrationId)
  } catch (e) {
    console.warn('[jpush] init failed', e)
  }
}

/**
 * 登录成功后上报 registrationId，并按用户 id 设置别名。
 */
export async function bindPushAfterLogin(userId?: string) {
  if (!isNativeApp()) return
  try {
    const permission = await JPush.checkPermissions()
    if (permission.permission !== 'granted') {
      await JPush.requestPermissions()
    }
    await JPush.startJPush()
    const { registrationId } = await JPush.getRegistrationID()
    const alias = userId ? `user_${userId}` : undefined
    await reportRegistrationId(registrationId || readLastRegistrationId(), alias)
  } catch (e) {
    console.warn('[jpush] bind after login failed', e)
  }
}

/**
 * 登出时解绑后端 token，并清除极光别名。
 */
export async function unbindPushOnLogout() {
  if (!isNativeApp()) return
  const token = readLastRegistrationId()
  try {
    await JPush.deleteAlias()
  } catch (e) {
    console.warn('[jpush] deleteAlias failed', e)
  }
  if (token) {
    try {
      await devicePushApi.unregister({ token, provider: 'jpush' })
    } catch (e) {
      console.warn('[jpush] unregister failed (backend may be pending)', e)
    }
  }
  writeLastRegistrationId('')
}

/** Android 返回键：有历史则后退，否则二次确认退出 */
export async function setupAndroidBackButton(router: Router) {
  if (!isNativeApp()) return
  await App.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack || window.history.length > 1) {
      router.back()
      return
    }
    if (window.confirm('确定退出应用？')) {
      void App.exitApp()
    }
  })
}

export function teardownPushListeners() {
  listeners.forEach((l) => {
    void l.remove()
  })
  listeners = []
  initialized = false
}
