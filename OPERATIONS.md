# Operations, Continuity, and Incident Response

This project is a local-only CLI, so its operational profile is different from a hosted web service. The main continuity risks are compromised credentials, vulnerable dependencies, malicious releases, and package availability issues.

## Incident response

1. Triage the report or signal and confirm the affected versions, platforms, and attack path.
2. Contain the issue by recommending immediate mitigations when available, such as revoking Clio tokens, rotating app credentials, or pausing a workflow.
3. Fix and verify the issue in source control, including tests for reproducible defects where practical.
4. Release an updated package through the GitHub Actions release workflow so npm provenance remains attached to the published artifact.
5. Publish follow-up guidance in repository documentation or release notes when users need to take action.

Security-sensitive reports should follow the private reporting process in `SECURITY.md` rather than public issues.

## Business continuity and disaster recovery

- Source of truth: the GitHub repository is the canonical source for code, workflows, and documentation.
- Package distribution: npm is used for package distribution. If npm publication is unavailable, users can continue to run the tool from a local checkout.
- Credentials and tokens: app credentials and OAuth tokens are stored in the local OS keychain rather than in a hosted project database.
- Customer data: the project does not operate a hosted datastore for Clio matter, billing, contact, or task records for this CLI.
- Recovery approach: if a published release is found to be defective, publish a corrected version and direct users to re-authenticate or revoke tokens if exposure is suspected.

## User actions during a security incident

- Revoke the current Clio token with `not-manage auth revoke` if credential misuse is suspected.
- Re-run `not-manage auth login` after the fix is installed to establish a fresh token set.
- Review shell history, exported JSON, screenshots, and copied terminal output if sensitive data may have been shared.

## Certifications

- No SOC 2, ISO 27001, PCI DSS, or similar certification is currently claimed for this project.
- If certifications are added in the future, this document should be updated with the public details.
