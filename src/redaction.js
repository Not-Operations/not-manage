const CLIENT_OBJECT_KEYS = new Set(["client", "clients", "contact", "contacts"]);
const CONTACT_LIKE_RESOURCE_TYPES = new Set(["contact", "billable-client"]);
const SAFE_IDENTITY_RESOURCE_TYPES = new Set(["user"]);
const FREE_TEXT_FIELDS = new Set(["description", "memo", "note", "reference", "subject"]);
const LABEL_FIELDS = new Set(["display_number", "number", "identifier", "title"]);
const NAME_FIELDS = new Set(["name", "first_name", "last_name"]);
const EMAIL_FIELDS = new Set([
  "email",
  "primary_email_address",
  "secondary_email_address",
  "clio_connect_email",
]);
const PHONE_FIELDS = new Set([
  "phone_number",
  "primary_phone_number",
  "secondary_phone_number",
]);
const SAFE_IDENTITY_OBJECT_KEYS = new Set([
  "user",
  "assignee",
  "assigner",
  "responsible_attorney",
  "responsible_staff",
  "originating_attorney",
]);
const NAME_HEURISTIC_EXCLUDED_TOKENS = new Set([
  "activity",
  "area",
  "attorney",
  "australia",
  "call",
  "calendar",
  "canada",
  "case",
  "client",
  "complaint",
  "complete",
  "confirm",
  "contact",
  "date",
  "demand",
  "defendant",
  "draft",
  "email",
  "employment",
  "entry",
  "europe",
  "expense",
  "family",
  "file",
  "financial",
  "follow",
  "injury",
  "labor",
  "law",
  "limitations",
  "matter",
  "meet",
  "monitor",
  "motion",
  "package",
  "personal",
  "plaintiff",
  "prepare",
  "practice",
  "request",
  "research",
  "review",
  "schedule",
  "send",
  "serve",
  "settlement",
  "spoke",
  "states",
  "talk",
  "task",
  "time",
  "trust",
  "united",
  "upload",
  "with",
]);

const PLACEHOLDERS = {
  email: "[REDACTED_EMAIL]",
  name: "[REDACTED_NAME]",
  phone: "[REDACTED_PHONE]",
  ssn: "[REDACTED_SSN]",
  taxId: "[REDACTED_TAX_ID]",
};

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function isContactLikeResourceType(resourceType) {
  return CONTACT_LIKE_RESOURCE_TYPES.has(resourceType);
}

function isSafeIdentityResourceType(resourceType) {
  return SAFE_IDENTITY_RESOURCE_TYPES.has(resourceType);
}

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function pushReplacement(replacements, dedupe, value, placeholder) {
  const normalized = normalizeString(value);
  if (!normalized) {
    return;
  }

  const key = `${placeholder}:${normalized.toLowerCase()}`;
  if (dedupe.has(key)) {
    return;
  }

  dedupe.add(key);
  replacements.push({
    placeholder,
    value: normalized,
  });
}

function collectContactLikeReplacements(node, replacements, dedupe) {
  if (!isObject(node)) {
    return;
  }

  pushReplacement(replacements, dedupe, node.name, PLACEHOLDERS.name);

  const fullName = [node.first_name, node.last_name]
    .map((value) => normalizeString(value))
    .filter(Boolean)
    .join(" ")
    .trim();
  pushReplacement(replacements, dedupe, fullName, PLACEHOLDERS.name);

  EMAIL_FIELDS.forEach((field) => {
    pushReplacement(replacements, dedupe, node[field], PLACEHOLDERS.email);
  });

  PHONE_FIELDS.forEach((field) => {
    pushReplacement(replacements, dedupe, node[field], PLACEHOLDERS.phone);
  });
}

function collectSensitiveReplacements(
  value,
  resourceType,
  contactLikeContext = isContactLikeResourceType(resourceType),
  replacements = [],
  dedupe = new Set()
) {
  if (Array.isArray(value)) {
    value.forEach((item) => {
      collectSensitiveReplacements(item, resourceType, contactLikeContext, replacements, dedupe);
    });
    return replacements;
  }

  if (!isObject(value)) {
    return replacements;
  }

  if (contactLikeContext) {
    collectContactLikeReplacements(value, replacements, dedupe);
  }

  Object.entries(value).forEach(([key, child]) => {
    const childContactLikeContext = contactLikeContext || CLIENT_OBJECT_KEYS.has(key);
    collectSensitiveReplacements(
      child,
      resourceType,
      childContactLikeContext,
      replacements,
      dedupe
    );
  });

  return replacements;
}

function pushPreservedName(preserved, value) {
  const normalized = normalizeString(value);
  if (!normalized) {
    return;
  }

  preserved.add(normalized.toLowerCase());
}

function collectSafeIdentityNames(
  value,
  safeIdentityContext = false,
  preserved = new Set()
) {
  if (Array.isArray(value)) {
    value.forEach((item) => {
      collectSafeIdentityNames(item, safeIdentityContext, preserved);
    });
    return preserved;
  }

  if (!isObject(value)) {
    return preserved;
  }

  if (safeIdentityContext) {
    pushPreservedName(preserved, value.name);

    const fullName = [value.first_name, value.last_name]
      .map((item) => normalizeString(item))
      .filter(Boolean)
      .join(" ")
      .trim();
    pushPreservedName(preserved, fullName);
  }

  Object.entries(value).forEach(([key, child]) => {
    collectSafeIdentityNames(
      child,
      safeIdentityContext || SAFE_IDENTITY_OBJECT_KEYS.has(key),
      preserved
    );
  });

  return preserved;
}

function replaceKnownSensitiveValues(text, replacements) {
  return replacements
    .slice()
    .sort((left, right) => right.value.length - left.value.length)
    .reduce((output, replacement) => {
      const matcher = new RegExp(escapeRegExp(replacement.value), "gi");
      return output.replace(matcher, replacement.placeholder);
    }, text);
}

function redactPatternPii(text) {
  let output = String(text);
  output = output.replace(
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
    PLACEHOLDERS.email
  );
  output = output.replace(
    /\b(?:\+?1[-.\s]*)?(?:\(\d{3}\)|\d{3})[-.\s]*\d{3}[-.\s]*\d{4}\b/g,
    PLACEHOLDERS.phone
  );
  output = output.replace(/\b\d{3}-\d{2}-\d{4}\b/g, PLACEHOLDERS.ssn);
  output = output.replace(/\b\d{2}-\d{7}\b/g, PLACEHOLDERS.taxId);

  return output;
}

function isLikelyNameCandidate(tokens, preservedNames) {
  const candidate = tokens.join(" ").trim();
  if (!candidate) {
    return false;
  }

  if (preservedNames.has(candidate.toLowerCase())) {
    return false;
  }

  return tokens.every((token) => {
    const cleaned = token.replace(/^[^A-Za-z]+|[^A-Za-z]+$/g, "");
    if (!/^[A-Z][a-z]+(?:[-'][A-Z][a-z]+)?$/.test(cleaned)) {
      return false;
    }
    return !NAME_HEURISTIC_EXCLUDED_TOKENS.has(cleaned.toLowerCase());
  });
}

function redactLikelyBareNames(text, preservedNames) {
  const tokens = Array.from(
    String(text).matchAll(/\b[A-Z][a-z]+(?:[-'][A-Z][a-z]+)?\b/g),
    (match) => ({
      end: match.index + match[0].length,
      start: match.index,
      value: match[0],
    })
  );

  const spans = [];

  for (let index = 0; index < tokens.length; index += 1) {
    let matched = false;

    for (const size of [3, 2]) {
      if (index + size > tokens.length) {
        continue;
      }

      const window = tokens.slice(index, index + size);
      const joinedByWhitespace = window
        .slice(1)
        .every((token, offset) => /^\s+$/.test(text.slice(window[offset].end, token.start)));

      if (!joinedByWhitespace) {
        continue;
      }

      const words = window.map((token) => token.value);
      if (!isLikelyNameCandidate(words, preservedNames)) {
        continue;
      }

      spans.push({
        end: window[window.length - 1].end,
        start: window[0].start,
      });
      index += size - 1;
      matched = true;
      break;
    }

    if (matched) {
      continue;
    }
  }

  return spans
    .sort((left, right) => right.start - left.start)
    .reduce(
      (output, span) =>
        `${output.slice(0, span.start)}${PLACEHOLDERS.name}${output.slice(span.end)}`,
      String(text)
    );
}

function redactStringValue(text, key, replacements, preservedNames) {
  let output = String(text);

  output = replaceKnownSensitiveValues(output, replacements);
  output = redactPatternPii(output);

  if (FREE_TEXT_FIELDS.has(key) || LABEL_FIELDS.has(key)) {
    output = redactLikelyBareNames(output, preservedNames);
  }

  return output;
}

function redactValue(
  value,
  resourceType,
  contactLikeContext,
  replacements,
  preservedNames,
  safeIdentityContext = false
) {
  if (Array.isArray(value)) {
    return value.map((item) =>
      redactValue(
        item,
        resourceType,
        contactLikeContext,
        replacements,
        preservedNames,
        safeIdentityContext
      )
    );
  }

  if (!isObject(value)) {
    return value;
  }

  const output = {};

  Object.entries(value).forEach(([key, child]) => {
    if (safeIdentityContext && (NAME_FIELDS.has(key) || EMAIL_FIELDS.has(key) || PHONE_FIELDS.has(key))) {
      output[key] = child;
      return;
    }

    if (contactLikeContext && NAME_FIELDS.has(key)) {
      output[key] = PLACEHOLDERS.name;
      return;
    }

    if (contactLikeContext && EMAIL_FIELDS.has(key)) {
      output[key] = PLACEHOLDERS.email;
      return;
    }

    if (contactLikeContext && PHONE_FIELDS.has(key)) {
      output[key] = PLACEHOLDERS.phone;
      return;
    }

    if (typeof child === "string") {
      output[key] = safeIdentityContext
        ? child
        : redactStringValue(child, key, replacements, preservedNames);
      return;
    }

    output[key] = redactValue(
      child,
      resourceType,
      contactLikeContext || CLIENT_OBJECT_KEYS.has(key),
      replacements,
      preservedNames,
      safeIdentityContext || SAFE_IDENTITY_OBJECT_KEYS.has(key)
    );
  });

  return output;
}

function redactPayload(value, resourceType) {
  const replacements = collectSensitiveReplacements(value, resourceType);
  const preservedNames = collectSafeIdentityNames(
    value,
    isSafeIdentityResourceType(resourceType)
  );
  return redactValue(
    value,
    resourceType,
    isContactLikeResourceType(resourceType),
    replacements,
    preservedNames,
    isSafeIdentityResourceType(resourceType)
  );
}

function maybeRedactData(data, options, resourceType) {
  if (!options?.redacted) {
    return data;
  }

  return redactPayload(data, resourceType);
}

function maybeRedactPayload(payload, options, resourceType) {
  if (!options?.redacted || !isObject(payload) || !Object.hasOwn(payload, "data")) {
    return payload;
  }

  return {
    ...payload,
    data: redactPayload(payload.data, resourceType),
  };
}

module.exports = {
  PLACEHOLDERS,
  maybeRedactData,
  maybeRedactPayload,
  __private: {
    collectSafeIdentityNames,
    redactLikelyBareNames,
    redactPatternPii,
    collectSensitiveReplacements,
    redactPayload,
    redactStringValue,
    replaceKnownSensitiveValues,
  },
};
