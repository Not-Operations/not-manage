# Privacy

`not-manage` is designed to run locally on the user's device.

## Local-only model

- The CLI talks directly to Clio from the local machine.
- Not Operations does not operate a hosted service that stores Clio matter, contact, billing, or task data for this CLI.
- OAuth credentials and tokens are stored in the local OS keychain.

## What can leave the device

- Requests sent directly to Clio during normal CLI use.
- Anything the user explicitly copies, pastes, exports, screenshots, or sends to another tool.

## Regions and service providers

- Clio API traffic goes directly from the user's machine to the Clio region they selected during setup: United States, Canada, Europe, or Australia.
- In normal CLI operation, Not Operations does not run a backend that stores or re-processes Clio matter, contact, billing, or task data for this tool.
- GitHub is used for source hosting and CI for the repository. npm is used for package distribution. Neither service is part of the normal runtime data path for Clio API responses unless a user manually uploads data there.
- Users remain responsible for confirming that their chosen Clio region, local environment, and any downstream vendors satisfy their firm's residency and privacy requirements.

## What this project does not claim

- It does not guarantee de-identification.
- It does not guarantee privilege-safe output.
- It does not decide whether a downstream AI tool or vendor is approved for a user's firm.

## User responsibility

- Review output before sharing it outside the firm.
- Use only vendors, workflows, and policies the firm has approved.
- Avoid sharing raw or `--unredacted` output unless there is a clear need and permission to do so.

## Public certifications

- This project does not currently claim SOC 2, ISO 27001, PCI DSS, TRUSTe, or similar third-party security or privacy certifications.
