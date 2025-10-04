# Seed Images

This folder contains version-controlled placeholder images used by `DatabaseSeeder` for attaching sample pet photos.

Place JPEG files in `pets/` with names:

- cat1.jpeg .. cat5.jpeg
- dog1.jpeg .. dog5.jpeg

On seeding, these are copied into `storage/app/public/pets` if that directory is empty or missing individual files.

If you prefer to replace them with real photos, just swap the files here and commit. Avoid large files (>300KB) to keep repo size manageable.
