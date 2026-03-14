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

const RESOURCE_ORDER = [
  "activities",
  "tasks",
  "contacts",
  "time-entries",
  "billable-clients",
  "billable-matters",
  "bills",
  "invoices",
  "matters",
  "users",
  "practice-areas",
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

module.exports = {
  RESOURCE_METADATA,
  RESOURCE_ORDER,
  getResourceMetadata,
  listResourceMetadata,
  normalizeResourceCommand,
};
