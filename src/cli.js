const {
  authLogin,
  authRevoke,
  authSetup,
  authStatus,
  setupWizard,
  whoAmI,
} = require("./commands-auth");
const { version } = require("../package.json");

function hasFlag(args, ...flags) {
  return flags.some((flag) => args.includes(flag));
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
  if (!args.length || hasFlag(args, "-h", "--help")) {
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

  throw new Error(`Unknown command: ${args.join(" ")}`);
}

module.exports = {
  run,
};
