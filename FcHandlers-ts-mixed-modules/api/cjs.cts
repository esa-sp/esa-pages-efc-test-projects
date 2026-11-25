const { basename } = require("node:path");
export = (_req: any, res: any) => {
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify({ module: basename("/modules/cts") }));
};
