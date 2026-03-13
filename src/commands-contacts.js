const {
  fetchContact,
  fetchContactsPage,
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
  readContactName,
} = require("./resource-utils");
const { maybeRedactData, maybeRedactPayload } = require("./redaction");

const DEFAULT_LIST_FIELDS =
  "id,name,first_name,last_name,type,is_client,primary_email_address,secondary_email_address,primary_phone_number,secondary_phone_number,clio_connect_email,title,prefix,created_at,updated_at";
const DEFAULT_GET_FIELDS =
  "id,name,first_name,last_name,type,is_client,primary_email_address,secondary_email_address,primary_phone_number,secondary_phone_number,clio_connect_email,title,prefix,created_at,updated_at";

function buildContactQuery(options) {
  return compactQuery({
    client_only: options.clientOnly ? true : undefined,
    clio_connect_only: options.clioConnectOnly ? true : undefined,
    created_since: options.createdSince || undefined,
    email_only: options.emailOnly ? true : undefined,
    fields: options.fields || DEFAULT_LIST_FIELDS,
    initial: options.initial || undefined,
    limit: parseLimit(options.limit),
    order: options.order || undefined,
    page_token: options.pageToken || undefined,
    query: options.query || undefined,
    type: options.type || undefined,
    updated_since: options.updatedSince || undefined,
  });
}

function formatContactRow(contact) {
  return {
    id: String(contact.id || "-"),
    name: readContactName(contact),
    type: String(contact.type || "-"),
    client: formatBoolean(contact.is_client),
    email: String(contact.primary_email_address || "-"),
    phone: String(contact.primary_phone_number || "-"),
  };
}

function printContactList(rows, options) {
  if (rows.length === 0) {
    console.log("No contacts found for the selected filters.");
    return;
  }

  const visibleRows = rows.slice(0, 50);
  console.log("ID       NAME                         TYPE         CLIENT EMAIL                        PHONE");
  console.log("-------- ---------------------------- ------------ ------ ---------------------------- ------------------");

  visibleRows.forEach((row) => {
    const line = [
      clip(row.id, 8).padEnd(8, " "),
      clip(row.name, 28).padEnd(28, " "),
      clip(row.type, 12).padEnd(12, " "),
      clip(row.client, 6).padEnd(6, " "),
      clip(row.email, 28).padEnd(28, " "),
      clip(row.phone, 18),
    ].join(" ");

    console.log(line);
  });

  if (rows.length > visibleRows.length) {
    console.log(`Showing ${visibleRows.length} of ${rows.length} contacts. Use --json for full output.`);
  }

  if (!options.all && options.nextPageUrl) {
    console.log("");
    console.log("More results are available.");
    console.log("Run again with `--all` or pass `--page-token` from `--json` output.");
  }
}

function printContact(contact) {
  printKeyValueRows([
    ["ID", contact.id],
    ["Name", readContactName(contact)],
    ["Type", contact.type],
    ["Client", formatBoolean(contact.is_client)],
    ["Primary Email", contact.primary_email_address],
    ["Secondary Email", contact.secondary_email_address],
    ["Primary Phone", contact.primary_phone_number],
    ["Secondary Phone", contact.secondary_phone_number],
    ["Clio Connect Email", contact.clio_connect_email],
    ["Title", contact.title],
    ["Prefix", contact.prefix],
    ["Created", contact.created_at],
    ["Updated", contact.updated_at],
  ]);
}

async function getAuthContext() {
  const config = await getConfig();
  const tokenSet = await getTokenSet();
  const accessToken = await getValidAccessToken(config, tokenSet);
  return { config, accessToken };
}

async function contactsList(options = {}) {
  const query = buildContactQuery(options);
  const { config, accessToken } = await getAuthContext();
  const result = await fetchPages(
    (pageQuery, nextPageUrl) => fetchContactsPage(config, accessToken, pageQuery, nextPageUrl),
    query,
    Boolean(options.all)
  );

  if (options.json) {
    const firstPage = maybeRedactPayload(result.firstPage, options, "contact");
    if (!options.all) {
      console.log(JSON.stringify(firstPage, null, 2));
      return;
    }

    const data = maybeRedactData(result.data, options, "contact");
    console.log(
      JSON.stringify(
        {
          data,
          meta: {
            pages_fetched: result.pagesFetched,
            returned_count: data.length,
          },
        },
        null,
        2
      )
    );
    return;
  }

  const rows = maybeRedactData(result.data, options, "contact").map(formatContactRow);
  printContactList(rows, { all: Boolean(options.all), nextPageUrl: result.nextPageUrl });
  console.log("");
  console.log(
    `Returned ${rows.length} contact${rows.length === 1 ? "" : "s"} across ${result.pagesFetched} page${result.pagesFetched === 1 ? "" : "s"}.`
  );
}

async function contactsGet(options = {}) {
  if (!options.id) {
    throw new Error("Usage: not-manage contacts get <id> [--fields ...] [--json]");
  }

  const { config, accessToken } = await getAuthContext();
  const payload = await fetchContact(config, accessToken, options.id, {
    fields: options.fields || DEFAULT_GET_FIELDS,
  });
  const redactedPayload = maybeRedactPayload(payload, options, "contact");

  if (options.json) {
    console.log(JSON.stringify(redactedPayload, null, 2));
    return;
  }

  printContact(redactedPayload?.data || {});
}

module.exports = {
  contactsGet,
  contactsList,
  __private: {
    buildContactQuery,
    formatContactRow,
    printContact,
    printContactList,
  },
};
