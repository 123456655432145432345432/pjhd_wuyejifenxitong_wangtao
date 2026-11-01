# 管理端完成度对照 · API 接口文档 v8.25

> 核对时间：2026-10-27
> 核对基准：`API接口文档_v8.25.md`（27034 行，含 §1~§108 + 附录 A 管理端遗漏接口补录 + 附录 B 后端未实现接口）
> 被测仓库：`D:/panjinhuadi-wuyejifenxitong-WangYichen`（PC 管理端，Vue3 + TS + Vite）
> 核对方法：文档接口路径 → `src/api/services.ts` 封装记录 → 页面调用 → 路由/菜单入口，四段对齐才算「已完成」
> 状态口径：✅ 已对接 / 🔧 已对接但缺参数或字段 / 🆕 未对接 / ⛔ 后端未实现或口径未定

---

## 0. 规模基线

| 项 | 数量 | 说明 |
|---|---|---|
| 页面文件 | 119 个 `.vue` | 无 `Placeholder` 占位页，路由全部指向真实页面 |
| 路由条目 | 118 条 | 菜单 `route` 与路由 `name` **零断链**（脚本比对通过） |
| 菜单项 | 115 项 | 覆盖 13 类角色工作台（admin / 商家 / 配送员 / 统筹 / 板块 / 个体 / 组长 / 技师 / 楼长 / 物业经理 / 住户 / 移动壳） |
| API 服务分组 | 100 个 `xxxApi` | `src/api/services.ts` 4485 行 |
| 接口路径 | 427 个 | 含文档 §1~§108 的管理端与角色端接口 |

---

## 1. 按文档章节对照（管理端相关）

| 文档章节 | 模块 | 前端落点 | 状态 |
|---|---|---|---|
| §2 / §32 / §34 / §43 | 住户、公告、商家审核、商家踢出 | `Resident.vue` / `Notice.vue` / `Merchant.vue` | ✅ |
| §7 / §45~§47 | 商家、批量配置、挂接、盈利空间 | `Merchant.vue` / `MerchantRecommended.vue` | ✅ |
| §8 / §60.11.1 | 订单、退货审核 | `admin/OrderRefundApprovals.vue` | 🔧 见 §2-A7 |
| §10.5 | 送货管理 | `Delivery.vue` / `CourierManagers.vue` / `DeliveryPriceRanges.vue` | ✅ |
| §14 / §51 | 物业公司、联系方式 | `PropertyCompanies.vue` / `PropertyContact.vue` | 🔧 见 §2-A8 |
| §15 | 物业费 / 欠费报表 | `admin/ArrearsReport.vue`（含导出） | ✅ |
| §21 | 分成（四级分成、记录、统计） | `DistributionRecords.vue` / `DistributionStats.vue` / `SettlementAccount.vue` | ✅ |
| §22~§24 | 商家积分、商家提现、物业币提现审核 | `MerchantPointApproval.vue` / `MerchantWithdrawalApproval.vue` / `CoinWithdrawalApproval.vue` | 🔧 见 §2-A6 |
| §25 | 特惠推送 | `coordinator/CoordinatorOffers.vue` / `sector-leader/SectorLeaderOffers.vue` | ✅ |
| §33 / §49 / §50 | 物业币提现、业主物业币管控、过期 | `CoinWithdrawalApproval.vue` / `Points.vue` | ✅ |
| §37 | 个体负责人管理（任命 / 申请审核 / 分成） | `admin/IndividualLeaders.vue`（`openCreate` 直接任命 + 申请审核双 Tab） | ✅ |
| §38 / §40 / §41 | 线下积分发放、积分池、统筹管理 | `RewardGrantApprovals.vue` / `Points.vue` / `Coordinators.vue` | ✅ |
| §39 | 板块负责人管理 + 工作台 | `SectorLeaders.vue` / `sector-leader/*` | ✅ |
| §42 / §48 | 平台商家、权限管理 | `PlatformShareConfig.vue` / `Permission.vue` / `RoleAccounts.vue` | ✅ |
| §44 | 仪表盘 | `Dashboard.vue`（1153 行，全部取 `/admin/dashboard/overview`） | ⛔ 口径待后端 |
| §52 / §66 | 定向推送、公告增强 | `DirectedMessage.vue` / `Notice.vue` | ✅ |
| §53 / §54 | 社区多物业绑定、物业操作员 | `CommunityEntity.vue` / `PropertyOperators.vue` | ✅ |
| §58 | 咨询师管理 | `admin/Consultants.vue` | ✅ |
| §59 / §63.2~63.3 | 商家广告、分销商品 | `MerchantAdSettings.vue` / `MerchantAds.vue` | ✅ |
| §60 | 业主商户体系 | `admin/ResidentMerchants.vue`（1139 行） | 🔧 缺 5 字段 |
| §60.16 | 一级代理申请与身份 | `DistributorApplications.vue` + `distributorAdminApi` | ✅ |
| §61 / §64 | 模块负责人体系、统筹工作台 | `coordinator/*`（11 页） | ✅ |
| §62 / §70 | 快递负责人、多角色提现 | `CourierManagers.vue` / `RoleWithdrawalApproval.vue` | ✅ |
| §65 | 价格审批 | `admin/PriceApprovals.vue`（903 行） | ⛔ 归属待定 |
| §68 | 履约方式选择与自配分账 | `FulfillmentPanel.vue` / `MerchantOrders.vue` | 🔧 见 §2-A9 |
| §71 | 平台分成体系 | `PlatformShareConfig.vue` / `PlatformEarnings.vue` | ✅ |
| §72 | 技工工作台 | `technician/*` | ✅ |
| §73 | 社区食堂 | `admin/CanteenManage.vue`（1492 行） | ✅ |
| §88 / §89 | 物业住户聊天、积分统计 | `PropertyChat.vue` / `Points.vue` | ✅ |
| §90 / §92 | CBK 分账与对账（历史） | `CbkAccounts.vue` / `CbkReconcile.vue`（菜单标注「历史」） | ✅ |
| §97 | 电商收付通进件、待追回台账 | `MerchantApplyment.vue` / `SplitRecovery.vue` / `TransferAccounts.vue` | ✅ |
| §99 | 单元楼长 + 业主卖货钱包 | `BuildingLeaders.vue` / `building-leader/*` / `ResidentSellerWallet.vue` | ✅ |
| §100 | 物业公司经理 | `PropertyManagers.vue` / `property-manager/*` | ✅ |
| §101 | 活动组组长申请审核 | `ActivityLeaderApplications.vue`（三态 Tab + 审核 + 撤销） | ✅ |
| §106 | 平台交易明细（v8.20） | `PlatformTransactions.vue`（822 行）+ 3 个接口 | ✅ |
| §C.1~C.17 | 社区论坛 + 影子封禁 | `CommunityForum.vue`（帖子 / 举报 / 禁言名单三 Tab） | 🔧 见 §2-A3 |
| 附录 A | 管理端遗漏接口补录（20 模式 / 34 接口） | 见 §2 | 3 项未接 |

---

## 2. 本轮新发现缺口（对照 v8.16~v8.25 新增条款）

### A. 接口层

| # | 文档条款 | 要求 | 前端现状 | 状态 |
|---|---|---|---|---|
| A1 | §C.16 (v8.14) | `DELETE /admin/community/users/{residentId}/forum-ban` 解除禁言 | **本轮已实现**：`services.ts` 新增 `liftForumBan()`；禁言名单 Tab 加「解除禁言」按钮（仅 active 行可见）+ 二次确认 + 成功提示条；97051 直接展示后端 message | ✅ |
| A2 | 附录 A.2.1 (v8.24) | `POST /admin/community/posts/{id}/visibility` 设置帖子可见范围 | 全仓无该路径。后端回复：**先别联调**，等其补角色校验与 `visibleResidentId` 同物业校验（§4-1/§4-2） | ⛔ 等后端 |
| A3 | 附录 A.5.3 (v8.24) | `POST /admin/delivery-rules` 新增配送规则 | 只有 `GET` 与 `PUT`。后端确认：每物业最多一条，建物业时已自动初始化，重复创建返 80003；建议只做「空列表初始化」入口 —— **待产品定是否要常态化新增** | ⏸ 待产品 |
| A4 | §68.4 / 附录 A.7.1 | 管理员强制改履约方式 | **两路径并存、实现相同**（§68.4 原文）。前端用 §68.4 的 `/admin/orders/{id}/override-fulfillment`，入口在 `Delivery.vue:472`。**合规** | ✅ |
| A5 | §105 (v8.19) | 写接口带 `X-Request-Id` | §105.2 只覆盖 7 个 C 端/商家端接口，本仓仅 `POST /merchant/withdrawals`（`services.ts:1383`）落在范围内 | 🔧 待补 |
| A6 | §102.5 (v8.16) | 提现 `94006` 可提现余额不足 | **本轮已补**错误码映射（`request.ts`），并与 94005 区分；message 内带上限值，直接 toast | ✅ |
| A7 | §103.1 (v8.17) | 非 `platform_admin` 的结算配置 / 订单配置保存按钮置灰 | 后端已给判据（`role === 'platform_admin'` 唯一，无物业细分）。`SettlementConfig.vue`、`Param.vue:682` 仍无判断 —— 批 2 待做 | 🆕 待做 |
| A8 | §103.3 (v8.17) | 创建物业管理员展示 14 位随机 `initialPassword` | **本轮已修**：删除 `'admin123456'` 兜底（后端强调该密码对所有新建账号必然登录失败），字段缺失时改为明确提示「联系后端重置」 | ✅ |
| A9 | 附录 B | `GET /delivery-rules/scope-options` 后端确认**不补** | **本轮已删**调用与 API 封装，改走本地枚举；三套枚举已在 `enums.ts` 并存且注释区分（价格区间 / 商家配送 / 消息服务半径） | ✅ |
| A10 | 后端回复 3.5 | `GET /admin/delivery-orders` 实际下发 `deliveryStatusCode` | **本轮已修**：`types.ts` 补 `deliveryStatusCode` 并标注 `deliveryStatus` 为 deprecated；`Delivery.vue:196`、`FulfillmentPanel.vue:137` 改为双读 | ✅ |

### B. 口径 / 展示层

| # | 文档条款 | 要求 | 前端现状 |
|---|---|---|---|
| B1 | §102.4 (v8.16) | `role` 只有 `platform_admin` 可改 | `Resident.vue:705` 注释仍写「仅 property_admin 可编辑」，无 platform_admin 判定 —— 批 2 待做（后端已明确 platform_admin 走现有 `PUT /residents/{id}` 已放行） |
| B2 | 配送双状态 | 订单状态无 `delivered`；中间态 = 配送单 `completed` + 订单 `delivering` + `deliveredAt` | **本轮已按后端口径改写注释**（`mappers.ts:838`），行为不变：仅保留 `delivered → completed` 的历史数据归一 |
| B3 | §60.9.1.1 | 业主小店 5 个店铺资料字段 | 审核列表仍无 5 字段。后端确认本轮补进 `GET /admin/resident-merchant-applications`（**`/admin/resident-merchants` 路径不存在**，前端用的正是 applications，无需改路径）—— 等 §4-5 发布后加列 |
| B4 | §C.15 (v8.14) | `97050`/`97051` 友好提示 | **本轮已补**映射（`request.ts`） |

---

## 3. 历史遗留未闭环（2026-10-22 清单延续）

| # | 事项 | 现状 | 阻塞方 |
|---|---|---|---|
| 1 | 「标签 true + 业务表 status=active」双条件 + 「已停用」展示 | 未做，管理端列表无 status 字段 | 后端 |
| 2 | 个体负责人发起的分成变更由谁审批（物业领导 vs 板块负责人） | 前端仍为物业领导审批（`roles.ts:159-163` `canAuditPriceApproval`） | 产品 + 后端 |
| 3 | 一级代理提现 `withdrawal_type` 实际值 | 已补 `distributor` 枚举兼容，若后端发 `merchant` 则该枚举冗余 | 后端 |
| 4 | 数据大盘 GMV / 结算口径 | 前端不计算，全取后端 overview | 后端 |
| 5 | 任命后标签即时回写 | 依赖后端 `/residents/me` 行为 | 后端 |

---

## 4. 已确认闭环（本轮核实，无需再排）

- v8.14 论坛禁言**下发 + 名单 + 管理员视图**三件套已落地（`services.ts:3603/3611/3618/3625`）。
- v8.15 组长申请审核已落地（`services.ts:2834/2849`，页面 412 行）。
- v8.12 一级代理审核 + 直接开通已落地（`services.ts:3194/3276`）。
- 身份标签体系已落地：`types.ts:75-89`、`roles.ts:223-264`、`Resident.vue:721-746`，路由守门改用 `canAccessRouteAny`（`router/index.ts:951`），**路由 meta 未改一行**。
- 个体负责人任命接口已存在（`services.ts:2713` POST `/admin/individual-leaders`），10-22 清单 #17 可关闭。
- `RoleAccounts` 直建 `activity_leader` 经 v8.15 §101.3 判定为「双入口同能力」，判为非冲突，可关闭。
- v8.20 平台交易明细：菜单在 `PLATFORM_ADMIN_ONLY_ROUTES`（`menus.ts:107`），三接口齐备（`services.ts:4436/4448/4469`）。

---

## 5. 建议排期

```
✅ 已完成（本轮，2026-10-27）
   A1 解除禁言 · A6 94006 · A8 兜底密码 · A9 scope-options 死调用 · B4 97050/97051
   + deliveryStatusCode 字段名修正（后端回复 3 条中未点名、但会导致状态归类和兜底失效）

① 可立即做（不依赖后端，剩余 1 项）
   A7 结算配置 / 订单配置保存按 platform_admin 置灰
   B1 住户编辑 canEditResident 放行 platform_admin + role 下拉仅平台可改

② 需产品确认后做
   A3 POST 配送规则（后端回复：每物业最多一条、建物业时已初始化、重复返 80003）
   B2 配送双状态口径（后端已明确：订单状态无 delivered，中间态=配送单 completed + 订单 delivering）
   业主小店「已停用」店铺是否在审核列表展示
   merchant_distribution 分成变更单审批归属（后端倾向板块负责人唯一审批）

③ 等后端发版（§4-1/4-2/4-3/4-5）
   A2 帖子可见范围（需先补角色校验 + visibleResidentId 同物业校验）
   B3 业主小店 5 字段
   配送概览「今日完成」口径字段
```

---

*本清单全部结论均落到文件与行号，未做推测性扩写。文档 §1~§108 中纯移动端/住户端章节（§3~§6、§11~§13、§16~§20、§26~§31、§55~§57、§67、§95、§107~§108）未纳入管理端核对范围。*
