const {
  fetchPracticeArea,
  fetchPracticeAreasPage,
  getValidAccessToken,
} = require("./clio-api");
const { getConfig, getTokenSet } = require("./store");
const {
  clip,
  compactQuery,
  fetchPages,
  parseLimit,
  printKeyValueRows,
} = require("./resource-utils");

const DEFAULT_LIST_FIELDS = "id,code,name,category";
const DEFAULT_GET_FIELDS = "id,code,name,category,created_at,updated_at";

function buildPracticeAreaQuery(options) {
  return compactQuery({
    code: options.code || undefined,
    created_since: options.createdSince || undefined,
    fields: options.fields || DEFAULT_LIST_FIELDS,
    limit: parseLimit(options.limit),
    matter_id: options.matterId || undefined,
    name: options.name || undefined,
    order: options.order || undefined,
    page_token: options.pageToken || undefined,
    updated_since: options.updatedSince || undefined,
  });
}

function formatPracticeAreaRow(practiceArea) {
  return {
    id: String(practiceArea.id || "-"),
    code: String(practiceArea.code || "-"),
    name: String(practiceArea.name || "-"),
    category: String(practiceArea.category || "-"),
  };
}

function printPracticeAreaList(rows, options) {
  if (rows.length === 0) {
    console.log("No practice areas found for the selected filters.");
    return;
  }

  const visibleRows = rows.slice(0, 50);
  console.log("ID       CODE         NAME                         CATEGORY");
  console.log("-------- ------------ ---------------------------- ------------------------------");

  visibleRows.forEach((row) => {
    const line = [
      clip(row.id, 8).padEnd(8, " "),
      clip(row.code, 12).padEnd(12, " "),
      clip(row.name, 28).padEnd(28, " "),
      clip(row.category, 30),
    ].join(" ");

    console.log(line);
  });

  if (rows.length > visibleRows.length) {
    console.log(
      `Showing ${visibleRows.length} of ${rows.length} practice areas. Use --json for full output.`
    );
  }

  if (!options.all && options.nextPageUrl) {
    console.log("");
    console.log("More results are available.");
    console.log("Run again with `--all` or pass `--page-token` from `--json` output.");
  }
}

function printPracticeArea(practiceArea) {
  printKeyValueRows([
    ["ID", practiceArea.id],
    ["Code", practiceArea.code],
    ["Name", practiceArea.name],
    ["Category", practiceArea.category],
    ["Created", practiceArea.created_at],
    ["Updated", practiceArea.updated_at],
  ]);
}

async function getAuthContext() {
  const config = await getConfig();
  const tokenSet = await getTokenSet();
  const accessToken = await getValidAccessToken(config, tokenSet);
  return { config, accessToken };
}

async function practiceAreasList(options = {}) {
  const query = buildPracticeAreaQuery(options);
  const { config, accessToken } = await getAuthContext();
  const result = await fetchPages(
    (pageQuery, nextPageUrl) =>
      fetchPracticeAreasPage(config, accessToken, pageQuery, nextPageUrl),
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

  const rows = result.data.map(formatPracticeAreaRow);
  printPracticeAreaList(rows, { all: Boolean(options.all), nextPageUrl: result.nextPageUrl });
  console.log("");
  console.log(
    `Returned ${rows.length} practice area${rows.length === 1 ? "" : "s"} across ${result.pagesFetched} page${result.pagesFetched === 1 ? "" : "s"}.`
  );
}

async function practiceAreasGet(options = {}) {
  if (!options.id) {
    throw new Error("Usage: clio-manage practice-areas get <id> [--fields ...] [--json]");
  }

  const { config, accessToken } = await getAuthContext();
  const payload = await fetchPracticeArea(config, accessToken, options.id, {
    fields: options.fields || DEFAULT_GET_FIELDS,
  });

  if (options.json) {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  printPracticeArea(payload?.data || {});
}

module.exports = {
  practiceAreasGet,
  practiceAreasList,
  __private: {
    buildPracticeAreaQuery,
    formatPracticeAreaRow,
    printPracticeArea,
    printPracticeAreaList,
  },
};
