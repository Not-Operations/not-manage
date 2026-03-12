const test = require("node:test");
const assert = require("node:assert/strict");

const activities = require("../src/commands-activities");
const billableClients = require("../src/commands-billable-clients");
const billableMatters = require("../src/commands-billable-matters");
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
    status: "overdue",
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
    status: "overdue",
    type: "Invoice",
    updated_since: "2026-03-05",
  });
});

test("buildBillQuery maps unpaid bill status to awaiting_payment state", () => {
  const query = bills.__private.buildBillQuery({
    limit: "25",
    status: "unpaid",
  });

  assert.deepStrictEqual(query, {
    fields:
      "id,number,state,type,issued_at,due_at,balance,total,client{id,name,first_name,last_name},matters{id,display_number,number,description}",
    limit: 25,
    state: "awaiting_payment",
  });
});

test("buildBillQuery rejects unsupported bill statuses", () => {
  assert.throws(
    () => bills.__private.buildBillQuery({ status: "open" }),
    /Use `all`, `overdue`, or `unpaid`/
  );
});

test("buildActivityQuery maps activity filters", () => {
  const query = activities.__private.buildActivityQuery({
    activityDescriptionId: "88",
    createdSince: "2026-03-01T00:00:00Z",
    endDate: "2026-03-09",
    flatRate: false,
    limit: "100",
    matterId: "15564573",
    onlyUnaccountedFor: true,
    order: "date(desc)",
    pageToken: "cursor-6",
    query: "CLI LIVE",
    startDate: "2026-03-01",
    status: "unbilled",
    taskId: "99",
    type: "TimeEntry",
    updatedSince: "2026-03-09T12:00:00Z",
    userId: "433452",
  });

  assert.deepStrictEqual(query, {
    activity_description_id: "88",
    created_since: "2026-03-01T00:00:00Z",
    end_date: "2026-03-09",
    fields:
      "id,type,date,quantity,quantity_in_hours,price,total,billed,on_bill,non_billable,note,matter{id,display_number,number,description},user{id,name,first_name,last_name}",
    flat_rate: false,
    limit: 100,
    matter_id: "15564573",
    only_unaccounted_for: true,
    order: "date(desc)",
    page_token: "cursor-6",
    query: "CLI LIVE",
    start_date: "2026-03-01",
    status: "unbilled",
    task_id: "99",
    type: "TimeEntry",
    updated_since: "2026-03-09T12:00:00Z",
    user_id: "433452",
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

test("buildPracticeAreaQuery maps supported practice area API filters", () => {
  const query = practiceAreas.__private.buildPracticeAreaQuery({
    code: "FAM",
    createdSince: "2026-01-01",
    limit: "10",
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
    name: "Family",
    order: "name(asc)",
    page_token: "cursor-5",
    updated_since: "2026-02-15",
  });
});

test("buildBillableMatterQuery maps billable matter filters", () => {
  const query = billableMatters.__private.buildBillableMatterQuery({
    clientId: "18638250",
    endDate: "2026-03-09",
    limit: "250",
    matterId: "15564573",
    originatingAttorneyId: "433452",
    pageToken: "cursor-7",
    query: "CLI",
    responsibleAttorneyId: "433452",
    startDate: "2026-03-01",
  });

  assert.deepStrictEqual(query, {
    client_id: "18638250",
    end_date: "2026-03-09",
    fields:
      "id,display_number,unbilled_hours,unbilled_amount,amount_in_trust,client{id,name,first_name,last_name}",
    limit: 250,
    matter_id: "15564573",
    originating_attorney_id: "433452",
    page_token: "cursor-7",
    query: "CLI",
    responsible_attorney_id: "433452",
    start_date: "2026-03-01",
  });
});

test("buildBillableClientQuery maps billable client filters", () => {
  const query = billableClients.__private.buildBillableClientQuery({
    clientId: "18638250",
    endDate: "2026-03-09",
    limit: "25",
    matterId: "15564573",
    originatingAttorneyId: "433452",
    pageToken: "cursor-8",
    query: "CLI",
    responsibleAttorneyId: "433452",
    startDate: "2026-03-01",
  });

  assert.deepStrictEqual(query, {
    client_id: "18638250",
    end_date: "2026-03-09",
    fields: "id,name,unbilled_hours,unbilled_amount,amount_in_trust,billable_matters_count",
    limit: 25,
    matter_id: "15564573",
    originating_attorney_id: "433452",
    page_token: "cursor-8",
    query: "CLI",
    responsible_attorney_id: "433452",
    start_date: "2026-03-01",
  });
});

test("query builders fail fast on invalid limits", () => {
  assert.throws(() => contacts.__private.buildContactQuery({ limit: "0" }), /--limit/);
  assert.throws(() => activities.__private.buildActivityQuery({ limit: "500" }), /--limit/);
  assert.throws(() => bills.__private.buildBillQuery({ limit: "500" }), /--limit/);
  assert.throws(() => users.__private.buildUserQuery({ limit: "2001" }), /--limit/);
  assert.throws(() => billableClients.__private.buildBillableClientQuery({ limit: "26" }), /--limit/);
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
    activities.__private.formatActivityRow({
      id: 7,
      type: "TimeEntry",
      date: "2026-03-09",
      quantity: 1800,
      total: "150",
      billed: false,
      matter: { display_number: "MAT-55" },
      note: "Research",
    }),
    {
      id: "7",
      type: "TimeEntry",
      date: "2026-03-09",
      hours: "0.50",
      total: "150.00",
      billed: "no",
      matter: "MAT-55",
      note: "Research",
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
    billableMatters.__private.formatBillableMatterRow({
      id: 8,
      display_number: "MAT-88",
      client: { name: "Acme LLC" },
      unbilled_hours: 1.25,
      unbilled_amount: 500,
      amount_in_trust: 200,
    }),
    {
      id: "8",
      matter: "MAT-88",
      client: "Acme LLC",
      hours: "1.25",
      amount: "500.00",
      trust: "200.00",
    }
  );

  assert.deepStrictEqual(
    billableClients.__private.formatBillableClientRow({
      id: 9,
      name: "Acme LLC",
      unbilled_hours: 2.5,
      unbilled_amount: 1000,
      amount_in_trust: 300,
      billable_matters_count: 2,
    }),
    {
      id: "9",
      name: "Acme LLC",
      hours: "2.50",
      amount: "1000.00",
      trust: "300.00",
      matters: "2",
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
