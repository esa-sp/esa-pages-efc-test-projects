# Vercel 模板市场 Express

ESA 控制台根目录为 `public-projects/vercel-gallery-express`，框架为 Express，Node 推荐 `24.x`。原项目使用 Express 4 ESM 默认导出，通过 `sendFile` 读取 `components/about.htm`。`public` 在 ESA 中作为静态资源目录。 [上游源码](https://github.com/vercel/examples/tree/a4b4827297bec79b81ddb2ff22a53089ebe88cd8/solutions/express)

保留上游源码、pnpm 锁和仓库许可证。原样例由平台接收默认导出的 app 并提供静态资源，本地入口 `serve-local.mjs` 为同一 app 提供监听与静态资源。

在夹具目录运行 `pnpm install --frozen-lockfile` 和 `node serve-local.mjs`。从测试仓库根目录运行：

```bash
node scripts/check.mjs public-projects/vercel-gallery-express http://127.0.0.1:3000
```

`✓6 ✗0` 表示首页、两个 API、`sendFile` 页面和两项公开资源均通过。部署后用预览域名运行同一探针。

从测试仓库根目录也可运行 `node scripts/run-public-local.mjs vercel-gallery-express`，在临时目录自动安装、启动和验证。
