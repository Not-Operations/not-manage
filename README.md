# clio-manage

`clio-manage` is an unofficial command-line tool for Clio Manage integrations and AI workflows.

This project is a terminal CLI from Not Operations. It is not a Clio product, and it is not affiliated with, endorsed by, or sponsored by Clio or Themis Solutions Inc.

## Package

- npm package: `clio-manage`
- command: `clio-manage`
- type: terminal command-line tool

## Install

```bash
npm i -g clio-manage
```

On a fresh interactive global install, the package offers guided setup immediately from `npm install`.
If you skip that prompt, run:

```bash
clio-manage
```

or:

```bash
clio-manage setup
```

To suppress the install-time prompt entirely:

```bash
CLIO_MANAGE_SKIP_POSTINSTALL_SETUP=1 npm i -g clio-manage
```

For local development:

```bash
git clone https://github.com/Not-Operations/clio-manage.git
cd clio-manage
npm install
node bin/clio-manage.js --help
```

## 5-minute setup

1. Create Clio app credentials in your region:
   - https://docs.developers.clio.com/api-docs/clio-manage/applications/
   - if you do not have developer access yet: https://docs.developers.clio.com/handbook/getting-started/get-a-developer-account/
2. Add redirect URI in your Clio app:
   - `http://127.0.0.1:53123/callback`
3. Run setup + login:

```bash
clio-manage setup
```

4. Verify:

```bash
clio-manage auth status
clio-manage whoami
```

## Core commands

```bash
clio-manage setup
clio-manage auth setup
clio-manage auth login
clio-manage auth status
clio-manage activities list
clio-manage activities get 123
clio-manage contacts list
clio-manage contacts get 12345
clio-manage time-entries list
clio-manage billable-clients list
clio-manage billable-matters list
clio-manage bills list
clio-manage bills get 987
clio-manage invoices list
clio-manage matters list
clio-manage matters get 456
clio-manage users list
clio-manage users get 123
clio-manage practice-areas list
clio-manage practice-areas get 45
clio-manage matters list --status open --limit 50
clio-manage matters list --all --json
clio-manage whoami
clio-manage auth revoke
```

## Read-only examples

```bash
clio-manage activities list --status unbilled --matter-id 456
clio-manage activities get 123
clio-manage time-entries list --user-id 88 --start-date 2026-03-01

clio-manage contacts list --query "acme" --client-only
clio-manage contacts get 12345

clio-manage matters list --status open --client-id 999
clio-manage matters get 456

clio-manage bills list --overdue-only --client-id 999
clio-manage bills get 987
clio-manage invoices list --status unpaid

clio-manage users list --name "Sarah"
clio-manage users get 123

clio-manage practice-areas list --name "Family"
clio-manage practice-areas list --matter-id 456
clio-manage practice-areas get 45

clio-manage billable-matters list --client-id 999
clio-manage billable-clients list --start-date 2026-03-01
```

## Security model

- Default storage is OS keychain (`macOS Keychain`, `Windows Credential Manager`, `Linux Secret Service`).
- `CLIO_*` env vars are supported for power users and automation.
- Tokens are never written to plaintext files by default.

## Env vars (optional)

- `CLIO_REGION`
- `CLIO_CLIENT_ID`
- `CLIO_CLIENT_SECRET`
- `CLIO_REDIRECT_URI`
- `CLIO_ACCESS_TOKEN`
- `CLIO_REFRESH_TOKEN`
- `CLIO_EXPIRES_AT` (unix seconds)

## Troubleshooting

- `OS keychain ... failed`: run with `CLIO_*` env vars as fallback, or re-enable your OS keychain service.
- `403 Forbidden`: confirm your Clio app has the relevant Clio permissions for Contacts, Matters, Bills, Users, or Practice Areas, then re-authorize.
- `401 Unauthorized`: run `clio-manage auth login` again.

## Contributing

Contributions are accepted under `Apache-2.0`. This project uses a Developer Certificate of Origin instead of a CLA, so sign commits with `git commit -s`.

See `CONTRIBUTING.md` for the workflow and `DCO` for the certificate text.

## License

Licensed under `Apache-2.0`. See `LICENSE` and `NOTICE`.

## Trademark notice

Clio is a trademark of Themis Solutions Inc. `clio-manage` is an independent command-line tool from Not Operations and is not affiliated with, endorsed by, or sponsored by Clio or Themis Solutions Inc.

## Security

Please do not post vulnerabilities, OAuth credentials, tokens, or real client data in public issues. See `SECURITY.md`.
