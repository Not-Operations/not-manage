const { saveTokenSet } = require("./store");

function createError(message, responseText) {
  const suffix = responseText ? ` ${responseText}` : "";
  return new Error(`${message}.${suffix}`.trim());
}

async function postForm(url, formFields, headers = {}) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      ...headers,
    },
    body: new URLSearchParams(formFields).toString(),
  });

  const text = await response.text();
  let payload = null;

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch (_error) {
      payload = text;
    }
  }

  if (!response.ok) {
    throw createError(
      `HTTP ${response.status} from ${url}`,
      typeof payload === "string" ? payload : JSON.stringify(payload)
    );
  }

  return payload;
}

async function getJson(url, headers = {}) {
  const response = await fetch(url, {
    headers,
  });

  const text = await response.text();
  let payload = null;

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch (_error) {
      payload = text;
    }
  }

  if (!response.ok) {
    throw createError(
      `HTTP ${response.status} from ${url}`,
      typeof payload === "string" ? payload : JSON.stringify(payload)
    );
  }

  return payload;
}

function authBaseUrl(config) {
  return `https://${config.host}`;
}

function buildUrlWithQuery(baseUrl, query = {}) {
  const url = new URL(baseUrl);

  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item !== undefined && item !== null && item !== "") {
          url.searchParams.append(key, String(item));
        }
      });
      return;
    }

    url.searchParams.set(key, String(value));
  });

  return url.toString();
}

function tokenUrl(config) {
  return `${authBaseUrl(config)}/oauth/token`;
}

function authorizeUrl(config, state) {
  const url = new URL(`${authBaseUrl(config)}/oauth/authorize`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("state", state);
  return url.toString();
}

async function exchangeAuthorizationCode(config, code) {
  return postForm(tokenUrl(config), {
    grant_type: "authorization_code",
    code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: config.redirectUri,
  });
}

async function refreshAccessToken(config, tokenSet) {
  if (!tokenSet.refreshToken) {
    throw new Error("Missing refresh token. Run `clio-manage auth login`.");
  }

  const refreshed = await postForm(tokenUrl(config), {
    grant_type: "refresh_token",
    refresh_token: tokenSet.refreshToken,
    client_id: config.clientId,
    client_secret: config.clientSecret,
  });

  return saveTokenSet(refreshed, tokenSet);
}

async function getValidAccessToken(config, tokenSet) {
  if (!tokenSet || !tokenSet.accessToken) {
    throw new Error("You are not logged in. Run `clio-manage auth login`.");
  }

  const now = Math.floor(Date.now() / 1000);
  const expiresSoon =
    tokenSet.expiresAt && Number(tokenSet.expiresAt) <= now + 60;

  if (!expiresSoon) {
    return tokenSet.accessToken;
  }

  if (tokenSet.source === "env") {
    throw new Error(
      "CLIO_ACCESS_TOKEN is expired or near expiry. Update your env vars or use keychain-backed login."
    );
  }

  const refreshed = await refreshAccessToken(config, tokenSet);
  return refreshed.accessToken;
}

async function fetchWhoAmI(config, accessToken) {
  const url = `${authBaseUrl(config)}/api/v4/users/who_am_i`;
  return getJson(url, {
    authorization: `Bearer ${accessToken}`,
  });
}

async function deauthorize(config, accessToken) {
  const url = `${authBaseUrl(config)}/oauth/deauthorize`;
  return postForm(
    url,
    {
      token: accessToken,
      client_id: config.clientId,
      client_secret: config.clientSecret,
    },
    {
      authorization: `Bearer ${accessToken}`,
    }
  );
}

function mattersUrl(config, query = {}) {
  return buildUrlWithQuery(`${authBaseUrl(config)}/api/v4/matters.json`, query);
}

async function fetchMattersPage(config, accessToken, query = {}, nextPageUrl = null) {
  const url = nextPageUrl || mattersUrl(config, query);
  return getJson(url, {
    authorization: `Bearer ${accessToken}`,
  });
}

module.exports = {
  authorizeUrl,
  deauthorize,
  exchangeAuthorizationCode,
  fetchMattersPage,
  fetchWhoAmI,
  getValidAccessToken,
};
