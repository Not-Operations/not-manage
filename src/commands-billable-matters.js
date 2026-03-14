const {
  createListPrinter,
} = require("./resource-display");
const { buildListQueryFromResource } = require("./resource-query-builder");
const { createListCommand } = require("./resource-command-runner");
const { getResourceMetadata } = require("./resource-metadata");

const BILLABLE_MATTER_RESOURCE = getResourceMetadata("billable-matters");

function buildBillableMatterQuery(options) {
  return buildListQueryFromResource(
    BILLABLE_MATTER_RESOURCE,
    options,
    BILLABLE_MATTER_RESOURCE.listQuery
  );
}

function formatBillableMatterRow(record) {
  return BILLABLE_MATTER_RESOURCE.display.list.formatRow(record);
}

const printBillableMatterList = createListPrinter(BILLABLE_MATTER_RESOURCE.display.list);

const billableMattersList = createListCommand({
  apiPath: BILLABLE_MATTER_RESOURCE.apiPath,
  buildQuery: buildBillableMatterQuery,
  formatRow: formatBillableMatterRow,
  pluralLabel: BILLABLE_MATTER_RESOURCE.summaryLabels.plural,
  printList: printBillableMatterList,
  redactionResourceType: BILLABLE_MATTER_RESOURCE.redaction.resourceType,
  singularLabel: BILLABLE_MATTER_RESOURCE.summaryLabels.singular,
});

module.exports = {
  billableMattersList,
  __private: {
    buildBillableMatterQuery,
    formatBillableMatterRow,
    printBillableMatterList,
  },
};
