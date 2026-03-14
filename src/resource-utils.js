function parseLimit(limitInput, max = 200) {
  if (limitInput === undefined || limitInput === null || limitInput === "") {
    return undefined;
  }

  const parsed = Number(limitInput);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > max) {
    throw new Error(`\`--limit\` must be an integer between 1 and ${max}.`);
  }

  return parsed;
}

function compactQuery(query) {
  const next = { ...query };
  Object.keys(next).forEach((key) => {
    if (next[key] === undefined || next[key] === null || next[key] === "") {
      delete next[key];
    }
  });
  return next;
}

function clip(value, maxLength) {
  const text = String(value || "");
  if (text.length <= maxLength) {
    return text;
  }
  if (maxLength <= 3) {
    return ".".repeat(maxLength);
  }
  return `${text.slice(0, maxLength - 3)}...`;
}

function readContactName(contact) {
  if (!contact || typeof contact !== "object") {
    return "-";
  }

  return (
    contact.name ||
    [contact.first_name, contact.last_name].filter(Boolean).join(" ").trim() ||
    "-"
  );
}

function readUserName(user) {
  if (!user || typeof user !== "object") {
    return "-";
  }

  return (
    user.name ||
    [user.first_name, user.last_name].filter(Boolean).join(" ").trim() ||
    user.email ||
    "-"
  );
}

function readMatterLabel(matter) {
  if (!matter || typeof matter !== "object") {
    return "-";
  }

  return matter.display_number || matter.number || matter.description || String(matter.id || "-");
}

function readStatus(status) {
  if (!status) {
    return "-";
  }

  if (typeof status === "string") {
    return status;
  }

  return status.name || status.value || status.state || "-";
}

function readHours(activity) {
  const quantityInHours = Number(activity?.quantity_in_hours);
  if (Number.isFinite(quantityInHours)) {
    return quantityInHours.toFixed(2);
  }

  const quantity = Number(activity?.quantity);
  if (Number.isFinite(quantity)) {
    return (quantity / 3600).toFixed(2);
  }

  return "-";
}

function readRoleList(user) {
  const roles = Array.isArray(user?.roles) ? user.roles : [];
  if (roles.length === 0) {
    return "-";
  }

  return roles.join(", ");
}

function readFirstMatterLabel(record) {
  const matters = Array.isArray(record?.matters) ? record.matters : [];
  if (matters.length === 0) {
    return "-";
  }

  return readMatterLabel(matters[0]);
}

function formatBoolean(value) {
  if (value === undefined || value === null) {
    return "-";
  }

  return value ? "yes" : "no";
}

function formatMoney(value) {
  if (value === undefined || value === null || value === "") {
    return "-";
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return String(value);
  }

  return parsed.toFixed(2);
}

function printKeyValueRows(rows) {
  const normalized = rows
    .filter(([label]) => label)
    .map(([label, value]) => [
      label,
      value === undefined || value === null || value === "" ? "-" : String(value),
    ]);

  if (normalized.length === 0) {
    return;
  }

  const width = normalized.reduce((max, [label]) => Math.max(max, label.length), 0);
  normalized.forEach(([label, value]) => {
    console.log(`${label.padEnd(width, " ")} : ${value}`);
  });
}

async function fetchPages(fetchPage, initialQuery, fetchAllPages) {
  const firstPage = await fetchPage(initialQuery);
  const firstData = Array.isArray(firstPage?.data) ? firstPage.data : [];
  const aggregatedData = [...firstData];
  let pagesFetched = 1;
  let nextPageUrl = firstPage?.meta?.paging?.next || null;

  while (fetchAllPages && nextPageUrl) {
    const nextPage = await fetchPage({}, nextPageUrl);
    const nextData = Array.isArray(nextPage?.data) ? nextPage.data : [];
    aggregatedData.push(...nextData);
    pagesFetched += 1;
    nextPageUrl = nextPage?.meta?.paging?.next || null;
  }

  return {
    firstPage,
    data: fetchAllPages ? aggregatedData : firstData,
    pagesFetched,
    nextPageUrl: fetchAllPages ? null : firstPage?.meta?.paging?.next || null,
  };
}

module.exports = {
  clip,
  compactQuery,
  fetchPages,
  formatBoolean,
  formatMoney,
  parseLimit,
  printKeyValueRows,
  readContactName,
  readFirstMatterLabel,
  readHours,
  readMatterLabel,
  readRoleList,
  readStatus,
  readUserName,
};
