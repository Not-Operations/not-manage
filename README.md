# @notoperations/clio-manage-cli

Local-first CLI for Clio Manage integrations and AI workflows.

## Package

- npm package: `@notoperations/clio-manage-cli`
- binary: `clio-manage`

## Install

```bash
npm install
```

## Commands

```bash
node bin/clio-manage.js --help
node bin/clio-manage.js auth setup
node bin/clio-manage.js auth login
node bin/clio-manage.js auth status
node bin/clio-manage.js whoami
node bin/clio-manage.js auth revoke
```

## Security model

- Default storage is OS keychain (`macOS Keychain`, `Windows Credential Manager`, `Linux Secret Service`).
- `CLIO_*` env vars are supported for power users and automation.
- Tokens are never written to plaintext files by default.

## Setup (BYOC: bring your own Clio app)

1. Create Clio app credentials in your region:
   - https://docs.developers.clio.com/api-docs/clio-manage/applications/
2. Add redirect URI in your Clio app (default): `http://127.0.0.1:53123/callback`
3. Run `clio-manage auth setup` and enter:
   - region: `us`, `ca`, `eu`, or `au`
   - `client_id`
   - `client_secret`
   - redirect URI
4. Run `clio-manage auth login` to connect.

## Env vars (optional)

- `CLIO_REGION`
- `CLIO_CLIENT_ID`
- `CLIO_CLIENT_SECRET`
- `CLIO_REDIRECT_URI`
- `CLIO_ACCESS_TOKEN`
- `CLIO_REFRESH_TOKEN`
- `CLIO_EXPIRES_AT` (unix seconds)
