const {
  formatBoolean,
  formatMoney,
  readContactName,
  readFirstMatterLabel,
  readHours,
  readMatterLabel,
  readRoleList,
  readStatus,
  readUserName,
} = require("./resource-utils");

const ACTIVITY_FIELDS =
  "id,type,date,quantity,quantity_in_hours,rounded_quantity,rounded_quantity_in_hours,price,total,billed,on_bill,non_billable,no_charge,flat_rate,contingency_fee,note,reference,created_at,updated_at,activity_description{id,name},bill{id,number,state},matter{id,display_number,number,description},user{id,name,first_name,last_name,email}";
const BILL_FIELDS =
  "id,number,state,type,kind,subject,memo,issued_at,due_at,paid,paid_at,pending,due,total,balance,created_at,updated_at,client{id,name,first_name,last_name},matters{id,display_number,number,description}";
const CONTACT_FIELDS =
  "id,name,first_name,last_name,type,is_client,primary_email_address,secondary_email_address,primary_phone_number,secondary_phone_number,clio_connect_email,title,prefix,created_at,updated_at";
const MATTER_FIELDS =
  "id,display_number,number,description,status,billable,open_date,close_date,pending_date,client{id,name,first_name,last_name},practice_area{id,name},responsible_attorney{id,name,email},responsible_staff{id,name,email},originating_attorney{id,name,email},created_at,updated_at";
const PRACTICE_AREA_FIELDS = "id,code,name,category,created_at,updated_at";
const TASK_FIELDS =
  "id,name,description,status,priority,due_at,created_at,updated_at,matter{id,display_number,number,description,client},assignee{id,name},assigner{id,name},task_type{id,name}";
const USER_FIELDS =
  "id,name,first_name,last_name,email,enabled,roles,subscription_type,phone_number,time_zone,rate,account_owner,clio_connect,court_rules_default_attendee,created_at,updated_at";
const BILLABLE_MATTER_FIELDS =
  "id,display_number,unbilled_hours,unbilled_amount,amount_in_trust,client{id,name,first_name,last_name}";
const BILLABLE_CLIENT_FIELDS =
  "id,name,unbilled_hours,unbilled_amount,amount_in_trust,billable_matters_count";
const CALENDAR_ENTRY_FIELDS =
  "id,summary,description,location,start_at,start_date,start_time,end_at,end_date,end_time,all_day,recurrence_rule,court_rule,permission,created_at,updated_at,calendar_owner{id,name,type,source,visible},matter{id,display_number,number,description,client},matter_docket{id,name,status},calendar_entry_event_type{id,name},attendees{id,name,type,email},calendars{id,name,type,source,visible},reminders{id,duration,next_delivery_at,state}";
const REMINDER_FIELDS =
  "id,duration,next_delivery_at,state,created_at,updated_at,notification_method{id,type,email_address},subject{id,type,identifier,secondary_identifier,tertiary_identifier}";
const COMMUNICATION_FIELDS =
  "id,subject,body,type,date,received_at,time_entries_count,created_at,updated_at,user{id,name,email},matter{id,display_number,number,description,client},senders{id,name,identifier,secondary_identifier,type},receivers{id,name,identifier,secondary_identifier,type}";
const CONVERSATION_FIELDS =
  "id,archived,read_only,current_user_is_member,subject,message_count,time_entries_count,read,created_at,updated_at,last_message{id,date,body},first_message{id,date,body},matter{id,display_number,number,description,client}";
const CONVERSATION_MESSAGE_FIELDS =
  "id,date,body,created_at,updated_at,sender{id,name,identifier,secondary_identifier,type},document{id,name,filename},conversation{id,subject},receivers{id,name,identifier,secondary_identifier,type}";
const NOTE_FIELDS =
  "id,type,subject,detail,detail_text_type,date,created_at,updated_at,time_entries_count,matter{id,display_number,number,description,client},contact{id,name,first_name,last_name},author{id,name,email}";
const CUSTOM_FIELD_FIELDS =
  "id,name,parent_type,field_type,displayed,deleted,required,display_order,created_at,updated_at,picklist_options{id,option,deleted_at}";
const OUTSTANDING_CLIENT_BALANCE_FIELDS =
  "id,associated_matter_ids,last_payment_date,last_shared_date,newest_issued_bill_due_date,pending_payments_total,reminders_enabled,total_outstanding_balance,created_at,updated_at,contact{id,name,first_name,last_name}";
const MATTER_DOCKET_FIELDS =
  "id,name,start_date,start_time,status,created_at,updated_at,deleted_at,matter{id,display_number,number,description,status,client},jurisdiction{id,description,system_id},trigger{id,description,system_id},service_type{id,description,system_id},calendar_entries{id,summary,start_at,start_date}";
const MY_EVENT_FIELDS =
  "event{id,message,icon,title,title_url,description,description_url,primary_detail,primary_detail_url,secondary_detail,secondary_detail_url,occurred_at,mobile_icon,subject_type,subject_id}";

function readMatterClientName(matter) {
  const single = readContactName(matter?.client);
  if (single !== "-") {
    return single;
  }

  const list = Array.isArray(matter?.clients) ? matter.clients : [];
  if (list.length > 0) {
    return readContactName(list[0]);
  }

  return "-";
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

function summarizeValues(list, mapValue, maxItems = 3) {
  const values = Array.isArray(list)
    ? list
        .map((item) => mapValue(item))
        .filter((value) => value && value !== "-")
    : [];

  if (values.length === 0) {
    return "-";
  }

  if (values.length <= maxItems) {
    return values.join(", ");
  }

  return `${values.slice(0, maxItems).join(", ")}, +${values.length - maxItems} more`;
}

function readCalendarName(calendar) {
  return String(calendar?.name || calendar?.type || calendar?.id || "-");
}

function readParticipantName(participant) {
  if (!participant || typeof participant !== "object") {
    return "-";
  }

  return (
    participant.name ||
    participant.identifier ||
    participant.secondary_identifier ||
    String(participant.id || "-")
  );
}

function readPolymorphicObjectLabel(value) {
  if (!value || typeof value !== "object") {
    return "-";
  }

  return (
    value.identifier ||
    value.secondary_identifier ||
    value.tertiary_identifier ||
    value.type ||
    String(value.id || "-")
  );
}

function readDocumentLabel(document) {
  if (!document || typeof document !== "object") {
    return "-";
  }

  return document.name || document.filename || String(document.id || "-");
}

function readCalendarEntryTimestamp(entry, prefix) {
  return (
    entry?.[`${prefix}_at`] ||
    [entry?.[`${prefix}_date`], entry?.[`${prefix}_time`]].filter(Boolean).join(" ") ||
    entry?.[`${prefix}_date`] ||
    "-"
  );
}

function readReminderNotificationMethod(reminder) {
  return (
    reminder?.notification_method?.type ||
    reminder?.notification_method?.email_address ||
    "-"
  );
}

function readMatterOrContactLabel(value) {
  const matterLabel = readMatterLabel(value?.matter);
  if (matterLabel !== "-") {
    return matterLabel;
  }

  return readContactName(value?.contact);
}

function readOutstandingMatterCount(balance) {
  const matterIds = Array.isArray(balance?.associated_matter_ids)
    ? balance.associated_matter_ids
    : [];
  return matterIds.length > 0 ? String(matterIds.length) : "-";
}

function readMatterDocketJurisdiction(docket) {
  return (
    docket?.jurisdiction?.description ||
    docket?.jurisdiction?.system_id ||
    String(docket?.jurisdiction?.id || "-")
  );
}

function readMatterDocketTrigger(docket) {
  return (
    docket?.trigger?.description ||
    docket?.trigger?.system_id ||
    String(docket?.trigger?.id || "-")
  );
}

function readMatterDocketServiceType(docket) {
  return (
    docket?.service_type?.description ||
    docket?.service_type?.system_id ||
    String(docket?.service_type?.id || "-")
  );
}

function readMyEventField(record, fieldName) {
  return record?.event?.[fieldName] || "-";
}

function readMyEventTitle(record) {
  return record?.event?.title || record?.event?.message || record?.event?.description || "-";
}

const VALID_BILL_STATUSES = new Set(["all", "overdue"]);

function normalizeBillStatusFilters(options = {}) {
  const state =
    typeof options.state === "string"
      ? options.state.trim() || undefined
      : options.state || undefined;

  if (options.status === undefined || options.status === null || options.status === "") {
    return { state, status: undefined };
  }

  if (typeof options.status !== "string") {
    throw new Error(
      "Invalid value for --status on bills/invoices. Use `all`, `overdue`, or `unpaid`."
    );
  }

  const status = options.status.trim().toLowerCase();

  if (!status) {
    throw new Error(
      "Invalid value for --status on bills/invoices. Use `all`, `overdue`, or `unpaid`."
    );
  }

  if (status === "unpaid") {
    if (state && state !== "awaiting_payment") {
      throw new Error(
        "`--status unpaid` conflicts with `--state`. Use `--state awaiting_payment` or remove one of the filters."
      );
    }

    return {
      state: state || "awaiting_payment",
      status: undefined,
    };
  }

  if (!VALID_BILL_STATUSES.has(status)) {
    throw new Error(
      "Invalid value for --status on bills/invoices. Use `all`, `overdue`, or `unpaid`."
    );
  }

  return { state, status };
}

function applyBillStatusFilters(query, options) {
  const filters = normalizeBillStatusFilters(options);
  return {
    ...query,
    state: filters.state,
    status: filters.status,
  };
}

const RESOURCE_ORDER = [
  "activities",
  "calendar-entries",
  "reminders",
  "tasks",
  "contacts",
  "communications",
  "conversations",
  "conversation-messages",
  "notes",
  "custom-fields",
  "time-entries",
  "billable-clients",
  "billable-matters",
  "bills",
  "invoices",
  "outstanding-client-balances",
  "matters",
  "matter-dockets",
  "users",
  "practice-areas",
  "my-events",
];

const RESOURCE_METADATA = {
  activities: {
    aliases: ["activity"],
    apiPath: "activities",
    defaultFields: {
      get: ACTIVITY_FIELDS,
      list: ACTIVITY_FIELDS,
    },
    handlerKey: "activities",
    help: {
      get: "Fetch a single activity by id",
      list: "List activities with filters and pagination",
    },
    optionSchema: {
      get: {
        fields: { kind: "string", option: "fields" },
        id: { positional: 0 },
      },
      list: {
        activityDescriptionId: { kind: "string", option: "activity-description-id" },
        all: { kind: "flag", option: "all" },
        clientId: { kind: "string", option: "client-id", query: false },
        createdSince: { kind: "string", option: "created-since" },
        endDate: { kind: "iso-date", option: "end-date" },
        fields: { kind: "string", option: "fields" },
        flatRate: { kind: "boolean", option: "flat-rate" },
        limit: { kind: "string", option: "limit" },
        matterId: { kind: "string", option: "matter-id" },
        onlyUnaccountedFor: { kind: "flag", option: "only-unaccounted-for" },
        order: { kind: "string", option: "order" },
        pageToken: { kind: "string", option: "page-token" },
        query: { kind: "string", option: "query" },
        startDate: { kind: "iso-date", option: "start-date" },
        status: { kind: "string", option: "status" },
        taskId: { kind: "string", option: "task-id" },
        type: { kind: "string", option: "type" },
        updatedSince: { kind: "string", option: "updated-since" },
        userId: { kind: "string", option: "user-id" },
      },
    },
    listQuery: {
      limitMax: 200,
    },
    redaction: {
      resourceType: "activity",
      warningLevel: "limited",
    },
    riskLevel: "high",
    display: {
      get: {
        fields: [
          { label: "ID", value: (activity) => activity.id },
          { label: "Type", value: (activity) => activity.type },
          { label: "Date", value: (activity) => activity.date },
          { label: "Hours", value: readHours },
          { label: "Price", value: (activity) => formatMoney(activity.price) },
          { label: "Total", value: (activity) => formatMoney(activity.total) },
          { label: "Billed", value: (activity) => formatBoolean(activity.billed) },
          { label: "On Bill", value: (activity) => formatBoolean(activity.on_bill) },
          { label: "Non-Billable", value: (activity) => formatBoolean(activity.non_billable) },
          { label: "No Charge", value: (activity) => formatBoolean(activity.no_charge) },
          { label: "Flat Rate", value: (activity) => formatBoolean(activity.flat_rate) },
          {
            label: "Contingency Fee",
            value: (activity) => formatBoolean(activity.contingency_fee),
          },
          { label: "User", value: (activity) => readUserName(activity.user) },
          { label: "Matter", value: (activity) => readMatterLabel(activity.matter) },
          {
            label: "Activity Description",
            value: (activity) => activity.activity_description?.name,
          },
          { label: "Bill", value: (activity) => activity.bill?.number },
          { label: "Bill State", value: (activity) => activity.bill?.state },
          { label: "Reference", value: (activity) => activity.reference },
          { label: "Note", value: (activity) => activity.note },
          { label: "Created", value: (activity) => activity.created_at },
          { label: "Updated", value: (activity) => activity.updated_at },
        ],
      },
      list: {
        columns: [
          { header: "ID", key: "id", width: 8 },
          { header: "TYPE", key: "type", width: 11 },
          { header: "DATE", key: "date", width: 10 },
          { header: "HOURS", key: "hours", width: 5 },
          { header: "TOTAL", key: "total", width: 10 },
          { header: "BILLED", key: "billed", width: 6 },
          { header: "MATTER", key: "matter", width: 20 },
          { header: "NOTE", key: "note", width: 30, pad: false },
        ],
        emptyMessage: "No activities found for the selected filters.",
        formatRow: (activity) => ({
          billed: formatBoolean(activity.billed),
          date: String(activity.date || "-"),
          hours: readHours(activity),
          id: String(activity.id || "-"),
          matter: readMatterLabel(activity.matter),
          note: String(activity.note || "-"),
          total: formatMoney(activity.total),
          type: String(activity.type || "-"),
        }),
        moreResults: (options) => {
          if (options.pageTokenSupported === false) {
            return [
              "More results are available.",
              "Run again with `--all` to fetch every matching activity.",
            ];
          }

          return [
            "More results are available.",
            "Run again with `--all` or pass `--page-token` from `--json` output.",
          ];
        },
        noun: "activities",
      },
    },
    summaryLabels: {
      plural: "activities",
      singular: "activity",
    },
    supports: {
      get: true,
      list: true,
    },
  },
  "billable-clients": {
    aliases: ["billable-client"],
    apiPath: "billable_clients",
    defaultFields: {
      list: BILLABLE_CLIENT_FIELDS,
    },
    handlerKey: "billable-clients",
    help: {
      list: "List clients with unbilled activity",
    },
    optionSchema: {
      list: {
        all: { kind: "flag", option: "all" },
        clientId: { kind: "string", option: "client-id" },
        endDate: { kind: "iso-date", option: "end-date" },
        fields: { kind: "string", option: "fields" },
        limit: { kind: "string", option: "limit" },
        matterId: { kind: "string", option: "matter-id" },
        originatingAttorneyId: { kind: "string", option: "originating-attorney-id" },
        pageToken: { kind: "string", option: "page-token" },
        query: { kind: "string", option: "query" },
        responsibleAttorneyId: { kind: "string", option: "responsible-attorney-id" },
        startDate: { kind: "iso-date", option: "start-date" },
      },
    },
    listQuery: {
      limitMax: 25,
    },
    redaction: {
      resourceType: "billable-client",
      warningLevel: "standard",
    },
    riskLevel: "high",
    display: {
      list: {
        columns: [
          { header: "ID", key: "id", width: 8 },
          { header: "NAME", key: "name", width: 28 },
          { header: "HOURS", key: "hours", width: 5 },
          { header: "AMOUNT", key: "amount", width: 10 },
          { header: "TRUST", key: "trust", width: 10 },
          { header: "MATTERS", key: "matters", width: 7, pad: false },
        ],
        emptyMessage: "No billable clients found for the selected filters.",
        formatRow: (record) => ({
          amount: formatMoney(record.unbilled_amount),
          hours:
            record.unbilled_hours === undefined || record.unbilled_hours === null
              ? "-"
              : Number(record.unbilled_hours).toFixed(2),
          id: String(record.id || "-"),
          matters: String(record.billable_matters_count ?? "-"),
          name: String(record.name || "-"),
          trust: formatMoney(record.amount_in_trust),
        }),
        noun: "billable clients",
      },
    },
    summaryLabels: {
      plural: "billable clients",
      singular: "billable client",
    },
    supports: {
      get: false,
      list: true,
    },
  },
  "billable-matters": {
    aliases: ["billable-matter"],
    apiPath: "billable_matters",
    defaultFields: {
      list: BILLABLE_MATTER_FIELDS,
    },
    handlerKey: "billable-matters",
    help: {
      list: "List matters with unbilled activity",
    },
    optionSchema: {
      list: {
        all: { kind: "flag", option: "all" },
        clientId: { kind: "string", option: "client-id" },
        endDate: { kind: "iso-date", option: "end-date" },
        fields: { kind: "string", option: "fields" },
        limit: { kind: "string", option: "limit" },
        matterId: { kind: "string", option: "matter-id" },
        originatingAttorneyId: { kind: "string", option: "originating-attorney-id" },
        pageToken: { kind: "string", option: "page-token" },
        query: { kind: "string", option: "query" },
        responsibleAttorneyId: { kind: "string", option: "responsible-attorney-id" },
        startDate: { kind: "iso-date", option: "start-date" },
      },
    },
    listQuery: {
      limitMax: 1000,
    },
    redaction: {
      resourceType: "billable-matter",
      warningLevel: "limited",
    },
    riskLevel: "high",
    display: {
      list: {
        columns: [
          { header: "ID", key: "id", width: 8 },
          { header: "MATTER", key: "matter", width: 21 },
          { header: "CLIENT", key: "client", width: 20 },
          { header: "HOURS", key: "hours", width: 5 },
          { header: "AMOUNT", key: "amount", width: 10 },
          { header: "TRUST", key: "trust", width: 10, pad: false },
        ],
        emptyMessage: "No billable matters found for the selected filters.",
        formatRow: (record) => ({
          amount: formatMoney(record.unbilled_amount),
          client: readContactName(record.client),
          hours:
            record.unbilled_hours === undefined || record.unbilled_hours === null
              ? "-"
              : Number(record.unbilled_hours).toFixed(2),
          id: String(record.id || "-"),
          matter: String(record.display_number || "-"),
          trust: formatMoney(record.amount_in_trust),
        }),
        noun: "billable matters",
      },
    },
    summaryLabels: {
      plural: "billable matters",
      singular: "billable matter",
    },
    supports: {
      get: false,
      list: true,
    },
  },
  bills: {
    aliases: ["bill"],
    apiPath: "bills",
    defaultFields: {
      get: BILL_FIELDS,
      list: BILL_FIELDS,
    },
    handlerKey: "bills",
    help: {
      get: "Fetch a single bill by id",
      list: "List bills with filters and pagination",
    },
    optionSchema: {
      get: {
        fields: { kind: "string", option: "fields" },
        id: { positional: 0 },
      },
      list: {
        all: { kind: "flag", option: "all" },
        clientId: { kind: "string", option: "client-id" },
        createdSince: { kind: "string", option: "created-since" },
        dueAfter: { kind: "iso-date", option: "due-after" },
        dueBefore: { kind: "iso-date", option: "due-before" },
        fields: { kind: "string", option: "fields" },
        issuedAfter: { kind: "iso-date", option: "issued-after" },
        issuedBefore: { kind: "iso-date", option: "issued-before" },
        limit: { kind: "string", option: "limit" },
        matterId: { kind: "string", option: "matter-id" },
        order: { kind: "string", option: "order" },
        overdueOnly: { kind: "flag", option: "overdue-only" },
        pageToken: { kind: "string", option: "page-token" },
        query: { kind: "string", option: "query" },
        state: { kind: "string", option: "state" },
        status: { kind: "string", option: "status" },
        type: { kind: "string", option: "type" },
        updatedSince: { kind: "string", option: "updated-since" },
      },
    },
    listQuery: {
      limitMax: 200,
      transform: applyBillStatusFilters,
    },
    redaction: {
      resourceType: "bill",
      warningLevel: "limited",
    },
    riskLevel: "high",
    display: {
      get: {
        fields: [
          { label: "ID", value: (bill) => bill.id },
          { label: "Number", value: (bill) => bill.number },
          { label: "State", value: (bill) => bill.state },
          { label: "Type", value: (bill) => bill.type || bill.kind },
          { label: "Client", value: (bill) => readContactName(bill.client) },
          { label: "Matter", value: readFirstMatterLabel },
          { label: "Issued", value: (bill) => bill.issued_at },
          { label: "Due", value: (bill) => bill.due_at },
          { label: "Paid", value: (bill) => formatMoney(bill.paid) },
          { label: "Pending", value: (bill) => formatMoney(bill.pending) },
          { label: "Due Amount", value: (bill) => formatMoney(bill.due) },
          { label: "Total", value: (bill) => formatMoney(bill.total) },
          { label: "Balance", value: (bill) => formatMoney(bill.balance) },
          { label: "Subject", value: (bill) => bill.subject },
          { label: "Memo", value: (bill) => bill.memo },
          { label: "Created", value: (bill) => bill.created_at },
          { label: "Updated", value: (bill) => bill.updated_at },
        ],
      },
      list: {
        columns: [
          { header: "ID", key: "id", width: 8 },
          { header: "NUMBER", key: "number", width: 12 },
          { header: "STATE", key: "state", width: 12 },
          { header: "CLIENT", key: "client", width: 20 },
          { header: "DUE", key: "dueAt", width: 12 },
          { header: "BALANCE", key: "balance", width: 10, pad: false },
        ],
        emptyMessage: "No bills found for the selected filters.",
        formatRow: (bill) => ({
          id: String(bill.id || "-"),
          number: String(bill.number || "-"),
          state: String(bill.state || "-"),
          client: readContactName(bill.client),
          dueAt: String(bill.due_at || "-"),
          balance: formatMoney(bill.balance),
        }),
        noun: "bills",
      },
    },
    summaryLabels: {
      plural: "bills",
      singular: "bill",
    },
    supports: {
      get: true,
      list: true,
    },
  },
  contacts: {
    aliases: ["contact"],
    apiPath: "contacts",
    defaultFields: {
      get: CONTACT_FIELDS,
      list: CONTACT_FIELDS,
    },
    handlerKey: "contacts",
    help: {
      get: "Fetch a single contact by id",
      list: "List contacts with filters and pagination",
    },
    optionSchema: {
      get: {
        fields: { kind: "string", option: "fields" },
        id: { positional: 0 },
      },
      list: {
        all: { kind: "flag", option: "all" },
        clientOnly: { kind: "flag", option: "client-only" },
        clioConnectOnly: { kind: "flag", option: "clio-connect-only" },
        createdSince: { kind: "string", option: "created-since" },
        emailOnly: { kind: "flag", option: "email-only" },
        fields: { kind: "string", option: "fields" },
        initial: { kind: "string", option: "initial" },
        limit: { kind: "string", option: "limit" },
        order: { kind: "string", option: "order" },
        pageToken: { kind: "string", option: "page-token" },
        query: { kind: "string", option: "query" },
        type: { kind: "string", option: "type" },
        updatedSince: { kind: "string", option: "updated-since" },
      },
    },
    listQuery: {
      limitMax: 200,
    },
    redaction: {
      resourceType: "contact",
      warningLevel: "standard",
    },
    riskLevel: "high",
    display: {
      get: {
        fields: [
          { label: "ID", value: (contact) => contact.id },
          { label: "Name", value: readContactName },
          { label: "Type", value: (contact) => contact.type },
          { label: "Client", value: (contact) => formatBoolean(contact.is_client) },
          { label: "Primary Email", value: (contact) => contact.primary_email_address },
          { label: "Secondary Email", value: (contact) => contact.secondary_email_address },
          { label: "Primary Phone", value: (contact) => contact.primary_phone_number },
          { label: "Secondary Phone", value: (contact) => contact.secondary_phone_number },
          { label: "Clio Connect Email", value: (contact) => contact.clio_connect_email },
          { label: "Title", value: (contact) => contact.title },
          { label: "Prefix", value: (contact) => contact.prefix },
          { label: "Created", value: (contact) => contact.created_at },
          { label: "Updated", value: (contact) => contact.updated_at },
        ],
      },
      list: {
        columns: [
          { header: "ID", key: "id", width: 8 },
          { header: "NAME", key: "name", width: 28 },
          { header: "TYPE", key: "type", width: 12 },
          { header: "CLIENT", key: "client", width: 6 },
          { header: "EMAIL", key: "email", width: 28 },
          { header: "PHONE", key: "phone", width: 18, pad: false },
        ],
        emptyMessage: "No contacts found for the selected filters.",
        formatRow: (contact) => ({
          id: String(contact.id || "-"),
          name: readContactName(contact),
          type: String(contact.type || "-"),
          client: formatBoolean(contact.is_client),
          email: String(contact.primary_email_address || "-"),
          phone: String(contact.primary_phone_number || "-"),
        }),
        noun: "contacts",
      },
    },
    summaryLabels: {
      plural: "contacts",
      singular: "contact",
    },
    supports: {
      get: true,
      list: true,
    },
  },
  invoices: {
    aliases: ["invoice"],
    apiPath: "bills",
    defaultFields: {
      get: BILL_FIELDS,
      list: BILL_FIELDS,
    },
    handlerKey: "bills",
    help: {
      get: "Alias for bills get",
      list: "Alias for bills list",
    },
    optionSchema: {
      get: {
        fields: { kind: "string", option: "fields" },
        id: { positional: 0 },
      },
      list: {
        all: { kind: "flag", option: "all" },
        clientId: { kind: "string", option: "client-id" },
        createdSince: { kind: "string", option: "created-since" },
        dueAfter: { kind: "iso-date", option: "due-after" },
        dueBefore: { kind: "iso-date", option: "due-before" },
        fields: { kind: "string", option: "fields" },
        issuedAfter: { kind: "iso-date", option: "issued-after" },
        issuedBefore: { kind: "iso-date", option: "issued-before" },
        limit: { kind: "string", option: "limit" },
        matterId: { kind: "string", option: "matter-id" },
        order: { kind: "string", option: "order" },
        overdueOnly: { kind: "flag", option: "overdue-only" },
        pageToken: { kind: "string", option: "page-token" },
        query: { kind: "string", option: "query" },
        state: { kind: "string", option: "state" },
        status: { kind: "string", option: "status" },
        type: { kind: "string", option: "type" },
        updatedSince: { kind: "string", option: "updated-since" },
      },
    },
    listQuery: {
      limitMax: 200,
      transform: applyBillStatusFilters,
    },
    redaction: {
      resourceType: "bill",
      warningLevel: "limited",
    },
    riskLevel: "high",
    summaryLabels: {
      plural: "bills",
      singular: "bill",
    },
    supports: {
      get: true,
      list: true,
    },
  },
  matters: {
    aliases: ["matter"],
    apiPath: "matters",
    defaultFields: {
      get: MATTER_FIELDS,
      list: MATTER_FIELDS,
    },
    handlerKey: "matters",
    help: {
      get: "Fetch a single matter by id",
      list: "List matters with filters and pagination",
    },
    optionSchema: {
      get: {
        fields: { kind: "string", option: "fields" },
        id: { positional: 0 },
      },
      list: {
        all: { kind: "flag", option: "all" },
        clientId: { kind: "string", option: "client-id" },
        createdSince: { kind: "string", option: "created-since" },
        fields: { kind: "string", option: "fields" },
        limit: { kind: "string", option: "limit" },
        order: { kind: "string", option: "order" },
        originatingAttorneyId: { kind: "string", option: "originating-attorney-id" },
        pageToken: { kind: "string", option: "page-token" },
        practiceAreaId: { kind: "string", option: "practice-area-id" },
        query: { kind: "string", option: "query" },
        responsibleAttorneyId: { kind: "string", option: "responsible-attorney-id" },
        responsibleStaffId: { kind: "string", option: "responsible-staff-id" },
        status: { kind: "string", option: "status" },
        updatedSince: { kind: "string", option: "updated-since" },
      },
    },
    listQuery: {
      limitMax: 200,
    },
    redaction: {
      resourceType: "matter",
      warningLevel: "limited",
    },
    riskLevel: "high",
    display: {
      get: {
        fields: [
          { label: "ID", value: (matter) => matter.id },
          { label: "Matter", value: (matter) => matter.display_number || matter.number },
          { label: "Description", value: (matter) => matter.description },
          { label: "Status", value: (matter) => readStatus(matter.status) },
          { label: "Client", value: readMatterClientName },
          { label: "Practice Area", value: (matter) => matter.practice_area?.name },
          {
            label: "Responsible Attorney",
            value: (matter) => readUserName(matter.responsible_attorney),
          },
          {
            label: "Responsible Staff",
            value: (matter) => readUserName(matter.responsible_staff),
          },
          {
            label: "Originating Attorney",
            value: (matter) => readUserName(matter.originating_attorney),
          },
          { label: "Billable", value: (matter) => formatBoolean(matter.billable) },
          { label: "Open Date", value: (matter) => matter.open_date },
          { label: "Pending Date", value: (matter) => matter.pending_date },
          { label: "Close Date", value: (matter) => matter.close_date },
          { label: "Created", value: (matter) => matter.created_at },
          { label: "Updated", value: (matter) => matter.updated_at },
        ],
      },
      list: {
        columns: [
          { header: "ID", key: "id", width: 8 },
          { header: "MATTER", key: "displayNumber", width: 21 },
          { header: "STATUS", key: "status", width: 9 },
          { header: "CLIENT", key: "client", width: 20 },
          { header: "DESCRIPTION", key: "description", width: 30, pad: false },
        ],
        emptyMessage: "No matters found for the selected filters.",
        formatRow: (matter) => ({
          id: String(matter.id || "-"),
          displayNumber: String(matter.display_number || matter.number || "-"),
          status: String(readStatus(matter.status)),
          client: String(readMatterClientName(matter)),
          description: String(matter.description || "-"),
        }),
        noun: "matters",
      },
    },
    summaryLabels: {
      plural: "matters",
      singular: "matter",
    },
    supports: {
      get: true,
      list: true,
    },
  },
  "practice-areas": {
    aliases: ["practice-area"],
    apiPath: "practice_areas",
    defaultFields: {
      get: PRACTICE_AREA_FIELDS,
      list: PRACTICE_AREA_FIELDS,
    },
    handlerKey: "practice-areas",
    help: {
      get: "Fetch a single practice area by id",
      list: "List practice areas with filters and pagination",
    },
    optionSchema: {
      get: {
        fields: { kind: "string", option: "fields" },
        id: { positional: 0 },
      },
      list: {
        all: { kind: "flag", option: "all" },
        code: { kind: "string", option: "code" },
        createdSince: { kind: "string", option: "created-since" },
        fields: { kind: "string", option: "fields" },
        limit: { kind: "string", option: "limit" },
        matterId: { kind: "string", option: "matter-id", query: false },
        name: { kind: "string", option: "name" },
        order: { kind: "string", option: "order" },
        pageToken: { kind: "string", option: "page-token" },
        updatedSince: { kind: "string", option: "updated-since" },
      },
    },
    listQuery: {
      limitMax: 200,
    },
    redaction: {
      resourceType: "practice-area",
      warningLevel: "none",
    },
    riskLevel: "low",
    display: {
      get: {
        fields: [
          { label: "ID", value: (practiceArea) => practiceArea.id },
          { label: "Code", value: (practiceArea) => practiceArea.code },
          { label: "Name", value: (practiceArea) => practiceArea.name },
          { label: "Category", value: (practiceArea) => practiceArea.category },
          { label: "Created", value: (practiceArea) => practiceArea.created_at },
          { label: "Updated", value: (practiceArea) => practiceArea.updated_at },
        ],
      },
      list: {
        columns: [
          { header: "ID", key: "id", width: 8 },
          { header: "CODE", key: "code", width: 12 },
          { header: "NAME", key: "name", width: 28 },
          { header: "CATEGORY", key: "category", width: 30, pad: false },
        ],
        emptyMessage: "No practice areas found for the selected filters.",
        formatRow: (practiceArea) => ({
          category: String(practiceArea.category || "-"),
          code: String(practiceArea.code || "-"),
          id: String(practiceArea.id || "-"),
          name: String(practiceArea.name || "-"),
        }),
        noun: "practice areas",
      },
    },
    summaryLabels: {
      plural: "practice areas",
      singular: "practice area",
    },
    supports: {
      get: true,
      list: true,
    },
  },
  tasks: {
    aliases: ["task"],
    apiPath: "tasks",
    defaultFields: {
      get: TASK_FIELDS,
      list: TASK_FIELDS,
    },
    handlerKey: "tasks",
    help: {
      get: "Fetch a single task by id",
      list: "List tasks with filters and pagination",
    },
    optionSchema: {
      get: {
        fields: { kind: "string", option: "fields" },
        id: { positional: 0 },
      },
      list: {
        all: { kind: "flag", option: "all" },
        clientId: { kind: "string", option: "client-id" },
        complete: { kind: "boolean", option: "complete" },
        createdSince: { kind: "string", option: "created-since" },
        dueAtFrom: { kind: "iso-date", option: "due-at-from" },
        dueAtTo: { kind: "iso-date", option: "due-at-to" },
        fields: { kind: "string", option: "fields" },
        limit: { kind: "string", option: "limit" },
        matterId: { kind: "string", option: "matter-id" },
        order: { kind: "string", option: "order" },
        pageToken: { kind: "string", option: "page-token" },
        priority: { kind: "string", option: "priority" },
        query: { kind: "string", option: "query" },
        responsibleAttorneyId: { kind: "string", option: "responsible-attorney-id" },
        status: { kind: "string", option: "status" },
        taskTypeId: { kind: "string", option: "task-type-id" },
        updatedSince: { kind: "string", option: "updated-since" },
      },
    },
    listQuery: {
      limitMax: 200,
    },
    redaction: {
      resourceType: "task",
      warningLevel: "limited",
    },
    riskLevel: "high",
    display: {
      get: {
        fields: [
          { label: "ID", value: (task) => task.id },
          { label: "Name", value: (task) => task.name },
          { label: "Description", value: (task) => task.description },
          { label: "Status", value: (task) => readStatus(task.status) },
          { label: "Priority", value: (task) => task.priority },
          { label: "Due", value: (task) => task.due_at },
          { label: "Complete", value: (task) => formatBoolean(readTaskComplete(task)) },
          { label: "Matter", value: (task) => readMatterLabel(task.matter) },
          { label: "Assignee", value: (task) => readUserName(task.assignee) },
          { label: "Assigner", value: (task) => readUserName(task.assigner) },
          { label: "Task Type", value: (task) => task.task_type?.name },
          { label: "Created", value: (task) => task.created_at },
          { label: "Updated", value: (task) => task.updated_at },
        ],
      },
      list: {
        columns: [
          { header: "ID", key: "id", width: 8 },
          { header: "STATUS", key: "status", width: 12 },
          { header: "DUE", key: "dueAt", width: 12 },
          { header: "PRIORITY", key: "priority", width: 8 },
          { header: "MATTER", key: "matter", width: 20 },
          { header: "TASK", key: "task", width: 30, pad: false },
        ],
        emptyMessage: "No tasks found for the selected filters.",
        formatRow: (task) => ({
          id: String(task.id || "-"),
          status: String(readStatus(task.status)),
          dueAt: String(task.due_at || "-"),
          priority: String(task.priority || "-"),
          matter: readMatterLabel(task.matter),
          task: String(task.name || "-"),
        }),
        noun: "tasks",
      },
    },
    summaryLabels: {
      plural: "tasks",
      singular: "task",
    },
    supports: {
      get: true,
      list: true,
    },
  },
  "time-entries": {
    aliases: ["time-entry"],
    apiPath: "activities",
    defaultFields: {
      get: ACTIVITY_FIELDS,
      list: ACTIVITY_FIELDS,
    },
    fixedOptions: {
      list: {
        type: "TimeEntry",
      },
    },
    handlerKey: "activities",
    help: {
      get: "Alias for activities get",
      list: "Alias for activities list filtered to TimeEntry",
    },
    optionSchema: {
      get: {
        fields: { kind: "string", option: "fields" },
        id: { positional: 0 },
      },
      list: {
        activityDescriptionId: { kind: "string", option: "activity-description-id" },
        all: { kind: "flag", option: "all" },
        clientId: { kind: "string", option: "client-id" },
        createdSince: { kind: "string", option: "created-since" },
        endDate: { kind: "iso-date", option: "end-date" },
        fields: { kind: "string", option: "fields" },
        flatRate: { kind: "boolean", option: "flat-rate" },
        limit: { kind: "string", option: "limit" },
        matterId: { kind: "string", option: "matter-id" },
        onlyUnaccountedFor: { kind: "flag", option: "only-unaccounted-for" },
        order: { kind: "string", option: "order" },
        pageToken: { kind: "string", option: "page-token" },
        query: { kind: "string", option: "query" },
        startDate: { kind: "iso-date", option: "start-date" },
        status: { kind: "string", option: "status" },
        taskId: { kind: "string", option: "task-id" },
        updatedSince: { kind: "string", option: "updated-since" },
        userId: { kind: "string", option: "user-id" },
      },
    },
    redaction: {
      resourceType: "activity",
      warningLevel: "limited",
    },
    riskLevel: "high",
    summaryLabels: {
      plural: "activities",
      singular: "activity",
    },
    supports: {
      get: true,
      list: true,
    },
  },
  "calendar-entries": {
    aliases: ["calendar-entry"],
    apiPath: "calendar_entries",
    defaultFields: {
      get: CALENDAR_ENTRY_FIELDS,
      list: CALENDAR_ENTRY_FIELDS,
    },
    handlerKey: "calendar-entries",
    help: {
      get: "Fetch a single calendar entry by id",
      list: "List calendar entries with filters and pagination",
    },
    optionSchema: {
      get: {
        fields: { kind: "string", option: "fields" },
        id: { positional: 0 },
      },
      list: {
        all: { kind: "flag", option: "all" },
        calendarId: { kind: "string", option: "calendar-id" },
        createdSince: { kind: "string", option: "created-since" },
        expanded: { kind: "boolean", option: "expanded" },
        externalPropertyName: { kind: "string", option: "external-property-name" },
        externalPropertyValue: { kind: "string", option: "external-property-value" },
        fields: { kind: "string", option: "fields" },
        from: { kind: "iso-datetime", option: "from" },
        hasCourtRule: { kind: "boolean", option: "has-court-rule", query: "has_court_rule" },
        ids: { kind: "string-array", option: "ids", query: "ids[]" },
        isAllDay: { kind: "boolean", option: "is-all-day", query: "is_all_day" },
        limit: { kind: "string", option: "limit" },
        matterId: { kind: "string", option: "matter-id" },
        ownerEntriesAcrossAllUsers: {
          kind: "boolean",
          option: "owner-entries-across-all-users",
          query: "owner_entries_across_all_users",
        },
        pageToken: { kind: "string", option: "page-token" },
        query: { kind: "string", option: "query" },
        source: { kind: "string", option: "source" },
        to: { kind: "iso-datetime", option: "to" },
        updatedSince: { kind: "string", option: "updated-since" },
        visible: { kind: "boolean", option: "visible" },
      },
    },
    listQuery: {
      limitMax: 200,
    },
    redaction: {
      resourceType: "calendar-entry",
      warningLevel: "limited",
    },
    riskLevel: "high",
    display: {
      get: {
        fields: [
          { label: "ID", value: (entry) => entry.id },
          { label: "Summary", value: (entry) => entry.summary },
          { label: "Description", value: (entry) => entry.description },
          { label: "Location", value: (entry) => entry.location },
          { label: "Start", value: (entry) => readCalendarEntryTimestamp(entry, "start") },
          { label: "End", value: (entry) => readCalendarEntryTimestamp(entry, "end") },
          { label: "All Day", value: (entry) => formatBoolean(entry.all_day) },
          { label: "Court Rule", value: (entry) => formatBoolean(entry.court_rule) },
          { label: "Matter", value: (entry) => readMatterLabel(entry.matter) },
          { label: "Matter Docket", value: (entry) => entry.matter_docket?.name },
          { label: "Calendar Owner", value: (entry) => readCalendarName(entry.calendar_owner) },
          { label: "Calendars", value: (entry) => summarizeValues(entry.calendars, readCalendarName) },
          {
            label: "Attendees",
            value: (entry) => summarizeValues(entry.attendees, readParticipantName),
          },
          {
            label: "Event Type",
            value: (entry) => entry.calendar_entry_event_type?.name,
          },
          {
            label: "Reminders",
            value: (entry) =>
              summarizeValues(
                entry.reminders,
                (reminder) => `${reminder.duration ?? "-"}:${reminder.state || "-"}`
              ),
          },
          { label: "Created", value: (entry) => entry.created_at },
          { label: "Updated", value: (entry) => entry.updated_at },
        ],
      },
      list: {
        columns: [
          { header: "ID", key: "id", width: 8 },
          { header: "START", key: "start", width: 20 },
          { header: "END", key: "end", width: 20 },
          { header: "ALL DAY", key: "allDay", width: 7 },
          { header: "MATTER", key: "matter", width: 20 },
          { header: "SUMMARY", key: "summary", width: 30, pad: false },
        ],
        emptyMessage: "No calendar entries found for the selected filters.",
        formatRow: (entry) => ({
          allDay: formatBoolean(entry.all_day),
          end: String(readCalendarEntryTimestamp(entry, "end")),
          id: String(entry.id || "-"),
          matter: readMatterLabel(entry.matter),
          start: String(readCalendarEntryTimestamp(entry, "start")),
          summary: String(entry.summary || entry.description || "-"),
        }),
        noun: "calendar entries",
      },
    },
    summaryLabels: {
      plural: "calendar entries",
      singular: "calendar entry",
    },
    supports: {
      get: true,
      list: true,
    },
  },
  reminders: {
    aliases: ["reminder"],
    apiPath: "reminders",
    defaultFields: {
      get: REMINDER_FIELDS,
      list: REMINDER_FIELDS,
    },
    handlerKey: "reminders",
    help: {
      get: "Fetch a single reminder by id",
      list: "List reminders with filters and pagination",
    },
    optionSchema: {
      get: {
        fields: { kind: "string", option: "fields" },
        id: { positional: 0 },
      },
      list: {
        all: { kind: "flag", option: "all" },
        createdSince: { kind: "string", option: "created-since" },
        fields: { kind: "string", option: "fields" },
        ids: { kind: "string-array", option: "ids", query: "ids[]" },
        limit: { kind: "string", option: "limit" },
        notificationMethodId: {
          kind: "string",
          option: "notification-method-id",
          query: "notification_method_id",
        },
        order: { kind: "string", option: "order" },
        pageToken: { kind: "string", option: "page-token" },
        state: { kind: "string", option: "state" },
        subjectId: { kind: "string", option: "subject-id", query: "subject_id" },
        subjectType: { kind: "string", option: "subject-type", query: "subject_type" },
        updatedSince: { kind: "string", option: "updated-since" },
        userId: { kind: "string", option: "user-id", query: "user_id" },
      },
    },
    listQuery: {
      limitMax: 200,
    },
    redaction: {
      resourceType: "reminder",
      warningLevel: "limited",
    },
    riskLevel: "high",
    display: {
      get: {
        fields: [
          { label: "ID", value: (reminder) => reminder.id },
          { label: "State", value: (reminder) => reminder.state },
          { label: "Duration", value: (reminder) => reminder.duration },
          { label: "Next Delivery", value: (reminder) => reminder.next_delivery_at },
          {
            label: "Notification Method",
            value: (reminder) => readReminderNotificationMethod(reminder),
          },
          {
            label: "Subject",
            value: (reminder) => readPolymorphicObjectLabel(reminder.subject),
          },
          { label: "Created", value: (reminder) => reminder.created_at },
          { label: "Updated", value: (reminder) => reminder.updated_at },
        ],
      },
      list: {
        columns: [
          { header: "ID", key: "id", width: 8 },
          { header: "STATE", key: "state", width: 12 },
          { header: "NEXT DELIVERY", key: "nextDeliveryAt", width: 20 },
          { header: "METHOD", key: "method", width: 12 },
          { header: "SUBJECT", key: "subject", width: 28, pad: false },
        ],
        emptyMessage: "No reminders found for the selected filters.",
        formatRow: (reminder) => ({
          id: String(reminder.id || "-"),
          method: String(readReminderNotificationMethod(reminder)),
          nextDeliveryAt: String(reminder.next_delivery_at || "-"),
          state: String(reminder.state || "-"),
          subject: String(readPolymorphicObjectLabel(reminder.subject)),
        }),
        noun: "reminders",
      },
    },
    summaryLabels: {
      plural: "reminders",
      singular: "reminder",
    },
    supports: {
      get: true,
      list: true,
    },
  },
  communications: {
    aliases: ["communication"],
    apiPath: "communications",
    defaultFields: {
      get: COMMUNICATION_FIELDS,
      list: COMMUNICATION_FIELDS,
    },
    handlerKey: "communications",
    help: {
      get: "Fetch a single communication by id",
      list: "List communications with filters and pagination",
    },
    optionSchema: {
      get: {
        fields: { kind: "string", option: "fields" },
        id: { positional: 0 },
      },
      list: {
        all: { kind: "flag", option: "all" },
        contactId: { kind: "string", option: "contact-id" },
        createdSince: { kind: "string", option: "created-since" },
        date: { kind: "iso-date", option: "date" },
        externalPropertyName: { kind: "string", option: "external-property-name" },
        externalPropertyValue: { kind: "string", option: "external-property-value" },
        fields: { kind: "string", option: "fields" },
        havingTimeEntries: {
          kind: "boolean",
          option: "having-time-entries",
          query: "having_time_entries",
        },
        ids: { kind: "string-array", option: "ids", query: "ids[]" },
        limit: { kind: "string", option: "limit" },
        matterId: { kind: "string", option: "matter-id" },
        order: { kind: "string", option: "order" },
        pageToken: { kind: "string", option: "page-token" },
        query: { kind: "string", option: "query" },
        receivedAt: { kind: "iso-datetime", option: "received-at", query: "received_at" },
        receivedBefore: {
          kind: "iso-datetime",
          option: "received-before",
          query: "received_before",
        },
        receivedSince: {
          kind: "iso-datetime",
          option: "received-since",
          query: "received_since",
        },
        type: { kind: "string", option: "type" },
        updatedSince: { kind: "string", option: "updated-since" },
        userId: { kind: "string", option: "user-id" },
      },
    },
    listQuery: {
      limitMax: 200,
    },
    redaction: {
      resourceType: "communication",
      warningLevel: "limited",
    },
    riskLevel: "high",
    display: {
      get: {
        fields: [
          { label: "ID", value: (communication) => communication.id },
          { label: "Type", value: (communication) => communication.type },
          { label: "Subject", value: (communication) => communication.subject },
          { label: "Body", value: (communication) => communication.body },
          { label: "Date", value: (communication) => communication.date },
          { label: "Received", value: (communication) => communication.received_at },
          { label: "Matter", value: (communication) => readMatterLabel(communication.matter) },
          { label: "User", value: (communication) => readUserName(communication.user) },
          {
            label: "Senders",
            value: (communication) =>
              summarizeValues(communication.senders, readParticipantName),
          },
          {
            label: "Receivers",
            value: (communication) =>
              summarizeValues(communication.receivers, readParticipantName),
          },
          { label: "Created", value: (communication) => communication.created_at },
          { label: "Updated", value: (communication) => communication.updated_at },
        ],
      },
      list: {
        columns: [
          { header: "ID", key: "id", width: 8 },
          { header: "TYPE", key: "type", width: 12 },
          { header: "RECEIVED", key: "receivedAt", width: 20 },
          { header: "MATTER", key: "matter", width: 20 },
          { header: "SUBJECT", key: "subject", width: 30, pad: false },
        ],
        emptyMessage: "No communications found for the selected filters.",
        formatRow: (communication) => ({
          id: String(communication.id || "-"),
          matter: readMatterLabel(communication.matter),
          receivedAt: String(communication.received_at || communication.date || "-"),
          subject: String(communication.subject || "-"),
          type: String(communication.type || "-"),
        }),
        noun: "communications",
      },
    },
    summaryLabels: {
      plural: "communications",
      singular: "communication",
    },
    supports: {
      get: true,
      list: true,
    },
  },
  conversations: {
    aliases: ["conversation"],
    apiPath: "conversations",
    defaultFields: {
      get: CONVERSATION_FIELDS,
      list: CONVERSATION_FIELDS,
    },
    handlerKey: "conversations",
    help: {
      get: "Fetch a single conversation by id",
      list: "List conversations with filters and pagination",
    },
    optionSchema: {
      get: {
        fields: { kind: "string", option: "fields" },
        id: { positional: 0 },
      },
      list: {
        all: { kind: "flag", option: "all" },
        archived: { kind: "boolean", option: "archived" },
        contactId: { kind: "string", option: "contact-id" },
        createdSince: { kind: "string", option: "created-since" },
        date: { kind: "iso-date", option: "date" },
        fields: { kind: "string", option: "fields" },
        forUser: { kind: "boolean", option: "for-user", query: "for_user" },
        ids: { kind: "string-array", option: "ids", query: "ids[]" },
        limit: { kind: "string", option: "limit" },
        matterId: { kind: "string", option: "matter-id" },
        order: { kind: "string", option: "order" },
        pageToken: { kind: "string", option: "page-token" },
        readStatus: { kind: "boolean", option: "read-status", query: "read_status" },
        timeEntries: { kind: "boolean", option: "time-entries", query: "time_entries" },
        updatedSince: { kind: "string", option: "updated-since" },
      },
    },
    listQuery: {
      limitMax: 200,
    },
    redaction: {
      resourceType: "conversation",
      warningLevel: "limited",
    },
    riskLevel: "high",
    display: {
      get: {
        fields: [
          { label: "ID", value: (conversation) => conversation.id },
          { label: "Subject", value: (conversation) => conversation.subject },
          { label: "Read", value: (conversation) => formatBoolean(conversation.read) },
          { label: "Archived", value: (conversation) => formatBoolean(conversation.archived) },
          {
            label: "Current User Is Member",
            value: (conversation) => formatBoolean(conversation.current_user_is_member),
          },
          { label: "Read Only", value: (conversation) => formatBoolean(conversation.read_only) },
          { label: "Messages", value: (conversation) => conversation.message_count },
          { label: "Time Entries", value: (conversation) => conversation.time_entries_count },
          { label: "Matter", value: (conversation) => readMatterLabel(conversation.matter) },
          { label: "First Message", value: (conversation) => conversation.first_message?.body },
          { label: "Last Message", value: (conversation) => conversation.last_message?.body },
          { label: "Created", value: (conversation) => conversation.created_at },
          { label: "Updated", value: (conversation) => conversation.updated_at },
        ],
      },
      list: {
        columns: [
          { header: "ID", key: "id", width: 8 },
          { header: "READ", key: "read", width: 4 },
          { header: "ARCHIVED", key: "archived", width: 8 },
          { header: "MESSAGES", key: "messages", width: 8 },
          { header: "MATTER", key: "matter", width: 20 },
          { header: "SUBJECT", key: "subject", width: 30, pad: false },
        ],
        emptyMessage: "No conversations found for the selected filters.",
        formatRow: (conversation) => ({
          archived: formatBoolean(conversation.archived),
          id: String(conversation.id || "-"),
          matter: readMatterLabel(conversation.matter),
          messages: String(conversation.message_count ?? "-"),
          read: formatBoolean(conversation.read),
          subject: String(conversation.subject || "-"),
        }),
        noun: "conversations",
      },
    },
    summaryLabels: {
      plural: "conversations",
      singular: "conversation",
    },
    supports: {
      get: true,
      list: true,
    },
  },
  "conversation-messages": {
    aliases: ["conversation-message"],
    apiPath: "conversation_messages",
    defaultFields: {
      get: CONVERSATION_MESSAGE_FIELDS,
      list: CONVERSATION_MESSAGE_FIELDS,
    },
    handlerKey: "conversation-messages",
    help: {
      get: "Fetch a single conversation message by id",
      list: "List conversation messages for a conversation",
    },
    optionSchema: {
      get: {
        fields: { kind: "string", option: "fields" },
        id: { positional: 0 },
      },
      list: {
        all: { kind: "flag", option: "all" },
        conversationId: {
          kind: "string",
          option: "conversation-id",
          query: "conversation_id",
        },
        createdSince: { kind: "string", option: "created-since" },
        fields: { kind: "string", option: "fields" },
        ids: { kind: "string-array", option: "ids", query: "ids[]" },
        limit: { kind: "string", option: "limit" },
        order: { kind: "string", option: "order" },
        pageToken: { kind: "string", option: "page-token" },
        query: { kind: "string", option: "query" },
        updatedSince: { kind: "string", option: "updated-since" },
      },
    },
    listQuery: {
      limitMax: 200,
      transform(query, options) {
        if (!options.conversationId) {
          throw new Error(
            "`conversation-messages list` requires `--conversation-id`."
          );
        }

        return query;
      },
    },
    capabilities: {
      list: {
        requiredOptions: ["conversationId"],
      },
    },
    redaction: {
      resourceType: "conversation-message",
      warningLevel: "limited",
    },
    riskLevel: "high",
    display: {
      get: {
        fields: [
          { label: "ID", value: (message) => message.id },
          { label: "Date", value: (message) => message.date },
          { label: "Body", value: (message) => message.body },
          { label: "Conversation", value: (message) => message.conversation?.subject },
          { label: "Sender", value: (message) => readParticipantName(message.sender) },
          {
            label: "Receivers",
            value: (message) => summarizeValues(message.receivers, readParticipantName),
          },
          { label: "Document", value: (message) => readDocumentLabel(message.document) },
          { label: "Created", value: (message) => message.created_at },
          { label: "Updated", value: (message) => message.updated_at },
        ],
      },
      list: {
        columns: [
          { header: "ID", key: "id", width: 8 },
          { header: "DATE", key: "date", width: 10 },
          { header: "SENDER", key: "sender", width: 20 },
          { header: "RECEIVERS", key: "receivers", width: 24 },
          { header: "BODY", key: "body", width: 30, pad: false },
        ],
        emptyMessage: "No conversation messages found for the selected filters.",
        formatRow: (message) => ({
          body: String(message.body || "-"),
          date: String(message.date || "-"),
          id: String(message.id || "-"),
          receivers: summarizeValues(message.receivers, readParticipantName, 2),
          sender: readParticipantName(message.sender),
        }),
        noun: "conversation messages",
      },
    },
    summaryLabels: {
      plural: "conversation messages",
      singular: "conversation message",
    },
    supports: {
      get: true,
      list: true,
    },
  },
  notes: {
    aliases: ["note"],
    apiPath: "notes",
    defaultFields: {
      get: NOTE_FIELDS,
      list: NOTE_FIELDS,
    },
    handlerKey: "notes",
    help: {
      get: "Fetch a single note by id",
      list: "List notes with filters and pagination",
    },
    optionSchema: {
      get: {
        fields: { kind: "string", option: "fields" },
        id: { positional: 0 },
      },
      list: {
        all: { kind: "flag", option: "all" },
        contactId: { kind: "string", option: "contact-id" },
        createdSince: { kind: "string", option: "created-since" },
        fields: { kind: "string", option: "fields" },
        hasTimeEntries: {
          kind: "boolean",
          option: "has-time-entries",
          query: "has_time_entries",
        },
        ids: { kind: "string-array", option: "ids", query: "ids[]" },
        limit: { kind: "string", option: "limit" },
        matterId: { kind: "string", option: "matter-id" },
        order: { kind: "string", option: "order" },
        pageToken: { kind: "string", option: "page-token" },
        query: { kind: "string", option: "query" },
        type: { kind: "string", option: "type" },
        updatedSince: { kind: "string", option: "updated-since" },
      },
    },
    listQuery: {
      limitMax: 200,
      transform(query, options) {
        if (!options.type) {
          throw new Error("`notes list` requires `--type`.");
        }

        const normalizedType = String(options.type).trim().toLowerCase();
        if (normalizedType !== "matter" && normalizedType !== "contact") {
          throw new Error("`notes list --type` must be `Matter` or `Contact`.");
        }

        return {
          ...query,
          type: normalizedType === "matter" ? "Matter" : "Contact",
        };
      },
    },
    capabilities: {
      list: {
        requiredOptions: ["type"],
      },
    },
    redaction: {
      resourceType: "note",
      warningLevel: "limited",
    },
    riskLevel: "high",
    display: {
      get: {
        fields: [
          { label: "ID", value: (note) => note.id },
          { label: "Type", value: (note) => note.type },
          { label: "Subject", value: (note) => note.subject },
          { label: "Detail", value: (note) => note.detail },
          { label: "Date", value: (note) => note.date },
          { label: "Matter / Contact", value: readMatterOrContactLabel },
          { label: "Author", value: (note) => readUserName(note.author) },
          { label: "Time Entries", value: (note) => note.time_entries_count },
          { label: "Created", value: (note) => note.created_at },
          { label: "Updated", value: (note) => note.updated_at },
        ],
      },
      list: {
        columns: [
          { header: "ID", key: "id", width: 8 },
          { header: "TYPE", key: "type", width: 12 },
          { header: "DATE", key: "date", width: 10 },
          { header: "MATTER / CONTACT", key: "subjectTarget", width: 20 },
          { header: "SUBJECT", key: "subject", width: 30, pad: false },
        ],
        emptyMessage: "No notes found for the selected filters.",
        formatRow: (note) => ({
          date: String(note.date || "-"),
          id: String(note.id || "-"),
          subject: String(note.subject || "-"),
          subjectTarget: readMatterOrContactLabel(note),
          type: String(note.type || "-"),
        }),
        noun: "notes",
      },
    },
    summaryLabels: {
      plural: "notes",
      singular: "note",
    },
    supports: {
      get: true,
      list: true,
    },
  },
  "custom-fields": {
    aliases: ["custom-field"],
    apiPath: "custom_fields",
    defaultFields: {
      get: CUSTOM_FIELD_FIELDS,
      list: CUSTOM_FIELD_FIELDS,
    },
    handlerKey: "custom-fields",
    help: {
      get: "Fetch a single custom field by id",
      list: "List custom fields with filters and pagination",
    },
    optionSchema: {
      get: {
        fields: { kind: "string", option: "fields" },
        id: { positional: 0 },
      },
      list: {
        all: { kind: "flag", option: "all" },
        createdSince: { kind: "string", option: "created-since" },
        deleted: { kind: "boolean", option: "deleted" },
        fieldType: { kind: "string", option: "field-type", query: "field_type" },
        fields: { kind: "string", option: "fields" },
        ids: { kind: "string-array", option: "ids", query: "ids[]" },
        limit: { kind: "string", option: "limit" },
        order: { kind: "string", option: "order" },
        pageToken: { kind: "string", option: "page-token" },
        parentType: { kind: "string", option: "parent-type", query: "parent_type" },
        query: { kind: "string", option: "query" },
        updatedSince: { kind: "string", option: "updated-since" },
        visibleAndRequired: {
          kind: "boolean",
          option: "visible-and-required",
          query: "visible_and_required",
        },
      },
    },
    listQuery: {
      limitMax: 200,
    },
    redaction: {
      resourceType: "custom-field",
      warningLevel: "standard",
    },
    riskLevel: "low",
    display: {
      get: {
        fields: [
          { label: "ID", value: (field) => field.id },
          { label: "Name", value: (field) => field.name },
          { label: "Parent Type", value: (field) => field.parent_type },
          { label: "Field Type", value: (field) => field.field_type },
          { label: "Displayed", value: (field) => formatBoolean(field.displayed) },
          { label: "Deleted", value: (field) => formatBoolean(field.deleted) },
          { label: "Required", value: (field) => formatBoolean(field.required) },
          { label: "Display Order", value: (field) => field.display_order },
          {
            label: "Picklist Options",
            value: (field) =>
              summarizeValues(field.picklist_options, (option) => option.option),
          },
          { label: "Created", value: (field) => field.created_at },
          { label: "Updated", value: (field) => field.updated_at },
        ],
      },
      list: {
        columns: [
          { header: "ID", key: "id", width: 8 },
          { header: "NAME", key: "name", width: 28 },
          { header: "PARENT", key: "parentType", width: 16 },
          { header: "TYPE", key: "fieldType", width: 16 },
          { header: "REQUIRED", key: "required", width: 8 },
          { header: "DISPLAYED", key: "displayed", width: 9, pad: false },
        ],
        emptyMessage: "No custom fields found for the selected filters.",
        formatRow: (field) => ({
          displayed: formatBoolean(field.displayed),
          fieldType: String(field.field_type || "-"),
          id: String(field.id || "-"),
          name: String(field.name || "-"),
          parentType: String(field.parent_type || "-"),
          required: formatBoolean(field.required),
        }),
        noun: "custom fields",
      },
    },
    summaryLabels: {
      plural: "custom fields",
      singular: "custom field",
    },
    supports: {
      get: true,
      list: true,
    },
  },
  "outstanding-client-balances": {
    aliases: ["outstanding-client-balance"],
    apiPath: "outstanding_client_balances",
    defaultFields: {
      list: OUTSTANDING_CLIENT_BALANCE_FIELDS,
    },
    handlerKey: "outstanding-client-balances",
    help: {
      list: "List outstanding client balances with filters and pagination",
    },
    optionSchema: {
      list: {
        all: { kind: "flag", option: "all" },
        contactId: { kind: "string", option: "contact-id" },
        fields: { kind: "string", option: "fields" },
        lastPaidEndDate: {
          kind: "iso-date",
          option: "last-paid-end-date",
          query: "last_paid_end_date",
        },
        lastPaidStartDate: {
          kind: "iso-date",
          option: "last-paid-start-date",
          query: "last_paid_start_date",
        },
        limit: { kind: "string", option: "limit" },
        newestBillDueEndDate: {
          kind: "iso-date",
          option: "newest-bill-due-end-date",
          query: "newest_bill_due_end_date",
        },
        newestBillDueStartDate: {
          kind: "iso-date",
          option: "newest-bill-due-start-date",
          query: "newest_bill_due_start_date",
        },
        originatingAttorneyId: {
          kind: "string",
          option: "originating-attorney-id",
          query: "originating_attorney_id",
        },
        pageToken: { kind: "string", option: "page-token" },
        responsibleAttorneyId: {
          kind: "string",
          option: "responsible-attorney-id",
          query: "responsible_attorney_id",
        },
      },
    },
    listQuery: {
      limitMax: 200,
    },
    redaction: {
      resourceType: "outstanding-client-balance",
      warningLevel: "limited",
    },
    riskLevel: "high",
    display: {
      list: {
        columns: [
          { header: "ID", key: "id", width: 8 },
          { header: "CONTACT", key: "contact", width: 28 },
          { header: "BALANCE", key: "balance", width: 10 },
          { header: "NEWEST DUE", key: "newestDue", width: 12 },
          { header: "LAST PAYMENT", key: "lastPayment", width: 12 },
          { header: "MATTERS", key: "matters", width: 7, pad: false },
        ],
        emptyMessage: "No outstanding client balances found for the selected filters.",
        formatRow: (balance) => ({
          balance: formatMoney(balance.total_outstanding_balance),
          contact: readContactName(balance.contact),
          id: String(balance.id || "-"),
          lastPayment: String(balance.last_payment_date || "-"),
          matters: readOutstandingMatterCount(balance),
          newestDue: String(balance.newest_issued_bill_due_date || "-"),
        }),
        noun: "outstanding client balances",
      },
    },
    summaryLabels: {
      plural: "outstanding client balances",
      singular: "outstanding client balance",
    },
    supports: {
      get: false,
      list: true,
    },
  },
  "matter-dockets": {
    aliases: ["matter-docket"],
    apiPath: "court_rules/matter_dockets",
    defaultFields: {
      get: MATTER_DOCKET_FIELDS,
      list: MATTER_DOCKET_FIELDS,
    },
    handlerKey: "matter-dockets",
    help: {
      get: "Fetch a single matter docket by id",
      list: "List matter dockets with filters and pagination",
    },
    optionSchema: {
      get: {
        fields: { kind: "string", option: "fields" },
        id: { positional: 0 },
      },
      list: {
        all: { kind: "flag", option: "all" },
        createdSince: { kind: "string", option: "created-since" },
        fields: { kind: "string", option: "fields" },
        ids: { kind: "string-array", option: "ids", query: "ids[]" },
        limit: { kind: "string", option: "limit" },
        matterId: { kind: "string", option: "matter-id" },
        matterStatus: { kind: "string", option: "matter-status", query: "matter_status" },
        order: { kind: "string", option: "order" },
        pageToken: { kind: "string", option: "page-token" },
        query: { kind: "string", option: "query" },
        serviceTypeId: {
          kind: "string",
          option: "service-type-id",
          query: "service_type_id",
        },
        status: { kind: "string", option: "status" },
        updatedSince: { kind: "string", option: "updated-since" },
      },
    },
    listQuery: {
      limitMax: 200,
    },
    redaction: {
      resourceType: "matter-docket",
      warningLevel: "limited",
    },
    riskLevel: "high",
    display: {
      get: {
        fields: [
          { label: "ID", value: (docket) => docket.id },
          { label: "Name", value: (docket) => docket.name },
          { label: "Status", value: (docket) => docket.status },
          { label: "Start Date", value: (docket) => docket.start_date },
          { label: "Start Time", value: (docket) => docket.start_time },
          { label: "Matter", value: (docket) => readMatterLabel(docket.matter) },
          {
            label: "Jurisdiction",
            value: (docket) => readMatterDocketJurisdiction(docket),
          },
          { label: "Trigger", value: (docket) => readMatterDocketTrigger(docket) },
          {
            label: "Service Type",
            value: (docket) => readMatterDocketServiceType(docket),
          },
          {
            label: "Calendar Entries",
            value: (docket) =>
              summarizeValues(
                docket.calendar_entries,
                (entry) => entry.summary || entry.start_at || entry.start_date
              ),
          },
          { label: "Created", value: (docket) => docket.created_at },
          { label: "Updated", value: (docket) => docket.updated_at },
          { label: "Deleted", value: (docket) => docket.deleted_at },
        ],
      },
      list: {
        columns: [
          { header: "ID", key: "id", width: 8 },
          { header: "START DATE", key: "startDate", width: 12 },
          { header: "STATUS", key: "status", width: 12 },
          { header: "MATTER", key: "matter", width: 20 },
          { header: "JURISDICTION", key: "jurisdiction", width: 20 },
          { header: "NAME", key: "name", width: 24, pad: false },
        ],
        emptyMessage: "No matter dockets found for the selected filters.",
        formatRow: (docket) => ({
          id: String(docket.id || "-"),
          jurisdiction: String(readMatterDocketJurisdiction(docket)),
          matter: readMatterLabel(docket.matter),
          name: String(docket.name || "-"),
          startDate: String(docket.start_date || "-"),
          status: String(docket.status || "-"),
        }),
        noun: "matter dockets",
      },
    },
    summaryLabels: {
      plural: "matter dockets",
      singular: "matter docket",
    },
    supports: {
      get: true,
      list: true,
    },
  },
  "my-events": {
    aliases: ["my-event"],
    apiPath: "internal_notifications/my_events",
    defaultFields: {
      list: MY_EVENT_FIELDS,
    },
    handlerKey: "my-events",
    help: {
      list: "List internal notification events for the current user",
    },
    optionSchema: {
      list: {
        all: { kind: "flag", option: "all" },
        fields: { kind: "string", option: "fields" },
        limit: { kind: "string", option: "limit" },
        pageToken: { kind: "string", option: "page-token" },
      },
    },
    listQuery: {
      limitMax: 200,
    },
    redaction: {
      resourceType: "my-event",
      warningLevel: "limited",
    },
    riskLevel: "high",
    display: {
      list: {
        columns: [
          { header: "ID", key: "id", width: 8 },
          { header: "OCCURRED", key: "occurredAt", width: 20 },
          { header: "SUBJECT", key: "subject", width: 14 },
          { header: "TITLE", key: "title", width: 28 },
          { header: "DETAIL", key: "detail", width: 24, pad: false },
        ],
        emptyMessage: "No events found for the selected filters.",
        formatRow: (record) => ({
          detail: String(readMyEventField(record, "primary_detail")),
          id: String(readMyEventField(record, "id")),
          occurredAt: String(readMyEventField(record, "occurred_at")),
          subject: String(readMyEventField(record, "subject_type")),
          title: String(readMyEventTitle(record)),
        }),
        noun: "events",
      },
    },
    summaryLabels: {
      plural: "events",
      singular: "event",
    },
    supports: {
      get: false,
      list: true,
    },
  },
  users: {
    aliases: ["user"],
    apiPath: "users",
    defaultFields: {
      get: USER_FIELDS,
      list: USER_FIELDS,
    },
    handlerKey: "users",
    help: {
      get: "Fetch a single user by id",
      list: "List users with filters and pagination",
    },
    optionSchema: {
      get: {
        fields: { kind: "string", option: "fields" },
        id: { positional: 0 },
      },
      list: {
        all: { kind: "flag", option: "all" },
        createdSince: { kind: "string", option: "created-since" },
        enabled: { kind: "boolean", option: "enabled" },
        fields: { kind: "string", option: "fields" },
        includeCoCounsel: { kind: "flag", option: "include-co-counsel" },
        limit: { kind: "string", option: "limit" },
        name: { kind: "string", option: "name" },
        order: { kind: "string", option: "order" },
        pageToken: { kind: "string", option: "page-token" },
        pendingSetup: { kind: "boolean", option: "pending-setup" },
        role: { kind: "string", option: "role" },
        subscriptionType: { kind: "string", option: "subscription-type" },
        updatedSince: { kind: "string", option: "updated-since" },
      },
    },
    listQuery: {
      limitMax: 2000,
    },
    redaction: {
      resourceType: "user",
      warningLevel: "none",
    },
    riskLevel: "low",
    display: {
      get: {
        fields: [
          { label: "ID", value: (user) => user.id },
          { label: "Name", value: readUserName },
          { label: "Email", value: (user) => user.email },
          { label: "Enabled", value: (user) => formatBoolean(user.enabled) },
          { label: "Roles", value: readRoleList },
          { label: "Subscription", value: (user) => user.subscription_type },
          { label: "Phone", value: (user) => user.phone_number },
          { label: "Time Zone", value: (user) => user.time_zone },
          { label: "Rate", value: (user) => user.rate },
          { label: "Account Owner", value: (user) => formatBoolean(user.account_owner) },
          { label: "Clio Connect", value: (user) => formatBoolean(user.clio_connect) },
          {
            label: "Court Rules Default Attendee",
            value: (user) => formatBoolean(user.court_rules_default_attendee),
          },
          { label: "Created", value: (user) => user.created_at },
          { label: "Updated", value: (user) => user.updated_at },
        ],
      },
      list: {
        columns: [
          { header: "ID", key: "id", width: 8 },
          { header: "NAME", key: "name", width: 28 },
          { header: "EMAIL", key: "email", width: 28 },
          { header: "ENABLED", key: "enabled", width: 7 },
          { header: "ROLES", key: "roles", width: 30, pad: false },
        ],
        emptyMessage: "No users found for the selected filters.",
        formatRow: (user) => ({
          id: String(user.id || "-"),
          name: readUserName(user),
          email: String(user.email || "-"),
          enabled: formatBoolean(user.enabled),
          roles: readRoleList(user),
        }),
        noun: "users",
      },
    },
    summaryLabels: {
      plural: "users",
      singular: "user",
    },
    supports: {
      get: true,
      list: true,
    },
  },
};

function normalizeOperationCapability(resourceMetadata, sub) {
  const overrides = resourceMetadata.capabilities?.[sub] || {};
  return {
    enabled: Boolean(resourceMetadata.supports?.[sub]),
    requiredOptions: Array.isArray(overrides.requiredOptions)
      ? overrides.requiredOptions
      : [],
  };
}

Object.values(RESOURCE_METADATA).forEach((resourceMetadata) => {
  resourceMetadata.capabilities = {
    get: normalizeOperationCapability(resourceMetadata, "get"),
    list: normalizeOperationCapability(resourceMetadata, "list"),
  };
});

const ALIAS_TO_COMMAND = RESOURCE_ORDER.reduce((aliases, command) => {
  const metadata = RESOURCE_METADATA[command];
  metadata.aliases.forEach((alias) => {
    aliases[alias] = command;
  });
  return aliases;
}, {});

function getResourceMetadata(command) {
  return RESOURCE_METADATA[command];
}

function listResourceMetadata() {
  return RESOURCE_ORDER.map((command) => RESOURCE_METADATA[command]);
}

function normalizeResourceCommand(command) {
  return ALIAS_TO_COMMAND[command] || command;
}

function listRequiredOptionFlags(resourceMetadata, sub) {
  if (!resourceMetadata) {
    return [];
  }

  const requiredOptions = resourceMetadata.capabilities?.[sub]?.requiredOptions || [];
  return requiredOptions.map((propertyName) => {
    const optionName = resourceMetadata.optionSchema?.[sub]?.[propertyName]?.option;
    return optionName ? `--${optionName}` : propertyName;
  });
}

module.exports = {
  RESOURCE_METADATA,
  RESOURCE_ORDER,
  getResourceMetadata,
  listResourceMetadata,
  listRequiredOptionFlags,
  normalizeResourceCommand,
  normalizeBillStatusFilters,
};
