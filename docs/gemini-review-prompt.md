# Gemini Review Prompt: Pet-centric Migration Audit

Date: 2025-09-25
Workspace root: /home/edward/Documents/meo-mai-moi

## Objective
You are Gemini 2.5 Pro. Please perform a thorough technical review of the migration from a Cat-centric system to a Pet-centric system. Compare the implemented code and behavior against the agreed plan and constraints, identify any gaps or regressions, and provide actionable recommendations.

Your review should cover backend (Laravel), frontend (React/TypeScript + Vitest), data model/migrations, API contract (OpenAPI), and documentation alignment.

## Primary sources to read first
- Plan: `multiple_pet_type.md` (implementation goals, constraints, phases, success criteria)
- API docs: `backend/storage/api-docs/api-docs.json` (ensure Pet-only endpoints and schemas)

## Code areas to focus
- Backend (Laravel 12):
  - Models: `backend/app/Models/Pet.php`, `PetType.php` (if present), and related models (PlacementRequest, TransferRequest, FosterAssignment, MedicalRecord, WeightHistory)
  - Services: `backend/app/Services/PetCapabilityService.php`
  - Controllers: `backend/app/Http/Controllers/PetController.php`, `PetPhotoController.php`
  - Policies: `backend/app/Policies/*` (notably TransferRequestPolicy)
  - Routes: `backend/routes/api.php`
  - Migrations: especially `backend/database/migrations/2025_09_25_120000_drop_legacy_cat_schema.php`
  - Tests: `backend/tests/*` (Feature/Unit around pets, photos, placement/transfer, ownership, notifications)

- Frontend (React/TypeScript):
  - Types and helpers: `frontend/src/types/pet.ts`, `frontend/src/utils/petStatus.ts`
  - Components/pages: `frontend/src/components/PetCard.tsx`, `frontend/src/components/PetDetails.tsx`, `frontend/src/pages/PetProfilePage.tsx`, `frontend/src/pages/account/MyPetsPage.tsx`, `frontend/src/pages/account/CreatePetPage.tsx`
  - Hooks: `frontend/src/hooks/useCreatePetForm.ts`, `frontend/src/hooks/usePetProfile.ts`
  - Mocks/handlers: `frontend/src/mocks/data/pets.ts`
  - Tests: `frontend/src/**/*.test.tsx`

## What to verify against the plan
1. API surface and semantics
   - All public endpoints are Pet-only: `/api/pets`, `/api/my-pets`, `/api/pet-types`, pet photos, placement/transfer flows.
   - No `/cats` endpoints remain (except within migrations or admin if intentionally allowed by constraints). Confirm redirects/compat layers are removed per "no backward compatibility" requirement.
   - Pet create semantics: 201 Created, default `pet_type` to Cat (slug=cat) when omitted, `pet_type` object embedded in responses.
   - Status-based soft delete (status = `deleted`) with global scope hiding deleted by default.
   - Capability matrix enforced server-side by `PetCapabilityService`:
     - Cat supports advanced features (placement, fostering, medical, ownership, weight, comments, status_update, photos).
     - Dog supports photos only.
     - Unsupported actions return 422 with a machine-readable `error_code` like `FEATURE_NOT_AVAILABLE_FOR_PET_TYPE`.
   - Ownership and permissions updated to use `pet_id` (not `cat_id`).

2. Data model and migrations
   - `pets` table with `pet_type_id`; related tables refactored to `pet_id`.
   - Legacy schema cleanup migration exists: `2025_09_25_120000_drop_legacy_cat_schema.php`.
     - Verify it is safe in production environments.
     - Verify it no-ops in testing/SQLite to avoid index/column-drop issues (as implemented).
   - Confirm no application logic depends on legacy Cat tables/models.

3. Frontend UX and routing
   - Routes updated to `/pets/...` (profile, edit, account sections). No lingering `/cats` routes.
   - Pet type selection on creation (default Cat loaded in form).
   - UI capability gating mirrors backend matrix (e.g., placement widgets hidden for Dog, photos allowed).
   - My Pets page sections and filters (including toggle to show deceased) work with Pet types.

4. Documentation and contract
   - `api-docs.json` contains only Pet endpoints, tags, schemas; descriptions align with implemented responses and status codes.
   - `multiple_pet_type.md` plan alignment: Mark any deviations (intentional or accidental).

5. Residual legacy and constraints
   - Confirm remaining Cat references only exist where justified (historical migrations, minimal enums necessary for old migrations). Admin panel files should not be edited per constraint.
   - Confirm there’s no backward-compat code paths (no `/cats` fallbacks, no legacy controllers/models).

## How to run and validate (optional)
You can run tests locally to verify behavioral compliance. Use whichever path is available in your environment:

```bash
# Frontend (from repo root or frontend/)
cd frontend
npm ci
npm test --silent

# Backend (from repo root or backend/)
cd backend
php artisan test --no-ansi
```

Expected baseline from the current repository state (for quick sanity):
- Frontend: all tests passing (≈217 tests)
- Backend: all tests passing (≈370 tests)

## Heuristics and spot checks
- Grep for residual `Cat`, `cat_id`, `/cats/` outside of:
  - `backend/database/migrations/**`
  - Admin panel files (`backend/app/Filament/**`, `backend/config/filament*`, etc.), which must remain unedited per constraints.
- Verify error semantics around capability gating (422 + error_code) on both API responses and UI handling.
- Check that soft-deleted pets don’t appear in listings but can be operated on via appropriate endpoints as per plan.
- Check Swagger/OpenAPI tags include only Pet-relevant sections (Pets, Pet Types, Pet Photos, etc.).

## Deliverables
Produce a concise, high-signal report in Markdown that includes:
- Executive summary (1–2 paragraphs)
- Coverage matrix mapping plan items → implemented evidence → status (Done/Partial/Gap)
- Notable gaps or risks (prioritized: High/Med/Low) with exact file paths and line pointers
- Suggested fixes or follow-up tasks (small PR-ready bullet points where feasible)
- Validation results (test outcomes you observed; any local run caveats)
- Optional: Diff snippets or code pointers for each finding

## Report template (use this structure)

```markdown
# Pet-centric Migration Audit – Findings

## Executive Summary
- …

## Plan Alignment Matrix
| Plan Item | Evidence (file/line, endpoint, test) | Status | Notes |
|---|---|---|---|
| Pet-only API | backend/routes/api.php; api-docs.json | Done | … |
| Default pet_type to Cat on create | PetController::store | Done | 201, embeds pet_type |
| Capability gating (Cat vs Dog) | PetCapabilityService + tests | Done | 422 error_code confirmed |
| Soft delete as status=deleted | Pet model + tests | Done | Global scope hiding deleted |
| No `/cats` endpoints | grep results | Partial/Done | … |
| Admin files untouched | … | Done | … |
| … | … | … | … |

## Gaps / Risks (prioritized)
1. [High] … (file/path, rationale, impact)
2. [Medium] …
3. [Low] …

## Recommendations / Next Steps
- [ ] … (small, actionable, PR-ready)
- [ ] …

## Validation Notes
- Frontend tests: pass/fail counts, anomalies
- Backend tests: pass/fail counts, anomalies
- Any environment notes (e.g., SQLite test DB + migration no-op rationale)

## Appendix
- Residual references found: …
- Useful commands: …
```

## Constraints to respect during review
- Do not propose editing admin panel files unless explicitly allowed later.
- No backward compatibility layer is needed; flag any reintroduction of legacy behaviors.
- Treat the legacy cleanup migration as production-focused; it intentionally no-ops for testing/SQLite.

## Success criteria
- Clear mapping of implementation vs. plan with zero-ambiguity status per item
- Actionable, prioritized list of follow-ups (if any)
- Confirmation that tests are green and API docs reflect Pet-only system
- Confirmation that capability gating and soft-delete semantics match plan on both backend and frontend
