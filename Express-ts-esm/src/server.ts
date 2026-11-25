import express from "express";
import { readFileSync } from "node:fs";
import { value } from "@values/current";

const initialized: string = await Promise.resolve("top-level-await");
const resource = readFileSync(
  new URL("./resource.txt", import.meta.url),
  "utf8",
);
const app = express();

app.get("/", (_req, res) => {
  res
    .type("html")
    .send(
      '<!doctype html><title>Express ESM TypeScript</title><h1>Express ESM TypeScript</h1><p>ESM、顶层 await、paths 和资源路径回归。</p><a href="/api/health">检查运行状态</a>',
    );
});
app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    module: "esm",
    framework: "express5",
    initialized,
    value,
  });
});
app.get("/api/resource", (_req, res) => {
  res.type("text").send(resource);
});
app.get("/api/dynamic", async (_req, res) => {
  const dynamic = await import("./dynamic.js");
  res.json({ value: dynamic.value });
});

app.listen(Number(process.env.PORT || 18080));
