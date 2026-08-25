# Playwright runner for CI runs on the deploy host.
#
# The deploy host has no bun, no node_modules, and no browsers, and the project
# ships only a bun lockfile — so the official Playwright image gets bun added
# rather than the bun image getting browsers added, which would re-download
# ~400 MB of browsers on every run.
#
# PLAYWRIGHT_VERSION is derived from frontend/bun.lock by utils/e2e-run.sh, so
# the browsers here can never drift from the @playwright/test the suite imports.
# Bumping Playwright rebuilds this image automatically.

ARG PLAYWRIGHT_VERSION=1.62.1
FROM mcr.microsoft.com/playwright:v${PLAYWRIGHT_VERSION}-noble

ENV BUN_INSTALL=/usr/local
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl unzip ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && curl -fsSL https://bun.sh/install | bash \
    && bun --version

# Runs as the invoking user so report and test-result files in the mounted
# checkout are not left owned by root.
ENV HOME=/tmp
WORKDIR /work
