const {
  fetchBillableMattersPage,
  getValidAccessToken,
} = require("./clio-api");
const { getConfig, getTokenSet } = require("./store");
const {
  clip,
  compactQuery,
  fetchPages,
  formatMoney,
  parseLimit,
  printKeyValueRows,
  readContactName,
} = require("./resource-utils");
const { maybeRedactData, maybeRedactPayload } = require("./redaction");

const DEFAULT_LIST_FIELDS =
  "id,display_number,unbilled_hours,unbilled_amount,amount_in_trust,client{id,name,first_name,last_name}";

function buildBillableMatterQuery(options) {
  return compactQuery({
    client_id: options.clientId || undefined,
    end_date: options.endDate || undefined,
    fields: options.fields || DEFAULT_LIST_FIELDS,
    limit: parseLimit(options.limit, 1000),
    matter_id: options.matterId || undefined,
    originating_attorney_id: options.originatingAttorneyId || undefined,
    page_token: options.pageToken || undefined,
    query: options.query || undefined,
    responsible_attorney_id: options.responsibleAttorneyId || undefined,
    start_date: options.startDate || undefined,
  });
}

function formatBillableMatterRow(record) {
  return {
    id: String(record.id || "-"),
    matter: String(record.display_number || "-"),
    client: readContactName(record.client),
    hours: record.unbilled_hours === undefined || record.unbilled_hours === null ? "-" : Number(record.unbilled_hours).toFixed(2),
    amount: formatMoney(record.unbilled_amount),
    trust: formatMoney(record.amount_in_trust),
  };
}

function printBillableMatterList(rows, options) {
  if (rows.length === 0) {
    console.log("No billable matters found for the selected filters.");
    return;
  }

  const visibleRows = rows.slice(0, 50);
  console.log("ID       MATTER                CLIENT               HOURS AMOUNT     TRUST");
  console.log("-------- --------------------- -------------------- ----- ---------- ----------");

  visibleRows.forEach((row) => {
    const line = [
      clip(row.id, 8).padEnd(8, " "),
      clip(row.matter, 21).padEnd(21, " "),
      clip(row.client, 20).padEnd(20, " "),
      clip(row.hours, 5).padEnd(5, " "),
      clip(row.amount, 10).padEnd(10, " "),
      clip(row.trust, 10),
    ].join(" ");

    console.log(line);
  });

  if (rows.length > visibleRows.length) {
    console.log(`Showing ${visibleRows.length} of ${rows.length} billable matters. Use --json for full output.`);
  }

  if (!options.all && options.nextPageUrl) {
    console.log("");
    console.log("More results are available.");
    console.log("Run again with `--all` or pass `--page-token` from `--json` output.");
  }
}

function printBillableMatter(record) {
  printKeyValueRows([
    ["ID", record.id],
    ["Matter", record.display_number],
    ["Client", readContactName(record.client)],
    ["Unbilled Hours", record.unbilled_hours],
    ["Unbilled Amount", formatMoney(record.unbilled_amount)],
    ["Amount In Trust", formatMoney(record.amount_in_trust)],
  ]);
}

async function getAuthContext() {
  const config = await getConfig();
  const tokenSet = await getTokenSet();
  const accessToken = await getValidAccessToken(config, tokenSet);
  return { config, accessToken };
}

async function billableMattersList(options = {}) {
  const query = buildBillableMatterQuery(options);
  const { config, accessToken } = await getAuthContext();
  const result = await fetchPages(
    (pageQuery, nextPageUrl) =>
      fetchBillableMattersPage(config, accessToken, pageQuery, nextPageUrl),
    query,
    Boolean(options.all)
  );

  if (options.json) {
    const firstPage = maybeRedactPayload(result.firstPage, options, "billable-matter");
    if (!options.all) {
      console.log(JSON.stringify(firstPage, null, 2));
      return;
    }

    const data = maybeRedactData(result.data, options, "billable-matter");
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

  const rows = maybeRedactData(result.data, options, "billable-matter").map(
    formatBillableMatterRow
  );
  printBillableMatterList(rows, { all: Boolean(options.all), nextPageUrl: result.nextPageUrl });
  console.log("");
  console.log(
    `Returned ${rows.length} billable matter${rows.length === 1 ? "" : "s"} across ${result.pagesFetched} page${result.pagesFetched === 1 ? "" : "s"}.`
  );
}

module.exports = {
  billableMattersList,
  __private: {
    buildBillableMatterQuery,
    formatBillableMatterRow,
    printBillableMatter,
    printBillableMatterList,
  },
};
