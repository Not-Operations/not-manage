function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeOptionName(name) {
  return String(name).replace(/^--/, "");
}

function toSnakeCase(name) {
  return normalizeOptionName(name).replace(/-/g, "_");
}

function toKebabCase(name) {
  return normalizeOptionName(name).replace(/_/g, "-");
}

function optionKeyCandidates(name) {
  const normalized = normalizeOptionName(name);
  return [...new Set([normalized, toKebabCase(normalized), toSnakeCase(normalized)])];
}

function hasFlag(args, ...flags) {
  return flags.some((flag) => args.includes(flag));
}

function appendParsedValue(parsed, key, value) {
  if (!hasOwn(parsed, key)) {
    parsed[key] = value;
    return;
  }

  if (Array.isArray(parsed[key])) {
    parsed[key].push(value);
    return;
  }

  parsed[key] = [parsed[key], value];
}

function parseOptions(args) {
  const parsed = {};
  const positional = [];

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];

    if (!token.startsWith("--")) {
      positional.push(token);
      continue;
    }

    const [rawKey, ...rest] = token.slice(2).split("=");
    const inlineValue = rest.length > 0 ? rest.join("=") : null;

    if (inlineValue !== null) {
      appendParsedValue(parsed, rawKey, inlineValue);
      continue;
    }

    const next = args[index + 1];
    if (next && !next.startsWith("--")) {
      appendParsedValue(parsed, rawKey, next);
      index += 1;
      continue;
    }

    appendParsedValue(parsed, rawKey, true);
  }

  return { parsed, positional };
}

function normalizeOptionValues(value) {
  if (value === undefined) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function readOptionValues(parsedOptions, name) {
  return optionKeyCandidates(name).reduce((values, candidate) => {
    if (!hasOwn(parsedOptions, candidate)) {
      return values;
    }

    return values.concat(normalizeOptionValues(parsedOptions[candidate]));
  }, []);
}

function readOption(parsedOptions, name) {
  const values = readOptionValues(parsedOptions, name);
  if (values.length === 0) {
    return undefined;
  }

  return values.length === 1 ? values[0] : values;
}

function readLastOptionValue(parsedOptions, name) {
  const values = readOptionValues(parsedOptions, name);
  if (values.length === 0) {
    return undefined;
  }

  return values[values.length - 1];
}

function readStringOption(parsedOptions, name) {
  const value = readLastOptionValue(parsedOptions, name);
  if (value === undefined) {
    return undefined;
  }

  if (value === true) {
    throw new Error(`\`--${toKebabCase(name)}\` requires a value.`);
  }

  return String(value);
}

function splitCommaSeparatedValues(text) {
  return String(text)
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function readStringArrayOption(parsedOptions, name) {
  const values = readOptionValues(parsedOptions, name);
  if (values.length === 0) {
    return undefined;
  }

  const output = [];

  values.forEach((value) => {
    if (value === true) {
      throw new Error(`\`--${toKebabCase(name)}\` requires a value.`);
    }

    splitCommaSeparatedValues(value).forEach((item) => {
      output.push(item);
    });
  });

  return output.length > 0 ? output : undefined;
}

function parseBooleanValue(value, name) {
  if (value === true || value === false) {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") {
      return true;
    }
    if (normalized === "false") {
      return false;
    }
  }

  throw new Error(`\`--${toKebabCase(name)}\` must be \`true\` or \`false\`.`);
}

function readBooleanOption(parsedOptions, name) {
  const value = readLastOptionValue(parsedOptions, name);
  if (value === undefined) {
    return undefined;
  }

  return parseBooleanValue(value, name);
}

function readFlagOption(parsedOptions, name) {
  const value = readBooleanOption(parsedOptions, name);
  return value === undefined ? false : value;
}

function validateIsoDate(value, name) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    throw new Error(`\`--${toKebabCase(name)}\` must be an ISO date like \`2026-03-13\`.`);
  }

  const isoValue = `${match[1]}-${match[2]}-${match[3]}`;
  const parsed = new Date(`${isoValue}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== isoValue) {
    throw new Error(`\`--${toKebabCase(name)}\` must be an ISO date like \`2026-03-13\`.`);
  }

  return value;
}

function validateIsoDateTime(value, name) {
  const isoDateTime =
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/;
  if (!isoDateTime.test(value) || Number.isNaN(Date.parse(value))) {
    throw new Error(
      `\`--${toKebabCase(name)}\` must be an ISO datetime like \`2026-03-13T15:00:00Z\`.`
    );
  }

  return value;
}

function readIsoDateOption(parsedOptions, name) {
  const value = readStringOption(parsedOptions, name);
  if (value === undefined) {
    return undefined;
  }

  return validateIsoDate(value, name);
}

function readIsoDateTimeOption(parsedOptions, name) {
  const value = readStringOption(parsedOptions, name);
  if (value === undefined) {
    return undefined;
  }

  return validateIsoDateTime(value, name);
}

function readIsoDateArrayOption(parsedOptions, name) {
  const values = readStringArrayOption(parsedOptions, name);
  if (values === undefined) {
    return undefined;
  }

  return values.map((value) => validateIsoDate(value, name));
}

function readIsoDateTimeArrayOption(parsedOptions, name) {
  const values = readStringArrayOption(parsedOptions, name);
  if (values === undefined) {
    return undefined;
  }

  return values.map((value) => validateIsoDateTime(value, name));
}

function splitTopLevel(text, delimiter = ",") {
  const segments = [];
  let current = "";
  let depth = 0;
  let quote = null;
  let escapeNext = false;

  for (const char of String(text)) {
    if (escapeNext) {
      current += char;
      escapeNext = false;
      continue;
    }

    if (quote) {
      current += char;
      if (char === "\\") {
        escapeNext = true;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }

    if (char === "'" || char === '"') {
      quote = char;
      current += char;
      continue;
    }

    if (char === "[" || char === "{") {
      depth += 1;
      current += char;
      continue;
    }

    if (char === "]" || char === "}") {
      depth = Math.max(0, depth - 1);
      current += char;
      continue;
    }

    if (char === delimiter && depth === 0) {
      if (current.trim()) {
        segments.push(current.trim());
      }
      current = "";
      continue;
    }

    current += char;
  }

  if (current.trim()) {
    segments.push(current.trim());
  }

  return segments;
}

function unwrapQuotedValue(value) {
  const text = String(value).trim();
  if (
    (text.startsWith('"') && text.endsWith('"')) ||
    (text.startsWith("'") && text.endsWith("'"))
  ) {
    return text.slice(1, -1);
  }
  return text;
}

function parseStructuredValue(rawValue) {
  const text = String(rawValue).trim();
  if (!text) {
    return "";
  }

  if (
    (text.startsWith("{") && text.endsWith("}")) ||
    (text.startsWith("[") && text.endsWith("]")) ||
    (text.startsWith('"') && text.endsWith('"'))
  ) {
    try {
      return JSON.parse(text);
    } catch (_error) {
      if (text.startsWith("[") && text.endsWith("]")) {
        return splitTopLevel(text.slice(1, -1)).map((item) => unwrapQuotedValue(item));
      }
    }
  }

  return unwrapQuotedValue(text);
}

function mergeStructuredValues(existingValue, nextValue) {
  if (existingValue === undefined) {
    return nextValue;
  }

  if (isPlainObject(existingValue) && isPlainObject(nextValue)) {
    return Object.entries(nextValue).reduce((merged, [key, value]) => {
      merged[key] = mergeStructuredValues(merged[key], value);
      return merged;
    }, { ...existingValue });
  }

  const existingItems = Array.isArray(existingValue) ? existingValue : [existingValue];
  const nextItems = Array.isArray(nextValue) ? nextValue : [nextValue];
  return existingItems.concat(nextItems);
}

function parseObjectEntries(rawValue, name) {
  const text = String(rawValue).trim();
  if (!text) {
    throw new Error(`\`--${toKebabCase(name)}\` requires a value.`);
  }

  if (text.startsWith("{")) {
    const parsed = parseStructuredValue(text);
    if (!isPlainObject(parsed)) {
      throw new Error(`\`--${toKebabCase(name)}\` must be an object or key=value pairs.`);
    }
    return parsed;
  }

  return splitTopLevel(text).reduce((output, entry) => {
    const separatorIndex = entry.search(/[:=]/);
    if (separatorIndex <= 0) {
      throw new Error(
        `\`--${toKebabCase(name)}\` entries must look like \`field=value\` or JSON.`
      );
    }

    const key = entry.slice(0, separatorIndex).trim();
    const value = entry.slice(separatorIndex + 1).trim();
    if (!key) {
      throw new Error(
        `\`--${toKebabCase(name)}\` entries must include a field identifier before \`=\` or \`:\`.`
      );
    }

    output[key] = mergeStructuredValues(output[key], parseStructuredValue(value));
    return output;
  }, {});
}

function readObjectOption(parsedOptions, name) {
  const values = readOptionValues(parsedOptions, name);
  if (values.length === 0) {
    return undefined;
  }

  return values.reduce((output, value) => {
    if (value === true) {
      throw new Error(`\`--${toKebabCase(name)}\` requires a value.`);
    }

    return mergeStructuredValues(output, parseObjectEntries(value, name));
  }, undefined);
}

function readCommandOptions(parsedOptions, schema, positional = [], baseOptions = {}, fixed = {}) {
  const options = { ...baseOptions };

  Object.entries(schema || {}).forEach(([propertyName, optionDef]) => {
    if (optionDef.positional !== undefined) {
      options[propertyName] = positional[optionDef.positional];
      return;
    }

    switch (optionDef.kind) {
      case "boolean":
        options[propertyName] = readBooleanOption(parsedOptions, optionDef.option);
        return;
      case "flag":
        options[propertyName] = readFlagOption(parsedOptions, optionDef.option);
        return;
      case "iso-date":
        options[propertyName] = readIsoDateOption(parsedOptions, optionDef.option);
        return;
      case "iso-date-array":
        options[propertyName] = readIsoDateArrayOption(parsedOptions, optionDef.option);
        return;
      case "iso-datetime":
        options[propertyName] = readIsoDateTimeOption(parsedOptions, optionDef.option);
        return;
      case "iso-datetime-array":
        options[propertyName] = readIsoDateTimeArrayOption(parsedOptions, optionDef.option);
        return;
      case "object":
        options[propertyName] = readObjectOption(parsedOptions, optionDef.option);
        return;
      case "string-array":
        options[propertyName] = readStringArrayOption(parsedOptions, optionDef.option);
        return;
      case "string":
      default:
        options[propertyName] = readStringOption(parsedOptions, optionDef.option);
    }
  });

  return {
    ...options,
    ...fixed,
  };
}

module.exports = {
  hasFlag,
  parseOptions,
  readBooleanOption,
  readCommandOptions,
  readFlagOption,
  readIsoDateOption,
  readIsoDateArrayOption,
  readIsoDateTimeOption,
  readIsoDateTimeArrayOption,
  readObjectOption,
  readOption,
  readOptionValues,
  readStringOption,
  readStringArrayOption,
  toKebabCase,
};
