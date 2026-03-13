const {
  fetchTask,
  fetchTasksPage,
  getValidAccessToken,
} = require("./clio-api");
const { getConfig, getTokenSet } = require("./store");
const {
  clip,
  compactQuery,
  fetchPages,
  formatBoolean,
  parseLimit,
  printKeyValueRows,
  readMatterLabel,
  readUserName,
} = require("./resource-utils");
const { maybeRedactData, maybeRedactPayload } = require("./redaction");

const DEFAULT_LIST_FIELDS =
  "id,name,description,status,priority,due_at,created_at,updated_at,matter{id,display_number,number,description,client},assignee{id,name},assigner{id,name},task_type{id,name}";
const DEFAULT_GET_FIELDS =
  "id,name,description,status,priority,due_at,created_at,updated_at,matter{id,display_number,number,description,client},assignee{id,name},assigner{id,name},task_type{id,name}";

function readTaskStatus(status) {
  if (!status) {
    return "-";
  }

  if (typeof status === "string") {
    return status;
  }

  return status.name || status.value || status.state || "-";
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
  return compactQuery({
    client_id: options.clientId || undefined,
    complete:
      options.complete === undefined || options.complete === null
        ? undefined
        : Boolean(options.complete),
    created_since: options.createdSince || undefined,
    due_at_from: options.dueAtFrom || undefined,
    due_at_to: options.dueAtTo || undefined,
    fields: options.fields || DEFAULT_LIST_FIELDS,
    limit: parseLimit(options.limit),
    matter_id: options.matterId || undefined,
    order: options.order || undefined,
    page_token: options.pageToken || undefined,
    priority: options.priority || undefined,
    query: options.query || undefined,
    responsible_attorney_id: options.responsibleAttorneyId || undefined,
    status: options.status || undefined,
    task_type_id: options.taskTypeId || undefined,
    updated_since: options.updatedSince || undefined,
  });
}

function formatTaskRow(task) {
  return {
    id: String(task.id || "-"),
    status: String(readTaskStatus(task.status)),
    dueAt: String(task.due_at || "-"),
    priority: String(task.priority || "-"),
    matter: readMatterLabel(task.matter),
    task: String(task.name || "-"),
  };
}

function printTaskList(rows, options) {
  if (rows.length === 0) {
    console.log("No tasks found for the selected filters.");
    return;
  }

  const visibleRows = rows.slice(0, 50);
  console.log("ID       STATUS       DUE          PRIORITY MATTER               TASK");
  console.log("-------- ------------ ------------ -------- -------------------- ------------------------------");

  visibleRows.forEach((row) => {
    const line = [
      clip(row.id, 8).padEnd(8, " "),
      clip(row.status, 12).padEnd(12, " "),
      clip(row.dueAt, 12).padEnd(12, " "),
      clip(row.priority, 8).padEnd(8, " "),
      clip(row.matter, 20).padEnd(20, " "),
      clip(row.task, 30),
    ].join(" ");

    console.log(line);
  });

  if (rows.length > visibleRows.length) {
    console.log(`Showing ${visibleRows.length} of ${rows.length} tasks. Use --json for full output.`);
  }

  if (!options.all && options.nextPageUrl) {
    console.log("");
    console.log("More results are available.");
    console.log("Run again with `--all` or pass `--page-token` from `--json` output.");
  }
}

function printTask(task) {
  printKeyValueRows([
    ["ID", task.id],
    ["Name", task.name],
    ["Description", task.description],
    ["Status", readTaskStatus(task.status)],
    ["Priority", task.priority],
    ["Due", task.due_at],
    ["Complete", formatBoolean(readTaskComplete(task))],
    ["Matter", readMatterLabel(task.matter)],
    ["Assignee", readUserName(task.assignee)],
    ["Assigner", readUserName(task.assigner)],
    ["Task Type", task.task_type?.name],
    ["Created", task.created_at],
    ["Updated", task.updated_at],
  ]);
}

async function getAuthContext() {
  const config = await getConfig();
  const tokenSet = await getTokenSet();
  const accessToken = await getValidAccessToken(config, tokenSet);
  return { config, accessToken };
}

async function tasksList(options = {}) {
  const query = buildTaskQuery(options);
  const { config, accessToken } = await getAuthContext();
  const result = await fetchPages(
    (pageQuery, nextPageUrl) => fetchTasksPage(config, accessToken, pageQuery, nextPageUrl),
    query,
    Boolean(options.all)
  );

  if (options.json) {
    const firstPage = maybeRedactPayload(result.firstPage, options, "task");
    if (!options.all) {
      console.log(JSON.stringify(firstPage, null, 2));
      return;
    }

    const data = maybeRedactData(result.data, options, "task");
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

  const rows = maybeRedactData(result.data, options, "task").map(formatTaskRow);
  printTaskList(rows, { all: Boolean(options.all), nextPageUrl: result.nextPageUrl });
  console.log("");
  console.log(
    `Returned ${rows.length} task${rows.length === 1 ? "" : "s"} across ${result.pagesFetched} page${result.pagesFetched === 1 ? "" : "s"}.`
  );
}

async function tasksGet(options = {}) {
  if (!options.id) {
    throw new Error("Usage: not-manage tasks get <id> [--fields ...] [--json]");
  }

  const { config, accessToken } = await getAuthContext();
  const payload = await fetchTask(config, accessToken, options.id, {
    fields: options.fields || DEFAULT_GET_FIELDS,
  });
  const redactedPayload = maybeRedactPayload(payload, options, "task");

  if (options.json) {
    console.log(JSON.stringify(redactedPayload, null, 2));
    return;
  }

  printTask(redactedPayload?.data || {});
}

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
