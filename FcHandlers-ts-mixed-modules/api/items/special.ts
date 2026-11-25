import { value } from "@lib/value";

export default (_req: any, res: any) => {
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify({ kind: "static", value }));
};
