#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const {
  RESOURCE_ORDER,
  getResourceMetadata,
  listRequiredOptionFlags,
} = require("../src/resource-metadata");

const README_PATH = path.resolve(__dirname, "..", "README.md");
const START_MARKER = "<!-- GENERATED:CLI_REFERENCE:start -->";
const END_MARKER = "<!-- GENERATED:CLI_REFERENCE:end -->";

function formatBacktickedList(values) {
  return values.length > 0 ? values.map((value) => `\`${value}\``).join(", ") : "-";
}

function readOperations(resourceMetadata) {
  return ["list", "get"].filter((sub) => resourceMetadata.capabilities[sub].enabled);
}

function buildCliReferenceContent() {
  const lines = [
    "This table is generated from resource metadata. Global auth/setup commands stay hand-written.",
    "",
    "| Command | Operations | Aliases | Required list filters |",
    "| --- | --- | --- | --- |",
  ];

  RESOURCE_ORDER.forEach((command) => {
    const resourceMetadata = getResourceMetadata(command);
    const operations = formatBacktickedList(readOperations(resourceMetadata));
    const aliases = formatBacktickedList(resourceMetadata.aliases || []);
    const requiredListFilters = formatBacktickedList(
      listRequiredOptionFlags(resourceMetadata, "list")
    );

    lines.push(
      `| \`${command}\` | ${operations} | ${aliases} | ${requiredListFilters} |`
    );
  });

  lines.push("");
  lines.push("Required list filters are enforced by the CLI before it calls Clio.");

  return lines.join("\n");
}

function updateReadmeContent(readmeContent) {
  const startIndex = readmeContent.indexOf(START_MARKER);
  const endIndex = readmeContent.indexOf(END_MARKER);

  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
    throw new Error("README is missing CLI reference markers.");
  }

  const before = readmeContent.slice(0, startIndex + START_MARKER.length);
  const after = readmeContent.slice(endIndex);
  const generatedBlock = `\n${buildCliReferenceContent()}\n`;

  return `${before}${generatedBlock}${after}`;
}

function main(argv = process.argv.slice(2)) {
  const checkOnly = argv.includes("--check");
  const currentReadme = fs.readFileSync(README_PATH, "utf8");
  const nextReadme = updateReadmeContent(currentReadme);

  if (checkOnly) {
    if (nextReadme !== currentReadme) {
      console.error("README CLI reference is out of date. Run `npm run docs:generate`.");
      process.exitCode = 1;
      return;
    }

    console.log("README CLI reference is up to date.");
    return;
  }

  if (nextReadme !== currentReadme) {
    fs.writeFileSync(README_PATH, nextReadme);
    console.log("Updated README CLI reference from resource metadata.");
    return;
  }

  console.log("README CLI reference is already up to date.");
}

if (require.main === module) {
  main();
}

module.exports = {
  buildCliReferenceContent,
  main,
  updateReadmeContent,
  END_MARKER,
  START_MARKER,
};
