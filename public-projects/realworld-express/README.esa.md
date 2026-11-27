# RealWorld Express + Prisma

ESA 控制台根目录为 `public-projects/realworld-express`，框架为 Express，Node 推荐 `24.x`。保留固定的上游源码和 npm 锁。上游 `package.json` 声明 MIT，增加的 `build:esa` 在 Nx 构建前生成 Prisma client，`main` 指向构建出的 App 入口。 [上游源码](https://github.com/gothinkster/node-express-realworld-example-app/tree/30b68e1e881462b2f4164ea09ab4c4f5699c7b0b)

将 `ESA_TEST_POSTGRES_URL` 设置为本地空的 PostgreSQL 测试库连接串，再从测试仓库根目录运行：

```bash
node scripts/run-public-local.mjs realworld-express
```

脚本执行 npm 锁定安装、Prisma 生成、Nx 编译和上游迁移，再用 `node dist/api/main.js` 启动。迁移仅接受回环地址上的数据库。探针验证首页、经 Prisma 查询的空 tags 列表和 Nx 复制的 PNG。预期 `✓3 ✗0`。

在 ESA 仿真环境测试时，先迁移空的测试库，并按环境配置提供 `DATABASE_URL` 与测试 `JWT_SECRET`。用预览域名运行：

```bash
node scripts/probe-public.mjs public-projects/realworld-express https://<部署域名>
```
