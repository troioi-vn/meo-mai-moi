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

It also disallows three surfaces that are public but would compete with a page we do describe: `/helper/{id}` (the owner's view of a profile the public reads at `/helpers/{id}`), `/pets/{id}` (the full profile behind `/pets/{id}/view`), and `/requests/{id}/poster` (the print view of a listing). `Allow: /pets/*/view` keeps the public pet page crawlable through longest-match precedence, which RFC 9309 standardised.

## Checking it in production

`App\Http\Middleware\NoIndexDev` adds `X-Robots-Tag: noindex, nofollow` outside production, on any host starting `dev.`, `staging.`, `test.` or `preview.`, and whenever `DISALLOW_ROBOTS` is true. That last one is set to `true` in `.env.example` and is the single thing most likely to make all of the above invisible, so confirm it is false or absent in the production environment before wondering why nothing is indexed.

## Locale URLs and hreflang

The app ships four locales. They used to share one URL per resource, negotiated
from `Accept-Language` and, in the browser, from `localStorage`, so there was no
distinct address for `hreflang` to point at and Google indexed whatever its
crawler's own header produced — in practice English.

Each public page now has one URL per language:

| Language | URL |
| --- | --- |
| English | `/requests/3` |
| Vietnamese | `/vi/requests/3` |
| Ukrainian | `/uk/requests/3` |
| Russian | `/ru/requests/3` |

English is deliberately unprefixed, which is why no already-indexed URL changed
when this arrived, and why each language has exactly one address rather than two.
`/en/...` answers `301` to the unprefixed form so it cannot become a duplicate.

Every public shell emits the full alternate set plus `x-default`, and the
sitemap lists each page once per language with `xhtml:link` alternates on each
entry. Because the sitemap now multiplies by the locale count, its 50,000-URL
cap bites four times sooner than the page count suggests.

### How the locale is decided

`SetLocaleFromPath` is route middleware on the localised group, so it runs
*after* `SetLocaleMiddleware` and overrides it. That order is the point: a
crawler fetching `/vi/requests/3` while sending `Accept-Language: en` must still
be served Vietnamese, or the alternates promise a translation the page does not
deliver. Unprefixed URLs are unaffected and still negotiate as before.

On the client, the prefix is absorbed as the react-router `basename`
(`frontend/src/lib/locale-url.ts`), so every route path and every `<Link to>` in
the app stays written in unprefixed form while the browser URL keeps its `/vi`.
i18next reads the same helper through a custom `localePath` detector placed
ahead of `localStorage`, so a shared link opens in the language it names rather
than the reader's last choice. Detection does not save that URL's language to
localStorage. Both language switchers explicitly save the chosen preference and
navigate to the corresponding URL, preserving its query and fragment. A saved
account preference also yields to a locale prefix.

The basename persists during SPA navigation, including authenticated screens
such as `/vi/settings`. Those screens use the ordinary SPA catch-all and have no
localized SEO metadata or sitemap entries. This keeps links within a localized
session consistent without adding private screens to the public index. Switching
language within that session updates the prefix too; private sessions started at
an unprefixed URL continue to use unprefixed URLs.

### Two traps worth knowing

`App::setLocale()` writes to `config('app.locale')`. Reading that key to find
the site's *default* language therefore returns whatever the current request is
being served in, which quietly makes the language you are viewing look like the
unprefixed one. `config('locales.default')` exists for this and must not be
replaced with `app.locale`.

The localised routes use a literal prefix per locale rather than a `{locale}`
route parameter. A parameter becomes the first argument of every controller in
the group and shifts the model bindings along, which would force an unused
`$locale` argument into all six shell controllers.

