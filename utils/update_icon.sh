#!/usr/bin/env bash

set -euo pipefail

usage() {
  echo "Usage: $0 /absolute/path/to/icon.png" >&2
  exit 1
}

if [ "$#" -ne 1 ]; then
  usage
fi

if ! command -v convert >/dev/null 2>&1; then
  echo "Error: ImageMagick 'convert' command not found. Please install ImageMagick." >&2
  exit 1
fi

SOURCE_ICON="$1"

if [ ! -f "$SOURCE_ICON" ]; then
  echo "Error: File '$SOURCE_ICON' not found." >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(realpath "$SCRIPT_DIR/..")"
FRONTEND_PUBLIC="$REPO_ROOT/frontend/public"
BACKEND_PUBLIC="$REPO_ROOT/backend/public"

mkdir -p "$FRONTEND_PUBLIC" "$BACKEND_PUBLIC"

echo "Generating favicon.ico..."
convert "$SOURCE_ICON" -background none -define icon:auto-resize=256,128,64,48,32,16 "$FRONTEND_PUBLIC/favicon.ico"

declare -A PNG_TARGETS=(
  [16]="icon-16.png"
  [32]="icon-32.png"
  [192]="icon-192.png"
  [512]="icon-512.png"
)

for SIZE in "${!PNG_TARGETS[@]}"; do
  TARGET_NAME="${PNG_TARGETS[$SIZE]}"
  echo "Generating ${TARGET_NAME} (${SIZE}x${SIZE})..."
  convert "$SOURCE_ICON" -resize "${SIZE}x${SIZE}" "$FRONTEND_PUBLIC/$TARGET_NAME"
done

echo "Generating apple-touch-icon.png (180x180)..."
convert "$SOURCE_ICON" -resize 180x180 "$FRONTEND_PUBLIC/apple-touch-icon.png"

echo "Generating maskable-192.png (192x192)..."
convert "$SOURCE_ICON" -resize 192x192 "$FRONTEND_PUBLIC/maskable-192.png"

echo "Generating maskable-512.png (512x512)..."
convert "$SOURCE_ICON" -resize 512x512 "$FRONTEND_PUBLIC/maskable-512.png"

echo "Updating web manifests..."
cat >"$FRONTEND_PUBLIC/site-light.webmanifest" <<'JSON'
{
  "name": "Meo Mai Moi",
  "short_name": "Meo Mai Moi",
  "description": "Pet care & adoption platform",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#ffffff",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "/icon-192.png",
      "type": "image/png",
      "sizes": "192x192"
    },
    {
      "src": "/icon-512.png",
      "type": "image/png",
      "sizes": "512x512"
    },
    {
      "src": "/maskable-192.png",
      "type": "image/png",
      "sizes": "192x192",
      "purpose": "maskable"
    },
    {
      "src": "/maskable-512.png",
      "type": "image/png",
      "sizes": "512x512",
      "purpose": "maskable"
    }
  ]
}
JSON

cat >"$FRONTEND_PUBLIC/site-dark.webmanifest" <<'JSON'
{
  "name": "Meo Mai Moi",
  "short_name": "Meo Mai Moi",
  "description": "Pet care & adoption platform",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "background_color": "#0f172a",
  "theme_color": "#111827",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "/icon-192.png",
      "type": "image/png",
      "sizes": "192x192"
    },
    {
      "src": "/icon-512.png",
      "type": "image/png",
      "sizes": "512x512"
    },
    {
      "src": "/maskable-192.png",
      "type": "image/png",
      "sizes": "192x192",
      "purpose": "maskable"
    },
    {
      "src": "/maskable-512.png",
      "type": "image/png",
      "sizes": "512x512",
      "purpose": "maskable"
    }
  ]
}
JSON

echo "Syncing assets to backend public directory..."
cp "$FRONTEND_PUBLIC/favicon.ico" "$BACKEND_PUBLIC/favicon.ico"
cp "$FRONTEND_PUBLIC/icon-16.png" "$BACKEND_PUBLIC/icon-16.png"
cp "$FRONTEND_PUBLIC/icon-32.png" "$BACKEND_PUBLIC/icon-32.png"
cp "$FRONTEND_PUBLIC/icon-192.png" "$BACKEND_PUBLIC/icon-192.png"
cp "$FRONTEND_PUBLIC/icon-512.png" "$BACKEND_PUBLIC/icon-512.png"
cp "$FRONTEND_PUBLIC/apple-touch-icon.png" "$BACKEND_PUBLIC/apple-touch-icon.png"
cp "$FRONTEND_PUBLIC/maskable-192.png" "$BACKEND_PUBLIC/maskable-192.png"
cp "$FRONTEND_PUBLIC/maskable-512.png" "$BACKEND_PUBLIC/maskable-512.png"
cp "$FRONTEND_PUBLIC/site-light.webmanifest" "$BACKEND_PUBLIC/site-light.webmanifest"
cp "$FRONTEND_PUBLIC/site-dark.webmanifest" "$BACKEND_PUBLIC/site-dark.webmanifest"

echo "Icon update complete."

