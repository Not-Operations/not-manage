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
