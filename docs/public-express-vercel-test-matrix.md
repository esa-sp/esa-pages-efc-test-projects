# ESA Pages 公网 Express 与 Vercel 官方模板测试清单

调研日期 2026-11-27。以下是源码核对和建议测试配置。已导入项目的配置、测试指令和成功条件见 [公网回归项目](../public-projects/README.md)。ESA 仿真部署状态仍需单独验收。

## 建议范围

现有样例已经覆盖了 Express 的监听入口、导出入口、TS 预编译、静态文件和基础路由。公网项目优先补真实的依赖与产物结构，例如 Yarn 和 pnpm 锁文件、tsup、多级启动入口、原生 SQLite、Vite SSR 双产物，以及同一应用的模板和静态资源。 [现有回归项目](../README.md)

Vercel 的官方 CLI 样例可以作为固定的全量基线。公开清单返回 85 项，其中 59 个 `visible=true` 的名称与下方源码快照中的 59 个样例目录一致。其余 26 个是 CLI 的历史入口，单列为后续兼容性范围。官网模板市场还收录合作伙伴和社区项目，Vercel 官方团队维护的市场模板也分散在多个仓库。 [CLI 清单](https://examples.vercel.sh/v2/list.json) · [CLI 选择逻辑](https://github.com/vercel/vercel/blob/155eacfa16840e68ae54bc50ee72fc8e16733857/packages/cli/src/commands/init/init.ts) · [模板市场投稿说明](https://vercel.com/templates/submit)

| 来源 | 位置 | 建议用法 |
| --- | --- | --- |
| Vercel CLI | [vercel/vercel · examples](https://github.com/vercel/vercel/tree/155eacfa16840e68ae54bc50ee72fc8e16733857/examples)，`main` 快照 `155eacf` | 固定 59 项，作为长期分母，按实际路由和产物验收 |
| Vercel 示例与解决方案 | [vercel/examples](https://github.com/vercel/examples/tree/a4b4827297bec79b81ddb2ff22a53089ebe88cd8)，`main` 快照 `a4b4827` | 优先 `framework-boilerplates/`、`solutions/` 及市场标出的官方案例 |
| Next.js 官方示例 | [vercel/next.js · examples](https://github.com/vercel/next.js/tree/0173455ce60633b2c91e164cf9cbf934a2ab5a77/examples)，`canary` 快照 `0173455` | 补静态导出和 Next.js 特性用例。源码 SHA 固定后，仍需记录 `next: latest` 实际解析的版本 |
| Vercel 模板市场 | [vercel.com/templates](https://vercel.com/templates) · [Express 官方指南](https://vercel.com/kb/guide/build-with-a-express-starter-template) | 从每张卡片记录 owner、仓库、目录、版本和依赖。官网出现的模板不一定由 Vercel 维护 |

## 第一批 6 项

这批无需单独开通数据库或模型服务，覆盖 Express 5、JS/TS、包管理器、FC ZIP 和静态产物。以下安装和构建值是显式配置建议。空构建表示不执行应用构建命令。Express 项目的 EFC 权限和兼容的 Node 版本是共同前提。

| 顺序 | 仓库、分支、根目录 | 建议安装和构建 | 部署后验收 |
| --- | --- | --- | --- |
| A1 | [render-examples/express-hello-world](https://github.com/render-examples/express-hello-world/tree/main)，`main@039c347`，`.` | `yarn install --frozen-lockfile`，构建留空 | Express 5 JS 的基准。验 `GET /` 返回样例 HTML，核对 `app.js` 监听入口和 `PORT` 注入。 [入口](https://github.com/render-examples/express-hello-world/blob/main/app.js) |
| A2 | [heroku/nodejs-getting-started](https://github.com/heroku/nodejs-getting-started/tree/main)，`main`，`.` | `npm ci`，构建留空。仓库声明 npm `12.x`，记录云构建实际版本 | Express 5 + EJS。验首页模板以及从 HTML 提取的本地静态资源。检查 `app.listen()` 返回值可承接样例的 keep-alive 与关闭逻辑。 [入口](https://github.com/heroku/nodejs-getting-started/blob/main/index.js) · [清单](https://github.com/heroku/nodejs-getting-started/blob/main/package.json) · [锁文件](https://github.com/heroku/nodejs-getting-started/blob/main/package-lock.json) |
| A3 | [edwinhern/express-typescript](https://github.com/edwinhern/express-typescript/tree/master)，`master@983fa04`，`.` | 以仓库声明的 pnpm `10.33.0` 执行 `pnpm install --frozen-lockfile` 和 `pnpm build` | `tsc && tsup`、路径别名、Pino、OpenAPI。核对 ZIP 的实际启动入口，验 `/health-check`、`/users`、`/swagger.json`。上游开发工具版本文件写了 Node 23，需用 ESA 支持的大版本单独验证。 [清单](https://github.com/edwinhern/express-typescript/blob/master/package.json) · [应用路由](https://github.com/edwinhern/express-typescript/blob/master/src/server.ts) · [开发工具版本](https://github.com/edwinhern/express-typescript/blob/master/.tool-versions) |
| A4 | [vercel/vercel · Express](https://github.com/vercel/vercel/tree/155eacfa16840e68ae54bc50ee72fc8e16733857/examples/express)，`main@155eacf`，`examples/express` | `npm install`，构建留空，框架 `express` | Vercel CLI 样例用 Express 5，TS 默认导出 app，没有 `listen()`。验 `/`、`/api/users/42` 和 `/api/posts/1/comments/2` 的 ID 数据。 [入口](https://github.com/vercel/vercel/blob/155eacfa16840e68ae54bc50ee72fc8e16733857/examples/express/src/index.ts) |
| A5 | [vercel/vercel · Vite React](https://github.com/vercel/vercel/tree/155eacfa16840e68ae54bc50ee72fc8e16733857/examples/vite-react)，`main@155eacf`，`examples/vite-react` | `npm install`、`npm run build`，Assets `dist` | `tsc -b && vite build`。验首页、从 HTML 提取的 JS/CSS 和图片。ZIP 应包含静态产物。 [清单](https://github.com/vercel/vercel/blob/155eacfa16840e68ae54bc50ee72fc8e16733857/examples/vite-react/package.json) |
| A6 | [vercel/next.js · 静态导出](https://github.com/vercel/next.js/tree/0173455ce60633b2c91e164cf9cbf934a2ab5a77/examples/with-docker-export-output)，`canary@0173455`，`examples/with-docker-export-output` | `pnpm install --frozen-lockfile`、`pnpm build`，Assets `out` | `output: 'export'` 对照。验 `out/index.html`、线上首页和 `/_next/static/` 下的实际资源。Node EFC 不作为这个样例的成功条件。 [配置](https://github.com/vercel/next.js/blob/0173455ce60633b2c91e164cf9cbf934a2ab5a77/examples/with-docker-export-output/next.config.ts) |

## 第二批 6 项

| 顺序 | 仓库、分支、根目录 | 建议安装和构建 | 部署后验收与待确认项 |
| --- | --- | --- | --- |
| B1 | [w3cj/express-api-starter-ts](https://github.com/w3cj/express-api-starter-ts/tree/main)，`main`，`.` | `pnpm install --frozen-lockfile`、`pnpm build`，脚本执行 `tsc` | 校验从 `src/index.ts` 到 `dist/src/index.js` 的入口识别。验 `GET /` JSON 和不存在路径的 404。上游 `start` 脚本要 `.env`，入口源码的 `PORT` 和 `NODE_ENV` 有默认值。 [锁文件](https://github.com/w3cj/express-api-starter-ts/blob/main/pnpm-lock.yaml) · [清单](https://github.com/w3cj/express-api-starter-ts/blob/main/package.json) · [环境配置](https://github.com/w3cj/express-api-starter-ts/blob/main/src/env.ts) · [路由](https://github.com/w3cj/express-api-starter-ts/blob/main/src/app.ts) |
| B2 | [vercel/examples · Express.js on Vercel](https://github.com/vercel/examples/tree/a4b4827297bec79b81ddb2ff22a53089ebe88cd8/solutions/express)，`main@a4b4827`，`solutions/express` | `pnpm install --frozen-lockfile`，构建留空，Assets `public` | Express 4 ESM。验 `/`、`/healthz`、`/api-data`、`/about` 和 `/style.css`。其中 `/about` 验证 `sendFile` 引用的资源随 FC ZIP 保留。 [官方模板](https://vercel.com/templates/backend/express-js-on-vercel) · [入口](https://github.com/vercel/examples/blob/a4b4827297bec79b81ddb2ff22a53089ebe88cd8/solutions/express/src/index.ts) |
| B3 | [vercel/vercel · Next.js Boilerplate](https://github.com/vercel/vercel/tree/155eacfa16840e68ae54bc50ee72fc8e16733857/examples/nextjs)，`main@155eacf`，`examples/nextjs` | `npm ci`、`npm run build` | Next 16.2.4 和 App Router 入口。验首页、`/_next/static/` 资源及适配产物。该样例没有 API 路由，首页 200 加静态资源通过只证明基础模板跑通。构建使用 `next/font/google` 拉取 Geist，下载失败单独归因。 [清单](https://github.com/vercel/vercel/blob/155eacfa16840e68ae54bc50ee72fc8e16733857/examples/nextjs/package.json) · [字体引用](https://github.com/vercel/vercel/blob/155eacfa16840e68ae54bc50ee72fc8e16733857/examples/nextjs/app/layout.tsx) |
| B4 | [vercel/vercel · Nuxt](https://github.com/vercel/vercel/tree/155eacfa16840e68ae54bc50ee72fc8e16733857/examples/nuxtjs)，`main@155eacf`，`examples/nuxtjs` | `pnpm install --frozen-lockfile`、`pnpm build`，另排一次 `pnpm generate` 加 Assets `.output/public` | Nuxt 4 SSR 与纯静态对照。分别验首页、`/_nuxt/` 资源、FC ZIP 有无，以及预渲染日志。记录实际 Node 大版本和补丁版本。 [清单](https://github.com/vercel/vercel/blob/155eacfa16840e68ae54bc50ee72fc8e16733857/examples/nuxtjs/package.json) |
| B5 | [vercel/examples · Astro Boilerplate](https://github.com/vercel/examples/tree/a4b4827297bec79b81ddb2ff22a53089ebe88cd8/framework-boilerplates/astro)，`main@a4b4827`，`framework-boilerplates/astro` | `pnpm install`、`pnpm build` | Astro 5 以 server 模式配置 Vercel adapter。先试原版经 PCG，再独立记录 adapter、图片优化和 Analytics 的差异。验 `/`、`/ssr`、`/ssr-with-swr-caching`、`/image`。 [官方模板](https://vercel.com/templates/astro/astro-boilerplate) · [配置](https://github.com/vercel/examples/blob/a4b4827297bec79b81ddb2ff22a53089ebe88cd8/framework-boilerplates/astro/astro.config.ts) |
| B6 | [bluwy/create-vite-extra · React SSR](https://github.com/bluwy/create-vite-extra/tree/master/template-ssr-react)，`master@3d321fd`，`template-ssr-react` | `npm install`、`npm run build`，验运行环境 `NODE_ENV=production` | Express 服务 `dist/client` 和 `dist/server`。验首页 HTML、静态 JS 和 FC ZIP 是否保留服务端渲染入口。这个样例可测试 Express 与 Vite 同时命中时的构建决策。 [清单](https://github.com/bluwy/create-vite-extra/blob/master/template-ssr-react/package.json) · [入口](https://github.com/bluwy/create-vite-extra/blob/master/template-ssr-react/server.js) |

第二批 B4 的静态生成建议建独立配置，避免后一次构建覆盖当轮 SSR 结果。若按严格六个独立部署计数，先跑 B4 SSR，把 generate 放到后续补测。

## 第三方 Express 的后续候选

| 仓库、分支、根目录 | 建议用途与前置条件 |
| --- | --- |
| [GoogleCloudPlatform/nodejs-docs-samples](https://github.com/GoogleCloudPlatform/nodejs-docs-samples/tree/main/run/helloworld)，`main@07efe04`，`run/helloworld` | 无服务依赖的独立子目录。Express 5 ESM、`npm install`、构建留空。验 `GET /` 的问候，以及监听端口注入。 [清单](https://github.com/GoogleCloudPlatform/nodejs-docs-samples/blob/main/run/helloworld/package.json) · [入口](https://github.com/GoogleCloudPlatform/nodejs-docs-samples/blob/main/run/helloworld/index.js) |
| [Azure-Samples/nodejs-docs-hello-world](https://github.com/Azure-Samples/nodejs-docs-hello-world/tree/main)，`main@ab86951`，`.` | 历史 CJS 和 Express 4 对照。npm install、构建留空。验 `/` 与 `/api`。 [入口](https://github.com/Azure-Samples/nodejs-docs-hello-world/blob/main/index.js) |
| [docker/getting-started-todo-app](https://github.com/docker/getting-started-todo-app/tree/main/backend)，`main@5568077`，`backend` | Express 5 与原生 SQLite。npm ci、构建留空。给 SQLite 指定测试临时路径，验证 Linux 原生模块随 FC ZIP 交付。验 `/api/greeting` 和 `/api/items`。完整首页还依赖前端产物，单独验收。 [入口](https://github.com/docker/getting-started-todo-app/blob/main/backend/src/index.js) · [SQLite](https://github.com/docker/getting-started-todo-app/blob/main/backend/src/persistence/sqlite.js) |
| [gothinkster/node-express-realworld-example-app](https://github.com/gothinkster/node-express-realworld-example-app/tree/master)，`master@30b68e1`，`.` | RealWorld API 的 Nx、Express 4、Prisma 版本。npm ci、`npx prisma generate && npm run build`，入口 `dist/api/main.js`。配置独立 PostgreSQL 和测试 JWT，先对测试库迁移。验 `GET /api/tags`。 [清单](https://github.com/gothinkster/node-express-realworld-example-app/blob/master/package.json) · [Prisma schema](https://github.com/gothinkster/node-express-realworld-example-app/blob/master/src/prisma/schema.prisma) |
| [hagopj13/node-express-boilerplate](https://github.com/hagopj13/node-express-boilerplate/tree/master)，`master@179ae84`，`.` | 历史 Express 4/CJS、MongoDB 与鉴权。Yarn classic，构建留空。上游生产脚本使用 PM2，建议用最终 ZIP 入口启动 `src/index.js` 做兼容对照。启动需要隔离的 MongoDB 和测试 JWT，验 `GET /v1/users` 未认证返回 401。 [清单](https://github.com/hagopj13/node-express-boilerplate/blob/master/package.json) · [配置](https://github.com/hagopj13/node-express-boilerplate/blob/master/src/config/config.js) · [路由](https://github.com/hagopj13/node-express-boilerplate/blob/master/src/routes/v1/user.route.js) |
| [louislam/uptime-kuma](https://github.com/louislam/uptime-kuma/tree/2.5.12)，标签 `2.5.12`，`.` | 真实应用压力样例。npm ci、npm run build、`node server/server.js`。验证 SQLite 原生依赖、Vite assets、WS 与持久化目录各项能力。先验初始化和只读入口，长期状态单独判断。 [清单](https://github.com/louislam/uptime-kuma/blob/2.5.12/package.json) · [入口](https://github.com/louislam/uptime-kuma/blob/2.5.12/server/server.js) |

Express 预设没有默认应用构建命令。像 tsup、tsc、Vite SSR 或 Nx 这些需要编译的项目，建议明确填构建命令并检验最终 ZIP 的入口，避免把安装成功当成部署可运行。 [framework-checker 预设源码](../../framework-checker/src/frameworks.ts)

## 后续 Vercel 官方模板及能力缺口

| 上游位置 | 分开验收的功能 |
| --- | --- |
| [vercel/examples · Vite Vue](https://github.com/vercel/examples/tree/a4b4827297bec79b81ddb2ff22a53089ebe88cd8/framework-boilerplates/vite)，`main@a4b4827`，`framework-boilerplates/vite` | pnpm 锁文件、Vite Vue 和 `dist` 静态输出。用于确认 React/Vue 至少各有一个官方原版基准。 [Vite 官方部署说明](https://vercel.com/docs/frameworks/frontend/vite) |
| [vercel/examples · Nuxt 3](https://github.com/vercel/examples/tree/a4b4827297bec79b81ddb2ff22a53089ebe88cd8/framework-boilerplates/nuxtjs)，`main@a4b4827`，`framework-boilerplates/nuxtjs` | 该市场模板是 Nuxt 3。按 pnpm 锁文件安装，分别验 `pnpm build` 与 `pnpm generate`，与 CLI Nuxt 4 做版本对照。 [官方模板](https://vercel.com/templates/vue/nuxtjs-boilerplate) · [清单](https://github.com/vercel/examples/blob/a4b4827297bec79b81ddb2ff22a53089ebe88cd8/framework-boilerplates/nuxtjs/package.json) |
| [vercel/nuxt3-kitchen-sink](https://github.com/vercel/nuxt3-kitchen-sink/tree/f31a7fced87270c67e3907a90bf1addb14206973)，`main@f31a7fc`，`.` | Nuxt 3.12.2、pnpm、`nuxt build`。除首页外验 `GET /api/hello`、内容和中间件，作为有真实服务端路由的 Nuxt 官方样本。 [官方模板](https://vercel.com/templates/nuxt/nuxt-3-kitchen-sink) · [API 源码](https://github.com/vercel/nuxt3-kitchen-sink/blob/f31a7fced87270c67e3907a90bf1addb14206973/server/api/hello.ts) |
| [vercel/vercel · Hono](https://github.com/vercel/vercel/tree/155eacfa16840e68ae54bc50ee72fc8e16733857/examples/hono)，`main@155eacf`，`examples/hono` | TypeScript 和默认导出入口。验 `GET /` 的 Hono 文本，随后扩到 CLI 样例的 Fastify、Koa、NestJS、Elysia、H3、Node。 [入口](https://github.com/vercel/vercel/blob/155eacfa16840e68ae54bc50ee72fc8e16733857/examples/hono/src/index.ts) |
| [vercel/app-playground](https://github.com/vercel/app-playground/tree/main)，`main`，`.` | App Router 的动态数据、Layouts 和 Streaming。当前源码使用 Next canary，和 B3 稳定版分开记结果，确认各路由的外部数据来源后再跑。 [官方模板](https://vercel.com/templates/next.js/app-directory) · [清单](https://github.com/vercel/app-playground/blob/main/package.json) |
| [nextjs/on-demand-isr](https://github.com/nextjs/on-demand-isr/tree/main)，`main`，`.` | Vercel 推荐的按需 ISR 模板。仓库原版需要测试 GitHub App 和 webhook，验数据变化触发重新生成；仅首页 200 不足以验证 ISR。 [官方模板](https://vercel.com/templates/template/on-demand-incremental-static-regeneration) · [上游集成说明](https://github.com/nextjs/on-demand-isr#setup) |
| [vercel/ai · Express + AI SDK](https://github.com/vercel/ai/tree/c39dedf99de495531017b7805dd7a99209798828/examples/express)，`main@c39dedf`，`examples/express` | 原始子目录依赖 `workspace:*`，需保留上游 workspace，或取官方部署所用的独立可安装源码。已有 `esa-sp/express-ai-sdk` 可作为独立对照，先记版本与入口差异。先验 `GET /` 和硬编码的监听端口能否适配 EFC。POST 流式单独配置测试模型。 [官方模板](https://vercel.com/templates/other/express-ai-sdk) · [清单](https://github.com/vercel/ai/blob/c39dedf99de495531017b7805dd7a99209798828/examples/express/package.json) · [入口](https://github.com/vercel/ai/blob/c39dedf99de495531017b7805dd7a99209798828/examples/express/src/server.ts) |
| [vercel/examples · Express on Bun](https://github.com/vercel/examples/tree/a4b4827297bec79b81ddb2ff22a53089ebe88cd8/framework-boilerplates/express-bun)，`main@a4b4827`，`framework-boilerplates/express-bun` | 原版配置指定 Bun 运行时，页面读取 `process.versions.bun`。用 Bun 安装依赖或用 Node 打开首页都不能验证该运行时。 [官方模板](https://vercel.com/templates/express/express-on-bun) |
| [vercel/vercel · FastAPI](https://github.com/vercel/vercel/tree/155eacfa16840e68ae54bc50ee72fc8e16733857/examples/fastapi) 与 [Gin](https://github.com/vercel/vercel/tree/155eacfa16840e68ae54bc50ee72fc8e16733857/examples/gin)，`main@155eacf`，`examples/fastapi`、`examples/gin` | 用 Git 源码入口验显式框架触发 warn 和跳过 EFC。可对 Gin 显式配置 `public` 做静态降级，单独断言 `/api/data` 不具备原 Go 功能。完整 Python/Go 服务端运行列为平台差距。 |
| [vercel/examples · SaaS Microservices](https://github.com/vercel/examples/tree/a4b4827297bec79b81ddb2ff22a53089ebe88cd8/microfrontends/saas-microservices)，`main@a4b4827`，`microfrontends/saas-microservices` | 保留 pnpm workspace。先从 `apps/api` 验 `/healthz` 和 `/api/dashboard/activity`，再验全项目跨应用路由。单个服务成功与整个微前端应用成功分别记。 [官方模板](https://vercel.com/templates/next.js/saas-microservices) · [API 子项目](https://github.com/vercel/examples/tree/a4b4827297bec79b81ddb2ff22a53089ebe88cd8/microfrontends/saas-microservices/apps/api) |
| [vercel/examples · Blob Starter](https://github.com/vercel/examples/tree/a4b4827297bec79b81ddb2ff22a53089ebe88cd8/storage/blob-starter) 与 [Maintenance Page](https://github.com/vercel/examples/tree/a4b4827297bec79b81ddb2ff22a53089ebe88cd8/edge-middleware/maintenance-page)，`main@a4b4827`，`storage/blob-starter`、`edge-middleware/maintenance-page` | 分别依赖 Vercel Blob 和 Edge Config。用隔离服务验证原版时，记录功能依赖与 ESA 部署结果。若替换为 OSS 或自有配置再验，单独记录适配改动。 [Blob 模板](https://vercel.com/templates/next.js/blob-starter) · [Maintenance Page 模板](https://vercel.com/templates/edge-middleware/maintenance-page) |
| [vercel/examples · Build Output API ISR](https://github.com/vercel/examples/tree/a4b4827297bec79b81ddb2ff22a53089ebe88cd8/build-output-api/on-demand-isr)，`main@a4b4827`，`build-output-api/on-demand-isr` | Vercel 特有的预构建产物协议对照。需要先对齐 ESA 的产物、路由、缓存和触发语义，然后才能验迁移版全功能。 [Build Output API 官方说明](https://vercel.com/docs/build-output-api/features) |

### 如何定义“都能跑”

1. **固定源码和依赖。** 每一行记原仓库、分支、SHA、Root Directory、构建器版本、包管理器和实际依赖锁。同一项目下无需环境依赖的模板可以复制对应子目录并保留许可证和已有锁文件；有 workspace 依赖的项目应保留根目录结构。无锁文件的项目记录首次解析版本。原版与最低必要的 ESA 配置适配版分开记录。
2. **成功必须覆盖功能。** 静态模板验页面和实际资源，Node 后端验 FC ZIP 和后端路由，SSR/ISR/Streaming 分别验动态响应、缓存变化和流式分片。用部署预览域名验收，避免使用上游项目的线上地址。保留部署记录、日志、包清单、探针结果与断言来源。
3. **让兼容结果对应实际缺口。** 每行标注“原版通过”“配置后通过”“缺外部服务”“缺平台能力”或“待验”。ESA 当前 PCG 主路径为 Next.js、Nuxt、Astro，Node EFC 运行时只支持 Node 22、24、26。SvelteKit、React Router、Remix、TanStack Start、Nitro 等样例可识别为 server，但需分别验证服务端适配。Hugo、Jekyll、Middleman、Zola 单列工具链和预构建 Assets。Vercel 专有的 `vercel.json` / `.vercel/output`、Edge Config、Blob、Cron、Microfrontends 类模板要逐项确认替代方式。仅构建通过或按预期降级，不算全功能通过。 [Vercel 项目配置](https://vercel.com/docs/project-configuration) · [Vercel 框架与能力矩阵](https://vercel.com/docs/frameworks) · [ESA 分流](../../TestStep/src/utils/sourceConfig.ts) · [ESA EFC 运行时](../../TestStep/src/utils/fc.ts)

### CLI 样例基线的 59 个目录

以下目录位于 `vercel/vercel@155eacf:examples/<name>`。这里记录的是清单范围，不是已经通过的项目。 [固定源码](https://github.com/vercel/vercel/tree/155eacfa16840e68ae54bc50ee72fc8e16733857/examples) · [官方清单](https://examples.vercel.sh/v2/list.json)

```text
actix-web angular astro axum brunch create-react-app django docusaurus docusaurus-2
eleventy elysia ember express fastapi fasthtml fastify flask gatsby gin h3 hexo hono
hugo hydrogen-2 ionic-angular ionic-react jekyll koa mastra middleman nestjs nextjs
nitro node nuxtjs parcel polymer preact react-router redwoodjs remix sanity-v2 sapper
sinatra solidstart-1 starlette stencil svelte sveltekit sveltekit-1 tanstack-start
umijs vite vite-react vitepress vue vuepress xmcp zola
```
