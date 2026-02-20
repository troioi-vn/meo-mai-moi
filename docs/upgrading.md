# Upgrading Dependencies

How we approach dependency upgrades: automatic for patches, semi-automatic for minors, deliberate and planned for majors.

## Upgrade Tiers

| Type | Example | Cadence | How |
|------|---------|---------|-----|
| **Patch** (z) | `1.2.3 → 1.2.4` | Automatic (CI) | Dependabot / `composer update` |
| **Minor** (y) | `1.2.x → 1.3.0` | Monthly | `composer update` + run tests |
| **Major** (x) | `1.x → 2.0` | Planned, per this guide | Full process below |

Minor updates may occasionally contain breaking changes despite semver promises — always run the full test + static analysis suite after `composer update`.

## Major Version Upgrade Process

### Principles

- **One major upgrade at a time.** Never combine PHP + Laravel + Filament in a single branch. When something breaks, you need to know who's responsible.
- **Never skip major versions.** Upgrade `3 → 4 → 5` in two separate PRs, not `3 → 5` in one. Each jump's changelog is smaller and intermediate states are shippable.
- **Establish a baseline first.** Run all quality gates before touching anything. If they already fail, fix that first — you need a clean starting point to detect regressions.
- **Your test suite is your upgrade harness.** PHPStan, Deptrac, and the test suite exist partly for this purpose. The more coverage you have, the cheaper upgrades become.

### Step-by-Step

#### 1. Read the official upgrade guide completely

Before touching any code. Skim reading leads to surprises mid-upgrade. Mark every breaking change that applies to this codebase.

Key upgrade guides:
- PHP: https://www.php.net/migration85 (adjust for target version)
- Laravel: https://laravel.com/docs/12.x/upgrade
- Filament: https://filamentphp.com/docs/5.x/upgrade-guide

#### 2. Establish a baseline

```bash
# Backend
cd backend
php artisan test --parallel       # All tests must pass
composer phpstan                  # Zero errors
composer deptrac                  # Zero violations

# Frontend
cd frontend
bun run test:minimal
bun run typecheck
bun run lint
```

If anything fails before you start, fix it first. Do not proceed with a broken baseline.

#### 3. Open a dedicated branch and draft PR

```bash
git checkout dev
git checkout -b upgrade/filament-5
```

Open a draft PR against `main` immediately. This gives you CI on every push and a clear diff of everything changed. You can work on it over multiple days without polluting `dev`.

#### 4. Upgrade the dependency

```bash
# Backend example: Filament 5
composer require filament/filament:"^5.0" --update-with-dependencies

# Or for PHP version: update composer.json "php" constraint, then
docker compose build --no-cache backend
```

#### 5. Fix breakages iteratively

Work through failures in this order:

1. **PHPStan first** — catches type errors and removed APIs before you even run the app
2. **Tests second** — catches runtime behavior changes
3. **Manual smoke test last** — log into admin, exercise key flows

After each meaningful fix, commit with a descriptive message. When something breaks unexpectedly, note it (see step 6).

```bash
# Run quality gates after each batch of fixes
php artisan test --parallel
composer phpstan
composer deptrac
```

#### 6. Keep upgrade notes as you go

Maintain a scratch file in the branch root while working:

```bash
# UPGRADE_NOTES.md (temporary, in-branch)
## Filament 3 → 5

- `Filament\Tables\Columns\TextColumn::date()` signature changed — now requires named arg
- `HasFilters` trait removed, use `InteractsWithTable` instead
- ...
```

These notes become the version history entry in the next step.

#### 7. When all gates pass: write the permanent record

Add an entry to this document under [Version History](#version-history), summarizing what broke and why. Delete the scratch `UPGRADE_NOTES.md`.

#### 8. Merge

Merge the upgrade branch into `dev` as a regular PR. Do not squash — the individual commits are valuable history for understanding what each fix addressed.

---

## Frontend Major Upgrades

The same principles apply. Key tools:

```bash
cd frontend
bun run typecheck    # TypeScript catches API changes
bun run lint         # ESLint catches deprecated patterns
bun run test         # Behavioral regressions
```

After any API surface change on the backend side of an upgrade, regenerate the frontend client:

```bash
bun run api:generate
```

---

## Version History

### PHP 8.2 → 8.5 + Filament 3.1 → 5.0 (February 2026)

Done together (not recommended — see principles above). Main breakage areas:

- Filament resource and page class signatures changed significantly between v3 and v5: `Form`→`Schema`, `Filament\Tables\Actions\*`→`Filament\Actions\*`, layout components moved to `Filament\Schemas\Components\*`
- Panel provider: `SpatieLaravelTranslatablePlugin` (built-in) replaced by `LaraZeus\SpatieTranslatable\SpatieTranslatablePlugin` (community package maintained for v5 compatibility)
- Shield package bumped 3→4; `CategoryPolicy` was regenerated to full shield policy — the API controller's `$this->authorize()` call was intentionally removed since shield permissions are admin-panel concepts and category creation should remain open to all authenticated users
- `filament-shield` + `filament-users` + `filament-impersonate` all had major version bumps alongside Filament itself
- PHPUnit 11→12: `createMock()` semantics tightened; service stubs updated to `createStub()`
- PHP 8.5 itself was largely smooth given existing PHPStan Level 5 coverage; `bcmath` extension added explicitly

---

## Current Versions

| Dependency | Version |
|-----------|---------|
| PHP | ^8.5 |
| Laravel | ^12.0 |
| Filament | ^5.2 |
| React | ^19.2 |
| Vite | ^7.3 |
| TypeScript | ~5.9 |
