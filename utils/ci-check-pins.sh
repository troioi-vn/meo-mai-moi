#!/bin/sh
# Fails when versions that must move together have drifted apart:
#   - the PHP runtime base in backend/Dockerfile and in .woodpecker/test.yml
#   - the Playwright image tag and @playwright/test in frontend/bun.lock
# A drifted Playwright pair fails at browser launch with an unhelpful error;
# a drifted runtime base tests on a PHP the image does not ship.
set -eu

cd "$(dirname "$0")/.."
status=0

dockerfile_base=$(sed -n 's/^ARG PHP_RUNTIME_IMAGE=//p' backend/Dockerfile)
# shellcheck disable=SC2013 # image references contain no spaces
for base in $(sed -n 's/^ *image: *\(.*runtime-base:.*\)$/\1/p' .woodpecker/test.yml); do
    if [ "$base" != "$dockerfile_base" ]; then
        echo "runtime base drift: .woodpecker/test.yml uses $base, backend/Dockerfile uses $dockerfile_base" >&2
        status=1
    fi
done

image_pw=$(sed -n 's/^ *image: *mcr.microsoft.com\/playwright:v\([0-9.]*\)-.*/\1/p' .woodpecker/test.yml)
lock_pw=$(sed -n 's/.*"@playwright\/test": \["@playwright\/test@\([0-9.]*\)".*/\1/p' frontend/bun.lock)
if [ -z "$image_pw" ] || [ -z "$lock_pw" ]; then
    echo "could not read the Playwright versions (image: '$image_pw', bun.lock: '$lock_pw')" >&2
    status=1
elif [ "$image_pw" != "$lock_pw" ]; then
    echo "Playwright drift: image is v$image_pw, frontend/bun.lock has @playwright/test $lock_pw" >&2
    status=1
fi

[ "$status" -eq 0 ] && echo "Pinned versions agree"
exit "$status"
