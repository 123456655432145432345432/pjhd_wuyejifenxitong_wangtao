/// <reference types="capacitor-plugin-jpush" />
import type { CapacitorConfig } from '@capacitor/cli'

/**
 * 极光 AppKey 请在极光控制台创建 Android 应用后填入。
 * 可用环境变量 VITE_JPUSH_APP_KEY 覆盖（构建时注入）。
 */
const jpushAppKey = process.env.VITE_JPUSH_APP_KEY || ''

const config: CapacitorConfig = {
  appId: 'com.yuanxu.wuyejifen',
  appName: '邻里商城服务管理端',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    JPush: {
      appKey: jpushAppKey,
      channel: 'developer-default'
    }
  }
}

export default config
