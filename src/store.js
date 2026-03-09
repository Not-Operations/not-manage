const {
  DEFAULT_REDIRECT_URI,
  DEFAULT_REGION,
  REGIONS,
} = require("./constants");
const { deleteSecret, getSecret, setSecret } = require("./keychain");

const ACCOUNTS = {
  region: "config:region",
  clientId: "config:client_id",
  clientSecret: "config:client_secret",
  redirectUri: "config:redirect_uri",
  tokens: "tokens:default",
};

function normalizeRegion(regionInput) {
  const code = String(regionInput || "")
    .trim()
    .toLowerCase();

  if (!REGIONS[code]) {
    const valid = Object.keys(REGIONS).join(", ");
    throw new Error(`Unsupported region "${regionInput}". Use one of: ${valid}`);
  }

  return code;
}

function parseRedirectUri(redirectUri) {
  let parsed;
  try {
    parsed = new URL(redirectUri);
  } catch (_error) {
    throw new Error("Redirect URI must be a valid URL.");
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Redirect URI must start with http:// or https://");
  }

  return parsed.toString();
}

function buildConfig(region, clientId, clientSecret, redirectUri, source) {
  const regionCode = normalizeRegion(region || DEFAULT_REGION);
  const regionInfo = REGIONS[regionCode];

  if (!clientId || !clientSecret) {
    throw new Error(
      "Client credentials are missing. Run `clio-manage setup` or `clio-manage auth setup`."
    );
  }

  return {
    source,
    region: regionCode,
    regionLabel: regionInfo.label,
    host: regionInfo.host,
    clientId,
    clientSecret,
    redirectUri: parseRedirectUri(redirectUri || DEFAULT_REDIRECT_URI),
  };
}

function readEnvConfig() {
  const region = process.env.CLIO_REGION;
  const clientId = process.env.CLIO_CLIENT_ID;
  const clientSecret = process.env.CLIO_CLIENT_SECRET;
  const redirectUri = process.env.CLIO_REDIRECT_URI;
  const hasAny = Boolean(region || clientId || clientSecret || redirectUri);

  if (!hasAny) {
    return null;
  }

  if (!region || !clientId || !clientSecret) {
    throw new Error(
      "Partial env config detected. Set CLIO_REGION, CLIO_CLIENT_ID, and CLIO_CLIENT_SECRET together."
    );
  }

  return buildConfig(region, clientId, clientSecret, redirectUri, "env");
}

function readEnvTokens() {
  const accessToken = process.env.CLIO_ACCESS_TOKEN;
  const refreshToken = process.env.CLIO_REFRESH_TOKEN;
  const expiresAtRaw = process.env.CLIO_EXPIRES_AT;

  if (!accessToken) {
    return null;
  }

  return {
    source: "env",
    accessToken,
    refreshToken: refreshToken || null,
    expiresAt: expiresAtRaw ? Number(expiresAtRaw) : null,
    tokenType: "Bearer",
  };
}

async function getStoredConfig() {
  const [region, clientId, clientSecret, redirectUri] = await Promise.all([
    getSecret(ACCOUNTS.region),
    getSecret(ACCOUNTS.clientId),
    getSecret(ACCOUNTS.clientSecret),
    getSecret(ACCOUNTS.redirectUri),
  ]);

  if (!region || !clientId || !clientSecret) {
    return null;
  }

  return buildConfig(
    region,
    clientId,
    clientSecret,
    redirectUri || DEFAULT_REDIRECT_URI,
    "keychain"
  );
}

async function saveConfig(configInput) {
  const config = buildConfig(
    configInput.region,
    configInput.clientId,
    configInput.clientSecret,
    configInput.redirectUri || DEFAULT_REDIRECT_URI,
    "keychain"
  );

  await Promise.all([
    setSecret(ACCOUNTS.region, config.region),
    setSecret(ACCOUNTS.clientId, config.clientId),
    setSecret(ACCOUNTS.clientSecret, config.clientSecret),
    setSecret(ACCOUNTS.redirectUri, config.redirectUri),
  ]);

  return config;
}

async function getConfig() {
  const config = await findConfig();
  if (config) {
    return config;
  }

  throw new Error(
    "Clio app credentials are not configured. Run `clio-manage setup`."
  );
}

async function findConfig() {
  const envConfig = readEnvConfig();
  if (envConfig) {
    return envConfig;
  }

  const storedConfig = await getStoredConfig();
  if (storedConfig) {
    return storedConfig;
  }

  return null;
}

function normalizeTokenSet(rawTokenSet, previousTokenSet) {
  if (!rawTokenSet || !rawTokenSet.access_token) {
    throw new Error("Clio token response is missing access_token.");
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  const expiresIn = Number(rawTokenSet.expires_in || 0);
  const expiresAt = expiresIn > 0 ? nowSeconds + expiresIn : null;

  return {
    source: "keychain",
    tokenType: rawTokenSet.token_type || "Bearer",
    accessToken: rawTokenSet.access_token,
    refreshToken: rawTokenSet.refresh_token || previousTokenSet?.refreshToken || null,
    expiresAt,
  };
}

async function saveTokenSet(tokenSetInput, previousTokenSet = null) {
  const tokenSet = normalizeTokenSet(tokenSetInput, previousTokenSet);
  await setSecret(ACCOUNTS.tokens, JSON.stringify(tokenSet));
  return tokenSet;
}

async function getStoredTokenSet() {
  const raw = await getSecret(ACCOUNTS.tokens);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    return {
      source: "keychain",
      tokenType: parsed.tokenType || "Bearer",
      accessToken: parsed.accessToken || null,
      refreshToken: parsed.refreshToken || null,
      expiresAt: parsed.expiresAt || null,
    };
  } catch (_error) {
    throw new Error(
      "Stored token data is invalid. Run `clio-manage auth revoke` then `clio-manage auth login`."
    );
  }
}

async function getTokenSet() {
  const envTokens = readEnvTokens();
  if (envTokens) {
    return envTokens;
  }

  return getStoredTokenSet();
}

async function clearTokenSet() {
  await deleteSecret(ACCOUNTS.tokens);
}

module.exports = {
  clearTokenSet,
  findConfig,
  getConfig,
  getTokenSet,
  normalizeRegion,
  parseRedirectUri,
  saveConfig,
  saveTokenSet,
};
