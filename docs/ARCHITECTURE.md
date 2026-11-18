# Architecture and limitations

**Edition:** English, local-first, 2026.

## Runtime

- Standards-based HTML, CSS and JavaScript modules. No framework, package dependencies, server or build pipeline is necessary.
- All views are rendered by `src/app.js` with event delegation and HTML text escaping.
- Pure domain functions in `src/core.js` implement severity/priority, shared-dependency grouping, readiness, closure, backup, and Dependabot validation.
- Inline SVG icons in `src/icons.js`; the design uses a responsive system font stack with no remote font dependency.
- JSON schema uses `{ version: 1, repositories: [], alerts: [], history: [] }` for compatibility with earlier Didban releases.
- English data is stored separately from the Persian edition under `didban-security-en-v1`.

## Workflow invariants

1. No fabricated advisories or sources are created in the real workspace. Sample data is explicitly fictional.
2. GitHub links must be HTTPS and hosted by `github.com`.
3. Confirmed code usage requires human-entered evidence and a review date.
4. The calculated urgency score is a deterministic internal heuristic, not CVSS.
5. Plan readiness requires a safe version, commands, approval, known compatibility risk, rollback, tests and no blockers.
6. Resolving requires readiness and at least one passing test.
7. Risk acceptance requires reviewer and rationale, but is never presented as a technical fix.
8. JSON restore is validated and requires confirmation. GitHub import is previewed before it creates local records.
9. No command text is executed by Didban; all statuses and test results are human-recorded.

## Intentional trade-offs

- **No multi-user service:** browser storage does not synchronize across devices, URLs or profiles; no server-side access control exists.
- **No tamper-proof evidence:** local history records are editable with browser developer tools.
- **No GitHub write integration:** importing alert JSON is a manual, read-only operation. Closing an alert here does not close it on GitHub.
- **Only npm import normalization:** other ecosystems require domain-specific validation; they are skipped, not misidentified as npm.
- **No remote vulnerability assessment:** sources are recorded as supplied, not independently verified.
- **Import is intentionally conservative:** duplicate advisory numbers per repository, invalid URLs and malformed records are skipped.
- **Typography:** system fonts are used without third-party font requests.
- **Local export sensitivity:** backups include user-entered project names, notes and evidence. Review before sharing.

## Testing

`node --test tests/*.test.mjs` runs 12 domain regression tests with no external packages. Browser smoke checks verify onboarding, forms, evidence validation, plan readiness, test outcomes, closure, export, navigation, mobile overflow and theme toggling.

## Planned extensions (not implemented)

- GitHub App installation with least-privilege, reviewable read-only permissions.
- Optional encrypted, authenticated backend storage, organization workspaces and role-based access.
- CI-linked evidence and actual test run verification, not manually asserted results.
- Signed audit history, change approval policies and administrator-controlled retention.
- Enhanced software supply-chain metadata (e.g., SBOM inventory), SLA tracking and notifications.
