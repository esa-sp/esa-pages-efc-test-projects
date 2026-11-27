# Vercel CLI Express

ESA 控制台根目录为 `public-projects/vercel-cli-express`，框架为 Express，Node 推荐 `24.x`。TestStep 应识别 `src/index.ts` 的默认导出并打包成 FC。 [上游源码](https://github.com/vercel/vercel/tree/155eacfa16840e68ae54bc50ee72fc8e16733857/examples/express)

保留上游项目和仓库许可证。原样例无锁文件，本夹具记录独立 npm 锁。上游入口只导出 Express app，本地验证通过 `serve-local.mjs` 监听端口，ESA 打包使用原入口。

在夹具目录运行 `npm ci --no-audit --no-fund` 和 `node serve-local.mjs`。从测试仓库根目录运行：

```bash
node scripts/check.mjs public-projects/vercel-cli-express http://127.0.0.1:3000
```

`✓4 ✗0` 表示首页、两个参数路由以及不存在路由的 404 均符合预期。部署后用预览域名运行同一探针。

从测试仓库根目录也可运行 `node scripts/run-public-local.mjs vercel-cli-express`，在临时目录自动安装、启动和验证。
