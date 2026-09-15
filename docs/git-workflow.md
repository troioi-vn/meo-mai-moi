# Git Workflow Guide

Branching strategy and conflict resolution for Meo Mai Moi.

## Branch Strategy

- **`main`**: production. Takes pull requests only, from `dev`, through the [release runbook](./release.md)
- **`dev`**: integration branch, deployed to the public demo on every push
- **`feat/*`, `fix/*`, ...**: short-lived branches, one per feature or substantial fix, each in its own worktree

**Flow**: branch → PR into `dev` → release PR into `main`

Small changes (a one-liner, a docs edit, a copy fix) may be pushed to `dev`
directly. Anything you would want a second reader for goes through a PR.

## Daily Git Workflow

```bash
# Start a branch in a sibling worktree; the primary checkout stays on dev
./utils/worktree.sh feat/your-change
cd ../meo-mai-moi-your-change

# Work and commit
git add -p && git commit -m "feat: do one thing"

# Keep in sync with dev
git fetch origin && git rebase origin/dev

# Push and open the PR against dev (GitHub's default base is main)
git push -u origin feat/your-change
gh pr create --base dev --fill

# After it merges
cd ../meo-mai-moi
./utils/worktree.sh --remove your-change
git branch -D feat/your-change && git push origin --delete feat/your-change
```

`worktree.sh` symlinks the gitignored `.env` files and agent config from the
primary checkout, installs backend and frontend dependencies, and generates the
API client. Worktrees share the one local Docker stack, so run
`./utils/deploy.sh` and e2e from one worktree at a time. Backend suites can run
side by side through `./utils/test-backend.sh`, which gives each checkout its
own test database.

## What a PR Gets

- **CI**: `.woodpecker/test.yml` runs Pint, phpstan, deptrac, the backend suite,
  `i18n:ci`, `vp check`, and `vp test`. GitHub requires it to pass before merging.
  Pull requests from forks wait for a maintainer to approve the pipeline.
- **Review**: Purrequest, a review bot, comments on PRs into `dev` after CI
  reports. It suggests; it never pushes, approves, or merges. Release PRs into
  `main` and syncs back from `main` are not reviewed, because their code was
  reviewed on the way into `dev`.
- **E2E**: not part of the PR. The full browser suite runs after each dev
  deploy; see [E2E in CI](./e2e-ci.md).

## Pre-merge Checklist

- [ ] CI is green on the latest commit
- [ ] Purrequest's findings are fixed or answered on the PR
- [ ] Rebased on or merged with the latest `dev`
- [ ] Documentation updated if needed

## Conflict Resolution

### Simple Conflicts

```bash
git checkout feature/your-change
git fetch origin && git merge origin/dev

# Resolve conflicts, then:
git add -A && git commit -m "resolve: merge conflicts"
git push --force-with-lease
```

### Complex Conflicts (Systematic Approach)

For large conflicts, use a dedicated merge branch:

```bash
# Create merge resolution branch
git checkout -b merge/resolve-conflicts-$(date +%Y%m%d)
git merge origin/dev

# Systematic resolution:
# 1. Use 'git status' to see conflicted files
# 2. Add/Add conflicts: choose dev version
# 3. Content conflicts: manually merge both sides
# 4. Generated files: prefer dev, regenerate later

# After resolving
git add -A && git commit -m "resolve: merge conflicts with dev"

# Apply to feature branch
git checkout feature/your-change
git merge merge/resolve-conflicts-$(date +%Y%m%d)
git push --force-with-lease

# Clean up
git branch -D merge/resolve-conflicts-$(date +%Y%m%d)
```

## GitHub CLI Commands

```bash
# Create PR
gh pr create --base dev --head feature/your-change

# View PR status
gh pr status
gh pr view --web

# Merge PR
gh pr merge <number> --merge  # or --squash, --rebase

# Change PR base
gh pr edit <number> --base dev
```

## Conflict Prevention

Stay synced with the integration branch:

```bash
git checkout dev
git fetch origin && git merge origin/dev
git push

# See what's new in dev
git log dev..origin/dev --oneline
```

## Merge vs Rebase

**Merge** (simpler, keeps exact history):

```bash
git fetch origin && git merge origin/dev
```

**Rebase** (linear history, preferred):

```bash
git fetch origin && git rebase origin/dev
# If conflicts: resolve, then
git add . && git rebase --continue
```

## Common Conflict Patterns

- **Routes files**: Merge both old and new routes
- **Model files**: Combine relationships and methods
- **Factory files**: Take version with more features
- **Frontend components**: Merge prop changes and functionality
- **Generated files**: Take dev version, regenerate if needed
