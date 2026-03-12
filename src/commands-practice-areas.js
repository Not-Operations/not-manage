const {
  fetchMatter,
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
const { maybeRedactData, maybeRedactPayload } = require("./redaction");

const DEFAULT_LIST_FIELDS = "id,code,name,category";
const DEFAULT_GET_FIELDS = "id,code,name,category,created_at,updated_at";
const MATTER_LOOKUP_FIELDS = "id,practice_area{id}";

function buildPracticeAreaQuery(options) {
  return compactQuery({
    code: options.code || undefined,
    created_since: options.createdSince || undefined,
    fields: options.fields || DEFAULT_LIST_FIELDS,
    limit: parseLimit(options.limit),
    name: options.name || undefined,
    order: options.order || undefined,
    page_token: options.pageToken || undefined,
    updated_since: options.updatedSince || undefined,
  });
}

function matchesTimestampOnOrAfter(value, threshold) {
  if (!threshold) {
    return true;
  }

  const valueTime = Date.parse(value);
  const thresholdTime = Date.parse(threshold);

  if (Number.isNaN(valueTime) || Number.isNaN(thresholdTime)) {
    return true;
  }

  return valueTime >= thresholdTime;
}

function practiceAreaMatchesOptions(practiceArea, options = {}) {
  const code = String(practiceArea?.code || "");
  const name = String(practiceArea?.name || "");

  if (options.code && code.toLowerCase() !== String(options.code).toLowerCase()) {
    return false;
  }

  if (
    options.name &&
    !name.toLowerCase().includes(String(options.name).trim().toLowerCase())
  ) {
    return false;
  }

  if (!matchesTimestampOnOrAfter(practiceArea?.created_at, options.createdSince)) {
    return false;
  }

  if (!matchesTimestampOnOrAfter(practiceArea?.updated_at, options.updatedSince)) {
    return false;
  }

  return true;
}

function buildSinglePageResult(data) {
  return {
    data,
    firstPage: {
      data,
      meta: {
        paging: {},
        records: data.length,
      },
    },
    nextPageUrl: null,
    pagesFetched: 1,
  };
}

async function practiceAreasListForMatter(config, accessToken, options = {}) {
  const matterPayload = await fetchMatter(config, accessToken, options.matterId, {
    fields: MATTER_LOOKUP_FIELDS,
  });
  const practiceAreaId = matterPayload?.data?.practice_area?.id;

  if (!practiceAreaId) {
    return buildSinglePageResult([]);
  }

  const payload = await fetchPracticeArea(config, accessToken, practiceAreaId, {
    fields: options.fields || DEFAULT_GET_FIELDS,
  });
  const practiceArea = payload?.data;
  const data =
    practiceArea && practiceAreaMatchesOptions(practiceArea, options)
      ? [practiceArea]
      : [];

  return buildSinglePageResult(data);
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
  const { config, accessToken } = await getAuthContext();
  const result = options.matterId
    ? await practiceAreasListForMatter(config, accessToken, options)
    : await fetchPages(
        (pageQuery, nextPageUrl) =>
          fetchPracticeAreasPage(config, accessToken, pageQuery, nextPageUrl),
        buildPracticeAreaQuery(options),
        Boolean(options.all)
      );

  if (options.json) {
    const firstPage = maybeRedactPayload(result.firstPage, options, "practice-area");
    if (!options.all) {
      console.log(JSON.stringify(firstPage, null, 2));
      return;
    }

    const data = maybeRedactData(result.data, options, "practice-area");
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

  const rows = maybeRedactData(result.data, options, "practice-area").map(
    formatPracticeAreaRow
  );
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
  const redactedPayload = maybeRedactPayload(payload, options, "practice-area");

  if (options.json) {
    console.log(JSON.stringify(redactedPayload, null, 2));
    return;
  }

  printPracticeArea(redactedPayload?.data || {});
}

module.exports = {
  practiceAreasGet,
  practiceAreasList,
  __private: {
    buildSinglePageResult,
    buildPracticeAreaQuery,
    formatPracticeAreaRow,
    practiceAreaMatchesOptions,
    practiceAreasListForMatter,
    printPracticeArea,
    printPracticeAreaList,
  },
};
