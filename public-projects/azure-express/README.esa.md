# Azure App Service Express 样例

源自 [Azure-Samples/nodejs-docs-hello-world](https://github.com/Azure-Samples/nodejs-docs-hello-world/tree/ab8695145fc34326f6b31b5d55eef4f7e22e7f18)，`main` 提交 `ab8695145fc34326f6b31b5d55eef4f7e22e7f18`。保留上游 CommonJS 应用和 MIT 许可证。新增依赖锁文件、ESA 配置和探针。应用用内存保存样例账户，不需要 Azure 凭据。

在样例集根目录执行 `node scripts/run-public-local.mjs azure-express`。它用 `npm ci` 安装后启动 `node index.js`。验收首页、API 标识、固定样例账户和无此账户的 404，全部为只读请求。执行结果应为 `✓4 ✗0`。

ESA Root Directory 填 `public-projects/azure-express`，Node 选 24.x。部署后执行 `node scripts/probe-public.mjs public-projects/azure-express <域名>`，用同四条断言验收。
