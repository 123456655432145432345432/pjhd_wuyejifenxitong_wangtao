# 功能完成度与测试清单 — 对照 API v8.9（单元楼长 · 全量交付）

> **更新日期**：2026-10-04（第二批：楼长工作台 + 业主卖货钱包；同步 2026-10-04 版交付说明口径变更）
> **对照**：
> - `API接口文档_v8.9.md` §99（单元楼长与业主卖货钱包）
> - `前端交付说明_单元楼长与业主卖货钱包(1).html`（2026-10-04）
> **重要口径变更（2026-10-04）**：楼长为「住户+楼长」**复合身份**——住户 `role` 始终为 `resident`，楼长身份由 `building_leaders` 表判定，前端凭 `GET /auth/profile` 的 `isBuildingLeader` / `buildingLeaderId` 识别（**勿再用 `role === 'building_leader'` 判断**）。SQL 脚本会把历史误改的 `role='building_leader'` 回滚为 `resident`。
> **状态总览**：管理端 + 楼长工作台 + 业主卖货钱包已全部对齐；测服需部署后端 v8.9 + 手动执行 `V18__building_leader_and_seller_wallet.sql`（脚本幂等可重复执行）
> **图例**：✅ 已接 · ⬜ 待测服

## 1. 完成度总表

| # | 后端项 | 状态 | 前端落点 |
|---|--------|------|----------|
| 1 | `GET /admin/building-leaders` 楼长列表 | ✅ | `adminBuildingLeaderApi.list`；`BuildingLeaders.vue`（keyword/status/building 筛选 + 分页） |
| 2 | `POST /admin/building-leaders` 指定楼长 | ✅ | 指定楼长弹窗：住户搜索选择 + 小区/楼栋（不填取住户所属）+ 比例校验 (0,1] |
| 3 | `GET /admin/building-leaders/{id}` 详情 | ✅ | `adminBuildingLeaderApi.detail`（列表数据已覆盖，暂无独立详情入口） |
| 4 | `PUT /admin/building-leaders/{id}` 更新 | ✅ | 编辑弹窗（比例/备注/状态，全可选） |
| 5 | `DELETE /admin/building-leaders/{id}?reason=` 撤销 | ✅ | 撤销按钮 → prompt 填原因；仅对 active 记录展示 |
| 6 | `withdrawal_type` 扩展 `building_leader` / `resident_seller` | ✅ | `WITHDRAWAL_TYPE` 枚举 + 标签 + `ROLE_WITHDRAWAL_TYPE_OPTIONS` 筛选项（`RoleWithdrawalApproval.vue` 自动生效） |
| 7 | 分成记录响应 `buildingLeaderShare/Id/Name` | ✅ | `DistributionRecordItem` 类型 + `DistributionRecordsTable` 新增「楼长」列（含移动端卡片行） |
| 8 | 统计响应 `summary.buildingLeaderAmount` | ✅ | `DistributionStats` 新增「楼长分成」卡片 |
| 9 | 试算 `buildingLeaderShare/buildingLeaderId` | ✅ | `DistributionCalculateResult` 类型已补（暂无独立试算页展示，字段就绪） |
| 10 | 错误码 `91004/10001/10002/97001` | ✅ | `request.ts` KNOWN_ERROR_MESSAGES 兜底（后端 message 优先） |
| 11 | 楼长工作台 `/building-leaders/my` 4 接口 | ✅ | `buildingLeaderPortalApi`；`views/building-leader/` 三页（概览/分成明细/提现） |
| 12 | 业主卖货钱包 3 接口 | ✅ | `residentSellerWalletApi`；`views/resident/ResidentSellerWallet.vue` |
| 13 | `/auth/profile` 新增 `isBuildingLeader`/`buildingLeaderId` | ✅ | `UserProfile` 类型 + auth store 归一化（snake_case 兼容） |
| 14 | 登录响应 `resident.isBuildingLeader` | ✅ | `LoginResult.resident: UserProfile` 覆盖；登录后拉 profile 落地 localStorage |

## 2. 本轮代码变更

| 文件 | 要点 |
|------|------|
| `src/api/types.ts` | `DistributionRecordItem`/`DistributionStats.summary`/`DistributionCalculateResult` 补楼长字段；新增 `BuildingLeader*`、`SellerWalletOverview` 类型 |
| `src/constants/enums.ts` | `USER_ROLE.BUILDING_LEADER`；`WITHDRAWAL_TYPE` 扩 `building_leader`/`resident_seller`；`BUILDING_LEADER_STATUS*` 枚举 |
| `src/api/request.ts` | 错误码兜底 `91004/10001/10002/97001`；`/admin/building-leaders/{id}` 按 id 操作不附 `propertyCompanyId`（沿用个体/板块负责人历史经验） |
| `src/api/services.ts` | 新增 `adminBuildingLeaderApi`（list/create/detail/update/revoke） |
| `src/views/admin/BuildingLeaders.vue` | 新页面：列表 + 筛选 + 分页 + 指定/编辑弹窗 + 撤销 |
| `src/constants/menus.ts` | 管理端菜单「单元楼长」（板块负责人之后，操作员/领导均可见，权限回退由后端校验） |
| `src/router/index.ts` | 路由 `building-leaders`（ADMIN_ROLE_LIST） |
| `src/constants/mobilePortal.ts` | 管理端移动工作台「组织与配置」组加入口 |
| `src/components/DistributionRecordsTable.vue` | 「楼长」分项列 + 移动端卡片行（`showBuildingLeader` 可控） |
| `src/views/admin/DistributionStats.vue` | 「楼长分成」汇总卡（后端未返回时显示「—」） |
| `src/api/types.ts`（第二批） | `UserProfile` 增 `isBuildingLeader`/`buildingLeaderId`；`BuildingLeaderMy` 类型 |
| `src/api/services.ts`（第二批） | 新增 `buildingLeaderPortalApi`（my/分成明细/申请提现/提现记录）、`residentSellerWalletApi`（概览/申请/记录） |
| `src/stores/auth.ts` | profile 归一化兼容 `is_building_leader`/`building_leader_id`（snake_case）并落地 |
| `src/constants/menus.ts` | `residentMenus` 加「卖货钱包」；新增 `buildingLeaderMenus`（3 项） |
| `src/constants/roles.ts` | `getMenusForRole/Profile` 支持 `isBuildingLeader` 动态插入楼长菜单；过渡期 `building_leader` 旧 JWT 兼容（菜单+首页路由） |
| `src/router/index.ts`（第二批） | 路由 `building-leader-overview/records/withdrawals`、`resident-seller-wallet`（resident 角色 + 过渡兼容） |
| `src/views/building-leader/` | 新建 3 页：概览（小区/楼栋/比例/四金额卡 + 91004 提示）、分成明细（复用 `DistributionRecordsTable`）、提现（申请弹窗 + 记录） |
| `src/views/resident/ResidentSellerWallet.vue` | 新页面：钱包概览 4 卡 + 申请提现弹窗 + 提现记录 |

## 3. 测试清单（测服）

### 3.1 楼长管理

| # | 步骤 | 期望 | 结果 |
|---|------|------|------|
| A | 物业管理端打开「单元楼长」 | 列表分页加载（含累计分成/状态/任命时间） | ⬜ |
| B | 指定楼长：选择住户、不填小区/楼栋 | 200；取住户所属小区楼栋；住户 `role` 保持 `resident`，凭 `isBuildingLeader` 识别 | ⬜ |
| C | 指定同一楼栋第二个 active 楼长 | `400 10002`（楼栋已有 active 楼长） | ⬜ |
| D | 同一住户重复任命 | `400 10002`（住户已是 active 楼长） | ⬜ |
| E | 比例填 0 / 1.5 | 前端拦截「须大于 0 且不超过 1」 | ⬜ |
| F | 编辑比例/备注/状态 | 200；仅影响后续订单 | ⬜ |
| G | 撤销并填原因 | 200；状态 inactive；住户 `role` 始终为 resident；reason 落 description | ⬜ |
| H | 状态/楼栋/关键字筛选 | 过滤生效 | ⬜ |
| I | 操作员（property_operator）进入 | 菜单可见；后端按回退规则校验（预期允许本物业操作） | ⬜ |

### 3.2 楼长工作台（本人登录，role=resident）

| # | 步骤 | 期望 | 结果 |
|---|------|------|------|
| A | 指定楼长后该住户重新登录 | `role=resident` 不变；profile 带 `isBuildingLeader=true`；侧边栏出现「楼长概览/分成明细/楼长提现」 | ⬜ |
| B | 楼长概览页 | 显示小区·楼栋、比例、累计/已提现/在途/可提现四卡 | ⬜ |
| C | 撤销楼长后本人重新登录 | `isBuildingLeader=false`；楼长菜单消失；直访工作台路由按 `91004` 提示 | ⬜ |
| D | 楼长分成明细 | 复用分成表格，仅本楼栋订单；含「楼长」分项 | ⬜ |
| E | 申请提现（超额/正常） | 超额前端拦截 + 后端 `94003`；正常提交进入管理端审核（类型=单元楼长） | ⬜ |
| F | 提现记录 | 状态/手续费/实际到账正常展示 | ⬜ |

### 3.3 业主卖货钱包

| # | 步骤 | 期望 | 结果 |
|---|------|------|------|
| A | 有卖货收益的住户登录 | 住户菜单出现「卖货钱包」；概览四卡金额与后端一致 | ⬜ |
| B | 申请提现 | 进入多角色审核（类型=业主卖货）；记录即时刷新 | ⬜ |
| C | 无收益住户 | 概览全 0，申请提现提示余额不足 | ⬜ |

### 3.4 分成与提现审核

| # | 步骤 | 期望 | 结果 |
|---|------|------|------|
| A | 楼长楼栋住户下一单并完成 | 分成明细出现「楼长」分项（金额=物业分成×比例快照），物业列相应减少 | ⬜ |
| B | 撤销楼长后再下单 | 不再产生楼长分成；旧订单不受影响 | ⬜ |
| C | 分成统计 | 「楼长分成」卡片有值，与明细求和一致 | ⬜ |
| D | 楼长/业主卖货提现进入审核列表 | 筛选「单元楼长」「业主卖货」可查；审核/打款流程同现有多角色链路 | ⬜ |
| E | 提现超额申请 | `400 94003` 可提现余额不足 | ⬜ |

## 4. 测服前置（**均由后端/运维负责，前端仓库不含任何 SQL 与后端改动**）

1. 后端 v8.9
2. 手动执行 `V18__building_leader_and_seller_wallet.sql`（生产禁用 Flyway）
3. 重启服务

## 5. 已知边界

| 项 | 说明 |
|----|------|
| 楼长身份判定 | 统一走 `isBuildingLeader`（登录后 profile 自动落地）；过渡期旧 JWT（`role=building_leader`）做了菜单/首页/路由兜底，SQL 回滚后自然失效 |
| 存量楼长用户 | 执行 V18 脚本后 `role` 回滚为 `resident`，**需重新登录**获取带 `isBuildingLeader` 的 profile，住户功能（社区论坛等）随之恢复 |
| 移动端壳层 | resident 不在小程序式壳层角色内，楼长/钱包页面按响应式桌面布局渲染（与「我的店铺」一致） |
| 下单入参 | 文档明确无需改动；楼长绑定由后端按住户「小区+楼栋」快照 |
| `totalEarning` | 列表累计分成直接读后端；前端不自行累加明细 |
| `10001/10002` | 通用参数错误兜底文案；后端 message 优先展示 |

## 6. 相关文档

- 上一轮：[`功能完成度与测试清单_对照API_v8.4_2026-09-09履约与板块特惠.md`](./功能完成度与测试清单_对照API_v8.4_2026-09-09履约与板块特惠.md)
- 对接问题索引：[`后端对接问题/README.md`](./后端对接问题/README.md)

## 7. 验证记录

- `vue-tsc` 全量类型检查：**0 错误**（2026-10-03 第一批 / 2026-10-04 第二批）
