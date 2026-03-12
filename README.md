# clio-manage

`clio-manage` is an unofficial command-line tool for Clio Manage integrations and AI workflows.

This project is a terminal CLI from Not Operations. It is not a Clio product, and it is not affiliated with, endorsed by, or sponsored by Clio or Themis Solutions Inc.

## Package

- npm package: `clio-manage`
- command: `clio-manage`
- type: terminal command-line tool

## Install

```bash
npm i -g clio-manage && clio-manage
```

This is the recommended install flow because npm does not always show postinstall output consistently.

What happens next:

- first-time setup: `clio-manage` starts guided setup
- returning setup: `clio-manage` opens normally and can verify the saved connection

You can also run the command separately after install:

```bash
clio-manage
```

or:

```bash
clio-manage setup
```

To suppress the install-time prompt entirely:

```bash
CLIO_MANAGE_SKIP_POSTINSTALL_SETUP=1 npm i -g clio-manage && clio-manage
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
2. Fill out the Clio app form:
   - `Website URL`: use your firm site, company site, or GitHub repo
   - do not put the loopback callback URL in `Website URL`
3. Add redirect URI in `Redirect URIs` in your Clio app:
   - `http://127.0.0.1:53123/callback`
4. Run setup + login:

```bash
clio-manage setup
```

5. Verify:

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
clio-manage invoices list --state awaiting_payment

clio-manage users list --name "Sarah"
clio-manage users get 123

clio-manage practice-areas list --name "Family"
clio-manage practice-areas list --matter-id 456
clio-manage practice-areas get 45

clio-manage billable-matters list --client-id 999
clio-manage billable-clients list --start-date 2026-03-01
clio-manage matters get 456 --redacted
```

## Redacted mode

- Add `--redacted` to supported data commands to mask client/contact PII in terminal and JSON output.
- The first version redacts client/contact names, emails, phone numbers, and common PII patterns that appear inside free-text fields such as matter descriptions, activity notes, bill memos, and bill subjects.
- Internal staff fields such as `user`, `responsible_attorney`, `responsible_staff`, and `originating_attorney` remain visible.

## Security model

- Default storage is OS keychain (`macOS Keychain`, `Windows Credential Manager`, `Linux Secret Service`).
- Setup masks the App Secret when you type it in the terminal.
- Local OAuth redirects are restricted to loopback HTTP callbacks such as `http://127.0.0.1:53123/callback`.
- API pagination links are validated before the CLI sends a bearer token to them.
- `CLIO_*` env vars are supported for power users and automation, but are less safe than the OS keychain on shared or monitored machines.
- Tokens are never written to plaintext files by default.
- Command output can contain sensitive client and matter data, so avoid shell logging, screen sharing, or pasting raw output into tickets and chats.

## Repository hardening

- GitHub Actions runs CI on pull requests and default-branch pushes across supported Node versions.
- Dependency Review blocks high-severity dependency additions in pull requests.
- CodeQL runs on pull requests, default-branch pushes, and a weekly schedule.
- Dependabot is configured for both npm dependencies and GitHub Actions.
- npm release publishing is set up for provenance-backed trusted publishing from GitHub Actions using the `npm` environment.

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
- `Redirect URI must use ... loopback ...`: this CLI only supports local loopback OAuth callbacks. Use `http://127.0.0.1:<port>/callback` or `http://localhost:<port>/callback`.
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
