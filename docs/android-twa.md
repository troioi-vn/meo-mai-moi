# Android Trusted Web Activity

Meo Mai Moi's Android application is a Trusted Web Activity (TWA) around the
production PWA at `https://meo-mai-moi.com`. The Android wrapper lives in
`android/`; product code remains in the web application.

The Play artifact is an Android App Bundle (AAB). APKs are only for local device
QA. Android `versionCode` and `versionName` describe wrapper releases and are
independent of the web app's `X-App-Version`.

Private Play Console state, signing-certificate fingerprints, keystore custody,
testing participants, and live deployment details are intentionally documented
outside this public repository.

## Application identity

- Origin: `https://meo-mai-moi.com`
- Package: `com.meomaimoi.app`
- Canonical web manifest: `https://meo-mai-moi.com/site.webmanifest`
- Web manifest start URL: `/build/index.html`
- Android wrapper start URL: `/build/index.html?app_context=google_play_twa`
- Digital Asset Links: `https://meo-mai-moi.com/.well-known/assetlinks.json`

The package name is permanent once registered with an Android distributor.

## Workstation prerequisites

Bubblewrap requires Node.js, a JDK, and Android SDK command-line tools. Verify
the workstation before generating or building the wrapper:

```bash
node --version
java -version
adb version
sdkmanager --version
bubblewrap doctor
```

Install Bubblewrap without `sudo`:

```bash
npm install --global @bubblewrap/cli
```

## Signing boundaries

The upload keystore is a secret release artifact and must never be committed.
Keep it in a backed-up private location and store its passwords in the project's
secret manager. The repo ignores `android/*.jks` and `android/*.keystore` as a
final safety net; ignore rules are not a backup strategy.

Play App Signing creates two relevant certificates:

- The upload certificate signs the AAB sent to Play.
- The Play app-signing certificate signs packages installed by Play.

Production Digital Asset Links must contain the Play app-signing SHA-256
fingerprint. During sideload QA it may also contain the upload certificate
fingerprint so the locally installed APK can verify.

The canonical source is `frontend/public/.well-known/assetlinks.json`; the
frontend asset-copy step mirrors it to Laravel's public root. The checked-in
upload fingerprint supports sideload QA. Add the Play app-signing fingerprint
before testing or releasing a Play-installed build; do not replace the upload
fingerprint while locally signed APK QA is still useful.

Inspect a keystore fingerprint without printing passwords:

```bash
keytool -list -v -keystore /private/path/upload-keystore.jks -alias upload
```

## Generate and update the wrapper

Run initialization from the repository root and choose `android/` as the output
directory when prompted:

```bash
bubblewrap init --manifest=https://meo-mai-moi.com/site.webmanifest
```

Confirm the application identity, launcher label, colors, icons, and initial
wrapper version before accepting the generated project. Override the generated
wrapper `startUrl` with `/build/index.html?app_context=google_play_twa`; the
frontend consumes and removes that marker on startup. Keep the signing-key path
relative and local (for example `upload-keystore.jks`); do not commit the
keystore or either password.

After editing `android/twa-manifest.json`, regenerate Bubblewrap-owned Android
files from inside `android/`:

```bash
bubblewrap update --appVersionName=1.0.1
```

`bubblewrap update` also increments `appVersionCode` unless
`--skipVersionUpgrade` is supplied. Review both version values in
`twa-manifest.json` before building. Bubblewrap may overwrite generated Android
files, so durable configuration belongs in `twa-manifest.json` or in clearly
documented post-generation changes.

Meo Mai Moi has one intentional post-generation change in
`LauncherActivity.getLaunchingUrl()`: it appends the `app_context` marker to
fresh Android App Links and launcher shortcuts. After every `bubblewrap update`,
review that method and restore the customization if Bubblewrap replaced it.

## Build

From `android/`:

```bash
bubblewrap validate --url=https://meo-mai-moi.com
bubblewrap build
```

The build produces a signed APK and AAB. Both outputs are ignored by git. Upload
the AAB to the Android distributor; install the APK only for sideload QA:

```bash
bubblewrap install --apkFile=./app-release-signed.apk
```

The first SDK setup may request Android license acceptance. Read the displayed
terms and accept them before retrying the build.

Do not place passwords in shell history. For automation, provide
`BUBBLEWRAP_KEYSTORE_PASSWORD` and `BUBBLEWRAP_KEY_PASSWORD` through the CI
secret store.

## Digital Asset Links

The version-code-1 signed APK was installed and launched successfully on a real
Android phone on 2026-07-16. It currently opens with the Chrome Custom Tab
header because production still returns the SPA HTML shell at the well-known
URL. This is expected until the prepared Digital Asset Links file is deployed;
it is not an APK or application-layout defect.

Serve JSON with an `application/json` content type at the exact well-known URL:

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.meomaimoi.app",
      "sha256_cert_fingerprints": [
        "ANDROID_APP_SIGNING_SHA256"
      ]
    }
  }
]
```

Validate the deployed body and headers rather than accepting an HTTP 200 alone:

```bash
curl --fail --silent --show-error \
  https://meo-mai-moi.com/.well-known/assetlinks.json | jq .
curl --fail --silent --show-error --head \
  https://meo-mai-moi.com/.well-known/assetlinks.json
```

If verification fails, the app opens as a Custom Tab with browser chrome. Check
the installed certificate and Chrome's TWA logs on the device:

```bash
adb logcat -v brief | grep -E 'TWAProviderPicker|OriginVerifier|digital_asset_links'
```

Re-test after installing through the distribution track: store-installed builds
use the store app-signing certificate, not the local upload certificate.

## Distributor-specific UI

Do not treat `(display-mode: standalone)` as proof that the app came from Google
Play; normal browser-installed PWAs use the same display mode. The wrapper must
provide an explicit, testable app context that survives in-app navigation and
deep-link launches.

The frontend marker persists in session storage, which does not leak into
ordinary Chrome tabs that share the origin's cookies and local storage. Verify
that fresh Android App Link launches supply the marker; add a small launcher
customization if Bubblewrap's default deep-link path bypasses its configured
start URL.

In the Google Play context, Patreon and other external paid-support CTAs are
hidden. They remain visible on the website and normal installed PWA. Patreon
currently grants storage and supporter benefits, so it is not merely an
unconditional donation.

## Wrapper release checklist

1. Bump wrapper `versionCode` and `versionName` only when the AAB changes.
2. Validate the live PWA and canonical manifest.
3. Build and sideload the APK for smoke QA.
4. Build the signed AAB and upload it to the intended distribution track.
5. Install through the track and re-check Digital Asset Links.
6. Exercise auth, deep links, uploads/camera, back navigation, external links,
   offline cold start, notifications, and distributor-specific UI gating.
7. Record wrapper-specific release notes separately from web release notes.
