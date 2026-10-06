# PWA launch, installation, and updates

The canonical manifest is `/site.webmanifest`. Keep its URL, `id: /`, scope,
and `/build/index.html` start URL stable. Existing installations also check the
legacy light/dark and `/build/` manifest paths, so update all copies together.
The manifests use `#171717` for the native launch screen to match the large
icon's background. This splash is controlled by the browser and installed
manifest, before any HTML or React runs. The web page then resolves its saved
light/dark preference before the application loads.

The account menu offers **Install app** when Chromium supplies a native prompt.
It consumes the deferred `beforeinstallprompt` event once. iOS offers **Add to
Home Screen** with instructions instead. Installed windows and Telegram Mini
Apps hide this entry. A regular browser tab cannot reliably detect every
installation on the device; use the browser's install eligibility signal.

## Changing artwork

1. Edit the sources in `frontend/branding/` and run `bun run icons:generate`
   from `frontend/`. Commit the sources, generated assets, and manifests.
2. Run `bun run icons:test` and `bun run icons:validate`. `manifest:version`
   hashes icon bytes into `?v=<hash>` URLs, including shortcut icons, and mirrors
   the three manifests to `backend/public`. Builds run it too. App releases
   without artwork changes leave those URLs alone.
3. After deployment, check `/site.webmanifest` and legacy manifest paths with
   their old query strings. They must serve current JSON with `no-cache`, and
   each advertised icon URL must return PNG bytes. The root manifests are not
   served from the service worker's app-shell precache.
4. Open an existing installation with the old artwork, online, and let the
   browser check its manifest. Record browser/OS versions and the offered icon
   review. Accept it, close the app, and verify the launcher and native splash
   after the OS applies the update. Keep the installation during diagnosis.

[Chrome 144 changed manifest updates](https://developer.chrome.com/blog/improvements-to-web-app-updates).
Unchanged icon metadata/URLs now mean Chrome does not download new icon bytes.
A changed URL lets it detect the update. Name/icon changes can require user
approval through **Review app update**; small icon changes may apply automatically.
A service-worker reload updates the web application, but cannot approve or
force an OS launcher icon update. Older Android versions can also delay WebAPK
replacement; see [Chrome's Android update diagnostics](https://web.dev/articles/manifest-updates).
iOS Home Screen icon replacement remains browser/OS controlled. If an existing
iOS installation retains its icon, verify on the target device and document the
result; do not promise that a web-app reload replaces it. The Google Play TWA
has separate native resources and requires an Android release to replace them.
Its splash background and native theme colors are also `#171717` in the Bubblewrap configuration and
generated Gradle configuration. Ship that change with the next wrapper release.

The earlier [maskability experiment](pwa-icon-update-experiment.md) is historical.
Keep the ordinary icon declarations unless a separate device-tested change
revisits them. Changing maskability is not the normal artwork update procedure.

## Browser technology review, October 2026

The project uses a root-scoped Workbox worker, a precached offline shell,
user-controlled update activation, and checks on focus and periodically.
Continue using `beforeinstallprompt` with iOS instructions. The new
[HTML install element](https://developer.chrome.com/blog/install-element-ot)
is in an origin trial for Chrome/Edge 148 through 153, so it is not yet a
replacement for the supported installation flow.

Desktop browser automation can verify the manifest, theme before React,
installation-event handling, and service worker. It cannot verify Android's
native launch screen or an actual WebAPK/launcher update. Those need the
existing-installation device check above.
