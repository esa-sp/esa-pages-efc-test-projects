# Vercel CLI Next.js Boilerplate

ESA 控制台根目录为 `public-projects/vercel-nextjs`，框架为 Next.js，Node 推荐 `24.x`。用锁定的 Next.js 16.2.4 和原项目的 App Router，验证原生 `next build` 及 ESA 的 PCG 构建路径。 [上游源码](https://github.com/vercel/vercel/tree/155eacfa16840e68ae54bc50ee72fc8e16733857/examples/nextjs)

保留上游源码、npm 锁和许可证。上游布局通过 `next/font/google` 在构建阶段获取 Geist。

在夹具目录运行 `npm ci --no-audit --no-fund`、`npm run build` 和 `npm run start -- --hostname 127.0.0.1`。从测试仓库根目录运行：

```bash
node scripts/check.mjs public-projects/vercel-nextjs http://127.0.0.1:3000
```

固定探针 `✓3 ✗0` 表示首页、公开 SVG 和框架 404 均正常。验证时还要请求首页引用的 `/_next/static/` JS 和 CSS。该上游模板没有业务 API。

从测试仓库根目录运行 `node scripts/run-public-local.mjs vercel-nextjs` 可自动安装、构建和验证。部署后用 `node scripts/probe-public.mjs public-projects/vercel-nextjs <预览URL>` 检查固定路由和实际 JS/CSS 引用。
