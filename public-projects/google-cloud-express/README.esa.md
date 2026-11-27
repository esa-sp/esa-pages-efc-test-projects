# Google Cloud Run Express Hello World

源自 [GoogleCloudPlatform/nodejs-docs-samples 的 run/helloworld](https://github.com/GoogleCloudPlatform/nodejs-docs-samples/tree/07efe047d72c575889b391ba18298a43490dafd9/run/helloworld)，`main` 提交 `07efe047d72c575889b391ba18298a43490dafd9`。保留上游应用和 Apache-2.0 许可证。新增依赖锁文件、ESA 配置和探针，并固定开发依赖 `supertest@7.1.4`，避免当前注册表无法解析更高版本引用的依赖。应用直接读取 `PORT`，不需要 Google Cloud 凭据。

在样例集根目录执行 `node scripts/run-public-local.mjs google-cloud-express`。它用 `npm ci` 安装后启动 `node index.js`。成功条件为 `GET /` 精确返回 `Hello World!`，且不存在的路由返回 404。执行结果应为 `✓2 ✗0`。上游 Cloud Run 系统测试有自己的平台前置条件。

ESA Root Directory 填 `public-projects/google-cloud-express`，Node 选 24.x。部署后执行 `node scripts/probe-public.mjs public-projects/google-cloud-express <域名>`，用同两条断言验收。
