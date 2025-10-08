# Locale Fallback Order (Draft)

Date: 2025-10-07
Status: Draft (to be finalized in ADR-003)

## Proposed Resolution Chain
1. Explicit user profile locale (if authenticated & field set)
2. Accept-Language header (first supported locale by quality weight)
3. Application default locale (config/app.php or .env)
4. Hardcoded ultimate fallback ("en") to avoid null/empty locale

## Translation Key Fallback Behavior
- If key missing in resolved locale → attempt default locale.
- If still missing → emit log (WARN) with context: `locale=<resolved> key=<key> fallback=ultimate`.
- Return raw key (or bracketed key) in development; safe placeholder (English or static) in production.

## Examples
| Scenario | User Pref | Accept-Language | Supported Locales | Result |
|----------|-----------|-----------------|-------------------|--------|
| Auth user w/ pref | vi | en-US;q=0.9 | en,vi | vi |
| No user pref, header supported | — | vi-VN, en-US | en,vi | vi |
| No user pref, header unsupported | — | fr-FR, de-DE | en,vi | en |
| No header | — | — | en,vi | en |

## Edge Cases / Notes
- Treat Accept-Language `*` as wildcard → choose default locale.
- Normalize locale codes to canonical form (e.g., `vi-VN` → `vi`).
- Persist user preference if they manually change locale (future UI setting).
- Avoid reading Accept-Language for every request after resolution; cache in request-scoped context.

## Testing Strategy
- Unit tests for parsing quality-weighted list.
- Parity fixtures consumed by backend & frontend tests to guarantee identical fallback.
- Negative test: unsupported user-pref locale → fallback to default (log with reason).

## Open Questions
- Do we need region-specific variants at MVP (e.g., `en-GB`)? (Assumed no; treat as base language.)
- Should we allow query parameter override for debugging? (Recommended: `?lang=` dev-mode only.)

---
Will be formalized in ADR-003 once confirmed.
