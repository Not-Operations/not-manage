# Data Handling

This CLI is intended to minimize data movement, not eliminate risk.

## Normal flow

1. The user runs the CLI locally.
2. The CLI calls Clio directly.
3. The response is rendered locally in the terminal or JSON output.

## Sensitive data handling

- High-risk commands can return client-identifying, confidential, or privileged information.
- Redaction reduces risk but is best-effort only.
- Raw output can still expose names, matter labels, captions, custom fields, or other identifying details.

### Redaction layers

1. **Structured field replacement**: contact-like resource fields (names, emails, phone numbers) are replaced with placeholders. Individual first and last name parts are also collected so lone occurrences in free text are caught.
2. **Pattern-based PII detection**: emails, phone numbers, SSNs (dash and space-separated), tax IDs, and credit card numbers (16-digit and Amex 15-digit) are detected and replaced in all string fields.
3. **Client-derived label replacement**: person client surnames and significant tokens from company client names are extracted and used to redact matter numbers, file names, summaries, and other label fields.
4. **Heuristic bare-name detection**: capitalized 2-3 word sequences resembling person names are redacted in free-text and label fields, excluding known staff identities and common legal terms.
5. **Error message sanitization**: API error messages strip URL query parameters to prevent leaking PII that may appear in request URLs.

## Storage

- App credentials and OAuth tokens are stored in the OS keychain.
- The CLI does not write plaintext tokens to local config files by default.

## Regions and providers

- Clio data is processed locally on the user's machine and transmitted directly to the configured Clio region host.
- The project does not operate a hosted application server or database for this CLI.
- Repository hosting and CI are provided through GitHub, and package distribution is provided through npm. These services are not intended to receive Clio data during normal CLI usage.

## Safer use

- Prefer the default redacted output on high-risk commands.
- Use `--unredacted` only when the workflow actually requires raw data.
- Re-check output before sharing it with AI tools, tickets, chat, or email.
