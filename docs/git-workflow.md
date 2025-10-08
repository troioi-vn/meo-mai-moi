# Git Workflow Guide

Branching strategy and conflict resolution for Meo Mai Moi.

## Branch Strategy

- **`main`**: Production-ready code (protected)
- **`dev`**: Integration branch for features
- **`feature/*`**: Short-lived feature branches

**Flow**: `feature` → `dev` → `main`

## Daily Git Workflow

```bash
# Start new feature
git fetch origin && git checkout dev && git pull
git checkout -b feature/your-change

# Work and commit frequently
git add -p && git commit -m "feat: do one thing"
git push origin feature/your-change

# Keep in sync with dev
git fetch origin && git merge origin/dev
# OR (preferred for linear history)
git fetch origin && git rebase origin/dev

# Create PR to dev
gh pr create --base dev --head feature/your-change --title "feat: ..." --body "..."
```

## Pre-merge Checklist

Before merging any PR:

- [ ] All tests pass (backend + frontend)
- [ ] Code formatted: `./vendor/bin/pint` (backend), `npm run lint` (frontend)
- [ ] Rebased/merged latest target branch
- [ ] OpenAPI docs updated: `php artisan l5-swagger:generate`
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