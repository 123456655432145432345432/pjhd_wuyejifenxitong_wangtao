# 住户端如何看到统筹发布的特惠（API v8.3）

> **日期**：2026-09-08  
> **对照**：`API接口文档_v8.2(1).md`（文首实为 v8.3）、`2026-09-08_板块与特惠_后端修复说明.html` §2 / §25.6  
> **受众**：住户端（小程序 / App）联调；管理端创建侧见下文「管理端须满足」

## 一句话结论

同物业住户用 **Token** 调 `GET /api/v1/special-offers` 或 `GET /api/v1/special-offers/my`，只能看到 **`status=published`**、**当前时间在有效期内**、且命中 **targetType** 规则的特惠；**不按 `publisherRole` 过滤**，统筹发布的也会出来。

## C 端接口

| 用途 | 方法 | 路径 | 角色 |
|------|------|------|------|
| 特惠列表 | `GET` | `/special-offers` | `resident`（须登录） |
| 我的可见特惠（等价列表） | `GET` | `/special-offers/my` | `resident` |
| 详情 | `GET` | `/special-offers/{id}` | `resident`（须对该条可见） |

匿名无 Token → **403**。管理端角色仍可调列表，但过滤规则与住户不同（管理端看草稿等）。

## 可见规则（§25.6，后端已实现）

| 条件 | 规则 |
|------|------|
| 状态 | **仅 `published`**；`draft` / `ended` / `archived` 不可见 |
| 时间 | `startTime` 空或 ≤ now；`endTime` 空或 ≥ now；都空 = 长期有效 |
| 物业 | **强制**当前住户 `propertyCompanyId` |
| `targetType=all` | 本物业全体住户可见 |
| `targetType=building` | `communityId` 空 → 本物业；非空 → 仅该小区 |
| `targetType=role` | `merchantId` 空 → 本物业；非空 → 仅在该商户有过**已完成订单**的住户 |
| `targetType=tag` | 暂无标签体系，暂按本物业全体可见 |
| `publisherRole` | **不额外过滤**（统筹 / 板块负责人发布均可） |

过期记录：住户列表**直接不返回**（不会带「已结束」标记）。

## 管理端须满足（否则住户永远看不到）

1. 创建时带 `"status": "published"`，或先草稿再 `POST /special-offers/{id}/publish`  
2. `startTime` / `endTime` 覆盖当前（或留空）  
3. 联调最稳：`targetType=all`（全体业主）  
4. 指定商户时：目标住户须已在该商户有完成订单，否则不可见  

管理端本仓库已默认「已发布」，列表提供「立即发布 / 下架」。

## 联调最短路径

```http
# 1) 统筹创建（管理端）
POST /api/v1/special-offers
Authorization: Bearer <coordinator_token>
Content-Type: application/json

{
  "title": "周末特惠",
  "content": "满50减5",
  "targetType": "all",
  "startTime": "2026-09-08T00:00:00.000Z",
  "endTime": "2026-09-15T23:59:59.000Z",
  "status": "published"
}

# 2) 同物业住户拉取
GET /api/v1/special-offers?page=1&pageSize=20
Authorization: Bearer <resident_token>
```

期望：`code=0`，`list` 含该 `id`，且 `publisherRole` 可为 `coordinator`。

## 住户端 UI 建议

- 首页 / 特惠 Tab 调 `GET /special-offers` 或 `/special-offers/my`（二选一即可）  
- 展示字段可用：`title`、`content`、`discountInfo`、`coverUrl`、`startTime`/`endTime`、`merchantName`、`statusLabel`  
- 勿在住户端再筛掉 `publisherRole=coordinator`  
- 草稿 / 下架后刷新列表应消失  

## 测服前置

1. 后端已部署 **API v8.3**  
2. 已执行 `sql/2026-09-08_板块枚举与特惠可见性_数据库脚本.sql`  
