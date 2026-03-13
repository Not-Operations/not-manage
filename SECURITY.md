# Security Policy

This CLI handles OAuth credentials and can access sensitive law-firm data. Treat security reports accordingly.

## Reporting a vulnerability

- Do not open a public issue with exploit details, credentials, tokens, or client data.
- If GitHub private vulnerability reporting is enabled for this repository, use it.
- Otherwise, contact the maintainers through the repository owner's public contact channel and request a private disclosure path before sharing technical details.

Include:

- affected version or commit
- reproduction steps
- impact
- suggested remediation if you have one

## Vulnerability management and patching workflow

1. Intake: acknowledge private reports, confirm whether the issue is in scope, and request any missing reproduction details.
2. Triage: classify the issue based on practical impact to confidentiality, integrity, or availability for local users and Clio-connected data.
3. Containment: where feasible, publish short-term mitigations immediately, such as revoking tokens, rotating credentials, or recommending a temporary workflow change.
4. Remediation: prepare the fix, add or update tests when the bug is reproducible in code, and verify the package contents before release.
5. Release and disclosure: publish a patched npm release from the GitHub Actions release workflow and share upgrade guidance once a fix or mitigation is available.

### Remediation targets

These are response targets for confirmed issues, not guarantees. The goal is to reduce exposure quickly while maintaining accurate fixes.

- Critical or high severity: begin mitigation immediately and target a fix or clearly documented mitigation within 7 calendar days.
- Medium severity: target a fix within 30 calendar days.
- Low severity: target a fix within 90 calendar days or the next planned maintenance release, whichever is sooner.

If a fix is not ready inside the target window, the maintainers should publish an interim mitigation or status update in the repository security materials.

## Sensitive data

- Never include real client records, billing data, matter data, access tokens, refresh tokens, or client secrets in issues or pull requests.
- Redact screenshots and command output before sharing them.

## Local-only security model

- The CLI is designed to run locally on the user's device.
- Clio data is fetched directly from Clio to the local machine.
- OAuth credentials and tokens are stored in the OS keychain.
- Redaction reduces risk but is best-effort only and must not be treated as a guarantee.

## Scope

Security issues include, for example:

- OAuth redirect or callback vulnerabilities
- token leakage or insecure token storage
- command output that exposes secrets or client data
- terminal prompts or logs that echo app secrets, access tokens, or refresh tokens
- pagination or follow-up requests that could leak bearer tokens to non-Clio hosts
- dependency or update paths that enable credential theft

## Repository controls

Maintain branch protection on the default branch so merges require the repository's CI verification, dependency review, CodeQL analysis, and Semgrep scan checks to pass.
For releases, publish through the GitHub Actions release workflow so npm provenance is attached to the package.
