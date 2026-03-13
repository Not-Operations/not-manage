#!/usr/bin/env node

const { getConfig, getTokenSet } = require("../src/store");
const { getValidAccessToken } = require("../src/clio-api");

const DEFAULT_CASE_COUNT = 24;
const DEFAULT_TASKS_PER_MATTER = 3;
const DEFAULT_ACTIVITIES_PER_MATTER = 4;
const TODAY = new Date("2026-03-12T12:00:00Z");

const TASK_TYPE_LABELS = [
  "Intake and scoping",
  "Research and investigation",
  "Drafting and review",
  "Filing and service",
  "Settlement and billing follow-up",
];

const ACTIVITY_DESCRIPTION_LABELS = [
  "Initial strategy call",
  "Document review",
  "Drafting and revisions",
  "Court or agency prep",
  "Closeout and follow-up",
];

const CASE_PROFILES = [
  {
    client: {
      type: "Company",
      name: "Northshore Logistics Ltd.",
      city: "Vancouver",
      province: "British Columbia",
      postalCode: "V6B 1A1",
      phone: "604-555-0101",
    },
    matter: {
      title: "Employment classification review",
      summary:
        "Reviewed contractor classifications, overtime exposure, and policy cleanup for a growing cross-border logistics team.",
      practiceCategory: "employment_and_labor",
      lifecycle: "closed",
      billable: true,
      rate: 340,
    },
  },
  {
    client: {
      type: "Company",
      name: "Maple Ridge Dental Group Inc.",
      city: "Surrey",
      province: "British Columbia",
      postalCode: "V3T 2W1",
      phone: "604-555-0102",
    },
    matter: {
      title: "Commercial lease renegotiation",
      summary:
        "Handled renewal terms, tenant-improvement credits, and landlord defaults for a multi-chair dental practice.",
      practiceCategory: "real_estate",
      lifecycle: "closed",
      billable: true,
      rate: 315,
    },
  },
  {
    client: {
      type: "Person",
      firstName: "Lina",
      lastName: "Ortega",
      city: "Burnaby",
      province: "British Columbia",
      postalCode: "V5H 2B7",
      phone: "604-555-0103",
    },
    matter: {
      title: "Estate administration",
      summary:
        "Managed probate intake, executor guidance, and asset coordination for a family estate with investment accounts.",
      practiceCategory: "wills_and_estates",
      lifecycle: "closed",
      billable: true,
      rate: 295,
    },
  },
  {
    client: {
      type: "Company",
      name: "Prairie Peak Constructors Ltd.",
      city: "Calgary",
      province: "Alberta",
      postalCode: "T2P 1J9",
      phone: "403-555-0104",
    },
    matter: {
      title: "Builders lien discharge",
      summary:
        "Resolved lien registration issues and negotiated a project-closeout payment path on a mid-rise build.",
      practiceCategory: "construction",
      lifecycle: "closed",
      billable: true,
      rate: 360,
    },
  },
  {
    client: {
      type: "Person",
      firstName: "Ayesha",
      lastName: "Rahman",
      city: "Richmond",
      province: "British Columbia",
      postalCode: "V7C 3M6",
      phone: "604-555-0105",
    },
    matter: {
      title: "Parenting schedule amendment",
      summary:
        "Prepared a limited-scope parenting schedule amendment and support materials for mediation.",
      practiceCategory: "family",
      lifecycle: "closed",
      billable: false,
      rate: 265,
    },
  },
  {
    client: {
      type: "Company",
      name: "Riverbend Hospitality Corp.",
      city: "Victoria",
      province: "British Columbia",
      postalCode: "V8W 1P6",
      phone: "250-555-0106",
    },
    matter: {
      title: "Supplier contract dispute",
      summary:
        "Negotiated a termination and inventory reconciliation for a broken food and beverage supply arrangement.",
      practiceCategory: "contracts",
      lifecycle: "closed",
      billable: true,
      rate: 325,
    },
  },
  {
    client: {
      type: "Person",
      firstName: "Gabriel",
      lastName: "Chen",
      city: "Toronto",
      province: "Ontario",
      postalCode: "M5H 2N2",
      phone: "416-555-0107",
    },
    matter: {
      title: "Work permit restoration",
      summary:
        "Prepared a restoration package, employer support documents, and filing checklist on a tight deadline.",
      practiceCategory: "immigration",
      lifecycle: "closed",
      billable: true,
      rate: 285,
    },
  },
  {
    client: {
      type: "Company",
      name: "Harbourline Biotech Inc.",
      city: "Vancouver",
      province: "British Columbia",
      postalCode: "V6C 2T8",
      phone: "604-555-0108",
    },
    matter: {
      title: "Patent assignment cleanup",
      summary:
        "Closed out inventor assignments, chain-of-title issues, and internal IP recordkeeping gaps before diligence.",
      practiceCategory: "intellectual_property",
      lifecycle: "closed",
      billable: true,
      rate: 390,
    },
  },
  {
    client: {
      type: "Company",
      name: "Cobalt Peak Ventures Inc.",
      city: "Kelowna",
      province: "British Columbia",
      postalCode: "V1Y 6N7",
      phone: "250-555-0109",
    },
    matter: {
      title: "Shareholder governance response",
      summary:
        "Advising on board process, information rights, and interim governance controls during an ownership dispute.",
      practiceCategory: "corporate_litigation",
      lifecycle: "open",
      billable: true,
      rate: 410,
    },
  },
  {
    client: {
      type: "Person",
      firstName: "Amanpreet",
      lastName: "Dhillon",
      city: "Abbotsford",
      province: "British Columbia",
      postalCode: "V2S 3T3",
      phone: "604-555-0110",
    },
    matter: {
      title: "Wrongful dismissal claim intake",
      summary:
        "Built the initial damages theory, document request list, and employer chronology for a dismissal claim.",
      practiceCategory: "employment_and_labor",
      lifecycle: "open",
      billable: true,
      rate: 305,
    },
  },
  {
    client: {
      type: "Company",
      name: "Solstice Property Group Ltd.",
      city: "Edmonton",
      province: "Alberta",
      postalCode: "T5J 1N3",
      phone: "780-555-0111",
    },
    matter: {
      title: "Rezoning appeal",
      summary:
        "Managing municipal submissions, consultant coordination, and hearing prep for a mixed-use rezoning appeal.",
      practiceCategory: "administrative",
      lifecycle: "open",
      billable: true,
      rate: 335,
    },
  },
  {
    client: {
      type: "Person",
      firstName: "Emma",
      lastName: "Kovacs",
      city: "Ottawa",
      province: "Ontario",
      postalCode: "K1P 1A4",
      phone: "613-555-0112",
    },
    matter: {
      title: "Probate with out-of-province assets",
      summary:
        "Coordinating probate, real property transfer steps, and executor guidance across two provinces.",
      practiceCategory: "wills_and_estates",
      lifecycle: "open",
      billable: true,
      rate: 310,
    },
  },
  {
    client: {
      type: "Company",
      name: "Cedar Wave Software Inc.",
      city: "Victoria",
      province: "British Columbia",
      postalCode: "V8V 2P7",
      phone: "250-555-0113",
    },
    matter: {
      title: "Privacy incident response",
      summary:
        "Running breach triage, regulator analysis, and internal remediation steps after a customer data incident.",
      practiceCategory: "privacy_and_information_security",
      lifecycle: "open",
      billable: true,
      rate: 425,
    },
  },
  {
    client: {
      type: "Company",
      name: "Westgate Mechanical Ltd.",
      city: "Calgary",
      province: "Alberta",
      postalCode: "T2G 0K8",
      phone: "403-555-0114",
    },
    matter: {
      title: "Construction deficiency claim",
      summary:
        "Developing claim and defense positions around HVAC deficiencies, scope drift, and remedial work costs.",
      practiceCategory: "construction",
      lifecycle: "open",
      billable: true,
      rate: 355,
    },
  },
  {
    client: {
      type: "Person",
      firstName: "Nadia",
      lastName: "Petrov",
      city: "Coquitlam",
      province: "British Columbia",
      postalCode: "V3B 1A8",
      phone: "604-555-0115",
    },
    matter: {
      title: "Spousal support review",
      summary:
        "Updating disclosure, income analysis, and negotiation materials for a post-order support review.",
      practiceCategory: "family",
      lifecycle: "open",
      billable: true,
      rate: 275,
    },
  },
  {
    client: {
      type: "Company",
      name: "Granite Fork Foods Ltd.",
      city: "Kamloops",
      province: "British Columbia",
      postalCode: "V2C 1T7",
      phone: "250-555-0116",
    },
    matter: {
      title: "Franchise agreement refresh",
      summary:
        "Refreshing template franchise agreements, disclosure timing, and operational annexes for expansion.",
      practiceCategory: "business_formation_and_compliance",
      lifecycle: "open",
      billable: false,
      rate: 300,
    },
  },
  {
    client: {
      type: "Company",
      name: "Ocean Circuit Media Inc.",
      city: "Toronto",
      province: "Ontario",
      postalCode: "M4W 1A8",
      phone: "416-555-0117",
    },
    matter: {
      title: "Trademark opposition response",
      summary:
        "Preparing evidence, response strategy, and settlement options in an active trademark opposition.",
      practiceCategory: "intellectual_property",
      lifecycle: "open",
      billable: true,
      rate: 385,
    },
  },
  {
    client: {
      type: "Person",
      firstName: "Marius",
      lastName: "Lefevre",
      city: "Montreal",
      province: "Quebec",
      postalCode: "H3B 2Y5",
      phone: "514-555-0118",
    },
    matter: {
      title: "Family sponsorship package",
      summary:
        "Assembling sponsor eligibility materials, translations, and filing support for a family sponsorship package.",
      practiceCategory: "immigration",
      lifecycle: "open",
      billable: true,
      rate: 290,
    },
  },
  {
    client: {
      type: "Company",
      name: "Atlas Repair Collective",
      city: "Winnipeg",
      province: "Manitoba",
      postalCode: "R3C 1A6",
      phone: "204-555-0119",
    },
    matter: {
      title: "Corporate reorganization planning",
      summary:
        "Scoping a holdco-opco reorganization, approval path, and working paper list for tax and corporate counsel.",
      practiceCategory: "business_formation_and_compliance",
      lifecycle: "pending",
      billable: true,
      rate: 345,
    },
  },
  {
    client: {
      type: "Person",
      firstName: "Sofia",
      lastName: "Marquez",
      city: "Vancouver",
      province: "British Columbia",
      postalCode: "V6G 1K2",
      phone: "604-555-0120",
    },
    matter: {
      title: "Demand letter and settlement posture",
      summary:
        "Initial assessment and strategy memo for a commercial misrepresentation demand and negotiated resolution path.",
      practiceCategory: "commercial_litigation",
      lifecycle: "pending",
      billable: true,
      rate: 320,
    },
  },
  {
    client: {
      type: "Company",
      name: "Blue Harbour Realty Ltd.",
      city: "Halifax",
      province: "Nova Scotia",
      postalCode: "B3J 1M5",
      phone: "902-555-0121",
    },
    matter: {
      title: "Commercial acquisition due diligence",
      summary:
        "Beginning due diligence, title review, and deal issue tracking for a waterfront acquisition.",
      practiceCategory: "real_estate",
      lifecycle: "pending",
      billable: true,
      rate: 330,
    },
  },
  {
    client: {
      type: "Person",
      firstName: "Keiko",
      lastName: "Watanabe",
      city: "Burnaby",
      province: "British Columbia",
      postalCode: "V5C 2A7",
      phone: "604-555-0122",
    },
    matter: {
      title: "Will and powers update",
      summary:
        "Preparing an updated will, enduring powers, and document checklist after a family change in circumstances.",
      practiceCategory: "wills_and_estates",
      lifecycle: "pending",
      billable: false,
      rate: 255,
    },
  },
  {
    client: {
      type: "Company",
      name: "Polaris Field Services Ltd.",
      city: "Saskatoon",
      province: "Saskatchewan",
      postalCode: "S7K 1J4",
      phone: "306-555-0123",
    },
    matter: {
      title: "Independent contractor template refresh",
      summary:
        "Refreshing contractor onboarding templates, confidentiality language, and cross-border compliance notes.",
      practiceCategory: "contracts",
      lifecycle: "pending",
      billable: true,
      rate: 300,
    },
  },
  {
    client: {
      type: "Person",
      firstName: "Owen",
      lastName: "Sinclair",
      city: "Nanaimo",
      province: "British Columbia",
      postalCode: "V9R 2H1",
      phone: "250-555-0124",
    },
    matter: {
      title: "Small claims defense assessment",
      summary:
        "Initial file review, document triage, and settlement posture assessment for a small claims defense.",
      practiceCategory: "small_claims",
      lifecycle: "pending",
      billable: false,
      rate: 245,
    },
  },
];

function parseArgs(argv) {
  const options = {
    tag: buildDefaultTag(),
    caseCount: DEFAULT_CASE_COUNT,
    tasksPerMatter: DEFAULT_TASKS_PER_MATTER,
    activitiesPerMatter: DEFAULT_ACTIVITIES_PER_MATTER,
    startAt: 1,
    indexes: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const next = argv[index + 1];

    if (token === "--tag" && next) {
      options.tag = sanitizeTag(next);
      index += 1;
      continue;
    }

    if (token === "--cases" && next) {
      options.caseCount = parsePositiveInteger(next, "--cases");
      index += 1;
      continue;
    }

    if (token === "--tasks-per-matter" && next) {
      options.tasksPerMatter = parsePositiveInteger(next, "--tasks-per-matter");
      index += 1;
      continue;
    }

    if (token === "--activities-per-matter" && next) {
      options.activitiesPerMatter = parsePositiveInteger(
        next,
        "--activities-per-matter"
      );
      index += 1;
      continue;
    }

    if (token === "--start-at" && next) {
      options.startAt = parsePositiveInteger(next, "--start-at");
      index += 1;
      continue;
    }

    if (token === "--indexes" && next) {
      options.indexes = parseIndexList(next);
      index += 1;
      continue;
    }

    if (token === "-h" || token === "--help") {
      printHelp();
      process.exit(0);
    }
  }

  if (options.indexes) {
    for (const item of options.indexes) {
      if (item > CASE_PROFILES.length) {
        throw new Error(
          `--indexes contains ${item}, but only ${CASE_PROFILES.length} case profiles are defined.`
        );
      }
    }
    options.caseCount = options.indexes.length;
    return options;
  }

  if (options.startAt > CASE_PROFILES.length) {
    throw new Error(
      `--start-at ${options.startAt} is outside the ${CASE_PROFILES.length} available case profiles.`
    );
  }

  if (options.startAt - 1 + options.caseCount > CASE_PROFILES.length) {
    throw new Error(
      `Requested ${options.caseCount} cases starting at ${options.startAt}, but only ${CASE_PROFILES.length} case profiles are defined.`
    );
  }

  return options;
}

function printHelp() {
  console.log("Seed historical Clio data using the connected keychain-backed account.");
  console.log("");
  console.log("Usage:");
  console.log("  node scripts/seed-historical-data.js [options]");
  console.log("");
  console.log("Options:");
  console.log("  --tag <value>                Override the run tag used in references and emails");
  console.log("  --cases <count>              Number of case profiles to seed (default: 24)");
  console.log("  --start-at <index>           1-based case profile index to start from (default: 1)");
  console.log("  --indexes <a,b,c>            Explicit 1-based case profile indexes to seed");
  console.log("  --tasks-per-matter <count>   Tasks per matter (default: 3)");
  console.log("  --activities-per-matter <n>  Activities per matter (default: 4)");
}

function buildDefaultTag() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  const hour = String(now.getUTCHours()).padStart(2, "0");
  const minute = String(now.getUTCMinutes()).padStart(2, "0");
  return `DEMOHIST${year}${month}${day}${hour}${minute}`;
}

function sanitizeTag(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "");
}

function buildShortTag(tag) {
  const sanitized = sanitizeTag(tag);
  return sanitized.length > 10 ? sanitized.slice(-10) : sanitized;
}

function parsePositiveInteger(value, flag) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${flag} expects a positive integer.`);
  }
  return parsed;
}

function parseIndexList(value) {
  const indexes = String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => parsePositiveInteger(item, "--indexes"));
  if (indexes.length === 0) {
    throw new Error("--indexes expects a comma-separated list of positive integers.");
  }
  return Array.from(new Set(indexes));
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function formatDate(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateTime(date) {
  return `${formatDate(date)}T17:00:00Z`;
}

function addDays(date, days) {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function clampDate(date) {
  return date > TODAY ? TODAY : date;
}

function readClientName(client) {
  if (client.type === "Company") {
    return client.name;
  }
  return `${client.firstName} ${client.lastName}`;
}

function createEmailAddress(client, tag, index) {
  const base =
    client.type === "Company"
      ? slugify(client.name)
      : `${slugify(client.firstName)}-${slugify(client.lastName)}`;
  return `${base}-${tag.toLowerCase()}-${String(index + 1).padStart(2, "0")}@example.test`;
}

function createWebsite(client, tag) {
  const base =
    client.type === "Company"
      ? slugify(client.name)
      : `${slugify(client.firstName)}-${slugify(client.lastName)}`;
  return `https://${base}-${tag.toLowerCase()}.example.test`;
}

function buildCaseReference(tag, profileIndex) {
  return `${tag}-CASE-${String(profileIndex + 1).padStart(2, "0")}`;
}

function buildContactPayload(profile, tag, index) {
  const { client } = profile;
  const clientName = readClientName(client);
  const email = createEmailAddress(client, tag, index);
  const payload = {
    type: client.type,
    email_addresses: [
      {
        name: "Work",
        address: email,
        default_email: true,
      },
    ],
    phone_numbers: [
      {
        name: client.type === "Company" ? "Work" : "Mobile",
        number: client.phone,
        default_number: true,
      },
    ],
    addresses: [
      {
        name: "Work",
        street: `${150 + index} ${client.city} Avenue`,
        city: client.city,
        province: client.province,
        country: "Canada",
        postal_code: client.postalCode,
      },
    ],
  };

  if (client.type === "Company") {
    payload.name = clientName;
    payload.web_sites = [
      {
        name: "Work",
        address: createWebsite(client, tag),
        default_web_site: true,
      },
    ];
  } else {
    payload.first_name = client.firstName;
    payload.last_name = client.lastName;
  }

  return payload;
}

function buildLifecycleDates(profileIndex, lifecycle) {
  if (lifecycle === "closed") {
    const openDate = addDays(new Date("2024-02-05T00:00:00Z"), profileIndex * 24);
    const closeDate = addDays(openDate, 70 + (profileIndex % 4) * 26);
    return {
      openDate,
      closeDate,
      recentDate: addDays(closeDate, -7),
    };
  }

  if (lifecycle === "open") {
    const openDate = addDays(new Date("2025-04-14T00:00:00Z"), (profileIndex - 8) * 18);
    return {
      openDate,
      closeDate: null,
      recentDate: clampDate(addDays(openDate, 140 + (profileIndex % 5) * 11)),
    };
  }

  const pendingDate = addDays(new Date("2026-01-08T00:00:00Z"), (profileIndex - 18) * 8);
  return {
    openDate: null,
    closeDate: null,
    pendingDate,
    recentDate: clampDate(addDays(pendingDate, 10 + (profileIndex % 3) * 4)),
  };
}

function buildMatterPayload(profile, profileIndex, tag, contactId, practiceAreaId, userId) {
  const dates = buildLifecycleDates(profileIndex, profile.matter.lifecycle);
  const payload = {
    client: { id: contactId },
    description: profile.matter.title,
    billable: profile.matter.billable,
    client_reference: buildCaseReference(tag, profileIndex),
    location: `${profile.client.city}, ${profile.client.province}`,
    practice_area: { id: practiceAreaId },
    responsible_attorney: { id: userId },
    originating_attorney: { id: userId },
    status: profile.matter.lifecycle,
  };

  if (dates.openDate) {
    payload.open_date = formatDate(dates.openDate);
  }
  if (dates.closeDate) {
    payload.close_date = formatDate(dates.closeDate);
  }
  if (dates.pendingDate) {
    payload.pending_date = formatDate(dates.pendingDate);
  }

  return { payload, dates };
}

function buildTaskTemplates(profile) {
  if (profile.matter.lifecycle === "closed") {
    return [
      {
        name: "Open file and confirm scope",
        description: `Confirm the initial scope, chronology, and source documents for ${profile.matter.title}.`,
        status: "complete",
        priority: "Normal",
        taskTypeIndex: 0,
      },
      {
        name: "Prepare core work product",
        description: `Draft and revise the main work product required for ${profile.matter.title}.`,
        status: "complete",
        priority: "High",
        taskTypeIndex: 2,
      },
      {
        name: "Deliver closing summary",
        description: `Finalize the client-ready summary and archive checklist for ${profile.matter.title}.`,
        status: "complete",
        priority: "Low",
        taskTypeIndex: 4,
      },
    ];
  }

  if (profile.matter.lifecycle === "open") {
    return [
      {
        name: "Confirm intake materials",
        description: `Review the latest intake materials and issue list for ${profile.matter.title}.`,
        status: "complete",
        priority: "Normal",
        taskTypeIndex: 0,
      },
      {
        name: "Advance active workstream",
        description: `Move the primary workstream forward and record next-step decisions for ${profile.matter.title}.`,
        status: "in_progress",
        priority: "High",
        taskTypeIndex: 2,
      },
      {
        name: "Prepare next client update",
        description: `Prepare the next client-facing update and open questions for ${profile.matter.title}.`,
        status: "pending",
        priority: "Normal",
        taskTypeIndex: 4,
      },
    ];
  }

  return [
    {
      name: "Run conflict and scope check",
      description: `Complete the initial scope review and conflict check for ${profile.matter.title}.`,
      status: "pending",
      priority: "Normal",
      taskTypeIndex: 0,
    },
    {
      name: "Assemble intake checklist",
      description: `Prepare the document request list and kickoff checklist for ${profile.matter.title}.`,
      status: "pending",
      priority: "High",
      taskTypeIndex: 1,
    },
    {
      name: "Finalize retainer and kickoff",
      description: `Finalize the retainer, proposed timing, and kickoff note for ${profile.matter.title}.`,
      status: "pending",
      priority: "Normal",
      taskTypeIndex: 4,
    },
  ];
}

function buildTaskPayloads(
  profile,
  matterId,
  dates,
  taskTypes,
  userId,
  tasksPerMatter
) {
  const templates = buildTaskTemplates(profile).slice(0, tasksPerMatter);
  return templates.map((template, index) => {
    let dueDate = TODAY;

    if (profile.matter.lifecycle === "closed") {
      dueDate =
        index === 0
          ? addDays(dates.openDate, 7)
          : index === 1
            ? addDays(dates.openDate, 40)
            : addDays(dates.closeDate, -2);
    } else if (profile.matter.lifecycle === "open") {
      dueDate =
        index === 0
          ? addDays(dates.openDate, 5)
          : index === 1
            ? addDays(dates.recentDate, 7)
            : addDays(dates.recentDate, 14);
    } else {
      dueDate =
        index === 0
          ? addDays(dates.pendingDate, 2)
          : index === 1
            ? addDays(dates.pendingDate, 6)
            : addDays(dates.pendingDate, 12);
    }

    return {
      name: template.name,
      description: template.description,
      assignee: { id: userId, type: "User" },
      matter: { id: matterId },
      task_type: { id: taskTypes[template.taskTypeIndex % taskTypes.length].id },
      due_at: formatDateTime(clampDate(dueDate)),
      status: template.status,
      priority: template.priority,
      permission: "public",
      notify_assignee: false,
      notify_completion: false,
    };
  });
}

function buildActivityTemplates(profile) {
  if (profile.matter.lifecycle === "closed") {
    return [
      "Reviewed intake documents and built an initial chronology.",
      "Drafted the principal work product and incorporated client revisions.",
      "Prepared the final advice package and delivery checklist.",
      "Wrapped the file, billing notes, and archival summary.",
    ];
  }

  if (profile.matter.lifecycle === "open") {
    return [
      "Reviewed new documents and refreshed the issue list.",
      "Held a strategy call and recorded next-step decisions.",
      "Drafted interim work product and revised internal notes.",
      "Prepared billing narrative and outstanding item list.",
    ];
  }

  return [
    "Completed an initial intake review and conflict scan.",
    "Prepared a starter checklist and first-pass issue summary.",
    "Reviewed timing, scope, and retainer assumptions.",
    "Updated the kickoff note and next-step outline.",
  ];
}

function buildActivityPayloads(
  profile,
  profileIndex,
  matterId,
  taskRecords,
  dates,
  activityDescriptions,
  userId,
  activitiesPerMatter,
  tag
) {
  const templates = buildActivityTemplates(profile).slice(0, activitiesPerMatter);
  const hourBlocks = [1800, 3000, 4200, 1500];

  return templates.map((note, index) => {
    let activityDate = TODAY;

    if (profile.matter.lifecycle === "closed") {
      activityDate =
        index === 0
          ? addDays(dates.openDate, 4)
          : index === 1
            ? addDays(dates.openDate, 24)
            : index === 2
              ? addDays(dates.closeDate, -18)
              : addDays(dates.closeDate, -3);
    } else if (profile.matter.lifecycle === "open") {
      activityDate =
        index === 0
          ? addDays(dates.openDate, 2)
          : index === 1
            ? addDays(dates.openDate, 28)
            : index === 2
              ? addDays(dates.recentDate, -8)
              : addDays(dates.recentDate, -2);
    } else {
      activityDate =
        index === 0
          ? addDays(dates.pendingDate, -1)
          : index === 1
            ? addDays(dates.pendingDate, 3)
            : index === 2
              ? addDays(dates.pendingDate, 7)
              : addDays(dates.pendingDate, 10);
    }

    const isBillableMatter = profile.matter.billable;
    const isAdministrativeSlice = index === templates.length - 1;
    const nonBillable = !isBillableMatter || isAdministrativeSlice;

    const payload = {
      type: "TimeEntry",
      date: formatDate(clampDate(activityDate)),
      quantity: hourBlocks[index % hourBlocks.length] + (profileIndex % 3) * 300,
      price: profile.matter.rate + (index % 2) * 10,
      note: `${note} Matter: ${profile.matter.title}.`,
      reference: `${tag}-M${String(profileIndex + 1).padStart(2, "0")}-A${String(
        index + 1
      ).padStart(2, "0")}`,
      matter: { id: matterId },
      user: { id: userId },
      activity_description: {
        id: activityDescriptions[index % activityDescriptions.length].id,
      },
      non_billable: nonBillable,
    };

    if (taskRecords[index]) {
      payload.task = { id: taskRecords[index].id };
    }

    return payload;
  });
}

async function sleep(milliseconds) {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function requestJson(config, accessToken, method, path, options = {}) {
  const headers = {
    accept: "application/json",
    authorization: `Bearer ${accessToken}`,
  };

  if (options.body !== undefined) {
    headers["content-type"] = "application/json";
  }

  let url;
  if (options.absoluteUrl) {
    url = options.absoluteUrl;
  } else {
    url = new URL(`https://${config.host}/api/v4/${path}`);
    Object.entries(options.query || {}).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") {
        return;
      }
      url.searchParams.set(key, String(value));
    });
    url = url.toString();
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const response = await fetch(url, {
      method,
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });

    const text = await response.text();
    let payload = null;

    if (text) {
      try {
        payload = JSON.parse(text);
      } catch (_error) {
        payload = text;
      }
    }

    if (response.status === 429 && attempt < 4) {
      const retryAfter = Number(response.headers.get("retry-after") || 1);
      await sleep(retryAfter * 1000);
      continue;
    }

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status} ${method} ${url}: ${
          typeof payload === "string" ? payload : JSON.stringify(payload)
        }`
      );
    }

    return payload;
  }

  throw new Error(`Exceeded retry budget for ${method} ${url}`);
}

async function listAll(config, accessToken, path, query = {}) {
  const records = [];
  let nextUrl = null;
  let firstPass = true;

  while (firstPass || nextUrl) {
    const payload = nextUrl
      ? await requestJson(config, accessToken, "GET", null, {
          absoluteUrl: nextUrl,
        })
      : await requestJson(config, accessToken, "GET", path, { query });
    firstPass = false;

    const data = Array.isArray(payload?.data) ? payload.data : [];
    records.push(...data);
    nextUrl = payload?.meta?.paging?.next || null;
  }

  return records;
}

async function createRecord(config, accessToken, resourcePath, data) {
  const payload = await requestJson(config, accessToken, "POST", `${resourcePath}.json`, {
    body: { data },
  });
  return payload?.data || null;
}

async function updateRecord(config, accessToken, resourcePath, id, data) {
  const payload = await requestJson(
    config,
    accessToken,
    "PATCH",
    `${resourcePath}/${encodeURIComponent(String(id))}.json`,
    { body: { data } }
  );
  return payload?.data || null;
}

async function findCurrentUser(config, accessToken) {
  const payload = await requestJson(config, accessToken, "GET", "users/who_am_i");
  return payload?.data || null;
}

async function findOrCreateNamedRecords(
  config,
  accessToken,
  resourcePath,
  items,
  nameKey = "name"
) {
  const existing = await listAll(config, accessToken, `${resourcePath}.json`, {
    fields: `id,${nameKey}`,
  });
  const byName = new Map(existing.map((record) => [record[nameKey], record]));
  const results = [];

  for (const item of items) {
    const match = byName.get(item[nameKey]);
    if (match) {
      results.push(match);
      continue;
    }
    const created = await createRecord(config, accessToken, resourcePath, item);
    results.push(created);
  }

  return results;
}

function selectPracticeAreaId(practiceAreaByCategory, category) {
  return (
    practiceAreaByCategory.get(category) ||
    practiceAreaByCategory.get("other") ||
    Array.from(practiceAreaByCategory.values())[0]
  );
}

async function run() {
  const options = parseArgs(process.argv.slice(2));
  const config = await getConfig();
  const tokenSet = await getTokenSet();
  const accessToken = await getValidAccessToken(config, tokenSet);
  const currentUser = await findCurrentUser(config, accessToken);
  const shortTag = buildShortTag(options.tag);

  if (!currentUser?.id) {
    throw new Error("Unable to resolve the connected Clio user.");
  }

  console.log(`Connected user: ${currentUser.name} (${currentUser.id})`);
  console.log(`Region host: ${config.host}`);
  console.log(`Run tag: ${options.tag}`);
  if (options.indexes) {
    console.log(
      `Target volume: ${options.caseCount} matters for indexes ${options.indexes.join(",")}, ${options.tasksPerMatter} tasks/matter, ${options.activitiesPerMatter} activities/matter`
    );
  } else {
    console.log(
      `Target volume: ${options.caseCount} matters starting at profile ${options.startAt}, ${options.tasksPerMatter} tasks/matter, ${options.activitiesPerMatter} activities/matter`
    );
  }

  const practiceAreas = await listAll(config, accessToken, "practice_areas.json");
  const practiceAreaByCategory = new Map();
  for (const area of practiceAreas) {
    if (!practiceAreaByCategory.has(area.category)) {
      practiceAreaByCategory.set(area.category, area.id);
    }
  }

  const taskTypes = await findOrCreateNamedRecords(
    config,
    accessToken,
    "task_types",
    TASK_TYPE_LABELS.map((label) => ({
      name: `${label} (${shortTag})`,
    }))
  );
  const activityDescriptions = await findOrCreateNamedRecords(
    config,
    accessToken,
    "activity_descriptions",
    ACTIVITY_DESCRIPTION_LABELS.map((label) => ({
      name: `${label} (${shortTag})`,
      default: false,
      visible_to_co_counsel: false,
    }))
  );

  const selectedProfiles = options.indexes
    ? options.indexes.map((oneBasedIndex) => ({
        profile: CASE_PROFILES[oneBasedIndex - 1],
        profileIndex: oneBasedIndex - 1,
      }))
    : CASE_PROFILES.slice(
        options.startAt - 1,
        options.startAt - 1 + options.caseCount
      ).map((profile, index) => ({
        profile,
        profileIndex: options.startAt - 1 + index,
      }));
  const existingContacts = await listAll(config, accessToken, "contacts.json", {
    fields: "id,name,first_name,last_name,primary_email_address",
  });
  const existingMatters = await listAll(config, accessToken, "matters.json", {
    fields: "id,description,client_reference,status",
  });
  const existingContactByEmail = new Map();
  const existingMatterByReference = new Map();

  for (const contact of existingContacts) {
    if (contact.primary_email_address) {
      existingContactByEmail.set(contact.primary_email_address, contact);
    }
  }
  for (const matter of existingMatters) {
    if (matter.client_reference) {
      existingMatterByReference.set(matter.client_reference, matter);
    }
  }
  const summary = {
    tag: options.tag,
    contactsCreated: [],
    mattersCreated: [],
    tasksCreated: [],
    activitiesCreated: [],
    failures: [],
  };

  for (let index = 0; index < selectedProfiles.length; index += 1) {
    const profile = selectedProfiles[index].profile;
    const profileIndex = selectedProfiles[index].profileIndex;
    const clientName = readClientName(profile.client);
    console.log(
      `[${String(index + 1).padStart(2, "0")}/${selectedProfiles.length}] ${clientName} -> ${profile.matter.title}`
    );

    try {
      const contactEmail = createEmailAddress(profile.client, options.tag, profileIndex);
      let contact = existingContactByEmail.get(contactEmail) || null;
      if (!contact) {
        contact = await createRecord(
          config,
          accessToken,
          "contacts",
          buildContactPayload(profile, options.tag, profileIndex)
        );
        existingContactByEmail.set(contactEmail, contact);
        summary.contactsCreated.push({
          id: contact.id,
          name: contact.name,
        });
      }

      const practiceAreaId = selectPracticeAreaId(
        practiceAreaByCategory,
        profile.matter.practiceCategory
      );
      const caseReference = buildCaseReference(options.tag, profileIndex);
      const { payload: matterPayload, dates } = buildMatterPayload(
        profile,
        profileIndex,
        options.tag,
        contact.id,
        practiceAreaId,
        currentUser.id
      );
      let matter = existingMatterByReference.get(caseReference) || null;
      if (!matter) {
        matter = await createRecord(config, accessToken, "matters", matterPayload);
        existingMatterByReference.set(caseReference, matter);
        summary.mattersCreated.push({
          id: matter.id,
          description: matter.description,
          status: matter.status,
        });
      }

      const taskPayloads = buildTaskPayloads(
        profile,
        matter.id,
        dates,
        taskTypes,
        currentUser.id,
        options.tasksPerMatter
      );
      const taskRecords = [];
      for (const taskPayload of taskPayloads) {
        const task = await createRecord(config, accessToken, "tasks", taskPayload);
        taskRecords.push(task);
        summary.tasksCreated.push({
          id: task.id,
          name: task.name,
          status: task.status,
          matter_id: matter.id,
        });
      }

      const activityPayloads = buildActivityPayloads(
        profile,
        profileIndex,
        matter.id,
        taskRecords,
        dates,
        activityDescriptions,
        currentUser.id,
        options.activitiesPerMatter,
        options.tag
      );
      for (const activityPayload of activityPayloads) {
        const activity = await createRecord(
          config,
          accessToken,
          "activities",
          activityPayload
        );
        summary.activitiesCreated.push({
          id: activity.id,
          date: activity.date,
          type: activity.type,
          matter_id: matter.id,
        });
      }
    } catch (error) {
      summary.failures.push({
        case: `${clientName} / ${profile.matter.title}`,
        message: error.message,
      });
      console.error(`  failed: ${error.message}`);
    }
  }

  const existingBills = await listAll(config, accessToken, "bills.json");

  console.log("");
  console.log("Seed summary:");
  console.log(JSON.stringify(
    {
      tag: summary.tag,
      contacts_created: summary.contactsCreated.length,
      matters_created: summary.mattersCreated.length,
      tasks_created: summary.tasksCreated.length,
      activities_created: summary.activitiesCreated.length,
      existing_bills_observed: existingBills.length,
      failures: summary.failures,
    },
    null,
    2
  ));
}

run().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
