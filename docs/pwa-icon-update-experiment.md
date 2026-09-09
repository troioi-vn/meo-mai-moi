# Android PWA icon update experiment

Status: dev review dialog confirmed by the user on 2026-09-10; selected for
production release v1.19.8. Production artwork replacement remains unverified.

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

## Device result and production decision

The first manual check at 19:52 on 2026-09-09 reported success without a prompt
and left version code 1 installed. The server was already serving the changed
manifest, but its one-hour HTTP cache lifetime could still have allowed Chrome
to use a previous response. We did not inspect the phone's cached response, so
caching remains an explanation rather than a proven cause.

The user subsequently supplied a screenshot of Chrome's "Review icon update"
dialog showing Meo Mai Moi on both sides. This confirms the review prompt for
the dev installation. The screenshot does not confirm the post-approval version
code or replacement of production's older artwork.

Ship the ordinary-icon manifest configuration in v1.19.8. Keep the app ID,
start URL, and all existing manifest paths stable. Stamp icon URLs with the new
release version using the normal release script. Do not add a timed restoration
of maskable declarations; that could introduce a second maskability transition.
The tradeoff is that Android can pad ordinary icons instead of using our
maskable artwork.

After production deploys, verify both root and build manifest copies, including
an old versioned manifest URL. Allow existing one-hour HTTP cache entries to
expire before interpreting an immediate no-op check as failure. On the existing
production PWA with old artwork, record the dialog images, approve the update,
and verify both the launcher artwork and WebAPK version code afterward. Do not
recommend reinstalling before collecting that result.

If the rollout needs reversing, restore the two maskable entries in all six
manifests and the validator requirement through a new release. Keep the existing
image files and app identity; do not force-move a published release tag.

Reference: [Chromium's WebApkUpdateManager](https://chromium.googlesource.com/chromium/src/+/main/chrome/android/java/src/org/chromium/chrome/browser/webapps/WebApkUpdateManager.java).
Chrome handles maskability changes separately from artwork differences and can
preserve an old icon when an artwork update is not eligible.
