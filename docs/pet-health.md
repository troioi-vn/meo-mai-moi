# Pet Health MVP

Status updated: 2025-09-27

This document consolidates the Pet Health planning (previously in `tmp/medical_md.md` and `tmp/medical_records_feature.md`) into a single source of truth.

## Scope
- [x] Weight tracking (time series)
- [x] General medical events (notes for exams, surgeries, meds, etc.)
- [x] Vaccinations (records)
- [ ] Vaccination reminders (daily job)
- [ ] Multi-chip support (Pet has many Microchips)

## Data Model
- pets (existing)
- vaccination_records — DONE
  - id, pet_id FK, vaccine_name string, administered_at date, due_at date nullable, notes text nullable, reminder_sent_at datetime nullable, created_at/updated_at
- medical_notes — DONE
  - id, pet_id FK, note text, record_date date, created_at/updated_at, unique(pet_id, record_date)
- weight_entries — DONE (as weight_histories)
  - id, pet_id FK, weight_g int, measured_at/record_date, created_at/updated_at
- pet_microchips — PENDING
  - id, pet_id FK, chip_number string unique, issuer nullable, implanted_at date nullable, created_at/updated_at

Indexes
- vaccination_records: unique (pet_id, vaccine_name, administered_at); index (pet_id, due_at)
- medical_notes: unique (pet_id, record_date)
- weight_histories: index (pet_id, record_date)

Relationships
- Pet hasMany WeightHistory, VaccinationRecord, MedicalNote, Microchip
- Each record belongsTo Pet

Capability gating
- Backend via PetCapabilityService; Frontend mirrors via petSupportsCapability
- Weight: DB-driven per PetType flag `weight_tracking_allowed` (admin toggle)
- Medical: currently static for cats
- Vaccinations: currently static for cats
- Disabled types return 422 with error_code FEATURE_NOT_AVAILABLE_FOR_PET_TYPE

## API Endpoints
- Weights: /api/pets/{pet}/weights (CRUD) — implemented
- Vaccinations: /api/pets/{pet}/vaccinations (CRUD) — implemented
- Medical Notes: /api/pets/{pet}/medical-notes (CRUD) — implemented
- Microchips: /api/pets/{pet}/microchips (CRUD) — planned

## Authorization
- Owner or admin; 403 for others — implemented for weights, medical notes, vaccinations

## Reminders (Vaccinations)
- Daily job scans due_at; sends notifications via existing email system
- De-duplicate per record/day using reminder_sent_at
- Status: Pending

## Frontend
- Health sections (owner-only)
  - [x] Weight section with CRUD
  - [x] Medical notes section with CRUD
  - [x] Vaccinations section with CRUD
- MSW handlers and client tests implemented for weights, medical notes, and vaccinations

## Phases
1) Backend weight entries — DONE
2) Backend vaccinations — DONE
3) Backend medical events (notes) — DONE
4) Vaccination reminders — PENDING
5) Backend microchips — PENDING
6) Frontend health sections — DONE
7) Docs + Swagger — IN PROGRESS

## Acceptance Criteria
- Proper auth and capability gating — enforced for implemented features
- Validation rules enforced — duplicate uniqueness rules as specified
- OpenAPI annotations present; tests green

## Next Steps
- Implement vaccination reminders job and tests
- Extend OpenAPI where helpful and regenerate Swagger
- Add Filament admin toggles if we later make medical/vaccinations DB-driven per type
