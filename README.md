# ESA Pages EFC 测试项目集

这个仓库集中收录 24 个与 EFC（后端 `fc/code.zip`）相关的测试项目。导入同一仓库后，只需在 ESA Pages 控制台切换「根目录」，即可测试不同框架、入口形态、FC handlers、Nuxt/pcg、全栈路由和运行时行为。

- 顶层独立项目：11 个
- `backend-tests/` 后端框架项目：13 个
- 不包含仅测试包管理器、云构建 init、仓库来源或上传方式的变体
- 这些手写样例不提交 lockfile、`node_modules` 或构建产物

## 公网 Express 与 Vercel 项目

[`public-projects/`](./public-projects/README.md) 收录第三方 Express 与 Vercel 官方项目的固定源码快照。每个目录有上游位置和版本、ESA 配置、本地启动配置、明确的成功断言。公网样例保留上游已有锁文件，缺少锁时由验收补齐。原有手写项目仍使用其原来的依赖约定。

```bash
node scripts/run-public-local.mjs render-express vercel-cli-express
node scripts/probe-public.mjs public-projects/vercel-cli-express https://<部署域名>
```

本地回归会在临时目录安装、构建、启动、探测和清理。需要 PostgreSQL 或 MongoDB 的样例可以用配套的 Docker Compose 一起运行。 [项目总表、本地全量命令与成功条件](./public-projects/README.md) · [上游调研清单](./docs/public-express-vercel-test-matrix.md)

## 控制台通用设置

除 Backend-real 外，控制台只填「根目录」：

| 项 | 值 |
|---|---|
| 根目录 | 下表中的路径 |
| 构建命令 | 留空 |
| 静态资源目录 | 留空 |
| 入口 | 留空 |
| Node 版本 | 22.x（Nuxt4-hybrid 也可用 24.x） |

每个项目自己的 `esa.jsonc` 已提供必要的 installCommand、buildCommand、assets 或 entry 配置。控制台留空后由项目配置和框架检测决定最终行为。

Backend-real 是唯一例外：

- 10M 档：控制台构建命令填 `npm run build`
- 200M 档：控制台构建命令填 `npm run build:200m`

## 顶层项目

| 根目录 | 测什么 | 验收方式 |
|---|---|---|
| `Backend-real` | Express 5 真实运行时；10M/200M code.zip、原生模块、子进程/worker、日志、WebSocket、SSE、大请求体 | `Backend-real/probe.sh` 无 `✗`；两档均构建部署成功 |
| `Express-comprehensive` | 入口消歧、Express 优先于 `/api` handlers、EJS views 追踪 | check.mjs：`✓4 ✗0` |
| `Express-ts-precompile` | 用户未预编译时，TestStep 用 esbuild 编译 TypeScript 入口 | check.mjs：`✓2 ✗0` |
| `FcHandlers-comprehensive` | 三种 handler 导出风格、静态/动态/catch-all、method router、静态 assets | check.mjs：`✓10 ✗0` |
| `FcHandlers-ts` | TypeScript FC handlers 预编译与清理 | check.mjs：`✓4 ✗0` |
| `FcHandlers-index` | `api/index.js` 和子目录 index 的路由折叠 | check.mjs：`✓2 ✗0` |
| `FcHandlers-optional` | `[[...slug]]` 可选 catch-all | check.mjs：`✓2 ✗0` |
| `FcHandlers-conflict` | 两个动态文件生成相同 URL pattern 时的冲突检测 | 构建应失败，日志含 `Route conflict` |
| `Fullstack-react-express` | Vite assets + ER edge function + Express FC 三类产物和路由分发 | check.mjs：`✓6 ✗0` |
| `Nuxt-app` | Nuxt 3 经 pcg/esa-nitro-preset 打包，SSR/SWR 和 server API | check.mjs：`✓4 ✗0` |
| `Nuxt4-hybrid` | Nuxt 4 混合渲染、两层缓存、payload、图片优化、流式和运行时环境 | `Nuxt4-hybrid/probe.sh` 无 `✗` |

## backend-tests 项目

这 13 个项目都以 `backend-tests/<目录名>` 作为控制台根目录。部署后 check.mjs 直接复用项目内 `meta.json` 的 assertions。

| 根目录 | 框架/入口 | 重点 |
|---|---|---|
| `backend-tests/express-listen` | Express / `server.js` | `app.listen()` 拦截、静态文件 |
| `backend-tests/express-export` | Express / `app.js` | `module.exports = app`，无 listen |
| `backend-tests/express-multifile` | Express / `app.js` | 多文件路由、中间件、API key 成功/401 |
| `backend-tests/express-typescript` | Express / `dist/index.js` | tsconfig outDir、TS 构建产物识别 |
| `backend-tests/fastify` | Fastify / `server.js` | listen、Schema、静态插件 |
| `backend-tests/fastify-plugins` | Fastify / `server.js` | 多插件 register 和多组路由 |
| `backend-tests/koa` | Koa / `server.js` | 洋葱中间件、listen |
| `backend-tests/hono` | Hono / `app.js` | Web fetch handler、Node adapter |
| `backend-tests/elysia` | Elysia / `app.js` | Web fetch handler |
| `backend-tests/h3` | H3 / `server.js` | `toNodeListener` + `http.listen` |
| `backend-tests/nestjs` | NestJS / `dist/main.js` | decorators、bootstrap、POST 201 |
| `backend-tests/nestjs-multimodule` | NestJS / `dist/main.js` | 多模块、Guard、Pipe、Interceptor、API key 成功/403 |
| `backend-tests/node` | 原生 Node / `server.js` | 无框架时的 `http.createServer` fallback |

所有项目的详细验证点、API 和源码结构见各自 README；backend-tests 的总说明见 [`backend-tests/README.md`](./backend-tests/README.md)。

## 部署后自动验收

部署后容器内无法做任何操作，所有验收都在本机完成：check.mjs 和两个 probe.sh 只向部署域名发 HTTP 请求，运行时日志在控制台查看。check.mjs 需要 Node 18 及以上，probe.sh 需要 `curl`（Backend-real 的 WebSocket 项需要 Node 22 及以上）。

在本机的仓库根目录执行：

```bash
node scripts/check.mjs <项目根目录> https://<部署域名>
```

示例：

```bash
node scripts/check.mjs FcHandlers-comprehensive https://example.com
node scripts/check.mjs backend-tests/nestjs https://example.com
```

check.mjs 优先读取项目内 `checks.json`，没有则读取 `meta.json` 的 assertions。它支持：

- 状态码严格相等
- 响应体子串或全等
- JSON 递归子集（数组完全相等）
- 响应头子串
- 请求 method、headers 和 body
- 30 秒超时、网络错误汇总、3xx 不自动跟随

最后一行 `✗0` 才算通过。验收工具自测：

```bash
node --test scripts/check.test.mjs
```

Backend-real 和 Nuxt4-hybrid 的探针更复杂，分别使用：

```bash
Backend-real/probe.sh https://<域名>
Nuxt4-hybrid/probe.sh https://<域名>
```

## 构建日志判定

普通后端框架项目应出现：

- `Detected backend project`
- `nft trace finished:`
- `Backend zip created:`
- `<<LOG>>step|buildEnd<</LOG>>`

FC handlers 项目应出现：

- `No backend framework but /api/ has FC handler files`
- `fc-bundle finished:`
- `FC handlers zip created:`

Nuxt 项目应出现：

- `Framework detection (all matched):` 和 `nuxtjs`
- `Copying pcg assets/ to artifactsAssetsDir.`
- `Packing pcg fc/ into code.zip.`
- `pcg artifacts packed:`
- `Backend conf.jsonc created:`

各项目的特殊日志和反向断言见对应 README。

## 本地验证

TestStep 已构建时，可在任一项目根目录执行：

```bash
npm_config_registry=https://registry.npmjs.org \
  node /path/to/TestStep/scripts/local-build.mjs
```

本地 version/deploy 因没有后端 API 而失败是预期行为；只要 build 阶段完成并生成 `index.zip`、`fc/code.zip` 等产物即可继续解压启动。静态边缘缓存、跨实例、线上日志后台和边缘路由仍需真实部署验证。

本次整理已本地验证三个代表项目：

- `FcHandlers-comprehensive`：9 条 FC 后端断言通过；首页静态资源留给真实部署验证
- `backend-tests/express-listen`：5 条断言通过
- `Nuxt-app`：4 条断言通过

## 已知平台现象

这些是探针当前预期观察到的现象，不应被误判为 fixture 自身失败：

| 项目 | 现象 |
|---|---|
| Nuxt4-hybrid | 缓存页面的 `_payload.json` 当前因 cache driver `hasItem` 绑定问题返回 500 |
| Nuxt4-hybrid | 修复 hasItem 后，payload cache 只按路径保存，个性化页面存在串号风险 |
| Nuxt4-hybrid | ipx 二进制响应配 L2 SWR 后，第 2 次可能返回 `{}` |
| Nuxt4-hybrid | `varies: ['cookie']` 的响应当前不带 `Vary: cookie` |
| Nuxt4-hybrid | `/api/lab/clear` 因 driver `getKeys` 返回空数组而无效 |
| Backend-real | worker 不继承日志钩子；`stdout.write`/`stderr.write` 不采集；长日志截断到 32KiB |
| Nuxt4-hybrid | Nuxt 版本固定 4.4.8；升级前需核对云构建 Node 的实际小版本是否满足 engines |

详细复现步骤和现状判定见两个项目自己的 README 和 probe.sh。
