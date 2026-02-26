# @notoperations/clio-manage-cli

Local-first CLI for Clio Manage integrations and AI workflows.

## Package

- npm package: `@notoperations/clio-manage-cli`
- binary: `clio-manage`

## Install

```bash
npm i -g @notoperations/clio-manage-cli
clio-manage --help
```

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
clio-manage matters list
clio-manage matters list --status open --limit 50
clio-manage matters list --all --json
clio-manage whoami
clio-manage auth revoke
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
- `403 Forbidden`: confirm your Clio app has Matter read permission and re-authorize.
- `401 Unauthorized`: run `clio-manage auth login` again.
