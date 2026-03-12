const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const { captureConsole, loadWithMocks } = require("./helpers/module-test-utils");

const ROOT = path.resolve(__dirname, "..");

function loadPostinstall(options = {}) {
  const {
    askImpl = async (_label, fallback) => fallback,
    findConfigImpl = async () => null,
    setupImpl = async () => {},
  } = options;

  let setupCalls = 0;
  let findConfigCalls = 0;
  const promptLabels = [];

  const { module, restore } = loadWithMocks(path.join(ROOT, "src/postinstall.js"), {
    "./commands-auth": {
      setupWizard: async () => {
        setupCalls += 1;
        return setupImpl();
      },
    },
    "./prompt": {
      withPrompt: async (callback) => callback({}),
      ask: async (_rl, label, fallback) => {
        promptLabels.push({ label, fallback });
        return askImpl(label, fallback);
      },
    },
    "./store": {
      findConfig: async () => {
        findConfigCalls += 1;
        return findConfigImpl();
      },
    },
  });

  return {
    module,
    promptLabels,
    restore,
    get findConfigCalls() {
      return findConfigCalls;
    },
    get setupCalls() {
      return setupCalls;
    },
  };
}

test("postinstall gating only shows notices for global non-CI installs", () => {
  const { module, restore } = loadPostinstall();

  try {
    assert.equal(
      module.shouldShowPostinstallNotice({
        env: { npm_config_global: "true" },
        stdin: { isTTY: true },
        stdout: { isTTY: true },
      }),
      true
    );

    assert.equal(
      module.shouldShowPostinstallNotice({
        env: { npm_config_global: "false" },
        stdin: { isTTY: true },
        stdout: { isTTY: true },
      }),
      false
    );

    assert.equal(
      module.shouldShowPostinstallNotice({
        env: { npm_config_global: "true", CI: "1" },
        stdin: { isTTY: true },
        stdout: { isTTY: true },
      }),
      false
    );

    assert.equal(
      module.shouldShowPostinstallNotice({
        env: { npm_config_global: "true", CLIO_MANAGE_SKIP_POSTINSTALL_SETUP: "1" },
        stdin: { isTTY: true },
        stdout: { isTTY: true },
      }),
      false
    );

    assert.equal(
      module.shouldRunPostinstallOnboarding({
        env: { npm_config_global: "true" },
        stdin: { isTTY: true },
        stdout: { isTTY: true },
      }),
      true
    );

    assert.equal(
      module.shouldRunPostinstallOnboarding({
        env: { npm_config_global: "true" },
        stdin: { isTTY: false },
        stdout: { isTTY: true },
      }),
      false
    );
  } finally {
    restore();
  }
});

test("postinstall setup starts immediately on a fresh install when the prompt accepts default yes", async () => {
  const context = loadPostinstall();

  try {
    const { logs, result: started } = await captureConsole(() =>
      context.module.maybeRunPostinstallOnboarding({
        env: { npm_config_global: "true" },
        stdin: { isTTY: true },
        stdout: { isTTY: true },
      })
    );

    assert.equal(started, true);
    assert.equal(context.setupCalls, 1);
    assert.match(logs.join("\n"), /Confidentiality notice:/);
    assert.match(logs.join("\n"), /`--redacted` is best-effort only/);
    assert.deepEqual(context.promptLabels, [
      { label: "Start guided Clio setup now", fallback: "yes" },
    ]);
  } finally {
    context.restore();
  }
});

test("postinstall setup skips when config already exists", async () => {
  const context = loadPostinstall({
    findConfigImpl: async () => ({ source: "keychain" }),
  });

  try {
    const { logs, result: started } = await captureConsole(() =>
      context.module.maybeRunPostinstallOnboarding({
        env: { npm_config_global: "true" },
        stdin: { isTTY: true },
        stdout: { isTTY: true },
      })
    );

    assert.equal(started, false);
    assert.equal(context.findConfigCalls, 1);
    assert.equal(context.setupCalls, 0);
    assert.deepEqual(context.promptLabels, []);
    assert.match(logs.join("\n"), /Welcome back\. Clio is already configured on this machine\./);
  } finally {
    context.restore();
  }
});

test("postinstall shows a reinstall notice even when npm is non-interactive", async () => {
  const context = loadPostinstall({
    findConfigImpl: async () => ({ source: "keychain" }),
  });

  try {
    const { logs, result: started } = await captureConsole(() =>
      context.module.maybeRunPostinstallOnboarding({
        env: { npm_config_global: "true" },
        stdin: { isTTY: false },
        stdout: { isTTY: false },
      })
    );

    assert.equal(started, false);
    assert.equal(context.findConfigCalls, 1);
    assert.equal(context.setupCalls, 0);
    assert.match(logs.join("\n"), /Welcome back\. Clio is already configured on this machine\./);
  } finally {
    context.restore();
  }
});

test("postinstall setup can be skipped from the prompt", async () => {
  const { module, restore, setupCalls } = loadPostinstall({
    askImpl: async () => "no",
  });

  try {
    const { logs, result } = await captureConsole(() =>
      module.maybeRunPostinstallOnboarding({
        env: { npm_config_global: "true" },
        stdin: { isTTY: true },
        stdout: { isTTY: true },
      })
    );

    assert.equal(result, false);
    assert.equal(setupCalls, 0);
    assert.match(logs.join("\n"), /Skipping setup for now/);
  } finally {
    restore();
  }
});

test("postinstall shows a setup reminder on a fresh non-interactive install", async () => {
  const context = loadPostinstall();

  try {
    const { logs, result } = await captureConsole(() =>
      context.module.maybeRunPostinstallOnboarding({
        env: { npm_config_global: "true" },
        stdin: { isTTY: false },
        stdout: { isTTY: false },
      })
    );

    assert.equal(result, false);
    assert.equal(context.findConfigCalls, 1);
    assert.equal(context.setupCalls, 0);
    assert.match(logs.join("\n"), /clio-manage is installed\./);
    assert.match(logs.join("\n"), /Confidentiality notice:/);
    assert.match(logs.join("\n"), /Run `clio-manage setup` whenever you are ready\./);
  } finally {
    context.restore();
  }
});

test("postinstall main never fails the install when setup throws", async () => {
  const { module, restore } = loadPostinstall({
    setupImpl: async () => {
      throw new Error("boom");
    },
  });

  try {
    const { errors, logs } = await captureConsole(() =>
      module.main({
        env: { npm_config_global: "true" },
        stdin: { isTTY: true },
        stdout: { isTTY: true },
      })
    );

    assert.match(errors.join("\n"), /Post-install setup was skipped: boom/);
    assert.match(logs.join("\n"), /Run `clio-manage setup` when you are ready\./);
  } finally {
    restore();
  }
});
