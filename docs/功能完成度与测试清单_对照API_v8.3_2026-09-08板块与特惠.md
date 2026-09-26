# 功能完成度与测试清单 — 对照 API v8.3（板块与特惠）

> **更新日期**：2026-09-09  
> **对照**：
> - `API接口文档_v8.2(1).md`（文首实为 **API v8.3**，2026-09-08 第二轮）
> - `2026-09-08_板块与特惠_后端修复说明.html`
> **范围**：本仓库管理端 Web（统筹 / 板块负责人 / 超管板块管理）；住户端页面不在本仓  
> **状态总览**：管理端代码 **已对接完成**；测服需部署后端 v8.3 + 执行 SQL 后按下方清单验收  
> **图例**：✅ 前端已接 · ⬜ 待测服验收 · ⚪ 非本仓主责

**测服前置（缺一会失败）**

1. 后端已部署 **API v8.3**  
2. 已执行 `sql/2026-09-08_板块枚举与特惠可见性_数据库脚本.sql`（补 `sector_leaders.description`、`special_offers.used_quota` 等）  
3. 统筹账号持有 `sector.manage` / `promotion.push`，且操作本人名下板块负责人  

**相关文档**

| 文档 | 用途 |
|------|------|
| [`住户端如何看到统筹特惠_对照API_v8.3.md`](./住户端如何看到统筹特惠_对照API_v8.3.md) | C 端可见规则与联调最短路径 |
| [`后端对接问题/2026-09-08_板块负责人改板块400.md`](./后端对接问题/2026-09-08_板块负责人改板块400.md) | 问题单（已修，待验收） |
| [`后端对接问题/2026-09-08_统筹特惠移动端不可见.md`](./后端对接问题/2026-09-08_统筹特惠移动端不可见.md) | 问题单（已修，待验收） |
| [`对照API_v8.2_2026-09-08修复.md`](./功能完成度与测试清单_对照API_v8.2_2026-09-08修复.md) | 上一轮（分账 / 403 / 一级代理等） |

---

## 1. 完成度总表

| # | 后端变更（v8.3） | 管理端状态 | 前端落点 | 备注 |
|---|------------------|------------|----------|------|
| 1 | 板块五枚举统一；支持中文入参 | ✅ | `normalizeSectorType`；下拉仍交英文码 | 中文入参后端兼容，前端不依赖 |
| 2 | 同物业同板块冲突 `400/10002` | ✅ | 编辑失败直接展示 `message` | 无需前端拼冲突文案 |
| 3 | 补 `description`；列表 `keyword` + `sector` | ✅ | 类型 `statusCode`/`statusLabel`；统筹/超管列表加板块筛选 | `CoordinatorSectorLeaders` / `SectorLeaders` |
| 4 | 住户可读 `GET /special-offers` 等 + §25.6 | ⚪ / ⬜ | 契约说明已写清 | **住户 UI 不在本仓**；验收用 Token 调接口 |
| 5 | `POST .../publish`、`.../unpublish` | ✅ | `specialOfferApi` + 列表「立即发布 / 下架」 | 统筹 + 板块特惠页 |
| 6 | `active`/「待发布」→ `published` | ✅ `[ENUM]` | 去掉待发布选项；别名归一 | 无独立待发布态 |
| 7 | 建议默认已发布 | ✅ | 新建默认 `published`；草稿提示不可见 | 统筹 / 板块特惠 |
| 8 | 响应补 `statusLabel` / 配额等 | ✅ | 列表优先 `statusLabel`；配额字段类型已有 | |

---

## 2. 本轮代码变更清单（便于回归）

| 文件 | 变更要点 |
|------|----------|
| `src/constants/enums.ts` | `SPECIAL_OFFER_STATUS` 去掉 `PENDING_PUBLISH`；`FORM_OPTIONS` 仅草稿/已发布；`active`→`published` |
| `src/api/types.ts` | `SpecialOfferItem.statusLabel`；`SectorLeaderDetail.statusCode`/`statusLabel` |
| `src/api/services.ts` | `specialOfferApi.publish` / `unpublish` / `listMine`；`sectorLeaderAdminApi.list` 支持 `sector` |
| `src/views/coordinator/CoordinatorOffers.vue` | 默认已发布；立即发布/下架；`statusLabel` |
| `src/views/sector-leader/SectorLeaderOffers.vue` | 同上；详情也可发布/下架 |
| `src/views/coordinator/CoordinatorSectorLeaders.vue` | 板块筛选；`statusLabel` |
| `src/views/SectorLeaders.vue` | 板块筛选；`statusLabel` |

---

## 3. 测试清单（测服）

### 3.1 板块负责人

| # | 步骤 | 期望 | 结果 |
|---|------|------|------|
| A | `sl_001` 当前 cleaning，改 `sector=cleaning` 保存 | 200（幂等） | ⬜ |
| B | 物业下无 repair 负责人时，改 `repair` | 200，回显 `sector=repair`、`sectorName=维修` | ⬜ |
| C | 已有他人占用 repair 时再改过去 | 400 + 冲突文案含对方 ID/姓名 | ⬜ |
| D | 改 `security` / `greening` / `other`（无冲突） | 200 | ⬜ |
| E | 故意传非法值（若抓包）`sector=foo` | 400「sector不合法…」 | ⬜ |
| F | 带 `description` 保存后重新打开详情 | 回显正确 | ⬜ |
| G | 列表搜 `keyword` + 筛板块 `repair` | 仅命中记录 | ⬜ |
| H | 统筹改**非本人名下**负责人 | 403 / 20004（v8.2 权限仍有效） | ⬜ |

**入口**：统筹 → 板块管理；超管 → 板块负责人管理。

### 3.2 特惠推送（管理端）

| # | 步骤 | 期望 | 结果 |
|---|------|------|------|
| A | 统筹新建：默认状态为「已发布」，`targetType=all`，时间覆盖当前 | 创建 200；列表状态为已发布 | ⬜ |
| B | 新建选「草稿」 | 管理端列表可见；草稿旁/提示文案存在 | ⬜ |
| C | 草稿行点「立即发布」 | `POST .../publish` 成功；状态→已发布 | ⬜ |
| D | 已发布行点「下架」 | `POST .../unpublish`；状态→草稿 | ⬜ |
| E | 板块负责人特惠页同样走发布/下架 | 行为与统筹一致 | ⬜ |
| F | 表单不再出现「待发布」选项 | 仅草稿 / 已发布（筛选可含已结束） | ⬜ |

**入口**：统筹 → 特惠推送；板块负责人 → 板块特惠。

### 3.3 特惠 C 端可见（接口验收，非本仓 UI）

详见 [`住户端如何看到统筹特惠_对照API_v8.3.md`](./住户端如何看到统筹特惠_对照API_v8.3.md)。

| # | 步骤 | 期望 | 结果 |
|---|------|------|------|
| A | 用例 3.2-A 后，同物业住户 Token：`GET /special-offers` | `code=0`，list 含该 id；`publisherRole` 可为 `coordinator` | ⬜ |
| B | 草稿 / 已下架 | 住户列表**无**该 id | ⬜ |
| C | `published` 但 `endTime` 已过 | 住户列表不可见 | ⬜ |
| D | `targetType=role` 且住户未在该商户完成订单 | 该住户不可见 | ⬜ |
| E | 可选：`GET /special-offers/my` | 与住户调列表等价 | ⬜ |

---

## 4. 对接问题文档状态

| 文档 | 状态 |
|------|------|
| `2026-09-08_板块负责人改板块400.md` | 后端已修（v8.3），待测服验收 |
| `2026-09-08_统筹特惠移动端不可见.md` | 后端已修（v8.3），待测服验收；可见规则见住户端说明 |

---

## 5. 已知边界（勿当缺陷）

| 项 | 说明 |
|----|------|
| 住户端页面 | 本仓无小程序/App；只保证管理端写入契约正确 + 文档给 C 端联调 |
| 「待发布」 | 产品/文档历史别名，入库一律 `published`；UI 已去掉该选项 |
| 过期展示 | 住户列表直接不返回，不会带「已结束」标签 |
| SQL 未跑 | 可能启动/查询报错（缺 `description` / `used_quota` 列） |
