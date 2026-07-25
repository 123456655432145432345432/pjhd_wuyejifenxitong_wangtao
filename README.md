# 万达物业 · 管理后台

基于 Vue 3 + TypeScript + Vite + Pinia 的物业权限管理后台前端项目。

## 技术栈

- Vue 3（组合式 API + `<script setup>`）
- TypeScript
- Vite
- Pinia
- Vue Router

## 项目结构

```
src/
├── api/          # Mock 数据与接口类型
├── assets/       # 静态资源与全局样式
├── components/   # 可复用组件
├── layouts/      # 页面布局组件
├── router/       # 路由配置
├── stores/       # Pinia 状态管理
├── views/        # 页面视图
├── App.vue       # 根组件
└── main.ts       # 应用入口
```

## 本地运行

```bash
npm install
npm run dev
```

默认服务地址：http://localhost:3000

## 构建

```bash
npm run build
```

## 说明

- 当前所有数据均为写死的 Mock 数据，待后端接口就绪后可在 `src/api/mock.ts` 中替换为真实接口调用。
- 文件与变量命名采用 PascalCase / camelCase，避免使用 `-` 与 `_`，保持简洁清晰。
