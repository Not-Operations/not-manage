const {
  fetchMatter,
  fetchMattersPage,
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
  readUserName,
} = require("./resource-utils");

const DEFAULT_LIST_FIELDS =
  "id,display_number,description,status,open_date,close_date,client{id,name,first_name,last_name}";
const DEFAULT_GET_FIELDS =
  "id,display_number,number,description,status,billable,open_date,close_date,pending_date,client{id,name,first_name,last_name},practice_area{id,name},responsible_attorney{id,name,email},responsible_staff{id,name,email},originating_attorney{id,name,email},created_at,updated_at";

function readStatus(status) {
  if (!status) {
    return "-";
  }
  if (typeof status === "string") {
    return status;
  }
  return status.name || status.value || status.state || "-";
}

function readClientName(matter) {
  const single = readContactName(matter.client);
  if (single !== "-") {
    return single;
  }

  const list = Array.isArray(matter.clients) ? matter.clients : [];
  if (list.length > 0) {
    return readContactName(list[0]);
  }

  return "-";
}

function formatMatterRow(matter) {
  const id = matter.id || "-";
  const displayNumber = matter.display_number || matter.number || "-";
  const status = readStatus(matter.status);
  const client = readClientName(matter);
  const description = matter.description || "-";

  return {
    id: String(id),
    displayNumber: String(displayNumber),
    status: String(status),
    client: String(client),
    description: String(description),
  };
}

function buildMatterQuery(options) {
  return compactQuery({
    client_id: options.clientId || undefined,
    created_since: options.createdSince || undefined,
    fields: options.fields || DEFAULT_LIST_FIELDS,
    limit: parseLimit(options.limit),
    order: options.order || undefined,
    originating_attorney_id: options.originatingAttorneyId || undefined,
    page_token: options.pageToken || undefined,
    practice_area_id: options.practiceAreaId || undefined,
    query: options.query || undefined,
    responsible_attorney_id: options.responsibleAttorneyId || undefined,
    responsible_staff_id: options.responsibleStaffId || undefined,
    status: options.status || undefined,
    updated_since: options.updatedSince || undefined,
  });
}

function printMatterList(matterRows, options) {
  if (matterRows.length === 0) {
    console.log("No matters found for the selected filters.");
    return;
  }

  const rows = matterRows.slice(0, 50);

  console.log("ID       MATTER                STATUS    CLIENT               DESCRIPTION");
  console.log("-------- --------------------- --------- -------------------- ------------------------------");

  rows.forEach((row) => {
    const line = [
      clip(row.id, 8).padEnd(8, " "),
      clip(row.displayNumber, 21).padEnd(21, " "),
      clip(row.status, 9).padEnd(9, " "),
      clip(row.client, 20).padEnd(20, " "),
      clip(row.description, 30),
    ].join(" ");

    console.log(line);
  });

  if (matterRows.length > rows.length) {
    console.log(
      `Showing ${rows.length} of ${matterRows.length} matters. Use --json for full output.`
    );
  }

  if (!options.all && options.nextPageUrl) {
    console.log("");
    console.log("More results are available.");
    console.log("Run again with `--all` or pass `--page-token` from `--json` output.");
  }
}

function printMatter(matter) {
  printKeyValueRows([
    ["ID", matter.id],
    ["Matter", matter.display_number || matter.number],
    ["Description", matter.description],
    ["Status", readStatus(matter.status)],
    ["Client", readClientName(matter)],
    ["Practice Area", matter.practice_area?.name],
    ["Responsible Attorney", readUserName(matter.responsible_attorney)],
    ["Responsible Staff", readUserName(matter.responsible_staff)],
    ["Originating Attorney", readUserName(matter.originating_attorney)],
    ["Billable", formatBoolean(matter.billable)],
    ["Open Date", matter.open_date],
    ["Pending Date", matter.pending_date],
    ["Close Date", matter.close_date],
    ["Created", matter.created_at],
    ["Updated", matter.updated_at],
  ]);
}

async function getAuthContext() {
  const config = await getConfig();
  const tokenSet = await getTokenSet();
  const accessToken = await getValidAccessToken(config, tokenSet);
  return { config, accessToken };
}

async function mattersList(options = {}) {
  const query = buildMatterQuery(options);
  const { config, accessToken } = await getAuthContext();
  const result = await fetchPages(
    (pageQuery, nextPageUrl) => fetchMattersPage(config, accessToken, pageQuery, nextPageUrl),
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

  const rows = result.data.map(formatMatterRow);
  printMatterList(rows, { all: Boolean(options.all), nextPageUrl: result.nextPageUrl });
  console.log("");
  console.log(
    `Returned ${rows.length} matter${rows.length === 1 ? "" : "s"} across ${result.pagesFetched} page${result.pagesFetched === 1 ? "" : "s"}.`
  );
}

async function mattersGet(options = {}) {
  if (!options.id) {
    throw new Error("Usage: clio-manage matters get <id> [--fields ...] [--json]");
  }

  const { config, accessToken } = await getAuthContext();
  const payload = await fetchMatter(config, accessToken, options.id, {
    fields: options.fields || DEFAULT_GET_FIELDS,
  });

  if (options.json) {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  printMatter(payload?.data || {});
}

module.exports = {
  mattersGet,
  mattersList,
  __private: {
    buildMatterQuery,
    formatMatterRow,
    printMatter,
    printMatterList,
  },
};
