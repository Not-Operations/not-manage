const {
  authLogin,
  authRevoke,
  authSetup,
  authStatus,
  maybeRunSetupOnFirstUse,
  setupWizard,
  whoAmI,
} = require("./commands-auth");
const { billsGet, billsList } = require("./commands-bills");
const { contactsGet, contactsList } = require("./commands-contacts");
const { mattersGet, mattersList } = require("./commands-matters");
const {
  practiceAreasGet,
  practiceAreasList,
} = require("./commands-practice-areas");
const { usersGet, usersList } = require("./commands-users");
const { version } = require("../package.json");

function hasFlag(args, ...flags) {
  return flags.some((flag) => args.includes(flag));
}

function parseOptions(args) {
  const parsed = {};
  const positional = [];

  for (let i = 0; i < args.length; i += 1) {
    const token = args[i];

    if (!token.startsWith("--")) {
      positional.push(token);
      continue;
    }

    const inlineSplit = token.slice(2).split("=");
    const key = inlineSplit[0];
    const inlineValue = inlineSplit.length > 1 ? inlineSplit.slice(1).join("=") : null;

    if (inlineValue !== null) {
      parsed[key] = inlineValue;
      continue;
    }

    const next = args[i + 1];
    if (next && !next.startsWith("--")) {
      parsed[key] = next;
      i += 1;
      continue;
    }

    parsed[key] = true;
  }

  return { parsed, positional };
}

function printHelp() {
  console.log("clio-manage");
  console.log("");
  console.log("Usage:");
  console.log("  clio-manage <command> [options]");
  console.log("");
  console.log("Commands:");
  console.log("  setup              Run guided setup and OAuth login");
  console.log("  auth setup         Configure client credentials in OS keychain");
  console.log("  auth login         Run local OAuth login flow");
  console.log("  auth status        Show auth status and connected user");
  console.log("  auth revoke        Revoke token and clear local token storage");
  console.log("  contacts list      List contacts with filters and pagination");
  console.log("  contacts get       Fetch a single contact by id");
  console.log("  bills list         List bills with filters and pagination");
  console.log("  bills get          Fetch a single bill by id");
  console.log("  invoices list      Alias for bills list");
  console.log("  invoices get       Alias for bills get");
  console.log("  matters list       List matters with filters and pagination");
  console.log("  matters get        Fetch a single matter by id");
  console.log("  users list         List users with filters and pagination");
  console.log("  users get          Fetch a single user by id");
  console.log("  practice-areas list List practice areas with filters and pagination");
  console.log("  practice-areas get  Fetch a single practice area by id");
  console.log("  whoami             Call /api/v4/users/who_am_i");
  console.log("");
  console.log("Options:");
  console.log("  --json             Print machine-readable JSON for supported commands");
  console.log("  -h, --help         Show help");
  console.log("  -v, --version      Show version");
  console.log("");
  console.log("Power-user env vars:");
  console.log("  CLIO_REGION, CLIO_CLIENT_ID, CLIO_CLIENT_SECRET, CLIO_REDIRECT_URI");
  console.log("  CLIO_ACCESS_TOKEN, CLIO_REFRESH_TOKEN, CLIO_EXPIRES_AT");
}

async function run(args) {
  if (!args.length) {
    const startedOnboarding = await maybeRunSetupOnFirstUse();
    if (!startedOnboarding) {
      printHelp();
    }
    return;
  }

  if (hasFlag(args, "-h", "--help")) {
    printHelp();
    return;
  }

  if (hasFlag(args, "-v", "--version")) {
    console.log(`clio-manage v${version}`);
    return;
  }

  const json = hasFlag(args, "--json");
  const command = args[0];
  const sub = args[1];
  const optionTokens = args.slice(2);
  const parsedOptions = parseOptions(optionTokens);
  const optionValues = parsedOptions.parsed;
  const positional = parsedOptions.positional;

  if (command === "setup") {
    await setupWizard();
    return;
  }

  if (command === "auth" && sub === "setup") {
    await authSetup();
    return;
  }

  if (command === "auth" && sub === "login") {
    await authLogin();
    return;
  }

  if (command === "auth" && sub === "status") {
    await authStatus({ json });
    return;
  }

  if (command === "auth" && sub === "revoke") {
    await authRevoke();
    return;
  }

  if (command === "whoami") {
    await whoAmI({ json });
    return;
  }

  if (command === "contacts" && sub === "list") {
    await contactsList({
      all: Boolean(optionValues.all),
      clientOnly: Boolean(optionValues["client-only"] || optionValues.client_only),
      clioConnectOnly: Boolean(
        optionValues["clio-connect-only"] || optionValues.clio_connect_only
      ),
      createdSince: optionValues["created-since"] || optionValues.created_since,
      emailOnly: Boolean(optionValues["email-only"] || optionValues.email_only),
      fields: optionValues.fields,
      initial: optionValues.initial,
      json,
      limit: optionValues.limit,
      order: optionValues.order,
      pageToken: optionValues["page-token"] || optionValues.page_token,
      query: optionValues.query,
      type: optionValues.type,
      updatedSince: optionValues["updated-since"] || optionValues.updated_since,
    });
    return;
  }

  if (command === "contacts" && sub === "get") {
    await contactsGet({
      fields: optionValues.fields,
      id: positional[0],
      json,
    });
    return;
  }

  if (command === "matters" && sub === "list") {
    await mattersList({
      all: Boolean(optionValues.all),
      clientId: optionValues["client-id"] || optionValues.client_id,
      createdSince: optionValues["created-since"] || optionValues.created_since,
      fields: optionValues.fields,
      json,
      limit: optionValues.limit,
      order: optionValues.order,
      originatingAttorneyId:
        optionValues["originating-attorney-id"] || optionValues.originating_attorney_id,
      pageToken: optionValues["page-token"] || optionValues.page_token,
      practiceAreaId: optionValues["practice-area-id"] || optionValues.practice_area_id,
      query: optionValues.query,
      responsibleAttorneyId:
        optionValues["responsible-attorney-id"] || optionValues.responsible_attorney_id,
      responsibleStaffId:
        optionValues["responsible-staff-id"] || optionValues.responsible_staff_id,
      status: optionValues.status,
      updatedSince: optionValues["updated-since"] || optionValues.updated_since,
    });
    return;
  }

  if (command === "matters" && sub === "get") {
    await mattersGet({
      fields: optionValues.fields,
      id: positional[0],
      json,
    });
    return;
  }

  if ((command === "bills" || command === "invoices") && sub === "list") {
    await billsList({
      all: Boolean(optionValues.all),
      clientId: optionValues["client-id"] || optionValues.client_id,
      createdSince: optionValues["created-since"] || optionValues.created_since,
      dueAfter: optionValues["due-after"] || optionValues.due_after,
      dueBefore: optionValues["due-before"] || optionValues.due_before,
      fields: optionValues.fields,
      issuedAfter: optionValues["issued-after"] || optionValues.issued_after,
      issuedBefore: optionValues["issued-before"] || optionValues.issued_before,
      json,
      limit: optionValues.limit,
      matterId: optionValues["matter-id"] || optionValues.matter_id,
      order: optionValues.order,
      overdueOnly: Boolean(optionValues["overdue-only"] || optionValues.overdue_only),
      pageToken: optionValues["page-token"] || optionValues.page_token,
      query: optionValues.query,
      state: optionValues.state,
      status: optionValues.status,
      type: optionValues.type,
      updatedSince: optionValues["updated-since"] || optionValues.updated_since,
    });
    return;
  }

  if ((command === "bills" || command === "invoices") && sub === "get") {
    await billsGet({
      fields: optionValues.fields,
      id: positional[0],
      json,
    });
    return;
  }

  if (command === "users" && sub === "list") {
    await usersList({
      all: Boolean(optionValues.all),
      createdSince: optionValues["created-since"] || optionValues.created_since,
      enabled:
        optionValues.enabled === undefined ? undefined : optionValues.enabled !== "false",
      fields: optionValues.fields,
      includeCoCounsel: Boolean(
        optionValues["include-co-counsel"] || optionValues.include_co_counsel
      ),
      json,
      limit: optionValues.limit,
      name: optionValues.name,
      order: optionValues.order,
      pageToken: optionValues["page-token"] || optionValues.page_token,
      pendingSetup:
        optionValues["pending-setup"] === undefined && optionValues.pending_setup === undefined
          ? undefined
          : (optionValues["pending-setup"] || optionValues.pending_setup) !== "false",
      role: optionValues.role,
      subscriptionType:
        optionValues["subscription-type"] || optionValues.subscription_type,
      updatedSince: optionValues["updated-since"] || optionValues.updated_since,
    });
    return;
  }

  if (command === "users" && sub === "get") {
    await usersGet({
      fields: optionValues.fields,
      id: positional[0],
      json,
    });
    return;
  }

  if (command === "practice-areas" && sub === "list") {
    await practiceAreasList({
      all: Boolean(optionValues.all),
      code: optionValues.code,
      createdSince: optionValues["created-since"] || optionValues.created_since,
      fields: optionValues.fields,
      json,
      limit: optionValues.limit,
      matterId: optionValues["matter-id"] || optionValues.matter_id,
      name: optionValues.name,
      order: optionValues.order,
      pageToken: optionValues["page-token"] || optionValues.page_token,
      updatedSince: optionValues["updated-since"] || optionValues.updated_since,
    });
    return;
  }

  if (command === "practice-areas" && sub === "get") {
    await practiceAreasGet({
      fields: optionValues.fields,
      id: positional[0],
      json,
    });
    return;
  }

  throw new Error(`Unknown command: ${args.join(" ")}`);
}

module.exports = {
  run,
};
