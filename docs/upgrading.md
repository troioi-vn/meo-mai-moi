# Upgrading Dependencies

Dependency upgrades are part of normal maintenance, but not all upgrades should be treated the same way.

- Patch and minor updates are usually routine.
- Major updates are deliberate engineering work.
- The important distinction is not only "how do we install updates?" but also "how do we notice versions that our current constraints intentionally do not allow?"

This project uses two ecosystems:

- Backend: Composer in `backend/composer.json`
- Frontend: Bun-managed dependencies in `frontend/package.json`, with Vite+ as the toolchain entrypoint

For the frontend, Bun and Vite+ now have different roles:

- Bun owns dependency resolution, installs, lockfile updates, and `outdated`/`update` checks.
- Vite+ owns the dev/build/test/lint execution surface (`vp dev`, `vp build`, `vp check`, `vp test`).

Most direct dependencies use SemVer ranges such as `^12.0` or `^7.3`. That is good for stability, but it also means `composer update` and frontend package-manager updates will usually stop at the newest version inside the current major line. They do not automatically move us to a new major version.

## Upgrade Tiers

| Type  | Example          | Usual handling                        |
| ----- | ---------------- | ------------------------------------- |
| Patch | `1.2.3 -> 1.2.4` | Routine update                        |
| Minor | `1.2 -> 1.3`     | Routine update with full verification |
| Major | `1.x -> 2.0`     | Planned upgrade branch                |

Even patch and minor updates can break in practice, so every upgrade should be followed by the relevant tests and checks.

## Execution Modes

There are two useful ways to run this protocol:

- Rehearsal mode: non-mutating checks that prove the process works before touching lockfiles.
- Real update mode: actually change dependencies, lockfiles, and any generated artifacts triggered by package-manager hooks.

Use rehearsal mode first when you want a safe signal about whether the current branch is healthy enough for upgrade work.

### Rehearsal Mode

```bash
cd frontend && bun update --dry-run
cd backend && composer update --dry-run
```

Then run the same verification suite you would use after a real update.

## Routine Updates

### Frontend

These commands are mutating. They update the lockfile and installed dependency graph.

Run from the repository root or from `frontend/`:

```bash
cd frontend
bun update
```

If the goal is specifically to refresh the frontend toolchain itself, check the Vite+ packages too:

```bash
cd frontend
bun update vite-plus vite vitest
```

Then verify:

```bash
vp check
vp test
```

### Backend

These commands are mutating. They may also trigger Composer post-update hooks that regenerate published assets.

Run from `backend/`:

```bash
cd backend
composer update
```

In this repo, `composer update` runs Laravel and Filament post-update hooks. Even when the lockfile does not change, those hooks can republish generated assets under `backend/public/`. Review those diffs separately from actual dependency changes.

Then verify:

```bash
php artisan test --parallel
composer phpstan
composer deptrac
```

If `php artisan test --parallel` fails locally with PostgreSQL errors like `out of shared memory` or `max_locks_per_transaction`, treat that as a local database-capacity issue first, not automatic evidence of an upgrade regression. For upgrade debugging, either raise the Postgres limit or rerun the backend tests without parallelism to separate environment pressure from application breakage.

## How To Detect New Major Versions

This is the part people often miss.

When a dependency is constrained with `^`, the package manager will usually not upgrade across a major boundary during a normal update. So we need a separate "major scan".

### Composer

Composer has first-class support for this:

```bash
cd backend
composer outdated --direct --major-only
```

This shows direct dependencies where a newer major exists.

Useful variants:

```bash
composer outdated --direct
composer outdated --direct --format=json
```

Interpretation:

- `composer update` answers: "What can we safely install within current constraints?"
- `composer outdated --major-only` answers: "What new major lines exist beyond our current constraints?"

### Bun

Bun does not have a dedicated `--major-only` flag like Composer, but `bun outdated` gives the information we need:

```bash
cd frontend
bun outdated
```

The output includes:

- `Current`: installed version
- `Update`: newest version allowed by the current range
- `Latest`: newest version published

After the Vite+ migration, pay particular attention to the toolchain packages in `frontend/package.json`:

- `vite-plus`
- `vite` (aliased to `@voidzero-dev/vite-plus-core`)
- `vitest` (aliased to `@voidzero-dev/vite-plus-test`)

Interpretation:

- If `Update` and `Latest` are the same, your current range can already reach the latest release.
- If `Update` is behind `Latest`, a newer version exists outside your current allowed range.
- In practice, that often means a new major is available and your `^` range is intentionally blocking it.

Example:

```text
| Package       | Current | Update  | Latest  |
| lucide-react  | 0.562.0 | 0.562.0 | 0.577.0 |
```

That means a newer release exists, but `bun update` will not take it with the current constraint.

## Recommended Cadence

Use two different rhythms:

### 1. Routine dependency maintenance

Do this regularly:

- `cd frontend && bun update`
- `cd backend && composer update`
- Run the normal verification suite

### 2. Major-version scan

Do this on a schedule, for example once a month:

```bash
cd frontend && bun outdated
cd backend && composer outdated --direct --major-only
```

This keeps major upgrades visible without forcing them into every routine maintenance pass.

## Major Upgrade Process

When we decide to take a major version, treat it as a small project.

### Principles

- Upgrade one major dependency at a time when feasible.
- Do not combine unrelated major upgrades in one branch unless there is a strong reason.
- Read the official upgrade guide before changing code.
- Start from a clean baseline with passing tests and analysis.
- Prefer small, reviewable commits over one giant "upgrade everything" diff.

### Workflow

#### 1. Read the upstream guide

Examples:

- Laravel: https://laravel.com/docs/12.x/upgrade
- Filament: https://filamentphp.com/docs/5.x/upgrade-guide
- React ecosystem packages: release notes / migration docs for the specific package

#### 2. Establish a clean baseline

Do the safe rehearsal first so you know whether the branch is already unstable before you mutate anything.

```bash
# Backend
cd backend
php artisan test --parallel
composer phpstan
composer deptrac

# Frontend
cd ../frontend
bun update --dry-run
vp check
vp test
```

If the baseline is already broken, fix that first. Upgrade work is much harder to reason about on top of existing failures.

#### 3. Create a dedicated branch

Example:

```bash
git checkout -b upgrade/filament-6
```

#### 4. Upgrade the dependency explicitly

Examples:

```bash
# Composer
cd backend
composer require filament/filament:^6.0 --update-with-dependencies

# Bun
cd ../frontend
bun add some-package@latest
```

For Bun packages, you may want to set the exact target major instead of blindly taking `latest` if upstream has already moved more than one major ahead.

For Vite+ toolchain upgrades, prefer explicit package names so the aliasing stays obvious in review:

```bash
cd frontend
bun add -d vite-plus@latest vite@npm:@voidzero-dev/vite-plus-core@latest vitest@npm:@voidzero-dev/vite-plus-test@latest
```

After the real update command finishes, inspect lockfile and generated-asset diffs before assuming every changed file represents a real behavioral change.

#### 5. Fix breakages iteratively

Suggested order:

1. Static analysis and type checks
2. Automated tests
3. Manual smoke testing of the affected flows

#### 6. Regenerate artifacts when relevant

If backend API signatures changed:

```bash
cd frontend
vp run api:generate
```

#### 7. Document what changed

If the upgrade taught us project-specific lessons, add them to this document so the next upgrade starts from real local knowledge, not memory.

## What Not To Assume

- A normal `update` command does not mean "we are fully up to date".
- A green lockfile refresh does not mean "no major upgrades exist".
- SemVer helps, but it does not remove the need for tests.
- Some ecosystems, especially frontend tooling, occasionally ship breaking behavior in minor releases. Verify, do not trust blindly.

## Version History

### PHP 8.2 -> 8.5 and Filament 3.1 -> 5.0 (February 2026)

This was completed together, which worked, but is not the preferred pattern for future upgrades.

Main breakage areas:

- Filament resource and page APIs changed significantly between v3 and v5: `Form` -> `Schema`, actions moved namespaces, and layout/schema components shifted
- `SpatieLaravelTranslatablePlugin` was replaced by `LaraZeus\\SpatieTranslatable\\SpatieTranslatablePlugin` for Filament v5 compatibility
- `filament-shield`, `filament-users`, and `filament-impersonate` all required major-version alignment with Filament itself
- PHPUnit 11 -> 12 tightened some mocking behavior and required test updates
- PHP 8.5 itself was relatively smooth thanks to existing static analysis coverage

## Current Versions

| Dependency | Version |
| ---------- | ------- |
| PHP        | ^8.5    |
| Laravel    | ^12.0   |
| Filament   | ^5.2    |
| React      | ^19.2   |
| Vite+      | latest  |
| TypeScript | ~6.0    |
