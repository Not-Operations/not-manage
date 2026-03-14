const test = require("node:test");
const assert = require("node:assert/strict");

const {
  parseOptions,
  readBooleanOption,
  readCommandOptions,
  readIsoDateArrayOption,
  readIsoDateOption,
  readObjectOption,
  readIsoDateTimeOption,
  readOption,
  readOptionValues,
  readStringOption,
  readStringArrayOption,
} = require("../src/cli-options");

test("readOption accepts both kebab-case and snake_case flag names", () => {
  const { parsed } = parseOptions([
    "--client-id",
    "101",
    "--page_token",
    "cursor-1",
  ]);

  assert.equal(readOption(parsed, "client-id"), "101");
  assert.equal(readOption(parsed, "client_id"), "101");
  assert.equal(readOption(parsed, "page-token"), "cursor-1");
  assert.equal(readOption(parsed, "page_token"), "cursor-1");
});

test("readBooleanOption preserves explicit false values", () => {
  const { parsed } = parseOptions([
    "--enabled",
    "false",
    "--include-co-counsel",
  ]);

  assert.equal(readBooleanOption(parsed, "enabled"), false);
  assert.equal(readBooleanOption(parsed, "include_co_counsel"), true);
});

test("parseOptions preserves repeated option values and scalar readers keep the last value", () => {
  const { parsed } = parseOptions([
    "--status",
    "pending",
    "--status",
    "in_progress",
  ]);

  assert.deepStrictEqual(readOptionValues(parsed, "status"), ["pending", "in_progress"]);
  assert.deepStrictEqual(readOption(parsed, "status"), ["pending", "in_progress"]);
  assert.equal(readStringOption(parsed, "status"), "in_progress");
});

test("date readers validate ISO date and datetime inputs", () => {
  const { parsed } = parseOptions([
    "--start-date",
    "2026-03-13",
    "--updated-since",
    "2026-03-13T17:45:00Z",
  ]);

  assert.equal(readIsoDateOption(parsed, "start-date"), "2026-03-13");
  assert.equal(
    readIsoDateTimeOption(parsed, "updated_since"),
    "2026-03-13T17:45:00Z"
  );

  assert.throws(
    () => readIsoDateOption({ "start-date": "03/13/2026" }, "start-date"),
    /ISO date/
  );
  assert.throws(
    () => readIsoDateTimeOption({ updated_since: "2026-03-13 17:45:00" }, "updated-since"),
    /ISO datetime/
  );
});

test("array readers split comma-separated and repeated values", () => {
  const { parsed } = parseOptions([
    "--ids",
    "1,2",
    "--ids",
    "3",
    "--open-date",
    "2026-03-01,2026-03-02",
  ]);

  assert.deepStrictEqual(readStringArrayOption(parsed, "ids"), ["1", "2", "3"]);
  assert.deepStrictEqual(readIsoDateArrayOption(parsed, "open-date"), [
    "2026-03-01",
    "2026-03-02",
  ]);
});

test("readObjectOption parses repeated key/value pairs and JSON objects", () => {
  const { parsed } = parseOptions([
    "--custom-field-values",
    "1001=Acme LLC",
    "--custom-field-values",
    "2002=[>=45, <=50]",
    "--custom-field-values",
    '{"3003":"Open","4004":["A","B"]}',
  ]);

  assert.deepStrictEqual(readObjectOption(parsed, "custom-field-values"), {
    1001: "Acme LLC",
    2002: [">=45", "<=50"],
    3003: "Open",
    4004: ["A", "B"],
  });
});

test("readCommandOptions applies schema coercion, positional ids, and fixed overrides", () => {
  const { parsed, positional } = parseOptions([
    "123",
    "--complete",
    "false",
    "--due_at_from",
    "2026-03-01",
  ]);

  const options = readCommandOptions(
    parsed,
    {
      complete: { kind: "boolean", option: "complete" },
      dueAtFrom: { kind: "iso-date", option: "due-at-from" },
      id: { positional: 0 },
      type: { kind: "string", option: "type" },
    },
    positional,
    { json: true },
    { type: "TimeEntry" }
  );

  assert.deepStrictEqual(options, {
    complete: false,
    dueAtFrom: "2026-03-01",
    id: "123",
    json: true,
    type: "TimeEntry",
  });
});

test("readCommandOptions supports array and object schema kinds", () => {
  const { parsed } = parseOptions([
    "--ids",
    "10,11",
    "--ids",
    "12",
    "--custom-field-values",
    "1001=Acme LLC",
    "--custom-field-values",
    "2002=[>=45, <=50]",
  ]);

  const options = readCommandOptions(parsed, {
    customFieldValues: { kind: "object", option: "custom-field-values" },
    ids: { kind: "string-array", option: "ids" },
  });

  assert.deepStrictEqual(options, {
    customFieldValues: {
      1001: "Acme LLC",
      2002: [">=45", "<=50"],
    },
    ids: ["10", "11", "12"],
  });
});

test("readStringOption rejects bare value-less flags for required string options", () => {
  assert.throws(
    () => readStringOption({ query: true }, "query"),
    /requires a value/
  );
});
