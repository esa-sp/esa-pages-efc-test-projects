const { basename } = require("node:path");
export = { value: basename("/modules/nested-commonjs") as string };
