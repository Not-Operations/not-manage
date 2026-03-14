const {
  createDetailPrinter,
  createListPrinter,
} = require("./resource-display");
const { buildListQueryFromResource } = require("./resource-query-builder");
const { createGetCommand, createListCommand } = require("./resource-command-runner");
const { getResourceMetadata } = require("./resource-metadata");

const USER_RESOURCE = getResourceMetadata("users");

function buildUserQuery(options) {
  return buildListQueryFromResource(USER_RESOURCE, options, USER_RESOURCE.listQuery);
}

function formatUserRow(user) {
  return USER_RESOURCE.display.list.formatRow(user);
}

const printUserList = createListPrinter(USER_RESOURCE.display.list);
const printUser = createDetailPrinter(USER_RESOURCE.display.get);

const usersList = createListCommand({
  apiPath: USER_RESOURCE.apiPath,
  buildQuery: buildUserQuery,
  formatRow: formatUserRow,
  pluralLabel: USER_RESOURCE.summaryLabels.plural,
  printList: printUserList,
  redactionResourceType: USER_RESOURCE.redaction.resourceType,
  singularLabel: USER_RESOURCE.summaryLabels.singular,
});

const usersGet = createGetCommand({
  apiPath: USER_RESOURCE.apiPath,
  defaultFields: USER_RESOURCE.defaultFields.get,
  printItem: printUser,
  redactionResourceType: USER_RESOURCE.redaction.resourceType,
  usage: "Usage: not-manage users get <id> [--fields ...] [--json]",
});

module.exports = {
  usersGet,
  usersList,
  __private: {
    buildUserQuery,
    formatUserRow,
    printUser,
    printUserList,
  },
};
