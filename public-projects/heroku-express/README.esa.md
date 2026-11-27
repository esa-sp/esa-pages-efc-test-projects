# Heroku Express 与 EJS 的 ESA 回归

上游为 [heroku/nodejs-getting-started](https://github.com/heroku/nodejs-getting-started/tree/d33649d5edae61fc766fe6d47e530c475c05a7a0)，分支 main，提交 d33649d5edae61fc766fe6d47e530c475c05a7a0，上游根目录为 .，许可证 MIT。

保留上游应用和 npm 锁文件。上游 Heroku CLI 的示例 .env 改名为 .env.example，HTTP 验收不依赖该文件。

## 构建与运行

ESA 根目录为 public-projects/heroku-express。选择 Node 24.x，开启 EFC。安装及构建命令由 esa.jsonc 指定，应用进程由平台启动。

在测试仓库根目录执行本地运行器。local.json 包含安装、构建和启动顺序。

    node scripts/run-public-local.mjs heroku-express

已有本地或预览域名时，复用共享的 HTTP 探针。

    node scripts/probe-public.mjs public-projects/heroku-express http://127.0.0.1:3000

## 成功用例

EJS 模板、同源 CSS/PNG、Express 5 监听与关闭逻辑。源码声明 npm 12.x，使用 Node 24.13.0 自带 npm 11.6.2 验证时会输出引擎提示。

| 路由 | 期望 HTTP 状态 |
| --- | --- |
| / | 200 |
| /stylesheets/main.css | 200 |
| /lang-logo.png | 200 |
| /esa-probe-missing | 404 |
