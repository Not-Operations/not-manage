#!/usr/bin/env node

const { execFileSync } = require("node:child_process");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const CLI_PATH = path.join(ROOT, "bin", "not-manage.js");

function runCli(args) {
  const output = execFileSync(process.execPath, [CLI_PATH, ...args], {
    cwd: ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  return JSON.parse(output);
}

function assertListEnvelope(payload, label) {
  if (!payload || !Array.isArray(payload.data) || typeof payload.meta !== "object") {
    throw new Error(`${label} did not return the expected list envelope.`);
  }
}

function assertObject(payload, label) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error(`${label} did not return a JSON object.`);
  }
}

const scenarios = [
  {
    args: ["auth", "status", "--json"],
    label: "auth status",
    validate: assertObject,
  },
  {
    args: ["whoami", "--json"],
    label: "whoami",
    validate: assertObject,
  },
  {
    args: ["users", "list", "--limit", "1", "--json"],
    label: "users list",
    validate: assertListEnvelope,
  },
  {
    args: ["notes", "list", "--type", "Matter", "--limit", "1", "--json"],
    label: "notes list",
    validate: assertListEnvelope,
  },
  {
    args: ["outstanding-client-balances", "list", "--limit", "1", "--json"],
    label: "outstanding-client-balances list",
    validate: assertListEnvelope,
  },
  {
    args: ["calendar-entries", "list", "--limit", "1", "--json"],
    label: "calendar-entries list",
    validate: assertListEnvelope,
  },
];

const failures = [];

console.log("Running live read-only smoke checks against the authenticated Clio account.");
console.log("");

for (const scenario of scenarios) {
  try {
    const payload = runCli(scenario.args);
    scenario.validate(payload, scenario.label);
    console.log(`PASS ${scenario.label}`);
  } catch (error) {
    failures.push({
      error: error instanceof Error ? error.message : String(error),
      label: scenario.label,
    });
    console.log(`FAIL ${scenario.label}`);
  }
}

console.log("");

if (failures.length > 0) {
  failures.forEach((failure) => {
    console.error(`${failure.label}: ${failure.error}`);
  });
  process.exitCode = 1;
} else {
  console.log(`Passed ${scenarios.length} live read-only smoke checks.`);
}
