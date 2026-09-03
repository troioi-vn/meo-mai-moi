# Release runbook

Written for an agent cutting a release, though a human can follow it line by
line. Use it whenever you tag a new production release (`vX.Y.Z`).

Next planned version: `v1.19.8`. Update this line when you cut a release.

## Core rules

- Releases go from `dev` into `main`.
- Always create an annotated tag on `main`.
- Git tags and GitHub Releases are separate objects. Pushing a tag does not create a GitHub Release entry.
- Never run `git push --tags`. It publishes your local `rollback-*` tags along with the real one.
- `backend/config/version.php` holds the version. `API_VERSION` overrides it at runtime.
- Pushing to `main` starts the CI/CD pipeline.

## Preflight

Run from the repo root:

```bash
git fetch --all --tags --prune
git status --short
git tag -l 'v*' --sort=version:refname | tail -n 10
git branch --show-current
```

Then confirm:

- The worktree is clean.
- You are on `dev`.
- `dev` has every change you mean to ship.
- You know the current release tag, for example `v1.19.6`.

## Build the release notes from git history

Collect the delta from the previous release tag before you touch the version:

```bash
# Replace OLD with the latest release tag
OLD=v1.19.6

git log --oneline --no-merges ${OLD}..HEAD
git log --oneline --merges ${OLD}..HEAD
git diff --stat ${OLD}..HEAD
```

If a sibling repo shipped in the same window, fold it in. `meo-mcp` and
`meo-mcp-skill` release on their own cadence but land on users through this app,
and their notes sometimes name a Meo release as the thing they are waiting on:

```bash
gh release view --json tagName,publishedAt,body -R troioi-vn/meo-mcp
gh release view --json tagName,publishedAt,body -R troioi-vn/meo-mcp-skill
```

Shape the annotated tag message as:

- One title line.
- One short summary paragraph.
- A flat bullet list of the changes a user would notice.
- An optional thank-you line in parentheses.

## Release procedure

### 1) Choose the next version

Pick the next semantic version and put it in a shell variable:

```bash
NEW=v1.19.7
```

### 2) Bump the version on `dev`

Edit `backend/config/version.php`:

```php
'api' => env('API_VERSION', 'v1.19.7'),
```

Then stamp the PWA manifest icon URLs with the new version:

```bash
cd frontend && bun run manifest:version && cd ..
```

App icons keep the same filenames from one release to the next, so an installed
PWA that cached `/icon-192.png` shows the old artwork long after you replace the
file. The `?v=` stamp forces a refetch. The script reads
`backend/config/version.php`, is safe to re-run, and touches only the six
`site*.webmanifest` files: three under `frontend/public` and three under
`backend/public`. Skip it and `vp test` fails, see `src/pwa.test.ts`.

Then move the `Next planned version` line at the top of this file to the
version after `${NEW}`, so the next person reads a live number rather than the
one you just shipped.

Commit:

```bash
git add backend/config/version.php frontend/public/site*.webmanifest backend/public/site*.webmanifest docs/release.md
git commit -m "chore(release): bump version to ${NEW}"
```

### 3) Merge `dev` into `main`

```bash
git checkout main
git pull --ff-only origin main
git merge --no-ff dev -m "Merge dev into main for ${NEW} release"
```

### 4) Create the annotated release tag

```bash
git tag -a ${NEW} -m "${NEW} - <short title>" -m "<release notes body>"
```

The tag has to land on the merge commit from step 3.

### 5) Push `main` and the release tag

```bash
git push origin main
git push origin ${NEW}
```

### 6) Create the GitHub Release entry

Publish a GitHub Release so the version shows up at
`https://github.com/<owner>/<repo>/releases`.

```bash
# Run in the repo root (without -R) so notes can be read from local annotated tag
gh release create ${NEW} \
  --verify-tag \
  --notes-from-tag \
  --title "${NEW} - <short title>" \
  --latest
```

Skip this and the tag still exists, but the Releases page keeps showing only the
older entries.

### 7) Sync `dev` with `main`

```bash
git checkout dev
git merge main --ff-only
git push origin dev
```

## Post-release verification

```bash
# Confirm tag exists and points to expected commit
git show -s --oneline ${NEW}

# Confirm GitHub Release exists for the tag
gh release view ${NEW}

# Confirm branch pointers (optional quick check)
git log --oneline --decorate -n 5 --graph
```

The local stack still runs the image built before the bump, so it reports the
previous version until the pipeline redeploys or you run `./utils/deploy.sh`.
Checking it straight after the tag push proves nothing. Once it has been rebuilt:

```bash
curl -f http://localhost:8000/api/version
# Expect: {"success":true,"data":{"version":"vX.Y.Z"}}

curl -sI http://localhost:8000/api/version | grep X-App-Version
# Expect: X-App-Version: vX.Y.Z
```

## Failure handling

- If step 3 conflicts, stop and resolve it on `dev`, then merge again. Never carry on from a half-finished merge.
- If `main` pushes but the tag push fails, retry the tag push on its own.
- If the tag goes out with the wrong message, cut a new version tag. Do not force-move a tag that is already published.
- If the `dev` push fails once `main` and the tag are out, fix it and push `dev` right away, or the branches drift.

## Release note template

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
