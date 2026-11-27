# Vercel CLI Nuxt 4

源码来自 [vercel/vercel 的 examples/nuxtjs](https://github.com/vercel/vercel/tree/155eacfa16840e68ae54bc50ee72fc8e16733857/examples/nuxtjs)，分支 `main`，提交 `155eacfa16840e68ae54bc50ee72fc8e16733857`。保留了上游许可证、页面、配置和锁文件。独立导入时固定 pnpm 10.34.5 复用原锁文件，允许 esbuild 和 @parcel/watcher 的安装脚本，并新增一个回显查询参数的 Nitro API，便于验证请求确实进了服务端。

- ESA Root Directory 为 `public-projects/vercel-nuxt4`，建议 Node 24。项目配置锁定框架 `nuxtjs`，执行冻结安装和 `pnpm build`。云构建成功时，检查 PCG 打包日志、最终包内的 `fc/code.zip` 和 `assets/`。
- 本地运行 `node scripts/run-public-local.mjs vercel-nuxt4`，需要 Node 24 与 Corepack。手工启动可在本目录运行 `corepack pnpm install --frozen-lockfile`、`corepack pnpm build`、`HOST=127.0.0.1 PORT=3000 node .output/server/index.mjs`。这一层验证原生 Nitro Node 产物。
- 从仓库根运行 `node scripts/probe-public.mjs public-projects/vercel-nuxt4 <url>`，期望首页返回 Nuxt HTML、首页同源资源可访问、`/robots.txt` 返回标准 robots 文件、`/api/esa-probe?label=esa-local` 返回请求携带的标签。
- 静态对照可在工作副本中将 `buildCommand` 改为 `pnpm generate`，将 `assets.directory` 设为 `.output/public`，并去掉 `regionFunction`。这一路验首页和静态资源，SSR API 的断言用于上面的服务端配置。
- 本地验收用 Node 24.13.0 从干净副本安装、构建和启动，4 条 HTTP 断言全部通过。同一版本在本地 PCG CLI 中也构建出了 `assets/` 和 `fc/start.mjs`。
