# Vercel CLI Vite React

ESA 控制台根目录为 `public-projects/vercel-vite-react`，框架为 Vite，Node 推荐 `24.x`。使用上游的 `tsc -b && vite build`，预期只发布 `dist` 静态产物。 [上游源码](https://github.com/vercel/vercel/tree/155eacfa16840e68ae54bc50ee72fc8e16733857/examples/vite-react)

保留上游源码与许可证。原样例无项目锁，本夹具记录独立 npm 锁。

在夹具目录运行 `npm ci --no-audit --no-fund`、`npm run build` 和 `npm run preview -- --host 127.0.0.1 --port 3000`。从测试仓库根目录运行：

```bash
node scripts/check.mjs public-projects/vercel-vite-react http://127.0.0.1:3000
```

固定探针 `✓2 ✗0` 表示首页 HTML 和 Vite SVG 正常。基于首页提取并请求该次构建的 JS 和 CSS，可避免将 SPA 首页回退误判为静态资源成功。

从测试仓库根目录运行 `node scripts/run-public-local.mjs vercel-vite-react` 可完成一轮安装、构建和 HTTP 验证。部署后用 `node scripts/probe-public.mjs public-projects/vercel-vite-react <预览URL>` 检查固定路由和实际 JS/CSS 引用。
