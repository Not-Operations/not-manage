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
    activitiesGet: [],
    activitiesList: [],
    billsList: [],
    billableClientsList: [],
    billableMattersList: [],
    contactsList: [],
    mattersList: [],
    maybeRunSetupOnFirstUse: 0,
    practiceAreasList: [],
    usersList: [],
  };

  const { module, restore } = loadWithMocks(path.join(ROOT, "src/cli.js"), {
    "./commands-activities": {
      activitiesGet: async (options) => {
        calls.activitiesGet.push(options);
      },
      activitiesList: async (options) => {
        calls.activitiesList.push(options);
      },
    },
    "./commands-auth": {
      authLogin: async () => {},
      authRevoke: async () => {},
      authSetup: async () => {},
      authStatus: async () => {},
      maybeRunSetupOnFirstUse: async () => {
        calls.maybeRunSetupOnFirstUse += 1;
        return false;
      },
      setupWizard: async () => {},
      whoAmI: async () => {},
      ...authOverrides,
    },
    "./commands-bills": {
      billsGet: async () => {},
      billsList: async (options) => {
        calls.billsList.push(options);
      },
    },
    "./commands-billable-clients": {
      billableClientsList: async (options) => {
        calls.billableClientsList.push(options);
      },
    },
    "./commands-billable-matters": {
      billableMattersList: async (options) => {
        calls.billableMattersList.push(options);
      },
    },
    "./commands-contacts": {
      contactsGet: async () => {},
      contactsList: async (options) => {
        calls.contactsList.push(options);
      },
    },
    "./commands-matters": {
      mattersGet: async () => {},
      mattersList: async (options) => {
        calls.mattersList.push(options);
      },
    },
    "./commands-practice-areas": {
      practiceAreasGet: async () => {},
      practiceAreasList: async (options) => {
        calls.practiceAreasList.push(options);
      },
    },
    "./commands-users": {
      usersGet: async () => {},
      usersList: async (options) => {
        calls.usersList.push(options);
      },
    },
  });

  return { calls, restore, run: module.run };
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
      redacted: false,
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
      redacted: false,
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
      redacted: false,
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
      redacted: false,
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
      redacted: false,
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
      redacted: false,
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
      redacted: false,
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
      redacted: false,
      responsibleAttorneyId: undefined,
      startDate: undefined,
      },
    ]);
  } finally {
    restore();
  }
});

test("cli starts first-run onboarding when no args are provided and setup is needed", async () => {
  let onboardingCalls = 0;
  const { restore, run } = loadCli({
    maybeRunSetupOnFirstUse: async () => {
      onboardingCalls += 1;
      return true;
    },
  });

  try {
    const { logs } = await captureConsole(() => run([]));
    assert.equal(onboardingCalls, 1);
    assert.equal(logs.some((line) => line.includes("Usage:")), false);
  } finally {
    restore();
  }
});

test("cli prints help when no args are provided and onboarding is not needed", async () => {
  const { calls, restore, run } = loadCli();

  try {
    const { logs } = await captureConsole(() => run([]));
    assert.equal(calls.maybeRunSetupOnFirstUse, 1);
    assert.ok(logs.includes("Usage:"));
    assert.ok(logs.includes("  clio-manage <command> [options]"));
  } finally {
    restore();
  }
});

test("authSetup opens the selected regional developer portal only after Enter", async () => {
  const authHarness = loadAuthSetupTest((label, fallback) => {
    if (label === "Type yes to confirm you will review output before sharing it outside your firm") {
      return "yes";
    }
    if (label === "Region") {
      return "ca";
    }
    if (
      label === "Press Enter to open the developer portal now, or type skip to continue here"
    ) {
      return fallback;
    }
    if (label === "App Key / Client ID (from your Clio developer app)") {
      return "client-id";
    }
    if (label === "App Secret / Client Secret (from the same Clio app)") {
      return "client-secret";
    }
    if (label === "Custom redirect URI override (optional; press Enter to keep the default)") {
      return "";
    }
    throw new Error(`Unexpected prompt label: ${label}`);
  });

  try {
    const { logs } = await captureConsole(() =>
      authHarness.module.authSetup({ skipNextStepHint: true })
    );
    const output = logs.join("\n");

    assert.match(output, /This setup is for developers who are connecting the CLI to their own Clio app/);
    assert.match(output, /If this is your first time doing that, this guide will walk you through it/);
    assert.match(output, /Confidentiality notice:/);
    assert.match(output, /Review all output before sharing it with AI tools, tickets, chats, or other third parties/);
    assert.match(output, /WELCOME TO CLIO MANAGE/);
    assert.match(output, /Setup flow:/);
    assert.match(output, /Open your Clio developer app, or create one if you do not have one yet/);
    assert.match(output, /Clio app form guide:/);
    assert.match(output, /Website URL \(required\): use your firm website, company site, or GitHub repo/);
    assert.match(output, /Do not put the local callback URL in Website URL/);
    assert.match(output, /Clio Manage permissions \/ scopes: choose the access this CLI should have/);
    assert.match(output, /Redirect URIs \(required\): copy this exact URL on its own line/);
    assert.match(output, /You do not need to paste the redirect URI back into this CLI unless you want to override it/);
    assert.match(
      output,
      new RegExp(REGIONS.ca.developerPortalUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    );
    assert.match(output, /If you already have a Clio developer app in this region, you can use it/);
    assert.match(output, /Opened the Canada Clio developer portal in your browser/);
    assert.match(output, /In the developer portal:/);
    assert.match(output, /Sign in first, then open the Clio developer app you want this CLI to use/);
    assert.match(output, /Use an existing Clio developer app in this region, or create a new one/);
    assert.match(output, /Select the Clio Manage permissions \(OAuth scopes\) this CLI should access/);
    assert.match(output, /Register this exact URL in your Clio developer app/);
    assert.match(output, /Then copy the App Key and App Secret from that same app back here/);
    assert.match(
      output,
      new RegExp(DEFAULT_REDIRECT_URI.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    );
    assert.deepStrictEqual(authHarness.openCalls, [REGIONS.ca.developerPortalUrl]);
    assert.deepStrictEqual(
      authHarness.promptLabels.map((entry) => entry.label),
      [
        "Type yes to confirm you will review output before sharing it outside your firm",
        "Region",
        "Press Enter to open the developer portal now, or type skip to continue here",
        "App Key / Client ID (from your Clio developer app)",
        "App Secret / Client Secret (from the same Clio app)",
        "Custom redirect URI override (optional; press Enter to keep the default)",
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
    if (label === "Type yes to confirm you will review output before sharing it outside your firm") {
      return "yes";
    }
    if (label === "Region") {
      return "ca";
    }
    if (
      label === "Press Enter to open the developer portal now, or type skip to continue here"
    ) {
      return "skip";
    }
    if (label === "App Key / Client ID (from your Clio developer app)") {
      return "client-id";
    }
    if (label === "App Secret / Client Secret (from the same Clio app)") {
      return "client-secret";
    }
    if (label === "Custom redirect URI override (optional; press Enter to keep the default)") {
      return "";
    }
    throw new Error(`Unexpected prompt label: ${label}`);
  });

  try {
    const { logs } = await captureConsole(() =>
      authHarness.module.authSetup({ skipNextStepHint: true })
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
    if (label === "Type yes to confirm you will review output before sharing it outside your firm") {
      return "no";
    }
    throw new Error(`Unexpected prompt label: ${label}`);
  });

  try {
    await assert.rejects(
      () => authHarness.module.authSetup({ skipNextStepHint: true }),
      /Setup aborted\. Review your confidentiality and client-sharing requirements/
    );
    assert.deepStrictEqual(authHarness.openCalls, []);
    assert.equal(authHarness.clearedTokenSet, 0);
  } finally {
    authHarness.restore();
  }
});

test("authLogin rewrites invalid_client errors with actionable guidance", async () => {
  const { module, restore } = loadAuthModule({
    clioApiOverrides: {
      exchangeAuthorizationCode: async () => {
        throw new Error(
          'HTTP 401 from https://app.clio.com/oauth/token. {"error":"invalid_client","error_description":"The client identifier provided is invalid."}'
        );
      },
    },
  });

  try {
    await assert.rejects(
      () => module.authLogin(),
      /Clio rejected the app credentials during OAuth token exchange/
    );

    await assert.rejects(() => module.authLogin(), /App ID was entered instead of the App Key/);
    await assert.rejects(() => module.authLogin(), /Redirect URI: http:\/\/127\.0\.0\.1:53123\/callback/);
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
        if (label === "Type yes to confirm you will review output before sharing it outside your firm") {
          return "yes";
        }
        if (label === "Region") {
          return fallback;
        }
        if (
          label === "Press Enter to open the developer portal now, or type skip to continue here"
        ) {
          return "skip";
        }
        if (label === "App Key / Client ID (from your Clio developer app)") {
          return savedConfig.clientId;
        }
        if (label === "App Secret / Client Secret (from the same Clio app)") {
          return savedConfig.clientSecret;
        }
        if (label === "Custom redirect URI override (optional; press Enter to keep the default)") {
          return "";
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
    await module.setupWizard();
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

test("getValidAccessToken rejects expired environment tokens", async () => {
  const { module, restore } = loadClioApi();

  try {
    await assert.rejects(
      () =>
        module.getValidAccessToken(
          { clientId: "client-id", clientSecret: "client-secret", host: "app.clio.com" },
          {
            accessToken: "expired-env-token",
            expiresAt: Math.floor(Date.now() / 1000) + 30,
            source: "env",
          }
        ),
      /expired or near expiry/
    );
  } finally {
    restore();
  }
});
