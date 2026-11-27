# Vite React SSR + Express 的 ESA 回归

上游为 [bluwy/create-vite-extra](https://github.com/bluwy/create-vite-extra/tree/3d321fd097a28f98ebe071d86024e1111bf3ae69/template-ssr-react)，分支 master，提交 3d321fd097a28f98ebe071d86024e1111bf3ae69，上游根目录为 template-ssr-react，许可证 CC0-1.0。

复制官方 template-ssr-react 子目录及根许可证。上游目录没有锁文件，本套用例添加 npm 锁文件，固定首次解析的依赖。生产 HTML 与静态目录改为相对模块 URL，便于 EFC 文件追踪。本地与上线的预期运行模式均为 NODE_ENV=production。ESA 显式选 express 预设，以 Express 执行 SSR。

## 构建与运行

ESA 根目录为 public-projects/vite-react-express-ssr。选择 Node 24.x，开启 EFC。安装及构建命令由 esa.jsonc 指定，应用进程由平台启动。

在测试仓库根目录执行本地运行器。local.json 包含安装、构建和启动顺序。

    node scripts/run-public-local.mjs vite-react-express-ssr

已有本地或预览域名时，复用共享的 HTTP 探针。

    node scripts/probe-public.mjs public-projects/vite-react-express-ssr http://127.0.0.1:3000

## 成功用例

验收真实 SSR HTML 和 fallback 路由，检查 Express 从 dist/client 交付静态资源，并从 dist/server 执行渲染，不以客户端挂载后出现的 DOM 作为 SSR 证据。

| 路由 | 期望 HTTP 状态 |
| --- | --- |
| / | 200 |
| /esa-ssr-probe | 200 |
| /favicon.svg | 200 |

本地运行器还验收首页引用的同源哈希 JS 和 CSS。
