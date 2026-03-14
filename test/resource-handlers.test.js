const test = require("node:test");
const assert = require("node:assert/strict");

const { getResourceHandler } = require("../src/resource-handlers");
const { getResourceMetadata } = require("../src/resource-metadata");

test("generic read-only handlers are available for new resources", () => {
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
