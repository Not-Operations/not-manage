const { setupWizard } = require("./commands-auth");
const { ask, withPrompt } = require("./prompt");
const { findConfig } = require("./store");

function printConfidentialityNotice(log = console.log) {
  log("Confidentiality notice:");
  log("  clio-manage can display client-identifying, confidential, or privileged matter data.");
  log("  `--redacted` is best-effort only and may miss identifiers in labels, custom fields, or free text.");
  log("  Review all output before sharing it with AI tools, tickets, chats, or other third parties.");
  log("  Use only with workflows and vendors your firm has approved.");
}

function shouldShowPostinstallNotice(options = {}) {
  const env = options.env || process.env;

  if (env.CLIO_MANAGE_SKIP_POSTINSTALL_SETUP === "1") {
    return false;
  }

  if (env.CI) {
    return false;
  }

  if (env.npm_config_global !== "true") {
    return false;
  }

  return true;
}

function shouldRunPostinstallOnboarding(options = {}) {
  const stdin = options.stdin || process.stdin;
  const stdout = options.stdout || process.stdout;

  if (!shouldShowPostinstallNotice(options)) {
    return false;
  }

  if (!stdin.isTTY || !stdout.isTTY) {
    return false;
  }

  return true;
}

function printPostinstallIntro(log = console.log) {
  log("");
  log("+===========================================+");
  log("|          CLIO MANAGE IS INSTALLED         |");
  log("+===========================================+");
  log("|     Start first-time setup from npm?      |");
  log("+===========================================+");
  log("");
  log("This prompt only appears on fresh interactive global installs.");
  log("If you skip it now, run `clio-manage setup` whenever you are ready.");
  log("");
  printConfidentialityNotice(log);
  log("");
}

function printPostinstallInstalledNotice(log = console.log) {
  log("");
  log("clio-manage is installed.");
  printConfidentialityNotice(log);
  log("Run `clio-manage setup` whenever you are ready.");
}

function printPostinstallWelcomeBack(log = console.log) {
  log("");
  log("Welcome back. Clio is already configured on this machine.");
  log("Run `clio-manage auth status` to verify the current connection, or `clio-manage setup` to reconfigure.");
}

async function maybeRunPostinstallOnboarding(options = {}) {
  const log = options.log || console.log;
  const findConfigFn = options.findConfig || findConfig;
  const setupWizardFn = options.setupWizard || setupWizard;
  const withPromptFn = options.withPrompt || withPrompt;
  const askFn = options.ask || ask;

  if (!shouldShowPostinstallNotice(options)) {
    return false;
  }

  const config = await findConfigFn();
  if (config) {
    printPostinstallWelcomeBack(log);
    return false;
  }

  if (!shouldRunPostinstallOnboarding(options)) {
    printPostinstallInstalledNotice(log);
    return false;
  }

  printPostinstallIntro(log);

  const answer = String(
    await withPromptFn((rl) => askFn(rl, "Start guided Clio setup now", "yes"))
  )
    .trim()
    .toLowerCase();

  if (["n", "no", "skip"].includes(answer)) {
    log("Skipping setup for now. Run `clio-manage setup` when you are ready.");
    return false;
  }

  await setupWizardFn();
  return true;
}

async function main(options = {}) {
  const log = options.log || console.log;
  const errorLog = options.errorLog || console.error;

  try {
    await maybeRunPostinstallOnboarding(options);
  } catch (error) {
    errorLog(`Post-install setup was skipped: ${error.message}`);
    log("Run `clio-manage setup` when you are ready.");
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  main,
  maybeRunPostinstallOnboarding,
  printConfidentialityNotice,
  shouldShowPostinstallNotice,
  shouldRunPostinstallOnboarding,
};
