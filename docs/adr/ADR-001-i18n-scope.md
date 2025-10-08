# ADR-001: Internationalization (i18n) Scope & Non-Goals

Date: 2025-10-07
Status: Draft
Decision: Pending team review

## Context
We are preparing the platform for multi-language support with minimal rework risk. Early scoping prevents over-engineering and keeps MVP timeline intact.

## In-Scope (MVP)
- UI string externalization (static + validation + navigation + notifications triggers)
- Email & notification template key abstraction (English baseline)
- Locale resolution chain (user preference > Accept-Language > default)
- Adding a second locale scaffold at ~10% key coverage for pipeline validation
- Approval tests for key email templates

## Out of Scope (MVP)
- Translating historical user-generated content (retroactive migrations)
- Real-time language switching for already-rendered server emails (only future sends)
- Full RTL layout adjustments
- Pluralization edge-case engine for complex languages (simple fallback only)
- Translation contribution UI / CMS integration

## Deferred / Future Considerations
- Rich pluralization and ICU message formatting
- Database-backed dynamic translation overrides (admin panel)
- Locale-specific media assets and imagery
- Analytics-based dynamic default locale suggestions

## Drivers
- Reduce cost of adding languages post-MVP
- Avoid tight coupling of business logic and presentation formatting
- Ensure deterministic fallback & auditing of translation completeness

## Risks
See Risk Register (R1, R2, R3, R4).

## Alternatives Considered
| Option | Notes | Reason Not Chosen (Now) |
|--------|-------|-------------------------|
| Full DB translation infra now | Higher upfront complexity | Premature relative to MVP scope |
| Skip email template abstraction | Faster initial coding | High rework if multi-language emails needed |
| Single-locale hardcode + grep later | Minimal initial effort | High defect risk & refactor cost |

## Decision (Proposed)
Adopt a key-based file-driven translation layer for system strings; delay DB-backed overrides. Keep user-generated content monolingual until explicit product demand.

## Consequences
Positive:
- Minimizes schema churn.
- Simplifies test harness design.
Negative:
- Second locale launch will require batch string extraction if discipline falters.

## Follow-Up Actions
- Create TranslationService stub (Task 6.x)
- Implement extraction lint rule
- Produce fallback order spec (ADR-003 or doc)

---
Amendments: list here with date & summary.
