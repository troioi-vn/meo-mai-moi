# shellcheck shell=bash

if [[ "${MEO_DEPLOY_SETUP_LOADED:-false}" = "true" ]]; then
    return
fi
MEO_DEPLOY_SETUP_LOADED="true"

: "${SCRIPT_DIR:?SCRIPT_DIR must be set before sourcing setup.sh}"

PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_ROOT/backend/.env.docker"
ENV_EXAMPLE="$PROJECT_ROOT/backend/.env.docker.example"
# Per-run logs under .deploy/ with 30-day retention; symlinks at repo root for latest
DEPLOY_LOG_DIR="$PROJECT_ROOT/.deploy"
RUN_ID=""
DEPLOY_LOG=""
DEPLOY_LOG_JSON=""
DEPLOY_LOCK_FILE="$PROJECT_ROOT/deploy.lock"
LOCK_ACQUIRED="false"
setup_error_hooks=()
DEPLOY_START_TIME=""

setup_register_error_hook() {
    setup_error_hooks+=("$1")
}

setup_handle_error() {
    local line="${1:-0}"
    echo "✗ Deployment failed at line $line. Check $DEPLOY_LOG for details." >&2

    local hook
    for hook in "${setup_error_hooks[@]}"; do
        if [ -n "$hook" ] && declare -f "$hook" >/dev/null 2>&1; then
            if ! "$hook" "$line" >/dev/null 2>&1; then
                echo "⚠️  Error hook '$hook' failed while handling deployment error." >&2
            fi
        fi
    done
}

release_deploy_lock() {
    if [ "${LOCK_ACQUIRED:-false}" = "true" ]; then
        flock -u 5 || true
        exec 5>&- || true
        LOCK_ACQUIRED="false"
    fi
}

acquire_deploy_lock() {
    # Check for stale locks (older than 1 hour)
    local lock_age=0
    if [ -f "$DEPLOY_LOCK_FILE" ]; then
        lock_age=$(( $(date +%s) - $(stat -c %Y "$DEPLOY_LOCK_FILE" 2>/dev/null || echo 0) ))
        if [ "$lock_age" -gt 3600 ]; then
            echo "⚠️  Stale lock detected (${lock_age}s old). Removing..." >&2
            rm -f "$DEPLOY_LOCK_FILE"
        fi
    fi
    
    exec 5>"$DEPLOY_LOCK_FILE"
    if ! flock -n 5; then
        local lock_time="unknown"
        if [ -f "$DEPLOY_LOCK_FILE" ]; then
            lock_time=$(date -r "$DEPLOY_LOCK_FILE" 2>/dev/null || echo "unknown")
        fi
        exec 5>&- || true
        echo "✗ Another deployment is in progress (started: $lock_time)" >&2
        echo "  If this is a stale lock, wait for auto-cleanup or manually remove: $DEPLOY_LOCK_FILE" >&2
        exit 1
    fi
    LOCK_ACQUIRED="true"
    echo $$ > "$DEPLOY_LOCK_FILE"  # Store PID for debugging
}

prompt_with_default() {
    local prompt="$1"
    local def="$2"
    local var

    if [ "${NO_INTERACTIVE:-false}" = "true" ]; then
        var="$def"
    else
        read -r -p "$prompt [$def]: " var
        var=${var:-$def}
    fi

    printf "%s" "$var"
}

# Structured logging functions
log_event() {
    local level="$1"
    local message="$2"
    local extra="${3:-}"
    local timestamp
    timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    # Escape double quotes in message for JSON
    local escaped_message
    escaped_message=$(printf '%s' "$message" | sed 's/"/\\"/g')
    
    local json_line="{\"timestamp\":\"$timestamp\",\"level\":\"$level\",\"message\":\"$escaped_message\""
    
    if [ -n "$extra" ]; then
        local escaped_extra
        escaped_extra=$(printf '%s' "$extra" | sed 's/"/\\"/g')
        json_line="$json_line,\"extra\":\"$escaped_extra\""
    fi
    
    json_line="$json_line}"
    
    echo "$json_line" >> "$DEPLOY_LOG_JSON"
}

log_info() {
    log_event "INFO" "$1" "${2:-}"
}

log_warn() {
    log_event "WARN" "$1" "${2:-}"
}

log_error() {
    log_event "ERROR" "$1" "${2:-}"
}

log_success() {
    log_event "SUCCESS" "$1" "${2:-}"
}

setup_initialize() {
    if [[ "${MEO_DEPLOY_SETUP_INITIALIZED:-false}" = "true" ]]; then
        return
    fi
    MEO_DEPLOY_SETUP_INITIALIZED="true"

    NO_INTERACTIVE="${NO_INTERACTIVE:-false}"
    QUIET="${QUIET:-false}"

    # Record deployment start time
    DEPLOY_START_TIME=$(date +%s)
    RUN_ID=$(date -u +"%Y%m%d-%H%M%S")

    # Prepare log directory and compute file paths
    mkdir -p "$DEPLOY_LOG_DIR"
    DEPLOY_LOG="$DEPLOY_LOG_DIR/deploy-$RUN_ID.log"
    DEPLOY_LOG_JSON="$DEPLOY_LOG_DIR/deploy-$RUN_ID.json"

    # Preserve original stdout/stderr so we can write concise messages even in quiet mode
    exec 3>&1 4>&2

    # Initialize JSON log
    echo "{\"deployment_started\":\"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\"}" > "$DEPLOY_LOG_JSON"

    # Start logging (default: mirror to console + log). If --quiet is passed later, we'll reconfigure.
    exec > >(tee -a "$DEPLOY_LOG") 2>&1
    echo "=========================================="
    echo "Deployment started at $(date)"
    echo "=========================================="
    
    log_info "Deployment initialization started"

    trap 'release_deploy_lock' EXIT
    trap 'printf "\\n✗ Deployment interrupted.\\n" >&2; log_error "Deployment interrupted"; release_deploy_lock; exit 1' INT TERM

    acquire_deploy_lock
    echo "ℹ️  Deployment lock acquired at $DEPLOY_LOCK_FILE"
    log_info "Deployment lock acquired" "pid=$$"

    # Update convenience symlinks to latest logs
    ln -sf "$DEPLOY_LOG" "$PROJECT_ROOT/.deploy.log" 2>/dev/null || true
    ln -sf "$DEPLOY_LOG_JSON" "$PROJECT_ROOT/.deploy.log.json" 2>/dev/null || true

    # Remove logs older than 30 days
    find "$DEPLOY_LOG_DIR" -type f -name 'deploy-*.log' -mtime +30 -delete 2>/dev/null || true
    find "$DEPLOY_LOG_DIR" -type f -name 'deploy-*.json' -mtime +30 -delete 2>/dev/null || true

    # Ensure .env.docker exists before proceeding (interactive scaffolding)
    if [ ! -f "$ENV_FILE" ] && [ -f "$ENV_EXAMPLE" ]; then
        echo "ℹ️  'backend/.env.docker' not found."
        if [ "$NO_INTERACTIVE" = "true" ]; then
            REPLY_CREATE="y"
        else
            read -r -p "Create one from .env.docker.example now? (Y/n): " REPLY_CREATE
        fi
        REPLY_CREATE=${REPLY_CREATE:-Y}
        if [[ ! "$REPLY_CREATE" =~ ^[yY]([eE][sS])?$ ]]; then
            echo "✗ Cannot continue without backend/.env.docker. Aborting."
            exit 1
        fi

        cp "$ENV_EXAMPLE" "$ENV_FILE"

        echo ""
        echo "Let's set up a few basics for backend/.env.docker:"

        APP_NAME_INPUT=$(prompt_with_default "APP_NAME" "Meo Mai Moi")
        APP_ENV_INPUT=$(prompt_with_default "APP_ENV" "development")
        APP_URL_INPUT=$(prompt_with_default "APP_URL" "https://localhost")
        FRONTEND_URL_INPUT=$(prompt_with_default "FRONTEND_URL" "$APP_URL_INPUT")
        SEED_ADMIN_EMAIL_INPUT=$(prompt_with_default "SEED_ADMIN_EMAIL" "admin@catarchy.space")
        SEED_ADMIN_PASSWORD_INPUT=$(prompt_with_default "SEED_ADMIN_PASSWORD" "password")
        SEED_ADMIN_NAME_INPUT=$(prompt_with_default "SEED_ADMIN_NAME" "Super Admin")
        MAILGUN_DOMAIN_INPUT=$(prompt_with_default "MAILGUN_DOMAIN" "dev.meo-mai-moi.com")
        # Show 'none' as default but write empty when accepted
        MAILGUN_SECRET_SHOW_DEFAULT="none"
        MAILGUN_SECRET_RAW=$(prompt_with_default "MAILGUN_SECRET" "$MAILGUN_SECRET_SHOW_DEFAULT")
        if [ "$MAILGUN_SECRET_RAW" = "none" ]; then
            MAILGUN_SECRET_INPUT=""
        else
            MAILGUN_SECRET_INPUT="$MAILGUN_SECRET_RAW"
        fi

        # Apply values to the env file
        sed -i "s|^APP_NAME=.*|APP_NAME=\"${APP_NAME_INPUT}\"|" "$ENV_FILE"
        sed -i "s|^APP_ENV=.*|APP_ENV=${APP_ENV_INPUT}|" "$ENV_FILE"
        # Ensure APP_KEY exists as placeholder if missing
        if ! grep -q '^APP_KEY=' "$ENV_FILE"; then
            echo "APP_KEY=" >> "$ENV_FILE"
        fi
        sed -i "s|^APP_URL=.*|APP_URL=${APP_URL_INPUT}|" "$ENV_FILE"
        if grep -q '^FRONTEND_URL=' "$ENV_FILE"; then
            sed -i "s|^FRONTEND_URL=.*|FRONTEND_URL=${FRONTEND_URL_INPUT}|" "$ENV_FILE"
        else
            echo "FRONTEND_URL=${FRONTEND_URL_INPUT}" >> "$ENV_FILE"
        fi
        sed -i "s|^SEED_ADMIN_EMAIL=.*|SEED_ADMIN_EMAIL=${SEED_ADMIN_EMAIL_INPUT}|" "$ENV_FILE"
        sed -i "s|^SEED_ADMIN_PASSWORD=.*|SEED_ADMIN_PASSWORD=${SEED_ADMIN_PASSWORD_INPUT}|" "$ENV_FILE"
        sed -i "s|^SEED_ADMIN_NAME=.*|SEED_ADMIN_NAME=\"${SEED_ADMIN_NAME_INPUT}\"|" "$ENV_FILE"
        sed -i "s|^MAILGUN_DOMAIN=.*|MAILGUN_DOMAIN=${MAILGUN_DOMAIN_INPUT}|" "$ENV_FILE"
        # MAILGUN_SECRET may be empty; preserve line even if blank
        if grep -q '^MAILGUN_SECRET=' "$ENV_FILE"; then
            sed -i "s|^MAILGUN_SECRET=.*|MAILGUN_SECRET=${MAILGUN_SECRET_INPUT}|" "$ENV_FILE"
        else
            echo "MAILGUN_SECRET=${MAILGUN_SECRET_INPUT}" >> "$ENV_FILE"
        fi

        # ENABLE_HTTPS default: false (opt-in) to avoid dev port conflicts and proxy issues
        if [ "$APP_ENV_INPUT" = "development" ]; then
            if grep -q '^ENABLE_HTTPS=' "$ENV_FILE"; then
                sed -i "s|^ENABLE_HTTPS=.*|ENABLE_HTTPS=false|" "$ENV_FILE"
            else
                echo "ENABLE_HTTPS=false" >> "$ENV_FILE"
            fi
        else
            if grep -q '^ENABLE_HTTPS=' "$ENV_FILE"; then
                sed -i "s|^ENABLE_HTTPS=.*|ENABLE_HTTPS=false|" "$ENV_FILE"
            else
                echo "ENABLE_HTTPS=false" >> "$ENV_FILE"
            fi
        fi

        echo ""
        echo "✓ backend/.env.docker created with your settings"
        echo "   - APP_ENV=$APP_ENV_INPUT"
        echo "   - APP_URL=$APP_URL_INPUT"
        echo "   - SEED_ADMIN_EMAIL=$SEED_ADMIN_EMAIL_INPUT"
        echo "   - FRONTEND_URL=$FRONTEND_URL_INPUT"

        # Generate APP_KEY if empty
        echo ""
        echo "Generating APP_KEY for backend/.env.docker..."
        CURRENT_APP_KEY=$(grep -E '^APP_KEY=' "$ENV_FILE" | tail -n1 | cut -d '=' -f2- | tr -d '\r')
        if [ -z "$CURRENT_APP_KEY" ]; then
            NEW_APP_KEY=""
            if command -v php >/dev/null 2>&1; then
                # Prefer PHP's random_bytes for high-quality randomness
                NEW_APP_KEY=$(php -r 'echo "base64:".base64_encode(random_bytes(32));' 2>/dev/null || true)
            fi
            if [ -z "$NEW_APP_KEY" ] && command -v openssl >/dev/null 2>&1; then
                NEW_APP_KEY="base64:$(openssl rand -base64 32 2>/dev/null || true)"
            fi
            if [ -z "$NEW_APP_KEY" ] && command -v base64 >/dev/null 2>&1; then
                NEW_APP_KEY="base64:$(head -c 32 /dev/urandom | base64 2>/dev/null || true)"
            fi
            if [ -n "$NEW_APP_KEY" ]; then
                sed -i "s|^APP_KEY=.*|APP_KEY=${NEW_APP_KEY}|" "$ENV_FILE"
                echo "✓ APP_KEY generated"
                log_success "APP_KEY generated for backend/.env.docker"
            else
                echo "✗ Failed to generate APP_KEY automatically. Please run: docker compose run --rm backend php artisan key:generate --show and update backend/.env.docker"
                log_error "Failed to generate APP_KEY automatically"
            fi
        else
            echo "APP_KEY already present in backend/.env.docker"
            log_info "APP_KEY already present in env file"
        fi
    fi

    APP_ENV_CURRENT=""
    if [ -f "$ENV_FILE" ]; then
        APP_ENV_CURRENT=$(grep -E '^APP_ENV=' "$ENV_FILE" | tail -n1 | cut -d '=' -f2- || echo "")
        APP_ENV_CURRENT=$(printf "%s" "$APP_ENV_CURRENT" | tr -d '\r')
    fi
    if [ -n "${APP_ENV_CHOICE:-}" ]; then
        APP_ENV_CURRENT="$APP_ENV_CHOICE"
    fi
    if [ -z "$APP_ENV_CURRENT" ]; then
        APP_ENV_CURRENT="development"
    fi

    # Validate required tools
    for cmd in docker git flock; do
        if ! command -v "$cmd" &> /dev/null; then
            echo "✗ Required command '$cmd' not found. Please install it first." >&2
            exit 1
        fi
    done

    # Trap errors for better debugging (allows downstream hooks)
    trap 'setup_handle_error $LINENO' ERR
}

print_help() {
    cat <<'EOF'
Usage: ./utils/deploy.sh [--fresh] [--seed] [--no-cache] [--no-interactive] [--quiet] [--allow-empty-db] [--test-notify]

Flags:
    --fresh          Drop and recreate database, re-run all migrations; also clears volumes/containers.
    --seed           Seed the database after running migrations (or migrate:fresh).
    --no-cache       Build Docker images without using cache.
    --no-interactive Skip confirmation prompts (useful for automated scripts/CI).
    --quiet          Reduce console output; full logs go to .deploy.log.
    --allow-empty-db Allow deployment to proceed even if database appears empty (non-fresh).
    --test-notify    Test Telegram notifications and exit (requires TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID).

Default behavior (no flags):
    - Build and start containers (preserves existing database data)
    - Wait for backend to be healthy
    - Run database migrations only (no seeding, no data loss)

Examples:
    ./utils/deploy.sh                          # normal deploy (migrate only, preserves data)
    ./utils/deploy.sh --seed                   # migrate + seed
    ./utils/deploy.sh --fresh                  # reset DB/volumes (asks for confirmation)
    ./utils/deploy.sh --fresh --seed           # fresh + seed (asks for confirmation)
    ./utils/deploy.sh --fresh --no-interactive # fresh without prompts (for CI/automation)
    ./utils/deploy.sh --no-cache               # rebuild images without cache
    ./utils/deploy.sh --test-notify            # test Telegram notifications

IMPORTANT: Data Preservation
    - Without --fresh: All existing database data is PRESERVED
    - The pgdata Docker volume is NOT removed (only containers stop)
    - Only NEW migrations are applied
    - Use --fresh ONLY if you want a clean slate with no old data
    - Deploy will BLOCK if DB appears empty (unless --allow-empty-db or --seed)

Telegram Notifications:
    - Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in backend/.env.docker to enable
    - Notifications sent on deployment start, success, and failure
    - Use --test-notify to verify configuration
EOF
}

determine_deploy_branch() {
    local env="$1"
    local branch=""
    
    # Load project-specific deploy config if it exists
    if [ -f "$PROJECT_ROOT/.deploy-config" ] && [ -z "${DEPLOY_CONFIG_LOADED:-}" ]; then
        # shellcheck source=/dev/null
        source "$PROJECT_ROOT/.deploy-config"
        DEPLOY_CONFIG_LOADED="true"
    fi
    
    # Check environment-specific override variable (e.g., DEPLOY_BRANCH_PRODUCTION)
    local override_var="DEPLOY_BRANCH_${env^^}"
    # Use indirect expansion to get the value
    branch="${!override_var:-}"
    
    if [ -n "$branch" ]; then
        echo "$branch"
        return
    fi
    
    # Fallback to standard environment defaults
    case "$env" in
        production|prod)
            echo "${DEPLOY_PRODUCTION_BRANCH:-main}"
            ;;
        staging)
            echo "${DEPLOY_STAGING_BRANCH:-staging}"
            ;;
        *)
            echo "${DEPLOY_DEVELOPMENT_BRANCH:-dev}"
            ;;
    esac
}

