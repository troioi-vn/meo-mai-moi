#!/usr/bin/env bash
# Print the NGINX vhost for the public media host.
#
#   utils/nginx-media-vhost.sh <root-env-file> > /etc/nginx/conf.d/<host>.conf
#
# Needs MEDIA_WEB_HOST (e.g. storage.example.com), MEDIA_WEB_UPSTREAM and
# MEDIA_WEB_BUCKET in the env file, and a certificate for the host under
# /etc/letsencrypt/live/<host>/. Run it once at setup and again only when
# deploy/nginx/media-storage.vhost.template changes; slot switches leave the
# file alone. See docs/deploy.md, "Media storage on S3".
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATE="$SCRIPT_DIR/../deploy/nginx/media-storage.vhost.template"
# shellcheck source=utils/nginx-media-env.sh
source "$SCRIPT_DIR/nginx-media-env.sh"

load_media_env "$1"

if [ -z "$MEDIA_HOST" ] || [ -z "$MEDIA_UPSTREAM" ] || [ -z "$MEDIA_BUCKET" ]; then
    echo "MEDIA_WEB_HOST, MEDIA_WEB_UPSTREAM and MEDIA_WEB_BUCKET must all be set" >&2
    exit 1
fi

sed \
    -e "s|__MEDIA_WEB_HOST__|${MEDIA_HOST}|g" \
    -e "s|__MEDIA_WEB_UPSTREAM__|${MEDIA_UPSTREAM}|g" \
    -e "s|__MEDIA_WEB_BUCKET__|${MEDIA_BUCKET}|g" \
    "$TEMPLATE"
