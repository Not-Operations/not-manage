const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const { captureConsole, loadWithMocks } = require("./helpers/module-test-utils");

const ROOT = path.resolve(__dirname, "..");

function loadCli() {
  const calls = {
    activitiesList: [],
    billsGet: [],
    contactsGet: [],
    mattersList: [],
    practiceAreasGet: [],
    tasksGet: [],
    tasksList: [],
  };

  const { module, restore } = loadWithMocks(path.join(ROOT, "src/cli.js"), {
    "./commands-auth": {
      authLogin: async () => {},
      authRevoke: async () => {},
      authSetup: async () => {},
      authStatus: async () => {},
      maybeRunSetupOnFirstUse: async () => false,
      setupWizard: async () => {},
      whoAmI: async () => {},
    },
    "./resource-handlers": {
      getResourceHandler: (resourceMetadata, subcommand) => {
        const handlers = {
          activities: {
            get: async () => {},
            list: async (options) => {
              calls.activitiesList.push(options);
            },
          },
          bills: {
            get: async (options) => {
              calls.billsGet.push(options);
            },
            list: async () => {},
          },
          contacts: {
            get: async (options) => {
              calls.contactsGet.push(options);
            },
            list: async () => {},
          },
          matters: {
            get: async () => {},
            list: async (options) => {
              calls.mattersList.push(options);
            },
          },
          "practice-areas": {
            get: async (options) => {
              calls.practiceAreasGet.push(options);
            },
            list: async () => {},
          },
          tasks: {
            get: async (options) => {
              calls.tasksGet.push(options);
            },
            list: async (options) => {
              calls.tasksList.push(options);
            },
          },
        };

        return handlers[resourceMetadata?.handlerKey]?.[subcommand] || null;
      },
    },
  });

  return { calls, restore, run: module.run };
}

test("cli routes activities list client filters", async () => {
  const { calls, restore, run } = loadCli();

  try {
    await run([
      "activities",
      "list",
      "--client-id",
      "999",
      "--status",
      "unbilled",
      "--json",
    ]);

    assert.deepStrictEqual(calls.activitiesList, [
      {
        activityDescriptionId: undefined,
        all: false,
        clientId: "999",
        createdSince: undefined,
        endDate: undefined,
        fields: undefined,
        flatRate: undefined,
        json: true,
        limit: undefined,
        matterId: undefined,
        onlyUnaccountedFor: false,
        order: undefined,
        pageToken: undefined,
        query: undefined,
        redacted: true,
        startDate: undefined,
        status: "unbilled",
        taskId: undefined,
        type: undefined,
        updatedSince: undefined,
        userId: undefined,
      },
    ]);
  } finally {
    restore();
  }
});

test("cli routes tasks list filters", async () => {
  const { calls, restore, run } = loadCli();

  try {
    await run([
      "tasks",
      "list",
      "--client-id",
      "12",
      "--matter-id",
      "45",
      "--complete",
      "false",
      "--due-at-from",
      "2026-03-01",
      "--task-type-id",
      "77",
      "--json",
    ]);

    assert.deepStrictEqual(calls.tasksList, [
      {
        all: false,
        clientId: "12",
        complete: false,
        createdSince: undefined,
        dueAtFrom: "2026-03-01",
        dueAtTo: undefined,
        fields: undefined,
        json: true,
        limit: undefined,
        matterId: "45",
        order: undefined,
        pageToken: undefined,
        priority: undefined,
        query: undefined,
        redacted: true,
        responsibleAttorneyId: undefined,
        status: undefined,
        taskTypeId: "77",
        updatedSince: undefined,
      },
    ]);
  } finally {
    restore();
  }
});

test("cli routes tasks get", async () => {
  const { calls, restore, run } = loadCli();

  try {
    await run(["tasks", "get", "789", "--fields", "id,name", "--redacted"]);

    assert.deepStrictEqual(calls.tasksGet, [
      {
        fields: "id,name",
        id: "789",
        json: false,
        redacted: true,
      },
    ]);
  } finally {
    restore();
  }
});

test("cli accepts singular aliases for contact get", async () => {
  const { calls, restore, run } = loadCli();

  try {
    await run(["contact", "get", "12345", "--json"]);

    assert.deepStrictEqual(calls.contactsGet, [
      {
        fields: undefined,
        id: "12345",
        json: true,
        redacted: true,
      },
    ]);
  } finally {
    restore();
  }
});

test("cli accepts singular aliases for bill get", async () => {
  const { calls, restore, run } = loadCli();

  try {
    await run(["bill", "get", "987"]);

    assert.deepStrictEqual(calls.billsGet, [
      {
        fields: undefined,
        id: "987",
        json: false,
        redacted: true,
      },
    ]);
  } finally {
    restore();
  }
});

test("cli warns when best-effort default redaction is applied", async () => {
  const { calls, restore, run } = loadCli();

  try {
    const { errors } = await captureConsole(() => run(["bill", "get", "987"]));

    assert.deepStrictEqual(calls.billsGet, [
      {
        fields: undefined,
        id: "987",
        json: false,
        redacted: true,
      },
    ]);
    assert.match(
      errors.join("\n"),
      /Warning: output is redacted by default\. Redaction is best-effort/
    );
    assert.match(
      errors.join("\n"),
      /related matter labels, captions, and other non-client fields may still identify a matter/
    );
  } finally {
    restore();
  }
});

test("cli warns when a high-risk command is run with --unredacted", async () => {
  const { calls, restore, run } = loadCli();

  try {
    const { errors } = await captureConsole(() =>
      run(["contact", "get", "12345", "--json", "--unredacted"])
    );

    assert.deepStrictEqual(calls.contactsGet, [
      {
        fields: undefined,
        id: "12345",
        json: true,
        redacted: false,
      },
    ]);
    assert.match(
      errors.join("\n"),
      /Warning: showing raw output without redaction/
    );
    assert.match(
      errors.join("\n"),
      /Review output carefully before sharing it outside your firm or with any third party/
    );
  } finally {
    restore();
  }
});

test("cli does not warn by default for lower-risk practice area reads", async () => {
  const { calls, restore, run } = loadCli();

  try {
    const { errors } = await captureConsole(() => run(["practice-area", "get", "45", "--json"]));

    assert.deepStrictEqual(calls.practiceAreasGet, [
      {
        fields: undefined,
        id: "45",
        json: true,
        redacted: true,
      },
    ]);
    assert.deepStrictEqual(errors, []);
  } finally {
    restore();
  }
});

test("cli prints the default fields when --fields is passed without a value", async () => {
  const { calls, restore, run } = loadCli();
  const logs = [];
  const originalLog = console.log;
  console.log = (...args) => {
    logs.push(args.join(" "));
  };

  try {
    await run(["matters", "list", "--fields"]);

    assert.deepStrictEqual(calls.mattersList, []);
    assert.deepStrictEqual(logs, [
      "id,display_number,number,description,status,billable,open_date,close_date,pending_date,client{id,name,first_name,last_name},practice_area{id,name},responsible_attorney{id,name,email},responsible_staff{id,name,email},originating_attorney{id,name,email},created_at,updated_at",
    ]);
  } finally {
    console.log = originalLog;
    restore();
  }
});
