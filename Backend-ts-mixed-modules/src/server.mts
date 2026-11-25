import express from "express";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import cjs from "./cjs.cjs";
import nested from "./nested/value.js";
import { value } from "./bridge.js";

// 合法绑定的 require 不应被 ESM 模块错配校验拒绝。
const require = createRequire(import.meta.url);
const { platform } = require("node:os");
const resource = readFileSync(
  new URL("./resource.txt", import.meta.url),
  "utf8",
);
const app = express();
app.get("/", (_req, res) => {
  res
    .type("html")
    .send(
      '<!doctype html><title>Mixed TypeScript Modules</title><h1>Mixed TypeScript Modules</h1><p>.mts、.cts、嵌套 commonjs 与 JS → TS 依赖回归。</p><a href="/api/health">检查运行状态</a>',
    );
});
app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    esm: "mts",
    cjs: cjs.value,
    nested: nested.value,
    localJs: value,
    boundRequire: typeof platform() === "string" ? "createRequire" : "invalid",
  });
});
app.get("/api/resource", (_req, res) => {
  res.type("text").send(resource);
});
app.listen(Number(process.env.PORT || 18080));
