# Edwin Hern Express TypeScript 的 ESA 回归

上游为 [edwinhern/express-typescript](https://github.com/edwinhern/express-typescript/tree/983fa0413659cd921c5754b00f7817903eb91364)，分支 master，提交 983fa0413659cd921c5754b00f7817903eb91364，上游根目录为 .，许可证 MIT。

上游 manifest 入口指向不存在的 index.ts。TestStep 会优先选到只组装路由的 src/server.ts，打包后不会监听。该用例改为在 package.json 声明 tsup 产物 dist/index.js，本地与 ESA 使用相同的实际启动入口。

## 构建与运行

ESA 根目录为 public-projects/edwinhern-express-ts。选择 Node 24.x，开启 EFC。安装及构建命令由 esa.jsonc 指定，应用进程由平台启动。

在测试仓库根目录执行本地运行器。local.json 包含安装、构建和启动顺序。

    node scripts/run-public-local.mjs edwinhern-express-ts

已有本地或预览域名时，复用共享的 HTTP 探针。

    node scripts/probe-public.mjs public-projects/edwinhern-express-ts http://127.0.0.1:3000

## 成功用例

保留 tsc 与 tsup 脚本，验证路径别名、已编译入口、业务健康响应、用户路由和 OpenAPI JSON。无外部数据依赖。上游 .tool-versions 记录 Node 23，ESA 测试采用 Node 24。

| 路由 | 期望 HTTP 状态 |
| --- | --- |
| /health-check | 200 |
| /users/1 | 200 |
| /swagger.json | 200 |
