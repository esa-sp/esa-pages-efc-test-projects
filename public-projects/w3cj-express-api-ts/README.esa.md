# w3cj Express API TypeScript 的 ESA 回归

上游为 [w3cj/express-api-starter-ts](https://github.com/w3cj/express-api-starter-ts/tree/c46ad4526400e0ae6640fdaa94d037aa7573600c)，分支 main，提交 c46ad4526400e0ae6640fdaa94d037aa7573600c，上游根目录为 .，许可证 MIT。

本地直接运行 dist/src/index.js。上游 npm start 使用 .env，本套用例从父进程传入 PORT 和 NODE_ENV，无需创建 .env。

## 构建与运行

ESA 根目录为 public-projects/w3cj-express-api-ts。选择 Node 24.x，开启 EFC。安装及构建命令由 esa.jsonc 指定，应用进程由平台启动。

在测试仓库根目录执行本地运行器。local.json 包含安装、构建和启动顺序。

    node scripts/run-public-local.mjs w3cj-express-api-ts

已有本地或预览域名时，复用共享的 HTTP 探针。

    node scripts/probe-public.mjs public-projects/w3cj-express-api-ts http://127.0.0.1:3000

## 成功用例

验证嵌套 TypeScript 输出和路由、JSON 数组、生产错误响应。应用使用内存数据。

| 路由 | 期望 HTTP 状态 |
| --- | --- |
| / | 200 |
| /api/v1 | 200 |
| /api/v1/emojis | 200 |
| /esa-probe-missing | 404 |
