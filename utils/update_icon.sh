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

MANIFEST_PATH="$FRONTEND_PUBLIC/site.webmanifest"
echo "Updating web manifest..."
cat >"$MANIFEST_PATH" <<'JSON'
{
  "name": "Meo Mai Moi",
  "short_name": "Meo Mai Moi",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#ffffff",
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
cp "$FRONTEND_PUBLIC/site.webmanifest" "$BACKEND_PUBLIC/site.webmanifest"

echo "Icon update complete."

