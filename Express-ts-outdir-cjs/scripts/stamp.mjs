import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";

// 仅标记本次用户构建生成的 JS；源码不动、不提交 dist。
const output = new URL("../dist/server.js", import.meta.url);
const code = readFileSync(output, "utf8");
assert.ok(code.includes("source-not-built"));
writeFileSync(output, code.replace("source-not-built", "user-built-cjs"));
