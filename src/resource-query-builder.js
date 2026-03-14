const { compactQuery, parseLimit } = require("./resource-utils");

function toSnakeCase(name) {
  return String(name).replace(/-/g, "_");
}

function deriveQueryKey(propertyName, optionDef) {
  if (!optionDef || optionDef.query === false || optionDef.positional !== undefined) {
    return null;
  }

  if (optionDef.query) {
    return optionDef.query;
  }

  if (propertyName === "all") {
    return null;
  }

  return optionDef.option ? toSnakeCase(optionDef.option) : null;
}

function readQueryValue(propertyName, optionDef, options, resourceMetadata, config) {
  if (propertyName === "fields") {
    return options.fields || resourceMetadata.defaultFields?.list;
  }

  if (propertyName === "limit") {
    return parseLimit(options.limit, config.limitMax);
  }

  const value = options[propertyName];
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (optionDef.kind === "flag") {
    return value ? true : undefined;
  }

  if (optionDef.kind === "boolean") {
    return Boolean(value);
  }

  return value;
}

function buildListQueryFromResource(resourceMetadata, options = {}, config = {}) {
  const schema = resourceMetadata?.optionSchema?.list || {};
  const query = {};

  Object.entries(schema).forEach(([propertyName, optionDef]) => {
    const queryKey = deriveQueryKey(propertyName, optionDef);
    if (!queryKey) {
      return;
    }

    query[queryKey] = readQueryValue(
      propertyName,
      optionDef,
      options,
      resourceMetadata,
      config
    );
  });

  const withExtra =
    typeof config.transform === "function"
      ? config.transform(compactQuery({ ...query }), options)
      : query;

  return compactQuery({
    ...(withExtra || {}),
    ...(config.extraQuery || {}),
  });
}

module.exports = {
  buildListQueryFromResource,
};
