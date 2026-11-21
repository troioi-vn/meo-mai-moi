#!/usr/bin/env bash
# Sourced by utils/nginx-media-location.sh and utils/nginx-media-vhost.sh.
# load_media_env <root-env-file> reads and validates the MEDIA_WEB_* values into
# MEDIA_UPSTREAM, MEDIA_BUCKET, MEDIA_HOST and MEDIA_FALLBACK (0 or 1). Values
# that are unset stay empty; values that are set but malformed exit 1.
# shellcheck disable=SC2034 # the MEDIA_* globals are read by the callers

media_env_value() {
    local env_file="$1" key="$2"
    [ -f "$env_file" ] || return 0
    { grep -E "^$key=" "$env_file" || true; } | tail -n1 | cut -d '=' -f2- \
        | tr -d '\r' | sed 's/^[[:space:]]*//; s/[[:space:]]*$//; s/^"\(.*\)"$/\1/'
}

load_media_env() {
    local env_file="$1" fallback
    MEDIA_UPSTREAM="$(media_env_value "$env_file" MEDIA_WEB_UPSTREAM)"
    MEDIA_UPSTREAM="${MEDIA_UPSTREAM%/}"
    MEDIA_BUCKET="$(media_env_value "$env_file" MEDIA_WEB_BUCKET)"
    MEDIA_HOST="$(media_env_value "$env_file" MEDIA_WEB_HOST)"
    fallback="$(media_env_value "$env_file" MEDIA_WEB_FALLBACK)"

    if [ -n "$MEDIA_UPSTREAM" ]; then
        case "$MEDIA_UPSTREAM" in
            http://*|https://*) ;;
            *) echo "MEDIA_WEB_UPSTREAM must start with http:// or https://" >&2; exit 1 ;;
        esac
    fi
    if [ -n "$MEDIA_BUCKET" ] && ! [[ "$MEDIA_BUCKET" =~ ^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$ ]]; then
        echo "MEDIA_WEB_BUCKET is not a valid bucket name: $MEDIA_BUCKET" >&2
        exit 1
    fi
    if [ -n "$MEDIA_HOST" ] && ! [[ "$MEDIA_HOST" =~ ^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$ ]]; then
        echo "MEDIA_WEB_HOST is not a valid host name: $MEDIA_HOST" >&2
        exit 1
    fi
    case "$fallback" in
        1) MEDIA_FALLBACK=1 ;;
        ''|0) MEDIA_FALLBACK=0 ;;
        *) echo "MEDIA_WEB_FALLBACK must be 1 or 0, got: $fallback" >&2; exit 1 ;;
    esac
}
