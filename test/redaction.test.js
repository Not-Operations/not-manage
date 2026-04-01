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

test("redactPayload extracts significant Company client name tokens for matter label redaction", () => {
  const payload = {
    matter: {
      display_number: "00341 - Smith - Contract",
      client: {
        name: "Smith & Associates LLC",
        type: "Company",
      },
    },
  };

  const output = redaction.__private.redactPayload(payload, "task");

  assert.equal(output.matter.display_number, "00341 - [REDACTED_NAME] - Contract");
});

test("redactPayload does not use short Company noise tokens for matter-label replacements", () => {
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

test("redactPayload expands coverage for body/detail/content fields in messaging-style resources", () => {
  const payload = {
    body: "Email John Smith before Dana Doyle reviews the filing.",
    detail: "John Smith called again.",
    content: "Client John Smith attached records.",
    author: {
      name: "Dana Doyle",
      email: "dana@example.com",
    },
    contact: {
      name: "John Smith",
      type: "Person",
    },
  };

  const output = redaction.__private.redactPayload(payload, "conversation-message");

  assert.equal(
    output.body,
    "Email [REDACTED_NAME] before Dana Doyle reviews the filing."
  );
  assert.equal(output.detail, "[REDACTED_NAME] called again.");
  assert.equal(output.content, "Client [REDACTED_NAME] attached records.");
  assert.deepStrictEqual(output.author, {
    name: "Dana Doyle",
    email: "dana@example.com",
  });
});

test("redactPayload applies surname-based label redaction to names, filenames, and summaries", () => {
  const payload = {
    name: "Smith follow-up",
    file_name: "Smith-medical-records.pdf",
    summary: "Smith hearing prep",
    matter: {
      client: {
        name: "Jane Smith",
        type: "Person",
      },
    },
  };

  const output = redaction.__private.redactPayload(payload, "document");

  assert.equal(output.name, "[REDACTED_NAME] follow-up");
  assert.equal(output.file_name, "[REDACTED_NAME]-medical-records.pdf");
  assert.equal(output.summary, "[REDACTED_NAME] hearing prep");
});

test("redactPayload treats display_value as a label-like field for custom fields", () => {
  const payload = {
    display_value: "Smith - VIP",
    matter: {
      client: {
        name: "Jane Smith",
        type: "Person",
      },
    },
  };

  const output = redaction.__private.redactPayload(payload, "custom-field");

  assert.equal(output.display_value, "[REDACTED_NAME] - VIP");
});

test("redactPayload redacts individual first and last names from free text", () => {
  const payload = {
    description: "Spoke with Jane about the case. Smith confirmed the details.",
    client: {
      first_name: "Jane",
      last_name: "Smith",
      primary_email_address: "jane@example.test",
    },
  };

  const output = redaction.__private.redactPayload(payload, "matter");

  assert.equal(
    output.description,
    "Spoke with [REDACTED_NAME] about the case. [REDACTED_NAME] confirmed the details."
  );
});

test("redactPayload redacts credit card numbers in free text", () => {
  const payload = {
    memo: "Card on file: 4111-1111-1111-1111 and Amex 3782 822463 10005.",
  };

  const output = redaction.__private.redactPayload(payload, "bill");

  assert.equal(
    output.memo,
    "Card on file: [REDACTED_CREDIT_CARD] and Amex [REDACTED_CREDIT_CARD]."
  );
});

test("redactPayload redacts space-separated SSNs", () => {
  const payload = {
    memo: "SSN on record: 123 45 6789.",
  };

  const output = redaction.__private.redactPayload(payload, "bill");

  assert.equal(output.memo, "SSN on record: [REDACTED_SSN].");
});

test("redactPayload does not collect single-character name parts as replacements", () => {
  const payload = {
    description: "Filed a motion today.",
    client: {
      first_name: "J",
      last_name: "Smith",
      primary_email_address: "j.smith@example.test",
    },
  };

  const output = redaction.__private.redactPayload(payload, "matter");

  assert.ok(
    !output.description.includes("J motion"),
    "Single-character first name should not cause spurious replacements"
  );
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
