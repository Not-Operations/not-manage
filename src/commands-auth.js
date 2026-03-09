const crypto = require("node:crypto");
const {
  CLIO_APP_CREATION_GUIDE_URL,
  CLIO_AUTHORIZATION_GUIDE_URL,
  CLIO_DEVELOPER_ACCOUNT_GUIDE_URL,
  DEFAULT_REDIRECT_URI,
  DEFAULT_REGION,
  REGIONS,
} = require("./constants");
const {
  authorizeUrl,
  deauthorize,
  exchangeAuthorizationCode,
  fetchWhoAmI,
  fetchUser,
  getValidAccessToken,
} = require("./clio-api");
const { openBrowser } = require("./open-browser");
const { waitForOAuthCallback } = require("./oauth-callback");
const { ask, withPrompt } = require("./prompt");
const {
  clearTokenSet,
  findConfig,
  getConfig,
  getTokenSet,
  normalizeRegion,
  parseRedirectUri,
  saveConfig,
  saveTokenSet,
} = require("./store");

function formatUserSummary(payload) {
  const data = payload?.data || {};
  const user = data?.user || data;
  const id = user?.id || "unknown";
  const name =
    user?.name ||
    [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim() ||
    "unknown";
  const email = user?.email || user?.email_address || "unknown";
  return { id, name, email };
}

async function hydrateUserSummary(config, accessToken, user) {
  if (!user || user.email !== "unknown" || user.id === "unknown") {
    return user;
  }

  try {
    const detailPayload = await fetchUser(config, accessToken, user.id, {
      fields: "id,name,first_name,last_name,email",
    });
    const detailedUser = formatUserSummary(detailPayload);
    return {
      ...user,
      ...detailedUser,
      email: detailedUser.email || user.email,
    };
  } catch (_error) {
    return user;
  }
}

async function fetchCurrentUserSummary(config, accessToken) {
  const payload = await fetchWhoAmI(config, accessToken);
  const user = await hydrateUserSummary(config, accessToken, formatUserSummary(payload));
  return { payload, user };
}

function maskCredential(value) {
  const text = String(value || "");
  if (!text) {
    return "not set";
  }

  if (text.length <= 8) {
    return `${"*".repeat(Math.max(text.length - 2, 0))}${text.slice(-2)}`;
  }

  return `${text.slice(0, 4)}...${text.slice(-4)}`;
}

function formatConfigSummary(config) {
  return [
    `Config source: ${config.source}`,
    `Region: ${config.region} (${config.regionLabel})`,
    `Host: ${config.host}`,
    `Redirect URI: ${config.redirectUri}`,
    `App Key: ${maskCredential(config.clientId)}`,
  ];
}

function rewriteOAuthError(error, config) {
  const message = error && error.message ? error.message : String(error);

  if (message.includes("invalid_client")) {
    return new Error(
      [
        "Clio rejected the app credentials during OAuth token exchange (`invalid_client`).",
        ...formatConfigSummary(config),
        "Most likely causes:",
        "- The App Secret is wrong or was copied from a different Clio app.",
        "- The App ID was entered instead of the App Key.",
        "- The App Key/App Secret pair does not belong to the selected Clio region.",
        "- The redirect URI registered in the Clio app does not exactly match the value above.",
        "Run `clio-manage auth setup` again and copy the App Key and App Secret from the same Clio developer app.",
        `Original error: ${message}`,
      ].join("\n")
    );
  }

  return error;
}

function printSetupBanner() {
  console.log("+===========================================+");
  console.log("|           WELCOME TO CLIO MANAGE          |");
  console.log("+===========================================+");
  console.log("|      Local OAuth setup for this CLI       |");
  console.log("+===========================================+");
}

function printSetupSteps() {
  console.log("Setup flow:");
  console.log("  [1] Choose your Clio region");
  console.log("  [2] Open the Clio developer portal for that region");
  console.log("  [3] Use an existing developer app, or create a new one if you do not have one yet");
  console.log("  [4] Copy the App Key and App Secret from that same app");
  console.log("  [5] Keep the default local redirect URI unless you already know you need a custom loopback URL");
}

async function maybeOpenDeveloperPortal(rl, region) {
  const regionInfo = REGIONS[region];
  const promptLabel = "Press Enter to open the developer portal now, or type skip to continue here";
  const answer = String(await ask(rl, promptLabel, "")).trim().toLowerCase();

  if (answer === "skip") {
    console.log("Continuing without opening the browser.");
    return;
  }

  try {
    await openBrowser(regionInfo.developerPortalUrl);
    console.log(`Opened the ${regionInfo.label} Clio developer portal in your browser.`);
  } catch (_error) {
    console.log("Could not open the Clio developer portal automatically.");
    console.log(`Open this URL manually: ${regionInfo.developerPortalUrl}`);
  }
}

function printSetupLinks(region, redirectUri) {
  const regionInfo = REGIONS[region];
  console.log("Clio setup links:");
  console.log(`- Developer portal: ${regionInfo.developerPortalUrl}`);
  console.log(`- Developer account guide: ${CLIO_DEVELOPER_ACCOUNT_GUIDE_URL}`);
  console.log(`- App creation guide: ${CLIO_APP_CREATION_GUIDE_URL}`);
  console.log(`- Authorization guide: ${CLIO_AUTHORIZATION_GUIDE_URL}`);
  console.log(`- Add this redirect URI in your Clio app: ${redirectUri}`);
}

function printSetupIntro(redirectUri) {
  printSetupBanner();
  console.log("");
  console.log("This setup is for developers who are connecting the CLI to their own Clio app.");
  console.log("If this is your first time doing that, this guide will walk you through it.");
  console.log("");
  printSetupSteps();
  console.log("");
  console.log("Useful links:");
  console.log(`- Developer account guide: ${CLIO_DEVELOPER_ACCOUNT_GUIDE_URL}`);
  console.log(`- App creation guide: ${CLIO_APP_CREATION_GUIDE_URL}`);
  console.log(`- OAuth guide: ${CLIO_AUTHORIZATION_GUIDE_URL}`);
  console.log("");
  console.log("Redirect URI:");
  console.log("  Register this exact URL in your Clio developer app.");
  console.log(`- ${redirectUri}`);
  console.log("  You do not need to paste it back into this CLI unless you want to override it.");
  console.log("");
  console.log("Region options:");
  Object.values(REGIONS).forEach((region) => {
    console.log(`- ${region.code}: ${region.label} (${region.host})`);
  });
}

async function authSetup(options = {}) {
  printSetupIntro(DEFAULT_REDIRECT_URI);
  console.log("");

  const configInput = await withPrompt(async (rl) => {
    const regionRaw = await ask(rl, "Region", DEFAULT_REGION);
    const region = normalizeRegion(regionRaw);
    const regionInfo = REGIONS[region];

    console.log(`Using ${regionInfo.label} (${regionInfo.host}).`);
    console.log(`Developer portal: ${regionInfo.developerPortalUrl}`);
    console.log("If you already have a Clio developer app in this region, you can use it.");
    console.log("If not, create one there first, then come back here.");
    await maybeOpenDeveloperPortal(rl, region);
    console.log("Next, copy the App Key and App Secret from that same Clio developer app.");

    const clientId = await ask(rl, "App Key / Client ID (from your Clio developer app)");
    if (!clientId) {
      throw new Error("App Key / Client ID is required.");
    }

    const clientSecret = await ask(rl, "App Secret / Client Secret (from the same Clio app)");
    if (!clientSecret) {
      throw new Error("App Secret / Client Secret is required.");
    }

    const redirectUriOverride = await ask(
      rl,
      "Custom redirect URI override (optional; press Enter to keep the default)"
    );
    const redirectUri = parseRedirectUri(redirectUriOverride || DEFAULT_REDIRECT_URI);
    return {
      region,
      clientId,
      clientSecret,
      redirectUri,
    };
  });

  const saved = await saveConfig(configInput);
  await clearTokenSet();

  console.log("");
  console.log("Saved credentials to secure keychain.");
  console.log(`Region: ${saved.region} (${REGIONS[saved.region].label})`);
  printSetupLinks(saved.region, saved.redirectUri);

  if (!options.skipNextStepHint) {
    console.log("");
    console.log("Next step: run `clio-manage auth login`");
  }

  return saved;
}

async function authLogin(options = {}) {
  const config = options.config || (await getConfig());
  const state = crypto.randomBytes(16).toString("hex");
  const authUrl = authorizeUrl(config, state);

  console.log(`Config source: ${config.source}`);
  console.log(`Starting OAuth for region ${config.region} (${config.regionLabel}).`);
  console.log(`Using host ${config.host}`);
  console.log(`Waiting for callback on ${config.redirectUri}`);

  const callbackPromise = waitForOAuthCallback(config.redirectUri, state);

  try {
    await openBrowser(authUrl);
    console.log("Opened browser for Clio authorization.");
  } catch (_error) {
    console.log("Could not open browser automatically. Open this URL manually:");
    console.log(authUrl);
  }

  const callback = await callbackPromise;
  let tokenPayload;

  try {
    tokenPayload = await exchangeAuthorizationCode(config, callback.code);
  } catch (error) {
    throw rewriteOAuthError(error, config);
  }

  const tokenSet = await saveTokenSet(tokenPayload);
  const accessToken = await getValidAccessToken(config, tokenSet);
  const { user } = await fetchCurrentUserSummary(config, accessToken);

  console.log("");
  console.log("Clio login complete.");
  console.log(`Connected user: ${user.name} <${user.email}> (id: ${user.id})`);
}

async function authStatus(options = {}) {
  const config = await getConfig();
  const tokenSet = await getTokenSet();

  if (!tokenSet || !tokenSet.accessToken) {
    console.log(`Config source: ${config.source}`);
    console.log(`Region: ${config.region} (${config.regionLabel})`);
    console.log("Login status: not logged in");
    console.log("Run `clio-manage auth login`.");
    return;
  }

  const accessToken = await getValidAccessToken(config, tokenSet);
  const { user } = await fetchCurrentUserSummary(config, accessToken);

  if (options.json) {
    console.log(
      JSON.stringify(
        {
          configSource: config.source,
          tokenSource: tokenSet.source,
          region: config.region,
          host: config.host,
          user,
        },
        null,
        2
      )
    );
    return;
  }

  console.log(`Config source: ${config.source}`);
  console.log(`Token source: ${tokenSet.source}`);
  console.log(`Region: ${config.region} (${config.regionLabel})`);
  console.log(`Host: ${config.host}`);
  console.log(`Login status: connected`);
  console.log(`Connected user: ${user.name} <${user.email}> (id: ${user.id})`);
}

async function authRevoke() {
  const config = await getConfig();
  const tokenSet = await getTokenSet();

  if (!tokenSet || !tokenSet.accessToken) {
    console.log("No local token found. Nothing to revoke.");
    return;
  }

  try {
    const accessToken = await getValidAccessToken(config, tokenSet);
    await deauthorize(config, accessToken);
    console.log("Revoked token in Clio.");
  } catch (error) {
    console.log(`Clio deauthorize call failed: ${error.message}`);
    console.log("Clearing local token anyway.");
  }

  if (tokenSet.source === "env") {
    console.log("Token came from environment variables; nothing removed from keychain.");
    return;
  }

  await clearTokenSet();
  console.log("Local keychain token cleared.");
}

async function whoAmI(options = {}) {
  const config = await getConfig();
  const tokenSet = await getTokenSet();
  const accessToken = await getValidAccessToken(config, tokenSet);
  const { payload, user } = await fetchCurrentUserSummary(config, accessToken);

  if (options.json) {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  console.log(`User: ${user.name}`);
  console.log(`Email: ${user.email}`);
  console.log(`ID: ${user.id}`);
}

async function setupWizard() {
  const config = await authSetup({ skipNextStepHint: true });
  console.log("");
  console.log("Continuing with OAuth login...");
  await authLogin({ config });
}

async function maybeRunSetupOnFirstUse() {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    return false;
  }

  const config = await findConfig();
  if (config) {
    return false;
  }

  console.log("No Clio app credentials are configured yet.");
  console.log("Starting guided setup...");
  console.log("");
  await setupWizard();
  return true;
}

module.exports = {
  authLogin,
  authRevoke,
  authSetup,
  authStatus,
  maybeRunSetupOnFirstUse,
  setupWizard,
  whoAmI,
  __private: {
    fetchCurrentUserSummary,
    formatUserSummary,
    hydrateUserSummary,
  },
};
