# 设备推送 API 契约（极光 JPush）

> 前端仓库约定；后端另行实现。未上线时前端会容错（登录不失败）。

## 通用约定

- Base：`/api/v1`
- Auth：除特别说明外，需 `Authorization: Bearer <accessToken>`
- 错误码：沿用现有统一响应 `{ code, message, data }`
- Provider：本期固定 `jpush`

## 1. 上报设备 Token

`POST /devices/push-token`

### Request

```json
{
  "token": "<jpush_registration_id>",
  "provider": "jpush",
  "platform": "android",
  "appId": "com.yuanxu.wuyejifen",
  "deviceId": "optional-device-uuid"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| token | string | 是 | 极光 `registrationId` |
| provider | string | 是 | 固定 `jpush` |
| platform | string | 是 | `android` / `ios` |
| appId | string | 是 | 与 Capacitor `appId` 一致 |
| deviceId | string | 否 | 设备侧可选标识 |

### Behavior

- 将 token 绑定到当前登录用户
- 同一用户同一 token 重复上报应幂等（更新 `updatedAt`）
- 同一 token 换绑到新用户时，解除旧用户绑定

### Response `data` 示例

```json
{
  "token": "1a2b3c...",
  "provider": "jpush",
  "platform": "android",
  "userId": "user_xxx"
}
```

## 2. 解绑设备 Token

`DELETE /devices/push-token?token=<registrationId>&provider=jpush`

或 Body：

```json
{
  "token": "<jpush_registration_id>",
  "provider": "jpush"
}
```

### Behavior

- 仅允许解绑当前用户自己的 token
- token 不存在时返回成功（幂等）

## 3. 服务端发推送（后端内部，非前端调用）

业务事件发生后：

1. 查询用户绑定的 `provider=jpush` token 列表（或极光别名 `user_<userId>`）
2. 调用极光 REST API（使用 **Master Secret**，仅后端持有）
3. 通知内容建议：

```json
{
  "title": "待审核商家",
  "body": "有新的商家入驻待审核",
  "extras": {
    "type": "merchant_pending_audit",
    "routeName": "merchant",
    "path": "/merchant"
  }
}
```

### extras 约定（前端点击跳转）

| 字段 | 说明 |
|------|------|
| type | 业务类型枚举字符串 |
| routeName | Vue Router `name`（优先） |
| path | 路由 path（无 name 时使用） |

### 前端别名约定

登录成功后，前端会尽量设置极光别名：`user_<userId>`。  
后端可按 registrationId **或** 别名推送。

## 4. 建议数据表（后端）

`user_push_devices`

| 列 | 说明 |
|----|------|
| id | PK |
| user_id | 用户 ID |
| provider | `jpush` |
| platform | `android`/`ios` |
| app_id | 包名 |
| token | registrationId |
| created_at / updated_at | 时间戳 |

唯一索引：`(provider, token)`；查询索引：`user_id`。

## 5. 安全

- Master Secret 不得进入前端仓库或 APK
- 上报/解绑必须校验登录态
- 推送内容勿携带敏感明文（手机号、密码等）
