const {
  fetchActivitiesPage,
  fetchActivity,
  getValidAccessToken,
} = require("./clio-api");
const { getConfig, getTokenSet } = require("./store");
const {
  clip,
  compactQuery,
  fetchPages,
  formatBoolean,
  formatMoney,
  parseLimit,
  printKeyValueRows,
  readMatterLabel,
  readUserName,
} = require("./resource-utils");
const { maybeRedactData, maybeRedactPayload } = require("./redaction");

const DEFAULT_LIST_FIELDS =
  "id,type,date,quantity,quantity_in_hours,price,total,billed,on_bill,non_billable,note,matter{id,display_number,number,description},user{id,name,first_name,last_name}";
const DEFAULT_GET_FIELDS =
  "id,type,date,quantity,quantity_in_hours,rounded_quantity,rounded_quantity_in_hours,price,total,billed,on_bill,non_billable,no_charge,flat_rate,contingency_fee,note,reference,created_at,updated_at,activity_description{id,name},bill{id,number,state},matter{id,display_number,number,description},user{id,name,first_name,last_name,email}";

function readHours(activity) {
  const quantityInHours = Number(activity?.quantity_in_hours);
  if (Number.isFinite(quantityInHours)) {
    return quantityInHours.toFixed(2);
  }

  const quantity = Number(activity?.quantity);
  if (Number.isFinite(quantity)) {
    return (quantity / 3600).toFixed(2);
  }

  return "-";
}

function buildActivityQuery(options) {
  return compactQuery({
    activity_description_id:
      options.activityDescriptionId || undefined,
    created_since: options.createdSince || undefined,
    end_date: options.endDate || undefined,
    fields: options.fields || DEFAULT_LIST_FIELDS,
    flat_rate:
      options.flatRate === undefined || options.flatRate === null
        ? undefined
        : Boolean(options.flatRate),
    limit: parseLimit(options.limit),
    matter_id: options.matterId || undefined,
    only_unaccounted_for: options.onlyUnaccountedFor ? true : undefined,
    order: options.order || undefined,
    page_token: options.pageToken || undefined,
    query: options.query || undefined,
    start_date: options.startDate || undefined,
    status: options.status || undefined,
    task_id: options.taskId || undefined,
    type: options.type || undefined,
    updated_since: options.updatedSince || undefined,
    user_id: options.userId || undefined,
  });
}

function formatActivityRow(activity) {
  return {
    id: String(activity.id || "-"),
    type: String(activity.type || "-"),
    date: String(activity.date || "-"),
    hours: readHours(activity),
    total: formatMoney(activity.total),
    billed: formatBoolean(activity.billed),
    matter: readMatterLabel(activity.matter),
    note: String(activity.note || "-"),
  };
}

function printActivityList(rows, options) {
  if (rows.length === 0) {
    console.log("No activities found for the selected filters.");
    return;
  }

  const visibleRows = rows.slice(0, 50);
  console.log("ID       TYPE        DATE       HOURS TOTAL      BILLED MATTER               NOTE");
  console.log("-------- ----------- ---------- ----- ---------- ------ -------------------- ------------------------------");

  visibleRows.forEach((row) => {
    const line = [
      clip(row.id, 8).padEnd(8, " "),
      clip(row.type, 11).padEnd(11, " "),
      clip(row.date, 10).padEnd(10, " "),
      clip(row.hours, 5).padEnd(5, " "),
      clip(row.total, 10).padEnd(10, " "),
      clip(row.billed, 6).padEnd(6, " "),
      clip(row.matter, 20).padEnd(20, " "),
      clip(row.note, 30),
    ].join(" ");

    console.log(line);
  });

  if (rows.length > visibleRows.length) {
    console.log(`Showing ${visibleRows.length} of ${rows.length} activities. Use --json for full output.`);
  }

  if (!options.all && options.nextPageUrl) {
    console.log("");
    console.log("More results are available.");
    console.log("Run again with `--all` or pass `--page-token` from `--json` output.");
  }
}

function printActivity(activity) {
  printKeyValueRows([
    ["ID", activity.id],
    ["Type", activity.type],
    ["Date", activity.date],
    ["Hours", readHours(activity)],
    ["Price", formatMoney(activity.price)],
    ["Total", formatMoney(activity.total)],
    ["Billed", formatBoolean(activity.billed)],
    ["On Bill", formatBoolean(activity.on_bill)],
    ["Non-Billable", formatBoolean(activity.non_billable)],
    ["No Charge", formatBoolean(activity.no_charge)],
    ["Flat Rate", formatBoolean(activity.flat_rate)],
    ["Contingency Fee", formatBoolean(activity.contingency_fee)],
    ["User", readUserName(activity.user)],
    ["Matter", readMatterLabel(activity.matter)],
    ["Activity Description", activity.activity_description?.name],
    ["Bill", activity.bill?.number],
    ["Bill State", activity.bill?.state],
    ["Reference", activity.reference],
    ["Note", activity.note],
    ["Created", activity.created_at],
    ["Updated", activity.updated_at],
  ]);
}

async function getAuthContext() {
  const config = await getConfig();
  const tokenSet = await getTokenSet();
  const accessToken = await getValidAccessToken(config, tokenSet);
  return { config, accessToken };
}

async function activitiesList(options = {}) {
  const query = buildActivityQuery(options);
  const { config, accessToken } = await getAuthContext();
  const result = await fetchPages(
    (pageQuery, nextPageUrl) => fetchActivitiesPage(config, accessToken, pageQuery, nextPageUrl),
    query,
    Boolean(options.all)
  );

  if (options.json) {
    const firstPage = maybeRedactPayload(result.firstPage, options, "activity");
    if (!options.all) {
      console.log(JSON.stringify(firstPage, null, 2));
      return;
    }

    const data = maybeRedactData(result.data, options, "activity");
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

  const rows = maybeRedactData(result.data, options, "activity").map(formatActivityRow);
  printActivityList(rows, { all: Boolean(options.all), nextPageUrl: result.nextPageUrl });
  console.log("");
  console.log(
    `Returned ${rows.length} activit${rows.length === 1 ? "y" : "ies"} across ${result.pagesFetched} page${result.pagesFetched === 1 ? "" : "s"}.`
  );
}

async function activitiesGet(options = {}) {
  if (!options.id) {
    throw new Error("Usage: clio-manage activities get <id> [--fields ...] [--json]");
  }

  const { config, accessToken } = await getAuthContext();
  const payload = await fetchActivity(config, accessToken, options.id, {
    fields: options.fields || DEFAULT_GET_FIELDS,
  });
  const redactedPayload = maybeRedactPayload(payload, options, "activity");

  if (options.json) {
    console.log(JSON.stringify(redactedPayload, null, 2));
    return;
  }

  printActivity(redactedPayload?.data || {});
}

module.exports = {
  activitiesGet,
  activitiesList,
  __private: {
    buildActivityQuery,
    formatActivityRow,
    printActivity,
    printActivityList,
    readHours,
  },
};
