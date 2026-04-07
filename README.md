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

Less than 1% of the code was written by hand. The rest was built with AI - in a healthy sense. I used various models, learned their personalities, and discovered that AI-assisted development is like crane-assisted construction: powerful, but if you don't understand structure, you build a beautiful collapse.

The real work was debugging, simplifying, testing, and shipping. Around 1,500 unit tests. E2E tests with real email verification. Deployment scripts, backups, rollbacks. The architecture stayed boring on purpose.

**Stack**: Laravel 12 (API) • React 19 (SPA) • Vite+ • PostgreSQL • Filament (Admin) • Docker • Bun

## Features

**Health Management**: Pet profiles, medical records, vaccination schedules with reminders, weight tracking with charts, vet contact management.

**Rehoming**: Placement requests (adoption, foster, pet sitting), helper responses, handover confirmation, relationship tracking, in-app chat between owners and helpers.

**Infrastructure**: Real-time notifications, optional Umami analytics, email delivery tracking, admin panel with RBAC, OpenAPI documentation, internationalization (English, Russian, Ukrainian, Vietnamese).

## Running It

```bash
git clone https://github.com/troioi-vn/meo-mai-moi.git
cd meo-mai-moi
./utils/deploy.sh --seed
```

Then: [localhost:8000](http://localhost:8000) (app) • [localhost:8000/admin](http://localhost:8000/admin) (admin) • [localhost:8000/api/documentation](http://localhost:8000/api/documentation) (API docs)

For CI-driven development deployments, use `./utils/deploy-ci-dev-ab.sh`. It deploys into the inactive slot, verifies that slot, and only then switches traffic, so Woodpecker still decides the exact commit while the server-side script handles the A/B rollout.

Optional frontend analytics can be enabled with Umami via the root `.env` keys `VITE_UMAMI_URL` and `VITE_UMAMI_WEBSITE_ID`. Because the frontend is built with Vite+ inside Docker, these values must be present before the image build if you want them embedded in the SPA bundle.

## Contributing

Contributions welcome. See [docs/development.md](docs/development.md) for setup and workflow. Frontend contributors should use `vp dev`, `vp check`, `vp test`, and `vp build` from `frontend/`.

If `vp` is not on your shell `PATH` yet, use the existing package scripts via `bun run dev`, `bun run test`, `bun run build`, or `bun run e2e:ui` from `frontend/`, or add the installed Vite+ binary directory to your shell `PATH`.

Architecture notes in [AGENTS.md](AGENTS.md).

## What's Next

- Lost pet recovery features
- AI parsing of vaccination certificates
- Integration with smart pet devices
- Additional language support

---

Built in Vietnam. For the cats who found new chapters, and the people who gave them one.
