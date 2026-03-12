const CLIENT_OBJECT_KEYS = new Set(["client", "clients", "contact", "contacts"]);
const CONTACT_LIKE_RESOURCE_TYPES = new Set(["contact", "billable-client"]);
const FREE_TEXT_FIELDS = new Set(["description", "memo", "note", "reference", "subject"]);
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

function replaceKnownSensitiveValues(text, replacements) {
  return replacements
    .slice()
    .sort((left, right) => right.value.length - left.value.length)
    .reduce((output, replacement) => {
      const matcher = new RegExp(escapeRegExp(replacement.value), "gi");
      return output.replace(matcher, replacement.placeholder);
    }, text);
}

function redactFreeText(text, replacements) {
  let output = String(text);

  output = replaceKnownSensitiveValues(output, replacements);
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

function redactValue(value, resourceType, contactLikeContext, replacements) {
  if (Array.isArray(value)) {
    return value.map((item) =>
      redactValue(item, resourceType, contactLikeContext, replacements)
    );
  }

  if (!isObject(value)) {
    return value;
  }

  const output = {};

  Object.entries(value).forEach(([key, child]) => {
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

    if (FREE_TEXT_FIELDS.has(key) && typeof child === "string") {
      output[key] = redactFreeText(child, replacements);
      return;
    }

    output[key] = redactValue(
      child,
      resourceType,
      contactLikeContext || CLIENT_OBJECT_KEYS.has(key),
      replacements
    );
  });

  return output;
}

function redactPayload(value, resourceType) {
  const replacements = collectSensitiveReplacements(value, resourceType);
  return redactValue(value, resourceType, isContactLikeResourceType(resourceType), replacements);
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
    collectSensitiveReplacements,
    redactFreeText,
    redactPayload,
    replaceKnownSensitiveValues,
  },
};
