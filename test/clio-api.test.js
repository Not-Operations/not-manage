const test = require("node:test");
const assert = require("node:assert/strict");

const { __private } = require("../src/clio-api");

test("buildUrlWithQuery serializes repeated array filters and nested object filters", () => {
  const url = new URL(
    __private.buildUrlWithQuery("https://app.clio.com/api/v4/matters.json", {
      "ids[]": ["10", "11"],
      custom_field_values: {
        1001: "Acme LLC",
        2002: [">=45", "<=50"],
      },
      fields: "id,description",
    })
  );

  assert.equal(url.origin, "https://app.clio.com");
  assert.equal(url.pathname, "/api/v4/matters.json");
  assert.deepStrictEqual(url.searchParams.getAll("ids[]"), ["10", "11"]);
  assert.equal(url.searchParams.get("custom_field_values[1001]"), "Acme LLC");
  assert.equal(url.searchParams.get("custom_field_values[2002]"), "[>=45, <=50]");
  assert.equal(url.searchParams.get("fields"), "id,description");
});
