const path = require("node:path");

function resolveFrom(entryPath, request) {
  return require.resolve(request, {
    paths: [path.dirname(entryPath)],
  });
}

function loadWithMocks(entryFile, mocks = {}) {
  const entryPath = require.resolve(entryFile);
  const originals = new Map();
  const mockedPaths = [];

  Object.entries(mocks).forEach(([request, exports]) => {
    const resolved = resolveFrom(entryPath, request);
    mockedPaths.push(resolved);
    originals.set(resolved, require.cache[resolved]);
    require.cache[resolved] = {
      id: resolved,
      filename: resolved,
      loaded: true,
      exports,
    };
  });

  originals.set(entryPath, require.cache[entryPath]);
  delete require.cache[entryPath];

  const loaded = require(entryPath);

  return {
    module: loaded,
    restore() {
      delete require.cache[entryPath];

      const originalEntry = originals.get(entryPath);
      if (originalEntry) {
        require.cache[entryPath] = originalEntry;
      }

      mockedPaths.forEach((resolved) => {
        const original = originals.get(resolved);
        if (original) {
          require.cache[resolved] = original;
          return;
        }

        delete require.cache[resolved];
      });
    },
  };
}

function stringifyConsoleArg(value) {
  if (typeof value === "string") {
    return value;
  }

  return String(value);
}

async function captureConsole(run) {
  const logs = [];
  const errors = [];
  const originalLog = console.log;
  const originalError = console.error;

  console.log = (...args) => {
    logs.push(args.map(stringifyConsoleArg).join(" "));
  };

  console.error = (...args) => {
    errors.push(args.map(stringifyConsoleArg).join(" "));
  };

  try {
    const result = await run();
    return { errors, logs, result };
  } finally {
    console.log = originalLog;
    console.error = originalError;
  }
}

function buildPage(data, next = null) {
  return {
    data,
    meta: {
      paging: {
        next,
      },
    },
  };
}

module.exports = {
  buildPage,
  captureConsole,
  loadWithMocks,
};
