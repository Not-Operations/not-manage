const { fetchMattersPage, getValidAccessToken } = require("./clio-api");
const { getConfig, getTokenSet } = require("./store");

const DEFAULT_FIELDS =
  "id,display_number,description,status,open_date,close_date,client{id,name,first_name,last_name}";

function parseLimit(limitInput) {
  if (limitInput === undefined || limitInput === null || limitInput === "") {
    return undefined;
  }

  const parsed = Number(limitInput);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 200) {
    throw new Error("`--limit` must be an integer between 1 and 200.");
  }

  return parsed;
}

function clip(value, maxLength) {
  const text = String(value || "");
  if (text.length <= maxLength) {
    return text;
  }
  if (maxLength <= 3) {
    return ".".repeat(maxLength);
  }
  return `${text.slice(0, maxLength - 3)}...`;
}

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
  const single = matter.client;
  if (single && typeof single === "object") {
    return (
      single.name ||
      [single.first_name, single.last_name].filter(Boolean).join(" ").trim() ||
      "-"
    );
  }

  const list = Array.isArray(matter.clients) ? matter.clients : [];
  if (list.length > 0) {
    const first = list[0];
    return (
      first.name ||
      [first.first_name, first.last_name].filter(Boolean).join(" ").trim() ||
      "-"
    );
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
  const query = {
    limit: parseLimit(options.limit),
    order: options.order || undefined,
    status: options.status || undefined,
    query: options.query || undefined,
    page_token: options.pageToken || undefined,
    fields: options.fields || DEFAULT_FIELDS,
  };

  Object.keys(query).forEach((key) => {
    if (query[key] === undefined) {
      delete query[key];
    }
  });

  return query;
}

async function fetchMatterPages(config, accessToken, query, fetchAllPages) {
  const firstPage = await fetchMattersPage(config, accessToken, query);
  const firstData = Array.isArray(firstPage?.data) ? firstPage.data : [];
  const aggregatedData = [...firstData];
  let pagesFetched = 1;
  let nextPageUrl = firstPage?.meta?.paging?.next || null;

  while (fetchAllPages && nextPageUrl) {
    const nextPage = await fetchMattersPage(config, accessToken, {}, nextPageUrl);
    const nextData = Array.isArray(nextPage?.data) ? nextPage.data : [];
    aggregatedData.push(...nextData);
    pagesFetched += 1;
    nextPageUrl = nextPage?.meta?.paging?.next || null;
  }

  return {
    firstPage,
    matters: fetchAllPages ? aggregatedData : firstData,
    pagesFetched,
    nextPageUrl: fetchAllPages ? null : firstPage?.meta?.paging?.next || null,
  };
}

function printMatterList(matterRows, options) {
  if (matterRows.length === 0) {
    console.log("No matters found for the selected filters.");
    return;
  }

  const maxRows = 50;
  const rows = matterRows.slice(0, maxRows);

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

async function mattersList(options = {}) {
  const config = await getConfig();
  const tokenSet = await getTokenSet();
  const accessToken = await getValidAccessToken(config, tokenSet);
  const query = buildMatterQuery(options);
  const result = await fetchMatterPages(config, accessToken, query, Boolean(options.all));

  if (options.json) {
    if (!options.all) {
      console.log(JSON.stringify(result.firstPage, null, 2));
      return;
    }

    console.log(
      JSON.stringify(
        {
          data: result.matters,
          meta: {
            pages_fetched: result.pagesFetched,
            returned_count: result.matters.length,
          },
        },
        null,
        2
      )
    );
    return;
  }

  const rows = result.matters.map(formatMatterRow);
  printMatterList(rows, { all: Boolean(options.all), nextPageUrl: result.nextPageUrl });
  console.log("");
  console.log(
    `Returned ${rows.length} matter${rows.length === 1 ? "" : "s"} across ${result.pagesFetched} page${result.pagesFetched === 1 ? "" : "s"}.`
  );
}

module.exports = {
  mattersList,
};
