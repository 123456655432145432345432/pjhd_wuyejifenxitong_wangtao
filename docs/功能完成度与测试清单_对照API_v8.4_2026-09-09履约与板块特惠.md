# 功能完成度与测试清单 — 对照 API v8.4（履约链路 / 板块特惠）

> **更新日期**：2026-09-09  
> **对照**：
> - `API接口文档_v8.4.md`
> - `2026-09-09_履约链路与板块特惠_前端交付说明.html`
> **范围**：本仓库管理端（商家订单 / 骑手待抢 / 板块特惠 / 履约改派）  
> **状态总览**：前端已按 v8.4 对齐；测服需部署后端 v8.4 + 执行 `sql/2026-09-09_履约链路与板块特惠权限_数据库脚本.sql`  
> **图例**：✅ 已接 · ⬜ 待测服 · ⚪ 非本仓

## 1. 完成度总表

| # | 后端项 | 状态 | 前端落点 |
|---|--------|------|----------|
| 1 | 支付后 `pending_choice` + 自动进大厅；fulfillment 不再恒 409 | ✅ | `MerchantOrders` / `FulfillmentPanel` 按 `fulfillmentMode` 显隐 |
| 2 | `POST /orders/{id}/send-delivery` 新增（幂等） | ✅ | `merchantPortalApi.sendDelivery`；主路径仍用 `chooseFulfillment` |
| 3 | `choose-fulfillment` 与商家 `.../fulfillment` 同实现 | ✅ | 继续走 `/merchants/my/orders/{id}/fulfillment` |
| 4 | `POST /deliveries/{id}/merchant-confirm` | ✅ | 「确认送达」→ `confirmMerchantDelivery` |
| 5 | 待抢大厅含 `delivering + courier_hall`；排除商家自配 | ✅ | 后端过滤；骑手端额外排除 `carrierType=merchant` |
| 6 | 板块负责人特惠写权限（含 publish/unpublish/详情） | ✅ | 路径不变；文案去掉「须 promotion.push」；`404 90001` 按后端 message |
| 7 | 错误码 `80020`（非骑手承运）/`80010` 归价格区间 | ✅ | `request.ts` + `PHASE2_ERROR_MESSAGE` |
| 8 | 管理端 `override-fulfillment` | ✅ | `ordersApi.overrideFulfillment`（Delivery 页） |

## 2. 本轮代码变更

| 文件 | 要点 |
|------|------|
| `src/api/request.ts` | `70002/70021/70025` 文案；`80010`→价格区间；新增 `80020`；`80021`/`90001` |
| `src/constants/enums.ts` | 履约标签对齐「待选择/平台配送」；PHASE2 错误码同步 |
| `src/api/services.ts` | choose/send 响应补 `alreadyExists`/`statusCode`；注释对齐幂等 |
| `src/utils/fulfillment.ts` | `null` mode 兜底 `pending_choice`；超时不可再选 |
| `src/components/FulfillmentPanel.vue` | 无需配送 / 平台配送提示；按钮文案 |
| `src/views/merchant/MerchantOrders.vue` | 按钮文案；`alreadyExists` 提示 |
| `src/views/sector-leader/SectorLeaderOffers.vue` | v8.4 权限说明 |

## 3. 测试清单（测服）

### 3.1 商家履约

| # | 步骤 | 期望 | 结果 |
|---|------|------|------|
| A | 住户支付非团购/非食堂单 | 订单 `paid` + `pending_choice`，有截止时间；可看到两按钮 | ⬜ |
| B | 点「商家自行配送」 | 200；`merchant_self`；可「确认送达」；大厅看不到该单 | ⬜ |
| C | 「确认送达」 | 配送/订单 `completed` | ⬜ |
| D | 另单点「发布到平台配送」 | 200；`courier_hall`；不再重复出选择按钮 | ⬜ |
| E | 骑手抢单 → complete | 正常完成；对商家自配单调 complete → `400 80020` | ⬜ |
| F | 团购/食堂单 | 显示无需配送，无履约按钮；误调 → `70022` | ⬜ |
| G | 超时未选 | 自动 `courier_hall`；再选手动 → `70021` | ⬜ |

### 3.2 板块特惠

| # | 步骤 | 期望 | 结果 |
|---|------|------|------|
| A | 板块负责人新建/编辑/删除特惠 | **200**（不再 403） | ⬜ |
| B | 立即发布 / 下架 | 200 | ⬜ |
| C | 看自己创建的详情 | 200 | ⬜ |
| D | 越权操作他人物业数据 | `404 90001`「特惠不存在」 | ⬜ |

## 4. 测服前置

1. 后端 v8.4  
2. `sql/2026-09-09_履约链路与板块特惠权限_数据库脚本.sql`  
3. 重启服务（含超时 Job）

## 5. 相关文档

- 上一轮板块/特惠 C 端可见：[`对照API_v8.3_2026-09-08板块与特惠.md`](./功能完成度与测试清单_对照API_v8.3_2026-09-08板块与特惠.md)
- 对接问题索引：[`后端对接问题/README.md`](./后端对接问题/README.md)

## 6. 已知边界

| 项 | 说明 |
|----|------|
| `80021` 数字码 | 文档履约=配送单不存在，食堂章也复用；前端**优先展示后端 message**，兜底为「配送单不存在」；食堂主店用 `CANTEEN_NOT_MAIN_MERCHANT` 字符串码 |
| `send-delivery` | 主路径不必调用；仅作幂等兼容 |
| 住户端首页特惠入口 | 不在本仓（`PJHD-main`） |
