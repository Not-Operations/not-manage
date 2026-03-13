const test = require("node:test");
const assert = require("node:assert/strict");

const redaction = require("../src/redaction");

test("redactPayload redacts structured contact PII and preserves non-PII fields", () => {
  const payload = {
    id: 101,
    name: "Acme LLC",
    primary_email_address: "billing@acme.test",
    primary_phone_number: "555-0101",
    title: "CEO",
  };

  const output = redaction.__private.redactPayload(payload, "contact");

  assert.deepStrictEqual(output, {
    id: 101,
    name: "[REDACTED_NAME]",
    primary_email_address: "[REDACTED_EMAIL]",
    primary_phone_number: "[REDACTED_PHONE]",
    title: "CEO",
  });
});

test("redactPayload redacts client PII inside free text and keeps staff identity visible", () => {
  const payload = {
    description:
      "Call Acme LLC at billing@acme.test or 415-555-1212. Dana Doyle approved it.",
    client: {
      name: "Acme LLC",
      primary_email_address: "billing@acme.test",
      primary_phone_number: "415-555-1212",
    },
    responsible_attorney: {
      name: "Dana Doyle",
      email: "dana@example.com",
    },
  };

  const output = redaction.__private.redactPayload(payload, "matter");

  assert.equal(
    output.description,
    "Call [REDACTED_NAME] at [REDACTED_EMAIL] or [REDACTED_PHONE]. Dana Doyle approved it."
  );
  assert.deepStrictEqual(output.client, {
    name: "[REDACTED_NAME]",
    primary_email_address: "[REDACTED_EMAIL]",
    primary_phone_number: "[REDACTED_PHONE]",
  });
  assert.deepStrictEqual(output.responsible_attorney, {
    name: "Dana Doyle",
    email: "dana@example.com",
  });
});

test("redactPayload redacts high-confidence PII patterns in narrative fields", () => {
  const payload = {
    memo: "Tax id 12-3456789 and SSN 123-45-6789 belong in the secure system.",
  };

  const output = redaction.__private.redactPayload(payload, "bill");

  assert.equal(
    output.memo,
    "Tax id [REDACTED_TAX_ID] and SSN [REDACTED_SSN] belong in the secure system."
  );
});

test("redactPayload redacts bare names in free text and label fields while preserving staff names", () => {
  const payload = {
    note: "Call John Smith and Dana Doyle about the Personal Injury matter.",
    matter: {
      display_number: "00341 - John Smith - PI",
      description: "Personal Injury",
    },
    user: {
      name: "Dana Doyle",
      email: "dana@example.com",
    },
  };

  const output = redaction.__private.redactPayload(payload, "activity");

  assert.equal(
    output.note,
    "Call [REDACTED_NAME] and Dana Doyle about the Personal Injury matter."
  );
  assert.equal(output.matter.display_number, "00341 - [REDACTED_NAME] - PI");
  assert.equal(output.matter.description, "Personal Injury");
  assert.deepStrictEqual(output.user, {
    name: "Dana Doyle",
    email: "dana@example.com",
  });
});

test("redactPayload uses person client surnames to redact task matter labels", () => {
  const payload = {
    name: "Follow up with Jane Smith",
    matter: {
      display_number: "00341 - Smith - PI",
      description: "Smith intake review",
      client: {
        name: "Jane Smith",
        type: "Person",
      },
    },
    assignee: {
      name: "Dana Doyle",
      email: "dana@example.com",
    },
  };

  const output = redaction.__private.redactPayload(payload, "task");

  assert.equal(output.name, "Follow up with [REDACTED_NAME]");
  assert.equal(output.matter.display_number, "00341 - [REDACTED_NAME] - PI");
  assert.equal(output.matter.description, "Smith intake review");
  assert.deepStrictEqual(output.assignee, {
    name: "Dana Doyle",
    email: "dana@example.com",
  });
});

test("redactPayload does not split company client names into matter-label replacements", () => {
  const payload = {
    matter: {
      display_number: "00341 - LLC - Contract",
      client: {
        name: "Acme LLC",
        type: "Company",
      },
    },
  };

  const output = redaction.__private.redactPayload(payload, "task");

  assert.equal(output.matter.display_number, "00341 - LLC - Contract");
});

test("maybeRedactPayload only transforms the data envelope", () => {
  const payload = {
    data: {
      name: "Acme LLC",
    },
    meta: {
      paging: {
        next: "https://next-page.test",
      },
    },
  };

  const output = redaction.maybeRedactPayload(payload, { redacted: true }, "billable-client");

  assert.deepStrictEqual(output, {
    data: {
      name: "[REDACTED_NAME]",
    },
    meta: {
      paging: {
        next: "https://next-page.test",
      },
    },
  });
});
