#!/usr/bin/env bash
# Splice the /storage -> S3 location into a rendered vhost.
#
#   utils/nginx-media-location.sh <root-env-file> <backend-port> < vhost > out
#
# Replaces the `# __MEDIA_STORAGE_LOCATION__` marker line with
# deploy/nginx/media-storage.location.template when the env file sets both
# MEDIA_WEB_UPSTREAM (e.g. http://127.0.0.1:3902) and MEDIA_WEB_BUCKET (the
# public-read bucket, sent as Host to Garage's web endpoint). Otherwise the
# marker is dropped and /storage stays with the app container, as before.
#
# MEDIA_WEB_FALLBACK=1 keeps the template's FALLBACK blocks, which send bucket
# 404s to the app container (the old uploads volume). Use it only while moving
# files: a file deleted after the switch is gone from the bucket but still on
# the volume, so the fallback would keep serving it.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATE="$SCRIPT_DIR/../deploy/nginx/media-storage.location.template"
env_file="$1"
backend_port="$2"

env_value() {
    [ -f "$env_file" ] || return 0
    { grep -E "^$1=" "$env_file" || true; } | tail -n1 | cut -d '=' -f2- \
        | tr -d '\r' | sed 's/^[[:space:]]*//; s/[[:space:]]*$//; s/^"\(.*\)"$/\1/'
}

upstream="$(env_value MEDIA_WEB_UPSTREAM)"
bucket="$(env_value MEDIA_WEB_BUCKET)"
fallback="$(env_value MEDIA_WEB_FALLBACK)"
upstream="${upstream%/}"

if [ -z "$upstream" ] || [ -z "$bucket" ]; then
    grep -v '# __MEDIA_STORAGE_LOCATION__'
    exit 0
fi

case "$upstream" in
    http://*|https://*) ;;
    *) echo "MEDIA_WEB_UPSTREAM must start with http:// or https://" >&2; exit 1 ;;
esac
if ! [[ "$bucket" =~ ^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$ ]]; then
    echo "MEDIA_WEB_BUCKET is not a valid bucket name: $bucket" >&2
    exit 1
fi

case "$fallback" in
    1|true) keep_fallback=1 ;;
    ''|0|false) keep_fallback=0 ;;
    *) echo "MEDIA_WEB_FALLBACK must be 1 or 0, got: $fallback" >&2; exit 1 ;;
esac

block="$(sed \
    -e "s|__MEDIA_WEB_UPSTREAM__|${upstream}|g" \
    -e "s|__MEDIA_WEB_BUCKET__|${bucket}|g" \
    -e "s|__BACKEND_PORT__|${backend_port}|g" \
    "$TEMPLATE" \
    | awk -v keep="$keep_fallback" '
        /# __FALLBACK_BEGIN__/ { skipping = !keep; next }
        /# __FALLBACK_END__/ { skipping = 0; next }
        !skipping { print }
    ')"

BLOCK="$block" awk '/# __MEDIA_STORAGE_LOCATION__/ { print ENVIRON["BLOCK"]; next } { print }'
