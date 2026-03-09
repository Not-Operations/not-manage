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

function printSetupLinks(redirectUri) {
  console.log("Clio setup links:");
  console.log(`- Developer account guide: ${CLIO_DEVELOPER_ACCOUNT_GUIDE_URL}`);
  console.log(`- App creation guide: ${CLIO_APP_CREATION_GUIDE_URL}`);
  console.log(`- Authorization guide: ${CLIO_AUTHORIZATION_GUIDE_URL}`);
  console.log(`- Add this redirect URI in your Clio app: ${redirectUri}`);
}

function printSetupIntro(redirectUri) {
  console.log("Clio local setup");
  console.log("");
  console.log("This CLI connects to Clio using your own Clio Developer Application.");
  console.log("Before you continue, create a Clio app and copy its Client ID and Client Secret.");
  console.log("");
  console.log("Useful links:");
  console.log(`- Developer account guide: ${CLIO_DEVELOPER_ACCOUNT_GUIDE_URL}`);
  console.log(`- App creation guide: ${CLIO_APP_CREATION_GUIDE_URL}`);
  console.log(`- OAuth guide: ${CLIO_AUTHORIZATION_GUIDE_URL}`);
  console.log("");
  console.log("You will need to register this redirect URI in your Clio app:");
  console.log(`- ${redirectUri}`);
  console.log("");
  console.log("Region options:");
  Object.values(REGIONS).forEach((region) => {
    console.log(`- ${region.code}: ${region.label} (${region.host})`);
  });
}

async function authSetup(options = {}) {
  printSetupIntro(DEFAULT_REDIRECT_URI);
  console.log("");

  if (options.openGuide !== false) {
    try {
      await openBrowser(CLIO_APP_CREATION_GUIDE_URL);
      console.log("Opened the Clio app creation guide in your browser.");
      console.log("");
    } catch (_error) {
      console.log("Could not open the Clio app creation guide automatically.");
      console.log(`Open this URL manually: ${CLIO_APP_CREATION_GUIDE_URL}`);
      console.log("");
    }
  }

  const configInput = await withPrompt(async (rl) => {
    const regionRaw = await ask(rl, "Region", DEFAULT_REGION);
    const region = normalizeRegion(regionRaw);
    console.log(`Using ${REGIONS[region].label} (${REGIONS[region].host}).`);
    console.log("Copy the next two values from the Clio Developer Application you just created.");

    const clientId = await ask(rl, "Client ID (from your Clio developer app)");
    if (!clientId) {
      throw new Error("Client ID is required.");
    }

    const clientSecret = await ask(rl, "Client Secret (from the same Clio app)");
    if (!clientSecret) {
      throw new Error("Client Secret is required.");
    }

    const redirectUriRaw = await ask(rl, "Redirect URI", DEFAULT_REDIRECT_URI);
    const redirectUri = parseRedirectUri(redirectUriRaw);
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
  printSetupLinks(saved.redirectUri);

  if (!options.skipNextStepHint) {
    console.log("");
    console.log("Next step: run `clio-manage auth login`");
  }
}

async function authLogin() {
  const config = await getConfig();
  const state = crypto.randomBytes(16).toString("hex");
  const authUrl = authorizeUrl(config, state);

  console.log(`Starting OAuth for region ${config.region} (${config.regionLabel}).`);
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
  const tokenPayload = await exchangeAuthorizationCode(config, callback.code);
  const tokenSet = await saveTokenSet(tokenPayload);
  const accessToken = await getValidAccessToken(config, tokenSet);
  const whoAmI = await fetchWhoAmI(config, accessToken);
  const user = formatUserSummary(whoAmI);

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
  const whoAmI = await fetchWhoAmI(config, accessToken);
  const user = formatUserSummary(whoAmI);

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
  const payload = await fetchWhoAmI(config, accessToken);
  const user = formatUserSummary(payload);

  if (options.json) {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  console.log(`User: ${user.name}`);
  console.log(`Email: ${user.email}`);
  console.log(`ID: ${user.id}`);
}

async function setupWizard() {
  await authSetup({ skipNextStepHint: true });
  console.log("");
  console.log("Continuing with OAuth login...");
  await authLogin();
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
};
