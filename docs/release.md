# Release Runbook (Agent-First)

This guide is optimized for automated/AI-assisted releases.

Use this document when cutting a new production release tag (`vX.Y.Z`).

## Core rules

- Release source branch is `dev`.
- Release target branch is `main`.
- Always create an annotated tag on `main`.
- Never run `git push --tags` (it may publish local `rollback-*` tags).
- Version source of truth is `backend/config/version.php` (`API_VERSION` env can override at runtime).
- CI/CD starts automatically after push; this doc covers git + versioning only.

## Preflight

Run from repo root:

```bash
git fetch --all --tags --prune
git status --short
git tag -l 'v*' --sort=version:refname | tail -n 10
git branch --show-current
```

Checklist:

- Worktree is clean.
- You are on `dev`.
- `dev` contains all intended changes.
- You identified current release tag (for example `v1.4.2`).

## Build release notes from git history

Before bumping version, collect the delta from the previous release tag:

```bash
# Replace OLD with the latest release tag
OLD=v1.4.2

git log --oneline --no-merges ${OLD}..HEAD
git log --oneline --merges ${OLD}..HEAD
git diff --stat ${OLD}..HEAD
```

Then draft a concise annotated tag message:

- 1 title line.
- 1 short summary paragraph.
- Flat bullet list of meaningful user-facing changes.
- Optional final thank-you line in parentheses.

## Release procedure

### 1) Choose next version

Pick the next semantic version (`vX.Y.Z`) and export it:

```bash
NEW=v1.4.3
```

### 2) Bump version on `dev`

Edit `backend/config/version.php`:

```php
'api' => env('API_VERSION', 'v1.4.3'),
```

Commit:

```bash
git add backend/config/version.php
git commit -m "chore(release): bump version to ${NEW}"
```

### 3) Merge `dev` into `main`

```bash
git checkout main
git pull --ff-only origin main
git merge --no-ff dev -m "Merge dev into main for ${NEW} release"
```

### 4) Create annotated release tag

```bash
git tag -a ${NEW} -m "${NEW} - <short title>" -m "<release notes body>"
```

Tag should be on the merge commit from step 3.

### 5) Push `main` and release tag

```bash
git push origin main
git push origin ${NEW}
```

### 6) Sync `dev` with `main`

```bash
git checkout dev
git merge main --ff-only
git push origin dev
```

## Post-release verification

```bash
# Confirm tag exists and points to expected commit
git show -s --oneline ${NEW}

# Confirm branch pointers (optional quick check)
git log --oneline --decorate -n 5 --graph
```

If local app is running, verify API version wiring:

```bash
curl -f http://localhost:8000/api/version
# Expect: {"success":true,"data":{"version":"vX.Y.Z"}}

curl -sI http://localhost:8000/api/version | grep X-App-Version
# Expect: X-App-Version: vX.Y.Z
```

## Failure handling

- If merge conflicts happen in step 3, stop and resolve on `dev` first; do not continue from a partial merge.
- If `git push origin main` succeeds but tag push fails, retry only tag push.
- If tag push succeeds with wrong message, create a new version tag (preferred) instead of force-moving an existing published tag.
- If `dev` push fails after successful `main` + tag push, fix and push `dev` as soon as possible to keep branches aligned.

## Copy/paste release note template

```text
vX.Y.Z - <short title>

<One paragraph summary of intent and impact.>

- <Change 1>
- <Change 2>
- <Change 3>

(Optional thanks line in parentheses.)
```

## Useful commands

```bash
# Latest release tag
git tag -l 'v*' --sort=-creatordate | head -n 1

# Commits in upcoming release
git log --oneline <old-tag>..HEAD

# Files changed in upcoming release
git diff --name-only <old-tag>..HEAD
```
