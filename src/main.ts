import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import { useAuthStore } from './stores/auth'
import {
  bindPushAfterLogin,
  initPushNotifications,
  setupAndroidBackButton
} from './composables/usePushNotifications'
import { isNativeApp } from './utils/native'
import './assets/styles/global.css'
import './assets/styles/mobile.css'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
// 尽早初始化 auth，确保后续 API 请求能读取 token
const auth = useAuthStore(pinia)
app.use(router)
app.mount('#app')

void (async () => {
  if (!isNativeApp()) return
  await setupAndroidBackButton(router)
  await initPushNotifications(router)
  if (auth.isLoggedIn) {
    await bindPushAfterLogin(auth.profile?.id)
  }
})()
