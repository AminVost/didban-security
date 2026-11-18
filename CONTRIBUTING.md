# Contributing to Didban Security

Thanks for helping improve a security workflow that emphasizes verifiable evidence rather than invented certainty.

## Local development

```bash
git clone https://github.com/AminVost/didban-security.git
cd didban-security
python3 -m http.server 4173
```

Open `http://localhost:4173`. There is no installation or bundling step.

## Quality checks

```bash
npm test
npm run check
```

Before opening a pull request:

1. Keep all interface copy and documentation in clear international English.
2. Retain an accessible, responsive experience and verify both light and dark appearances.
3. Cover security-score, validation, importer and closure-rule changes with regression tests.
4. Never invent vulnerability facts, GitHub scan results, execution results or risk acceptance.
5. Do not add telemetry, credentials, background network calls or code execution without an explicit security and privacy design review.
6. Do not break version-1 JSON backups without a documented migration path.
7. Explain user-visible changes and include reproduction steps for bug fixes.

Please use GitHub issues for feature requests and normal bugs. For security-sensitive findings, follow [SECURITY.md](./SECURITY.md).
