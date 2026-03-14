const { activitiesGet, activitiesList } = require("./commands-activities");
const { billableClientsList } = require("./commands-billable-clients");
const { billableMattersList } = require("./commands-billable-matters");
const { billsGet, billsList } = require("./commands-bills");
const { contactsGet, contactsList } = require("./commands-contacts");
const { mattersGet, mattersList } = require("./commands-matters");
const { practiceAreasGet, practiceAreasList } = require("./commands-practice-areas");
const { tasksGet, tasksList } = require("./commands-tasks");
const { usersGet, usersList } = require("./commands-users");

const RESOURCE_HANDLERS = {
  activities: {
    get: activitiesGet,
    list: activitiesList,
  },
  "billable-clients": {
    list: billableClientsList,
  },
  "billable-matters": {
    list: billableMattersList,
  },
  bills: {
    get: billsGet,
    list: billsList,
  },
  contacts: {
    get: contactsGet,
    list: contactsList,
  },
  matters: {
    get: mattersGet,
    list: mattersList,
  },
  "practice-areas": {
    get: practiceAreasGet,
    list: practiceAreasList,
  },
  tasks: {
    get: tasksGet,
    list: tasksList,
  },
  users: {
    get: usersGet,
    list: usersList,
  },
};

function getResourceHandler(resourceMetadata, subcommand) {
  if (!resourceMetadata) {
    return null;
  }

  return RESOURCE_HANDLERS[resourceMetadata.handlerKey]?.[subcommand] || null;
}

module.exports = {
  RESOURCE_HANDLERS,
  getResourceHandler,
};
