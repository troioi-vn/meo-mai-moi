#!/usr/bin/env bash
#
# Builds the index page for one e2e run and emits the notification payload.
#
#   utils/e2e-report-index.sh <run-dir> <suite-exit-status>
#
# The index is what gets linked in the notification, so it carries the headline
# counts, the known-issue annotations, and — when the run aborted before the
# reseed — the fact that the demo was left untouched.
#
# See docs/e2e-ci.md.

set -euo pipefail

RUN_DIR="${1:?run directory required}"
SUITE_STATUS="${2:-0}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
KNOWN_ISSUES="$PROJECT_ROOT/frontend/e2e/known-issues.json"
REPORT_BASE_URL="${E2E_REPORT_BASE_URL:-https://e2e.int.catarchy.space}"
REPORT_ROOT="${E2E_REPORT_ROOT:-/opt/e2e-reports/meo-mai-moi}"
KEEP_RUNS="${E2E_KEEP_RUNS:-30}"

PIPELINE="${CI_PIPELINE_NUMBER:-local}"
COMMIT_SHA="${CI_COMMIT_SHA:-}"
BRANCH="${CI_COMMIT_BRANCH:-dev}"

# Counts come from Playwright's JSON reporter rather than from parsing the list
# output. `didNotRun` is carried separately and deliberately: one failure in a
# serial describe takes the rest of the file with it, and a run reporting
# "39 passed, 3 failed" while 14 never executed reads as 93% green.
read_counts() {
    local json="$1"

    if [ ! -f "$json" ]; then
        printf '0 0 0 0 0'
        return
    fi

    python3 - "$json" <<'PY'
import json, sys

try:
    with open(sys.argv[1]) as handle:
        report = json.load(handle)
except Exception:
    print("0 0 0 0 0")
    raise SystemExit

counts = {"passed": 0, "failed": 0, "flaky": 0, "skipped": 0, "didNotRun": 0}

def walk(suite):
    for spec in suite.get("specs", []):
        for test in spec.get("tests", []):
            status = test.get("status", "")
            if status in counts:
                counts[status] += 1
            elif status == "expected":
                counts["passed"] += 1
            elif status == "unexpected":
                counts["failed"] += 1
            else:
                counts["didNotRun"] += 1
    for child in suite.get("suites", []):
        walk(child)

for suite in report.get("suites", []):
    walk(suite)

print("{passed} {failed} {flaky} {skipped} {didNotRun}".format(**counts))
PY
}

read -r PASSED FAILED FLAKY SKIPPED DID_NOT_RUN <<<"$(read_counts "$RUN_DIR/suite.json")"

DEPLOYMENT_OK="true"
[ -d "$RUN_DIR/deployment" ] || DEPLOYMENT_OK="unknown"
[ -f "$RUN_DIR/.aborted" ] && DEPLOYMENT_OK="false"

if [ "$DEPLOYMENT_OK" = "false" ]; then
    STATUS="aborted"
elif [ "$SUITE_STATUS" -ne 0 ]; then
    STATUS="failure"
else
    STATUS="success"
fi

# Green runs keep the HTML alone. Nobody opens a passing trace, and videos are
# what turn a 2 MB report into a 300 MB one.
prune_artifacts() {
    [ "$STATUS" = "success" ] || return 0

    find "$RUN_DIR" -type d -name 'trace' -prune -exec rm -rf {} + 2>/dev/null || true
    find "$RUN_DIR" -type f \( -name '*.webm' -o -name '*.zip' \) -delete 2>/dev/null || true
}

prune_old_runs() {
    local parent="$REPORT_ROOT/$BRANCH"
    [ -d "$parent" ] || return 0

    # Newest-first by mtime, drop everything past the keep count. Uses find with
    # a null-delimited sort rather than parsing ls, and swallows the empty case:
    # a `while read` that reads nothing exits non-zero, which under `set -e`
    # would take the whole script down before it reports the run.
    local stale
    while IFS= read -r stale; do
        [ -n "$stale" ] || continue
        rm -rf "$stale"
    done < <(
        find "$parent" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' 2>/dev/null \
            | sort -rn \
            | tail -n +"$((KEEP_RUNS + 1))" \
            | cut -d' ' -f2- \
            || true
    )

    return 0
}

html_escape() { sed 's/&/\&amp;/g; s/</\&lt;/g; s/>/\&gt;/g'; }

known_issue_rows() {
    [ -f "$KNOWN_ISSUES" ] || return 0

    python3 - "$KNOWN_ISSUES" <<'PY'
import html, json, sys

with open(sys.argv[1]) as handle:
    data = json.load(handle)

for entry in data.get("entries", []):
    title = entry.get("title") or "(whole file)"
    print(
        "<tr><td><code>{}</code></td><td>{}</td><td>{}</td></tr>".format(
            html.escape(entry.get("file", "")),
            html.escape(title),
            html.escape(entry.get("reason", "")),
        )
    )
PY
}

write_index() {
    local generated
    generated="$(date -u +'%Y-%m-%d %H:%M UTC')"

    local banner=""
    if [ "$STATUS" = "aborted" ]; then
        banner='<p class="banner abort"><strong>Aborted before the reseed.</strong> The deployment check failed, so the suite did not run and <strong>the demo was not wiped</strong>.</p>'
    fi

    cat > "$RUN_DIR/index.html" <<HTML
<!doctype html>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>E2E ${PIPELINE} · ${COMMIT_SHA:0:7}</title>
<style>
  :root { color-scheme: light dark; --fg:#111; --bg:#fff; --muted:#666; --line:#e3e3e3; --ok:#1a7f37; --bad:#c0362c; --warn:#9a6700; }
  @media (prefers-color-scheme: dark) {
    :root { --fg:#e8e8e8; --bg:#161616; --muted:#9a9a9a; --line:#333; --ok:#4ac26b; --bad:#ff7b72; --warn:#d29922; }
  }
  body { font:16px/1.55 system-ui,-apple-system,"Segoe UI",sans-serif; color:var(--fg); background:var(--bg);
         margin:0 auto; padding:2.5rem 1.25rem; max-width:52rem; }
  h1 { font-size:1.5rem; margin:0 0 .25rem; }
  .sub { color:var(--muted); margin:0 0 2rem; font-size:.9rem; }
  .banner { padding:.9rem 1.1rem; border-radius:8px; margin:0 0 1.75rem; }
  .banner.abort { background:rgba(192,54,44,.12); border:1px solid var(--bad); }
  .counts { display:flex; flex-wrap:wrap; gap:1.5rem; margin:0 0 2rem; padding:0; list-style:none; }
  .counts li { min-width:5rem; }
  .counts b { display:block; font-size:1.75rem; font-weight:650; }
  .ok b { color:var(--ok); } .bad b { color:var(--bad); } .warn b { color:var(--warn); }
  .counts span { color:var(--muted); font-size:.8rem; text-transform:uppercase; letter-spacing:.04em; }
  a.report { display:inline-block; margin:0 .75rem .75rem 0; padding:.6rem 1rem;
             border:1px solid var(--line); border-radius:8px; text-decoration:none; color:inherit; }
  a.report:hover { border-color:var(--muted); }
  table { border-collapse:collapse; width:100%; font-size:.85rem; margin-top:.5rem; }
  th,td { text-align:left; padding:.55rem .6rem; border-bottom:1px solid var(--line); vertical-align:top; }
  th { color:var(--muted); font-weight:600; }
  code { font-size:.85em; }
  h2 { font-size:1rem; margin:2.5rem 0 .25rem; }
  .note { color:var(--muted); font-size:.85rem; }
</style>

<h1>E2E run ${PIPELINE}</h1>
<p class="sub">${BRANCH} · ${COMMIT_SHA:0:12} · ${generated} · status <strong>${STATUS}</strong></p>

${banner}

<ul class="counts">
  <li class="ok"><b>${PASSED}</b><span>passed</span></li>
  <li class="bad"><b>${FAILED}</b><span>failed</span></li>
  <li class="warn"><b>${FLAKY}</b><span>flaky</span></li>
  <li><b>${SKIPPED}</b><span>skipped</span></li>
  <li class="warn"><b>${DID_NOT_RUN}</b><span>did not run</span></li>
</ul>

<a class="report" href="./suite/index.html">Full suite report &rarr;</a>
<a class="report" href="./deployment/index.html">Deployment check &rarr;</a>

<h2>Known issues</h2>
<p class="note">Expected failures, excluded from the change flag that decides whether a
notification means a regression. Sourced from <code>frontend/e2e/known-issues.json</code>.</p>
<table>
  <tr><th>File</th><th>Test</th><th>Why</th></tr>
  $(known_issue_rows)
</table>
HTML
}

# The notification always fires, but n8n needs to know whether this run says
# anything new. Known issues are already expected, so the signal worth waking
# someone for is a change of state, not a nonzero failure count.
write_payload() {
    local latest="$REPORT_ROOT/$BRANCH/latest.json"
    local previous="unknown"

    if [ -f "$latest" ]; then
        previous="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1])).get("status","unknown"))' "$latest" 2>/dev/null || echo unknown)"
    fi

    local changed="true"
    [ "$previous" = "$STATUS" ] && changed="false"

    cat > "$RUN_DIR/payload.json" <<JSON
{
  "event": "e2e",
  "phase": "finish",
  "status": "${STATUS}",
  "source": "woodpecker",
  "repo": "${CI_REPO:-troioi-vn/meo-mai-moi}",
  "branch": "${BRANCH}",
  "pipeline_number": "${PIPELINE}",
  "commit_sha": "${COMMIT_SHA}",
  "report_url": "${REPORT_BASE_URL}/${BRANCH}/${PIPELINE}-${COMMIT_SHA:0:7}/",
  "passed": ${PASSED},
  "failed": ${FAILED},
  "flaky": ${FLAKY},
  "skipped": ${SKIPPED},
  "did_not_run": ${DID_NOT_RUN},
  "deployment_check": "${DEPLOYMENT_OK}",
  "previous_status": "${previous}",
  "changed": ${changed},
  "finished_at_utc": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
JSON

    mkdir -p "$(dirname "$latest")"
    cp "$RUN_DIR/payload.json" "$latest"
}

prune_artifacts
write_index
write_payload
prune_old_runs

printf 'Report: %s/%s/%s-%s/\n' "$REPORT_BASE_URL" "$BRANCH" "$PIPELINE" "${COMMIT_SHA:0:7}"
