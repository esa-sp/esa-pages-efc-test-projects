# Hagop Express + Mongoose

ESA 控制台根目录为 `public-projects/hagop-express`，框架为 Express，Node 推荐 `24.x`。保留上游源码、Yarn 锁和 MIT 许可证。用 `node src/index.js` 验证 MongoDB 连接、HTTP 监听和 Express 鉴权。 [上游源码](https://github.com/hagopj13/node-express-boilerplate/tree/179ae84efec61b14206d0305d941daed6c6d07f9)

将 `ESA_TEST_MONGODB_URL` 设置为本地 MongoDB 测试库连接串，再从测试仓库根目录运行：

```bash
node scripts/run-public-local.mjs hagop-express
```

本地使用 Yarn 1.22.22 从锁文件安装运行时依赖，并跳过上游 Git hooks 安装脚本。应用在连接 MongoDB 后才监听。探针先验证 `GET /v1/users` 未认证返回指定 401，再验证自定义 404。正常结果为 `✓2 ✗0`。

在 ESA 仿真环境测试时，在环境配置中提供 `MONGODB_URL`、`JWT_SECRET` 和 `NODE_ENV=production`。用预览域名运行：

```bash
node scripts/probe-public.mjs public-projects/hagop-express https://<部署域名>
```
