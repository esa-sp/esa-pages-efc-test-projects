# Next.js 官方静态导出

源码来自 [vercel/next.js 的 examples/with-docker-export-output](https://github.com/vercel/next.js/tree/0173455ce60633b2c91e164cf9cbf934a2ab5a77/examples/with-docker-export-output)，分支 `canary`，提交 `0173455ce60633b2c91e164cf9cbf934a2ab5a77`。保留上游许可证、静态导出配置和 pnpm 锁文件，安装锁定 Next 16.1.4。独立导入时固定 pnpm 10.34.5。

- ESA Root Directory 为 `public-projects/vercel-next-static`，建议 Node 24。构建把应用导出到 `out`。检查最终包中的 `assets/index.html` 和 `assets/_next/static/`，并确认没有 `fc/code.zip`。
- 本地运行 `node scripts/run-public-local.mjs vercel-next-static`，需要 Node 24 与 Corepack。它运行冻结安装和 `pnpm build`，然后通过 HTTP 提供 `out/`，对应上游示例的静态部署路径。
- 从仓库根运行 `node scripts/probe-public.mjs public-projects/vercel-next-static <url>`，期望首页包含 Static Export Mode，Next 标识 SVG 正常加载，不存在的路径返回 404，首页生成的同源 JS/CSS 资源可访问。
- 本地验收用 Node 24.13.0 从干净副本安装和构建，13 条 HTTP 断言全部通过。另通过 TestStep 本地构建验证最终 ZIP 包含首页、404 页面和 `/_next/static/` 资源，没有 `fc/` 文件。Next 编译使用上游 `next/font/google`，构建环境需要可访问 Google Fonts。
