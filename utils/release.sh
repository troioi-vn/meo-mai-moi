#!/usr/bin/env bash
# Mechanical parts of a production release. The judgement parts (release
# notes, the go-ahead for production) live in the meo-mai-moi-release skill.
#
# Versions are calendar-based: vYYYY.M.N, N counting releases within the month.
#
#   ./utils/release.sh next                 print "<OLD> <NEW>"
#   ./utils/release.sh preflight            check the checkout is ready to release
#   ./utils/release.sh notes                draft notes from merged PRs since OLD
#   ./utils/release.sh bump <NEW>           bump version.php on dev, push, wait for dev
#   ./utils/release.sh e2e                  wait for the full e2e run on origin/dev
#   ./utils/release.sh tag <NEW> <NOTES> <PR>  tag the PR's merge commit, wait, publish
#
# bump and tag need RELEASE_DEV_URL and RELEASE_PROD_URL (site origins);
# e2e needs RELEASE_E2E_URL (the report origin).
#
# CI green, dev deployed and e2e green are separate facts. e2e exits 1 on
# anything but a green run for the exact commit, and says which it saw.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION_FILE="$ROOT/backend/config/version.php"
WAIT_TIMEOUT="${RELEASE_WAIT_TIMEOUT:-1800}"
cd "$ROOT"

die() { echo "release: $*" >&2; exit 1; }

latest_tag() { git tag -l 'v*' --sort=version:refname | tail -n 1; }

next_version() {
    local prefix last
    prefix="v$(date +%Y).$(date +%-m)"
    last=$(git tag -l "$prefix.*" --sort=version:refname | tail -n 1)
    echo "$prefix.$(( ${last:+${last##*.}} + 1 ))"
}

check_version() {
    [[ "$1" =~ ^v[0-9]{4}\.([1-9]|1[0-2])\.[1-9][0-9]*$ ]] || die "not a vYYYY.M.N version: $1"
    git rev-parse -q --verify "refs/tags/$1" >/dev/null && die "tag $1 already exists"
    return 0
}

require_url() { [ -n "${!1:-}" ] || die "$1 is not set"; }

# Polls <origin>/api/version until it reports the expected version.
wait_for_version() {
    local origin="$1" want="$2" deadline=$(( SECONDS + WAIT_TIMEOUT )) got=""
    echo "Waiting for $origin to report $want ..."
    while (( SECONDS < deadline )); do
        got=$(curl -fsS "$origin/api/version" 2>/dev/null | sed -n 's/.*"version":"\([^"]*\)".*/\1/p' || true)
        if [ "$got" = "$want" ]; then
            echo "$origin reports $want"
            return 0
        fi
        sleep 20
    done
    die "$origin still reports '${got:-nothing}' after ${WAIT_TIMEOUT}s"
}

cmd_preflight() {
    git fetch --all --tags --prune --quiet
    [ "$(git branch --show-current)" = dev ] || die "not on dev"
    [ -z "$(git status --porcelain)" ] || die "working tree is not clean"
    [ "$(git rev-parse dev)" = "$(git rev-parse origin/dev)" ] || die "dev does not match origin/dev"
    if [ -n "${RELEASE_PROD_URL:-}" ]; then
        local live
        live=$(curl -fsS "$RELEASE_PROD_URL/api/version" | sed -n 's/.*"version":"\([^"]*\)".*/\1/p')
        [ "$live" = "$(latest_tag)" ] || echo "warning: production reports $live, latest tag is $(latest_tag)" >&2
    fi
    echo "Ready: $(latest_tag) -> $(next_version)"
}

cmd_notes() {
    local old new
    old=$(latest_tag)
    new=$(next_version)
    gh api "repos/{owner}/{repo}/releases/generate-notes" \
        -f tag_name="$new" -f target_commitish=dev -f previous_tag_name="$old" --jq .body
}

cmd_bump() {
    local new="${1:-}"
    check_version "$new"
    require_url RELEASE_DEV_URL
    [ "$(git branch --show-current)" = dev ] || die "not on dev"
    sed -i -E "s/('api' => env\('API_VERSION', ')[^']*('\))/\1$new\2/" "$VERSION_FILE"
    grep -q "'$new'" "$VERSION_FILE" || die "could not set the version in $VERSION_FILE"
    git add "$VERSION_FILE"
    git commit -m "chore(release): bump version to $new"
    git push origin dev
    wait_for_version "$RELEASE_DEV_URL" "$new"
}

# Waits for <report>/dev/latest.json to describe origin/dev, then reports it.
cmd_e2e() {
    local sha deadline=$(( SECONDS + WAIT_TIMEOUT )) json="" report_sha=""
    require_url RELEASE_E2E_URL
    git fetch --quiet origin dev
    sha=$(git rev-parse origin/dev)
    echo "Waiting for the e2e run on ${sha:0:12} ..."
    while :; do
        json=$(curl -fsS "$RELEASE_E2E_URL/dev/latest.json" 2>/dev/null || true)
        report_sha=$(jq -r '.commit_sha // empty' <<<"$json" 2>/dev/null || true)
        [ "$report_sha" = "$sha" ] && break
        (( SECONDS >= deadline )) && break
        sleep 30
    done
    [ "$report_sha" = "$sha" ] || die "no e2e result for ${sha:0:12} after ${WAIT_TIMEOUT}s (latest is ${report_sha:0:12}); the run may have been skipped"
    jq -r '"e2e \(.status): \(.passed) passed, \(.failed) failed, \(.flaky) flaky, \(.skipped) skipped, \(.did_not_run) did not run\n\(.report_url)"' <<<"$json"
    [ "$(jq -r .status <<<"$json")" = success ] && [ "$(jq -r '.failed + .flaky + .did_not_run' <<<"$json")" = 0 ]
}

# Tags the release PR's merge commit, not whatever main points at by then.
cmd_tag() {
    local new="${1:-}" notes="${2:-}" pr="${3:-}" title sha
    check_version "$new"
    [ -f "$notes" ] || die "notes file not found: $notes"
    [ -n "$pr" ] || die "release PR number required"
    require_url RELEASE_PROD_URL
    sha=$(gh pr view "$pr" --json state,baseRefName,mergeCommit \
        --jq 'select(.state == "MERGED" and .baseRefName == "main") | .mergeCommit.oid')
    [ -n "$sha" ] || die "PR $pr is not a merged PR into main"
    git fetch --quiet origin main
    git merge-base --is-ancestor "$sha" origin/main || die "${sha:0:12} is not on origin/main"
    git show "$sha:backend/config/version.php" | grep -q "'$new'" || die "${sha:0:12} does not carry $new"
    title="${RELEASE_TITLE:-$new}"
    { echo "$title"; echo; cat "$notes"; } | git tag -a "$new" "$sha" -F -
    echo "Tagged $new on ${sha:0:12}"
    # This tag only: --tags would also publish local rollback-* tags.
    git push origin "refs/tags/$new"
    wait_for_version "$RELEASE_PROD_URL" "$new"
    gh release create "$new" --verify-tag --latest --title "$title" --notes-file "$notes"
}

case "${1:-}" in
    next) echo "$(latest_tag) $(next_version)" ;;
    preflight) cmd_preflight ;;
    notes) cmd_notes ;;
    bump) cmd_bump "${2:-}" ;;
    e2e) cmd_e2e ;;
    tag) cmd_tag "${2:-}" "${3:-}" "${4:-}" ;;
    *) sed -n '2,18p' "$0" | sed 's/^# \{0,1\}//'; exit 1 ;;
esac
