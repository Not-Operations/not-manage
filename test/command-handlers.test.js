const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildPage,
  captureConsole,
  loadWithMocks,
} = require("./helpers/module-test-utils");

const ROOT = path.resolve(__dirname, "..");
const BASE_CONFIG = { host: "app.clio.com" };
const BASE_TOKEN_SET = { accessToken: "stored-token", source: "keychain" };

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function loadCommandModule(spec, overrides = {}) {
  const apiMock = {
    getValidAccessToken: async () => "fresh-token",
    [spec.fetchPageExport]: async () => buildPage([]),
    [spec.fetchItemExport]: async () => ({ data: {} }),
    ...overrides,
  };

  const { module, restore } = loadWithMocks(path.join(ROOT, spec.moduleFile), {
    "./clio-api": apiMock,
    "./store": {
      getConfig: async () => BASE_CONFIG,
      getTokenSet: async () => BASE_TOKEN_SET,
    },
  });

  return { apiMock, module, restore };
}

const specs = [
  {
    name: "activities",
    moduleFile: "src/commands-activities.js",
    listExport: "activitiesList",
    getExport: "activitiesGet",
    fetchPageExport: "fetchActivitiesPage",
    fetchItemExport: "fetchActivity",
    emptyMessage: "No activities found for the selected filters.",
    usageMessage: "Usage: clio-manage activities get <id> [--fields ...] [--json]",
    listOptions: { status: "unbilled", limit: "5" },
    getId: "11",
    sample: {
      id: 11,
      type: "TimeEntry",
      date: "2026-03-09",
      quantity_in_hours: 1.5,
      price: "200",
      total: "300",
      billed: false,
      on_bill: false,
      non_billable: false,
      no_charge: false,
      flat_rate: false,
      contingency_fee: false,
      note: "Draft motion",
      created_at: "2026-03-09T10:00:00Z",
      updated_at: "2026-03-09T10:30:00Z",
      matter: { display_number: "MAT-11" },
      user: { first_name: "Dana", last_name: "Doyle" },
      activity_description: { name: "Research" },
      bill: { number: "INV-11", state: "draft" },
    },
    listFragments: ["TimeEntry", "2026-03-09", "1.50", "300.00", "Draft motion"],
    detailFragments: [
      "Type                 : TimeEntry",
      "Hours                : 1.50",
      "Matter               : MAT-11",
      "Activity Description : Research",
    ],
  },
  {
    name: "contacts",
    moduleFile: "src/commands-contacts.js",
    listExport: "contactsList",
    getExport: "contactsGet",
    fetchPageExport: "fetchContactsPage",
    fetchItemExport: "fetchContact",
    emptyMessage: "No contacts found for the selected filters.",
    usageMessage: "Usage: clio-manage contacts get <id> [--fields ...] [--json]",
    listOptions: { clientOnly: true, limit: "5" },
    getId: "101",
    sample: {
      id: 101,
      name: "Acme LLC",
      type: "Company",
      is_client: true,
      primary_email_address: "billing@acme.test",
      secondary_email_address: "ops@acme.test",
      primary_phone_number: "555-0101",
      secondary_phone_number: "555-0102",
      clio_connect_email: "portal@acme.test",
      title: "CEO",
      prefix: "Ms.",
      created_at: "2026-03-01",
      updated_at: "2026-03-02",
    },
    listFragments: ["Acme LLC", "Company", "yes", "billing@acme.test"],
    detailFragments: [
      "ID                 : 101",
      "Name               : Acme LLC",
      "Clio Connect Email : portal@acme.test",
    ],
  },
  {
    name: "tasks",
    moduleFile: "src/commands-tasks.js",
    listExport: "tasksList",
    getExport: "tasksGet",
    fetchPageExport: "fetchTasksPage",
    fetchItemExport: "fetchTask",
    emptyMessage: "No tasks found for the selected filters.",
    usageMessage: "Usage: clio-manage tasks get <id> [--fields ...] [--json]",
    listOptions: { matterId: "303", limit: "5" },
    getId: "606",
    sample: {
      id: 606,
      name: "Serve complaint",
      description: "Prepare service packet",
      status: "pending",
      priority: "high",
      due_at: "2026-03-20",
      created_at: "2026-03-10",
      updated_at: "2026-03-12",
      matter: { display_number: "MAT-606" },
      assignee: { name: "Dana Doyle" },
      assigner: { name: "Riley Staff" },
      task_type: { name: "Follow-up" },
    },
    listFragments: ["pending", "2026-03-20", "MAT-606", "Serve complaint"],
    detailFragments: [
      "Name        : Serve complaint",
      "Matter      : MAT-606",
      "Assignee    : Dana Doyle",
      "Task Type   : Follow-up",
    ],
  },
  {
    name: "bills",
    moduleFile: "src/commands-bills.js",
    listExport: "billsList",
    getExport: "billsGet",
    fetchPageExport: "fetchBillsPage",
    fetchItemExport: "fetchBill",
    emptyMessage: "No bills found for the selected filters.",
    usageMessage: "Usage: clio-manage bills get <id> [--fields ...] [--json]",
    listOptions: { overdueOnly: true, limit: "5" },
    getId: "202",
    sample: {
      id: 202,
      number: "INV-202",
      state: "open",
      type: "Invoice",
      kind: "Invoice",
      subject: "March services",
      memo: "Due on receipt",
      issued_at: "2026-03-01",
      due_at: "2026-03-15",
      paid: "0",
      paid_at: null,
      pending: "0",
      due: "250",
      total: "250",
      balance: "250",
      created_at: "2026-03-01",
      updated_at: "2026-03-02",
      client: { name: "Acme LLC" },
      matters: [{ display_number: "MAT-12", description: "Acquisition" }],
    },
    listFragments: ["INV-202", "open", "Acme LLC", "250.00"],
    detailFragments: [
      "Number     : INV-202",
      "Client     : Acme LLC",
      "Matter     : MAT-12",
      "Balance    : 250.00",
    ],
  },
  {
    name: "matters",
    moduleFile: "src/commands-matters.js",
    listExport: "mattersList",
    getExport: "mattersGet",
    fetchPageExport: "fetchMattersPage",
    fetchItemExport: "fetchMatter",
    emptyMessage: "No matters found for the selected filters.",
    usageMessage: "Usage: clio-manage matters get <id> [--fields ...] [--json]",
    listOptions: { practiceAreaId: "77", limit: "5" },
    getId: "303",
    sample: {
      id: 303,
      display_number: "MAT-303",
      number: "303",
      description: "Trust review",
      status: { name: "Open" },
      billable: true,
      open_date: "2026-02-01",
      pending_date: "2026-02-10",
      close_date: null,
      created_at: "2026-02-01",
      updated_at: "2026-03-01",
      clients: [{ name: "Acme LLC" }],
      practice_area: { id: 77, name: "Family Law" },
      responsible_attorney: {
        id: 1,
        first_name: "Dana",
        last_name: "Doyle",
        email: "dana@example.com",
      },
      responsible_staff: { id: 2, name: "Riley Staff" },
      originating_attorney: { id: 3, name: "Morgan Origin" },
    },
    listFragments: ["MAT-303", "Open", "Acme LLC", "Trust review"],
    detailFragments: [
      "Matter               : MAT-303",
      "Practice Area        : Family Law",
      "Responsible Attorney : Dana Doyle",
      "Billable             : yes",
    ],
  },
  {
    name: "users",
    moduleFile: "src/commands-users.js",
    listExport: "usersList",
    getExport: "usersGet",
    fetchPageExport: "fetchUsersPage",
    fetchItemExport: "fetchUser",
    emptyMessage: "No users found for the selected filters.",
    usageMessage: "Usage: clio-manage users get <id> [--fields ...] [--json]",
    listOptions: { enabled: false, pendingSetup: false, limit: "5" },
    getId: "404",
    sample: {
      id: 404,
      first_name: "Dana",
      last_name: "Doyle",
      email: "dana@example.com",
      enabled: false,
      roles: ["Attorney", "Admin"],
      subscription_type: "full",
      phone_number: "555-0103",
      time_zone: "America/Los_Angeles",
      rate: "400",
      account_owner: false,
      clio_connect: true,
      court_rules_default_attendee: false,
      created_at: "2026-02-01",
      updated_at: "2026-03-02",
    },
    listFragments: ["Dana Doyle", "dana@example.com", "no", "Attorney, Admin"],
    detailFragments: [
      "Name                         : Dana Doyle",
      "Enabled                      : no",
      "Clio Connect                 : yes",
      "Court Rules Default Attendee : no",
    ],
  },
  {
    name: "practice areas",
    moduleFile: "src/commands-practice-areas.js",
    listExport: "practiceAreasList",
    getExport: "practiceAreasGet",
    fetchPageExport: "fetchPracticeAreasPage",
    fetchItemExport: "fetchPracticeArea",
    emptyMessage: "No practice areas found for the selected filters.",
    usageMessage: "Usage: clio-manage practice-areas get <id> [--fields ...] [--json]",
    listOptions: { name: "Family", limit: "5" },
    getId: "505",
    sample: {
      id: 505,
      code: "FAM",
      name: "Family Law",
      category: "Litigation",
      created_at: "2026-01-15",
      updated_at: "2026-02-15",
    },
    listFragments: ["FAM", "Family Law", "Litigation"],
    detailFragments: [
      "Code     : FAM",
      "Name     : Family Law",
      "Category : Litigation",
    ],
  },
];

for (const spec of specs) {
  test(`${spec.name} list prints an empty state and summary`, async () => {
    const { module, restore } = loadCommandModule(spec, {
      [spec.fetchPageExport]: async () => buildPage([]),
    });

    try {
      const { logs } = await captureConsole(() => module[spec.listExport](spec.listOptions));
      assert.ok(logs.includes(spec.emptyMessage));
      assert.ok(logs.some((line) => line.includes("Returned 0")));
    } finally {
      restore();
    }
  });

  test(`${spec.name} list prints formatted table output`, async () => {
    const { module, restore } = loadCommandModule(spec, {
      [spec.fetchPageExport]: async () => buildPage([spec.sample]),
    });

    try {
      const { logs } = await captureConsole(() => module[spec.listExport](spec.listOptions));
      const output = logs.join("\n");
      spec.listFragments.forEach((fragment) => {
        assert.match(output, new RegExp(escapeRegExp(fragment)));
      });
    } finally {
      restore();
    }
  });

  test(`${spec.name} list supports first-page JSON output`, async () => {
    const payload = buildPage([spec.sample], "https://next-page.test");
    const { module, restore } = loadCommandModule(spec, {
      [spec.fetchPageExport]: async () => payload,
    });

    try {
      const { logs } = await captureConsole(() =>
        module[spec.listExport]({ ...spec.listOptions, json: true })
      );
      assert.deepStrictEqual(JSON.parse(logs.join("\n")), payload);
    } finally {
      restore();
    }
  });

  test(`${spec.name} list aggregates pagination when --all is set`, async () => {
    const calls = [];
    const pageOne = buildPage([spec.sample], "https://next-page.test");
    const pageTwo = buildPage([{ ...spec.sample, id: `${spec.getId}-2` }]);
    const { module, restore } = loadCommandModule(spec, {
      [spec.fetchPageExport]: async (config, accessToken, query, nextPageUrl) => {
        calls.push({ accessToken, config, nextPageUrl, query });
        return nextPageUrl ? pageTwo : pageOne;
      },
    });

    try {
      const { logs } = await captureConsole(() =>
        module[spec.listExport]({ ...spec.listOptions, all: true, json: true })
      );
      assert.deepStrictEqual(calls, [
        {
          accessToken: "fresh-token",
          config: BASE_CONFIG,
          nextPageUrl: undefined,
          query: calls[0].query,
        },
        {
          accessToken: "fresh-token",
          config: BASE_CONFIG,
          nextPageUrl: "https://next-page.test",
          query: {},
        },
      ]);

      const output = JSON.parse(logs.join("\n"));
      assert.equal(output.meta.pages_fetched, 2);
      assert.equal(output.meta.returned_count, 2);
      assert.equal(output.data.length, 2);
    } finally {
      restore();
    }
  });

  test(`${spec.name} get rejects missing ids`, async () => {
    const { module, restore } = loadCommandModule(spec);

    try {
      await assert.rejects(
        () => module[spec.getExport]({}),
        new RegExp(escapeRegExp(spec.usageMessage))
      );
    } finally {
      restore();
    }
  });

  test(`${spec.name} get prints detail output`, async () => {
    const { module, restore } = loadCommandModule(spec, {
      [spec.fetchItemExport]: async () => ({ data: spec.sample }),
    });

    try {
      const { logs } = await captureConsole(() =>
        module[spec.getExport]({ id: spec.getId })
      );
      const output = logs.join("\n");
      spec.detailFragments.forEach((fragment) => {
        assert.match(output, new RegExp(escapeRegExp(fragment)));
      });
    } finally {
      restore();
    }
  });

  test(`${spec.name} get supports JSON output`, async () => {
    const payload = { data: spec.sample };
    const { module, restore } = loadCommandModule(spec, {
      [spec.fetchItemExport]: async () => payload,
    });

    try {
      const { logs } = await captureConsole(() =>
        module[spec.getExport]({ id: spec.getId, json: true })
      );
      assert.deepStrictEqual(JSON.parse(logs.join("\n")), payload);
    } finally {
      restore();
    }
  });

  test(`${spec.name} list propagates auth failures`, async () => {
    const { module, restore } = loadCommandModule(spec, {
      getValidAccessToken: async () => {
        throw new Error("You are not logged in. Run `clio-manage auth login`.");
      },
    });

    try {
      await assert.rejects(
        () => module[spec.listExport](spec.listOptions),
        /You are not logged in/
      );
    } finally {
      restore();
    }
  });

  test(`${spec.name} list propagates permission failures`, async () => {
    const { module, restore } = loadCommandModule(spec, {
      [spec.fetchPageExport]: async () => {
        throw new Error("HTTP 403 from https://app.clio.com/api/v4/resource.json");
      },
    });

    try {
      await assert.rejects(() => module[spec.listExport](spec.listOptions), /HTTP 403/);
    } finally {
      restore();
    }
  });

  test(`${spec.name} list propagates rate-limit failures`, async () => {
    const { module, restore } = loadCommandModule(spec, {
      [spec.fetchPageExport]: async () => {
        throw new Error("HTTP 429 from https://app.clio.com/api/v4/resource.json");
      },
    });

    try {
      await assert.rejects(() => module[spec.listExport](spec.listOptions), /HTTP 429/);
    } finally {
      restore();
    }
  });
}

test("bills list normalizes unpaid status to awaiting_payment state", async () => {
  const billSpec = specs.find((spec) => spec.name === "bills");
  const fetchCalls = [];
  const { module, restore } = loadCommandModule(billSpec, {
    fetchBillsPage: async (_config, _accessToken, query) => {
      fetchCalls.push(query);
      return buildPage([]);
    },
  });

  try {
    await captureConsole(() =>
      module.billsList({ status: "unpaid", limit: "5", json: true })
    );
    assert.deepStrictEqual(fetchCalls, [
      {
        fields:
          "id,number,state,type,kind,subject,memo,issued_at,due_at,paid,paid_at,pending,due,total,balance,created_at,updated_at,client{id,name,first_name,last_name},matters{id,display_number,number,description}",
        limit: 5,
        state: "awaiting_payment",
      },
    ]);
  } finally {
    restore();
  }
});

test("activities list resolves client ids through the matter collection", async () => {
  const activitySpec = specs.find((spec) => spec.name === "activities");
  const matterCalls = [];
  const activityCalls = [];
  const { module, restore } = loadCommandModule(activitySpec, {
    fetchActivitiesPage: async (_config, _accessToken, query) => {
      activityCalls.push(query);
      if (query.matter_id === 303) {
        return buildPage([
          {
            ...activitySpec.sample,
            id: 31,
            matter: { display_number: "MAT-303" },
            note: "Research issue",
          },
        ]);
      }

      return buildPage([
        {
          ...activitySpec.sample,
          id: 32,
          matter: { display_number: "MAT-304" },
          note: "Draft memo",
        },
      ]);
    },
    fetchMattersPage: async (_config, _accessToken, query, nextPageUrl) => {
      matterCalls.push({ nextPageUrl, query });
      return buildPage(nextPageUrl ? [] : [{ id: 303 }, { id: 304 }]);
    },
  });

  try {
    const { logs } = await captureConsole(() =>
      module.activitiesList({ clientId: "999", limit: "5" })
    );
    const output = logs.join("\n");

    assert.match(output, /Research issue/);
    assert.match(output, /Draft memo/);
    assert.match(output, /Returned 2 activities across 2 activity pages for 2 matters\./);
    assert.deepStrictEqual(matterCalls, [
      {
        nextPageUrl: undefined,
        query: {
          client_id: "999",
          fields: "id",
          limit: 200,
        },
      },
    ]);
    assert.deepStrictEqual(activityCalls, [
      {
        fields:
          "id,type,date,quantity,quantity_in_hours,rounded_quantity,rounded_quantity_in_hours,price,total,billed,on_bill,non_billable,no_charge,flat_rate,contingency_fee,note,reference,created_at,updated_at,activity_description{id,name},bill{id,number,state},matter{id,display_number,number,description},user{id,name,first_name,last_name,email}",
        limit: 5,
        matter_id: 303,
      },
      {
        fields:
          "id,type,date,quantity,quantity_in_hours,rounded_quantity,rounded_quantity_in_hours,price,total,billed,on_bill,non_billable,no_charge,flat_rate,contingency_fee,note,reference,created_at,updated_at,activity_description{id,name},bill{id,number,state},matter{id,display_number,number,description},user{id,name,first_name,last_name,email}",
        limit: 4,
        matter_id: 304,
      },
    ]);
  } finally {
    restore();
  }
});

test("activities list rejects page tokens for client-derived filtering", async () => {
  const activitySpec = specs.find((spec) => spec.name === "activities");
  const { module, restore } = loadCommandModule(activitySpec, {
    fetchMattersPage: async () => buildPage([{ id: 303 }]),
  });

  try {
    await assert.rejects(
      () => module.activitiesList({ clientId: "999", pageToken: "cursor-1" }),
      /--page-token/
    );
  } finally {
    restore();
  }
});

test("bills list rejects unsupported bill statuses before calling Clio", async () => {
  const billSpec = specs.find((spec) => spec.name === "bills");
  const { module, restore } = loadCommandModule(billSpec, {
    fetchBillsPage: async () => {
      throw new Error("fetchBillsPage should not be called for invalid statuses");
    },
  });

  try {
    await assert.rejects(
      () => module.billsList({ status: "open", limit: "5" }),
      /Use `all`, `overdue`, or `unpaid`/
    );
  } finally {
    restore();
  }
});

test("practice areas list resolves matter ids through the matter detail endpoint", async () => {
  const fetchMatterCalls = [];
  const fetchPracticeAreaCalls = [];
  const practiceAreaSpec = specs.find((spec) => spec.name === "practice areas");
  const { module, restore } = loadCommandModule(practiceAreaSpec, {
    fetchMatter: async (_config, _accessToken, id, query) => {
      fetchMatterCalls.push({ id, query });
      return {
        data: {
          id,
          practice_area: { id: 505 },
        },
      };
    },
    fetchPracticeArea: async (_config, _accessToken, id, query) => {
      fetchPracticeAreaCalls.push({ id, query });
      return {
        data: practiceAreaSpec.sample,
      };
    },
    fetchPracticeAreasPage: async () => {
      throw new Error("practice area collection fetch should not run in matter lookup mode");
    },
  });

  try {
    const { logs } = await captureConsole(() =>
      module.practiceAreasList({ matterId: "303", name: "Family", limit: "5" })
    );
    const output = logs.join("\n");
    assert.match(output, /Family Law/);
    assert.match(output, /Returned 1 practice area across 1 page\./);
    assert.deepStrictEqual(fetchMatterCalls, [
      {
        id: "303",
        query: {
          fields: "id,practice_area{id}",
        },
      },
    ]);
    assert.deepStrictEqual(fetchPracticeAreaCalls, [
      {
        id: 505,
        query: {
          fields: "id,code,name,category,created_at,updated_at",
        },
      },
    ]);
  } finally {
    restore();
  }
});

const billableSpecs = [
  {
    name: "billable matters",
    moduleFile: "src/commands-billable-matters.js",
    listExport: "billableMattersList",
    fetchPageExport: "fetchBillableMattersPage",
    emptyMessage: "No billable matters found for the selected filters.",
    listOptions: { limit: "5", query: "CLI" },
    sample: {
      id: 700,
      display_number: "MAT-700",
      client: { name: "Acme LLC" },
      unbilled_hours: 1.75,
      unbilled_amount: 350,
      amount_in_trust: 50,
    },
    listFragments: ["MAT-700", "Acme LLC", "1.75", "350.00", "50.00"],
  },
  {
    name: "billable clients",
    moduleFile: "src/commands-billable-clients.js",
    listExport: "billableClientsList",
    fetchPageExport: "fetchBillableClientsPage",
    emptyMessage: "No billable clients found for the selected filters.",
    listOptions: { limit: "5", query: "CLI" },
    sample: {
      id: 701,
      name: "Acme LLC",
      unbilled_hours: 2.25,
      unbilled_amount: 450,
      amount_in_trust: 75,
      billable_matters_count: 2,
    },
    listFragments: ["Acme LLC", "2.25", "450.00", "75.00", "2"],
  },
];

for (const spec of billableSpecs) {
  test(`${spec.name} list prints an empty state and summary`, async () => {
    const { module, restore } = loadWithMocks(path.join(ROOT, spec.moduleFile), {
      "./clio-api": {
        getValidAccessToken: async () => "fresh-token",
        [spec.fetchPageExport]: async () => buildPage([]),
      },
      "./store": {
        getConfig: async () => BASE_CONFIG,
        getTokenSet: async () => BASE_TOKEN_SET,
      },
    });

    try {
      const { logs } = await captureConsole(() => module[spec.listExport](spec.listOptions));
      assert.ok(logs.includes(spec.emptyMessage));
      assert.ok(logs.some((line) => line.includes("Returned 0")));
    } finally {
      restore();
    }
  });

  test(`${spec.name} list prints formatted table output`, async () => {
    const { module, restore } = loadWithMocks(path.join(ROOT, spec.moduleFile), {
      "./clio-api": {
        getValidAccessToken: async () => "fresh-token",
        [spec.fetchPageExport]: async () => buildPage([spec.sample]),
      },
      "./store": {
        getConfig: async () => BASE_CONFIG,
        getTokenSet: async () => BASE_TOKEN_SET,
      },
    });

    try {
      const { logs } = await captureConsole(() => module[spec.listExport](spec.listOptions));
      const output = logs.join("\n");
      spec.listFragments.forEach((fragment) => {
        assert.match(output, new RegExp(escapeRegExp(fragment)));
      });
    } finally {
      restore();
    }
  });

  test(`${spec.name} list supports JSON output`, async () => {
    const payload = buildPage([spec.sample], "https://next-page.test");
    const { module, restore } = loadWithMocks(path.join(ROOT, spec.moduleFile), {
      "./clio-api": {
        getValidAccessToken: async () => "fresh-token",
        [spec.fetchPageExport]: async () => payload,
      },
      "./store": {
        getConfig: async () => BASE_CONFIG,
        getTokenSet: async () => BASE_TOKEN_SET,
      },
    });

    try {
      const { logs } = await captureConsole(() =>
        module[spec.listExport]({ ...spec.listOptions, json: true })
      );
      assert.deepStrictEqual(JSON.parse(logs.join("\n")), payload);
    } finally {
      restore();
    }
  });
}

test("contacts list redacts contact PII in table output", async () => {
  const contactSpec = specs.find((spec) => spec.name === "contacts");
  const { module, restore } = loadCommandModule(contactSpec, {
    fetchContactsPage: async () => buildPage([contactSpec.sample]),
  });

  try {
    const { logs } = await captureConsole(() =>
      module.contactsList({ ...contactSpec.listOptions, redacted: true })
    );
    const output = logs.join("\n");
    assert.match(output, /\[REDACTED_NAME\]/);
    assert.match(output, /\[REDACTED_EMAIL\]/);
    assert.match(output, /\[REDACTED_PHONE\]/);
    assert.doesNotMatch(output, /Acme LLC/);
    assert.doesNotMatch(output, /billing@acme\.test/);
    assert.doesNotMatch(output, /555-0101/);
  } finally {
    restore();
  }
});

test("contacts get redacts structured PII in JSON output", async () => {
  const contactSpec = specs.find((spec) => spec.name === "contacts");
  const payload = { data: contactSpec.sample };
  const { module, restore } = loadCommandModule(contactSpec, {
    fetchContact: async () => payload,
  });

  try {
    const { logs } = await captureConsole(() =>
      module.contactsGet({ id: contactSpec.getId, json: true, redacted: true })
    );
    const output = JSON.parse(logs.join("\n"));
    assert.equal(output.data.name, "[REDACTED_NAME]");
    assert.equal(output.data.primary_email_address, "[REDACTED_EMAIL]");
    assert.equal(output.data.primary_phone_number, "[REDACTED_PHONE]");
    assert.equal(output.data.title, "CEO");
  } finally {
    restore();
  }
});

test("matters get redacts client PII inside free text but keeps staff visible", async () => {
  const matterSpec = specs.find((spec) => spec.name === "matters");
  const payload = {
    data: {
      ...matterSpec.sample,
      client: {
        name: "Acme LLC",
      },
      description:
        "Call Acme LLC at 415-555-1212 and billing@acme.test. Dana Doyle approved it.",
    },
  };
  const { module, restore } = loadCommandModule(matterSpec, {
    fetchMatter: async () => payload,
  });

  try {
    const { logs } = await captureConsole(() =>
      module.mattersGet({ id: matterSpec.getId, redacted: true })
    );
    const output = logs.join("\n");
    assert.match(output, /\[REDACTED_NAME\]/);
    assert.match(output, /\[REDACTED_PHONE\]/);
    assert.match(output, /\[REDACTED_EMAIL\]/);
    assert.match(output, /Dana Doyle/);
    assert.doesNotMatch(output, /Acme LLC/);
    assert.doesNotMatch(output, /415-555-1212/);
    assert.doesNotMatch(output, /billing@acme\.test/);
  } finally {
    restore();
  }
});

test("activities get redacts note PII but keeps user details visible", async () => {
  const activitySpec = specs.find((spec) => spec.name === "activities");
  const payload = {
    data: {
      ...activitySpec.sample,
      note: "Email Acme LLC at billing@acme.test or 415-555-1212.",
      matter: {
        display_number: "MAT-11",
      },
      client: {
        name: "Acme LLC",
      },
    },
  };
  const { module, restore } = loadCommandModule(activitySpec, {
    fetchActivity: async () => payload,
  });

  try {
    const { logs } = await captureConsole(() =>
      module.activitiesGet({ id: activitySpec.getId, redacted: true })
    );
    const output = logs.join("\n");
    assert.match(output, /User                 : Dana Doyle/);
    assert.match(output, /\[REDACTED_NAME\]/);
    assert.match(output, /\[REDACTED_EMAIL\]/);
    assert.match(output, /\[REDACTED_PHONE\]/);
    assert.doesNotMatch(output, /Acme LLC/);
  } finally {
    restore();
  }
});

test("billable clients list redacts client names in table output", async () => {
  const billableClientSpec = billableSpecs.find((spec) => spec.name === "billable clients");
  const { module, restore } = loadWithMocks(path.join(ROOT, billableClientSpec.moduleFile), {
    "./clio-api": {
      getValidAccessToken: async () => "fresh-token",
      fetchBillableClientsPage: async () => buildPage([billableClientSpec.sample]),
    },
    "./store": {
      getConfig: async () => BASE_CONFIG,
      getTokenSet: async () => BASE_TOKEN_SET,
    },
  });

  try {
    const { logs } = await captureConsole(() =>
      module.billableClientsList({ ...billableClientSpec.listOptions, redacted: true })
    );
    const output = logs.join("\n");
    assert.match(output, /\[REDACTED_NAME\]/);
    assert.doesNotMatch(output, /Acme LLC/);
  } finally {
    restore();
  }
});

test("users get remains unchanged in redacted mode", async () => {
  const userSpec = specs.find((spec) => spec.name === "users");
  const payload = { data: userSpec.sample };
  const { module, restore } = loadCommandModule(userSpec, {
    fetchUser: async () => payload,
  });

  try {
    const { logs } = await captureConsole(() =>
      module.usersGet({ id: userSpec.getId, redacted: true })
    );
    const output = logs.join("\n");
    assert.match(output, /Dana Doyle/);
    assert.match(output, /dana@example\.com/);
    assert.doesNotMatch(output, /\[REDACTED_/);
  } finally {
    restore();
  }
});
