const test = require("node:test");
const assert = require("node:assert/strict");

const contacts = require("../src/commands-contacts");
const bills = require("../src/commands-bills");
const matters = require("../src/commands-matters");
const users = require("../src/commands-users");
const practiceAreas = require("../src/commands-practice-areas");

test("buildContactQuery maps list filters and strips empty values", () => {
  const query = contacts.__private.buildContactQuery({
    clientOnly: true,
    clioConnectOnly: true,
    createdSince: "2026-01-01",
    emailOnly: true,
    initial: "A",
    limit: "25",
    order: "name(asc)",
    pageToken: "cursor-1",
    query: "Acme",
    type: "Person",
    updatedSince: "2026-02-01",
  });

  assert.deepStrictEqual(query, {
    client_only: true,
    clio_connect_only: true,
    created_since: "2026-01-01",
    email_only: true,
    fields:
      "id,name,first_name,last_name,type,is_client,primary_email_address,primary_phone_number",
    initial: "A",
    limit: 25,
    order: "name(asc)",
    page_token: "cursor-1",
    query: "Acme",
    type: "Person",
    updated_since: "2026-02-01",
  });
});

test("buildBillQuery maps bill filters", () => {
  const query = bills.__private.buildBillQuery({
    clientId: "12",
    createdSince: "2026-01-01",
    dueAfter: "2026-03-01",
    dueBefore: "2026-03-31",
    issuedAfter: "2026-02-01",
    issuedBefore: "2026-02-28",
    limit: "100",
    matterId: "45",
    order: "issued_at(desc)",
    overdueOnly: true,
    pageToken: "cursor-2",
    query: "Invoice",
    state: "awaiting_payment",
    status: "open",
    type: "Invoice",
    updatedSince: "2026-03-05",
  });

  assert.deepStrictEqual(query, {
    client_id: "12",
    created_since: "2026-01-01",
    due_after: "2026-03-01",
    due_before: "2026-03-31",
    fields:
      "id,number,state,type,issued_at,due_at,balance,total,client{id,name,first_name,last_name},matters{id,display_number,number,description}",
    issued_after: "2026-02-01",
    issued_before: "2026-02-28",
    limit: 100,
    matter_id: "45",
    order: "issued_at(desc)",
    overdue_only: true,
    page_token: "cursor-2",
    query: "Invoice",
    state: "awaiting_payment",
    status: "open",
    type: "Invoice",
    updated_since: "2026-03-05",
  });
});

test("buildMatterQuery maps expanded matter filters", () => {
  const query = matters.__private.buildMatterQuery({
    clientId: "9",
    createdSince: "2026-01-10",
    limit: "50",
    order: "display_number(asc)",
    originatingAttorneyId: "11",
    pageToken: "cursor-3",
    practiceAreaId: "22",
    query: "Estate",
    responsibleAttorneyId: "33",
    responsibleStaffId: "44",
    status: "open",
    updatedSince: "2026-03-01",
  });

  assert.deepStrictEqual(query, {
    client_id: "9",
    created_since: "2026-01-10",
    fields:
      "id,display_number,description,status,open_date,close_date,client{id,name,first_name,last_name}",
    limit: 50,
    order: "display_number(asc)",
    originating_attorney_id: "11",
    page_token: "cursor-3",
    practice_area_id: "22",
    query: "Estate",
    responsible_attorney_id: "33",
    responsible_staff_id: "44",
    status: "open",
    updated_since: "2026-03-01",
  });
});

test("buildUserQuery serializes booleans explicitly", () => {
  const query = users.__private.buildUserQuery({
    createdSince: "2026-01-01",
    enabled: false,
    includeCoCounsel: true,
    limit: "2000",
    name: "Casey",
    order: "name(asc)",
    pageToken: "cursor-4",
    pendingSetup: false,
    role: "Attorney",
    subscriptionType: "full",
    updatedSince: "2026-02-01",
  });

  assert.deepStrictEqual(query, {
    created_since: "2026-01-01",
    enabled: false,
    fields: "id,name,first_name,last_name,email,enabled,roles,subscription_type",
    include_co_counsel: true,
    limit: 2000,
    name: "Casey",
    order: "name(asc)",
    page_token: "cursor-4",
    pending_setup: false,
    role: "Attorney",
    subscription_type: "full",
    updated_since: "2026-02-01",
  });
});

test("buildPracticeAreaQuery maps practice area filters", () => {
  const query = practiceAreas.__private.buildPracticeAreaQuery({
    code: "FAM",
    createdSince: "2026-01-01",
    limit: "10",
    matterId: "71",
    name: "Family",
    order: "name(asc)",
    pageToken: "cursor-5",
    updatedSince: "2026-02-15",
  });

  assert.deepStrictEqual(query, {
    code: "FAM",
    created_since: "2026-01-01",
    fields: "id,code,name,category",
    limit: 10,
    matter_id: "71",
    name: "Family",
    order: "name(asc)",
    page_token: "cursor-5",
    updated_since: "2026-02-15",
  });
});

test("query builders fail fast on invalid limits", () => {
  assert.throws(() => contacts.__private.buildContactQuery({ limit: "0" }), /--limit/);
  assert.throws(() => bills.__private.buildBillQuery({ limit: "500" }), /--limit/);
  assert.throws(() => users.__private.buildUserQuery({ limit: "2001" }), /--limit/);
});

test("row formatters normalize common Clio response shapes", () => {
  assert.deepStrictEqual(
    contacts.__private.formatContactRow({
      id: 1,
      first_name: "Alex",
      last_name: "Avery",
      type: "Person",
      is_client: false,
      primary_email_address: "alex@example.com",
      primary_phone_number: "555-0101",
    }),
    {
      id: "1",
      name: "Alex Avery",
      type: "Person",
      client: "no",
      email: "alex@example.com",
      phone: "555-0101",
    }
  );

  assert.deepStrictEqual(
    bills.__private.formatBillRow({
      id: 2,
      number: "B-100",
      state: "open",
      client: { first_name: "Sam", last_name: "Smith" },
      due_at: "2026-03-12",
      balance: "125.5",
    }),
    {
      id: "2",
      number: "B-100",
      state: "open",
      client: "Sam Smith",
      dueAt: "2026-03-12",
      balance: "125.50",
    }
  );

  assert.deepStrictEqual(
    matters.__private.formatMatterRow({
      id: 3,
      display_number: "MAT-3",
      status: { name: "Open" },
      clients: [{ name: "Acme Corp" }],
      description: "Trust review",
    }),
    {
      id: "3",
      displayNumber: "MAT-3",
      status: "Open",
      client: "Acme Corp",
      description: "Trust review",
    }
  );

  assert.deepStrictEqual(
    users.__private.formatUserRow({
      id: 4,
      first_name: "Dana",
      last_name: "Doyle",
      email: "dana@example.com",
      enabled: true,
      roles: ["Admin", "Attorney"],
    }),
    {
      id: "4",
      name: "Dana Doyle",
      email: "dana@example.com",
      enabled: "yes",
      roles: "Admin, Attorney",
    }
  );

  assert.deepStrictEqual(
    practiceAreas.__private.formatPracticeAreaRow({
      id: 5,
      code: "EST",
      name: "Estate Planning",
      category: "Transactional",
    }),
    {
      id: "5",
      code: "EST",
      name: "Estate Planning",
      category: "Transactional",
    }
  );
});
