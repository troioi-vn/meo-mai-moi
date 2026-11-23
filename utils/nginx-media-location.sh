#!/usr/bin/env bash
# Splice the /storage location into a rendered app vhost.
#
#   utils/nginx-media-location.sh <root-env-file> <backend-port> < vhost > out
#
# Replaces the `# __MEDIA_STORAGE_LOCATION__` marker line, by what the env file
# sets:
#
# - MEDIA_WEB_HOST (e.g. storage.example.com): uploads have their own host,
#   served by the vhost from utils/nginx-media-vhost.sh. /storage/<path> on the
#   app host becomes a 301 to https://<host>/<path>, so old links keep working.
# - otherwise MEDIA_WEB_UPSTREAM (e.g. http://127.0.0.1:3902) and
#   MEDIA_WEB_BUCKET (the public-read bucket, sent as Host to Garage's web
#   endpoint): /storage is proxied from the app host,
#   deploy/nginx/media-storage.location.template.
# - neither: the marker is dropped and /storage stays with the app container.
#
# MEDIA_WEB_FALLBACK=1 keeps the template's FALLBACK blocks, which send bucket
# 404s to the app container (the old uploads volume). Use it only while moving
# files: a file deleted after the switch is gone from the bucket but still on
# the volume, so the fallback would keep serving it. It has no effect with
# MEDIA_WEB_HOST, so setting both is an error.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATE="$SCRIPT_DIR/../deploy/nginx/media-storage.location.template"
# shellcheck source=utils/nginx-media-env.sh
source "$SCRIPT_DIR/nginx-media-env.sh"
env_file="$1"
backend_port="$2"

load_media_env "$env_file"

splice() {
    BLOCK="$1" awk '/# __MEDIA_STORAGE_LOCATION__/ { print ENVIRON["BLOCK"]; next } { print }'
}

if [ -n "$MEDIA_HOST" ]; then
    if [ "$MEDIA_FALLBACK" = 1 ]; then
        echo "MEDIA_WEB_FALLBACK=1 does not work with MEDIA_WEB_HOST; unset one" >&2
        exit 1
    fi
    splice "    # Uploads live on their own host (MEDIA_WEB_HOST in the root .env);
    # links to the old path redirect there, query string included.
    location ^~ /storage/ {
        rewrite ^/storage/(.*)\$ https://${MEDIA_HOST}/\$1 permanent;
    }"
    exit 0
fi

if [ -z "$MEDIA_UPSTREAM" ] || [ -z "$MEDIA_BUCKET" ]; then
    grep -v '# __MEDIA_STORAGE_LOCATION__'
    exit 0
fi

block="$(sed \
    -e "s|__MEDIA_WEB_UPSTREAM__|${MEDIA_UPSTREAM}|g" \
    -e "s|__MEDIA_WEB_BUCKET__|${MEDIA_BUCKET}|g" \
    -e "s|__BACKEND_PORT__|${backend_port}|g" \
    "$TEMPLATE" \
    | awk -v keep="$MEDIA_FALLBACK" '
        /# __FALLBACK_BEGIN__/ { skipping = !keep; next }
        /# __FALLBACK_END__/ { skipping = 0; next }
        !skipping { print }
    ')"

splice "$block"
