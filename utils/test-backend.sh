#!/usr/bin/env bash
# Run the backend suite against a test database that belongs to this checkout.
#
#   ./utils/test-backend.sh                          # parallel, 4 processes
#   ./utils/test-backend.sh --filter=PlacementTest   # arguments replace the default
#   ./utils/test-backend.sh --drop                   # drop this checkout's test databases
#
# phpunit.xml names one database, meo_mai_moi_testing, and every worktree reads
# the same file. Two suites running at once in two worktrees would refresh the
# same tables under each other and fail in ways that look like flaky tests. The
# primary checkout keeps that name; a worktree gets its directory suffix on it.
# A DB_DATABASE already in the environment wins, because phpunit.xml does not
# force its <env> values; that is also how CI points the suite at its service.
set -euo pipefail

toplevel="$(cd "$(dirname "$0")/.." && pwd -P)"

if [ -z "${DB_DATABASE:-}" ]; then
  DB_DATABASE=meo_mai_moi_testing
  primary="$(cd "$(git -C "$toplevel" rev-parse --path-format=absolute --git-common-dir)/.." && pwd -P)"
  if [ "$toplevel" != "$primary" ]; then
    suffix="$(basename "$toplevel")"
    suffix="${suffix#"$(basename "$primary")"-}"
    suffix="$(printf '%s' "$suffix" | tr '[:upper:]' '[:lower:]' | tr -c 'a-z0-9' '_')"
    # Postgres truncates names at 63 bytes, and parallel runs append _test_N.
    DB_DATABASE="$(printf '%s_%s' "$DB_DATABASE" "$suffix" | cut -c1-50)"
  fi
fi
export DB_DATABASE

# The same connection defaults phpunit.xml uses, overridable the same way.
export DB_HOST="${DB_HOST:-127.0.0.1}" DB_PORT="${DB_PORT:-5432}"
export DB_USERNAME="${DB_USERNAME:-user}" DB_PASSWORD="${DB_PASSWORD:-password}"

cd "$toplevel/backend"

# Laravel creates the per-process _test_N databases for a parallel run, but it
# connects to the base database to do so, which therefore has to exist first.
admin_php='
$pdo = new PDO(sprintf("pgsql:host=%s;port=%s;dbname=postgres", getenv("DB_HOST"), getenv("DB_PORT")),
    getenv("DB_USERNAME"), getenv("DB_PASSWORD"), [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
$name = getenv("DB_DATABASE");
$quote = fn ($n) => "\"" . str_replace("\"", "\"\"", $n) . "\"";
if (($argv[1] ?? "") === "drop") {
    $like = $pdo->prepare("SELECT datname FROM pg_database WHERE datname = ? OR datname LIKE ?");
    $like->execute([$name, str_replace("_", "\\_", $name) . "\\_test\\_%"]);
    foreach ($like->fetchAll(PDO::FETCH_COLUMN) as $db) {
        $pdo->exec("DROP DATABASE IF EXISTS " . $quote($db));
        echo "dropped $db\n";
    }
    exit(0);
}
$exists = $pdo->prepare("SELECT 1 FROM pg_database WHERE datname = ?");
$exists->execute([$name]);
if (! $exists->fetchColumn()) {
    $pdo->exec("CREATE DATABASE " . $quote($name));
    echo "created $name\n";
}
'

if [ "${1:-}" = "--drop" ]; then
  php -r "$admin_php" drop
  exit 0
fi

php -r "$admin_php"

# The SPA shell view is a frontend build output, so a checkout that never built
# the frontend has only its template, and every shell-meta test answers 500.
# The template's placeholder asset paths are all those tests read.
if [ ! -f resources/views/welcome.blade.php ]; then
  cp resources/views/welcome.blade.php.template resources/views/welcome.blade.php
fi

echo "Backend tests against $DB_DATABASE"

if [ "$#" -eq 0 ]; then
  set -- --parallel --processes=4
fi
exec php artisan test "$@"
