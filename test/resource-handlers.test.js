const test = require("node:test");
const assert = require("node:assert/strict");

const { getResourceHandler } = require("../src/resource-handlers");
const {
  getResourceMetadata,
  listRequiredOptionFlags,
} = require("../src/resource-metadata");

test("generic read-only handlers are available for new resources", () => {
  assert.equal(typeof getResourceHandler(getResourceMetadata("bills"), "list"), "function");
  assert.equal(typeof getResourceHandler(getResourceMetadata("bills"), "get"), "function");
  assert.equal(
    typeof getResourceHandler(getResourceMetadata("billable-clients"), "list"),
    "function"
  );
  assert.equal(
    typeof getResourceHandler(getResourceMetadata("billable-matters"), "list"),
    "function"
  );
  assert.equal(typeof getResourceHandler(getResourceMetadata("contacts"), "list"), "function");
  assert.equal(typeof getResourceHandler(getResourceMetadata("contacts"), "get"), "function");
  assert.equal(typeof getResourceHandler(getResourceMetadata("matters"), "list"), "function");
  assert.equal(typeof getResourceHandler(getResourceMetadata("matters"), "get"), "function");
  assert.equal(typeof getResourceHandler(getResourceMetadata("tasks"), "list"), "function");
  assert.equal(typeof getResourceHandler(getResourceMetadata("tasks"), "get"), "function");
  assert.equal(typeof getResourceHandler(getResourceMetadata("users"), "list"), "function");
  assert.equal(typeof getResourceHandler(getResourceMetadata("users"), "get"), "function");
  assert.equal(
    typeof getResourceHandler(getResourceMetadata("calendar-entries"), "list"),
    "function"
  );
  assert.equal(
    typeof getResourceHandler(getResourceMetadata("calendar-entries"), "get"),
    "function"
  );
  assert.equal(
    typeof getResourceHandler(getResourceMetadata("conversation-messages"), "list"),
    "function"
  );
  assert.equal(
    typeof getResourceHandler(getResourceMetadata("conversation-messages"), "get"),
    "function"
  );
  assert.equal(
    typeof getResourceHandler(getResourceMetadata("outstanding-client-balances"), "list"),
    "function"
  );
  assert.equal(
    getResourceHandler(getResourceMetadata("outstanding-client-balances"), "get"),
    null
  );
  assert.equal(
    typeof getResourceHandler(getResourceMetadata("my-events"), "list"),
    "function"
  );
  assert.equal(getResourceHandler(getResourceMetadata("my-events"), "get"), null);
});

test("resource capabilities expose required list filters as CLI flags", () => {
  assert.deepStrictEqual(
    listRequiredOptionFlags(getResourceMetadata("conversation-messages"), "list"),
    ["--conversation-id"]
  );
  assert.deepStrictEqual(listRequiredOptionFlags(getResourceMetadata("notes"), "list"), [
    "--type",
  ]);
  assert.deepStrictEqual(listRequiredOptionFlags(getResourceMetadata("users"), "list"), []);
});
