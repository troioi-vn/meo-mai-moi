# Logo and app icon update

This branch prepares the asset pipeline for Olga's logo work. The current PNGs remain in place until the new artwork is ready. Do not trace them into SVG and call the result a source file.

## Artwork family

Create these files in `frontend/branding/`:

| File               | Purpose                          | Requirements                                                                               |
| ------------------ | -------------------------------- | ------------------------------------------------------------------------------------------ |
| `app.svg`          | Primary app mark                 | Square `viewBox`, transparent background, recognizable at small sizes                      |
| `maskable.svg`     | PWA maskable icon                | Square, opaque edge-to-edge background, important artwork inside the central 80% safe zone |
| `loading.svg`      | Full-page loading image          | Static in this change; keep its structure suitable for later animation                     |
| `notification.svg` | Android notification mark        | Monochrome silhouette; do not rely on internal color                                       |
| `favicon.svg`      | Optional simplified browser mark | Add only if `app.svg` is unclear at 16×16                                                  |

SVG is the editable source format. The repository still commits generated PNGs because PWA installers, Apple touch icons, Android resources, and stores do not offer dependable SVG support everywhere.

## Commands

From `frontend/`:

```bash
vp run icons:test
vp run icons:generate
vp run icons:validate
vp check
vp build
```

`icons:generate` deliberately fails until the four required SVG sources exist. Its first implementation generates the web and Apple PNG set. Extend the mappings for Android splash, launcher, notification, and store assets rather than converting those files by hand.

The active frontend build copies root assets into `backend/public`. Treat `frontend/public` as the source and `backend/public` as its served mirror. Run a build after generation and use `icons:validate` to catch drift.

## Olga's implementation task

1. Create the SVG artwork family and document relevant design choices in the PR.
2. Decide from a real 16×16 preview whether a separate `favicon.svg` is necessary.
3. Complete the generator mappings for favicon and Android scaffolding assets.
4. Generate and commit the raster outputs. Never make the normal and maskable files identical merely to satisfy a filename.
5. Add an SVG favicon with PNG fallback where browser support permits it.
6. Replace the full-page React `Loader2` fallback with a component that shows `loading.svg`. Keep button, upload, card, and inline loading indicators unchanged.
7. Update the web manifests and `android/twa-manifest.json` where the new asset set requires it.
8. Add or extend tests for each behavior introduced.

## PR checks

- Run `vp run icons:test`, `vp run icons:validate`, `vp check`, and `vp build`.
- Inspect the favicon in a browser at normal and high pixel density.
- Inspect an installed desktop or Android PWA.
- Preview the maskable icon with several mask shapes and confirm the subject stays inside the safe zone.
- Check the static full-page loading image in light and dark themes and with reduced-motion enabled.
- Record whether iOS Home Screen behavior was checked on a real device. Lack of an Apple device is acceptable when disclosed.

The `android/` directory is scaffolding for a future native wrapper. Update its assets and configuration, but an Android wrapper build is not required for this task.
