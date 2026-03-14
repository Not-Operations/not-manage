const {
  createListPrinter,
} = require("./resource-display");
const { buildListQueryFromResource } = require("./resource-query-builder");
const { createListCommand } = require("./resource-command-runner");
const { getResourceMetadata } = require("./resource-metadata");

const BILLABLE_CLIENT_RESOURCE = getResourceMetadata("billable-clients");

function buildBillableClientQuery(options) {
  return buildListQueryFromResource(
    BILLABLE_CLIENT_RESOURCE,
    options,
    BILLABLE_CLIENT_RESOURCE.listQuery
  );
}

function formatBillableClientRow(record) {
  return BILLABLE_CLIENT_RESOURCE.display.list.formatRow(record);
}

const printBillableClientList = createListPrinter(BILLABLE_CLIENT_RESOURCE.display.list);

const billableClientsList = createListCommand({
  apiPath: BILLABLE_CLIENT_RESOURCE.apiPath,
  buildQuery: buildBillableClientQuery,
  formatRow: formatBillableClientRow,
  pluralLabel: BILLABLE_CLIENT_RESOURCE.summaryLabels.plural,
  printList: printBillableClientList,
  redactionResourceType: BILLABLE_CLIENT_RESOURCE.redaction.resourceType,
  singularLabel: BILLABLE_CLIENT_RESOURCE.summaryLabels.singular,
});

module.exports = {
  billableClientsList,
  __private: {
    buildBillableClientQuery,
    formatBillableClientRow,
    printBillableClientList,
  },
};
