# 商家列表缺少 `is_distributor` 字段（一级代理状态读不到）

> **状态**：✅ 已修复（后端 v8.11.1 补丁，2026-10-16）— 待联调复测
> **日期**：2026-10-16
> **对照**：API v8.11 §7.1 `GET /merchants`、§60.12
> **前端入口**：业主商户（分销）→ 标签页「一级代理商家」/「货源商品」

## 现象

在「一级代理商家」标签页点「**开通**」，页面**没有任何反馈**：
状态列仍显示「未开通」、按钮仍是「开通」，刷新后依旧。

## 根因

`GET /merchants` 的**响应字段表与响应示例都没有 `is_distributor`**（文档 §7.1，见下方"现状契约"）。
前端只能通过该接口拿商家列表，于是：

```
merchantApi.list() → normalizeMerchantItem()
    → pickBool(raw, ['isDistributor', 'is_distributor']) → undefined
    → item.isDistributor 恒为 falsy
    → 状态列恒定「未开通」，按钮恒定「开通」
```

即：**`POST /admin/distributors/{merchantId}/enable` 很可能已执行成功（后端已写入 `is_distributor=1`），
但前端没有任何办法读回该状态**，所以"点了没反应"。

> 注：若 enable 失败，前端会走 catch 并在页面顶部显示红色错误条。
> 实际表现为"完全无变化"，可反证 enable 请求本身是成功的。

## 影响范围（不止显示问题）

| # | 影响 | 说明 |
|---|------|------|
| 1 | 状态列永远显示「未开通」 | 无法辨别哪些商家已开通，也无法正确显示「取消」按钮 |
| 2 | **「新建货源商品」的一级代理商家下拉恒为空** | 下拉过滤条件同为 `m.isDistributor`，恒为空 ⇒ **货源商品建不起来，模块实际不可用** |
| 3 | 取消一级代理无法操作 | 按钮只在 `isDistributor=1` 时显示为「取消」，永远进不到该分支 |

## 现状契约

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/merchants` | 商家列表；**列表项未返回 `is_distributor`** |
| POST | `/admin/distributors/{merchantId}/enable` | 置 `is_distributor=1` |
| POST | `/admin/distributors/{merchantId}/disable` | 置 `is_distributor=0` |

文档中 `/admin/distributors` **只有上面两个 POST，没有 GET 列表接口**，
因此前端也没有其它合法途径能查出「哪些商家已开通」。

## 期望（二选一）

**方案 A（推荐，改动最小）**
`GET /merchants` 列表项增加 `isDistributor`（`Boolean`，取 `merchants.is_distributor`）：

```json
{
  "id": "mch_xxx",
  "name": "张阿姨的小店",
  "auditStatus": "approved",
  "status": "active",
  "isDistributor": true,        // ← 新增
  "createdAt": "2026-03-15 10:00:00"
}
```

> 前端已同时兼容 `isDistributor` / `is_distributor` 两种写法，snake_case 亦可。

**方案 B（备选）**
新增 `GET /admin/distributors`，返回已开通一级代理的商家集合（至少含 `merchantId`），
前端用它标记状态。

## 复现步骤

1. 进入 业主商户（分销）→「一级代理商家」
2. 任选一个「已通过」的商家，点「开通」
3. 观察：无任何提示，状态列与按钮均无变化
4. 若此时打开「货源商品」→「新建分销商品」，可见「一级代理商家」下拉为空

## 验证方法（接口层）

```bash
# 1) 开通
curl -X POST "$BASE/api/v1/admin/distributors/mch_xxx/enable" -H "Authorization: Bearer $TOKEN"
# 期望：{"code":0,"data":null}

# 2) 回读列表，检查是否出现 isDistributor / is_distributor
curl "$BASE/api/v1/merchants?page=1&pageSize=20&propertyCompanyId=$PCID" -H "Authorization: Bearer $TOKEN"
```

## 前端临时兜底（已上线，待后端补字段后可移除）

在字段补齐前，前端已做降级处理，保证流程不被完全卡死：

- 开通/取消成功后，**立即本地标记状态**并弹出「已开通/已取消一级代理：xxx」绿色提示
- 请求失败时，在页面**顶部显示红色错误条**（不再整块替换列表）
- 列表整页都取不到该字段时，页面显示黄色提示：
  *"后端商家列表暂未返回「一级代理」状态字段，本列仅反映本次页面上的操作结果；刷新页面后可能回到「未开通」"*
- 「新建货源商品」下拉在**过滤结果为空时降级为「全部已审核商家」**，并在下方提示
  *"未开通一级代理的商家提交时会被后端拒绝"* —— 由后端 `60030` 做最终校验

⚠️ 兜底只能解决"点击有反馈"，**刷新后状态仍不准确**，且下拉会混入未开通商家。
**根治仍需后端补字段。**

## 附带发现（建议一并确认）

1. **`60030` 语义重复**：错误码表释义为「该商家未开通一级代理权限」（建货源商品时 `is_distributor=0`），
   而 §60.12 开通/取消接口释义为「仅审核通过的商家可管理一级代理权限」（商家非 `approved`）。
   同一码两种场景，建议为后者单列一个码，避免联调误判。
2. **`GET /merchants` 的 `propertyCompanyId` 实际必填**：文档标为可选，实测不传返回
   `400 {"code":10001,"message":"propertyCompanyId不能为空"}`。请确认是有意为之还是待放开。
3. 测试数据中「外套的店」在列表里出现两行，若为同一 `merchantId` 重复返回，请排查。

---

## 后端回复与结案（2026-10-16，v8.11.1 补丁）

后端已按**方案 A** 修复，并逐条回复了上述三个附带发现：

| 项 | 结论 |
|---|---|
| **`isDistributor` 字段** | ✅ 已修复：`GET /merchants` 列表项 + `GET /merchants/{id}` 详情均新增 `isDistributor`（`Boolean`，永不为 `null`） |
| **60030 语义重复** | ✅ 已拆分：新增 **`60037`**「仅审核通过的商家可管理一级代理权限」（商家非 `approved`）；`60030` 收敛为仅表示「该商家未开通一级代理权限」。影响「开通/取消一级代理」与「上架货源商品」两个接口 |
| **`propertyCompanyId` 必填** | ✅ 有意为之，非缺陷：**未登录**请求必传；**已登录**从 Token 的物业归属取，可省略（`platform_admin` 可传参指定他物业）。文档 §7.1 已订正为「条件必填」 |
| **「外套的店」重复行** | ✅ 非接口缺陷：是**两条不同记录**（`mch_355b51166c1000` / `mch_355d08ea621000`），同一住户两次入驻、均被踢出（`status=kicked`）。`GET /merchants` 基于主键分页、无 JOIN，不存在同 ID 重复。管理端默认返回全部状态（含 `kicked`）属设计行为 |

## 前端对接动作（已完成）

1. `src/api/request.ts`：`KNOWN_ERROR_MESSAGES` 新增 **`60037`** 文案
2. `src/views/admin/ResidentMerchants.vue`：
   - 下拉降级逻辑**加门控** —— 仅当「后端确实未返回字段」时才降级为全部已审核商家；
     字段回读正常后，若无人开通则下拉**正常为空**（不再误列未开通商家）
   - 字段回读正常时**自动清空本地兜底状态**，避免陈旧值覆盖真实数据
   - 「货源商品」下拉数据源也补了同一字段探测（覆盖"先打开货源商品页"的场景）
3. 类型检查（`vue-tsc`）与生产构建（`vite build`）均通过

> **仍保留的兜底**（按交付说明第七节，联调通过后可移除）：
> 本地状态标记、黄色提示条、下拉降级。三者均已加门控，后端正常返回时为**空操作**，
> 可在部分环境未部署时起保护作用。确认联调无误后可一次性摘除。

