const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const { captureConsole, loadWithMocks } = require("./helpers/module-test-utils");

const ROOT = path.resolve(__dirname, "..");

test("bin entrypoint prints the thrown error message instead of a generic failure", async () => {
  const originalArgv = process.argv;
  const originalExit = process.exit;
  let exitCode = null;

  process.argv = ["node", "bin/not-manage.js", "activities", "get"];
  process.exit = (code) => {
    exitCode = code;
  };

  try {
    const { errors } = await captureConsole(async () => {
      const { restore } = loadWithMocks(path.join(ROOT, "bin/not-manage.js"), {
        "../src/cli": {
          run: async () => {
            throw new Error("Usage: not-manage activities get <id> [--fields ...] [--json]");
          },
        },
      });

      try {
        await new Promise((resolve) => setImmediate(resolve));
      } finally {
        restore();
      }
    });

    assert.deepStrictEqual(errors, [
      "Usage: not-manage activities get <id> [--fields ...] [--json]",
    ]);
    assert.equal(exitCode, 1);
  } finally {
    process.argv = originalArgv;
    process.exit = originalExit;
  }
});
