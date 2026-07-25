# Android 套壳 APK 构建说明

本项目通过 **Capacitor** 将 Vue 管理后台打包为 Android App，推送使用国内 **极光 JPush**（非 FCM）。

## 前置条件

1. 本机安装 [Android Studio](https://developer.android.com/studio) 与 Android SDK
2. JDK 17（推荐）
3. 极光控制台创建 Android 应用，包名必须为：`com.yuanxu.wuyejifen`
4. 取得极光 **AppKey**（可进前端）与 **Master Secret**（仅后端）

## 配置 AppKey

任选其一：

### 方式 A：环境变量（推荐）

```bash
export VITE_JPUSH_APP_KEY=你的极光AppKey
npm run build:android
```

### 方式 B：直接改配置

编辑根目录 `capacitor.config.ts`：

```ts
plugins: {
  JPush: {
    appKey: '你的极光AppKey',
    channel: 'developer-default'
  }
}
```

## 构建与同步

```bash
# 安装依赖
npm install

# 构建 Web + 同步到 android/
npm run build:android

# 首次若尚无 android 工程：
npx cap add android
npm run build:android
```

## 用 Android Studio 打 APK

```bash
npx cap open android
```

在 Android Studio 中：

1. 等待 Gradle Sync 完成
2. **Build → Build Bundle(s) / APK(s) → Build APK(s)**
3. Debug APK 路径通常为：`android/app/build/outputs/apk/debug/app-debug.apk`

或命令行（需已配置 `ANDROID_HOME`）：

```bash
cd android
./gradlew assembleDebug
```

## 推送联调

1. 安装 APK，登录后台账号
2. Logcat 中确认已拿到 `registrationId`（前端会尝试上报 `/api/v1/devices/push-token`）
3. 后端按 [push-api-contract.md](./push-api-contract.md) 实现上报/解绑与发推送
4. 也可先在极光控制台用该 `registrationId` 发测试通知验证锁屏可达

## 厂商通道（可选后补）

要在华为/小米/OPPO/vivo 上更稳定，需在极光控制台配置各厂商通道参数。  
未配置时仍可能通过极光默认通道送达，但各品牌杀后台策略下成功率不一。

## 常见问题

- **白屏**：确认已 `vite build` 且 `webDir` 为 `dist`，`base: './'`
- **接口失败**：原生环境直连 `https://test.yuanxusoftware.top/api/v1`，需后端允许 App Origin / 不校验浏览器 Origin
- **收不到推送**：检查 AppKey、包名、通知权限、以及设备网络；国内勿使用 FCM
