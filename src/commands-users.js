const {
  fetchUser,
  fetchUsersPage,
  getValidAccessToken,
} = require("./clio-api");
const { getConfig, getTokenSet } = require("./store");
const {
  clip,
  compactQuery,
  fetchPages,
  formatBoolean,
  parseLimit,
  printKeyValueRows,
  readUserName,
} = require("./resource-utils");

const DEFAULT_LIST_FIELDS =
  "id,name,first_name,last_name,email,enabled,roles,subscription_type";
const DEFAULT_GET_FIELDS =
  "id,name,first_name,last_name,email,enabled,roles,subscription_type,phone_number,time_zone,rate,account_owner,clio_connect,court_rules_default_attendee,created_at,updated_at";

function readRoleList(user) {
  const roles = Array.isArray(user?.roles) ? user.roles : [];
  if (roles.length === 0) {
    return "-";
  }
  return roles.join(", ");
}

function buildUserQuery(options) {
  return compactQuery({
    created_since: options.createdSince || undefined,
    enabled:
      options.enabled === undefined || options.enabled === null
        ? undefined
        : Boolean(options.enabled),
    fields: options.fields || DEFAULT_LIST_FIELDS,
    include_co_counsel: options.includeCoCounsel ? true : undefined,
    limit: parseLimit(options.limit, 2000),
    name: options.name || undefined,
    order: options.order || undefined,
    page_token: options.pageToken || undefined,
    pending_setup:
      options.pendingSetup === undefined || options.pendingSetup === null
        ? undefined
        : Boolean(options.pendingSetup),
    role: options.role || undefined,
    subscription_type: options.subscriptionType || undefined,
    updated_since: options.updatedSince || undefined,
  });
}

function formatUserRow(user) {
  return {
    id: String(user.id || "-"),
    name: readUserName(user),
    email: String(user.email || "-"),
    enabled: formatBoolean(user.enabled),
    roles: readRoleList(user),
  };
}

function printUserList(rows, options) {
  if (rows.length === 0) {
    console.log("No users found for the selected filters.");
    return;
  }

  const visibleRows = rows.slice(0, 50);
  console.log("ID       NAME                         EMAIL                        ENABLED ROLES");
  console.log("-------- ---------------------------- ---------------------------- ------- ------------------------------");

  visibleRows.forEach((row) => {
    const line = [
      clip(row.id, 8).padEnd(8, " "),
      clip(row.name, 28).padEnd(28, " "),
      clip(row.email, 28).padEnd(28, " "),
      clip(row.enabled, 7).padEnd(7, " "),
      clip(row.roles, 30),
    ].join(" ");

    console.log(line);
  });

  if (rows.length > visibleRows.length) {
    console.log(`Showing ${visibleRows.length} of ${rows.length} users. Use --json for full output.`);
  }

  if (!options.all && options.nextPageUrl) {
    console.log("");
    console.log("More results are available.");
    console.log("Run again with `--all` or pass `--page-token` from `--json` output.");
  }
}

function printUser(user) {
  printKeyValueRows([
    ["ID", user.id],
    ["Name", readUserName(user)],
    ["Email", user.email],
    ["Enabled", formatBoolean(user.enabled)],
    ["Roles", readRoleList(user)],
    ["Subscription", user.subscription_type],
    ["Phone", user.phone_number],
    ["Time Zone", user.time_zone],
    ["Rate", user.rate],
    ["Account Owner", formatBoolean(user.account_owner)],
    ["Clio Connect", formatBoolean(user.clio_connect)],
    ["Court Rules Default Attendee", formatBoolean(user.court_rules_default_attendee)],
    ["Created", user.created_at],
    ["Updated", user.updated_at],
  ]);
}

async function getAuthContext() {
  const config = await getConfig();
  const tokenSet = await getTokenSet();
  const accessToken = await getValidAccessToken(config, tokenSet);
  return { config, accessToken };
}

async function usersList(options = {}) {
  const query = buildUserQuery(options);
  const { config, accessToken } = await getAuthContext();
  const result = await fetchPages(
    (pageQuery, nextPageUrl) => fetchUsersPage(config, accessToken, pageQuery, nextPageUrl),
    query,
    Boolean(options.all)
  );

  if (options.json) {
    if (!options.all) {
      console.log(JSON.stringify(result.firstPage, null, 2));
      return;
    }

    console.log(
      JSON.stringify(
        {
          data: result.data,
          meta: {
            pages_fetched: result.pagesFetched,
            returned_count: result.data.length,
          },
        },
        null,
        2
      )
    );
    return;
  }

  const rows = result.data.map(formatUserRow);
  printUserList(rows, { all: Boolean(options.all), nextPageUrl: result.nextPageUrl });
  console.log("");
  console.log(
    `Returned ${rows.length} user${rows.length === 1 ? "" : "s"} across ${result.pagesFetched} page${result.pagesFetched === 1 ? "" : "s"}.`
  );
}

async function usersGet(options = {}) {
  if (!options.id) {
    throw new Error("Usage: clio-manage users get <id> [--fields ...] [--json]");
  }

  const { config, accessToken } = await getAuthContext();
  const payload = await fetchUser(config, accessToken, options.id, {
    fields: options.fields || DEFAULT_GET_FIELDS,
  });

  if (options.json) {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  printUser(payload?.data || {});
}

module.exports = {
  usersGet,
  usersList,
  __private: {
    buildUserQuery,
    formatUserRow,
    printUser,
    printUserList,
  },
};
