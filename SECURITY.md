# Security policy

## Reporting vulnerabilities

Please **do not post proof-of-concept exploits, credentials, private project data, or security-sensitive details in public GitHub issues**.

Use the repository's **Security → Advisories → Report a vulnerability** option, if enabled. Otherwise, open a minimal public issue requesting a private reporting channel without disclosing sensitive technical details.

## What the project protects—and what it does not

Didban is a browser-local planning tool. It does not scan GitHub, execute npm commands, patch repositories, obtain GitHub tokens or verify whether a dependency is actually exploitable. It does not transmit recorded alerts to a Didban backend.

Browser localStorage is **not** secure storage for passwords, tokens, confidential advisories or sensitive internal projects. A user who controls the browser profile or a local extension can modify local records and activity history. The UI avoids automatic remote side effects, validates allowed HTTPS URLs, escapes user-visible strings, and protects against CSV formula interpretation.

No audit entry should be treated as tamper-proof evidence; no test outcome should be interpreted as independently verified.

## Supported versions

Only the latest commit on `main` is maintained. There is no security support promise for forks or modified deployments.
