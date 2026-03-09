const SERVICE_NAME = "com.notoperations.clio-manage-cli";
const DEFAULT_REGION = "us";
const DEFAULT_REDIRECT_URI = "http://127.0.0.1:53123/callback";
const OAUTH_TIMEOUT_MS = 5 * 60 * 1000;
const CLIO_APP_CREATION_GUIDE_URL =
  "https://docs.developers.clio.com/api-docs/clio-manage/applications/";
const CLIO_AUTHORIZATION_GUIDE_URL =
  "https://docs.developers.clio.com/api-docs/clio-manage/authorization/";
const CLIO_DEVELOPER_ACCOUNT_GUIDE_URL =
  "https://docs.developers.clio.com/handbook/getting-started/get-a-developer-account/";

const REGIONS = {
  us: {
    code: "us",
    label: "United States",
    host: "app.clio.com",
  },
  ca: {
    code: "ca",
    label: "Canada",
    host: "ca.app.clio.com",
  },
  eu: {
    code: "eu",
    label: "Europe",
    host: "eu.app.clio.com",
  },
  au: {
    code: "au",
    label: "Australia",
    host: "au.app.clio.com",
  },
};

module.exports = {
  SERVICE_NAME,
  DEFAULT_REGION,
  DEFAULT_REDIRECT_URI,
  OAUTH_TIMEOUT_MS,
  CLIO_APP_CREATION_GUIDE_URL,
  CLIO_AUTHORIZATION_GUIDE_URL,
  CLIO_DEVELOPER_ACCOUNT_GUIDE_URL,
  REGIONS,
};
