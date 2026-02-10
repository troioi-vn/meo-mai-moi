# Release Guide

Simple, repeatable steps to cut a new release.

## Version source of truth

- **Config file**: `backend/config/version.php` holds the default version (e.g., `v1.0.0`)
- **Environment override**: The `API_VERSION` env var overrides the config default if set
- **Git tags**: Annotated tags (`v1.0.0`) mark each release in the repository
- **Changelog**: We don't maintain a separate CHANGELOG file. Git tags and commit messages are the source of truth. `HISTORY.md` is a frozen archive of pre-1.0 changes.

## How to release a new version

### 1. Ensure `dev` is ready

All features and fixes for the release should be merged into `dev`. Verify everything works.

### 2. Bump the version on `dev`

Update the default in `backend/config/version.php`:

```php
'api' => env('API_VERSION', 'v1.1.0'),
```

This is the only file you need to change. The version test (`VersionControllerTest`) reads from config dynamically.

Commit on `dev`:

```bash
git add backend/config/version.php
git commit -m "chore(release): bump version to v1.1.0"
```

### 3. Merge `dev` into `main`

Use `--no-ff` to create a merge commit so the release boundary is visible in history:

```bash
git checkout main
git merge --no-ff dev -m "Merge dev into main for v1.1.0 release"
```

### 4. Tag the release

Create an annotated tag on `main`:

```bash
git tag -a v1.1.0 -m "v1.1.0 - Brief description of what's in this release"
```

### 5. Push

Push the branch and the tag separately. Never use `git push --tags` as it would push the local rollback tags created by the deploy script.

```bash
git push origin main
git push origin v1.1.0
```

### 6. Sync `dev` with `main`

Keep dev aligned so it includes the merge commit:

```bash
git checkout dev
git merge main --ff-only
git push origin dev
```

### 7. Verify

```bash
curl -f http://localhost:8000/api/version
# Expect: {"success":true,"data":{"version":"v1.1.0"}}
```

### 8. Deploy

See `docs/deploy.md` for deployment instructions.

## Viewing changes between releases

Since we use git tags as the source of truth, you can see what changed between any two releases:

```bash
# Summary of commits between two releases
git log --oneline v1.0.0..v1.1.0

# Full diff between releases
git diff v1.0.0..v1.1.0

# All tags (releases)
git tag -l 'v*'
```

## Notes

- The `API_VERSION` env var can override the config default per environment (e.g., staging vs prod), but in practice we just update the config file
- The deploy script creates `rollback-*` tags locally - these are not release tags and should not be pushed
- Sync dev with main after pushing:

```bash
git checkout dev
git merge main --ff-only
git push origin dev
```
