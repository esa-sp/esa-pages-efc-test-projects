# Docker Todo Express 后端的 ESA 回归

上游为 [docker/getting-started-todo-app](https://github.com/docker/getting-started-todo-app/tree/55680777bc46c59d3fe0ab9ff7e79ee947d0c757/backend)，分支 main，提交 55680777bc46c59d3fe0ab9ff7e79ee947d0c757，根目录 backend，许可证 Apache-2.0。

保留原版 API、数据层和 npm 锁文件。监听代码接受 PORT 和可选 HOST，省略时仍监听原来的 3000。未复制 Dockerfile 构建的 React 客户端，这个用例验收独立后端。

## 构建与运行

ESA 根目录为 public-projects/docker-todo-backend。开启 EFC，选择 Node 24.x。运行时为 SQLITE_DB_LOCATION 指定测试用的可写路径，例如 /tmp/esa-docker-todo.db。保持 MYSQL_HOST 为空，应用走 SQLite。生产持久化不是此用例的验收范围。

在测试仓库根目录执行本地运行器。local.json 将 SQLite 放在本轮工作副本。sqlite3 预编译包不可用时会调用锁定的 node-gyp 8，源码编译需要本地编译器与带 distutils 的 Python。安装脚本会选用本机可用的兼容 Python，也可通过 PYTHON 指定。

    node scripts/run-public-local.mjs docker-todo-backend

已有本地或预览域名时，复用共享 HTTP 探针。

    node scripts/probe-public.mjs public-projects/docker-todo-backend http://127.0.0.1:3000

## 成功用例

- GET /api/greeting 返回 200 和 Hello world! JSON。
- GET /api/items 返回 200 和空数组，证明新测试库可打开并查询。
- GET /esa-probe-missing 返回 404。
