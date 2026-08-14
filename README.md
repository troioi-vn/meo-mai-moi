# Meo Mai Moi

## What This Is

A pet care platform with health tracking, vaccination reminders, weight monitoring, and rehoming features.

[**Visit our project site**](https://project.meo-mai-moi.com/) for a live demo, case studies, and blog updates about our journey.

The origin was simple: I have 9 cats rescued from Vietnamese streets, and I wanted to track their health without spreadsheets, scattered notes, or "I swear I'll remember."

That sentence - "I'll build a small app for myself" - turned out to be a spell that summons months of work.

---

**Mèo** - cat. **Mãi** - forever, again and again. **Mới** - new, renewed.

_Cats, always renewed._ A name that hints at rescue, rehoming, and new chapters in the same life.

## Who Made This

I'm a former cat café owner, former Maine Coon breeder, and I've been building things on computers since Windows 95. Now I live in Vietnam, and my cats come from the streets here.

This project exists because care is not a one-time act. It's ongoing. Software can reflect that.

## How It Was Built

This project was built with heavy AI assistance, but not on autopilot. I used AI to accelerate implementation and exploration; the work I owned was the architecture, debugging, refactoring, test design, and shipping decisions.

AI-assisted development turned out to be like crane-assisted construction: powerful, but only if you still understand load paths, failure modes, and what has to be rebuilt instead of merely moved faster.

The real work was debugging, simplifying, testing, and shipping. Around 2,400 unit tests across both sides, plus 17 E2E specs with real email verification. Deployment scripts, backups, rollbacks. The architecture stayed boring on purpose.

**Stack**: Laravel 13 (API) • React 19 (SPA + PWA) • Vite+ • PostgreSQL • Filament (Admin) • Docker • Bun

## Quick Evaluation

If you're reviewing this repo as a portfolio project, start here:

- **Run it**: `./utils/deploy.sh --seed`
- **Quick validation**: `bun run review:quick`
- **App**: http://localhost:8000
- **Admin**: http://localhost:8001
- **Seeded accounts**: `admin@catarchy.space / password`, `user1@catarchy.space / password`
- **Architecture overview**: `docs/architecture.md`
- **Everything else**: [`docs/`](docs/index.md) — around 35 documents covering auth, API conventions, offline mode, the rehoming state machine, deployment, and rate limiting

## Features

**Health Management**: Pet profiles, medical records, vaccination schedules with reminders, weight tracking with charts, microchip records, vet contact management.

**Rehoming**: Placement requests (adoption, foster, pet sitting), helper responses, handover confirmation, relationship tracking, in-app chat between owners and helpers.

**Shared Care**: Groups for rescues managing pets together, granular relationships (owner, foster, sitter, editor, viewer) that can overlap and expire, and invitations for pets, groups, and ledgers.

**Money and Routine**: Shared expense ledgers with receipts, per-pet spending, and multi-currency support, plus habits for recurring care tasks with day check-ins.

**Works Offline**: An installable PWA with a durable operation queue. Edits made without a connection are stored, replayed on reconnect, and reconciled with idempotency keys and version checks rather than silently overwriting.

**Reaches You Where You Are**: A Telegram bot for sign-in and notifications, web push, and OAuth bridges that let AI assistants read and write through the same authorization rules as everyone else.

**Infrastructure**: Real-time notifications, optional Umami analytics, email delivery tracking, admin panel with RBAC, OpenAPI documentation, internationalization (English, Russian, Ukrainian, Vietnamese).

## Running It

```bash
git clone https://github.com/troioi-vn/meo-mai-moi.git
cd meo-mai-moi
./utils/deploy.sh --seed
```

Then: [localhost:8000](http://localhost:8000) (app) • [localhost:8001](http://localhost:8001) (admin) • [localhost:8000/api/documentation](http://localhost:8000/api/documentation) (API docs)

For CI-driven development deployments, use `./utils/deploy-ci-dev-ab.sh`. It deploys into the inactive slot, verifies that slot, and only then switches traffic, so Woodpecker still decides the exact commit while the server-side script handles the A/B rollout.

Optional frontend analytics can be enabled with Umami via the root `.env` keys `VITE_UMAMI_URL` and `VITE_UMAMI_WEBSITE_ID`. Because the frontend is built with Vite+ inside Docker, these values must be present before the image build if you want them embedded in the SPA bundle.

## Contributing

Contributions welcome. See [docs/development.md](docs/development.md) for setup and workflow. Frontend contributors should use `vp dev`, `vp check`, `vp test`, and `vp build` from `frontend/`.

If `vp` is not on your shell `PATH` yet, use the existing package scripts via `bun run dev`, `bun run test`, `bun run build`, or `bun run e2e:ui` from `frontend/`, or add the installed Vite+ binary directory to your shell `PATH`.

If you are pointing an AI agent at this repo, [AGENTS.md](AGENTS.md) is written for that: the layer rules, the middleware every endpoint needs, and the conventions that are easy to break without any test going red.

## What's Next

- Lost pet recovery features
- AI parsing of vaccination certificates
- Integration with smart pet devices
- Additional language support

---

Built in Vietnam. For the cats who found new chapters, and the people who gave them one.
