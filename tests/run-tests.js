const { readdirSync } = require("node:fs");
const { join } = require("node:path");
const { spawnSync } = require("node:child_process");

const testFiles = readdirSync(__dirname)
  .filter((file) => file.endsWith(".test.js"))
  .sort();

for (const file of testFiles) {
  const result = spawnSync(process.execPath, [join(__dirname, file)], { stdio: "inherit" });
  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}
