# shellcheck shell=bash

if [[ "${MEO_DEPLOY_DOCKER_LOADED:-false}" = "true" ]]; then
    return
fi
MEO_DEPLOY_DOCKER_LOADED="true"

: "${SCRIPT_DIR:?SCRIPT_DIR must be set before sourcing deploy_docker.sh}"
: "${PROJECT_ROOT:?PROJECT_ROOT must be set before sourcing deploy_docker.sh}"
: "${ENV_FILE:?ENV_FILE must be set before sourcing deploy_docker.sh}"

_deploy_docker_build_docs() {
    if [ ! -d "$PROJECT_ROOT/docs" ]; then
        return 0
    fi
    if ! command -v npm >/dev/null 2>&1; then
        note "⚠️  npm not found; skipping docs build (docs will not be updated)."
        return 0
    fi

    note "Building documentation (VitePress)..."
    (
        cd "$PROJECT_ROOT" && \
        npm --prefix docs install && \
        npm --prefix docs run docs:build
    ) || {
        note "⚠️  Failed to build docs. Continuing without updated docs."
        return 0
    }
    note "✓ Docs built successfully"
}

_deploy_docker_ensure_dev_certs() {
    local app_env_val
    local enable_https_val
    app_env_val=$(grep -E '^APP_ENV=' "$ENV_FILE" | tail -n1 | cut -d '=' -f2- || echo "")
    enable_https_val=$(grep -E '^ENABLE_HTTPS=' "$ENV_FILE" | tail -n1 | cut -d '=' -f2- || echo "")

    if [ "$app_env_val" = "development" ] && [ "$enable_https_val" = "true" ]; then
        if [ ! -f "$PROJECT_ROOT/backend/certs/localhost.crt" ] || [ ! -f "$PROJECT_ROOT/backend/certs/localhost.key" ]; then
            note "ℹ️  ENABLE_HTTPS=true and APP_ENV=development; dev certificates missing. Generating..."
            if [ -f "$SCRIPT_DIR/generate-dev-certs.sh" ]; then
                "$SCRIPT_DIR/generate-dev-certs.sh" <<< "y" || {
                    note "⚠️  Failed to generate dev certificates. HTTPS may not work."
                    return 0
                }
                note "✓ Dev certificates generated"
            else
                note "⚠️  Certificate generation script not found at $SCRIPT_DIR/generate-dev-certs.sh"
            fi
        fi
    fi
}

deploy_docker_start() {
    local no_cache="${1:-false}"

    note "Building and starting containers..."

    # Export VAPID_PUBLIC_KEY for build args (docker compose build needs it in environment)
    if [ -f "$ENV_FILE" ]; then
        local vapid_key
        vapid_key=$(grep -E '^VAPID_PUBLIC_KEY=' "$ENV_FILE" | tail -n1 | cut -d '=' -f2- | tr -d '"' | tr -d "'" || echo "")
        if [ -n "$vapid_key" ]; then
            export VAPID_PUBLIC_KEY="$vapid_key"
            note "ℹ️  Exported VAPID_PUBLIC_KEY for Docker build"
        fi
    fi

    local build_args=()
    if [ "$no_cache" = "true" ]; then
        echo "Building without cache..."
        run_cmd_with_console docker compose build --no-cache
        build_args+=(-d)
    else
        build_args+=(--build -d)
    fi

    _deploy_docker_build_docs
    _deploy_docker_ensure_dev_certs

    local compose_profiles_val=""
    local enable_https_val
    enable_https_val=$(grep -E '^ENABLE_HTTPS=' "$ENV_FILE" | tail -n1 | cut -d '=' -f2- || echo "")
    if [ "${APP_ENV_CURRENT:-}" = "development" ] && [ "$enable_https_val" = "true" ]; then
        compose_profiles_val="https"
        note "ℹ️  Enabling docker compose profile: https"
    fi

    if [ -n "$compose_profiles_val" ]; then
        COMPOSE_PROFILES="$compose_profiles_val" run_cmd_with_console docker compose --env-file "$ENV_FILE" up "${build_args[@]}"
    else
        run_cmd_with_console docker compose --env-file "$ENV_FILE" up "${build_args[@]}"
    fi
}

deploy_docker_wait_for_backend() {
    local timeout="${1:-300}"
    local interval="${2:-5}"

    note "Waiting for backend to become healthy..."

    local elapsed=0
    while [ "$elapsed" -lt "$timeout" ]; do
        if docker compose ps backend 2>/dev/null | grep -q '(healthy)'; then
            note "✓ Backend is healthy"
            return 0
        fi

        printf "⏳ Waiting... (%d/%ds)\r" "$elapsed" "$timeout"
        sleep "$interval"
        elapsed=$((elapsed + interval))
    done

    echo ""
    echo "✗ Backend failed to become healthy within ${timeout}s" >&2
    echo "Recent logs:" >&2
    docker compose logs --tail=20 backend >&2
    return 1
}

deploy_docker_verify_application() {
    note "Verifying application endpoints..."
    
    local failed=0

    # Determine endpoint from APP_URL if available; fallback to localhost:8000
    local app_url
    app_url=$(grep -E '^APP_URL=' "$ENV_FILE" | tail -n1 | cut -d '=' -f2- || echo "")
    app_url=$(printf "%s" "$app_url" | tr -d '\r')

    local enable_https_val
    enable_https_val=$(grep -E '^ENABLE_HTTPS=' "$ENV_FILE" | tail -n1 | cut -d '=' -f2- || echo "")
    enable_https_val=$(printf "%s" "$enable_https_val" | tr -d '\r')

    local host_port
    # Optional override via DEPLOY_HOST_PORT in env; defaults to 8000
    host_port=$(grep -E '^DEPLOY_HOST_PORT=' "$ENV_FILE" | tail -n1 | cut -d '=' -f2- || echo "")
    host_port=${host_port:-8000}

    # Build candidate endpoints
    local candidates=()
    if [ -n "$app_url" ]; then
        # Strip trailing slash
        local normalized
        normalized=${app_url%/}
        candidates+=("$normalized/api/version")
    fi
    candidates+=("http://localhost:${host_port}/api/version")

    # Try candidates from host
    local curl_ok=0
    local any_attempted=0
    local endpoint
    for endpoint in "${candidates[@]}"; do
        any_attempted=1
        if printf "%s" "$endpoint" | grep -q '^https://'; then
            # Allow self-signed in dev when https enabled
            if curl -skf --max-time 8 "$endpoint" >/dev/null 2>&1; then
                note "✓ $endpoint responding"
                curl_ok=1
                break
            else
                echo "✗ Failed to reach $endpoint" >&2
            fi
        else
            if curl -sf --max-time 8 "$endpoint" >/dev/null 2>&1; then
                note "✓ $endpoint responding"
                curl_ok=1
                break
            else
                echo "✗ Failed to reach $endpoint" >&2
            fi
        fi
    done
    if [ "$curl_ok" -ne 1 ] && [ "$any_attempted" -eq 1 ]; then
        failed=1
    fi

    # Also verify from inside the backend container (internal connectivity)
    note "Verifying internal endpoint from backend container..."
    if docker compose exec -T backend sh -c "curl -sf --max-time 8 http://localhost/api/version >/dev/null" 2>/dev/null; then
        note "✓ Internal http://localhost/api/version responding"
    else
        echo "✗ Backend internal endpoint failed" >&2
        failed=1
    fi
    
    # Verify database connectivity from application (fallback to psql from backend container)
    note "Verifying database connectivity from application..."
    if docker compose exec -T backend php artisan --no-ansi db:show 2>/dev/null | grep -q "pgsql"; then
        note "✓ Application connected to database"
    elif docker compose exec -T backend sh -lc 'PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USERNAME" -d "$DB_DATABASE" -c "SELECT 1" >/dev/null 2>&1'; then
        note "✓ Application can reach database via psql"
    else
        echo "✗ Application cannot connect to database" >&2
        echo "Database connection details:" >&2
        docker compose exec -T backend php artisan --no-ansi db:show 2>&1 | head -20 >&2
        failed=1
    fi
    
    if [ "$failed" -eq 1 ]; then
        echo "✗ Application verification failed" >&2
        if command -v log_error >/dev/null 2>&1; then
            log_error "Application verification failed"
        fi
        return 1
    fi
    
    note "✓ Application verification passed"
    if command -v log_success >/dev/null 2>&1; then
        log_success "Application verification passed"
    fi
    return 0
}

