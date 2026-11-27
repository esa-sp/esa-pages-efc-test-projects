# Uptime Kuma 的 ESA 回归

上游为 [louislam/uptime-kuma](https://github.com/louislam/uptime-kuma/tree/5aa5dec425f8a955b54e150636979a6927745ec5)，版本 2.5.12，提交 5aa5dec425f8a955b54e150636979a6927745ec5，上游根目录为 .，许可证 MIT。

保留源码、构建脚本与 npm 锁文件。在 package.json 中声明实际服务入口 server/server.js，便于 TestStep 识别子目录入口。省略上游的托管 CI 和开发代理指令文件。

## 构建与运行

本地运行器显式选择 SQLite，并将数据库放在临时工作副本中。只启动空数据库版本，不创建账户或监控任务。

    node scripts/run-public-local.mjs uptime-kuma

ESA 根目录为 public-projects/uptime-kuma。安装及构建命令由 esa.jsonc 指定。验收部署时选择 Node 24.x，启用 EFC，给运行环境设置 UPTIME_KUMA_DB_TYPE=sqlite 和可写测试目录 DATA_DIR。要验证持久化及 Socket.IO，需要另用可重启的测试实例。

    node scripts/probe-public.mjs public-projects/uptime-kuma http://127.0.0.1:3000

## 成功用例

- GET / 返回 302，位置为 /dashboard。
- GET /dashboard 返回 200，含 Uptime Kuma 页面，实际构建生成的同源 JS 与 CSS 可读取。
- GET /setup-database-info 返回 200，表明 SQLite 初始化已完成。
- GET /robots.txt 返回 200 和文本响应。
