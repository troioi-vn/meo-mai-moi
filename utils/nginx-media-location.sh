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

block="$(sed \
    -e "s|__MEDIA_WEB_UPSTREAM__|${upstream}|g" \
    -e "s|__MEDIA_WEB_BUCKET__|${bucket}|g" \
    -e "s|__BACKEND_PORT__|${backend_port}|g" \
    "$TEMPLATE")"

BLOCK="$block" awk '/# __MEDIA_STORAGE_LOCATION__/ { print ENVIRON["BLOCK"]; next } { print }'
