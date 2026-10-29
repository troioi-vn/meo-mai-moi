# Discoverability

_What the app tells search engines and link-preview crawlers, and what it deliberately withholds._

The app is a SPA. Everything a visitor reads arrives after JavaScript runs, which is fine for people and awkward for crawlers. Rather than server-render pages, the public routes serve the same React shell with a head that a crawler can read on its own.

## Where the head comes from

`backend/resources/views/welcome.blade.php.template` is the shell. Every value in its head has a default, so a route that passes nothing renders exactly as it always did. The routes that do pass something live in `backend/app/Http/Controllers/Shell/` plus `ShowPlacementRequestShellController`, and they all get their values from `App\Services\Seo\ShellMetaService`.

| Route | Title source | Extras |
| --- | --- | --- |
| `/` | `messages.seo.landing` | `Organization` JSON-LD |
| `/requests` | `messages.seo.placements` | |
| `/requests/{id}` | the pet's name and the request type | `og:image`, `FAQPage` JSON-LD when the listing has published Q&A |
| `/helpers` | `messages.seo.helpers` | |
| `/helpers/{id}` | the profile's city and country | |
| `/pets/{id}/view` | the pet's name and location | `og:image` |

Titles and descriptions are translated, so a visitor arriving with `Accept-Language: vi` gets a Vietnamese title and a matching `og:locale`. The locale to `og:locale` map is `config('locales.og')`, because the tag wants `vi_VN` rather than `vi` and crawlers ignore it otherwise.

Every interpolated value goes through Blade's `{{ }}`. The one exception is the JSON-LD block, which uses `{!! !!}` on `json_encode(..., JSON_HEX_TAG | ...)`; `JSON_HEX_TAG` is what stops a pet description from closing the script tag.

## What each route withholds

A shell only describes a resource while that resource is public to a stranger:

- A placement request needs `status = open` and a pet that still exists.
- A helper profile needs `status = public` and `approval_status = approved`, the same gate as `GET /api/helpers`.
- A pet needs `PetAccessService::isPubliclyViewable()`, which is the guest half of `PetPolicy::view`: an open listing, or reported lost.

Anything else falls back to the plain shell. The reason is that a crawler caches what it sees: a withdrawn profile or a closed listing that leaked a description once stays leaked.

## The sitemap

`GET /sitemap.xml` is built by `App\Services\Seo\SitemapService` and cached for an hour. It lists the three static public pages, every open placement request, and every publicly visible helper profile.

It does not list pet profiles. `/pets/{id}/view` works without a session, but these are people's own animals, and a machine-readable index of all of them is a privacy problem rather than a traffic win. A pet reaches search engines through the listing its owner chose to open.

`backend/public/robots.txt` advertises both this sitemap and the docs one, and disallows the signed-in paths. Those are auth-walled anyway, so that part is about crawl budget: a crawler following them only ever gets the same empty shell.

## Checking it in production

`App\Http\Middleware\NoIndexDev` adds `X-Robots-Tag: noindex, nofollow` outside production, on any host starting `dev.`, `staging.`, `test.` or `preview.`, and whenever `DISALLOW_ROBOTS` is true. That last one is set to `true` in `.env.example` and is the single thing most likely to make all of the above invisible, so confirm it is false or absent in the production environment before wondering why nothing is indexed.

## Known gap: no hreflang

The app ships four locales and serves all of them from one URL per resource, negotiated from `Accept-Language` and, in the browser, from `localStorage` (`frontend/src/i18n/index.ts`). `hreflang` needs a distinct URL per language, so there is nothing to point it at. Google will index whatever its crawler's own `Accept-Language` produces, which in practice is English.

Closing that gap means giving locales their own URLs, either a `/vi/` path prefix or a query parameter, and teaching the SPA router and i18next to read it. That is a product decision about URL shape rather than a meta tag, so it is not in this slice.
