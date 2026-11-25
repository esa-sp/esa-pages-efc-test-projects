import Fastify from "fastify";
import { readFileSync } from "node:fs";
import type { AddressInfo } from "node:net";

const initialized: string = await Promise.resolve("top-level-await");
const resource = readFileSync(
  new URL("./resource.txt", import.meta.url),
  "utf8",
);
const app = Fastify();
const requestedPort = 18080;
app.get("/", async (_req, reply) => {
  return reply
    .type("text/html")
    .send(
      '<!doctype html><title>Fastify Await Listen</title><h1>Fastify Await Listen</h1><p>顶层 await listen、端口覆盖和对外监听回归。</p><a href="/api/health">检查运行状态</a>',
    );
});
app.get("/api/health", async () => {
  const address = app.server.address() as AddressInfo;
  return {
    ok: true,
    initialized,
    listening: app.server.listening,
    requestedPort,
    runtimePort: address.port === Number(process.env.PORT || requestedPort),
    publicBinding: address.address === "::" || address.address === "0.0.0.0",
  };
});
app.get("/api/resource", async (_req, reply) =>
  reply.type("text/plain").send(resource),
);

// 故意请求固定端口和 loopback；平台启动器必须使用运行 PORT 并对外监听。
await app.listen({ port: requestedPort, host: "127.0.0.1" });
