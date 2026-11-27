# Vercel Astro Boilerplate

源码来自 [vercel/examples 的 framework-boilerplates/astro](https://github.com/vercel/examples/tree/a4b4827297bec79b81ddb2ff22a53089ebe88cd8/framework-boilerplates/astro)，分支 `main`，提交 `a4b4827297bec79b81ddb2ff22a53089ebe88cd8`。保留了许可证和上游页面。Vercel 的生产适配器改为 Astro Node standalone，固定 Astro 5.18.2 和 PCG 兼容矩阵对应的 `@astrojs/node` 9.5.5，使用 Sharp 提供图片优化，并生成 npm 锁文件。Vercel Web Analytics 随原适配器移除。

- ESA Root Directory 为 `public-projects/vercel-astro`，控制台选 Node 22。预期 PCG 正常完成 Astro 适配，最终包中同时有 `fc/code.zip` 和 `assets/`。本地的标准 Astro Node 启动与云端 PCG 适配分别验收。
- 本地运行 `node scripts/run-public-local.mjs vercel-astro`。手工启动可在本目录运行 `npm ci`、`npm run build`、`HOST=127.0.0.1 PORT=3000 node dist/server/entry.mjs`。
- 从仓库根运行 `node scripts/probe-public.mjs public-projects/vercel-astro <url>`。验预渲染首页和图标、`/ssr` 的服务器 HTML、`/ssr-with-swr-caching` 的缓存响应头，以及 `/image` 上 Astro Logo 的实际图片响应。缓存响应头不用于判断 CDN 命中。
- 本地验收用 Node 24.13.0 从干净副本安装、构建和启动，6 条 HTTP 断言全部通过。另用 Node 22.19.0 通过本地 PCG CLI 构建，产物包含 `assets/` 和 `fc/start.mjs`。
