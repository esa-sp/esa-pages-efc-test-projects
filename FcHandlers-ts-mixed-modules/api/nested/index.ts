export = (_req: any, res: any) => {
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify({ module: "nested-commonjs" }));
};
