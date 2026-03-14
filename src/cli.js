const {
  authLogin,
  authRevoke,
  authSetup,
  authStatus,
  maybeRunSetupOnFirstUse,
  setupWizard,
  whoAmI,
} = require("./commands-auth");
const { hasFlag, parseOptions, readBooleanOption, readCommandOptions } = require("./cli-options");
const { getResourceHandler } = require("./resource-handlers");
const {
  RESOURCE_ORDER,
  getResourceMetadata,
  normalizeResourceCommand,
} = require("./resource-metadata");
const { version } = require("../package.json");

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

function printHelp() {
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
      if (!resourceMetadata.supports[sub]) {
        return;
      }

      const usage = `${command} ${sub}`.padEnd(18, " ");
      console.log(`  ${usage} ${resourceMetadata.help[sub]}`);
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
    console.log(`not-manage v${version}`);
    return;
  }

  const json = hasFlag(args, "--json");
  const command = normalizeResourceCommand(args[0]);
  const sub = args[1];
  const { parsed: optionValues, positional } = parseOptions(args.slice(2));
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

  const resourceMetadata = getResourceMetadata(command);
  const handler = getResourceHandler(resourceMetadata, sub);

  if (resourceMetadata && handler) {
    warnAboutRedaction(resourceMetadata, sub, optionValues, redacted);
    await handler(
      buildResourceOptions(resourceMetadata, sub, optionValues, positional, json, redacted)
    );
    return;
  }

  throw new Error(`Unknown command: ${args.join(" ")}`);
}

module.exports = {
  run,
};
