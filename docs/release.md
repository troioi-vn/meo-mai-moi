# Release Guide

Simple, repeatable steps to cut a new release and make `/api/version` reflect it.

## Version source of truth

- API version is config-driven via `config/version.php` and can be overridden by the `API_VERSION` env var.
- In Docker/dev, set it in `backend/.env`:

```
API_VERSION=vX.Y.Z
```

If `API_VERSION` is unset, the default in `config/version.php` applies.

## How to release a new version

1. Decide the new version, e.g., `v0.4.1` (SemVer: vMAJOR.MINOR.PATCH)

2. Update version and references

- Set `API_VERSION` in `backend/.env` (for local Docker runs)
- If you want the default to change too, update `backend/config/version.php`'s default
- Update frontend mocks if they assert `/api/version` (e.g., `frontend/src/mocks/handlers.ts`)
- Update tests that assert the version reads from config (`backend/tests/Feature/VersionControllerTest.php` already does this)

3. Update CHANGELOG

- Add a new section in `CHANGELOG.md` for the version with date and notable changes

4. Commit and tag

```bash
git add -A
git commit -m "chore(release): bump API version to v0.4.1 and update docs"
git tag -a v0.4.1 -m "v0.4.1 - Release description"
git push
git push origin v0.4.1  # Push ONLY the release tag, not all tags!
```

> ⚠️ **Important**: Use `git push origin <tag>` instead of `git push --tags` to avoid pushing local rollback tags created by the deploy script.

5. Verify locally (Docker)

```bash
docker compose up -d --build backend
curl -f http://localhost:8000/api/version  # Expect {"version":"v0.4.1"}
```

6. Deploy (see `docs/deploy.md`) and re-verify on the target environment

## Notes

- Prefer environment-driven versioning so different environments can show different versions if needed (e.g., staging vs prod).
- The OpenAPI example for `/api/version` may be updated as part of releases; regenerate docs with:

```bash
docker compose exec backend php artisan l5-swagger:generate
```
