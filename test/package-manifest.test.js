const test = require("node:test");
const assert = require("node:assert/strict");

const packageJson = require("../package.json");

test("package manifest keeps install script surface minimal", () => {
  assert.equal(packageJson.scripts.postinstall, undefined);
  assert.equal(packageJson.bin["not-manage"], "bin/not-manage.js");
  assert.equal(packageJson.name, "not-manage");
});
