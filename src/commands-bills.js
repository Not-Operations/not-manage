const {
  fetchBill,
  fetchBillsPage,
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
  readMatterLabel,
} = require("./resource-utils");
const { maybeRedactData, maybeRedactPayload } = require("./redaction");

const DEFAULT_LIST_FIELDS =
  "id,number,state,type,kind,subject,memo,issued_at,due_at,paid,paid_at,pending,due,total,balance,created_at,updated_at,client{id,name,first_name,last_name},matters{id,display_number,number,description}";
const DEFAULT_GET_FIELDS =
  "id,number,state,type,kind,subject,memo,issued_at,due_at,paid,paid_at,pending,due,total,balance,created_at,updated_at,client{id,name,first_name,last_name},matters{id,display_number,number,description}";
const VALID_BILL_STATUSES = new Set(["all", "overdue"]);

function normalizeBillStatusFilters(options = {}) {
  const state =
    typeof options.state === "string"
      ? options.state.trim() || undefined
      : options.state || undefined;

  if (options.status === undefined || options.status === null || options.status === "") {
    return { state, status: undefined };
  }

  if (typeof options.status !== "string") {
    throw new Error(
      "Invalid value for --status on bills/invoices. Use `all`, `overdue`, or `unpaid`."
    );
  }

  const status = options.status.trim().toLowerCase();

  if (!status) {
    throw new Error(
      "Invalid value for --status on bills/invoices. Use `all`, `overdue`, or `unpaid`."
    );
  }

  if (status === "unpaid") {
    if (state && state !== "awaiting_payment") {
      throw new Error(
        "`--status unpaid` conflicts with `--state`. Use `--state awaiting_payment` or remove one of the filters."
      );
    }

    return {
      state: state || "awaiting_payment",
      status: undefined,
    };
  }

  if (!VALID_BILL_STATUSES.has(status)) {
    throw new Error(
      "Invalid value for --status on bills/invoices. Use `all`, `overdue`, or `unpaid`."
    );
  }

  return { state, status };
}

function buildBillQuery(options) {
  const filters = normalizeBillStatusFilters(options);

  return compactQuery({
    client_id: options.clientId || undefined,
    created_since: options.createdSince || undefined,
    due_after: options.dueAfter || undefined,
    due_before: options.dueBefore || undefined,
    fields: options.fields || DEFAULT_LIST_FIELDS,
    issued_after: options.issuedAfter || undefined,
    issued_before: options.issuedBefore || undefined,
    limit: parseLimit(options.limit),
    matter_id: options.matterId || undefined,
    order: options.order || undefined,
    overdue_only: options.overdueOnly ? true : undefined,
    page_token: options.pageToken || undefined,
    query: options.query || undefined,
    state: filters.state,
    status: filters.status,
    type: options.type || undefined,
    updated_since: options.updatedSince || undefined,
  });
}

function readFirstMatterLabel(bill) {
  const matters = Array.isArray(bill.matters) ? bill.matters : [];
  if (matters.length === 0) {
    return "-";
  }

  return readMatterLabel(matters[0]);
}

function formatBillRow(bill) {
  return {
    id: String(bill.id || "-"),
    number: String(bill.number || "-"),
    state: String(bill.state || "-"),
    client: readContactName(bill.client),
    dueAt: String(bill.due_at || "-"),
    balance: formatMoney(bill.balance),
  };
}

function printBillList(rows, options) {
  if (rows.length === 0) {
    console.log("No bills found for the selected filters.");
    return;
  }

  const visibleRows = rows.slice(0, 50);
  console.log("ID       BILL           STATE        CLIENT                       DUE          BALANCE");
  console.log("-------- -------------- ------------ ---------------------------- ------------ ----------");

  visibleRows.forEach((row) => {
    const line = [
      clip(row.id, 8).padEnd(8, " "),
      clip(row.number, 14).padEnd(14, " "),
      clip(row.state, 12).padEnd(12, " "),
      clip(row.client, 28).padEnd(28, " "),
      clip(row.dueAt, 12).padEnd(12, " "),
      clip(row.balance, 10),
    ].join(" ");

    console.log(line);
  });

  if (rows.length > visibleRows.length) {
    console.log(`Showing ${visibleRows.length} of ${rows.length} bills. Use --json for full output.`);
  }

  if (!options.all && options.nextPageUrl) {
    console.log("");
    console.log("More results are available.");
    console.log("Run again with `--all` or pass `--page-token` from `--json` output.");
  }
}

function printBill(bill) {
  printKeyValueRows([
    ["ID", bill.id],
    ["Number", bill.number],
    ["State", bill.state],
    ["Type", bill.type],
    ["Kind", bill.kind],
    ["Client", readContactName(bill.client)],
    ["Matter", readFirstMatterLabel(bill)],
    ["Issued", bill.issued_at],
    ["Due", bill.due_at],
    ["Total", formatMoney(bill.total)],
    ["Balance", formatMoney(bill.balance)],
    ["Paid", formatMoney(bill.paid)],
    ["Paid At", bill.paid_at],
    ["Pending", formatMoney(bill.pending)],
    ["Due Amount", formatMoney(bill.due)],
    ["Subject", bill.subject],
    ["Memo", bill.memo],
    ["Created", bill.created_at],
    ["Updated", bill.updated_at],
  ]);
}

async function getAuthContext() {
  const config = await getConfig();
  const tokenSet = await getTokenSet();
  const accessToken = await getValidAccessToken(config, tokenSet);
  return { config, accessToken };
}

async function billsList(options = {}) {
  const query = buildBillQuery(options);
  const { config, accessToken } = await getAuthContext();
  const result = await fetchPages(
    (pageQuery, nextPageUrl) => fetchBillsPage(config, accessToken, pageQuery, nextPageUrl),
    query,
    Boolean(options.all)
  );

  if (options.json) {
    const firstPage = maybeRedactPayload(result.firstPage, options, "bill");
    if (!options.all) {
      console.log(JSON.stringify(firstPage, null, 2));
      return;
    }

    const data = maybeRedactData(result.data, options, "bill");
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

  const rows = maybeRedactData(result.data, options, "bill").map(formatBillRow);
  printBillList(rows, { all: Boolean(options.all), nextPageUrl: result.nextPageUrl });
  console.log("");
  console.log(
    `Returned ${rows.length} bill${rows.length === 1 ? "" : "s"} across ${result.pagesFetched} page${result.pagesFetched === 1 ? "" : "s"}.`
  );
}

async function billsGet(options = {}) {
  if (!options.id) {
    throw new Error("Usage: clio-manage bills get <id> [--fields ...] [--json]");
  }

  const { config, accessToken } = await getAuthContext();
  const payload = await fetchBill(config, accessToken, options.id, {
    fields: options.fields || DEFAULT_GET_FIELDS,
  });
  const redactedPayload = maybeRedactPayload(payload, options, "bill");

  if (options.json) {
    console.log(JSON.stringify(redactedPayload, null, 2));
    return;
  }

  printBill(redactedPayload?.data || {});
}

module.exports = {
  billsGet,
  billsList,
  __private: {
    buildBillQuery,
    formatBillRow,
    normalizeBillStatusFilters,
    printBill,
    printBillList,
  },
};
