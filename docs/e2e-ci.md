# E2E in CI

How the browser suite runs automatically after a development deployment, and
why it is built the way it is.

For writing tests, see the [E2E Testing Guide](./e2e-testing-guide.md). For
what each flow currently covers, see the [E2E Coverage Map](./e2e-coverage.md).

## The model: a deploy is a demo refresh

The development site is a public demo. It is embedded in an iframe on the
project landing page and logged in as a shared demo account, so anyone on the
internet can click through it and change things. That is deliberate, and it
creates one problem: the demo needs reseeding, or stranger edits accumulate
until it stops looking like a working product.

The e2e suite already wants a freshly seeded database. The demo already wants
one. They are the same requirement, so they are served by the same command.

**Every development deployment wipes and reseeds the demo, then runs the full
browser suite against it.** Test byproducts — new pets, weights, health records
— land on public read routes, so the demo shows recent activity instead of a
static fixture set.

This does not apply to production. See [Safety](#safety).

## Order of operations

The deployment itself is never blocked. Everything below happens *after* nginx
has switched to the new slot, so time to live is unchanged.

1. **Deployment check**, in two halves. On the host, the runner asks the active
   slot's container which image it runs and compares it to the deployed tag —
   this is the authoritative half, because `/api/version` reports a release tag
   that does not move per development commit. Then `deployment.spec.ts` checks
   what only an external client can see: TLS, routing, the app shell, and the
   real manifest.
   *If either half fails the run aborts here.* The demo is not wiped, the suite
   does not run, and the notification says the switch did not land. There is no
   reason to clear a public demo to test an application that is not the commit
   you shipped.
2. **Maintenance page on** — visitors get a "demo is preparing" page.
3. **Reseed** — `php artisan demo:reseed`.
4. **Full suite** — Playwright against the live development URL.
5. **Maintenance page off**, reports published, notification sent.

## The runner

One script, `utils/e2e-run.sh`, serves both local development and CI:

```bash
utils/e2e-run.sh --target=local               # compose stack, reseeds by default
utils/e2e-run.sh --target=local --no-reseed   # keep whatever is in the local db
utils/e2e-run.sh --target=dev --grep offline  # one spec against dev, no wipe
utils/e2e-run.sh --target=dev --reseed --yes  # wipes the demo, then runs
```

Two properties are worth stating explicitly, because both were mistakes waiting
to happen:

- **`--reseed` is a separate flag from running tests.** Most debugging is "run
  one spec against whatever is there now," which is non-destructive and fast.
  Wiping requires typing the flag that wipes.
- **Local and CI share the runner and the reseed command.** A second
  implementation of "set up the database" would drift from the first, and the
  symptom would be a suite that passes locally and fails in CI for reasons
  nobody can reproduce.

Local runs use the `https` compose profile, so they hit `https://localhost`
rather than plain HTTP. Cookie behaviour, service worker registration, and
mixed-content rules then match the deployed environment, which is where that
class of failure would otherwise surface first.

## `demo:reseed`

Wraps `migrate:fresh --force` and `E2ETestingSeeder`, then writes the sentinel
described below.

The demo does not get a curated "polish" pass. It looks alive because the suite
itself leaves realistic data behind: specs draw names, breeds, notes, and
weights from `e2e/utils/demo-data.ts` rather than
inventing `Test Pet ${Date.now()}`. Because pet and health read routes are
public, whatever the tests write is what demo visitors see. The fixture pool
exists so the presentable path is also the convenient one.

### Safety

This command drops every table. It ships in the same repository and the same
image that deploys production, so it is guarded in four independent layers.
Three are configuration checks; the fourth is not, because configuration is
exactly what fails in the scenario worth defending against.

| Layer | Mechanism |
|---|---|
| Framework | `DB::prohibitDestructiveCommands()` when the app is production — blocks `migrate:fresh`, `migrate:refresh`, `migrate:reset`, and `db:wipe` even with `--force` |
| Existence | The command is not registered outside development. On production, `php artisan demo:reseed` reports that the command is not defined |
| Configuration | `APP_ENV` is not production, `APP_URL` is in an explicit allowlist, and `DEMO_RESEED_ALLOWED=true` is present — all required, all failing closed. The runner separately refuses `--reseed` unless the resolved base URL and deploy host both match development |
| Data | The seeder writes a `demo_environment` sentinel into `settings`. `demo:reseed` refuses any database that does not already carry it |

The configuration layers fail closed because `config/app.php` defaults `APP_ENV`
to `production` — a missing or mangled environment reads as production and is
refused.

One operational consequence: deployed environments run with a cached config, so
these guards read the cache rather than the process environment. Editing
`DEMO_RESEED_ALLOWED` in `.env` has no effect until the config cache is rebuilt,
which the deploy does anyway. It also means `APP_ENV=production php artisan ...`
does not simulate production against a deployed container — the cache wins, and
the command will appear to be registered when on a real production host it is
not. Clear the config cache first if you want to check the guards by hand.

The data sentinel is the one that survives total configuration confusion. A
production database has never been seeded by this command, so it does not carry
the sentinel, so the command refuses regardless of what any environment file,
deploy script, or SSH target says. Bootstrapping a new development database
takes a one-time `--initialize`.

## Maintenance window

While the demo is being wiped and tested, visitors would otherwise see failing
requests and forms being filled by nobody. They would also be able to mutate
data mid-run, which makes the suite nondeterministic.

nginx checks for a marker file per request:

```nginx
if (-f /var/www/dev-maintenance/on) { return 503; }
error_page 503 /maintenance.html;
```

No config rewrite and no reload — the A/B slot switch already rewrites that
vhost, and two scripts editing one file minutes apart is a race worth not
having. Loopback is exempt, and the test runner connects over loopback with the
public hostname pinned, so it reaches the real application while everyone else
gets the notice.

A stuck maintenance page is worse than the mess it prevents, so removal is
guaranteed three ways: an `EXIT` trap, a hard runtime cap on the run, and an
independent timer that deletes any marker older than twenty minutes.

A run that dies between the wipe and the end of seeding is caught by a
completion marker; the trap re-runs `demo:reseed` on the way out.

## Reports and notification

Each run publishes two HTML reports — the deployment check and the suite — plus
a generated index page carrying headline counts, known-issue annotations, skip
notices, and, when the deployment check aborted, the fact that the demo was left
untouched. Traces and videos are kept for failed runs only; green runs keep the
HTML alone. The last thirty runs are retained.

Measured on dev: a full run takes 10-12 minutes, not the ~4 it takes locally,
because every request is real HTTPS and CI retries each failure twice. The
detached unit's ceiling is 30 minutes, set from that measurement.

The notification is a distinct kind of message, not a deploy result. It fires on
every run and carries the full breakdown —
passed, failed, flaky, skipped, and **did-not-run** as separate fields. That last
one matters: a suite reporting 39 passed and 3 failed looks 93% green while a
quarter of it never executed, because one failure in a `serial` describe block
takes the rest of the file with it. Timeouts and aborts notify too. In a
non-blocking system, silence is indistinguishable from success.

The n8n workflow branches on `event == "e2e"` before its deploy templates. That
branch exists because without it an e2e payload falls through to the deploy
finished/failed message and announces "Deploy failed" after a deploy that
succeeded - which is how you teach someone to ignore a notification channel.
Three states are distinguished: green, finished-with-failures, and aborted. The
last one says the demo was *not* wiped, which is the thing worth knowing on a
bad day.

`e2e/known-issues.json` lists tests that are expected to fail, each with a
reason. They are annotated in the report and excluded from the flag that decides
whether a notification represents a change. Without it the alert is noise from
the first day and muted by the second.

## Concurrency

Runs are serialised with a non-blocking lock. A second deployment while a run is
in flight skips its own run and logs the skip in the report index. Waiting would
produce a stale result for a superseded image; running both would double the
footprint on the deploy host.

The skipped deployment still gets its demo refreshed, because the run already in
flight is doing exactly that.

## Advisory, for now

The suite does not gate deployment. It reports.

That is a deliberate starting position rather than a permanent one: the suite is
currently red, and a gate on a red suite blocks every deployment from the first
day, which teaches everyone to bypass it.

**Promotion criterion: ten consecutive green runs.** At that point
the deployment script splits so the slot switch happens after the tests, and a
red suite holds the switch. The maintenance page is what makes this possible —
without it, visitors mutating data mid-run would make the suite
nondeterministic, and gating on a nondeterministic signal blocks deployments for
reasons nobody can reproduce.

Entries in `known-issues.json` are what stand between here and there.

## Enabling it

The post-deploy run is **off by default**. `utils/deploy-ci-dev-ab.sh` only
launches it when `E2E_AFTER_DEPLOY=true` is set in the deployment's root `.env`,
because the run depends on host-side pieces that do not travel in this
repository. Turning it on before those exist would point a database wipe at a
public demo with no maintenance page and no report to read afterwards.

Prerequisites on the deployment host, in order:

1. `DEMO_RESEED_ALLOWED=true` in `backend/.env`. Absent by default; see
   `backend/.env.example`.
2. A MailHog reachable by the app, with `E2EEmailConfigurationSeeder` pointing
   at it. Roughly a third of the suite depends on reading an inbox.
3. `utils/e2e-report-nginx.sh install` — creates the report root, installs the
   internal report vhost, drops the maintenance page in place, and enables the
   timer that clears a stale maintenance marker.
4. A DNS record for the report hostname.
5. One `utils/e2e-run.sh --target=dev --initialize --yes` by hand. The sentinel
   guard refuses a database it has never seeded, and this is the bootstrap.
6. Only then, `E2E_AFTER_DEPLOY=true`.

Locally none of that applies: `bun run e2e` reseeds by default, exactly as the
previous script did. `--no-reseed` keeps existing data.

The runner image is built on first use from `deploy/e2e/Dockerfile`, with the
Playwright version read out of `frontend/bun.lock` rather than `package.json` —
the latter carries a caret, and browsers that do not match the resolved version
are the classic "passes locally" CI failure. Bumping Playwright rebuilds it.
