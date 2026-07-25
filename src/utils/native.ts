import { Capacitor } from '@capacitor/core'

/** 是否运行在 Capacitor 原生壳（Android / iOS） */
export function isNativeApp(): boolean {
  try {
    return Capacitor.isNativePlatform()
  } catch {
    return false
  }
}

export function getNativePlatform(): string {
  try {
    return Capacitor.getPlatform()
  } catch {
    return 'web'
  }
}
