#!/usr/bin/env bash
# Create a sibling worktree so a second agent (or a second you) can work on
# another branch without disturbing this checkout.
#
#   ./utils/worktree.sh feat/pet-notes            # branches off origin/dev
#   ./utils/worktree.sh --remove pet-notes        # tear one down, safely
#   ./utils/worktree.sh --remove --force <name>   # ... tolerating dirty files
#
# Prefer `--remove` over `git worktree remove`: it refuses while anything is
# still running inside the worktree, and it drops the worktree's test databases.
set -euo pipefail

# Names every process whose working directory is inside $1, one "pid  cmdline"
# per line. Reads /proc rather than matching command names: the process that
# pins a worktree (a Vite server, a paratest worker) is often several execs
# below whatever was typed. A cwd cannot lie about which tree it is in. It only
# sees processes this user may read, which covers everything an agent starts.
holders() {
  local target="${1%/}" proc_dir pid cwd
  for proc_dir in /proc/[0-9]*; do
    pid="${proc_dir##*/}"
    cwd="$(readlink "$proc_dir/cwd" 2>/dev/null)" || continue
    case "$cwd" in
      "$target" | "$target"/*)
        printf '%s  %s\n' "$pid" "$(tr '\0\n\t' '   ' <"$proc_dir/cmdline" 2>/dev/null | cut -c1-100)"
        ;;
    esac
  done
}

if [ "${1:-}" = "--remove" ]; then
  shift
  force=""
  if [ "${1:-}" = "--force" ]; then
    # Only widens what git will tolerate on disk. It does not skip the holders
    # check below; that refusal is the point.
    force="--force"
    shift
  fi

  # --git-common-dir, not --show-toplevel: this has to resolve the primary
  # checkout even when run from inside a linked worktree.
  root="$(cd "$(git rev-parse --git-common-dir)/.." && pwd -P)"
  target="${1:-}"
  if [ -z "$target" ]; then
    echo "usage: utils/worktree.sh --remove [--force] <worktree-dir-or-suffix>" >&2
    exit 64
  fi
  if [ ! -d "$target" ]; then
    case "$target" in
      */*) ;;
      *) target="$(dirname "$root")/$(basename "$root")-$target" ;;
    esac
  fi
  if [ ! -d "$target" ]; then
    echo "no such worktree: $target" >&2
    exit 1
  fi
  target="$(cd "$target" && pwd -P)"
  if [ "$target" = "$root" ]; then
    echo "$target is the primary checkout, not a worktree." >&2
    exit 1
  fi

  case "$(pwd -P)/" in
    "$target"/*)
      echo "You are standing in $target." >&2
      echo "cd somewhere else first -- your own shell pins the directory." >&2
      exit 1
      ;;
  esac

  if [ ! -r /proc/self/cwd ]; then
    echo "Cannot read /proc, so this cannot tell whether anything is still" >&2
    echo "running inside $target, and refuses to guess." >&2
    exit 1
  fi

  holderLines="$(holders "$target")"
  if [ -n "$holderLines" ]; then
    # `git worktree remove` unregisters the worktree and deletes its .git file
    # before it fails on busy files, leaving a directory git no longer knows.
    echo "Still running inside $target:" >&2
    echo "$holderLines" >&2
    echo >&2
    echo "Stop these first (kill the pids above), then re-run." >&2
    exit 1
  fi

  # Best effort: the local Postgres may be down, and a leftover test database
  # costs disk, not correctness.
  (cd "$target" && ./utils/test-backend.sh --drop) || echo "(test databases not dropped; is the local db running?)" >&2

  git -C "$root" worktree remove ${force:+"$force"} "$target"
  git -C "$root" worktree prune
  echo "Removed $target"
  echo "Its branch is untouched; delete it with: git -C '$root' branch -d <branch>"
  echo "(squash-merged branches look unmerged to git and need -D)"
  exit 0
fi

branch="${1:-}"
base="${2:-dev}"

if [ -z "$branch" ]; then
  echo "usage: utils/worktree.sh <branch> [base-branch]" >&2
  echo "       utils/worktree.sh --remove [--force] <worktree-dir-or-suffix>" >&2
  exit 64
fi

root="$(cd "$(git rev-parse --git-common-dir)/.." && pwd -P)"
name="${branch##*/}"
dir="$(dirname "$root")/$(basename "$root")-$name"

if [ -e "$dir" ]; then
  echo "$dir already exists" >&2
  exit 1
fi

git -C "$root" fetch --prune origin
# --no-track: tracking origin/dev would make a bare `git push` aim at dev, which
# is the deploy branch. The first `git push -u origin <branch>` sets the right one.
git -C "$root" worktree add --no-track -b "$branch" "$dir" "origin/$base"

# Env files are gitignored, so a fresh worktree has none and artisan, Vite and
# Playwright all fail with something that looks unrelated. Symlinks, not copies:
# one set of local credentials, edited in one place.
for env_file in .env backend/.env backend/.env.e2e frontend/.env frontend/.env.local frontend/.env.e2e frontend/.env.e2e.local; do
  if [ -f "$root/$env_file" ]; then
    ln -s "$root/$env_file" "$dir/$env_file"
  fi
done

# `.claude/` and `.agents/` are gitignored too, so without these a fresh worktree
# starts with no project skills and re-prompts for every allowed command.
for agent_path in .claude/skills .claude/settings.local.json .agents/skills; do
  if [ -e "$root/$agent_path" ]; then
    mkdir -p "$dir/$(dirname "$agent_path")"
    ln -s "$root/$agent_path" "$dir/$agent_path"
  fi
done

# core.hooksPath is the relative `.vite-hooks/_`, generated by `vp config` and
# gitignored. Missing here, git finds no hook and the pre-commit `vp staged`
# silently never runs. The scripts resolve their paths from where git calls them,
# so a link to the primary checkout's copy runs this worktree's hooks.
if [ -d "$root/.vite-hooks/_" ]; then
  ln -s "$root/.vite-hooks/_" "$dir/.vite-hooks/_"
fi

# The SPA shell view is a frontend build output. Without it phpstan reports
# view('welcome') as missing and the shell-meta tests answer 500.
cp "$dir/backend/resources/views/welcome.blade.php.template" "$dir/backend/resources/views/welcome.blade.php"

# Per-worktree dependencies are deliberate: branches disagree about them.
(cd "$dir/backend" && composer install --no-interaction --no-progress)
(cd "$dir/frontend" && bun install --frozen-lockfile)
# The root lockfile lags its package.json, so a frozen root install fails on a
# clean dev checkout. --no-save installs without rewriting it in the worktree.
(cd "$dir" && bun install --no-save)

# The generated API client is gitignored and nothing in the frontend typechecks
# without it. Not fatal: a broken spec on a branch is something to fix there.
(cd "$dir" && bun run api:generate) || echo "api:generate failed; run it again in the worktree once the spec builds" >&2

compose_note=""
if ! grep -Eq '^[[:space:]]*COMPOSE_PROJECT_NAME=' "$root/.env" 2>/dev/null; then
  compose_note="
WARNING: $root/.env does not set COMPOSE_PROJECT_NAME. Docker Compose then names
the project after the directory, so ./utils/deploy.sh in this worktree would
start a second stack that fights the first for ports 8000 and 5432. Uncomment
COMPOSE_PROJECT_NAME=meo-mai-moi in that .env before deploying from here.
"
fi

cat <<EOF

Worktree ready:  $dir  (branch $branch, from origin/$base)

  cd $dir && claude

Backend tests:   ./utils/test-backend.sh
  Uses its own database, meo_mai_moi_testing_<suffix>, so suites in two
  worktrees can run at the same time.

Local stack:     ONE worktree at a time.
  The .env files are symlinks, so every worktree drives the same Compose project,
  volumes and ports. ./utils/deploy.sh here replaces what localhost:8000 serves
  with this branch; redeploy from wherever you continue afterwards. E2E runs
  against that stack, so they are one-at-a-time as well.
$compose_note
Tearing down:    ./utils/worktree.sh --remove $name
  Refuses while anything still runs inside the worktree and drops its test
  databases. Use it rather than \`git worktree remove\`.
EOF
