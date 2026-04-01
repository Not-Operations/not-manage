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

test("parseTrustedApiUrl only allows expected https Clio API URLs", () => {
  const config = { host: "app.clio.com" };

  const trusted = __private.parseTrustedApiUrl(
    config,
    "https://app.clio.com/api/v4/contacts.json?page=2"
  );
  assert.equal(trusted, "https://app.clio.com/api/v4/contacts.json?page=2");

  assert.throws(
    () => __private.parseTrustedApiUrl(config, "http://app.clio.com/api/v4/contacts.json"),
    /Refusing to call a non-HTTPS URL/
  );

  assert.throws(
    () => __private.parseTrustedApiUrl(config, "https://evil.example/api/v4/contacts.json"),
    /unexpected host/
  );

  assert.throws(
    () => __private.parseTrustedApiUrl(config, "https://app.clio.com/oauth/token"),
    /unexpected Clio API path/
  );
});

test("sanitizeUrlForError strips query parameters from URLs", () => {
  assert.equal(
    __private.sanitizeUrlForError("https://app.clio.com/api/v4/contacts.json?fields=name,email&query=Smith"),
    "https://app.clio.com/api/v4/contacts.json?[query redacted]"
  );

  assert.equal(
    __private.sanitizeUrlForError("https://app.clio.com/api/v4/contacts.json"),
    "https://app.clio.com/api/v4/contacts.json"
  );

  assert.equal(
    __private.sanitizeUrlForError("not a url"),
    "[invalid URL]"
  );
});
