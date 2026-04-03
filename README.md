# not-manage

`not-manage` is an unofficial command-line tool for Clio Manage integrations and AI workflows.

This project is a terminal CLI from [Not Operations](https://notoperations.com/legal). It is not a Clio product, and it is not affiliated with, endorsed by, or sponsored by Clio or Themis Solutions Inc.

## Package

- npm package: `not-manage`
- command: `not-manage`
- type: terminal command-line tool

## Install

```bash
npm i -g not-manage && not-manage
```

The package does not run install-time scripts. `not-manage` opens in help-first mode so you can inspect commands before changing local state.

What happens next:

- first-time setup: run `not-manage auth setup` or `not-manage setup` when you are ready
- returning setup: `not-manage` opens command help and you can verify the saved connection explicitly
- setup warning: the CLI reminds you that output may contain confidential client data and that redaction is best-effort only

Network behavior:

- the CLI uses HTTPS requests to Clio API/auth hosts for your selected region (`app.clio.com`, `ca.app.clio.com`, `eu.app.clio.com`, or `au.app.clio.com`)
- during OAuth login it also accepts a local loopback callback on `127.0.0.1`

You can also run the command separately after install:

```bash
not-manage
```

or:

```bash
not-manage setup
```


For local development:

```bash
git clone https://github.com/Not-Operations/not-manage.git
cd not-manage
npm install
npm run hooks:install
node bin/not-manage.js --help
```

## 5-minute setup

1. Run setup:

```bash
not-manage auth setup
```

2. Choose your Clio region in the CLI, or pass it directly with `--region`.
3. When the CLI opens the Clio developer portal, sign in there.
4. Open your Clio developer app there, or create one first if you do not have one yet.
5. Fill out the Clio app form:
   - `Website URL`: use your firm site, company site, or GitHub repo
   - do not put the loopback callback URL in `Website URL`
   - select only the Clio permissions your workflow will actually use through this tool
   - `Redirect URIs`: copy `http://127.0.0.1:53123/callback`
6. Copy the App Key and App Secret from that same Clio app back into the CLI.
7. Finish login:

```bash
not-manage auth login
```

8. Verify:

```bash
not-manage auth status
not-manage whoami
```

During setup, the CLI asks you to acknowledge that:

- command output can contain confidential or privileged client information
- `--redacted` is best-effort only and may miss identifiers in labels, custom fields, or free text
- you must review output before sharing it with AI tools or other third parties

For non-interactive setup, pass the required values directly:

```bash
not-manage auth setup --confirm-confidentiality --region us --client-id <app-key> --client-secret <app-secret>
```

## Local-only docs

- [PRIVACY.md](PRIVACY.md)
- [DATA-HANDLING.md](DATA-HANDLING.md)
- [DISCLAIMER.md](DISCLAIMER.md)
- [SECURITY.md](SECURITY.md)
- [TERMS.md](TERMS.md)
- [OPERATIONS.md](OPERATIONS.md)
- [SUPPORT.md](SUPPORT.md)
- [CUSTOMER-TESTING.md](CUSTOMER-TESTING.md)
- [SUBPROCESSORS.md](SUBPROCESSORS.md)
- [MVSP-SELF-ASSESSMENT.md](MVSP-SELF-ASSESSMENT.md)
- [CLIO-APP-DIRECTORY-CHECKLIST.md](CLIO-APP-DIRECTORY-CHECKLIST.md)

## Core commands

```bash
not-manage setup
not-manage auth setup
not-manage auth login
not-manage auth status
not-manage whoami
not-manage auth revoke --dry-run
not-manage auth revoke --yes
```

## Resource command reference

<!-- GENERATED:CLI_REFERENCE:start -->
This table is generated from resource metadata. Global auth/setup commands stay hand-written.

| Command | Operations | Aliases | Required list filters |
| --- | --- | --- | --- |
| `activities` | `list`, `get` | `activity` | - |
| `calendar-entries` | `list`, `get` | `calendar-entry` | - |
| `reminders` | `list`, `get` | `reminder` | - |
| `tasks` | `list`, `get` | `task` | - |
| `contacts` | `list`, `get` | `contact` | - |
| `communications` | `list`, `get` | `communication` | - |
| `conversations` | `list`, `get` | `conversation` | - |
| `conversation-messages` | `list`, `get` | `conversation-message` | `--conversation-id` |
| `notes` | `list`, `get` | `note` | `--type` |
| `custom-fields` | `list`, `get` | `custom-field` | - |
| `time-entries` | `list`, `get` | `time-entry` | - |
| `billable-clients` | `list` | `billable-client` | - |
| `billable-matters` | `list` | `billable-matter` | - |
| `bills` | `list`, `get` | `bill` | - |
| `invoices` | `list`, `get` | `invoice` | - |
| `outstanding-client-balances` | `list` | `outstanding-client-balance` | - |
| `matters` | `list`, `get` | `matter` | - |
| `matter-dockets` | `list`, `get` | `matter-docket` | - |
| `users` | `list`, `get` | `user` | - |
| `practice-areas` | `list`, `get` | `practice-area` | - |
| `my-events` | `list` | `my-event` | - |

Required list filters are enforced by the CLI before it calls Clio.
<!-- GENERATED:CLI_REFERENCE:end -->

Plural commands still work. Singular aliases are accepted for the single-record flows so `contact get 12345` and `contacts get 12345` both work.

Every data command also accepts `--fields <comma-separated-list>` to override the default response shape. If you pass `--fields` with no value, the CLI prints the current default field list for that command.

## Live smoke checks

In a local checkout, if you already have an authenticated test account, you can run a safe read-only smoke pass:

```bash
npm run smoke:live
```

This exercises a small set of real CLI reads against the currently authenticated Clio account:

- `auth status`
- `whoami`
- `users list`
- `notes list --type Matter`
- `outstanding-client-balances list`
- `calendar-entries list`

## Read-only examples

```bash
not-manage activities list --status unbilled --matter-id 456
not-manage activities list --client-id 999 --all
not-manage activity get 123
not-manage time-entries list --user-id 88 --start-date 2026-03-01

not-manage tasks list
not-manage tasks list --matter-id 456
not-manage tasks list --client-id 999 --complete false
not-manage task get 789

not-manage contacts list --query "acme" --client-only
not-manage contact get 12345

not-manage matters list --status open --client-id 999
not-manage matters list --fields
not-manage matter get 456

not-manage bills list --overdue-only --client-id 999
not-manage bills list --matter-id 456
not-manage bill get 987
not-manage invoices list --state awaiting_payment
not-manage invoices list --matter-id 456
not-manage invoice get 987

not-manage users list --name "Sarah"
not-manage user get 123

not-manage practice-areas list --name "Family"
not-manage practice-areas list --matter-id 456
not-manage practice-area get 45

not-manage calendar-entries list --from 2026-03-01T00:00:00Z --to 2026-03-31T23:59:59Z
not-manage reminders list --state pending
not-manage notes list --type Matter --limit 25
not-manage conversation-messages list --conversation-id 123
not-manage outstanding-client-balances list --limit 25
not-manage matter-dockets list --matter-id 456
not-manage my-events list --limit 25

not-manage billable-matters list --client-id 999
not-manage billable-clients list --start-date 2026-03-01
not-manage matter get 456 --redacted
```

## Redacted mode

- Supported data commands are redacted by default.
- Add `--unredacted` to show raw output.
- `--redacted` is still accepted for compatibility.
- Redaction covers:
  - client/contact names (full names, individual first and last names), emails, and phone numbers from structured fields
  - pattern-based detection of emails, phone numbers, SSNs (dash and space-separated), tax IDs, and credit card numbers (standard 16-digit and American Express 15-digit formats) in all string fields
  - person client surnames derived from matter labels and used to redact matter numbers, file names, and summaries
  - significant tokens from company client names (filtering out noise like LLC, Inc, Corp) used to redact matter labels
  - heuristic detection of bare 2-3 word person names in free-text and label fields
- Internal staff fields such as `user`, `responsible_attorney`, `responsible_staff`, and `originating_attorney` remain visible.
- API error messages sanitize URLs to prevent leaking query parameters that may contain PII.
- Redaction is best-effort only. Review output before sharing it outside your firm or with any AI or third-party service.
- High-risk commands such as contacts, matters, activities, bills, invoices, tasks, and billable client or matter views emit additional review warnings.
- `--unredacted` on those high-risk commands emits a stronger warning because raw output may include client-identifying, confidential, or privileged information.

## Security model

- Default storage is OS keychain (`macOS Keychain`, `Windows Credential Manager`, `Linux Secret Service`).
- Setup masks the App Secret when you type it in the terminal.
- Local OAuth redirects are restricted to loopback HTTP callbacks such as `http://127.0.0.1:53123/callback`.
- API pagination links are validated before the CLI sends a bearer token to them.
- This CLI requires a working OS keychain for Clio app credentials and OAuth tokens.
- Tokens are never written to plaintext files by default.
- Command output can contain sensitive client and matter data, so avoid shell logging, screen sharing, or pasting raw output into tickets and chats.
- This CLI does not guarantee privilege-safe or de-identified output. Your firm still needs its own review process, approved vendors, and legal/privacy sign-off where required.

## Repository hardening

- GitHub Actions runs CI on pull requests and default-branch pushes across supported Node versions.
- Dependency Review blocks high-severity dependency additions in pull requests.
- CodeQL runs on pull requests, default-branch pushes, and a weekly schedule.
- Semgrep Community Edition runs on pull requests, default-branch pushes, and a weekly schedule for JavaScript-focused static security scanning.
- Dependabot is configured for both npm dependencies and GitHub Actions.
- npm release publishing is set up for provenance-backed trusted publishing from GitHub Actions using the `npm` environment.

## Support

- Public support page: [SUPPORT.md](SUPPORT.md)
- Public support contact: `hello@notoperations.com`
- Bug reports and feature requests: `https://github.com/Not-Operations/not-manage/issues`
- Security reports: see [SECURITY.md](SECURITY.md)

## Troubleshooting

- `OS keychain ... failed`: re-enable your OS keychain service or run the CLI in a supported desktop session with keychain access.
- `Redirect URI must use ... loopback ...`: this CLI only supports local loopback OAuth callbacks. Use `http://127.0.0.1:<port>/callback` or `http://localhost:<port>/callback`.
- `403 Forbidden`: confirm your Clio app has the relevant Clio permissions for Contacts, Matters, Bills, Users, or Practice Areas, then re-authorize.
- `401 Unauthorized`: run `not-manage auth login` again.

## Contributing

Contributions are accepted under `Apache-2.0`. This project uses a Developer Certificate of Origin instead of a CLA, so sign commits with `git commit -s`.

See `CONTRIBUTING.md` for the workflow and `DCO` for the certificate text.

## License

Licensed under `Apache-2.0`. See `LICENSE` and `NOTICE`.

## Trademark notice

Clio is a trademark of Themis Solutions Inc. `not-manage` is an independent command-line tool from Not Operations and is not affiliated with, endorsed by, or sponsored by Clio or Themis Solutions Inc.

## Security

Please do not post vulnerabilities, OAuth credentials, tokens, or real client data in public issues. See `SECURITY.md`.
