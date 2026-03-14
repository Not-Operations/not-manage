const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildCliReferenceContent,
  updateReadmeContent,
  END_MARKER,
  START_MARKER,
} = require("../scripts/generate-readme-cli-reference");

test("generated CLI reference includes aliases, operations, and required filters", () => {
  const content = buildCliReferenceContent();

  assert.match(content, /\| `activities` \| `list`, `get` \| `activity` \| - \|/);
  assert.match(
    content,
    /\| `conversation-messages` \| `list`, `get` \| `conversation-message` \| `--conversation-id` \|/
  );
  assert.match(content, /\| `my-events` \| `list` \| `my-event` \| - \|/);
});

test("README updater only replaces the generated CLI reference block", () => {
  const original = [
    "# Example",
    "",
    START_MARKER,
    "old content",
    END_MARKER,
    "",
    "tail",
  ].join("\n");

  const updated = updateReadmeContent(original);

  assert.match(updated, /This table is generated from resource metadata/);
  assert.match(updated, /tail$/);
  assert.doesNotMatch(updated, /old content/);
});
