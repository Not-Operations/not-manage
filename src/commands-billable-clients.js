const {
  fetchBillableClientsPage,
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
} = require("./resource-utils");
const { maybeRedactData, maybeRedactPayload } = require("./redaction");

const DEFAULT_LIST_FIELDS =
  "id,name,unbilled_hours,unbilled_amount,amount_in_trust,billable_matters_count";

function buildBillableClientQuery(options) {
  return compactQuery({
    client_id: options.clientId || undefined,
    end_date: options.endDate || undefined,
    fields: options.fields || DEFAULT_LIST_FIELDS,
    limit: parseLimit(options.limit, 25),
    matter_id: options.matterId || undefined,
    originating_attorney_id: options.originatingAttorneyId || undefined,
    page_token: options.pageToken || undefined,
    query: options.query || undefined,
    responsible_attorney_id: options.responsibleAttorneyId || undefined,
    start_date: options.startDate || undefined,
  });
}

function formatBillableClientRow(record) {
  return {
    id: String(record.id || "-"),
    name: String(record.name || "-"),
    hours:
      record.unbilled_hours === undefined || record.unbilled_hours === null
        ? "-"
        : Number(record.unbilled_hours).toFixed(2),
    amount: formatMoney(record.unbilled_amount),
    trust: formatMoney(record.amount_in_trust),
    matters: String(record.billable_matters_count ?? "-"),
  };
}

function printBillableClientList(rows, options) {
  if (rows.length === 0) {
    console.log("No billable clients found for the selected filters.");
    return;
  }

  const visibleRows = rows.slice(0, 50);
  console.log("ID       NAME                         HOURS AMOUNT     TRUST      MATTERS");
  console.log("-------- ---------------------------- ----- ---------- ---------- -------");

  visibleRows.forEach((row) => {
    const line = [
      clip(row.id, 8).padEnd(8, " "),
      clip(row.name, 28).padEnd(28, " "),
      clip(row.hours, 5).padEnd(5, " "),
      clip(row.amount, 10).padEnd(10, " "),
      clip(row.trust, 10).padEnd(10, " "),
      clip(row.matters, 7),
    ].join(" ");

    console.log(line);
  });

  if (rows.length > visibleRows.length) {
    console.log(`Showing ${visibleRows.length} of ${rows.length} billable clients. Use --json for full output.`);
  }

  if (!options.all && options.nextPageUrl) {
    console.log("");
    console.log("More results are available.");
    console.log("Run again with `--all` or pass `--page-token` from `--json` output.");
  }
}

function printBillableClient(record) {
  printKeyValueRows([
    ["ID", record.id],
    ["Name", record.name],
    ["Unbilled Hours", record.unbilled_hours],
    ["Unbilled Amount", formatMoney(record.unbilled_amount)],
    ["Amount In Trust", formatMoney(record.amount_in_trust)],
    ["Billable Matters", record.billable_matters_count],
  ]);
}

async function getAuthContext() {
  const config = await getConfig();
  const tokenSet = await getTokenSet();
  const accessToken = await getValidAccessToken(config, tokenSet);
  return { config, accessToken };
}

async function billableClientsList(options = {}) {
  const query = buildBillableClientQuery(options);
  const { config, accessToken } = await getAuthContext();
  const result = await fetchPages(
    (pageQuery, nextPageUrl) =>
      fetchBillableClientsPage(config, accessToken, pageQuery, nextPageUrl),
    query,
    Boolean(options.all)
  );

  if (options.json) {
    const firstPage = maybeRedactPayload(result.firstPage, options, "billable-client");
    if (!options.all) {
      console.log(JSON.stringify(firstPage, null, 2));
      return;
    }

    const data = maybeRedactData(result.data, options, "billable-client");
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

  const rows = maybeRedactData(result.data, options, "billable-client").map(
    formatBillableClientRow
  );
  printBillableClientList(rows, { all: Boolean(options.all), nextPageUrl: result.nextPageUrl });
  console.log("");
  console.log(
    `Returned ${rows.length} billable client${rows.length === 1 ? "" : "s"} across ${result.pagesFetched} page${result.pagesFetched === 1 ? "" : "s"}.`
  );
}

module.exports = {
  billableClientsList,
  __private: {
    buildBillableClientQuery,
    formatBillableClientRow,
    printBillableClient,
    printBillableClientList,
  },
};
