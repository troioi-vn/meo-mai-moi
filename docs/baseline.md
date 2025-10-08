# i18n Preparation Baseline (Initial Capture)

Date: 2025-10-07

## 1. Test Coverage (Initial)
Backend:
- Coverage: NOT AVAILABLE (no code coverage driver present). Action: install Xdebug or PCOV and re-run.
- Total tests: 575 (Assertions: 2136)
- Feature tests subset: 365 (Assertions: 1541) Runtime: 93.2s
- Full suite runtime: 45.8s (without coverage) *NOTE: runtime underestimates without coverage instrumentation.*

Frontend:
- Vitest statement coverage: ~71.58%
- Branch coverage: ~77.02%
- Functions: ~63.54%
- Files (test files executed): 50
- Total tests: 297
- Longest test file runtime (observed): `src/components/LoginForm.test.tsx` ~3.8s

## 2. Performance Observations
- Backend Feature suite (93.2s) dominates total; optimization candidates likely in integration-heavy tests.
- Frontend largest contributors are complex form & modal interaction suites.

## 3. Known Gaps / Immediate Actions
| Area | Gap | Action |
|------|-----|--------|
| Backend coverage | No driver | Install Xdebug/PCOV & re-run coverage to set baseline % |
| Architectural boundaries | Not enforced yet | Add Deptrac config (Section 2) |
| Mutation | None | Pilot Infection (Notification & Invitation Services) |
| Orphan strings | Untracked | Add extraction + lint rule after i18n foundation |
| Flakiness | Not assessed | Run 3x suite repetition (Section 1 task 4) |

## 4. Tooling to Introduce
- Deptrac, PHPStan (Larastan), Infection (pilot), dependency-cruiser, axe, Playwright.

## 5. Initial Risk Notes (see `i18n_risks.md` for full list)
- Schema churn for templates
- Inconsistent fallback logic front vs back
- Hardcoded strings missed during extraction
- Email localization regressions undetected

## 6. Next Baseline Refresh Target
Repeat baseline once:
1. ✅ Coverage driver installed (Xdebug integrated)
2. Deptrac & PHPStan integrated
3. LocaleContext + TranslationService stubs merged

---
## Update: 2025-10-08

### Test Stability Confirmed
- **Backend:** 3/3 runs passed (575 tests, 2129 assertions each)
  - Timing: 59s-121s range (104% variance; needs profiling but non-blocking)
  - Flaky tests: 0 detected
  - Deprecations: 29 PHPUnit warnings (consistent across runs)
- **Frontend:** 3/3 runs passed (297 tests, 50 files)
  - Timing: 9.46-9.84s (3.9% variance; excellent stability)
  - Coverage: 71.58% statements, 77.02% branches, 63.54% functions
  - Flaky tests: 0 detected

**Detailed analysis:** See `docs/test-stability-baseline.md`

### Coverage Status
- Backend: Xdebug-instrumented coverage available at `backend/coverage-html/index.html`
- Frontend: Vitest coverage baseline established
- Action: Extract per-namespace metrics from Clover XML (pending)

### Next Actions
1. ✅ Test suite stable → **READY FOR I18N FOUNDATION WORK**
2. Install Deptrac for architectural boundary enforcement
3. Add PHPStan baseline for static analysis
4. Investigate backend timing variance (59s vs 121s)
5. Address PHPUnit deprecation warnings before v12 upgrade

---
Generated automatically; evolve rather than overwrite (append dated deltas).
