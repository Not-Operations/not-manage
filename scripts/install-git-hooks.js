#!/usr/bin/env node

const { execFileSync } = require("node:child_process");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");

function main() {
  execFileSync("git", ["config", "core.hooksPath", ".githooks"], {
    cwd: ROOT,
    stdio: "inherit",
  });

  console.log("Configured Git hooks path to .githooks");
}

if (require.main === module) {
  main();
}

module.exports = {
  main,
};
