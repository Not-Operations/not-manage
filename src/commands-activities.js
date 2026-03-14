const { fetchResourceById, fetchResourcePage } = require("./clio-api");
const {
  createDetailPrinter,
  createListPrinter,
} = require("./resource-display");
const { buildListQueryFromResource } = require("./resource-query-builder");
const {
  compactQuery,
  fetchPages,
  readHours,
} = require("./resource-utils");
const {
  buildSummaryMessage,
  createGetCommand,
  createListCommand,
  fetchDefaultListResult,
} = require("./resource-command-runner");
const { getResourceMetadata } = require("./resource-metadata");

const ACTIVITY_RESOURCE = getResourceMetadata("activities");
const MATTER_RESOURCE = getResourceMetadata("matters");

function buildActivityQuery(options) {
  return buildListQueryFromResource(ACTIVITY_RESOURCE, options, ACTIVITY_RESOURCE.listQuery);
}

function formatActivityRow(activity) {
  return ACTIVITY_RESOURCE.display.list.formatRow(activity);
}

async function fetchMatterIdsForClient(config, accessToken, clientId) {
  const matterQuery = {
    client_id: clientId,
    fields: "id",
    limit: 200,
  };
  const result = await fetchPages(
    (pageQuery, nextPageUrl) =>
      fetchResourcePage(config, accessToken, MATTER_RESOURCE.apiPath, pageQuery, nextPageUrl),
    matterQuery,
    true
  );

  const matterIds = result.data
    .map((matter) => matter?.id)
    .filter((id) => id !== undefined && id !== null && id !== "");

  return {
    matterIds,
    pagesFetched: result.pagesFetched,
  };
}

async function fetchActivitiesForClient(config, accessToken, query, options) {
  if (query.page_token) {
    throw new Error(
      "`--page-token` is not supported with `activities list --client-id`. Use `--all` or filter by `--matter-id`."
    );
  }

  const { matterIds, pagesFetched: matterPagesFetched } = await fetchMatterIdsForClient(
    config,
    accessToken,
    options.clientId
  );

  if (matterIds.length === 0) {
    return {
      activityPagesFetched: 0,
      data: [],
      matterCount: 0,
      matterLookupPagesFetched: matterPagesFetched,
      moreResultsAvailable: false,
    };
  }

  const aggregateLimit = query.limit || 200;
  let remaining = options.all ? Number.POSITIVE_INFINITY : aggregateLimit;
  let activityPagesFetched = 0;
  const data = [];
  let moreResultsAvailable = false;

  for (let index = 0; index < matterIds.length; index += 1) {
    const matterId = matterIds[index];

    if (!options.all && remaining <= 0) {
      moreResultsAvailable = true;
      break;
    }

    const matterQuery = compactQuery({
      ...query,
      limit: options.all ? query.limit : Math.min(remaining, 200),
      matter_id: matterId,
      page_token: undefined,
    });
    const result = await fetchPages(
      (pageQuery, nextPageUrl) =>
        fetchResourcePage(config, accessToken, ACTIVITY_RESOURCE.apiPath, pageQuery, nextPageUrl),
      matterQuery,
      Boolean(options.all)
    );

    data.push(...result.data);
    activityPagesFetched += result.pagesFetched;

    if (!options.all) {
      remaining -= result.data.length;
      if (result.nextPageUrl || (remaining <= 0 && index < matterIds.length - 1)) {
        moreResultsAvailable = true;
      }
    }
  }

  return {
    activityPagesFetched,
    data,
    matterCount: matterIds.length,
    matterLookupPagesFetched: matterPagesFetched,
    moreResultsAvailable,
  };
}

async function fetchActivityListResult({ accessToken, apiPath, config, options, query }) {
  if (options.clientId && !options.matterId) {
    const clientResult = await fetchActivitiesForClient(config, accessToken, query, options);
    return {
      data: clientResult.data,
      extraMeta: {
        activity_pages_fetched: clientResult.activityPagesFetched,
        client_id: options.clientId,
        matter_count: clientResult.matterCount,
        matter_pages_fetched: clientResult.matterLookupPagesFetched,
        more_results_available: clientResult.moreResultsAvailable,
      },
      firstPage: {
        data: clientResult.data,
        meta: {
          paging: {
            next: clientResult.moreResultsAvailable ? "client-derived" : null,
          },
        },
      },
      nextPageUrl: clientResult.moreResultsAvailable ? "client-derived" : null,
      pageTokenSupported: false,
      pagesFetched: clientResult.activityPagesFetched,
      summaryMode: "client-derived",
    };
  }

  return {
    ...(await fetchDefaultListResult({
      accessToken,
      apiPath,
      config,
      options,
      query,
    })),
    pageTokenSupported: true,
    summaryMode: "default",
  };
}

function buildActivityJsonMeta({ result }) {
  return result.extraMeta || {};
}

function buildActivityListPrintOptions({ options, result }) {
  return {
    all: Boolean(options.all),
    nextPageUrl: result.nextPageUrl,
    pageTokenSupported: result.pageTokenSupported,
  };
}

function printActivitySummary({ result, rows }) {
  if (result.summaryMode === "client-derived") {
    console.log(
      `Returned ${rows.length} activit${rows.length === 1 ? "y" : "ies"} across ${result.pagesFetched} activity page${result.pagesFetched === 1 ? "" : "s"} for ${result.extraMeta.matter_count} matter${result.extraMeta.matter_count === 1 ? "" : "s"}.`
    );
    return;
  }

  console.log(
    buildSummaryMessage(
      rows.length,
      result.pagesFetched,
      ACTIVITY_RESOURCE.summaryLabels.singular,
      ACTIVITY_RESOURCE.summaryLabels.plural
    )
  );
}

const printActivityList = createListPrinter(ACTIVITY_RESOURCE.display.list);
const printActivity = createDetailPrinter(ACTIVITY_RESOURCE.display.get);

const activitiesList = createListCommand({
  apiPath: ACTIVITY_RESOURCE.apiPath,
  buildJsonMeta: buildActivityJsonMeta,
  buildListPrintOptions: buildActivityListPrintOptions,
  buildQuery: buildActivityQuery,
  fetchListResult: fetchActivityListResult,
  formatRow: formatActivityRow,
  pluralLabel: ACTIVITY_RESOURCE.summaryLabels.plural,
  printList: printActivityList,
  printSummary: printActivitySummary,
  redactionResourceType: ACTIVITY_RESOURCE.redaction.resourceType,
  singularLabel: ACTIVITY_RESOURCE.summaryLabels.singular,
});

const activitiesGet = createGetCommand({
  apiPath: ACTIVITY_RESOURCE.apiPath,
  defaultFields: ACTIVITY_RESOURCE.defaultFields.get,
  printItem: printActivity,
  redactionResourceType: ACTIVITY_RESOURCE.redaction.resourceType,
  usage: "Usage: not-manage activities get <id> [--fields ...] [--json]",
});

module.exports = {
  activitiesGet,
  activitiesList,
  __private: {
    buildActivityQuery,
    fetchActivitiesForClient,
    fetchMatterIdsForClient,
    formatActivityRow,
    printActivity,
    printActivityList,
    readHours,
  },
};
