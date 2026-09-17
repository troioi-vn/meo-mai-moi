# Release runbook

Written for an agent cutting a release, though a human can follow it line by
line. Use it whenever you tag a new production release (`vX.Y.Z`).

Next planned version: `v1.19.10`. Update this line when you cut a release.

## Core rules

- Releases go from `dev` into `main`.
- Always create an annotated tag on `main`.
- Git tags and GitHub Releases are separate objects. Pushing a tag does not create a GitHub Release entry.
- Never run `git push --tags`. It publishes your local `rollback-*` tags along with the real one.
- `backend/config/version.php` holds the version. `API_VERSION` overrides it at runtime.
- Merging to `main` starts the pipeline at once: the test workflow runs first,
  and production deploys only if it passes.
- `main` requires a pull request, including for administrators, and GitHub
  requires the CI check on it. Small fixes may go straight to `dev`; anything
  substantial reaches `dev` through a PR (see `AGENTS.md`).

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
gh pr create --base main --head dev --title "Release ${NEW}" --body-file /path/to/release-notes.md
# Review the PR and merge through GitHub; do not bypass branch protection.
gh pr merge <release-pr-number> --merge
git fetch origin main
git checkout main
git merge --ff-only origin/main
```

### 4) Create the annotated release tag

```bash
git tag -a ${NEW} -m "${NEW} - <short title>" -m "<release notes body>"
```

The tag has to land on the merge commit from step 3.

### 5) Push the release tag and verify the deployment

```bash
git push origin ${NEW}
```

The merge already started the main pipeline. Wait for the test workflow and
then the production deploy to finish on the merge commit, and verify the live
site before publishing the GitHub Release. A red test workflow means production
was not deployed: fix forward on `dev` and release again.

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
gh pr create --base dev --head main --title "Sync ${NEW} release into dev" --body "Bring the released main commit back into dev."
gh pr merge <sync-pr-number> --merge
git checkout dev
git pull --ff-only origin dev
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

- If the release PR conflicts, resolve through a branch and PR into `dev`, then retry the release PR.
- If the release PR merges but the tag push fails, retry the tag push on its own.
- If the tag goes out with the wrong message, cut a new version tag. Do not force-move a tag that is already published.
- If the sync PR fails after release, resolve it through a PR rather than bypassing protection.

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
