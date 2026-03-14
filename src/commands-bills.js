const {
  createDetailPrinter,
  createListPrinter,
} = require("./resource-display");
const { buildListQueryFromResource } = require("./resource-query-builder");
const { createGetCommand, createListCommand } = require("./resource-command-runner");
const { getResourceMetadata } = require("./resource-metadata");

const BILL_RESOURCE = getResourceMetadata("bills");
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
  return buildListQueryFromResource(BILL_RESOURCE, options, {
    ...BILL_RESOURCE.listQuery,
    transform(query, currentOptions) {
      const filters = normalizeBillStatusFilters(currentOptions);
      return {
        ...query,
        state: filters.state,
        status: filters.status,
      };
    },
  });
}

function formatBillRow(bill) {
  return BILL_RESOURCE.display.list.formatRow(bill);
}

const printBillList = createListPrinter(BILL_RESOURCE.display.list);
const printBill = createDetailPrinter(BILL_RESOURCE.display.get);

const billsList = createListCommand({
  apiPath: BILL_RESOURCE.apiPath,
  buildQuery: buildBillQuery,
  formatRow: formatBillRow,
  pluralLabel: BILL_RESOURCE.summaryLabels.plural,
  printList: printBillList,
  redactionResourceType: BILL_RESOURCE.redaction.resourceType,
  singularLabel: BILL_RESOURCE.summaryLabels.singular,
});

const billsGet = createGetCommand({
  apiPath: BILL_RESOURCE.apiPath,
  defaultFields: BILL_RESOURCE.defaultFields.get,
  printItem: printBill,
  redactionResourceType: BILL_RESOURCE.redaction.resourceType,
  usage: "Usage: not-manage bills get <id> [--fields ...] [--json]",
});

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
