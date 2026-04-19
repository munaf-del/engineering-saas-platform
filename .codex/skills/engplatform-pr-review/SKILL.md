# engplatform-pr-review

Repo-local skill spec for reviewing EngPlatform PRs and diffs.

## Use When

- asked to review a PR or local diff
- acting as the dedicated `pr-review` lane
- checking whether a change crosses lanes, weakens safeguards, or misses tests

## Read First

- [AGENTS.md](../../../AGENTS.md)
- [docs/architecture/repo-map.md](../../../docs/architecture/repo-map.md)
- [docs/agent-lanes.md](../../../docs/agent-lanes.md)
- touched ADRs and module docs for the diff under review

## Review Order

1. Tenancy and access control
2. Calc determinism and contract alignment
3. Reporting, template versioning, and provenance
4. Source traceability and licensed-data handling
5. Tests, commands run, and unknowns called out by the PR

## Output Rules

- findings first, ordered by severity, with file references
- call out missing tests or missing review gates explicitly
- if no findings remain, say that clearly and list residual risks or unknowns

## Must Not

- approve risky changes because an ADR sounds stricter than the current code
- widen the review into a rewrite unless explicitly asked
- ignore support-matrix drift, tenant-scope assumptions, or source-traceability loss
