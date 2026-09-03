# Public Q&A on Placement Requests

Anyone can ask a public question about a listed pet, including visitors who are not signed in. Owners and active group members answer publicly. Everything published is visible to everyone.

This document is the design record. The listing lifecycle itself is in [Placement Request Lifecycle](./placement-request-lifecycle.md); who may act on a listing is in [Group Placement](./group-placement.md).

## Lifecycle

```
pending ──answer / approve──> published <──unhide──> hidden
   └──────────────hide───────────────────────────────┘
```

- **pending** — asked, visible only to people who can manage the pet's placements.
- **published** — answered or approved, visible to everyone including logged-out visitors.
- **hidden** — rejected before publication, or withdrawn from public view afterwards. Unhiding restores whichever state it came from.

Email confirmation runs alongside and never touches these transitions. It decides whether the *asker* hears back, not whether anyone else can read them.

## Decisions

| # | Decision | Why |
| --- | --- | --- |
| 1 | The asker gives a display name and, optionally, an email | Without a notify path the asker has to poll the page for an answer, which kills the feature |
| 2 | Nothing is public until an owner or group member answers or approves | The rescue side is the publication gate; the platform never hosts unreviewed anonymous text about someone's pet |
| 3 | Only answered pairs are translated, capped per pet | An unanswered question costs zero tokens, so a proof-of-work solver cannot spend the translation budget — only a human answering can |
| 4 | Any verified user may open a chat thread on a listing | Public Q&A tells people to sign in for a private conversation, so that door has to actually open |
| 5 | Questions belong to the pet, not the listing | Owners relist constantly; otherwise the same five questions get re-asked and every answer is thrown away |
| 6 | Confirmation gates delivery, never publication | Removes "make the platform email a stranger" without making verification the price of asking |
| 7 | `buildPrompt` fences untrusted text, and translations are marked unreviewed | The approver reads one language; the model publishes four |
| 8 | The asker gets no self-service management link | Deliberate. The deletion path is the admin surface described below |
| 9 | An enquiry thread is a `PRIVATE_GROUP` chat keyed on the asker | Authorizing on `placement_requests.user_id` instead would reintroduce the stale-after-transfer bug `PlacementChatLocator` exists to kill |
| 10 | Ownership transfer keeps answers and drops the previous owner's name | They can no longer correct or withdraw what they wrote |

## Authorization

Answering, approving, hiding and unhiding all run through `PlacementQuestionPolicy`, which delegates to `PetAccessService::canManagePlacements()` — direct owner or active group member. This is deliberately the same predicate that governs the rest of the placement surface, and deliberately **not** `canEdit()`: someone added to help track vaccinations can read the pet but must not speak for the listing.

Reading is not policy-gated at all. Published questions are public by definition; pending and hidden ones are filtered out in `ListPlacementQuestionsController` for anyone who cannot manage the pet.

## Why the prompt is fenced

`ContentTranslationService` is lazy — it dispatches an OpenRouter call from inside a `GET` whenever the viewer's locale differs from the content's. That was fine when the only translated field was `notes`, written by an authenticated owner. Public Q&A points it at text written by strangers.

`TranslationSettingsService::buildPrompt()` used to interpolate that text straight into the prompt with `str_replace`. The stock template fences `{text}` in triple backticks, which is not a boundary — a writer escapes it simply by typing a fence of their own, and can then address the model directly.

It now wraps the text in a per-call random nonce marker the writer cannot predict, and restates the instruction *after* the text, where it is the last thing the model reads. This is defence in depth, not a proof: everything the model returns is still treated as unreviewed machine output and labelled that way in the UI.

This change affects placement `notes` translation too, not just Q&A.

## Why altcha does less than it looks like it does

`grantholle/laravel-altcha` must be pinned to `^2.2` — 2.1.x caps at `illuminate/contracts ^12` and will not install on Laravel 13.

The package's `ValidAltcha` rule is `verifySolution()` and nothing else, and the upstream library's `verifySolution` is a pure HMAC-and-hash check plus an expiry read out of the salt. **Neither remembers that a solution was already spent**, so one solved challenge could be posted repeatedly until it lapsed. `App\Rules\SingleUseAltcha` wraps it and burns the challenge signature in the cache on first use.

Even so, altcha is proof of work: friction, not a wall. It is not what protects publication (an owner has to answer), nor delivery (the address has to be confirmed). Its job is keeping junk out of the database and out of the moderation queue.

Its challenge route is registered by the package at `/altcha-challenge` — the application root, not under `/api`. It is therefore absent from the OpenAPI spec, Orval generates no client for it, and the frontend fetches it directly. `vite.config.ts` proxies it in dev.

## Translation budget

`PlacementQuestionTranslator` applies two rules the plain `ContentTranslationService` does not know about:

1. Only published pairs are translated.
2. A pet gets `placement_questions.translated_pairs_per_pet` translated pairs (default 20). The cap is per **pet**, not per listing — counting per listing would reset the budget every time an owner relists, which is exactly the case it exists to bound.

Past the cap, a thread renders in its original language with an on-demand translate control rather than looking silently broken to a reader who cannot read it. That endpoint only ever acts on already-published pairs, so the total work it can ask for is bounded by how much a rescue has actually answered.

Aggregate spend is capped at OpenRouter, outside the application.

## Personal data

The asker is not a user of this app: no account, no session, and by design no self-service management link.

- The address and IP are **never** returned by any API response, to anyone, including the owner. The owner sees a name, a question, and whether the address was confirmed.
- An address nobody confirms is deleted by `placement-questions:prune-unconfirmed`. It will never be mailed and the asker cannot manage it, so keeping it serves no one.
- `PlacementQuestionResource` in Filament has an **Erase asker** action that strips the name, address and IP from every question one address asked, keeping the threads intact so published answers are not orphaned. This is the entire deletion path — it has to exist and it has to work.

## The confirmation link must not be swallowed by the service worker

`GET /placement-questions/{id}/confirm` is a Laravel web route reached by
clicking a link in an email, so it is a navigation. The PWA registers a
`navigateFallback` to the SPA shell, and any navigation not on
`navigateFallbackDenylist` in `frontend/vite.config.ts` gets served
`/build/index.html` instead of reaching Laravel - which would render a listing
and confirm nothing, silently, for anyone with an active service worker.

It is on the denylist alongside `/email/verify/`, `/reset-password/` and
`/unsubscribe`, which are there for exactly the same reason. Any future
server-rendered entry point from an email needs adding there too.

## Notifications

The bell fires immediately for everyone entitled to act, via `PlacementNotifier::notifyOwnerSideInApp()`. Email is batched by `placement-questions:send-digest-emails`, daily.

The split is deliberate and is the same reasoning recorded in [Notifications](./notifications.md): a popular listing can collect a dozen questions in an afternoon, and mailing each one to every volunteer is how a domain gets filtered to spam.

The asker's own emails are plain Mailables sent to an address rather than notifications sent to a `User`, because `UnsubscribeService` needs a user id to build a token and there is no user here. Each is strictly one-off: a confirmation, and one answer notification. Editing an answer does not re-notify — a correction is not a new event to the asker.

## Known gaps

- **Failed translations stay failed until an administrator retries them.** If the OpenRouter spend limit trips, every translation attempted during the outage marks `failed` and stays there. `TranslateContentField` retries three times over roughly 19 minutes; after that, recovery is manual in the Filament translation operations list, which offers both single-record retry and a confirmed bulk retry over selected failed rows. Each selected row goes through `ContentTranslationService::retry()`, and the result reports how many records were queued versus skipped. Nothing sweeps failures automatically.
- **`PetComment`** is an unrelated model with a Filament resource, no API and no policy. It predates this feature and is not part of it.
