const { saveTokenSet } = require("./store");

function createError(message, responseText) {
  const suffix = responseText ? ` ${responseText}` : "";
  return new Error(`${message}.${suffix}`.trim());
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
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

async function postJson(url, body, headers = {}) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
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

function apiBaseUrl(config) {
  return `${authBaseUrl(config)}/api/v4`;
}

function parseTrustedApiUrl(config, url, expectedPathPrefix = "/api/v4/") {
  let parsed;
  try {
    parsed = new URL(url);
  } catch (_error) {
    throw new Error(`Received an invalid URL from Clio: ${url}`);
  }

  if (parsed.protocol !== "https:") {
    throw new Error(`Refusing to call a non-HTTPS URL returned by Clio: ${url}`);
  }

  if (parsed.hostname !== config.host) {
    throw new Error(
      `Refusing to send Clio credentials to an unexpected host: ${parsed.hostname}`
    );
  }

  if (parsed.username || parsed.password) {
    throw new Error("Refusing to use a Clio URL that contains embedded credentials.");
  }

  if (expectedPathPrefix && !parsed.pathname.startsWith(expectedPathPrefix)) {
    throw new Error(
      `Refusing to call an unexpected Clio API path: ${parsed.pathname}`
    );
  }

  return parsed.toString();
}

function buildUrlWithQuery(baseUrl, query = {}) {
  const url = new URL(baseUrl);

  function appendQueryValue(key, value) {
    if (value === undefined || value === null || value === "") {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item) => {
        appendQueryValue(key, item);
      });
      return;
    }

    if (isPlainObject(value)) {
      Object.entries(value).forEach(([nestedKey, nestedValue]) => {
        if (nestedValue === undefined || nestedValue === null || nestedValue === "") {
          return;
        }

        const compositeKey = `${key}[${nestedKey}]`;
        if (Array.isArray(nestedValue)) {
          const serialized = nestedValue
            .filter((item) => item !== undefined && item !== null && item !== "")
            .map((item) => String(item));
          if (serialized.length > 0) {
            url.searchParams.append(compositeKey, `[${serialized.join(", ")}]`);
          }
          return;
        }

        appendQueryValue(compositeKey, nestedValue);
      });
      return;
    }

    url.searchParams.append(key, String(value));
  }

  Object.entries(query).forEach(([key, value]) => {
    appendQueryValue(key, value);
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
    throw new Error("Missing refresh token. Run `not-manage auth login`.");
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
    throw new Error("You are not logged in. Run `not-manage auth login`.");
  }

  const now = Math.floor(Date.now() / 1000);
  const expiresSoon =
    tokenSet.expiresAt && Number(tokenSet.expiresAt) <= now + 60;

  if (!expiresSoon) {
    return tokenSet.accessToken;
  }

  const refreshed = await refreshAccessToken(config, tokenSet);
  return refreshed.accessToken;
}

async function fetchWhoAmI(config, accessToken) {
  const url = `${apiBaseUrl(config)}/users/who_am_i`;
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

function resourceCollectionUrl(config, resourcePath, query = {}) {
  return buildUrlWithQuery(`${apiBaseUrl(config)}/${resourcePath}.json`, query);
}

function resourceItemUrl(config, resourcePath, id, query = {}) {
  return buildUrlWithQuery(
    `${apiBaseUrl(config)}/${resourcePath}/${encodeURIComponent(String(id))}.json`,
    query
  );
}

async function fetchResourcePage(
  config,
  accessToken,
  resourcePath,
  query = {},
  nextPageUrl = null
) {
  const url = nextPageUrl
    ? parseTrustedApiUrl(config, nextPageUrl)
    : resourceCollectionUrl(config, resourcePath, query);
  return getJson(url, {
    authorization: `Bearer ${accessToken}`,
  });
}

async function fetchResourceById(config, accessToken, resourcePath, id, query = {}) {
  const url = resourceItemUrl(config, resourcePath, id, query);
  return getJson(url, {
    authorization: `Bearer ${accessToken}`,
  });
}

async function createResource(config, accessToken, resourcePath, data, query = {}) {
  const url = resourceCollectionUrl(config, resourcePath, query);
  return postJson(
    url,
    { data },
    {
      authorization: `Bearer ${accessToken}`,
    }
  );
}

async function fetchContactsPage(config, accessToken, query = {}, nextPageUrl = null) {
  return fetchResourcePage(config, accessToken, "contacts", query, nextPageUrl);
}

async function fetchContact(config, accessToken, id, query = {}) {
  return fetchResourceById(config, accessToken, "contacts", id, query);
}

async function fetchMattersPage(config, accessToken, query = {}, nextPageUrl = null) {
  return fetchResourcePage(config, accessToken, "matters", query, nextPageUrl);
}

async function fetchMatter(config, accessToken, id, query = {}) {
  return fetchResourceById(config, accessToken, "matters", id, query);
}

async function fetchBillsPage(config, accessToken, query = {}, nextPageUrl = null) {
  return fetchResourcePage(config, accessToken, "bills", query, nextPageUrl);
}

async function fetchBill(config, accessToken, id, query = {}) {
  return fetchResourceById(config, accessToken, "bills", id, query);
}

async function fetchUsersPage(config, accessToken, query = {}, nextPageUrl = null) {
  return fetchResourcePage(config, accessToken, "users", query, nextPageUrl);
}

async function fetchUser(config, accessToken, id, query = {}) {
  return fetchResourceById(config, accessToken, "users", id, query);
}

async function fetchPracticeAreasPage(config, accessToken, query = {}, nextPageUrl = null) {
  return fetchResourcePage(config, accessToken, "practice_areas", query, nextPageUrl);
}

async function fetchPracticeArea(config, accessToken, id, query = {}) {
  return fetchResourceById(config, accessToken, "practice_areas", id, query);
}

async function fetchActivitiesPage(config, accessToken, query = {}, nextPageUrl = null) {
  return fetchResourcePage(config, accessToken, "activities", query, nextPageUrl);
}

async function fetchActivity(config, accessToken, id, query = {}) {
  return fetchResourceById(config, accessToken, "activities", id, query);
}

async function createActivity(config, accessToken, data, query = {}) {
  return createResource(config, accessToken, "activities", data, query);
}

async function fetchTasksPage(config, accessToken, query = {}, nextPageUrl = null) {
  return fetchResourcePage(config, accessToken, "tasks", query, nextPageUrl);
}

async function fetchTask(config, accessToken, id, query = {}) {
  return fetchResourceById(config, accessToken, "tasks", id, query);
}

async function fetchBillableMattersPage(
  config,
  accessToken,
  query = {},
  nextPageUrl = null
) {
  return fetchResourcePage(config, accessToken, "billable_matters", query, nextPageUrl);
}

async function fetchBillableClientsPage(
  config,
  accessToken,
  query = {},
  nextPageUrl = null
) {
  return fetchResourcePage(config, accessToken, "billable_clients", query, nextPageUrl);
}

module.exports = {
  authorizeUrl,
  createActivity,
  createResource,
  deauthorize,
  exchangeAuthorizationCode,
  fetchActivitiesPage,
  fetchActivity,
  fetchTask,
  fetchTasksPage,
  fetchBill,
  fetchBillableClientsPage,
  fetchBillableMattersPage,
  fetchBillsPage,
  fetchContact,
  fetchContactsPage,
  fetchMatter,
  fetchMattersPage,
  fetchPracticeArea,
  fetchPracticeAreasPage,
  fetchResourceById,
  fetchResourcePage,
  fetchUser,
  fetchUsersPage,
  fetchWhoAmI,
  getValidAccessToken,
  __private: {
    buildUrlWithQuery,
    parseTrustedApiUrl,
  },
};
