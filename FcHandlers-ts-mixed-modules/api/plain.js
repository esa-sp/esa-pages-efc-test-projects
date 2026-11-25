import { value } from "../src/from-js.js";

export default (_req, res) => {
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify({ module: "js", value }));
};
