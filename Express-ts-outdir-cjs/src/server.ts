import express from "express";
import { from } from "./value.js";

// 用户构建只修改 dist 标记，重新转译此源码会返回错误值。
const artifact: string = "source-not-built";
const app = express();
app.get("/", (_req, res) => {
  res
    .type("html")
    .send(
      '<!doctype html><title>User Built CJS</title><h1>User Built CJS</h1><p>验证继承配置的 outDir 产物复用。</p><a href="/api/health">检查运行产物</a>',
    );
});
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, module: "cjs", artifact, from });
});
app.listen(Number(process.env.PORT || 18080));
