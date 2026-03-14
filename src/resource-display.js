const { clip, printKeyValueRows } = require("./resource-utils");

function resolveDescriptorValue(item, descriptor) {
  if (typeof descriptor.value === "function") {
    return descriptor.value(item);
  }

  return item?.[descriptor.key];
}

function createListPrinter(config) {
  const {
    columns,
    emptyMessage,
    moreResults,
    noun,
    rowLimit = 50,
  } = config;

  const headerLine = columns
    .map((column) => {
      if (column.width) {
        return String(column.header).padEnd(column.width, " ");
      }

      return String(column.header);
    })
    .join(" ");

  const dividerLine = columns
    .map((column) => "-".repeat(column.width || String(column.header).length))
    .join(" ");

  return function printList(rows, options = {}) {
    if (rows.length === 0) {
      console.log(emptyMessage);
      return;
    }

    const visibleRows = rows.slice(0, rowLimit);
    console.log(headerLine);
    console.log(dividerLine);

    visibleRows.forEach((row) => {
      const line = columns
        .map((column) => {
          const rawValue = row?.[column.key];
          const text = clip(
            rawValue === undefined || rawValue === null ? "-" : String(rawValue),
            column.width || String(rawValue || "-").length
          );

          if (!column.width || column.pad === false) {
            return text;
          }

          return text.padEnd(column.width, " ");
        })
        .join(" ");

      console.log(line);
    });

    if (rows.length > visibleRows.length) {
      console.log(`Showing ${visibleRows.length} of ${rows.length} ${noun}. Use --json for full output.`);
    }

    if (!options.all && options.nextPageUrl) {
      const lines =
        typeof moreResults === "function"
          ? moreResults(options)
          : [
              "More results are available.",
              "Run again with `--all` or pass `--page-token` from `--json` output.",
            ];

      if (Array.isArray(lines) && lines.length > 0) {
        console.log("");
        lines.forEach((line) => {
          console.log(line);
        });
      }
    }
  };
}

function createDetailPrinter(config) {
  const { fields } = config;

  return function printItem(item = {}) {
    printKeyValueRows(
      fields.map((field) => [field.label, resolveDescriptorValue(item, field)])
    );
  };
}

module.exports = {
  createDetailPrinter,
  createListPrinter,
};
