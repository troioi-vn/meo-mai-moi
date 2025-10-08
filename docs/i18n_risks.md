# i18n Risk Register

Initial Version: 2025-10-07 (Update weekly)

| ID | Risk | Impact | Likelihood | Mitigation | Owner | Status |
|----|------|--------|------------|-----------|-------|--------|
| R1 | Translation storage strategy late pivot | High | Medium | Decide early (ADR-002), prototype minimal path | TBD | Open |
| R2 | Fallback order inconsistency (front vs back) | High | Medium | Shared spec + parity test fixtures | TBD | Open |
| R3 | Hardcoded strings missed in deep components | Medium | High | ESLint rule + extraction sprints + CI grep | TBD | Open |
| R4 | Email template localization regressions | High | Medium | Approval (golden) tests + diff review | TBD | Open |
| R5 | Notification language mismatch (race condition) | Medium | Low | Resolve locale before async dispatch; log locale in event | TBD | Open |
| R6 | Test flakiness slows CI as parallelism added | Medium | Medium | Flakiness scan + quarantine tag + retries on @flaky | TBD | Open |
| R7 | Mutation coverage reveals critical untested paths late | Medium | Medium | Early pilot on critical services | TBD | Open |
| R8 | Performance hit from translation lookups | Medium | Low | Cache layer + warm startup + measure lookup latency | TBD | Open |
| R9 | Orphan / stale translation keys bloat bundles | Low | Medium | Orphan key script + CI threshold | TBD | Open |
| R10 | Over-localizing (premature multi-field translation) | Medium | Medium | Limit MVP scope; ADR clarifying non-goals | TBD | Open |

## Escalation Workflow
1. If Impact=High & Likelihood>=Medium → create dedicated issue.
2. Update Status: Open → Mitigating → Closed.
3. Record closure reason & residual risk.

## Change Log
- 2025-10-07: Initial register created.
