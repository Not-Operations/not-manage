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
const {
  activitiesGet,
  activitiesList,
} = require("./commands-activities");
const { tasksGet, tasksList } = require("./commands-tasks");
const {
  billableClientsList,
} = require("./commands-billable-clients");
const {
  billableMattersList,
} = require("./commands-billable-matters");
const { contactsGet, contactsList } = require("./commands-contacts");
const { mattersGet, mattersList } = require("./commands-matters");
const {
  practiceAreasGet,
  practiceAreasList,
} = require("./commands-practice-areas");
const { usersGet, usersList } = require("./commands-users");
const { version } = require("../package.json");

const COMMAND_ALIASES = {
  activity: "activities",
  bill: "bills",
  "billable-client": "billable-clients",
  "billable-matter": "billable-matters",
  contact: "contacts",
  invoice: "invoices",
  matter: "matters",
  "practice-area": "practice-areas",
  task: "tasks",
  "time-entry": "time-entries",
  user: "users",
};
const DEFAULT_FIELDS_BY_COMMAND = {
  activities: {
    get:
      "id,type,date,quantity,quantity_in_hours,rounded_quantity,rounded_quantity_in_hours,price,total,billed,on_bill,non_billable,no_charge,flat_rate,contingency_fee,note,reference,created_at,updated_at,activity_description{id,name},bill{id,number,state},matter{id,display_number,number,description},user{id,name,first_name,last_name,email}",
    list:
      "id,type,date,quantity,quantity_in_hours,rounded_quantity,rounded_quantity_in_hours,price,total,billed,on_bill,non_billable,no_charge,flat_rate,contingency_fee,note,reference,created_at,updated_at,activity_description{id,name},bill{id,number,state},matter{id,display_number,number,description},user{id,name,first_name,last_name,email}",
  },
  "billable-clients": {
    list: "id,name,unbilled_hours,unbilled_amount,amount_in_trust,billable_matters_count",
  },
  "billable-matters": {
    list:
      "id,display_number,unbilled_hours,unbilled_amount,amount_in_trust,client{id,name,first_name,last_name}",
  },
  bills: {
    get:
      "id,number,state,type,kind,subject,memo,issued_at,due_at,paid,paid_at,pending,due,total,balance,created_at,updated_at,client{id,name,first_name,last_name},matters{id,display_number,number,description}",
    list:
      "id,number,state,type,kind,subject,memo,issued_at,due_at,paid,paid_at,pending,due,total,balance,created_at,updated_at,client{id,name,first_name,last_name},matters{id,display_number,number,description}",
  },
  contacts: {
    get:
      "id,name,first_name,last_name,type,is_client,primary_email_address,secondary_email_address,primary_phone_number,secondary_phone_number,clio_connect_email,title,prefix,created_at,updated_at",
    list:
      "id,name,first_name,last_name,type,is_client,primary_email_address,secondary_email_address,primary_phone_number,secondary_phone_number,clio_connect_email,title,prefix,created_at,updated_at",
  },
  invoices: {
    get:
      "id,number,state,type,kind,subject,memo,issued_at,due_at,paid,paid_at,pending,due,total,balance,created_at,updated_at,client{id,name,first_name,last_name},matters{id,display_number,number,description}",
    list:
      "id,number,state,type,kind,subject,memo,issued_at,due_at,paid,paid_at,pending,due,total,balance,created_at,updated_at,client{id,name,first_name,last_name},matters{id,display_number,number,description}",
  },
  matters: {
    get:
      "id,display_number,number,description,status,billable,open_date,close_date,pending_date,client{id,name,first_name,last_name},practice_area{id,name},responsible_attorney{id,name,email},responsible_staff{id,name,email},originating_attorney{id,name,email},created_at,updated_at",
    list:
      "id,display_number,number,description,status,billable,open_date,close_date,pending_date,client{id,name,first_name,last_name},practice_area{id,name},responsible_attorney{id,name,email},responsible_staff{id,name,email},originating_attorney{id,name,email},created_at,updated_at",
  },
  "practice-areas": {
    get: "id,code,name,category,created_at,updated_at",
    list: "id,code,name,category,created_at,updated_at",
  },
  tasks: {
    get:
      "id,name,description,status,priority,due_at,created_at,updated_at,matter{id,display_number,number,description,client},assignee{id,name},assigner{id,name},task_type{id,name}",
    list:
      "id,name,description,status,priority,due_at,created_at,updated_at,matter{id,display_number,number,description,client},assignee{id,name},assigner{id,name},task_type{id,name}",
  },
  "time-entries": {
    get:
      "id,type,date,quantity,quantity_in_hours,rounded_quantity,rounded_quantity_in_hours,price,total,billed,on_bill,non_billable,no_charge,flat_rate,contingency_fee,note,reference,created_at,updated_at,activity_description{id,name},bill{id,number,state},matter{id,display_number,number,description},user{id,name,first_name,last_name,email}",
    list:
      "id,type,date,quantity,quantity_in_hours,rounded_quantity,rounded_quantity_in_hours,price,total,billed,on_bill,non_billable,no_charge,flat_rate,contingency_fee,note,reference,created_at,updated_at,activity_description{id,name},bill{id,number,state},matter{id,display_number,number,description},user{id,name,first_name,last_name,email}",
  },
  users: {
    get:
      "id,name,first_name,last_name,email,enabled,roles,subscription_type,phone_number,time_zone,rate,account_owner,clio_connect,court_rules_default_attendee,created_at,updated_at",
    list:
      "id,name,first_name,last_name,email,enabled,roles,subscription_type,phone_number,time_zone,rate,account_owner,clio_connect,court_rules_default_attendee,created_at,updated_at",
  },
};
const DATA_COMMANDS = new Set([
  "activities",
  "time-entries",
  "tasks",
  "contacts",
  "matters",
  "bills",
  "invoices",
  "users",
  "practice-areas",
  "billable-matters",
  "billable-clients",
]);
const HIGH_RISK_COMMANDS = new Set([
  "activities",
  "time-entries",
  "tasks",
  "contacts",
  "matters",
  "bills",
  "invoices",
  "billable-matters",
  "billable-clients",
]);
const LIMITED_REDACTION_COMMANDS = new Set([
  "activities",
  "time-entries",
  "tasks",
  "matters",
  "bills",
  "invoices",
  "billable-matters",
]);

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

function normalizeCommand(command) {
  return COMMAND_ALIASES[command] || command;
}

function maybePrintDefaultFields(command, sub, optionValues) {
  if (optionValues.fields !== true) {
    return false;
  }

  const defaults = DEFAULT_FIELDS_BY_COMMAND[command]?.[sub];
  if (!defaults) {
    throw new Error(
      "`--fields` requires a comma-separated value for this command. Example: --fields id,name"
    );
  }

  console.log(defaults);
  return true;
}

function resolveRedactionPreference(optionValues) {
  if (optionValues.unredacted !== undefined) {
    return false;
  }

  return true;
}

function warnAboutRedaction(command, sub, optionValues, redacted) {
  if (sub !== "list" && sub !== "get" || !DATA_COMMANDS.has(command)) {
    return;
  }

  const explicitUnredacted = optionValues.unredacted !== undefined;
  const highRisk = HIGH_RISK_COMMANDS.has(command);

  if (explicitUnredacted && highRisk) {
    console.error(
      "Warning: showing raw output without redaction. This command can include client-identifying, confidential, or privileged information."
    );
    console.error(
      "Review output carefully before sharing it outside your firm or with any third party."
    );
    return;
  }

  if (!redacted || !highRisk) {
    return;
  }

  console.error(
    "Warning: output is redacted by default. Redaction is best-effort and may miss client or matter identifiers."
  );
  console.error(
    "Review output before sharing it outside your firm. Re-run with `--unredacted` to show raw output."
  );

  if (LIMITED_REDACTION_COMMANDS.has(command)) {
    console.error(
      "Warning: related matter labels, captions, and other non-client fields may still identify a matter."
    );
  }
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
  console.log("  activities list    List activities with filters and pagination");
  console.log("  activities get     Fetch a single activity by id");
  console.log("  tasks list         List tasks with filters and pagination");
  console.log("  tasks get          Fetch a single task by id");
  console.log("  contacts list      List contacts with filters and pagination");
  console.log("  contacts get       Fetch a single contact by id");
  console.log("  time-entries list  Alias for activities list filtered to TimeEntry");
  console.log("  time-entries get   Alias for activities get");
  console.log("  billable-clients list List clients with unbilled activity");
  console.log("  billable-matters list List matters with unbilled activity");
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
  console.log("Aliases:");
  console.log("  Singular aliases are accepted, for example:");
  console.log("  contact get, matter get, bill get, invoice get, task get, user get");
  console.log("");
  console.log("Options:");
  console.log("  --fields <list>    Override returned fields; pass `--fields` alone to print defaults");
  console.log("  --json             Print machine-readable JSON for supported commands");
  console.log("  --redacted         Kept for compatibility; data commands are redacted by default");
  console.log("  --unredacted       Show raw output without default redaction");
  console.log("  -h, --help         Show help");
  console.log("  -v, --version      Show version");
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
  const command = normalizeCommand(args[0]);
  const sub = args[1];
  const optionTokens = args.slice(2);
  const parsedOptions = parseOptions(optionTokens);
  const optionValues = parsedOptions.parsed;
  const positional = parsedOptions.positional;
  const redacted = resolveRedactionPreference(optionValues);

  if (maybePrintDefaultFields(command, sub, optionValues)) {
    return;
  }

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

  if ((command === "activities" || command === "time-entries") && sub === "list") {
    warnAboutRedaction(command, sub, optionValues, redacted);
    await activitiesList({
      activityDescriptionId:
        optionValues["activity-description-id"] || optionValues.activity_description_id,
      all: Boolean(optionValues.all),
      clientId: optionValues["client-id"] || optionValues.client_id,
      createdSince: optionValues["created-since"] || optionValues.created_since,
      endDate: optionValues["end-date"] || optionValues.end_date,
      fields: optionValues.fields,
      flatRate:
        optionValues["flat-rate"] === undefined && optionValues.flat_rate === undefined
          ? undefined
          : (optionValues["flat-rate"] || optionValues.flat_rate) !== "false",
      json,
      limit: optionValues.limit,
      matterId: optionValues["matter-id"] || optionValues.matter_id,
      onlyUnaccountedFor: Boolean(
        optionValues["only-unaccounted-for"] || optionValues.only_unaccounted_for
      ),
      order: optionValues.order,
      pageToken: optionValues["page-token"] || optionValues.page_token,
      query: optionValues.query,
      redacted,
      startDate: optionValues["start-date"] || optionValues.start_date,
      status: optionValues.status,
      taskId: optionValues["task-id"] || optionValues.task_id,
      type:
        command === "time-entries"
          ? "TimeEntry"
          : optionValues.type,
      updatedSince: optionValues["updated-since"] || optionValues.updated_since,
      userId: optionValues["user-id"] || optionValues.user_id,
    });
    return;
  }

  if ((command === "activities" || command === "time-entries") && sub === "get") {
    warnAboutRedaction(command, sub, optionValues, redacted);
    await activitiesGet({
      fields: optionValues.fields,
      id: positional[0],
      json,
      redacted,
    });
    return;
  }

  if (command === "tasks" && sub === "list") {
    warnAboutRedaction(command, sub, optionValues, redacted);
    await tasksList({
      all: Boolean(optionValues.all),
      clientId: optionValues["client-id"] || optionValues.client_id,
      complete:
        optionValues.complete === undefined
          ? undefined
          : optionValues.complete !== "false",
      createdSince: optionValues["created-since"] || optionValues.created_since,
      dueAtFrom: optionValues["due-at-from"] || optionValues.due_at_from,
      dueAtTo: optionValues["due-at-to"] || optionValues.due_at_to,
      fields: optionValues.fields,
      json,
      limit: optionValues.limit,
      matterId: optionValues["matter-id"] || optionValues.matter_id,
      order: optionValues.order,
      pageToken: optionValues["page-token"] || optionValues.page_token,
      priority: optionValues.priority,
      query: optionValues.query,
      redacted,
      responsibleAttorneyId:
        optionValues["responsible-attorney-id"] || optionValues.responsible_attorney_id,
      status: optionValues.status,
      taskTypeId: optionValues["task-type-id"] || optionValues.task_type_id,
      updatedSince: optionValues["updated-since"] || optionValues.updated_since,
    });
    return;
  }

  if (command === "tasks" && sub === "get") {
    warnAboutRedaction(command, sub, optionValues, redacted);
    await tasksGet({
      fields: optionValues.fields,
      id: positional[0],
      json,
      redacted,
    });
    return;
  }

  if (command === "contacts" && sub === "list") {
    warnAboutRedaction(command, sub, optionValues, redacted);
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
      redacted,
      type: optionValues.type,
      updatedSince: optionValues["updated-since"] || optionValues.updated_since,
    });
    return;
  }

  if (command === "contacts" && sub === "get") {
    warnAboutRedaction(command, sub, optionValues, redacted);
    await contactsGet({
      fields: optionValues.fields,
      id: positional[0],
      json,
      redacted,
    });
    return;
  }

  if (command === "matters" && sub === "list") {
    warnAboutRedaction(command, sub, optionValues, redacted);
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
      redacted,
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
    warnAboutRedaction(command, sub, optionValues, redacted);
    await mattersGet({
      fields: optionValues.fields,
      id: positional[0],
      json,
      redacted,
    });
    return;
  }

  if ((command === "bills" || command === "invoices") && sub === "list") {
    warnAboutRedaction(command, sub, optionValues, redacted);
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
      redacted,
      state: optionValues.state,
      status: optionValues.status,
      type: optionValues.type,
      updatedSince: optionValues["updated-since"] || optionValues.updated_since,
    });
    return;
  }

  if ((command === "bills" || command === "invoices") && sub === "get") {
    warnAboutRedaction(command, sub, optionValues, redacted);
    await billsGet({
      fields: optionValues.fields,
      id: positional[0],
      json,
      redacted,
    });
    return;
  }

  if (command === "users" && sub === "list") {
    warnAboutRedaction(command, sub, optionValues, redacted);
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
      redacted,
      role: optionValues.role,
      subscriptionType:
        optionValues["subscription-type"] || optionValues.subscription_type,
      updatedSince: optionValues["updated-since"] || optionValues.updated_since,
    });
    return;
  }

  if (command === "users" && sub === "get") {
    warnAboutRedaction(command, sub, optionValues, redacted);
    await usersGet({
      fields: optionValues.fields,
      id: positional[0],
      json,
      redacted,
    });
    return;
  }

  if (command === "practice-areas" && sub === "list") {
    warnAboutRedaction(command, sub, optionValues, redacted);
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
      redacted,
      updatedSince: optionValues["updated-since"] || optionValues.updated_since,
    });
    return;
  }

  if (command === "practice-areas" && sub === "get") {
    warnAboutRedaction(command, sub, optionValues, redacted);
    await practiceAreasGet({
      fields: optionValues.fields,
      id: positional[0],
      json,
      redacted,
    });
    return;
  }

  if (command === "billable-matters" && sub === "list") {
    warnAboutRedaction(command, sub, optionValues, redacted);
    await billableMattersList({
      all: Boolean(optionValues.all),
      clientId: optionValues["client-id"] || optionValues.client_id,
      endDate: optionValues["end-date"] || optionValues.end_date,
      fields: optionValues.fields,
      json,
      limit: optionValues.limit,
      matterId: optionValues["matter-id"] || optionValues.matter_id,
      originatingAttorneyId:
        optionValues["originating-attorney-id"] || optionValues.originating_attorney_id,
      pageToken: optionValues["page-token"] || optionValues.page_token,
      query: optionValues.query,
      redacted,
      responsibleAttorneyId:
        optionValues["responsible-attorney-id"] || optionValues.responsible_attorney_id,
      startDate: optionValues["start-date"] || optionValues.start_date,
    });
    return;
  }

  if (command === "billable-clients" && sub === "list") {
    warnAboutRedaction(command, sub, optionValues, redacted);
    await billableClientsList({
      all: Boolean(optionValues.all),
      clientId: optionValues["client-id"] || optionValues.client_id,
      endDate: optionValues["end-date"] || optionValues.end_date,
      fields: optionValues.fields,
      json,
      limit: optionValues.limit,
      matterId: optionValues["matter-id"] || optionValues.matter_id,
      originatingAttorneyId:
        optionValues["originating-attorney-id"] || optionValues.originating_attorney_id,
      pageToken: optionValues["page-token"] || optionValues.page_token,
      query: optionValues.query,
      redacted,
      responsibleAttorneyId:
        optionValues["responsible-attorney-id"] || optionValues.responsible_attorney_id,
      startDate: optionValues["start-date"] || optionValues.start_date,
    });
    return;
  }

  throw new Error(`Unknown command: ${args.join(" ")}`);
}

module.exports = {
  run,
};
