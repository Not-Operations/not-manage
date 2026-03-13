#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const DEFAULT_TAG = "HANDBOOK0313";
const DEFAULT_COUNT = 24;

const CONTACT_HEADERS = [
  "title",
  "job_title",
  "first_name",
  "last_name",
  "Company",
  "web_site",
  "business_street",
  "Business City",
  "Business State",
  "business_postal_code",
  "home_city",
  "home_state",
  "home_state",
  "home_postal_code",
  "other_street",
  "other_city",
  "other_state",
  "other_postal_code",
  "other_phone_2",
  "email_address",
  "email_2_address",
  "email_3_address",
  "primary_phone",
  "business_fax",
  "other_phone",
  "home_phone",
  "home_fax",
  "other_fax",
  "mobile_phone",
  "pager",
  "notes",
];

const MATTER_HEADERS = [
  "status",
  "location",
  "client_reference",
  "description",
  "open_date",
  "close_date",
  "pending_date",
  "custom_number",
  "display_number",
  "note",
  "client_company_name",
  "",
  "client_first_name",
  "client_last_name",
  "responsible_attorney",
  "practice_area",
];

const ACTIVITY_HEADERS = [
  "matter",
  "date",
  "activity_description",
  "note",
  "price",
  "quantity",
  "type",
  "activity_user",
];

const COMPANIES = [
  "Northshore Logistics Ltd.",
  "Maple Ridge Dental Group Inc.",
  "Prairie Peak Constructors Ltd.",
  "Riverbend Hospitality Corp.",
  "Harbourline Biotech Inc.",
  "Cobalt Peak Ventures Inc.",
  "Solstice Property Group Ltd.",
  "Cedar Wave Software Inc.",
  "Westgate Mechanical Ltd.",
  "Granite Fork Foods Ltd.",
  "Ocean Circuit Media Inc.",
  "Atlas Repair Collective",
  "Blue Harbour Realty Ltd.",
  "Polaris Field Services Ltd.",
];

const PEOPLE = [
  ["Lina", "Ortega"],
  ["Ayesha", "Rahman"],
  ["Gabriel", "Chen"],
  ["Amanpreet", "Dhillon"],
  ["Emma", "Kovacs"],
  ["Nadia", "Petrov"],
  ["Marius", "Lefevre"],
  ["Sofia", "Marquez"],
  ["Keiko", "Watanabe"],
  ["Owen", "Sinclair"],
];

const CITIES = [
  ["Vancouver", "British Columbia", "V6B 1A1"],
  ["Surrey", "British Columbia", "V3T 2W1"],
  ["Burnaby", "British Columbia", "V5H 2B7"],
  ["Calgary", "Alberta", "T2P 1J9"],
  ["Victoria", "British Columbia", "V8W 1P6"],
  ["Toronto", "Ontario", "M5H 2N2"],
  ["Kelowna", "British Columbia", "V1Y 6N7"],
  ["Edmonton", "Alberta", "T5J 1N3"],
  ["Ottawa", "Ontario", "K1P 1A4"],
  ["Coquitlam", "British Columbia", "V3B 1A8"],
  ["Montreal", "Quebec", "H3B 2Y5"],
  ["Halifax", "Nova Scotia", "B3J 1M5"],
  ["Saskatoon", "Saskatchewan", "S7K 1J4"],
  ["Nanaimo", "British Columbia", "V9R 2H1"],
];

const PRACTICE_AREAS = [
  "Employment / Labor",
  "Real Estate",
  "Wills & Estates",
  "Construction",
  "Family",
  "Contracts",
  "Immigration",
  "Intellectual Property",
  "Commercial Litigation",
  "Privacy / Information Security",
  "Business Formation / Compliance",
  "Small Claims",
];

const MATTER_TITLES = [
  "Employment classification review",
  "Commercial lease renegotiation",
  "Estate administration",
  "Builders lien discharge",
  "Parenting schedule amendment",
  "Supplier contract dispute",
  "Work permit restoration",
  "Patent assignment cleanup",
  "Shareholder governance response",
  "Wrongful dismissal claim intake",
  "Rezoning appeal",
  "Probate with out-of-province assets",
  "Privacy incident response",
  "Construction deficiency claim",
  "Spousal support review",
  "Franchise agreement refresh",
  "Trademark opposition response",
  "Family sponsorship package",
  "Corporate reorganization planning",
  "Demand letter and settlement posture",
  "Commercial acquisition due diligence",
  "Will and powers update",
  "Independent contractor template refresh",
  "Small claims defense assessment",
];

const MATTER_NOTES = [
  "Historical intake and strategy file for imported demo data.",
  "Includes chronology, billing history, and client communications.",
  "Prepared to resemble a live matter imported through Clio's sample-data workflow.",
  "Contains staged work product, time entries, and expense activity.",
];

const ACTIVITY_DESCRIPTIONS = [
  "Phone Call",
  "Meeting",
  "Discovery",
  "Letter Writing",
  "Research",
  "Flat Rate",
];

const EXPENSE_NOTES = [
  "Courier and filing charge.",
  "Medical records and retrieval costs.",
  "Expert consultation invoice.",
  "Service of process and mileage.",
  "Transcript and copy charges.",
];

function parseArgs(argv) {
  const options = {
    count: DEFAULT_COUNT,
    tag: DEFAULT_TAG,
    outDir: path.join(process.cwd(), "generated", "clio-imports", DEFAULT_TAG),
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const next = argv[index + 1];

    if (token === "--count" && next) {
      options.count = parsePositiveInteger(next, "--count");
      index += 1;
      continue;
    }

    if (token === "--tag" && next) {
      options.tag = sanitizeTag(next);
      options.outDir = path.join(process.cwd(), "generated", "clio-imports", options.tag);
      index += 1;
      continue;
    }

    if (token === "--out-dir" && next) {
      options.outDir = path.resolve(process.cwd(), next);
      index += 1;
      continue;
    }

    if (token === "-h" || token === "--help") {
      printHelp();
      process.exit(0);
    }
  }

  return options;
}

function printHelp() {
  console.log("Generate CSVs compatible with Clio's handbook sample-data import flow.");
  console.log("");
  console.log("Usage:");
  console.log("  node scripts/generate-handbook-import-csvs.js [options]");
  console.log("");
  console.log("Options:");
  console.log("  --tag <value>       Run tag used in references and emails");
  console.log("  --count <number>    Number of contacts/matters to generate (default: 24)");
  console.log("  --out-dir <path>    Output folder for generated CSVs");
}

function parsePositiveInteger(value, flag) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${flag} expects a positive integer.`);
  }
  return parsed;
}

function sanitizeTag(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "");
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatImportDate(date) {
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const year = String(date.getUTCFullYear());
  return `${month}/${day}/${year}`;
}

function addDays(date, days) {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function csvEscape(value) {
  const stringValue = value === undefined || value === null ? "" : String(value);
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

function writeCsv(filePath, headers, rows) {
  const lines = [headers.map(csvEscape).join(",")];
  for (const row of rows) {
    lines.push(headers.map((header) => csvEscape(row[header] || "")).join(","));
  }
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`, "utf8");
}

function buildProfiles(count, tag) {
  const profiles = [];

  for (let index = 0; index < count; index += 1) {
    const city = CITIES[index % CITIES.length];
    const isCompany = index % 3 !== 2;
    const title = MATTER_TITLES[index % MATTER_TITLES.length];
    const matterNumber = `${tag}-${String(index + 1).padStart(3, "0")}`;
    const practiceArea = PRACTICE_AREAS[index % PRACTICE_AREAS.length];
    const clientReference = `${tag}-REF-${String(index + 1).padStart(3, "0")}`;
    let client;

    if (isCompany) {
      client = {
        type: "Company",
        company: COMPANIES[index % COMPANIES.length],
      };
    } else {
      const person = PEOPLE[index % PEOPLE.length];
      client = {
        type: "Person",
        firstName: person[0],
        lastName: person[1],
      };
    }

    profiles.push({
      index,
      client,
      city: city[0],
      province: city[1],
      postalCode: city[2],
      matterTitle: title,
      matterNumber,
      clientReference,
      practiceArea,
    });
  }

  return profiles;
}

function buildContactRows(profiles, tag) {
  return profiles.map((profile) => {
    const emailBase =
      profile.client.type === "Company"
        ? slugify(profile.client.company)
        : `${slugify(profile.client.firstName)}-${slugify(profile.client.lastName)}`;
    const email = `${emailBase}-${tag.toLowerCase()}@example.test`;
    const note = `${profile.matterTitle}. Imported via Clio handbook sample-data workflow (${tag}).`;
    const row = {
      title: profile.client.type === "Person" ? "Ms." : "",
      job_title: profile.client.type === "Person" ? "Operations Director" : "",
      first_name: profile.client.firstName || "",
      last_name: profile.client.lastName || "",
      Company: profile.client.company || "",
      web_site: profile.client.company
        ? `https://${slugify(profile.client.company)}-${tag.toLowerCase()}.example.test`
        : "",
      business_street: `${200 + profile.index} ${profile.city} Avenue`,
      "Business City": profile.city,
      "Business State": profile.province,
      business_postal_code: profile.postalCode,
      home_city: profile.client.type === "Person" ? profile.city : "",
      home_state: profile.client.type === "Person" ? profile.province : "",
      home_postal_code: profile.client.type === "Person" ? profile.postalCode : "",
      email_address: email,
      primary_phone: profile.client.type === "Company" ? "" : "",
      mobile_phone: `555-${String(3000 + profile.index).padStart(4, "0")}`,
      notes: note,
    };

    if (profile.client.type === "Company") {
      row.primary_phone = `555-${String(1000 + profile.index).padStart(4, "0")}`;
    } else {
      row.primary_phone = `555-${String(2000 + profile.index).padStart(4, "0")}`;
    }

    return row;
  });
}

function buildMatterRows(profiles, tag) {
  return profiles.map((profile) => {
    const lifecycleIndex = profile.index % 6;
    const baseOpenDate = addDays(new Date("2024-01-15T00:00:00Z"), profile.index * 18);
    let status = "Open";
    let openDate = formatImportDate(baseOpenDate);
    let closeDate = "";
    let pendingDate = "";

    if (lifecycleIndex === 0 || lifecycleIndex === 1) {
      status = "Closed";
      closeDate = formatImportDate(addDays(baseOpenDate, 75 + (profile.index % 4) * 20));
    } else if (lifecycleIndex === 4 || lifecycleIndex === 5) {
      status = "Pending";
      openDate = "";
      pendingDate = formatImportDate(addDays(new Date("2026-01-12T00:00:00Z"), profile.index * 3));
    }

    return {
      status,
      location: `${profile.city}, ${profile.province}`,
      client_reference: profile.clientReference,
      description: profile.matterTitle,
      open_date: openDate,
      close_date: closeDate,
      pending_date: pendingDate,
      custom_number: profile.matterNumber,
      display_number: profile.matterNumber,
      note: MATTER_NOTES[profile.index % MATTER_NOTES.length],
      client_company_name: profile.client.company || "",
      "": "",
      client_first_name: profile.client.firstName || "",
      client_last_name: profile.client.lastName || "",
      responsible_attorney: "Kenny Alami",
      practice_area: profile.practiceArea,
    };
  });
}

function buildTimeEntryRows(profiles) {
  const rows = [];

  for (const profile of profiles) {
    for (let activityIndex = 0; activityIndex < 4; activityIndex += 1) {
      const activityDate = addDays(
        new Date("2024-02-01T00:00:00Z"),
        profile.index * 14 + activityIndex * 11
      );
      rows.push({
        matter: profile.matterNumber,
        date: formatImportDate(activityDate),
        activity_description: ACTIVITY_DESCRIPTIONS[
          (profile.index + activityIndex) % ACTIVITY_DESCRIPTIONS.length
        ],
        note: `${profile.matterTitle}: ${
          [
            "Reviewed source documents and updated chronology.",
            "Held a status call and documented next steps.",
            "Drafted core work product and revision notes.",
            "Prepared closing or follow-up billing summary.",
          ][activityIndex]
        }`,
        price: String(225 + ((profile.index + activityIndex) % 5) * 50),
        quantity: [1.2, 2.4, 3.1, 0.8][activityIndex],
        type: "TimeEntry",
        activity_user: "Kenny Alami",
      });
    }
  }

  return rows;
}

function buildExpenseRows(profiles) {
  const rows = [];

  for (const profile of profiles) {
    for (let expenseIndex = 0; expenseIndex < 2; expenseIndex += 1) {
      const expenseDate = addDays(
        new Date("2024-03-08T00:00:00Z"),
        profile.index * 19 + expenseIndex * 29
      );
      rows.push({
        matter: profile.matterNumber,
        date: formatImportDate(expenseDate),
        activity_description: "",
        note: `${profile.matterTitle}: ${EXPENSE_NOTES[(profile.index + expenseIndex) % EXPENSE_NOTES.length]}`,
        price: String(145 + ((profile.index + 1) * (expenseIndex + 2) * 37) % 1800),
        quantity: 1,
        type: "ExpenseEntry",
        activity_user: "Kenny Alami",
      });
    }
  }

  return rows;
}

function writeSummary(filePath, summary) {
  fs.writeFileSync(filePath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
}

function ensureDir(directory) {
  fs.mkdirSync(directory, { recursive: true });
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const profiles = buildProfiles(options.count, options.tag);

  ensureDir(options.outDir);

  const contacts = buildContactRows(profiles, options.tag);
  const matters = buildMatterRows(profiles, options.tag);
  const timeEntries = buildTimeEntryRows(profiles);
  const expenses = buildExpenseRows(profiles);

  writeCsv(path.join(options.outDir, "contacts-import.csv"), CONTACT_HEADERS, contacts);
  writeCsv(path.join(options.outDir, "matters-import.csv"), MATTER_HEADERS, matters);
  writeCsv(
    path.join(options.outDir, "time-entries-import.csv"),
    ACTIVITY_HEADERS,
    timeEntries
  );
  writeCsv(path.join(options.outDir, "expenses-import.csv"), ACTIVITY_HEADERS, expenses);
  writeSummary(path.join(options.outDir, "summary.json"), {
    tag: options.tag,
    contacts: contacts.length,
    matters: matters.length,
    time_entries: timeEntries.length,
    expenses: expenses.length,
    out_dir: options.outDir,
  });

  console.log(JSON.stringify(
    {
      tag: options.tag,
      out_dir: options.outDir,
      contacts: contacts.length,
      matters: matters.length,
      time_entries: timeEntries.length,
      expenses: expenses.length,
    },
    null,
    2
  ));
}

main();
