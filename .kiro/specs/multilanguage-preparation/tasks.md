# Implementation Plan (Refined)

Legend:
- [ ] = Not started
- [~] = In progress
- [x] = Done
- (Opt) = Optional / Stretch
- (Pilot) = Limited rollout before broad adoption

Traceability: Requirement codes (e.g., 1.1) reference `requirements.md`. ADR = Architecture Decision Record.

---
## 1. Baseline, Risks & Decisions (Do First)
- [x] 1.1 Capture backend coverage (PHPUnit HTML + Clover) — ✅ Xdebug run complete, all 575 tests passing
- [x] 1.2 Capture frontend coverage (Vitest/Jest) per directory (pages/components/hooks/api) — ✅ 71.58% baseline
- [x] 1.3 Log top 10 slowest backend & frontend tests (initial coarse timings) — ✅ See `docs/test-stability-baseline.md`
- [x] 1.4 Run backend + frontend test suites 3× (flakiness scan) — ✅ **COMPLETED: 3/3 runs, 0 flaky tests detected**
- [x] 1.5 Generate initial dependency graphs (Deptrac, dependency-cruiser) — Backend: ✅ Deptrac v2 operational (see 2.2); Frontend: dependency-cruiser operational: 0 violations (199 modules, 455 deps)
- [x] 1.6 Create `baseline.md` with captured metrics — ✅ `docs/baseline.md` + `docs/test-stability-baseline.md`
- [x] 1.7 Initialize risk register `docs/i18n_risks.md` (seed top 8 risks) — ✅ Created
- [x] 1.8 Create ADR-001: i18n scope & non-goals — ✅ `docs/adr/ADR-001-i18n-scope.md`
- [x] 1.9 Create ADR-002: Translation storage strategy (file vs DB vs hybrid) — ✅ `docs/adr/ADR-002-translation-storage-strategy.md`
- [x] 1.10 Document locale fallback order draft (`docs/locale_fallback.md`) — ✅ Created
- [x] 1.11 Harden backend coverage workflow (Xdebug-enabled Docker image + `backend/scripts/run-coverage.sh` helper) — ✅ Complete
- [x] 1.12 Diagnose Filament email configuration feature-test failures surfaced during Xdebug coverage run — ✅ **FIXED: All 575 tests passing**
- [x] 1.13 Document requirement to rebuild backend image with Xdebug/dev deps before coverage-aware backend test runs — ✅ Documented in `docs/development.md`

## 2. Quality Gates & Static Analysis Foundations
### Backend
- [x] 2.1 Add PHPStan (Larastan) config (start level current → target level 7) — ✅ Level 5 passes with 0 errors (baseline locked); raise to 6/7 after Deptrac & Insights
- [x] 2.2 Add Deptrac with initial layer rules — ✅ Upgraded to Deptrac v2, migrated collectors to classLike, inlined skip_violations baseline; analysis green (0 violations, 10 skipped), ready to tighten rules gradually
- [x] 2.3 Add PHP Insights (baseline score recorded) — ✅ Baseline: Code 84.4, Complexity 79.5, Architecture 81.3, Style 75.6 (112 files, 7020 lines); excludes migrations/Filament; 0 security issues
- [x] 2.4 Add Composer audit to CI — ✅ Baseline (2025-10-10): 0 advisories, 1 abandoned (qossmic/deptrac → suggest deptrac/deptrac); script planned for CI integration
- [ ] 2.5 (Pilot) Infection config limited to `App/Services/Notification*` & `Invitation*`

### Frontend
- [x] 2.6 ESLint strict rules enforced + TypeScript `strict` & `noUncheckedIndexedAccess` — ✅ ESLint: strictTypeChecked + stylisticTypeChecked active (0 violations); TS: strict + noUncheckedIndexedAccess enabled
- [x] 2.7 dependency-cruiser rules (no pages→pages, api isolation) — ✅ Installed & operational: 0 violations (199 modules, 455 deps); rules: no-pages-to-pages (warn), no-api-dep-on-ui (error)
- [x] 2.8 Enable dead code scan (ts-prune) in CI (non-failing first) — ✅ ts-prune installed & operational: 89 findings (mix of used exports + potential dead code); npm run lint:dead

### Cross
- [ ] 2.9 Pre-commit (lint-staged): phpstan (quick), eslint --cache, tsc --noEmit, php-cs-fixer dry-run
- [ ] 2.10 Secret scanning (gitleaks or GH native)
- [ ] 2.11 License scanning (frontend+backend)
- [ ] 2.12 Add size-limit or build stats capture (frontend) (Opt)

## 3. Test Infrastructure Restructure
### Backend
- [ ] 3.1 Create `tests/Integration` & migrate mixed Feature tests
- [ ] 3.2 Standardize DB test strategy (transactions vs refresh) documented
- [ ] 3.3 Parallel testing dry run; list flaky tests (if any)
- [ ] 3.4 Introduce approval test harness (baseline email templates EN)
- [ ] 3.5 Add mutation pilot nightly job (only pilot targets)

### Frontend
- [x] 3.6 Add `test/utils/renderWithProviders.tsx` — ✅ Implemented re-export of `renderWithProviders`, `renderWithRouter`, and Testing Library helpers from `src/test-utils.tsx` to provide a stable import path for tests
- [x] 3.7 Centralize MSW server `test/server.ts` — ✅ Added `frontend/test/server.ts` re-exporting `src/mocks/server`; updated `src/setupTests.ts` to import from `./mocks/server` (keeps within tsconfig include); VS Code TS6307 error resolved
- [ ] 3.8 Refactor oversized page tests → component + hook tests
- [ ] 3.9 Add a11y tests (axe) for Auth, Invitations, Pet Creation flows
- [ ] 3.10 Add API contract tests for `src/api/*` (error & success)
- [ ] 3.11 Stabilize & quarantine flaky tests (introduce @flaky tag) (Opt)

## 4. E2E (Playwright) Core
- [ ] 4.1 Install & configure Playwright (trace, video on failure)
- [ ] 4.2 Auth flow test (register→login→logout)
- [ ] 4.3 Password reset flow
- [ ] 4.4 Invitation acceptance flow
- [ ] 4.5 Pet creation + weight entry + verification
- [ ] 4.6 Notification settings toggle
- [ ] 4.7 404 navigation / routing
- [ ] 4.8 Add environment reset strategy (DB reset endpoint or snapshot)
- [ ] 4.9 Add CI integration (cache browsers, upload traces)
- [ ] 4.10 Cross-browser matrix (Chromium + WebKit) (Opt)

## 5. Locale Context & Fallbacks (Backend)
- [ ] 5.1 Add `LocaleContextInterface`
- [ ] 5.2 Implement `LocaleContext` (user pref > Accept-Language > default)
- [ ] 5.3 Middleware registering locale per request
- [ ] 5.4 Add user `locale` column migration
- [ ] 5.5 Implement fallback algorithm & unit tests
- [ ] 5.6 Parity test: frontend vs backend fallback order fixture
- [ ] 5.7 ADR-003: Finalized fallback order + reasoning

## 6. Translation Service Foundation
- [ ] 6.1 Add `TranslationServiceInterface`
- [ ] 6.2 Stub `TranslationService` (identity)
- [ ] 6.3 Missing key logger (warn dev, not prod)
- [ ] 6.4 Key naming convention doc (`docs/translation_keys.md`)
- [ ] 6.5 Variable substitution mechanism w/ tests
- [ ] 6.6 Enum interface for translation key mapping
- [ ] 6.7 Key format linter script (Opt)

## 7. Email & Notification Template Abstraction
- [ ] 7.1 Create `EmailTemplateInterface`
- [ ] 7.2 Refactor `NotificationMail` to key-based system
- [ ] 7.3 Migration (email_templates + translations) (may defer data population)
- [ ] 7.4 Add variable map normalization & sanitizer
- [ ] 7.5 Update all existing email classes to new pipeline
- [ ] 7.6 Approval tests (golden EN for ≥3 templates)
- [ ] 7.7 Snapshot subjects vs bodies (normalized dynamic tokens)

## 8. Frontend i18n Foundation
- [ ] 8.1 Install i18next or typesafe-i18n
- [ ] 8.2 Folder structure `src/i18n/locales/en/...`
- [ ] 8.3 Implement provider & `useTranslation`
- [ ] 8.4 Missing key dev overlay/log
- [ ] 8.5 Custom ESLint rule (or config) banning raw strings (allowlist domains)
- [ ] 8.6 Orphan key detector script
- [ ] 8.7 Unused key reporter (Opt)

## 9. Business Logic Extraction
- [ ] 9.1 Inventory controllers w/ embedded logic
- [ ] 9.2 Create extraction plan (list & owners)
- [ ] 9.3 Extract to Services (batch 1)
- [ ] 9.4 Extract to Services (batch 2)
- [ ] 9.5 Add unit tests for new services
- [ ] 9.6 Remove deprecated helpers returning user-facing strings

## 10. Architectural Enforcement & Formatting
- [ ] 10.1 Finalize Deptrac rules & enable CI fail
- [ ] 10.2 Single formatting module (frontend) for age/weight/date
- [ ] 10.3 Services return raw values (audit pass)
- [ ] 10.4 Introduce domain events for notifications (Opt)
- [ ] 10.5 Add static check for disallowed cross-layer imports

## 11. Error Handling, Monitoring & Observability
- [ ] 11.1 Structured logging for translation failures (locale, key, fallback)
- [ ] 11.2 Health endpoint exposes supported locales
- [ ] 11.3 Coverage metrics endpoint (Opt)
- [ ] 11.4 Email template render fallback path logging
- [ ] 11.5 Add SLO doc for translation latency (Opt)

## 12. Coverage & Mutation Enforcement
- [ ] 12.1 Set documented coverage thresholds per layer (backend, frontend)
- [ ] 12.2 Enable coverage gates in CI
- [ ] 12.3 Expand mutation targets (post-pilot) (Opt)
- [ ] 12.4 Nightly job: mutation + orphan key scan
- [ ] 12.5 Track uncovered critical files list (auto-generated)
- [ ] 12.6 Mutation trend markdown report

## 13. Translation Workflow Tooling
- [ ] 13.1 Script: list unused keys
- [ ] 13.2 Script: diff new keys per branch
- [ ] 13.3 CI: fail if orphan keys > threshold (after grace period)
- [ ] 13.4 Test suite fails on missing key usage
- [ ] 13.5 Contributor guide (workflow + naming)

## 14. String Extraction Sprints
- [ ] 14.1 Backend system messages (batch 1)
- [ ] 14.2 Backend notifications & emails residual inline strings
- [ ] 14.3 Frontend UI core navigation & auth
- [ ] 14.4 Frontend forms & validation messages
- [ ] 14.5 Add parity test: no banned raw strings remain

## 15. Second Locale Readiness Gate
- [ ] 15.1 All gates green (static, coverage, boundaries)
- [ ] 15.2 E2E stable 10 consecutive runs
- [ ] 15.3 Fallback order ADR accepted
- [ ] 15.4 Golden email tests stable
- [ ] 15.5 Sign-off checklist completed

## 16. Second Locale Bootstrap
- [ ] 16.1 Add locale scaffold `vi` (10% keys)
- [ ] 16.2 Implement lazy loading test (swap locale)
- [ ] 16.3 UI smoke test verifying key namespace rendering in 2 locales
- [ ] 16.4 Email template localized (one template) + approval test
- [ ] 16.5 Backend ↔ frontend fallback parity test passes

## 17. Extended Validation & Analytics (Optional)
- [ ] 17.1 Visual regression (Storybook + Chromatic/Playwright component)
- [ ] 17.2 Analytics: locale switch events
- [ ] 17.3 Translation caching layer (in-memory, warm on boot)
- [ ] 17.4 Feature toggle for gradual locale rollout
- [ ] 17.5 Performance benchmark (translation lookup latency)

## 18. Finalization & Documentation
- [ ] 18.1 ADR-004: Final architecture summary (post-implementation)
- [ ] 18.2 Update risk register with final status & residual risks
- [ ] 18.3 Success criteria checklist archived
- [ ] 18.4 Post-mortem / retro notes prepared
- [ ] 18.5 Plan next locales roadmap (Opt)

---
Stretch tasks are explicitly marked (Opt). Prioritize sequentially through Sections 1 → 16 before investing in Section 17.

_Maintained: update checkboxes and ADR references as decisions are finalized._

---

## Progress Notes (2025-10-08)

### ✅ Section 1 Complete (Baseline, Risks & Decisions)
**Achievement:** All baseline and foundational work completed. Test suites stabilized and ready for i18n implementation.

**Key Accomplishments:**
- **Test Stability:** 3/3 backend runs (575 tests) + 3/3 frontend runs (297 tests) — **0 flaky tests detected**
- **Coverage Baseline:** Backend coverage with Xdebug; frontend 71.58% statements
- **Fixed Critical Blockers:** Resolved 13 failing Filament resource tests by switching from `fillForm()` to explicit `->set('data.*')` calls
- **Documentation:** Created `docs/test-stability-baseline.md`, updated `docs/development.md`, `docs/baseline.md`
- **Risk & Decision Docs:** ADR-001 (scope), ADR-002 (storage), locale fallback, risk register all in place

**Test Suite Health:**
| Metric | Backend | Frontend |
|--------|---------|----------|
| Stability | ✅ 100% (3/3 green) | ✅ 100% (3/3 green) |
| Tests | 575 | 297 |
| Assertions | 2,129 | N/A |
| Runtime | 59-121s (variance to investigate) | 9.5-9.8s (excellent) |
| Flakiness | 0 detected | 0 detected |
| Coverage | Available (Xdebug) | 71.58% statements |

**Remaining from Section 1:**
- 1.5: Dependency graphs (Deptrac install needed; dep-cruiser config troubleshooting)

**Files Created/Updated This Session:**
- `backend/scripts/run-coverage.sh` — Coverage execution helper
- `backend/xdebug.ini` — Coverage-only Xdebug config
- `backend/Dockerfile` — Conditional Xdebug/dev install via build args
- `docs/test-stability-baseline.md` — Comprehensive stability analysis
- `docs/development.md` — Enhanced with Xdebug workflow + Filament troubleshooting
- `docs/baseline.md` — Updated with stability results
- `tmp/session-summary-2025-10-08.md` — Full session recap
- Multiple test files fixed (EmailConfiguration + Notification resources)

### 🎯 Current Status: READY FOR SECTION 2+
With Section 1 complete and test suite stability confirmed, the project is cleared to begin:
- **Next Priority:** Section 2 (Quality Gates) — Install PHPStan, complete Deptrac setup
- **Then:** Section 5-8 (i18n Foundations) — LocaleContext, TranslationService, frontend i18n library

**Known Issues to Address in Parallel:**
- Backend timing variance (59s vs 121s) — profile slow run
- 29 PHPUnit deprecation warnings — triage for v12 compatibility
- dependency-cruiser finding 0 modules — fix TS resolution
- Per-namespace coverage extraction — parse Clover XML

### 📚 Key References
- Test Stability: `docs/test-stability-baseline.md`
- Baseline Metrics: `docs/baseline.md`
- Development Guide: `docs/development.md` (Xdebug + Filament sections)
- Session Summary: `tmp/session-summary-2025-10-08.md`
- Coverage Artifacts: `backend/coverage-html/index.html`, `backend/coverage-clover.xml`

---

**Last Updated:** 2025-10-08  
**Phase:** Baseline Complete → Quality Gates & i18n Foundation  
**Next Milestone:** Complete Section 2 (Quality Gates) + Begin Section 5 (Backend i18n)