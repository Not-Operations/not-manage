const {
  createDetailPrinter,
  createListPrinter,
} = require("./resource-display");
const { buildListQueryFromResource } = require("./resource-query-builder");
const { createGetCommand, createListCommand } = require("./resource-command-runner");
const { getResourceMetadata } = require("./resource-metadata");
const { readStatus } = require("./resource-utils");

const TASK_RESOURCE = getResourceMetadata("tasks");

function readTaskStatus(status) {
  return readStatus(status);
}

function readTaskComplete(task) {
  if (typeof task?.complete === "boolean") {
    return task.complete;
  }

  if (typeof task?.status === "string") {
    return task.status.toLowerCase() === "complete";
  }

  return undefined;
}

function buildTaskQuery(options) {
  return buildListQueryFromResource(TASK_RESOURCE, options, TASK_RESOURCE.listQuery);
}

function formatTaskRow(task) {
  return TASK_RESOURCE.display.list.formatRow(task);
}

const printTaskList = createListPrinter(TASK_RESOURCE.display.list);
const printTask = createDetailPrinter(TASK_RESOURCE.display.get);

const tasksList = createListCommand({
  apiPath: TASK_RESOURCE.apiPath,
  buildQuery: buildTaskQuery,
  formatRow: formatTaskRow,
  pluralLabel: TASK_RESOURCE.summaryLabels.plural,
  printList: printTaskList,
  redactionResourceType: TASK_RESOURCE.redaction.resourceType,
  singularLabel: TASK_RESOURCE.summaryLabels.singular,
});

const tasksGet = createGetCommand({
  apiPath: TASK_RESOURCE.apiPath,
  defaultFields: TASK_RESOURCE.defaultFields.get,
  printItem: printTask,
  redactionResourceType: TASK_RESOURCE.redaction.resourceType,
  usage: "Usage: not-manage tasks get <id> [--fields ...] [--json]",
});

module.exports = {
  tasksGet,
  tasksList,
  __private: {
    buildTaskQuery,
    formatTaskRow,
    readTaskComplete,
    printTask,
    printTaskList,
    readTaskStatus,
  },
};
