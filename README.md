# @notoperations/clio-manage-cli

Local-first CLI for Clio Manage integrations and AI workflows.

## Package

- npm package: `@notoperations/clio-manage-cli`
- binary: `clio-manage`

## Install

```bash
npm i -g @notoperations/clio-manage-cli
clio-manage
```

On first run, `clio-manage` starts a guided setup flow and opens the official Clio app creation guide so you can copy the `Client ID` and `Client Secret`.

For local development:

```bash
git clone https://github.com/Not-Operations/clio-cli.git
cd clio-cli
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
clio-manage contacts list
clio-manage contacts get 12345
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
clio-manage practice-areas get 45
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
