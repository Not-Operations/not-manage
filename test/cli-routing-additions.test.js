const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const { loadWithMocks } = require("./helpers/module-test-utils");

const ROOT = path.resolve(__dirname, "..");

function loadCli() {
  const calls = {
    activitiesList: [],
    billsGet: [],
    contactsGet: [],
    mattersList: [],
    tasksGet: [],
    tasksList: [],
  };

  const { module, restore } = loadWithMocks(path.join(ROOT, "src/cli.js"), {
    "./commands-activities": {
      activitiesGet: async () => {},
      activitiesList: async (options) => {
        calls.activitiesList.push(options);
      },
    },
    "./commands-auth": {
      authLogin: async () => {},
      authRevoke: async () => {},
      authSetup: async () => {},
      authStatus: async () => {},
      maybeRunSetupOnFirstUse: async () => false,
      setupWizard: async () => {},
      whoAmI: async () => {},
    },
    "./commands-bills": {
      billsGet: async (options) => {
        calls.billsGet.push(options);
      },
      billsList: async () => {},
    },
    "./commands-billable-clients": {
      billableClientsList: async () => {},
    },
    "./commands-billable-matters": {
      billableMattersList: async () => {},
    },
    "./commands-contacts": {
      contactsGet: async (options) => {
        calls.contactsGet.push(options);
      },
      contactsList: async () => {},
    },
    "./commands-matters": {
      mattersGet: async () => {},
      mattersList: async (options) => {
        calls.mattersList.push(options);
      },
    },
    "./commands-practice-areas": {
      practiceAreasGet: async () => {},
      practiceAreasList: async () => {},
    },
    "./commands-tasks": {
      tasksGet: async (options) => {
        calls.tasksGet.push(options);
      },
      tasksList: async (options) => {
        calls.tasksList.push(options);
      },
    },
    "./commands-users": {
      usersGet: async () => {},
      usersList: async () => {},
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
        redacted: false,
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
        redacted: false,
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
        redacted: false,
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
        redacted: false,
      },
    ]);
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
