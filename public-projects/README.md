# 公网 Express 与 Vercel 回归项目

两个优先批次及后续第三方 Express 项目。每个目录可单独作为 ESA Root Directory。各项目的 `README.esa.md` 记录原仓库、固定提交、为测试做的适配、启动方式和通过条件。各目录保留应用源码、依赖锁以及上游提供的许可证文件或声明。

| 项目 | ESA Root Directory | 主验收点 |
| --- | --- | --- |
| Render Express | [`public-projects/render-express`](./render-express/README.esa.md) | Express 5 与 Yarn，实际监听并返回应用 HTML |
| Heroku Express | [`public-projects/heroku-express`](./heroku-express/README.esa.md) | EJS 视图与静态资源 |
| Edwin Hern Express TS | [`public-projects/edwinhern-express-ts`](./edwinhern-express-ts/README.esa.md) | pnpm、tsc 和 tsup 产物，健康、用户、OpenAPI 路由 |
| Vercel CLI Express | [`public-projects/vercel-cli-express`](./vercel-cli-express/README.esa.md) | TypeScript 默认导出，动态 API 参数正确返回 |
| Vercel Vite React | [`public-projects/vercel-vite-react`](./vercel-vite-react/README.esa.md) | 静态首页、图片和 HTML 引用的哈希文件 |
| Next.js 静态导出 | [`public-projects/vercel-next-static`](./vercel-next-static/README.esa.md) | `out/` 首页、静态路由、实际脚本和样式 |
| w3cj Express API | [`public-projects/w3cj-express-api-ts`](./w3cj-express-api-ts/README.esa.md) | tsc 编译后的入口、JSON API 和 404 |
| Vercel 市场 Express | [`public-projects/vercel-gallery-express`](./vercel-gallery-express/README.esa.md) | Express 4、动态健康状态、`sendFile` 和 Assets |
| Vercel Next.js | [`public-projects/vercel-nextjs`](./vercel-nextjs/README.esa.md) | Next App Router 生产启动、首页及哈希文件 |
| Vercel Nuxt 4 | [`public-projects/vercel-nuxt4`](./vercel-nuxt4/README.esa.md) | Nitro 生产启动、SSR API 和静态资源 |
| Vercel Astro | [`public-projects/vercel-astro`](./vercel-astro/README.esa.md) | Astro 静态首页、SSR、SWR 响应头和图片 |
| Vite React + Express SSR | [`public-projects/vite-react-express-ssr`](./vite-react-express-ssr/README.esa.md) | 同一 Express 服务交付动态 HTML 和客户端产物 |
| Google Cloud Express | [`public-projects/google-cloud-express`](./google-cloud-express/README.esa.md) | Node ESM 和监听端口，固定问候及 404 |
| Azure Express | [`public-projects/azure-express`](./azure-express/README.esa.md) | Express 4 CommonJS、内存 API 与 JSON 404 |
| Docker Todo 后端 | [`public-projects/docker-todo-backend`](./docker-todo-backend/README.esa.md) | Express 5 与原生 SQLite，列表读取 |
| RealWorld Express | [`public-projects/realworld-express`](./realworld-express/README.esa.md) | Prisma 和 PostgreSQL、实际数据库读取 |
| Hagop Express Boilerplate | [`public-projects/hagop-express`](./hagop-express/README.esa.md) | MongoDB 启动、JWT 路由与未认证拒绝 |
| Uptime Kuma | [`public-projects/uptime-kuma`](./uptime-kuma/README.esa.md) | 原生 SQLite、生产前端构建、HTTP 与实时连接 |

## 本地验收

从 ESA 测试仓库根目录运行。推荐 Node 24 和 Corepack。npm、pnpm、Yarn 的具体命令由各项目的 `local.json` 提供。首次安装需要访问包注册表，可用 `npm_config_registry` 和 `COREPACK_NPM_REGISTRY` 指定环境中可用的镜像。原生依赖是否需要编译器取决于本机平台和可用的预编译包。

```bash
node scripts/run-public-local.mjs render-express vercel-cli-express
node scripts/run-public-local.mjs --jobs 2 vercel-vite-react vercel-next-static
node --test scripts/*.test.mjs
```

脚本分别在临时工作目录执行安装、构建、启动和 HTTP 断言。服务通过系统分配端口，验证完成后终止测试进程并清除副本。每次的日志和结果写到 `.local-test/public-projects/run-*/`，包含各项目的阶段日志、`probe.log` 和 `summary.json`。单个项目的成功条件是所有断言通过且进程退出码为 0。静态项目额外提取页面实际引用的同域脚本和样式，校验文件状态码和媒体类型。

## 数据库项目与全量运行

用本机 Docker Compose 启动测试用 PostgreSQL 和 MongoDB。Compose 只在 `127.0.0.1` 上分配端口。脚本结束后清理本次启动的数据库和数据卷。

```bash
# 只跑 RealWorld 和 Hagop
bash scripts/run-public-with-databases.sh

# 运行所有已接入项目
bash scripts/run-public-with-databases.sh --jobs 2 --all
```

也可以用已有的隔离测试库，把 `ESA_TEST_POSTGRES_URL` 和 `ESA_TEST_MONGODB_URL` 传给本地执行器。RealWorld 的本地准备步骤会在目标测试库执行迁移。数据库配置和应用凭据按各项目说明设置。

## 在已运行的本地服务或 ESA 域名上复用探针

```bash
node scripts/probe-public.mjs public-projects/vercel-nextjs https://<部署域名>
```

`checks.json` 使用现有的 `scripts/check.mjs` 断言格式。新探针还读取 `local.json` 中的 `htmlAssets` 与 `htmlImages`，跟随页面当前输出的同域资源链接。ESA 控制台填写表中的 Root Directory，Node 和服务配置以各项目说明为准。

本地应用验收对应源码构建、生产模式启动及断言。ESA FC ZIP、PCG、CDN 缓存和部署路由有独立的验收条件，见各项目说明。
