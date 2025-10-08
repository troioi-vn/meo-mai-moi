# ADR-002: Translation Storage Strategy

Date: 2025-10-07
Status: Draft (Decision: TBD after prototype)

## Context
We need a storage mechanism for system (non user-generated) translatable strings (UI, emails, notifications). Choices affect performance, deployment workflow, editor accessibility, and future dynamic override capability.

## Options
| Option | Description | Pros | Cons | Complexity |
|--------|-------------|------|------|-----------|
| A. File-based JSON (per locale) | Versioned flat JSON modules in repo | Simple, fast, cacheable, PR reviewable | Requires redeploy for updates | Low |
| B. DB Tables (keys + translations) | `translations` table with key/locale/value | Runtime edits possible | Admin UI & caching needed | Medium |
| C. Hybrid (File baseline + DB overrides) | Files as canonical; DB only for overrides | Flexibility + fast fallback | Added complexity & merge logic | Medium-High |
| D. External service (SaaS) | Hosted translation management API calls | Non-engineers manage strings | Vendor lock-in, latency | Medium-High |

## Evaluation Criteria
- Deployment Simplicity (Weight 3)
- Change Auditability (Weight 2)
- Runtime Performance (Weight 3)
- Future Extensibility (Weight 2)
- MVP Delivery Speed (Weight 3)

## Scoring (Preliminary)
| Option | Deploy | Audit | Perf | Extensibility | Speed | Weighted Total |
|--------|--------|-------|------|--------------|-------|----------------|
| A | 5 | 5 | 5 | 3 | 5 | (5*3)+(5*2)+(5*3)+(3*2)+(5*3)= 15+10+15+6+15 = 61 |
| B | 3 | 3 | 4 | 5 | 3 | 9+6+12+10+9 = 46 |
| C | 4 | 4 | 4 | 5 | 2 | 12+8+12+10+6 = 48 |
| D | 2 | 2 | 3 | 4 | 2 | 6+4+9+8+6 = 33 |

## Proposed Direction
Adopt Option A (file-based JSON) for MVP + design TranslationService interface to allow hybrid (Option C) later without changing call sites.

## Open Questions
- Will product require non-engineer editing pre-launch? (If yes, reconsider minimal DB override for a subset.)
- Do we expect runtime locale additions (dynamic list)? If yes, need dynamic registry pattern.

## Risks
- Emergency copy fixes require redeploy → Mitigation: fast release pipeline.
- PR review fatigue for large key sets → Mitigation: subdivide by domain (auth.json, navigation.json, emails.json).

## Migration / Implementation Plan
1. Define key naming conventions (Task 6.4)
2. Create `src/i18n/locales/en/` baseline files
3. Implement JSON loader & caching
4. Add missing key logger
5. Add orphan key script (Task 13.x)
6. Later: Add optional DB override adapter (phase 2) if product demands live edits.

## Decision
TBD (await team review). Default path continues assuming Option A unless challenged.

## Follow-Up
- ADR-003: Fallback Order & Locale Negotiation
- Performance baseline after implementation (lookup micro-benchmark)

---
Amendments logged below with date & summary.
