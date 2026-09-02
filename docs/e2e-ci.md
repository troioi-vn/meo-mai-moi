# E2E in CI

How the browser suite runs automatically after a development deployment, and
why it is built the way it is.

For writing tests, see the [E2E Testing Guide](./e2e-testing-guide.md). For
what each flow currently covers, see the [E2E Coverage Map](./e2e-coverage.md).

## The model: two stacks, one image

The development site is a public demo. It is embedded in an iframe on the
project landing page and logged in as a shared demo account, so anyone on the
internet can click through it and change things. That is deliberate, and it
creates one problem: the demo needs reseeding, or stranger edits accumulate
until it stops looking like a working product.

The suite wants a freshly seeded database too, so for a while both were served
by one. That was a mistake, and it is worth being precise about why, because
the shape of it is easy to walk back into.

A/B slots are not two environments. They are two PHP processes in front of one
database. So the thing that takes the demo down during a run was never the slot
switch — it was `migrate:fresh`. And because the suite and the demo shared that
database, two things followed that no amount of routing could fix: the demo had
to stay behind a notice for the suite's entire ~10 minute run, and any visitor
who clicked through anyway wrote into the database the suite was asserting
against.

**The suite now stands in its own database, served by its own container.**

Both answer to `https://dev.meo-mai-moi.com`. That is deliberate: the runner
reaches its own copy by pinning that hostname to `127.0.0.2`, where a second
nginx server block listens, so `APP_URL`, the certificate, the cookie domain and
every absolute link stay exactly what they are in production. Nothing in the
application knows it is under test.

What that buys:

- the demo is only down for its own reseed — about a minute, not ten
- the site is live on the new commit before the suite starts, so nobody waits
- visitors cannot flake the suite, and the suite cannot surprise visitors
- `QUEUE_CONNECTION=database` means a separate database is a separate `jobs`
  table, so `backend_admin` no longer steals the suite's queued mail

Three things must stay separate for this to hold, and all three are load-bearing:
the database, the uploads volume (a demo reseed clearing `storage/app/public`
would delete the suite's media mid-run), and the mailer.

This does not apply to production. See [Safety](#safety).

## Order of operations

The deployment is never blocked, and the site goes live before anything below
starts costing time.

In `utils/deploy-ci-dev-ab.sh`:

1. **Deploy the inactive slot** and migrate the demo database, as before.
2. **Switch nginx** to the new slot. `dev.meo-mai-moi.com` is now serving the
   new commit. This is the moment that used to be ten minutes later.
3. **Bring up the e2e stack** on the same image, and install its vhost.
   Failures here are logged and ignored: a broken e2e stack costs test
   coverage, which is the trade the database split was for.
4. **Refresh the demo** — `utils/demo-refresh.sh`, which raises the notice,
   runs `demo:reseed` against the demo database, and lowers it. About a minute.
5. **Launch the detached run.**

Then in `utils/e2e-run.sh`, against the e2e stack only:

1. **Deployment check**, in two halves. On the host, the runner asks
   `backend_e2e` which image it runs and compares it to the deployed tag — this
   is the authoritative half, because `/api/version` reports a release tag that
   does not move per development commit. Then `deployment.spec.ts` checks what
   only an external client can see: TLS, routing, the app shell, and the real
   manifest.
   *If either half fails the run aborts here*, and the notification says the
   deploy did not reach the e2e stack. There is no reason to test an
   application that is not the commit you shipped.
2. **Reseed** the e2e database — `php artisan demo:reseed`. No notice: this
   database has no visitors.
3. **Full suite** — Playwright against `dev.meo-mai-moi.com` on `127.0.0.2`.
4. Reports published, notification sent.

## The runner

One script, `utils/e2e-run.sh`, serves both local development and CI:

```bash
utils/e2e-run.sh --target=local                    # compose stack, reseeds by default
utils/e2e-run.sh --target=local --no-reseed        # keep whatever is in the local db
utils/e2e-run.sh --target=e2e --no-reseed --grep x # one spec, keep the fixture
utils/e2e-run.sh --target=e2e --yes                # wipes the e2e db, then runs
```

There is no `--target=dev` any more, and its absence is the point: this script
can no longer reach the public demo's database at all. Refreshing the demo is
`utils/demo-refresh.sh`, a separate command with its own confirmation.

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

Two seeders shape what a visitor actually sees. `DemoPetsSeeder` gives the demo
account its household - two cats, two dogs and a bird, with photos, weight
series, medical records, microchips and vaccinations, all dated relative to now
so the demo never looks abandoned. `DemoPlacementSeeder` adds open placement
requests owned by *other* seeded accounts, because you cannot respond to your
own request and a Respond button that does nothing demos nothing.

Beyond that, the demo does not get a curated "polish" pass. It looks alive because the suite
itself leaves realistic data behind: specs draw names, breeds, notes, and
weights from `e2e/utils/demo-data.ts` rather than
inventing `Test Pet ${Date.now()}`. Because pet and health read routes are
public, whatever the tests write is what demo visitors see. The fixture pool
exists so the presentable path is also the convenient one.

### Safety

This command drops every table. It ships in the same repository and the same
image that deploys production, so it is guarded in five independent layers.
Three are configuration checks; two are not, because configuration is exactly
what fails in the scenario worth defending against.

| Layer | Mechanism |
|---|---|
| Framework | `DB::prohibitDestructiveCommands()` when the app is production — blocks `migrate:fresh`, `migrate:refresh`, `migrate:reset`, and `db:wipe` even with `--force` |
| Existence | The command is not registered outside development. On production, `php artisan demo:reseed` reports that the command is not defined |
| Configuration | `APP_ENV` is not production, `APP_URL` is in an explicit allowlist, and `DEMO_RESEED_ALLOWED=true` is present — all required, all failing closed. The runner separately refuses `--reseed` unless the resolved base URL and deploy host both match development |
| Naming | `DEMO_RESEED_EXPECTED_DATABASE` names the one database this container may wipe, and is compared against the live connection. Unset means refuse |
| Grant | The e2e container connects as a Postgres role with no privileges on the demo database. A wrong `DB_DATABASE` fails on permissions rather than succeeding |
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

The naming and grant layers exist because splitting the databases cost the
`APP_URL` allowlist its teeth: both stacks report the same URL on purpose, so
that check can no longer tell them apart. `DEMO_RESEED_EXPECTED_DATABASE` is the
readable half — when it fires it says which database was expected and which was
found. The Postgres grant is the half that holds when every environment
variable is wrong at once, which is the only scenario really worth the trouble.
Both databases carry the sentinel, since both are reseeded, so the sentinel
alone cannot separate them either.

## Maintenance window

The notice now covers one thing: the demo's own reseed, in
`utils/demo-refresh.sh`. That is roughly a minute. It used to cover the suite's
whole run, because the suite was wiping the same database — see
[the model](#the-model-two-stacks-one-image).

nginx checks for a marker file per request:

```nginx
if (-f /var/www/dev-maintenance/on) { return 503; }
error_page 503 /maintenance.html;
```

No config rewrite and no reload — the A/B slot switch already rewrites that
vhost, and two scripts editing one file minutes apart is a race worth not
having.

The loopback exemption is still there and is now redundant for the suite, which
reaches its own stack on `127.0.0.2` where no marker is checked at all. Leave it
alone regardless: it is what lets you curl the real application from the host
while the notice is up.

A stuck maintenance page is worse than the mess it prevents, so removal is
guaranteed three ways: an `EXIT` trap in `demo-refresh.sh`, the deploy's own
runtime, and an independent timer that deletes any marker older than twenty
minutes.

A run that dies between the wipe and the end of seeding is caught by a
completion marker; the trap re-runs `demo:reseed` on the way out.

### It also lies to anything verifying a deploy

The marker covers **every** path, API routes included, and the notice is HTML.
For the ~1 minute a reseed takes, `dev.meo-mai-moi.com` answers a JSON client
with a web page. A shorter window than it used to be, and no less confusing
while it is open.

That misleads in both directions:

- A JSON client reports a content-type error, which reads as a bug in the
  endpoint rather than a site that is down. The Altcha widget on the public
  Q&A form says `Server responded with invalid content-type. Expected
  application/json, received text/html` - nothing to do with Altcha.
- Polling one endpoint until it answers correctly does not prove the deploy is
  usable, because the marker can go up *after* the probe passes. "Verified
  live" can be true and stale a minute later.

So gate any post-push check on the demo actually being up:

```bash
curl -s -o /dev/null -w '%{http_code} %{content_type}\n' \
  https://dev.meo-mai-moi.com/api/pet-types
# 200 application/json  -> up
# 503 text/html         -> maintenance; wait, do not debug the application
```

Nothing reaches `error_events` from this state, so the error sink being empty
is expected and is not evidence that the application is healthy.

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

The skipped deployment still gets its demo refreshed. That no longer depends on
the run in flight doing it — `utils/demo-refresh.sh` runs from the deploy
itself, before and independently of the lock.

## Advisory, for now

The suite does not gate deployment. It reports.

That is a deliberate starting position rather than a permanent one: the suite is
currently red, and a gate on a red suite blocks every deployment from the first
day, which teaches everyone to bypass it.

**Promotion criterion: ten consecutive green runs.** At that point the
deployment script splits so the slot switch happens after the tests, and a red
suite holds the switch.

The database split is what makes that affordable. Gating used to mean choosing
between a nondeterministic signal and a demo held behind a notice for the whole
run; now the suite runs isolated either way, so promoting it costs only the
wait, and only on the deploy that is failing.

Entries in `known-issues.json` are what stand between here and there.

## Enabling it

The post-deploy run is **off by default**. `utils/deploy-ci-dev-ab.sh` only
launches it when `E2E_AFTER_DEPLOY=true` is set in the deployment's root `.env`,
because the run depends on host-side pieces that do not travel in this
repository. Turning it on before those exist would point a database wipe at a
public demo with no maintenance page and no report to read afterwards.

Prerequisites on the deployment host, in order:

1. A database and role for the suite. The role must have **no** privileges on
   the demo database — that grant is a safety layer, not tidiness:

   ```sql
   CREATE ROLE meo_mai_moi_e2e LOGIN PASSWORD '<secret>';
   CREATE DATABASE meo_mai_moi_e2e OWNER meo_mai_moi_e2e;
   REVOKE ALL ON DATABASE meo_mai_moi_dev FROM meo_mai_moi_e2e;
   ```

2. `E2E_DB_DATABASE`, `E2E_DB_USERNAME`, `E2E_DB_PASSWORD` and the
   `E2E_*_HOST_PORT` values in the root `.env`; see `.env.example`.
3. `DEMO_RESEED_ALLOWED=true` and `DEMO_RESEED_EXPECTED_DATABASE` in
   `backend/.env`. Both absent by default, both failing closed.
4. `DEMO_MAILER_PROFILE=mailgun` in `backend/.env`, with `MAILGUN_DOMAIN` and
   `MAILGUN_SECRET` set. The demo sends real mail; the e2e stack pins itself to
   MailHog in `docker-compose.yml` and ignores this.
5. A MailHog reachable by the app. Roughly a third of the suite depends on
   reading an inbox. It belongs to the e2e stack only now.
6. `utils/e2e-report-nginx.sh install` — creates the report root, installs the
   internal report vhost, drops the maintenance page in place, and enables the
   timer that clears a stale maintenance marker.
7. A DNS record for the report hostname.
8. One deploy with the new code, so `backend_e2e` and its vhost exist.
9. One `utils/e2e-run.sh --target=e2e --initialize --yes` by hand. The sentinel
   guard refuses a database it has never seeded, and this is the bootstrap.
   **Before** the first automated run, not after — otherwise the first run
   refuses and reports red for a reason that has nothing to do with the code.
10. Only then, `DEMO_REFRESH_ON_DEPLOY=true` and `E2E_AFTER_DEPLOY=true`.

Locally none of that applies: `bun run e2e` reseeds by default, exactly as the
previous script did. `--no-reseed` keeps existing data.

The runner image is built on first use from `deploy/e2e/Dockerfile`, with the
Playwright version read out of `frontend/bun.lock` rather than `package.json` —
the latter carries a caret, and browsers that do not match the resolved version
are the classic "passes locally" CI failure. Bumping Playwright rebuilds it.
