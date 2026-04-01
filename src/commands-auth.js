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
const { ask, askSecret, withPrompt } = require("./prompt");
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

function maskEmail(value) {
  const text = String(value || "").trim();
  const atIndex = text.indexOf("@");

  if (!text || text === "unknown" || atIndex <= 0 || atIndex === text.length - 1) {
    return text || "unknown";
  }

  const localPart = text.slice(0, atIndex);
  const domain = text.slice(atIndex);
  return `${localPart.slice(0, 1)}${"*".repeat(Math.max(localPart.length - 1, 0))}${domain}`;
}

function maskUserSummary(user) {
  if (!user) {
    return user;
  }

  return {
    ...user,
    email: maskEmail(user.email),
  };
}

function resolveRegionInfo(regionCode) {
  if (regionCode && REGIONS[regionCode]) {
    return REGIONS[regionCode];
  }

  return {
    code: regionCode || "unknown",
    label: regionCode || "unknown",
    host: "unknown",
  };
}

function buildAuthDisplayContext(config, tokenSet = null, user = null) {
  const regionInfo = resolveRegionInfo(config?.region);

  return {
    configSource: config?.source === "keychain" ? "keychain" : String(config?.source || "unknown"),
    host: regionInfo.host,
    redirectUri:
      config?.redirectUri === DEFAULT_REDIRECT_URI
        ? DEFAULT_REDIRECT_URI
        : "custom loopback redirect configured",
    region: regionInfo.code,
    regionLabel: regionInfo.label,
    tokenSource:
      tokenSet?.source === "keychain" ? "keychain" : String(tokenSet?.source || "unknown"),
    user: maskUserSummary(user),
  };
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
        "Run `not-manage auth setup` again and copy the App Key and App Secret from the same Clio developer app.",
        `Original error: ${message}`,
      ].join("\n")
    );
  }

  return error;
}

function collectSecurityWarnings(config, tokenSet) {
  return [];
}

function printSetupBanner() {
  console.log("--- not-manage setup ---");
  console.log("");
  console.log("Connect this CLI to your Clio developer app.");
}

async function maybeOpenDeveloperPortal(rl, region) {
  const regionInfo = REGIONS[region];
  const promptLabel = "Press Enter to open the developer portal, or type skip";
  const answer = String(await ask(rl, promptLabel, "")).trim().toLowerCase();

  if (answer === "skip") {
    console.log("Continuing without opening the browser.");
    return;
  }

  try {
    await openBrowser(regionInfo.developerPortalUrl);
    console.log(`Opened ${regionInfo.label} developer portal in your browser.`);
  } catch (_error) {
    console.log("Could not open browser automatically.");
    console.log(`Open this URL manually: ${regionInfo.developerPortalUrl}`);
  }
}

function printSetupLinks(region, redirectUri) {
  const regionInfo = REGIONS[region];
  console.log("Links:");
  console.log(`  Portal:    ${regionInfo.developerPortalUrl}`);
  console.log(`  Guides:    ${CLIO_DEVELOPER_ACCOUNT_GUIDE_URL}`);
  console.log(`             ${CLIO_APP_CREATION_GUIDE_URL}`);
  console.log(`             ${CLIO_AUTHORIZATION_GUIDE_URL}`);
  console.log(`  Redirect:  ${redirectUri}`);
}

function printPortalSteps(redirectUri) {
  console.log("In the developer portal:");
  console.log("  1. Open or create a Clio developer app");
  console.log("  2. Set permissions (scopes) for this CLI");
  console.log("  3. Add this redirect URI:");
  console.log(`     ${redirectUri}`);
  console.log("  4. Copy the App Key and App Secret back here");
}

function printConfidentialityNotice() {
  console.log("Output may contain confidential client data.");
  console.log("Redaction (--redacted) is best-effort. Review all output before sharing.");
}

function printSetupIntro() {
  printSetupBanner();
  console.log("");
  printConfidentialityNotice();
}

async function confirmConfidentialityNotice(rl) {
  const answer = String(
    await ask(
      rl,
      "Type yes to confirm you will review output before sharing it outside your firm"
    )
  )
    .trim()
    .toLowerCase();

  if (answer !== "yes") {
    throw new Error(
      "Setup aborted. Review your confidentiality and client-sharing requirements, then rerun `not-manage auth setup`."
    );
  }
}

async function authSetup(options = {}) {
  printSetupIntro();
  console.log("");

  const configInput = await withPrompt(async (rl) => {
    await confirmConfidentialityNotice(rl);

    console.log("");
    console.log("Regions: " + Object.values(REGIONS).map((r) => `${r.code} (${r.label})`).join(", "));
    const regionRaw = await ask(rl, "Region", DEFAULT_REGION);
    const region = normalizeRegion(regionRaw);
    const regionInfo = REGIONS[region];

    console.log("");
    console.log(`Using ${regionInfo.label} (${regionInfo.host}).`);
    await maybeOpenDeveloperPortal(rl, region);

    console.log("");
    printPortalSteps(DEFAULT_REDIRECT_URI);
    console.log("");

    const clientId = await ask(rl, "App Key / Client ID");
    if (!clientId) {
      throw new Error("App Key / Client ID is required.");
    }

    const clientSecret = await askSecret(rl, "App Secret / Client Secret");
    if (!clientSecret) {
      throw new Error("App Secret / Client Secret is required.");
    }

    const redirectUriOverride = await ask(
      rl,
      "Custom redirect URI (Enter to keep default)"
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
  console.log("Saved to keychain.");
  console.log(`Region: ${saved.region} (${REGIONS[saved.region].label})`);
  console.log("");
  printSetupLinks(saved.region, saved.redirectUri);

  if (!options.skipNextStepHint) {
    console.log("");
    console.log("Next step: run `not-manage auth login`");
  }

  return saved;
}

async function authLogin(options = {}) {
  const config = options.config || (await getConfig());
  const state = crypto.randomBytes(16).toString("hex");
  const authUrl = authorizeUrl(config, state);
  const authContext = buildAuthDisplayContext(config);

  console.log(`Config source: ${authContext.configSource}`);
  console.log(`Starting OAuth for region ${authContext.region} (${authContext.regionLabel}).`);
  console.log(`Using host ${authContext.host}`);
  console.log(`Waiting for callback on ${authContext.redirectUri}`);

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
  const maskedUser = maskUserSummary(user);

  console.log("");
  console.log("Clio login complete.");
  console.log(`Connected user: ${maskedUser.name} <${maskedUser.email}> (id: ${maskedUser.id})`);
}

async function authStatus(options = {}) {
  const config = await getConfig();
  const tokenSet = await getTokenSet();
  const disconnectedContext = buildAuthDisplayContext(config);

  if (!tokenSet || !tokenSet.accessToken) {
    console.log(`Config source: ${disconnectedContext.configSource}`);
    console.log(`Region: ${disconnectedContext.region} (${disconnectedContext.regionLabel})`);
    console.log("Login status: not logged in");
    console.log("Run `not-manage auth login`.");
    return;
  }

  const accessToken = await getValidAccessToken(config, tokenSet);
  const { user } = await fetchCurrentUserSummary(config, accessToken);
  const warnings = collectSecurityWarnings(config, tokenSet);
  const authContext = buildAuthDisplayContext(config, tokenSet, user);

  if (options.json) {
    console.log(
      JSON.stringify(
        {
          configSource: authContext.configSource,
          tokenSource: authContext.tokenSource,
          region: authContext.region,
          host: authContext.host,
          user: authContext.user,
        },
        null,
        2
      )
    );
    return;
  }

  console.log(`Config source: ${authContext.configSource}`);
  console.log(`Token source: ${authContext.tokenSource}`);
  console.log(`Region: ${authContext.region} (${authContext.regionLabel})`);
  console.log(`Host: ${authContext.host}`);
  console.log(`Login status: connected`);
  console.log(
    `Connected user: ${authContext.user.name} <${authContext.user.email}> (id: ${authContext.user.id})`
  );
  warnings.forEach((warning) => {
    console.log(`Security warning: ${warning}`);
  });
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

  console.log("No credentials found. Starting setup...");
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
    buildAuthDisplayContext,
    collectSecurityWarnings,
    fetchCurrentUserSummary,
    formatUserSummary,
    hydrateUserSummary,
    maskEmail,
    maskUserSummary,
  },
};
