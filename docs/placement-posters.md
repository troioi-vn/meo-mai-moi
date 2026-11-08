# Placement posters

Open an open placement request and select **Poster**. Direct owners and active members of a Group sharing the pet see the button, including members who remain helpers because they have an active response. Poster access does not grant response-management permissions.

Choose a photo, then drag it or focus the photo and use arrow keys to reposition it. The preview and print share a 3:2 frame and the same focal point. The poster uses the existing 1600 px medium conversion for preview and printing, with the existing display URL as a fallback when `medium_url` is unavailable. Thumbnails are only for the photo strip. The poster adds no original-upload URL of its own. Camera EXIF, including GPS, can remain in original uploads, and the shared media serializer already falls back to the original for `url` and `medium_url` while a conversion is missing; such a photo prints from its original, as it displays everywhere else in the app.

Choose the poster language independently of the app language: English, Russian, Ukrainian, or Vietnamese. Notes use an available translation for that language. If it is unavailable, an editor notice explains that the original notes will print. The notice itself is hidden in print.

The facts line uses the existing species, sex and precision-aware age. Vaccination wording comes from the existing pet-card health summary in the authorized My Pets sections response. It is omitted if that response has no matching summary. No sterilization status is inferred.

## Sharing an edited poster

The URL stores `photo=<media id>`, `focus=<horizontal percentage>,<vertical percentage>`, `lang=en|ru|uk|vi`, `paper=a4|letter`, and `tabs=0|1`. Focus values are bounded to 0–100. Missing or invalid settings use safe defaults. Changing a photo resets its focus to the centre. All selected defaults are written into the link, so recipients with a different app language get the same settings.

A link uses current pet data; it is not an immutable copy. If the selected photo has been removed or fails to load, choose another photo before printing. Notes and age can change after a link is shared. Editor changes never alter the pet's primary photo or database records.

## Printing

Use A4 or Letter in portrait orientation at 100% scale. Browser headers and footers can remain enabled. The sheet reserves 15 mm margins, and its content is slightly shorter than the printable page to avoid rounding into another sheet. The app's viewport-height wrapper is reset only while printing a poster.

The headline stays at least 24 pt. A long name gets priority over request wording, which can wrap onto the second line. Bounded text regions can ellipsize; the full text is available in the editor through its title. Notes use remaining space and truncate visibly in the preview just as they print. Notes overflow never disables printing. Initial poster fetching waits for authentication to settle, because the capability and the response depend on the session. Background refreshes retain the rendered sheet and photo. Print waits for data, fonts and images, then rechecks the same connected sheet and settings before opening the dialog. An interrupted image decode can be retried without marking the photo as broken.

Optional tear-offs are off by default. Four tabs contain the compact listing address without its scheme and an 18 mm QR with a four-module quiet zone. Tab text is at least 8 pt, and dashed lines mark cuts. The main QR is 45 mm. All QR codes encode the full listing address, not the poster editor. No redirect or shortening service is involved.

## Verification

`frontend/e2e/placement-poster.spec.ts` uses API fixtures against the real poster route. It does not create or modify application data. Run it against a deployment built from the checkout under test. It requires the host's Poppler `pdfinfo` and `pdftotext` commands. No npm PDF parser or QR decoder is added.

The Chromium matrix covers all four languages, both paper sizes and tabs on/off with long content and a portrait image. It checks one PDF page at the correct paper dimensions with headers/footers enabled, the same crop in screen and print, contained essential regions, a 24 pt minimum headline, 18 mm tab QR codes, at least 8 pt tab text, and hidden editor controls. Separate cases cover no photo, a landscape image, and URL reload after photo/focus changes.

Also check the built-in Chromium print dialog with default settings on A4 and Letter: it must report one sheet. Physically scan the main QR and all four mini QRs from a printed sheet. No automated decoding is claimed unless an existing decoder is available. Firefox automation is outside this contract.
