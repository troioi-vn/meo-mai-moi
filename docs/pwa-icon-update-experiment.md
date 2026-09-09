# Android PWA icon update experiment

Status: prepared for dev on 2026-09-09; device result pending.

An installed Meo Mai Moi PWA retained its old launcher artwork after a manual
Chrome update check reported success. On the same phone, Slot4Me showed an icon
review dialog after removing its maskable icon declaration.

This experiment removes the two maskable entries from all three web manifests,
including their backend copies. The ordinary 192px and 512px icons remain.
Artwork, icon URLs, manifest URLs, app ID, start URL, and app version are unchanged.
The maskable image files remain available. Android may now pad the ordinary icon.
The icon validator deliberately no longer requires maskable manifest entries,
but still validates the image files. Native Android assets are unchanged.

The user's dev PWA baseline has WebAPK version code 1 and shell version 189.
The phone runs Chrome 152.0.7977.75 on Android 16. Its manifest URL uses the dark
variant with the v1.19.3 query string. That existing URL must continue serving
the updated manifest.

After the dev deployment:

1. Confirm the installed manifest URL now advertises only the two ordinary icons.
2. Keep the existing installation. In Chrome's `chrome://webapks`, request an
   update for the dev app, then open that installed PWA.
3. Record whether an icon review dialog appears and which images it displays.
4. Accept the dialog if shown, close the PWA, and allow Chrome to finish updating
   while the phone is charging on Wi-Fi.
5. Record the resulting version code and launcher appearance, even if Chrome
   reports success without a visible change.

A prompt establishes that changing maskability triggers review on this device.
It does not establish that an installation with old artwork can receive new
artwork. That requires a separate test with an old-artwork installation.

Do not promote this experiment to production before reviewing the device result.
To undo it, revert the experiment commit, restoring the manifest declarations
and validator requirement.

Reference: [Chromium's WebApkUpdateManager](https://chromium.googlesource.com/chromium/src/+/main/chrome/android/java/src/org/chromium/chrome/browser/webapps/WebApkUpdateManager.java).
Chrome handles maskability changes separately from artwork differences and can
preserve an old icon when an artwork update is not eligible.
