const { activitiesGet, activitiesList } = require("./commands-activities");
const { billableClientsList } = require("./commands-billable-clients");
const { billableMattersList } = require("./commands-billable-matters");
const { billsGet, billsList } = require("./commands-bills");
const { contactsGet, contactsList } = require("./commands-contacts");
const { mattersGet, mattersList } = require("./commands-matters");
const { practiceAreasGet, practiceAreasList } = require("./commands-practice-areas");
const { tasksGet, tasksList } = require("./commands-tasks");
const { usersGet, usersList } = require("./commands-users");
const {
  createDetailPrinter,
  createListPrinter,
} = require("./resource-display");
const { buildListQueryFromResource } = require("./resource-query-builder");
const { createGetCommand, createListCommand } = require("./resource-command-runner");

const RESOURCE_HANDLERS = {
  activities: {
    get: activitiesGet,
    list: activitiesList,
  },
  "billable-clients": {
    list: billableClientsList,
  },
  "billable-matters": {
    list: billableMattersList,
  },
  bills: {
    get: billsGet,
    list: billsList,
  },
  contacts: {
    get: contactsGet,
    list: contactsList,
  },
  matters: {
    get: mattersGet,
    list: mattersList,
  },
  "practice-areas": {
    get: practiceAreasGet,
    list: practiceAreasList,
  },
  tasks: {
    get: tasksGet,
    list: tasksList,
  },
  users: {
    get: usersGet,
    list: usersList,
  },
};

const GENERIC_HANDLER_CACHE = new Map();

function createGenericHandlers(resourceMetadata) {
  if (!resourceMetadata || !resourceMetadata.display) {
    return null;
  }

  const cached = GENERIC_HANDLER_CACHE.get(resourceMetadata.handlerKey);
  if (cached) {
    return cached;
  }

  const handlers = {};

  if (resourceMetadata.supports.list && resourceMetadata.display.list) {
    const printList = createListPrinter(resourceMetadata.display.list);
    handlers.list = createListCommand({
      apiPath: resourceMetadata.apiPath,
      buildQuery: (options) =>
        buildListQueryFromResource(resourceMetadata, options, resourceMetadata.listQuery),
      formatRow: resourceMetadata.display.list.formatRow,
      pluralLabel: resourceMetadata.summaryLabels.plural,
      printList,
      redactionResourceType: resourceMetadata.redaction.resourceType,
      singularLabel: resourceMetadata.summaryLabels.singular,
    });
  }

  if (resourceMetadata.supports.get && resourceMetadata.display.get) {
    const printItem = createDetailPrinter(resourceMetadata.display.get);
    handlers.get = createGetCommand({
      apiPath: resourceMetadata.apiPath,
      defaultFields: resourceMetadata.defaultFields.get,
      printItem,
      redactionResourceType: resourceMetadata.redaction.resourceType,
      usage: `Usage: not-manage ${resourceMetadata.handlerKey} get <id> [--fields ...] [--json]`,
    });
  }

  GENERIC_HANDLER_CACHE.set(resourceMetadata.handlerKey, handlers);
  return handlers;
}

function getResourceHandler(resourceMetadata, subcommand) {
  if (!resourceMetadata) {
    return null;
  }

  const explicitHandler = RESOURCE_HANDLERS[resourceMetadata.handlerKey]?.[subcommand];
  if (explicitHandler) {
    return explicitHandler;
  }

  const genericHandlers = createGenericHandlers(resourceMetadata);
  return genericHandlers?.[subcommand] || null;
}

module.exports = {
  RESOURCE_HANDLERS,
  getResourceHandler,
};
