const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const { captureConsole, loadWithMocks } = require("./helpers/module-test-utils");

const ROOT = path.resolve(__dirname, "..");
const {
  DEFAULT_REDIRECT_URI,
  REGIONS,
} = require("../src/constants");

function loadCli(authOverrides = {}) {
  const calls = {
    authRevoke: [],
    authSetup: [],
    activitiesGet: [],
    activitiesList: [],
    billsList: [],
    billableClientsList: [],
    billableMattersList: [],
    contactsList: [],
    mattersList: [],
    maybeRunSetupOnFirstUse: 0,
    practiceAreasList: [],
    setupWizard: [],
    usersList: [],
  };

  const { module, restore } = loadWithMocks(path.join(ROOT, "src/cli.js"), {
    "./commands-auth": {
      authLogin: async () => {},
      authRevoke: async (options = {}) => {
        calls.authRevoke.push(options);
      },
      authSetup: async (options = {}) => {
        calls.authSetup.push(options);
      },
      authStatus: async () => {},
      maybeRunSetupOnFirstUse: async () => {
        calls.maybeRunSetupOnFirstUse += 1;
        return false;
      },
      setupWizard: async (options = {}) => {
        calls.setupWizard.push(options);
      },
      whoAmI: async () => {},
      ...authOverrides,
    },
    "./resource-handlers": {
      getResourceHandler: (resourceMetadata, subcommand) => {
        const handlers = {
          activities: {
            get: async (options) => {
              calls.activitiesGet.push(options);
            },
            list: async (options) => {
              calls.activitiesList.push(options);
            },
          },
          "billable-clients": {
            list: async (options) => {
              calls.billableClientsList.push(options);
            },
          },
          "billable-matters": {
            list: async (options) => {
              calls.billableMattersList.push(options);
            },
          },
          bills: {
            get: async () => {},
            list: async (options) => {
              calls.billsList.push(options);
            },
          },
          contacts: {
            get: async () => {},
            list: async (options) => {
              calls.contactsList.push(options);
            },
          },
          matters: {
            get: async () => {},
            list: async (options) => {
              calls.mattersList.push(options);
            },
          },
          "practice-areas": {
            get: async () => {},
            list: async (options) => {
              calls.practiceAreasList.push(options);
            },
          },
          users: {
            get: async () => {},
            list: async (options) => {
              calls.usersList.push(options);
            },
          },
        };

        return handlers[resourceMetadata?.handlerKey]?.[subcommand] || null;
      },
    },
  });

  return { calls, restore, run: module.run };
}

async function withMockTty(isTTY, callback) {
  const stdinDescriptor = Object.getOwnPropertyDescriptor(process.stdin, "isTTY");
  const stdoutDescriptor = Object.getOwnPropertyDescriptor(process.stdout, "isTTY");

  Object.defineProperty(process.stdin, "isTTY", {
    configurable: true,
    value: isTTY,
  });
  Object.defineProperty(process.stdout, "isTTY", {
    configurable: true,
    value: isTTY,
  });

  try {
    return await callback();
  } finally {
    if (stdinDescriptor) {
      Object.defineProperty(process.stdin, "isTTY", stdinDescriptor);
    } else {
      delete process.stdin.isTTY;
    }

    if (stdoutDescriptor) {
      Object.defineProperty(process.stdout, "isTTY", stdoutDescriptor);
    } else {
      delete process.stdout.isTTY;
    }
  }
}

function loadAuthSetupTest(askImpl) {
  const openCalls = [];
  const promptLabels = [];
  let clearedTokenSet = 0;
  let savedConfig = null;

  const { module, restore } = loadWithMocks(path.join(ROOT, "src/commands-auth.js"), {
    "./clio-api": {
      authorizeUrl: () => "",
      deauthorize: async () => {},
      exchangeAuthorizationCode: async () => ({}),
      fetchWhoAmI: async () => ({ data: { id: 1, name: "Casey Example", email: "casey@test" } }),
      fetchUser: async () => ({ data: { id: 1, name: "Casey Example", email: "casey@test" } }),
      getValidAccessToken: async () => "access-token",
    },
    "./open-browser": {
      openBrowser: async (url) => {
        openCalls.push(url);
      },
    },
    "./oauth-callback": {
      waitForOAuthCallback: async () => ({ code: "auth-code" }),
    },
    "./prompt": {
      withPrompt: async (callback) => callback({}),
      ask: async (_rl, label, fallback) => {
        promptLabels.push({ fallback, label });
        return askImpl(label, fallback);
      },
      askSecret: async (_rl, label) => {
        promptLabels.push({ fallback: null, label });
        return askImpl(label, null);
      },
      selectOption: async (_rl, label, options, defaultIndex) => {
        promptLabels.push({ fallback: options[defaultIndex].value, label });
        return askImpl(label, options[defaultIndex].value);
      },
      bold: (text) => text,
      dim: (text) => text,
    },
    "./store": {
      clearTokenSet: async () => {
        clearedTokenSet += 1;
      },
      findConfig: async () => null,
      getConfig: async () => ({}),
      getTokenSet: async () => ({}),
      normalizeRegion: (value) => value,
      parseRedirectUri: (value) => value,
      saveConfig: async (config) => {
        savedConfig = config;
        return config;
      },
      saveTokenSet: async (payload) => payload,
    },
  });

  return {
    module,
    openCalls,
    promptLabels,
    get clearedTokenSet() {
      return clearedTokenSet;
    },
    get savedConfig() {
      return savedConfig;
    },
    restore,
  };
}

function loadAuthModule(options = {}) {
  const {
    clioApiOverrides = {},
    openBrowserImpl = async () => {},
    promptOverrides = {},
    storeOverrides = {},
  } = options;

  const { module, restore } = loadWithMocks(path.join(ROOT, "src/commands-auth.js"), {
    "./clio-api": {
      authorizeUrl: () => "https://app.clio.com/oauth/authorize?client_id=test",
      deauthorize: async () => {},
      exchangeAuthorizationCode: async () => ({
        access_token: "new-access-token",
        expires_in: 3600,
        refresh_token: "new-refresh-token",
      }),
      fetchUser: async () => ({
        data: { id: 1, name: "Casey Example", email: "casey@test" },
      }),
      fetchWhoAmI: async () => ({
        data: { id: 1, name: "Casey Example", email: "casey@test" },
      }),
      getValidAccessToken: async () => "new-access-token",
      ...clioApiOverrides,
    },
    "./open-browser": {
      openBrowser: openBrowserImpl,
    },
    "./oauth-callback": {
      waitForOAuthCallback: async () => ({ code: "auth-code", state: "state-1" }),
    },
    "./prompt": {
      ask: async (...args) => {
        if (promptOverrides.ask) {
          return promptOverrides.ask(...args);
        }
        return null;
      },
      askSecret: async (...args) => {
        if (promptOverrides.askSecret) {
          return promptOverrides.askSecret(...args);
        }
        if (promptOverrides.ask) {
          return promptOverrides.ask(...args);
        }
        return null;
      },
      selectOption: async (_rl, _label, options, defaultIndex) => {
        return options[defaultIndex].value;
      },
      bold: (text) => text,
      dim: (text) => text,
      withPrompt: async (callback) => callback({}),
      ...Object.fromEntries(
        Object.entries(promptOverrides).filter(
          ([key]) => key !== "ask" && key !== "askSecret"
        )
      ),
    },
    "./store": {
      clearTokenSet: async () => {},
      findConfig: async () => null,
      getConfig: async () => ({
        clientId: "client-id-1234",
        clientSecret: "client-secret-5678",
        host: "app.clio.com",
        redirectUri: DEFAULT_REDIRECT_URI,
        region: "us",
        regionLabel: "United States",
        source: "keychain",
      }),
      getTokenSet: async () => null,
      normalizeRegion: (value) => value,
      parseRedirectUri: (value) => value,
      saveConfig: async (config) => config,
      saveTokenSet: async (payload) => ({
        accessToken: payload.access_token,
        expiresAt: Math.floor(Date.now() / 1000) + payload.expires_in,
        refreshToken: payload.refresh_token,
        source: "keychain",
      }),
      ...storeOverrides,
    },
  });

  return { module, restore };
}

function loadClioApi(storeOverrides = {}) {
  return loadWithMocks(path.join(ROOT, "src/clio-api.js"), {
    "./store": {
      saveTokenSet: async (payload) => payload,
      ...storeOverrides,
    },
  });
}

test("parseRedirectUri only accepts loopback http callback URLs", () => {
  const { parseRedirectUri } = require("../src/store");

  assert.equal(
    parseRedirectUri("http://127.0.0.1:53123/callback"),
    "http://127.0.0.1:53123/callback"
  );
  assert.equal(
    parseRedirectUri("http://localhost:53123/callback"),
    "http://localhost:53123/callback"
  );
  assert.throws(
    () => parseRedirectUri("https://127.0.0.1:53123/callback"),
    /must use http:\/\//
  );
  assert.throws(
    () => parseRedirectUri("http://example.com:53123/callback"),
    /must use a loopback host/
  );
  assert.throws(
    () => parseRedirectUri("http://127.0.0.1/callback"),
    /must include an explicit port/
  );
  assert.throws(
    () => parseRedirectUri("http://127.0.0.1:53123/callback\?state=abc"),
    /must not include query parameters or fragments/
  );
});

test("parseTrustedApiUrl rejects pagination links outside the configured Clio host", () => {
  const clioApi = require("../src/clio-api");

  assert.equal(
    clioApi.__private.parseTrustedApiUrl(
      { host: "app.clio.com" },
      "https://app.clio.com/api/v4/contacts.json?page_token=abc"
    ),
    "https://app.clio.com/api/v4/contacts.json?page_token=abc"
  );
  assert.throws(
    () =>
      clioApi.__private.parseTrustedApiUrl(
        { host: "app.clio.com" },
        "https://evil.example/api/v4/contacts.json?page_token=abc"
      ),
    /unexpected host/
  );
  assert.throws(
    () =>
      clioApi.__private.parseTrustedApiUrl(
        { host: "app.clio.com" },
        "http://app.clio.com/api/v4/contacts.json?page_token=abc"
      ),
    /non-HTTPS/
  );
  assert.throws(
    () =>
      clioApi.__private.parseTrustedApiUrl(
        { host: "app.clio.com" },
        "https://app.clio.com/oauth/token"
      ),
    /unexpected Clio API path/
  );
});

test("cli routes invoices list to billsList and preserves hyphenated flags", async () => {
  const { calls, restore, run } = loadCli();

  try {
    await run([
      "invoices",
      "list",
      "--client-id",
      "12",
      "--due-after",
      "2026-03-01",
      "--overdue-only",
      "--page-token",
      "cursor-1",
      "--json",
    ]);

    assert.deepStrictEqual(calls.billsList, [
      {
        all: false,
        clientId: "12",
        createdSince: undefined,
        dueAfter: "2026-03-01",
        dueBefore: undefined,
        fields: undefined,
        issuedAfter: undefined,
        issuedBefore: undefined,
        json: true,
        limit: undefined,
        matterId: undefined,
      order: undefined,
      overdueOnly: true,
      pageToken: "cursor-1",
      query: undefined,
      redacted: true,
      state: undefined,
      status: undefined,
        type: undefined,
        updatedSince: undefined,
      },
    ]);
  } finally {
    restore();
  }
});

test("cli routes time-entries list to activitiesList with a fixed TimeEntry type", async () => {
  const { calls, restore, run } = loadCli();

  try {
    await run([
      "time-entries",
      "list",
      "--matter-id",
      "15564573",
      "--user-id",
      "433452",
      "--start-date",
      "2026-03-01",
      "--status",
      "unbilled",
      "--json",
    ]);

    assert.deepStrictEqual(calls.activitiesList, [
      {
        activityDescriptionId: undefined,
        all: false,
        clientId: undefined,
        createdSince: undefined,
        endDate: undefined,
        fields: undefined,
        flatRate: undefined,
        json: true,
        limit: undefined,
        matterId: "15564573",
        onlyUnaccountedFor: false,
      order: undefined,
      pageToken: undefined,
      query: undefined,
      redacted: true,
      startDate: "2026-03-01",
      status: "unbilled",
        taskId: undefined,
        type: "TimeEntry",
        updatedSince: undefined,
        userId: "433452",
      },
    ]);
  } finally {
    restore();
  }
});

test("cli routes activities get", async () => {
  const { calls, restore, run } = loadCli();

  try {
    await run(["activities", "get", "9001", "--fields", "id,type", "--json", "--redacted"]);

    assert.deepStrictEqual(calls.activitiesGet, [
      {
        fields: "id,type",
        id: "9001",
        json: true,
        redacted: true,
      },
    ]);
  } finally {
    restore();
  }
});

test("cli routes contacts list booleans and hyphenated flags", async () => {
  const { calls, restore, run } = loadCli();

  try {
    await run([
      "contacts",
      "list",
      "--client-only",
      "--clio-connect-only",
      "--email-only",
      "--created-since",
      "2026-01-01",
      "--updated-since",
      "2026-02-01",
      "--page-token",
      "cursor-2",
    ]);

    assert.deepStrictEqual(calls.contactsList, [
      {
        all: false,
        clientOnly: true,
        clioConnectOnly: true,
        createdSince: "2026-01-01",
        emailOnly: true,
        fields: undefined,
        initial: undefined,
        json: false,
        limit: undefined,
      order: undefined,
      pageToken: "cursor-2",
      query: undefined,
      redacted: true,
      type: undefined,
      updatedSince: "2026-02-01",
      },
    ]);
  } finally {
    restore();
  }
});

test("cli routes matters list expanded filters", async () => {
  const { calls, restore, run } = loadCli();

  try {
    await run([
      "matters",
      "list",
      "--client-id",
      "9",
      "--originating-attorney-id",
      "11",
      "--practice-area-id",
      "22",
      "--responsible-attorney-id",
      "33",
      "--responsible-staff-id",
      "44",
      "--status",
      "open",
    ]);

    assert.deepStrictEqual(calls.mattersList, [
      {
        all: false,
        clientId: "9",
        createdSince: undefined,
        fields: undefined,
        json: false,
        limit: undefined,
        order: undefined,
      originatingAttorneyId: "11",
      pageToken: undefined,
      practiceAreaId: "22",
      query: undefined,
      redacted: true,
      responsibleAttorneyId: "33",
      responsibleStaffId: "44",
        status: "open",
        updatedSince: undefined,
      },
    ]);
  } finally {
    restore();
  }
});

test("cli keeps explicit false values for users list booleans", async () => {
  const { calls, restore, run } = loadCli();

  try {
    await run([
      "users",
      "list",
      "--enabled",
      "false",
      "--pending-setup",
      "false",
      "--include-co-counsel",
      "--subscription-type",
      "full",
    ]);

    assert.deepStrictEqual(calls.usersList, [
      {
        all: false,
        createdSince: undefined,
        enabled: false,
        fields: undefined,
        includeCoCounsel: true,
        json: false,
        limit: undefined,
      name: undefined,
      order: undefined,
      pageToken: undefined,
      pendingSetup: false,
      redacted: true,
      role: undefined,
      subscriptionType: "full",
        updatedSince: undefined,
      },
    ]);
  } finally {
    restore();
  }
});

test("cli routes practice area list filters", async () => {
  const { calls, restore, run } = loadCli();

  try {
    await run([
      "practice-areas",
      "list",
      "--matter-id",
      "71",
      "--name",
      "Family",
      "--code",
      "FAM",
    ]);

    assert.deepStrictEqual(calls.practiceAreasList, [
      {
        all: false,
        code: "FAM",
        createdSince: undefined,
        fields: undefined,
        json: false,
      limit: undefined,
      matterId: "71",
      name: "Family",
      order: undefined,
      pageToken: undefined,
      redacted: true,
      updatedSince: undefined,
    },
    ]);
  } finally {
    restore();
  }
});

test("cli routes billable matter list filters", async () => {
  const { calls, restore, run } = loadCli();

  try {
    await run([
      "billable-matters",
      "list",
      "--client-id",
      "18638250",
      "--responsible-attorney-id",
      "433452",
      "--start-date",
      "2026-03-01",
      "--end-date",
      "2026-03-09",
      "--all",
    ]);

    assert.deepStrictEqual(calls.billableMattersList, [
      {
        all: true,
        clientId: "18638250",
        endDate: "2026-03-09",
        fields: undefined,
        json: false,
        limit: undefined,
        matterId: undefined,
      originatingAttorneyId: undefined,
      pageToken: undefined,
      query: undefined,
      redacted: true,
      responsibleAttorneyId: "433452",
      startDate: "2026-03-01",
      },
    ]);
  } finally {
    restore();
  }
});

test("cli routes billable client list filters", async () => {
  const { calls, restore, run } = loadCli();

  try {
    await run([
      "billable-clients",
      "list",
      "--matter-id",
      "15564573",
      "--originating-attorney-id",
      "433452",
      "--page-token",
      "cursor-7",
      "--json",
    ]);

    assert.deepStrictEqual(calls.billableClientsList, [
      {
        all: false,
        clientId: undefined,
        endDate: undefined,
        fields: undefined,
        json: true,
        limit: undefined,
      matterId: "15564573",
      originatingAttorneyId: "433452",
      pageToken: "cursor-7",
      query: undefined,
      redacted: true,
      responsibleAttorneyId: undefined,
      startDate: undefined,
      },
    ]);
  } finally {
    restore();
  }
});

test("cli prints help on bare invocation and does not auto-start onboarding", async () => {
  let onboardingCalls = 0;
  const { restore, run } = loadCli({
    maybeRunSetupOnFirstUse: async () => {
      onboardingCalls += 1;
      return true;
    },
  });

  try {
    const { logs } = await captureConsole(() => run([]));
    assert.equal(onboardingCalls, 0);
    assert.ok(logs.includes("Usage:"));
  } finally {
    restore();
  }
});

test("cli prints help when no args are provided and onboarding is not needed", async () => {
  const { calls, restore, run } = loadCli();

  try {
    const { logs } = await captureConsole(() => run([]));
    const output = logs.join("\n");
    assert.equal(calls.maybeRunSetupOnFirstUse, 0);
    assert.ok(logs.includes("Usage:"));
    assert.ok(logs.includes("  not-manage <command> [options]"));
    assert.match(
      output,
      /conversation-messages list\s+List conversation messages for a conversation \(requires --conversation-id\)/
    );
    assert.match(
      output,
      /notes list\s+List notes with filters and pagination \(requires --type\)/
    );
  } finally {
    restore();
  }
});

test("cli prints layered resource help instead of global help for subcommands", async () => {
  const { restore, run } = loadCli();

  try {
    const { logs } = await captureConsole(() => run(["activities", "list", "--help"]));
    const output = logs.join("\n");

    assert.match(output, /not-manage activities list/);
    assert.match(output, /Usage:\n  not-manage activities list \[options\]/);
    assert.match(output, /Description:\n  List activities with filters and pagination/);
    assert.match(output, /--client-id <value>/);
    assert.match(output, /--status <value>/);
    assert.equal(output.includes("auth setup"), false);
  } finally {
    restore();
  }
});

test("cli prints layered auth setup help with automation-friendly flags", async () => {
  const { restore, run } = loadCli();

  try {
    const { logs } = await captureConsole(() => run(["auth", "setup", "--help"]));
    const output = logs.join("\n");

    assert.match(output, /not-manage auth setup/);
    assert.match(output, /--confirm-confidentiality/);
    assert.match(output, /--client-id <value>/);
    assert.match(output, /--client-secret <value>/);
    assert.match(output, /--open-browser <true\|false>/);
    assert.equal(output.includes("Commands:"), false);
  } finally {
    restore();
  }
});

test("cli passes auth setup flags through to authSetup", async () => {
  const { calls, restore, run } = loadCli();

  try {
    await run([
      "auth",
      "setup",
      "--confirm-confidentiality",
      "--region",
      "ca",
      "--client-id",
      "client-id",
      "--client-secret",
      "client-secret",
      "--redirect-uri",
      DEFAULT_REDIRECT_URI,
      "--open-browser",
      "false",
    ]);

    assert.deepStrictEqual(calls.authSetup, [
      {
        clientId: "client-id",
        clientSecret: "client-secret",
        confirmConfidentiality: true,
        openBrowser: false,
        redirectUri: DEFAULT_REDIRECT_URI,
        region: "ca",
      },
    ]);
  } finally {
    restore();
  }
});

test("cli passes auth revoke safety flags through to authRevoke", async () => {
  const { calls, restore, run } = loadCli();

  try {
    await run(["auth", "revoke", "--dry-run", "--yes"]);
    assert.deepStrictEqual(calls.authRevoke, [{ dryRun: true, yes: true }]);
  } finally {
    restore();
  }
});

test("authSetup opens the selected regional developer portal only after Enter", async () => {
  const authHarness = loadAuthSetupTest((label, fallback) => {
    if (label === "Press Enter to confirm, or type no to abort") {
      return "";
    }
    if (label === "Region") {
      return "ca";
    }
    if (
      label === "Press Enter to open the developer portal, or type skip"
    ) {
      return fallback;
    }
    if (label === "App Key / Client ID") {
      return "client-id";
    }
    if (label === "App Secret / Client Secret") {
      return "client-secret";
    }
    throw new Error(`Unexpected prompt label: ${label}`);
  });

  try {
    const { logs } = await withMockTty(true, () =>
      captureConsole(() => authHarness.module.authSetup({ skipNextStepHint: true }))
    );
    const output = logs.join("\n");

    assert.match(output, /not-manage setup/);
    assert.match(output, /Connect not-manage to your Clio account/);
    assert.match(output, /Output may contain confidential client data/);
    assert.match(output, /Redaction .* is best-effort\. Review all output before sharing/);
    assert.ok(output.includes(REGIONS.ca.developerPortalUrl));
    assert.match(output, /Opened Canada developer portal in your browser/);
    assert.match(output, /In the developer portal:/);
    assert.match(output, /Open or create a Clio developer app/);
    assert.match(output, /Set permissions \(scopes\) for this CLI/);
    assert.match(output, /Add this redirect URI/);
    assert.match(output, /Copy the App Key and App Secret back here/);
    assert.ok(output.includes(DEFAULT_REDIRECT_URI));
    assert.match(output, /securely saved on your local machine in the keychain/);
    assert.deepStrictEqual(authHarness.openCalls, [REGIONS.ca.developerPortalUrl]);
    assert.deepStrictEqual(
      authHarness.promptLabels.map((entry) => entry.label),
      [
        "Press Enter to confirm, or type no to abort",
        "Region",
        "Press Enter to open the developer portal, or type skip",
        "App Key / Client ID",
        "App Secret / Client Secret",
      ]
    );
    assert.deepStrictEqual(authHarness.savedConfig, {
      clientId: "client-id",
      clientSecret: "client-secret",
      redirectUri: DEFAULT_REDIRECT_URI,
      region: "ca",
    });
    assert.equal(authHarness.clearedTokenSet, 1);
  } finally {
    authHarness.restore();
  }
});

test("authSetup does not open the browser when the user types skip", async () => {
  const authHarness = loadAuthSetupTest((label, fallback) => {
    if (label === "Press Enter to confirm, or type no to abort") {
      return "";
    }
    if (label === "Region") {
      return "ca";
    }
    if (
      label === "Press Enter to open the developer portal, or type skip"
    ) {
      return "skip";
    }
    if (label === "App Key / Client ID") {
      return "client-id";
    }
    if (label === "App Secret / Client Secret") {
      return "client-secret";
    }
    throw new Error(`Unexpected prompt label: ${label}`);
  });

  try {
    const { logs } = await withMockTty(true, () =>
      captureConsole(() => authHarness.module.authSetup({ skipNextStepHint: true }))
    );
    const output = logs.join("\n");

    assert.match(output, /Continuing without opening the browser/);
    assert.deepStrictEqual(authHarness.openCalls, []);
  } finally {
    authHarness.restore();
  }
});

test("authSetup aborts when the confidentiality acknowledgment is declined", async () => {
  const authHarness = loadAuthSetupTest((label) => {
    if (label === "Press Enter to confirm, or type no to abort") {
      return "no";
    }
    throw new Error(`Unexpected prompt label: ${label}`);
  });

  try {
    await withMockTty(true, async () => {
      await assert.rejects(
        () => authHarness.module.authSetup({ skipNextStepHint: true }),
        /Setup aborted\. Review your confidentiality and client-sharing requirements/
      );
    });
    assert.deepStrictEqual(authHarness.openCalls, []);
    assert.equal(authHarness.clearedTokenSet, 0);
  } finally {
    authHarness.restore();
  }
});

test("authSetup accepts a fully flag-driven path without prompting", async () => {
  const authHarness = loadAuthSetupTest(() => {
    throw new Error("authSetup should not prompt when all required flags are provided");
  });

  try {
    const { logs } = await withMockTty(false, () =>
      captureConsole(() =>
        authHarness.module.authSetup({
          clientId: "client-id",
          clientSecret: "client-secret",
          confirmConfidentiality: true,
          openBrowser: false,
          redirectUri: DEFAULT_REDIRECT_URI,
          region: "ca",
          skipNextStepHint: true,
        })
      )
    );
    const output = logs.join("\n");

    assert.match(output, /Continuing without opening the browser/);
    assert.deepStrictEqual(authHarness.promptLabels, []);
    assert.deepStrictEqual(authHarness.savedConfig, {
      clientId: "client-id",
      clientSecret: "client-secret",
      redirectUri: DEFAULT_REDIRECT_URI,
      region: "ca",
    });
  } finally {
    authHarness.restore();
  }
});

test("authRevoke supports dry-run without side effects", async () => {
  let deauthorizeCalls = 0;
  let clearTokenSetCalls = 0;

  const { module, restore } = loadAuthModule({
    clioApiOverrides: {
      deauthorize: async () => {
        deauthorizeCalls += 1;
      },
    },
    storeOverrides: {
      clearTokenSet: async () => {
        clearTokenSetCalls += 1;
      },
      getTokenSet: async () => ({
        accessToken: "stored-access-token",
        source: "keychain",
      }),
    },
  });

  try {
    const { logs } = await captureConsole(() => module.authRevoke({ dryRun: true }));
    assert.match(logs.join("\n"), /Dry run: would revoke the current token in Clio/);
    assert.equal(deauthorizeCalls, 0);
    assert.equal(clearTokenSetCalls, 0);
  } finally {
    restore();
  }
});

test("authRevoke requires explicit confirmation outside a TTY", async () => {
  const { module, restore } = loadAuthModule({
    storeOverrides: {
      getTokenSet: async () => ({
        accessToken: "stored-access-token",
        source: "keychain",
      }),
    },
  });

  try {
    await withMockTty(false, async () => {
      await assert.rejects(
        () => module.authRevoke(),
        /Re-run with `--yes` to perform the revoke, or `--dry-run` to inspect what would happen/
      );
    });
  } finally {
    restore();
  }
});

test("authLogin rewrites invalid_client errors with actionable guidance", async () => {
  const { __private } = require("../src/clio-api");
  const { module, restore } = loadAuthModule({
    clioApiOverrides: {
      exchangeAuthorizationCode: async () => {
        throw __private.createError(
          "HTTP 401 from https://app.clio.com/oauth/token",
          {
            error: "invalid_client",
            error_description: "The client identifier provided is invalid.",
          }
        );
      },
    },
  });

  try {
    await assert.rejects(async () => {
      try {
        await module.authLogin();
      } catch (error) {
        assert.match(
          error.message,
          /Clio rejected the app credentials during OAuth token exchange/
        );
        assert.match(error.message, /App ID was entered instead of the App Key/);
        assert.match(error.message, /Redirect URI: http:\/\/127\.0\.0\.1:53123\/callback/);
        assert.match(error.message, /Clio response: HTTP 401 from https:\/\/app\.clio\.com\/oauth\/token\. Clio error code: invalid_client\./);
        assert.equal(error.message.includes("client identifier provided"), false);
        throw error;
      }
    }, /invalid_client/);
  } finally {
    restore();
  }
});

test("setupWizard passes the config it just saved into authLogin", async () => {
  const flow = [];
  const savedConfig = {
    clientId: "saved-client-id",
    clientSecret: "saved-client-secret",
    host: "app.clio.com",
    redirectUri: DEFAULT_REDIRECT_URI,
    region: "us",
    regionLabel: "United States",
    source: "keychain",
  };

  const { module, restore } = loadAuthModule({
    clioApiOverrides: {
      authorizeUrl: (config) => {
        flow.push({ step: "authorizeUrl", config });
        return "https://app.clio.com/oauth/authorize?client_id=saved-client-id";
      },
      exchangeAuthorizationCode: async (config) => {
        flow.push({ step: "exchangeAuthorizationCode", config });
        return {
          access_token: "new-access-token",
          expires_in: 3600,
          refresh_token: "new-refresh-token",
        };
      },
      fetchWhoAmI: async () => ({
        data: { id: 1, name: "Casey Example", email: "casey@test" },
      }),
      getValidAccessToken: async () => "new-access-token",
    },
    promptOverrides: {
      ask: async (_rl, label, fallback) => {
        if (label === "Press Enter to confirm, or type no to abort") {
          return fallback;
        }
        if (label === "Region") {
          return fallback;
        }
        if (
          label === "Press Enter to open the developer portal, or type skip"
        ) {
          return "skip";
        }
        if (label === "App Key / Client ID") {
          return savedConfig.clientId;
        }
        if (label === "App Secret / Client Secret") {
          return savedConfig.clientSecret;
        }
        throw new Error(`Unexpected prompt label: ${label}`);
      },
    },
    storeOverrides: {
      saveConfig: async () => savedConfig,
      getConfig: async () => {
        throw new Error("setupWizard should not re-read config from store");
      },
    },
  });

  try {
    await withMockTty(true, () => module.setupWizard());
    assert.deepStrictEqual(
      flow.map((entry) => entry.config),
      [savedConfig, savedConfig]
    );
  } finally {
    restore();
  }
});

test("whoAmI falls back to the user detail endpoint when the summary omits email", async () => {
  const fetchUserCalls = [];
  const { module, restore } = loadAuthModule({
    clioApiOverrides: {
      fetchWhoAmI: async () => ({
        data: { id: 55, name: "Casey Example" },
      }),
      fetchUser: async (_config, _accessToken, id, query) => {
        fetchUserCalls.push({ id, query });
        return {
          data: {
            id: 55,
            first_name: "Casey",
            last_name: "Example",
            email: "casey@example.test",
          },
        };
      },
    },
  });

  try {
    const { logs } = await captureConsole(() => module.whoAmI());
    assert.ok(logs.includes("User: Casey Example"));
    assert.ok(logs.includes("Email: casey@example.test"));
    assert.deepStrictEqual(fetchUserCalls, [
      {
        id: 55,
        query: {
          fields: "id,name,first_name,last_name,email",
        },
      },
    ]);
  } finally {
    restore();
  }
});

test("authLogin masks the connected user email in console output", async () => {
  const { module, restore } = loadAuthModule();

  try {
    const { logs } = await captureConsole(() => module.authLogin());
    assert.ok(logs.includes("Connected user: Casey Example <c****@test> (id: 1)"));
  } finally {
    restore();
  }
});

test("authStatus masks the connected user email in console output", async () => {
  const { module, restore } = loadAuthModule({
    storeOverrides: {
      getTokenSet: async () => ({
        accessToken: "stored-access-token",
        source: "keychain",
      }),
    },
  });

  try {
    const { logs } = await captureConsole(() => module.authStatus());
    assert.ok(logs.includes("Connected user: Casey Example <c****@test> (id: 1)"));
  } finally {
    restore();
  }
});

test("authStatus masks the connected user email in JSON output", async () => {
  const { module, restore } = loadAuthModule({
    storeOverrides: {
      getTokenSet: async () => ({
        accessToken: "stored-access-token",
        source: "keychain",
      }),
    },
  });

  try {
    const { logs } = await captureConsole(() => module.authStatus({ json: true }));
    const payload = JSON.parse(logs.join("\n"));
    assert.equal(payload.user.email, "c****@test");
  } finally {
    restore();
  }
});

test("getValidAccessToken returns the stored token when it is not expiring", async () => {
  const { module, restore } = loadClioApi();

  try {
    const accessToken = await module.getValidAccessToken(
      { clientId: "client-id", clientSecret: "client-secret", host: "app.clio.com" },
      {
        accessToken: "still-good",
        expiresAt: Math.floor(Date.now() / 1000) + 600,
        source: "keychain",
      }
    );

    assert.equal(accessToken, "still-good");
  } finally {
    restore();
  }
});

test("getValidAccessToken refreshes keychain tokens that are near expiry", async () => {
  const saveCalls = [];
  const originalFetch = global.fetch;
  const { module, restore } = loadClioApi({
    saveTokenSet: async (payload, previousTokenSet) => {
      saveCalls.push({ payload, previousTokenSet });
      return {
        accessToken: payload.access_token,
        refreshToken: payload.refresh_token,
        expiresAt: Math.floor(Date.now() / 1000) + payload.expires_in,
        source: "keychain",
      };
    },
  });

  const fetchCalls = [];
  global.fetch = async (url, options) => {
    fetchCalls.push({ options, url });
    return {
      ok: true,
      text: async () =>
        JSON.stringify({
          access_token: "new-access-token",
          refresh_token: "new-refresh-token",
          expires_in: 3600,
        }),
    };
  };

  try {
    const accessToken = await module.getValidAccessToken(
      {
        clientId: "client-id",
        clientSecret: "client-secret",
        host: "app.clio.com",
      },
      {
        accessToken: "old-access-token",
        refreshToken: "old-refresh-token",
        expiresAt: Math.floor(Date.now() / 1000) + 30,
        source: "keychain",
      }
    );

    assert.equal(accessToken, "new-access-token");
    assert.equal(fetchCalls.length, 1);
    assert.match(fetchCalls[0].url, /oauth\/token$/);
    assert.match(fetchCalls[0].options.body, /grant_type=refresh_token/);
    assert.match(fetchCalls[0].options.body, /refresh_token=old-refresh-token/);
    assert.deepStrictEqual(saveCalls, [
      {
        payload: {
          access_token: "new-access-token",
          expires_in: 3600,
          refresh_token: "new-refresh-token",
        },
        previousTokenSet: {
          accessToken: "old-access-token",
          refreshToken: "old-refresh-token",
          expiresAt: saveCalls[0].previousTokenSet.expiresAt,
          source: "keychain",
        },
      },
    ]);
  } finally {
    global.fetch = originalFetch;
    restore();
  }
});

test("getValidAccessToken rejects expiring tokens when no refresh token is present", async () => {
  const { module, restore } = loadClioApi();

  try {
    await assert.rejects(
      () =>
        module.getValidAccessToken(
          { clientId: "client-id", clientSecret: "client-secret", host: "app.clio.com" },
          {
            accessToken: "old-token",
            expiresAt: Math.floor(Date.now() / 1000) + 30,
            source: "keychain",
          }
        ),
      /Missing refresh token/
    );
  } finally {
    restore();
  }
});
