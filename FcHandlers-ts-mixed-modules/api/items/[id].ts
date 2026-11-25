import { value } from "@lib/value";

export default (req: any, res: any) => {
  const id = new URL(req.url, "http://localhost").searchParams.get("id");
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify({ id, value }));
};
