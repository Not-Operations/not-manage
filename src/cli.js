const {
  authLogin,
  authRevoke,
  authSetup,
  authStatus,
  setupWizard,
  whoAmI,
} = require("./commands-auth");
const {
  hasFlag,
  parseOptions,
  readBooleanOption,
  readCommandOptions,
  readStringOption,
} = require("./cli-options");
const { getResourceHandler } = require("./resource-handlers");
const {
  RESOURCE_ORDER,
  getResourceMetadata,
  listRequiredOptionFlags,
  normalizeResourceCommand,
} = require("./resource-metadata");
const { version } = require("../package.json");

const HELP_FLAGS = new Set(["-h", "--help"]);
const VERSION_FLAGS = new Set(["-v", "--version"]);

function maybePrintDefaultFields(command, sub, optionValues) {
  if (optionValues.fields !== true) {
    return false;
  }

  const defaults = getResourceMetadata(command)?.defaultFields?.[sub];
  if (!defaults) {
    throw new Error(
      "`--fields` requires a comma-separated value for this command. Example: --fields id,name"
    );
  }

  console.log(defaults);
  return true;
}

function resolveRedactionPreference(optionValues) {
  const unredacted = readBooleanOption(optionValues, "unredacted");
  return unredacted === undefined ? true : !unredacted;
}

function warnAboutRedaction(resourceMetadata, sub, optionValues, redacted) {
  if (!resourceMetadata || (sub !== "list" && sub !== "get")) {
    return;
  }

  const explicitUnredacted = readBooleanOption(optionValues, "unredacted") === true;
  const highRisk = resourceMetadata.riskLevel === "high";

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

  if (resourceMetadata.redaction.warningLevel === "limited") {
    console.error(
      "Warning: related matter labels, captions, and other non-client fields may still identify a matter."
    );
  }
}

function printOptionLines(entries = []) {
  if (entries.length === 0) {
    return;
  }

  console.log("Options:");
  entries.forEach((entry) => {
    if (typeof entry === "string") {
      console.log(`  ${entry}`);
      return;
    }

    console.log(`  ${entry.usage.padEnd(28, " ")} ${entry.description}`);
  });
}

function printExamples(examples = []) {
  if (examples.length === 0) {
    return;
  }

  console.log("Examples:");
  examples.forEach((example) => {
    console.log(`  ${example}`);
  });
}

function printCommandHelp(title, details = {}) {
  const {
    description,
    examples = [],
    notes = [],
    options = [],
    usage = [],
  } = details;

  console.log(title);
  console.log("");

  if (usage.length > 0) {
    console.log("Usage:");
    usage.forEach((line) => {
      console.log(`  ${line}`);
    });
    console.log("");
  }

  if (description) {
    console.log("Description:");
    console.log(`  ${description}`);
    console.log("");
  }

  if (notes.length > 0) {
    console.log("Notes:");
    notes.forEach((line) => {
      console.log(`  ${line}`);
    });
    console.log("");
  }

  printOptionLines(options);
  if (options.length > 0 && examples.length > 0) {
    console.log("");
  }
  printExamples(examples);
}

function optionPlaceholder(optionDef) {
  switch (optionDef.kind) {
    case "boolean":
      return " <true|false>";
    case "object":
      return " <json|key=value>";
    case "string-array":
      return " <value[,value]>";
    default:
      return " <value>";
  }
}

function formatResourceOption(optionDef) {
  if (optionDef.positional !== undefined) {
    return null;
  }

  return `--${optionDef.option}${optionDef.kind === "flag" ? "" : optionPlaceholder(optionDef)}`;
}

function buildResourceOptionLines(resourceMetadata, sub) {
  const optionLines = Object.values(resourceMetadata.optionSchema?.[sub] || {})
    .map((optionDef) => formatResourceOption(optionDef))
    .filter(Boolean);

  if (sub === "list" || sub === "get") {
    optionLines.push("--json");
    optionLines.push("--redacted");
    optionLines.push("--unredacted");
  }

  optionLines.push("-h, --help");
  return optionLines;
}

function buildResourceExamples(command, sub, requiredFlags) {
  if (sub === "get") {
    return [
      `not-manage ${command} get <id>`,
      `not-manage ${command} get <id> --fields id,name --json`,
    ];
  }

  const requiredExample =
    requiredFlags.length > 0
      ? `${requiredFlags.map((flag) => `${flag} <value>`).join(" ")} `
      : "";

  return [
    `not-manage ${command} list ${requiredExample}--json`,
    `not-manage ${command} list ${requiredExample}--fields id,name`,
  ];
}

function printGlobalHelp() {
  console.log("not-manage");
  console.log("");
  console.log("Usage:");
  console.log("  not-manage <command> [options]");
  console.log("");
  console.log("Commands:");
  console.log("  setup              Run guided setup and OAuth login");
  console.log("  auth setup         Configure client credentials in OS keychain");
  console.log("  auth login         Run local OAuth login flow");
  console.log("  auth status        Show auth status and connected user");
  console.log("  auth revoke        Revoke token and clear local token storage");

  RESOURCE_ORDER.forEach((command) => {
    const resourceMetadata = getResourceMetadata(command);
    ["list", "get"].forEach((sub) => {
      if (!resourceMetadata.capabilities[sub].enabled) {
        return;
      }

      const usage = `${command} ${sub}`.padEnd(18, " ");
      const requiredFlags = listRequiredOptionFlags(resourceMetadata, sub);
      const requirementNote =
        requiredFlags.length > 0 ? ` (requires ${requiredFlags.join(", ")})` : "";
      console.log(`  ${usage} ${resourceMetadata.help[sub]}${requirementNote}`);
    });
  });

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
  console.log("");
  console.log("Run `not-manage <command> --help` for command-specific flags and examples.");
}

function printSetupHelp() {
  printCommandHelp("not-manage setup", {
    description: "Run guided credential setup, then continue directly into OAuth login.",
    usage: ["not-manage setup [auth-setup-options]"],
    notes: [
      "This command accepts the same setup flags as `not-manage auth setup`.",
      "If required values are missing, prompts are used only in an interactive terminal.",
    ],
    options: [
      { usage: "--confirm-confidentiality", description: "Acknowledge the confidentiality warning without a prompt" },
      { usage: "--region <code>", description: "Clio region code: us, ca, eu, or au" },
      { usage: "--client-id <value>", description: "App Key / Client ID" },
      { usage: "--client-secret <value>", description: "App Secret / Client Secret" },
      { usage: "--redirect-uri <url>", description: "Override the loopback OAuth redirect URI" },
      { usage: "--open-browser <true|false>", description: "Open the regional developer portal during setup" },
      { usage: "-h, --help", description: "Show help" },
    ],
    examples: [
      "not-manage setup",
      "not-manage setup --confirm-confidentiality --region us --client-id <key> --client-secret <secret>",
    ],
  });
}

function printAuthHelp() {
  printCommandHelp("not-manage auth", {
    description: "Manage Clio app credentials and OAuth tokens.",
    usage: ["not-manage auth <subcommand> [options]"],
    notes: [
      "Subcommands: setup, login, status, revoke",
      "Run `not-manage auth <subcommand> --help` for flags and examples.",
    ],
  });
}

function printAuthSetupHelp() {
  printCommandHelp("not-manage auth setup", {
    description: "Configure client credentials in the OS keychain.",
    usage: ["not-manage auth setup [options]"],
    notes: [
      "If required values are missing, prompts are used only in an interactive terminal.",
      "Outside a TTY, pass `--confirm-confidentiality`, `--client-id`, and `--client-secret`.",
    ],
    options: [
      { usage: "--confirm-confidentiality", description: "Acknowledge the confidentiality warning without a prompt" },
      { usage: "--region <code>", description: "Clio region code: us, ca, eu, or au" },
      { usage: "--client-id <value>", description: "App Key / Client ID" },
      { usage: "--client-secret <value>", description: "App Secret / Client Secret" },
      { usage: "--redirect-uri <url>", description: "Override the loopback OAuth redirect URI" },
      { usage: "--open-browser <true|false>", description: "Open the regional developer portal during setup" },
      { usage: "-h, --help", description: "Show help" },
    ],
    examples: [
      "not-manage auth setup",
      "not-manage auth setup --confirm-confidentiality --region us --client-id <key> --client-secret <secret>",
    ],
  });
}

function printAuthLoginHelp() {
  printCommandHelp("not-manage auth login", {
    description: "Run the local OAuth login flow using the saved client credentials.",
    usage: ["not-manage auth login"],
    options: [{ usage: "-h, --help", description: "Show help" }],
    examples: ["not-manage auth login"],
  });
}

function printAuthStatusHelp() {
  printCommandHelp("not-manage auth status", {
    description: "Show the configured region, token source, and connected user.",
    usage: ["not-manage auth status [options]"],
    options: [
      { usage: "--json", description: "Print machine-readable JSON" },
      { usage: "-h, --help", description: "Show help" },
    ],
    examples: ["not-manage auth status", "not-manage auth status --json"],
  });
}

function printAuthRevokeHelp() {
  printCommandHelp("not-manage auth revoke", {
    description: "Revoke the current Clio token and clear the local keychain token.",
    usage: ["not-manage auth revoke [options]"],
    notes: ["Use `--dry-run` to inspect the action without changing remote or local state."],
    options: [
      { usage: "--yes", description: "Skip the confirmation prompt and revoke immediately" },
      { usage: "--dry-run", description: "Print the revoke plan without revoking or clearing tokens" },
      { usage: "-h, --help", description: "Show help" },
    ],
    examples: ["not-manage auth revoke --dry-run", "not-manage auth revoke --yes"],
  });
}

function printWhoAmIHelp() {
  printCommandHelp("not-manage whoami", {
    description: "Call `/api/v4/users/who_am_i` for the authenticated user.",
    usage: ["not-manage whoami [options]"],
    options: [
      { usage: "--json", description: "Print machine-readable JSON" },
      { usage: "-h, --help", description: "Show help" },
    ],
    examples: ["not-manage whoami", "not-manage whoami --json"],
  });
}

function printResourceOverview(command, resourceMetadata) {
  const subcommands = ["list", "get"].filter((sub) => resourceMetadata.capabilities[sub].enabled);

  printCommandHelp(`not-manage ${command}`, {
    description: `Explore the ${command} command surface.`,
    usage: [`not-manage ${command} <subcommand> [options]`],
    notes: [
      `Subcommands: ${subcommands.join(", ")}`,
      resourceMetadata.aliases.length > 0
        ? `Aliases: ${resourceMetadata.aliases.join(", ")}`
        : null,
      `Run \`not-manage ${command} <subcommand> --help\` for flags and examples.`,
    ].filter(Boolean),
  });
}

function printResourceCommandHelp(command, sub, resourceMetadata) {
  const requiredFlags = listRequiredOptionFlags(resourceMetadata, sub);
  const usage =
    sub === "get"
      ? [`not-manage ${command} get <id> [options]`]
      : [`not-manage ${command} list [options]`];
  const notes = [];

  if (requiredFlags.length > 0) {
    notes.push(`Required filters: ${requiredFlags.join(", ")}`);
  }

  if (resourceMetadata.aliases.length > 0) {
    notes.push(`Aliases: ${resourceMetadata.aliases.join(", ")}`);
  }

  printCommandHelp(`not-manage ${command} ${sub}`, {
    description: resourceMetadata.help[sub],
    usage,
    notes,
    options: buildResourceOptionLines(resourceMetadata, sub),
    examples: buildResourceExamples(command, sub, requiredFlags),
  });
}

function printCommandSpecificHelp(command, sub) {
  if (!command) {
    printGlobalHelp();
    return;
  }

  if (command === "setup") {
    printSetupHelp();
    return;
  }

  if (command === "auth") {
    if (!sub) {
      printAuthHelp();
      return;
    }

    if (sub === "setup") {
      printAuthSetupHelp();
      return;
    }

    if (sub === "login") {
      printAuthLoginHelp();
      return;
    }

    if (sub === "status") {
      printAuthStatusHelp();
      return;
    }

    if (sub === "revoke") {
      printAuthRevokeHelp();
      return;
    }

    throw new Error(`Unknown subcommand for auth: ${sub}\nRun \`not-manage auth --help\`.`);
  }

  if (command === "whoami") {
    printWhoAmIHelp();
    return;
  }

  const resourceMetadata = getResourceMetadata(command);
  if (!resourceMetadata) {
    throw new Error(`Unknown command: ${command}\nRun \`not-manage --help\`.`);
  }

  if (!sub) {
    printResourceOverview(command, resourceMetadata);
    return;
  }

  if (!resourceMetadata.capabilities[sub]?.enabled) {
    throw new Error(
      `Unknown subcommand for ${command}: ${sub}\nRun \`not-manage ${command} --help\`.`
    );
  }

  printResourceCommandHelp(command, sub, resourceMetadata);
}

function stripRoutingFlags(args) {
  return args.filter((arg) => !HELP_FLAGS.has(arg) && !VERSION_FLAGS.has(arg));
}

function buildResourceOptions(resourceMetadata, sub, optionValues, positional, json, redacted) {
  return readCommandOptions(
    optionValues,
    resourceMetadata.optionSchema[sub],
    positional,
    {
      json,
      redacted,
    },
    resourceMetadata.fixedOptions?.[sub]
  );
}

function buildAuthSetupOptions(optionValues) {
  return {
    clientId: readStringOption(optionValues, "client-id"),
    clientSecret: readStringOption(optionValues, "client-secret"),
    confirmConfidentiality: readBooleanOption(optionValues, "confirm-confidentiality") === true,
    openBrowser: readBooleanOption(optionValues, "open-browser"),
    redirectUri: readStringOption(optionValues, "redirect-uri"),
    region: readStringOption(optionValues, "region"),
  };
}

function buildAuthRevokeOptions(optionValues) {
  return {
    dryRun: readBooleanOption(optionValues, "dry-run") === true,
    yes: readBooleanOption(optionValues, "yes") === true,
  };
}

async function run(args) {
  const helpRequested = hasFlag(args, "-h", "--help");
  const versionRequested = hasFlag(args, "-v", "--version");
  const routingArgs = stripRoutingFlags(args);

  if (routingArgs.length === 0) {
    if (versionRequested && !helpRequested) {
      console.log(`not-manage v${version}`);
      return;
    }

    printGlobalHelp();
    return;
  }

  const command = normalizeResourceCommand(routingArgs[0]);
  const sub = routingArgs[1];

  if (helpRequested) {
    printCommandSpecificHelp(command, sub);
    return;
  }

  const json = hasFlag(args, "--json");
  const { parsed: optionValues, positional } = parseOptions(routingArgs.slice(2));
  const redacted = resolveRedactionPreference(optionValues);

  if (maybePrintDefaultFields(command, sub, optionValues)) {
    return;
  }

  if (command === "setup") {
    await setupWizard(buildAuthSetupOptions(optionValues));
    return;
  }

  if (command === "auth") {
    if (!sub) {
      printAuthHelp();
      return;
    }

    if (sub === "setup") {
      await authSetup(buildAuthSetupOptions(optionValues));
      return;
    }

    if (sub === "login") {
      await authLogin();
      return;
    }

    if (sub === "status") {
      await authStatus({ json });
      return;
    }

    if (sub === "revoke") {
      await authRevoke(buildAuthRevokeOptions(optionValues));
      return;
    }

    throw new Error(`Unknown subcommand for auth: ${sub}\nRun \`not-manage auth --help\`.`);
  }

  if (command === "whoami") {
    await whoAmI({ json });
    return;
  }

  const resourceMetadata = getResourceMetadata(command);
  if (resourceMetadata && !sub) {
    printResourceOverview(command, resourceMetadata);
    return;
  }

  const handler = getResourceHandler(resourceMetadata, sub);

  if (resourceMetadata && handler) {
    warnAboutRedaction(resourceMetadata, sub, optionValues, redacted);
    await handler(
      buildResourceOptions(resourceMetadata, sub, optionValues, positional, json, redacted)
    );
    return;
  }

  if (resourceMetadata) {
    throw new Error(
      `Unknown subcommand for ${command}: ${sub}\nRun \`not-manage ${command} --help\`.`
    );
  }

  throw new Error(`Unknown command: ${routingArgs.join(" ")}\nRun \`not-manage --help\`.`);
}

module.exports = {
  run,
};
