#!/usr/bin/env node

const args = process.argv.slice(2);

if (args.includes("--version") || args.includes("-v")) {
  console.log("clio-manage v0.1.0");
  process.exit(0);
}

if (args.includes("--help") || args.includes("-h")) {
  console.log("clio-manage");
  console.log("");
  console.log("Usage:");
  console.log("  clio-manage [command]");
  console.log("");
  console.log("Commands:");
  console.log("  auth setup     Start local Clio setup");
  console.log("  auth status    Show local auth status");
  console.log("");
  console.log("Options:");
  console.log("  -h, --help     Show help");
  console.log("  -v, --version  Show version");
  process.exit(0);
}

console.log("clio-manage: starter scaffold ready");
console.log("Run `clio-manage --help` to see available commands.");
