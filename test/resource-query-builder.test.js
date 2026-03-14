const test = require("node:test");
const assert = require("node:assert/strict");

const { buildListQueryFromResource } = require("../src/resource-query-builder");
const { getResourceMetadata } = require("../src/resource-metadata");

test("resource query builder maps array filters for calendar entries", () => {
  const query = buildListQueryFromResource(
    getResourceMetadata("calendar-entries"),
    {
      from: "2026-03-01T00:00:00Z",
      ids: ["1", "2"],
      limit: "25",
      visible: false,
    },
    getResourceMetadata("calendar-entries").listQuery
  );

  assert.deepStrictEqual(query, {
    fields:
      "id,summary,description,location,start_at,start_date,start_time,end_at,end_date,end_time,all_day,recurrence_rule,court_rule,permission,created_at,updated_at,calendar_owner{id,name,type,source,visible},matter{id,display_number,number,description,client},matter_docket{id,name,status},calendar_entry_event_type{id,name},attendees{id,name,type,email},calendars{id,name,type,source,visible},reminders{id,duration,next_delivery_at,state}",
    from: "2026-03-01T00:00:00Z",
    "ids[]": ["1", "2"],
    limit: 25,
    visible: false,
  });
});

test("resource query builder enforces required conversation id", () => {
  const metadata = getResourceMetadata("conversation-messages");

  assert.throws(
    () => buildListQueryFromResource(metadata, {}, metadata.listQuery),
    /requires `--conversation-id`/
  );
});

test("resource query builder normalizes note types", () => {
  const metadata = getResourceMetadata("notes");

  const query = buildListQueryFromResource(
    metadata,
    {
      limit: "10",
      type: "matter",
    },
    metadata.listQuery
  );

  assert.deepStrictEqual(query, {
    fields:
      "id,type,subject,detail,detail_text_type,date,created_at,updated_at,time_entries_count,matter{id,display_number,number,description,client},contact{id,name,first_name,last_name},author{id,name,email}",
    limit: 10,
    type: "Matter",
  });

  assert.throws(
    () =>
      buildListQueryFromResource(
        metadata,
        {
          type: "Note",
        },
        metadata.listQuery
      ),
    /must be `Matter` or `Contact`/
  );
});

test("resource query builder normalizes bill status filters for generic bill handlers", () => {
  const metadata = getResourceMetadata("bills");

  const query = buildListQueryFromResource(
    metadata,
    {
      limit: "5",
      status: "unpaid",
    },
    metadata.listQuery
  );

  assert.deepStrictEqual(query, {
    fields:
      "id,number,state,type,kind,subject,memo,issued_at,due_at,paid,paid_at,pending,due,total,balance,created_at,updated_at,client{id,name,first_name,last_name},matters{id,display_number,number,description}",
    limit: 5,
    state: "awaiting_payment",
  });

  assert.throws(
    () =>
      buildListQueryFromResource(
        metadata,
        {
          status: "open",
        },
        metadata.listQuery
      ),
    /Use `all`, `overdue`, or `unpaid`/
  );
});
