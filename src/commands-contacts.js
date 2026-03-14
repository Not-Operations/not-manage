const {
  createDetailPrinter,
  createListPrinter,
} = require("./resource-display");
const { buildListQueryFromResource } = require("./resource-query-builder");
const { createGetCommand, createListCommand } = require("./resource-command-runner");
const { getResourceMetadata } = require("./resource-metadata");

const CONTACT_RESOURCE = getResourceMetadata("contacts");

function buildContactQuery(options) {
  return buildListQueryFromResource(CONTACT_RESOURCE, options, CONTACT_RESOURCE.listQuery);
}

function formatContactRow(contact) {
  return CONTACT_RESOURCE.display.list.formatRow(contact);
}

const printContactList = createListPrinter(CONTACT_RESOURCE.display.list);
const printContact = createDetailPrinter(CONTACT_RESOURCE.display.get);

const contactsList = createListCommand({
  apiPath: CONTACT_RESOURCE.apiPath,
  buildQuery: buildContactQuery,
  formatRow: formatContactRow,
  pluralLabel: CONTACT_RESOURCE.summaryLabels.plural,
  printList: printContactList,
  redactionResourceType: CONTACT_RESOURCE.redaction.resourceType,
  singularLabel: CONTACT_RESOURCE.summaryLabels.singular,
});

const contactsGet = createGetCommand({
  apiPath: CONTACT_RESOURCE.apiPath,
  defaultFields: CONTACT_RESOURCE.defaultFields.get,
  printItem: printContact,
  redactionResourceType: CONTACT_RESOURCE.redaction.resourceType,
  usage: "Usage: not-manage contacts get <id> [--fields ...] [--json]",
});

module.exports = {
  contactsGet,
  contactsList,
  __private: {
    buildContactQuery,
    formatContactRow,
    printContact,
    printContactList,
  },
};
