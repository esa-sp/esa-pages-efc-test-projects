# Render Express Hello World 的 ESA 回归

上游为 [render-examples/express-hello-world](https://github.com/render-examples/express-hello-world/tree/039c34770852fb07cef7f9f0f8534c5de408b207)，分支 main，提交 039c34770852fb07cef7f9f0f8534c5de408b207，上游根目录为 .，许可证 MIT。

应用源码和 Yarn 锁文件来自上游固定提交。本地使用 Corepack 选择 Yarn 1.22.22，ESA 构建从项目锁文件安装。

## 构建与运行

ESA 根目录为 public-projects/render-express。选择 Node 24.x，开启 EFC。安装及构建命令由 esa.jsonc 指定，应用进程由平台启动。

在测试仓库根目录执行本地运行器。local.json 包含安装、构建和启动顺序。

    node scripts/run-public-local.mjs render-express

已有本地或预览域名时，复用共享的 HTTP 探针。

    node scripts/probe-public.mjs public-projects/render-express http://127.0.0.1:3000

## 成功用例

Express 5 CommonJS 直接启动、Yarn v1 锁文件、HTML 响应、默认 404。首页的外部 CDN 不参与探针。

| 路由 | 期望 HTTP 状态 |
| --- | --- |
| / | 200 |
| /esa-probe-missing | 404 |
