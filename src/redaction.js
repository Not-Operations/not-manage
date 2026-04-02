const { getRedactionPolicy } = require("./redaction-policy");

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
  creditCard: "[REDACTED_CREDIT_CARD]",
  email: "[REDACTED_EMAIL]",
  name: "[REDACTED_NAME]",
  phone: "[REDACTED_PHONE]",
  ssn: "[REDACTED_SSN]",
  taxId: "[REDACTED_TAX_ID]",
};
const PERSON_NAME_SUFFIXES = new Set(["esq", "ii", "iii", "iv", "jr", "sr"]);
const COMPANY_NOISE_TOKENS = new Set([
  "and", "co", "company", "corp", "corporation", "dba", "group",
  "inc", "incorporated", "limited", "llc", "llp", "lp", "ltd",
  "of", "pa", "pc", "plc", "pllc", "the",
]);

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
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

  const firstName = normalizeString(node.first_name);
  const lastName = normalizeString(node.last_name);

  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
  pushReplacement(replacements, dedupe, fullName, PLACEHOLDERS.name);

  if (lastName && lastName.length >= 2) {
    pushReplacement(replacements, dedupe, lastName, PLACEHOLDERS.name);
  }
  if (firstName && firstName.length >= 2) {
    pushReplacement(replacements, dedupe, firstName, PLACEHOLDERS.name);
  }

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
  contactLikeContext = getRedactionPolicy(resourceType).contactLikeResource,
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

  const policy = getRedactionPolicy(resourceType);

  Object.entries(value).forEach(([key, child]) => {
    const childContactLikeContext =
      contactLikeContext || policy.clientObjectKeys.has(key);
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
  policy,
  safeIdentityContext = false,
  preserved = new Set()
) {
  if (Array.isArray(value)) {
    value.forEach((item) => {
      collectSafeIdentityNames(item, policy, safeIdentityContext, preserved);
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
      policy,
      safeIdentityContext || policy.safeIdentityObjectKeys.has(key),
      preserved
    );
  });

  return preserved;
}

function tokenizeName(name, separator = /\s+/) {
  return normalizeString(name)
    .split(separator)
    .map((token) => token.replace(/^[^A-Za-z]+|[^A-Za-z]+$/g, ""))
    .filter(Boolean);
}

function derivePersonSurname(name) {
  const tokens = tokenizeName(name);

  if (tokens.length < 2) {
    return "";
  }

  let index = tokens.length - 1;
  while (index > 0 && PERSON_NAME_SUFFIXES.has(tokens[index].toLowerCase())) {
    index -= 1;
  }

  return index > 0 ? tokens[index] : "";
}

function deriveCompanyNameTokens(name) {
  return tokenizeName(name, /[\s&,]+/).filter(
    (token) =>
      token.length >= 3 &&
      !COMPANY_NOISE_TOKENS.has(token.toLowerCase())
  );
}

function collectClientLabelReplacements(
  value,
  policy,
  clientContext = false,
  replacements = [],
  dedupe = new Set()
) {
  if (Array.isArray(value)) {
    value.forEach((item) => {
      collectClientLabelReplacements(
        item,
        policy,
        clientContext,
        replacements,
        dedupe
      );
    });
    return replacements;
  }

  if (!isObject(value)) {
    return replacements;
  }

  if (clientContext && value.type === "Person") {
    pushReplacement(
      replacements,
      dedupe,
      derivePersonSurname(value.name),
      PLACEHOLDERS.name
    );
  }

  if (clientContext && value.type === "Company") {
    deriveCompanyNameTokens(value.name).forEach((token) => {
      pushReplacement(replacements, dedupe, token, PLACEHOLDERS.name);
    });
  }

  Object.entries(value).forEach(([key, child]) => {
    collectClientLabelReplacements(
      child,
      policy,
      clientContext || policy.clientObjectKeys.has(key),
      replacements,
      dedupe
    );
  });

  return replacements;
}

function applyReplacements(text, replacements, wordBoundary = false) {
  return replacements
    .slice()
    .sort((left, right) => right.value.length - left.value.length)
    .reduce((output, replacement) => {
      const escaped = escapeRegExp(replacement.value);
      const pattern = wordBoundary ? `\\b${escaped}\\b` : escaped;
      return output.replace(new RegExp(pattern, "gi"), replacement.placeholder);
    }, String(text));
}

function replaceKnownSensitiveValues(text, replacements) {
  return applyReplacements(text, replacements);
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
  output = output.replace(/\b\d{3}[-\s]\d{2}[-\s]\d{4}\b/g, PLACEHOLDERS.ssn);
  output = output.replace(/\b\d{2}-\d{7}\b/g, PLACEHOLDERS.taxId);
  output = output.replace(
    /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
    PLACEHOLDERS.creditCard
  );
  output = output.replace(
    /\b3[47]\d{2}[-\s]?\d{6}[-\s]?\d{5}\b/g,
    PLACEHOLDERS.creditCard
  );

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

function replaceMatterLabelDerivedNames(text, replacements) {
  return applyReplacements(text, replacements, true);
}

function isMatterLabelContext(policy, path, key) {
  return path[path.length - 1] === "matter" && policy.matterLabelFields.has(key);
}

function isLabelContext(policy, key) {
  return policy.labelFields.has(key);
}

function redactStringValue(
  policy,
  text,
  key,
  replacements,
  preservedNames,
  derivedLabelReplacements,
  path
) {
  let output = String(text);

  output = replaceKnownSensitiveValues(output, replacements);
  output = redactPatternPii(output);

  if (isMatterLabelContext(policy, path, key) || isLabelContext(policy, key)) {
    output = replaceMatterLabelDerivedNames(output, derivedLabelReplacements);
  }

  if (policy.freeTextFields.has(key) || policy.labelFields.has(key)) {
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
  derivedLabelReplacements,
  safeIdentityContext = false,
  path = []
) {
  const policy = getRedactionPolicy(resourceType);

  if (Array.isArray(value)) {
    return value.map((item) =>
      redactValue(
        item,
        resourceType,
        contactLikeContext,
        replacements,
        preservedNames,
        derivedLabelReplacements,
        safeIdentityContext,
        path
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
        : redactStringValue(
            policy,
            child,
            key,
            replacements,
            preservedNames,
            derivedLabelReplacements,
            path
          );
      return;
    }

    output[key] = redactValue(
      child,
      resourceType,
      contactLikeContext || policy.clientObjectKeys.has(key),
      replacements,
      preservedNames,
      derivedLabelReplacements,
      safeIdentityContext || policy.safeIdentityObjectKeys.has(key),
      path.concat(key)
    );
  });

  return output;
}

function redactPayload(value, resourceType) {
  const policy = getRedactionPolicy(resourceType);
  const replacements = collectSensitiveReplacements(value, resourceType);
  const derivedLabelReplacements = collectClientLabelReplacements(value, policy);
  const preservedNames = collectSafeIdentityNames(
    value,
    policy,
    policy.safeIdentityResource
  );
  return redactValue(
    value,
    resourceType,
    policy.contactLikeResource,
    replacements,
    preservedNames,
    derivedLabelReplacements,
    policy.safeIdentityResource
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
    collectClientLabelReplacements,
    collectSafeIdentityNames,
    derivePersonSurname,
    redactLikelyBareNames,
    redactPatternPii,
    collectSensitiveReplacements,
    redactPayload,
    replaceMatterLabelDerivedNames,
    redactStringValue,
    replaceKnownSensitiveValues,
  },
};
