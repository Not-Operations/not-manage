const {
  createDetailPrinter,
  createListPrinter,
} = require("./resource-display");
const { buildListQueryFromResource } = require("./resource-query-builder");
const { createGetCommand, createListCommand } = require("./resource-command-runner");
const { getResourceMetadata } = require("./resource-metadata");

const MATTER_RESOURCE = getResourceMetadata("matters");

function formatMatterRow(matter) {
  return MATTER_RESOURCE.display.list.formatRow(matter);
}

function buildMatterQuery(options) {
  return buildListQueryFromResource(MATTER_RESOURCE, options, MATTER_RESOURCE.listQuery);
}

const printMatterList = createListPrinter(MATTER_RESOURCE.display.list);
const printMatter = createDetailPrinter(MATTER_RESOURCE.display.get);

const mattersList = createListCommand({
  apiPath: MATTER_RESOURCE.apiPath,
  buildQuery: buildMatterQuery,
  formatRow: formatMatterRow,
  pluralLabel: MATTER_RESOURCE.summaryLabels.plural,
  printList: printMatterList,
  redactionResourceType: MATTER_RESOURCE.redaction.resourceType,
  singularLabel: MATTER_RESOURCE.summaryLabels.singular,
});

const mattersGet = createGetCommand({
  apiPath: MATTER_RESOURCE.apiPath,
  defaultFields: MATTER_RESOURCE.defaultFields.get,
  printItem: printMatter,
  redactionResourceType: MATTER_RESOURCE.redaction.resourceType,
  usage: "Usage: not-manage matters get <id> [--fields ...] [--json]",
});

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
