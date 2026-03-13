# Contributing

Thanks for contributing to `not-manage`.

## Rights and licensing

- This project is licensed under `Apache-2.0`.
- You retain copyright to your contributions.
- By submitting a contribution, you license it to the project under `Apache-2.0`.
- This project does not require a CLA.
- Every commit must include a Developer Certificate of Origin sign-off.

## DCO sign-off

Use Git's sign-off flag when you commit:

```bash
git commit -s
```

That adds a line like this to your commit message:

```text
Signed-off-by: Your Name <you@example.com>
```

The full certificate text is in `DCO`.

## Development

```bash
npm install
npm run check
```

## Pull requests

- Keep changes focused.
- Add or update tests when behavior changes.
- Do not include real client data, real tokens, or secrets in code, fixtures, screenshots, or issue threads.
- For security-sensitive issues, follow `SECURITY.md` instead of opening a public issue with full details.
- Pull requests should pass `CI`, `Dependency Review`, and `CodeQL` before merge.
