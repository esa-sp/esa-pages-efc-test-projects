import { readFileSync } from "node:fs";
import { value } from "@lib/value";

const initialized: string = await Promise.resolve("top-level-await");
const resource = readFileSync(
  new URL("./resource.txt", import.meta.url),
  "utf8",
).trim();
export default (_req: any, res: any) => {
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify({ module: "mts", value, initialized, resource }));
};
