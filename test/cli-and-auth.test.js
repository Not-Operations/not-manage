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
    billsList: [],
    contactsList: [],
    mattersList: [],
    maybeRunSetupOnFirstUse: 0,
    practiceAreasList: [],
    usersList: [],
  };

  const { module, restore } = loadWithMocks(path.join(ROOT, "src/cli.js"), {
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
      ask: async () => null,
      withPrompt: async (callback) => callback({}),
      ...promptOverrides,
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
        updatedSince: undefined,
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
    if (label === "Region") {
      return "ca";
    }
    if (label === "Press Enter to open the developer portal now, or type skip to continue here") {
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
    assert.match(output, /WELCOME TO CLIO MANAGE/);
    assert.match(output, /Setup flow:/);
    assert.match(output, /Use an existing developer app, or create a new one if you do not have one yet/);
    assert.match(output, /Register this exact URL in your Clio developer app/);
    assert.match(output, /You do not need to paste it back into this CLI unless you want to override it/);
    assert.match(
      output,
      new RegExp(REGIONS.ca.developerPortalUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    );
    assert.match(output, /If you already have a Clio developer app in this region, you can use it/);
    assert.match(output, /Opened the Canada Clio developer portal in your browser/);
    assert.match(
      output,
      new RegExp(DEFAULT_REDIRECT_URI.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    );
    assert.deepStrictEqual(authHarness.openCalls, [REGIONS.ca.developerPortalUrl]);
    assert.deepStrictEqual(
      authHarness.promptLabels.map((entry) => entry.label),
      [
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
    if (label === "Region") {
      return "ca";
    }
    if (label === "Press Enter to open the developer portal now, or type skip to continue here") {
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
        if (label === "Region") {
          return fallback;
        }
        if (label === "Press Enter to open the developer portal now, or type skip to continue here") {
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
