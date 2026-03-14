const SET_KEYS = [
  "clientObjectKeys",
  "freeTextFields",
  "labelFields",
  "matterLabelFields",
  "safeIdentityObjectKeys",
];

const DEFAULT_POLICY = {
  clientObjectKeys: new Set(["client", "clients", "contact", "contacts"]),
  contactLikeResource: false,
  freeTextFields: new Set([
    "body",
    "caption",
    "comment",
    "content",
    "description",
    "detail",
    "display_value",
    "field_value",
    "instructions",
    "location",
    "memo",
    "message",
    "note",
    "reference",
    "snippet",
    "subject",
    "summary",
    "text",
    "value",
    "value_text",
  ]),
  labelFields: new Set([
    "display_value",
    "display_number",
    "file_name",
    "filename",
    "identifier",
    "name",
    "number",
    "summary",
    "title",
  ]),
  matterLabelFields: new Set(["display_number", "number"]),
  safeIdentityObjectKeys: new Set([
    "author",
    "user",
    "assignee",
    "assigner",
    "calendar_owner",
    "created_by",
    "creator",
    "responsible_attorney",
    "responsible_staff",
    "originating_attorney",
    "updated_by",
  ]),
  safeIdentityResource: false,
};

const RESOURCE_POLICY_OVERRIDES = {
  "calendar-entry": {
    freeTextFields: new Set(["summary", "location"]),
    labelFields: new Set(["summary"]),
  },
  "billable-client": {
    contactLikeResource: true,
  },
  communication: {
    freeTextFields: new Set(["body", "content", "detail", "message"]),
  },
  contact: {
    contactLikeResource: true,
  },
  conversation: {
    freeTextFields: new Set(["body", "content", "message", "snippet"]),
  },
  "conversation-message": {
    freeTextFields: new Set(["body", "content", "message", "text"]),
  },
  "custom-field": {
    freeTextFields: new Set(["value", "display_value", "value_text", "field_value"]),
    labelFields: new Set(["name", "title"]),
  },
  document: {
    freeTextFields: new Set(["name", "summary"]),
    labelFields: new Set(["file_name", "filename", "name", "title"]),
  },
  note: {
    freeTextFields: new Set(["detail", "message", "text"]),
  },
  user: {
    safeIdentityResource: true,
  },
};

function getRedactionPolicy(resourceType) {
  const overrides = RESOURCE_POLICY_OVERRIDES[resourceType] || {};

  return {
    ...DEFAULT_POLICY,
    ...overrides,
    ...SET_KEYS.reduce((merged, key) => {
      merged[key] = new Set([
        ...(DEFAULT_POLICY[key] || []),
        ...(overrides[key] || []),
      ]);
      return merged;
    }, {}),
  };
}

module.exports = {
  getRedactionPolicy,
};
