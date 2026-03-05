# Roles

This document describes account-level roles in Meo Mai Moi.

## Principles

Roles must follow the project philosophy in [Philosophy](./philosophy.md):

- no paywalled core features
- no artificial limitations designed to push upgrades
- same core product for everyone who cares for animals

## `premium` (support role)

`premium` is a support role, not a separate product tier.

What it means:

- it may be shown as a supporter badge/status
- it does not unlock exclusive app features
- it must not create a "free app vs premium app" split

Current resource ceilings (configurable in admin):

- default users (no `premium` role): `50 MB` photo storage
- `premium` users: `5 GB` photo storage

Behavior:

- limits are enforced on all authenticated image upload endpoints
- when a non-premium user reaches the limit, uploads are blocked and the UI shows an upgrade/support dialog
- core feature access remains the same for premium and non-premium users

In short: `premium` can change resource ceilings, but never the core feature set.
