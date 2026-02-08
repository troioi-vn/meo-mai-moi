# shellcheck shell=bash

if [[ "${MEO_DEPLOY_SETUP_LOADED:-false}" = "true" ]]; then
    return
fi
MEO_DEPLOY_SETUP_LOADED="true"

: "${SCRIPT_DIR:?SCRIPT_DIR must be set before sourcing setup.sh}"

PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
# Dual env file approach:
# - Root .env: Docker Compose variables (build args, VAPID keys, etc.)
# - backend/.env: Laravel runtime configuration
ROOT_ENV_FILE="$PROJECT_ROOT/.env"
ROOT_ENV_EXAMPLE="$PROJECT_ROOT/.env.example"
ENV_FILE="$PROJECT_ROOT/backend/.env"
ENV_EXAMPLE="$PROJECT_ROOT/backend/.env.example"
# Legacy support for old deployments
LEGACY_ENV_FILE="$PROJECT_ROOT/backend/.env.docker"
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

# Generate VAPID keys using bun x web-push
generate_vapid_keys() {
    echo "Checking for Bun..."
    
    if ! command -v bun >/dev/null 2>&1; then
        echo "✗ Bun not found. Please install Bun first."
        echo "  Visit: https://bun.sh/"
        log_error "bun not available for VAPID key generation"
        return 1
    fi
    
    echo "Generating VAPID keys..."
    local output
    if ! output=$(bun x web-push generate-vapid-keys 2>&1); then
        echo "✗ Failed to generate VAPID keys"
        echo "$output"
        log_error "VAPID key generation failed" "output=$output"
        return 1
    fi
    
    # Parse the output
    # Expected format:
    # =======================================
    # Public Key:
    # <public_key>
    # Private Key:
    # <private_key>
    # =======================================
    
    local public_key
    local private_key
    
    public_key=$(echo "$output" | grep -A 1 "Public Key:" | tail -n 1 | tr -d '\r\n ')
    private_key=$(echo "$output" | grep -A 1 "Private Key:" | tail -n 1 | tr -d '\r\n ')
    
    if [ -z "$public_key" ] || [ -z "$private_key" ]; then
        echo "✗ Failed to parse VAPID keys from output"
        log_error "Failed to parse VAPID keys"
        return 1
    fi
    
    # Export for caller
    GENERATED_VAPID_PUBLIC_KEY="$public_key"
    GENERATED_VAPID_PRIVATE_KEY="$private_key"
    
    echo "✓ VAPID keys generated successfully"
    log_success "VAPID keys generated"
    return 0
}

# Check if VAPID keys are present in a file
check_vapid_keys() {
    local file="$1"
    local pub
    local priv
    
    if [ ! -f "$file" ]; then
        return 1
    fi
    
    pub=$(grep -E '^VAPID_PUBLIC_KEY=' "$file" 2>/dev/null | cut -d '=' -f2- | tr -d '"' | tr -d "'" | tr -d ' ' || echo "")
    priv=$(grep -E '^VAPID_PRIVATE_KEY=' "$file" 2>/dev/null | cut -d '=' -f2- | tr -d '"' | tr -d "'" | tr -d ' ' || echo "")
    
    if [ -n "$pub" ] && [ -n "$priv" ]; then
        return 0  # Keys exist
    else
        return 1  # Keys missing or empty
    fi
}

# Update VAPID keys in an env file
update_vapid_keys() {
    local file="$1"
    local public_key="$2"
    local private_key="$3"
    
    if [ ! -f "$file" ]; then
        echo "✗ File not found: $file"
        return 1
    fi
    
    # Update or add VAPID_PUBLIC_KEY
    if grep -q '^VAPID_PUBLIC_KEY=' "$file"; then
        sed -i "s|^VAPID_PUBLIC_KEY=.*|VAPID_PUBLIC_KEY=$public_key|" "$file"
    else
        {
            echo "" 
            echo "# Web Push (VAPID) Configuration" 
            echo "VAPID_PUBLIC_KEY=$public_key" 
        } >> "$file"
    fi
    
    # Update or add VAPID_PRIVATE_KEY
    if grep -q '^VAPID_PRIVATE_KEY=' "$file"; then
        sed -i "s|^VAPID_PRIVATE_KEY=.*|VAPID_PRIVATE_KEY=$private_key|" "$file"
    else
    echo "VAPID_PRIVATE_KEY=$private_key" >> "$file"
    fi
    
    return 0
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
    # shellcheck disable=SC2034 # consumed by deploy.sh to compute total deployment duration
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

    # Legacy migration: If old .env.docker exists but new .env doesn't, migrate
    if [ -f "$LEGACY_ENV_FILE" ] && [ ! -f "$ENV_FILE" ]; then
        echo "ℹ️  Migrating from legacy backend/.env.docker to backend/.env..."
        cp "$LEGACY_ENV_FILE" "$ENV_FILE"
        echo "✓ Migration complete. You can remove backend/.env.docker manually if desired."
        log_info "Migrated legacy env file" "from=$LEGACY_ENV_FILE to=$ENV_FILE"
    fi

    # Ensure root .env exists
    if [ ! -f "$ROOT_ENV_FILE" ] && [ -f "$ROOT_ENV_EXAMPLE" ]; then
        echo ""
        echo "ℹ️  Root '.env' not found. Creating from .env.example..."
        cp "$ROOT_ENV_EXAMPLE" "$ROOT_ENV_FILE"
        
        # Try to populate VAPID keys from legacy or backup files
        local vapid_source=""
        if [ -f "$LEGACY_ENV_FILE" ]; then
            vapid_source="$LEGACY_ENV_FILE"
        elif [ -f "$PROJECT_ROOT/backend/.env.backup" ]; then
            vapid_source="$PROJECT_ROOT/backend/.env.backup"
        fi
        
        local keys_populated=false
        if [ -n "$vapid_source" ]; then
            local vapid_pub
            vapid_pub=$(grep -E '^VAPID_PUBLIC_KEY=' "$vapid_source" 2>/dev/null | cut -d '=' -f2- | tr -d '"' | tr -d "'" || echo "")
            local vapid_priv
            vapid_priv=$(grep -E '^VAPID_PRIVATE_KEY=' "$vapid_source" 2>/dev/null | cut -d '=' -f2- | tr -d '"' | tr -d "'" || echo "")
            
            if [ -n "$vapid_pub" ] && [ -n "$vapid_priv" ]; then
                sed -i "s|^VAPID_PUBLIC_KEY=.*|VAPID_PUBLIC_KEY=$vapid_pub|" "$ROOT_ENV_FILE"
                sed -i "s|^VAPID_PRIVATE_KEY=.*|VAPID_PRIVATE_KEY=$vapid_priv|" "$ROOT_ENV_FILE"
                echo "✓ Created .env with VAPID keys from existing configuration"
                log_info "Populated root env with VAPID keys" "source=$vapid_source"
                keys_populated=true
            fi
        fi
        
        if [ "$keys_populated" = "false" ]; then
            echo "✓ Created .env (VAPID keys need to be configured)"
            echo ""
            echo "⚠️  VAPID keys are required for push notifications."
            
            if [ "$NO_INTERACTIVE" = "false" ]; then
                echo ""
                echo "Would you like to generate VAPID keys now?"
                echo ""
                echo "⚠️  WARNING: If you already have users with push subscriptions,"
                echo "   generating new keys will invalidate all existing subscriptions."
                echo "   Only generate new keys for fresh deployments or if you're certain"
                echo "   no active push subscriptions exist."
                echo ""
                read -r -p "Generate new VAPID keys? (y/N): " REPLY_GENERATE
                REPLY_GENERATE=${REPLY_GENERATE:-N}
                
                if [[ "$REPLY_GENERATE" =~ ^[yY]([eE][sS])?$ ]]; then
                    if generate_vapid_keys; then
                        update_vapid_keys "$ROOT_ENV_FILE" "$GENERATED_VAPID_PUBLIC_KEY" "$GENERATED_VAPID_PRIVATE_KEY"
                        echo "✓ VAPID keys added to .env"
                        log_success "Generated and saved VAPID keys to root env"
                    else
                        echo ""
                        echo "⚠️  Failed to generate VAPID keys automatically."
                        echo "   Please generate manually with: bun x web-push generate-vapid-keys"
                        echo "   Then add to both .env and backend/.env"
                    fi
                else
                    echo ""
                    echo "ℹ️  Skipped VAPID key generation."
                    echo "   Generate manually with: bun x web-push generate-vapid-keys"
                    echo "   Then add to both .env and backend/.env"
                fi
            else
                echo "   (Non-interactive mode: skipping auto-generation)"
                echo "   Generate with: bun x web-push generate-vapid-keys"
                echo "   Then add to both .env and backend/.env"
            fi
        fi
        
        log_info "Created root env file" "file=$ROOT_ENV_FILE"
    fi

    # Ensure backend/.env exists before proceeding (interactive scaffolding)
    if [ ! -f "$ENV_FILE" ] && [ -f "$ENV_EXAMPLE" ]; then
        echo "ℹ️  'backend/.env' not found."
        if [ "$NO_INTERACTIVE" = "true" ]; then
            REPLY_CREATE="y"
        else
            read -r -p "Create one from backend/.env.example now? (Y/n): " REPLY_CREATE
        fi
        REPLY_CREATE=${REPLY_CREATE:-Y}
        if [[ ! "$REPLY_CREATE" =~ ^[yY]([eE][sS])?$ ]]; then
            echo "✗ Cannot continue without backend/.env. Aborting."
            exit 1
        fi

        cp "$ENV_EXAMPLE" "$ENV_FILE"

        echo ""
        echo "Let's set up a few basics for backend/.env:"

        APP_NAME_INPUT=$(prompt_with_default "APP_NAME" "Meo Mai Moi")
        APP_ENV_INPUT=$(prompt_with_default "APP_ENV" "development")
        APP_URL_INPUT=$(prompt_with_default "APP_URL" "http://localhost:8000")
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
        MAILGUN_WEBHOOK_SIGNING_KEY_SHOW_DEFAULT="none"
        MAILGUN_WEBHOOK_SIGNING_KEY_RAW=$(prompt_with_default "MAILGUN_WEBHOOK_SIGNING_KEY" "$MAILGUN_WEBHOOK_SIGNING_KEY_SHOW_DEFAULT")
        if [ "$MAILGUN_WEBHOOK_SIGNING_KEY_RAW" = "none" ]; then
            MAILGUN_WEBHOOK_SIGNING_KEY_INPUT=""
        else
            MAILGUN_WEBHOOK_SIGNING_KEY_INPUT="$MAILGUN_WEBHOOK_SIGNING_KEY_RAW"
        fi

        REVERB_APP_ID_INPUT=$(prompt_with_default "REVERB_APP_ID" "836270")
        REVERB_APP_KEY_INPUT=$(prompt_with_default "REVERB_APP_KEY" "mgyigyotlxz3rse8xcu4")
        REVERB_APP_SECRET_INPUT=$(prompt_with_default "REVERB_APP_SECRET" "o2eqgfdsoxhmzo3u6l6i")
        REVERB_HOST_INPUT=$(prompt_with_default "REVERB_HOST" "localhost")
        REVERB_PORT_INPUT=$(prompt_with_default "REVERB_PORT" "8080")
        REVERB_SCHEME_INPUT=$(prompt_with_default "REVERB_SCHEME" "http")

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
        # MAILGUN_WEBHOOK_SIGNING_KEY may be empty; preserve line even if blank
        if grep -q '^MAILGUN_WEBHOOK_SIGNING_KEY=' "$ENV_FILE"; then
            sed -i "s|^MAILGUN_WEBHOOK_SIGNING_KEY=.*|MAILGUN_WEBHOOK_SIGNING_KEY=${MAILGUN_WEBHOOK_SIGNING_KEY_INPUT}|" "$ENV_FILE"
        else
            echo "MAILGUN_WEBHOOK_SIGNING_KEY=${MAILGUN_WEBHOOK_SIGNING_KEY_INPUT}" >> "$ENV_FILE"
        fi

        sed -i "s|^REVERB_APP_ID=.*|REVERB_APP_ID=${REVERB_APP_ID_INPUT}|" "$ENV_FILE"
        sed -i "s|^REVERB_APP_KEY=.*|REVERB_APP_KEY=${REVERB_APP_KEY_INPUT}|" "$ENV_FILE"
        sed -i "s|^REVERB_APP_SECRET=.*|REVERB_APP_SECRET=${REVERB_APP_SECRET_INPUT}|" "$ENV_FILE"
        sed -i "s|^REVERB_HOST=.*|REVERB_HOST=\"${REVERB_HOST_INPUT}\"|" "$ENV_FILE"
        sed -i "s|^REVERB_PORT=.*|REVERB_PORT=${REVERB_PORT_INPUT}|" "$ENV_FILE"
        sed -i "s|^REVERB_SCHEME=.*|REVERB_SCHEME=${REVERB_SCHEME_INPUT}|" "$ENV_FILE"

        sed -i "s|^VITE_REVERB_APP_KEY=.*|VITE_REVERB_APP_KEY=\"\${REVERB_APP_KEY}\"|" "$ENV_FILE"
        sed -i "s|^VITE_REVERB_HOST=.*|VITE_REVERB_HOST=\"\${REVERB_HOST}\"|" "$ENV_FILE"
        sed -i "s|^VITE_REVERB_PORT=.*|VITE_REVERB_PORT=\"\${REVERB_PORT}\"|" "$ENV_FILE"
        sed -i "s|^VITE_REVERB_SCHEME=.*|VITE_REVERB_SCHEME=\"\${REVERB_SCHEME}\"|" "$ENV_FILE"

        # Sync VITE_REVERB variables to root .env for Docker build args
        if [ -f "$ROOT_ENV_FILE" ]; then
            for var in VITE_REVERB_APP_KEY VITE_REVERB_HOST VITE_REVERB_PORT VITE_REVERB_SCHEME; do
                val=$(grep "^${var}=" "$ENV_FILE" | cut -d'=' -f2- | tr -d '"' | tr -d "'")
                # If it's a reference like ${REVERB_APP_KEY}, resolve it
                if [[ "$val" =~ \$\{([A-Z0-9_]+)\} ]]; then
                    ref_var="${BASH_REMATCH[1]}"
                    val=$(grep "^${ref_var}=" "$ENV_FILE" | cut -d'=' -f2- | tr -d '"' | tr -d "'")
                fi
                
                if grep -q "^${var}=" "$ROOT_ENV_FILE"; then
                    sed -i "s|^${var}=.*|${var}=${val}|" "$ROOT_ENV_FILE"
                else
                    echo "${var}=${val}" >> "$ROOT_ENV_FILE"
                fi
            done
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
        echo "✓ backend/.env created with your settings"
        echo "   - APP_ENV=$APP_ENV_INPUT"
        echo "   - APP_URL=$APP_URL_INPUT"
        echo "   - SEED_ADMIN_EMAIL=$SEED_ADMIN_EMAIL_INPUT"
        echo "   - FRONTEND_URL=$FRONTEND_URL_INPUT"

        # Generate APP_KEY if empty
        echo ""
        echo "Generating APP_KEY for backend/.env..."
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
                log_success "APP_KEY generated for backend/.env"
            else
                echo "✗ Failed to generate APP_KEY automatically. Please run: docker compose run --rm backend php artisan key:generate --show and update backend/.env"
                log_error "Failed to generate APP_KEY automatically"
            fi
        else
            echo "APP_KEY already present in backend/.env"
            log_info "APP_KEY already present in env file"
        fi
        
        # Sync VAPID keys from root .env to backend/.env
        echo ""
        if check_vapid_keys "$ROOT_ENV_FILE"; then
            echo "Syncing VAPID keys from .env to backend/.env..."
            local root_vapid_pub
            root_vapid_pub=$(grep -E '^VAPID_PUBLIC_KEY=' "$ROOT_ENV_FILE" 2>/dev/null | cut -d '=' -f2- | tr -d '"' | tr -d "'" || echo "")
            local root_vapid_priv
            root_vapid_priv=$(grep -E '^VAPID_PRIVATE_KEY=' "$ROOT_ENV_FILE" 2>/dev/null | cut -d '=' -f2- | tr -d '"' | tr -d "'" || echo "")
            
            if update_vapid_keys "$ENV_FILE" "$root_vapid_pub" "$root_vapid_priv"; then
                echo "✓ VAPID keys synced to backend/.env"
                log_success "VAPID keys synced from root env to backend env"
            else
                echo "⚠️  Failed to sync VAPID keys to backend/.env"
                log_warn "Failed to sync VAPID keys to backend env"
            fi
        else
            echo "⚠️  No VAPID keys found in .env to sync"
            echo "   Both .env and backend/.env need VAPID keys for push notifications"
            echo "   Generate with: bun x web-push generate-vapid-keys"
            log_warn "No VAPID keys in root env to sync"
        fi

        # Sync Reverb keys from backend/.env to root .env (for Docker build args)
        echo ""
        if grep -q "^REVERB_APP_KEY=" "$ENV_FILE"; then
            echo "Syncing Reverb keys from backend/.env to .env..."
            for var in REVERB_APP_KEY REVERB_HOST REVERB_PORT REVERB_SCHEME; do
                val=$(grep "^${var}=" "$ENV_FILE" | cut -d'=' -f2- | tr -d '"' | tr -d "'")
                vite_var="VITE_${var}"
                if grep -q "^${vite_var}=" "$ROOT_ENV_FILE"; then
                    sed -i "s|^${vite_var}=.*|${vite_var}=${val}|" "$ROOT_ENV_FILE"
                else
                    echo "${vite_var}=${val}" >> "$ROOT_ENV_FILE"
                fi
            done
            echo "✓ Reverb keys synced to .env"
            log_success "Reverb keys synced from backend env to root env"
        fi
        
        # Setup Telegram Bot notifications (optional)
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "📱 Telegram Deployment Notifications (Optional)"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        echo "Get notified via Telegram when deployments start, succeed, or fail."
        echo ""
        if [ "$NO_INTERACTIVE" = "false" ]; then
            read -r -p "Configure Telegram notifications now? (y/N): " REPLY_TELEGRAM
            REPLY_TELEGRAM=${REPLY_TELEGRAM:-N}
            
            if [[ "$REPLY_TELEGRAM" =~ ^[yY]([eE][sS])?$ ]]; then
                echo ""
                echo "To set up Telegram notifications:"
                echo "  1. Create a bot: message @BotFather on Telegram, send '/newbot'"
                echo "  2. Get your chat ID: message @userinfobot on Telegram"
                echo ""
                
                TELEGRAM_BOT_TOKEN_INPUT=$(prompt_with_default "TELEGRAM_BOT_TOKEN (from @BotFather)" "none")
                TELEGRAM_CHAT_ID_INPUT=$(prompt_with_default "TELEGRAM_CHAT_ID (from @userinfobot)" "none")
                
                # Apply Telegram settings
                if grep -q '^TELEGRAM_BOT_TOKEN=' "$ENV_FILE"; then
                    sed -i "s|^TELEGRAM_BOT_TOKEN=.*|TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN_INPUT}|" "$ENV_FILE"
                else
                    {
                        echo ""
                        echo "# Telegram Deployment Notifications"
                        echo "TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN_INPUT}"
                    } >> "$ENV_FILE"
                fi
                
                if grep -q '^CHAT_ID=' "$ENV_FILE"; then
                    sed -i "s|^CHAT_ID=.*|CHAT_ID=${TELEGRAM_CHAT_ID_INPUT}|" "$ENV_FILE"
                else
                    echo "CHAT_ID=${TELEGRAM_CHAT_ID_INPUT}" >> "$ENV_FILE"
                fi
                
                echo ""
                if [ "$TELEGRAM_BOT_TOKEN_INPUT" != "none" ] && [ "$TELEGRAM_CHAT_ID_INPUT" != "none" ]; then
                    echo "Testing Telegram notifications with a sample message..."
                    # shellcheck source=./telegram_notify.sh
                    if [ -f "$SCRIPT_DIR/telegram_notify.sh" ]; then
                        # Ensure ENV_FILE is visible to helper
                        ENV_FILE="$ENV_FILE" PROJECT_ROOT="$PROJECT_ROOT" \
                            bash -c 'source "$0"; telegram_send "🧪 Test notification from deploy setup at $(date "+%Y-%m-%d %H:%M:%S %Z")"' "$SCRIPT_DIR/telegram_notify.sh" && TEST_OK=true || TEST_OK=false
                    else
                        TEST_OK=false
                    fi

                    if [ "${TEST_OK:-false}" = "true" ]; then
                        echo "✓ Telegram notifications configured and test message sent"
                        log_success "Telegram notifications configured and test message sent"
                    else
                        echo "⚠️  Telegram credentials saved but test message failed. Please verify token/chat id."
                        log_warn "Telegram test notification failed during setup"
                    fi
                else
                    echo "ℹ️  Telegram notifications skipped (you can configure later in backend/.env)"
                    log_info "Telegram notifications skipped"
                fi
            else
                echo "ℹ️  Skipped Telegram setup (you can configure later in backend/.env)"
                log_info "Telegram notifications setup skipped"
            fi
        else
            echo "ℹ️  Non-interactive mode: skipping Telegram setup"
            log_info "Telegram setup skipped in non-interactive mode"
        fi
        
        # Setup in-app admin notifications on deploy (optional)
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "🔔 In-App Admin Notifications (Optional)"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        echo "Notify superadmin user in-app when deployments complete successfully."
        echo ""
        if [ "$NO_INTERACTIVE" = "false" ]; then
            read -r -p "Enable in-app deployment notifications for superadmin? (y/N): " REPLY_ADMIN_NOTIFY
            REPLY_ADMIN_NOTIFY=${REPLY_ADMIN_NOTIFY:-N}
            
            if [[ "$REPLY_ADMIN_NOTIFY" =~ ^[yY]([eE][sS])?$ ]]; then
                NOTIFY_SUPERADMIN_INPUT="true"
                echo "✓ In-app admin notifications enabled"
                log_success "In-app admin notifications enabled"
            else
                NOTIFY_SUPERADMIN_INPUT="false"
                echo "ℹ️  In-app admin notifications disabled"
                log_info "In-app admin notifications disabled"
            fi
        else
            NOTIFY_SUPERADMIN_INPUT="false"
            echo "ℹ️  Non-interactive mode: in-app notifications disabled by default"
            log_info "In-app admin notifications disabled in non-interactive mode"
        fi
        
        # Apply in-app notification setting
        if grep -q '^NOTIFY_SUPERADMIN_ON_DEPLOY=' "$ENV_FILE"; then
            sed -i "s|^NOTIFY_SUPERADMIN_ON_DEPLOY=.*|NOTIFY_SUPERADMIN_ON_DEPLOY=${NOTIFY_SUPERADMIN_INPUT}|" "$ENV_FILE"
        else
            {
                echo ""
                echo "# In-app deployment notifications for superadmin"
                echo "NOTIFY_SUPERADMIN_ON_DEPLOY=${NOTIFY_SUPERADMIN_INPUT}"
            } >> "$ENV_FILE"
        fi
        echo ""
    fi

    # Detect current environment if not already set (e.g. by deploy.sh or caller)
    if [ -z "${APP_ENV_CURRENT:-}" ]; then
        if [ -f "$ENV_FILE" ]; then
            APP_ENV_CURRENT=$(grep -E '^(APP_ENV_CURRENT|APP_ENV)=' "$ENV_FILE" | tail -n1 | cut -d '=' -f2- | tr -d '\r' || echo "")
        fi
        if [ -n "${APP_ENV_CHOICE:-}" ]; then
            APP_ENV_CURRENT="$APP_ENV_CHOICE"
        fi
        if [ -z "$APP_ENV_CURRENT" ]; then
            # Use current branch hint if still unknown
            local cb
            cb=$(git -C "$PROJECT_ROOT" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")
            case "$cb" in
                main) APP_ENV_CURRENT="production" ;;
                staging) APP_ENV_CURRENT="staging" ;;
                *) APP_ENV_CURRENT="development" ;;
            esac
        fi
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
Usage: ./utils/deploy.sh [--fresh] [--seed] [--no-cache] [--skip-build] [--no-interactive] [--quiet] [--allow-empty-db] [--test-notify] [--skip-git-sync] [--clean-up] [--auto-backup] [--restore] [--restore-db] [--restore-uploads] [--ignore-i18n-checks]

Flags:
    --fresh          Drop and recreate database, re-run all migrations; also clears volumes/containers.
    --seed           Seed the database after running migrations (or migrate:fresh).
    --no-cache       Build Docker images without using cache.
    --skip-build     Skip building Docker images/docs (uses existing local images).
    --no-interactive Skip confirmation prompts (useful for automated scripts/CI).
    --quiet          Reduce console output; full logs go to .deploy.log.
    --allow-empty-db Allow deployment to proceed even if database appears empty (non-fresh).
    --test-notify    Test both Telegram and in-app notifications and exit.
    --skip-git-sync  Skip git repository synchronization (useful for deploying local uncommitted changes).
    --clean-up       Clean up old Docker images, containers, and build cache after successful deployment.
    --auto-backup    Automatically create database and uploads backup before deployment (non-fresh only).
    --restore        Restore both database and uploads from backup before deployment.
    --restore-db     Restore database from backup before deployment.
    --restore-uploads Restore uploads from backup before deployment.
    --ignore-i18n-checks Skip i18n translation validation during pre-deployment checks.

Default behavior (no flags):
    - Sync with remote git repository (fetch and merge/reset)
    - Build and start containers (preserves existing database data)
    - Wait for backend to be healthy
    - Run database migrations only (no seeding, no data loss)

Examples:
    ./utils/deploy.sh                          # normal deploy (migrate only, preserves data)
    ./utils/deploy.sh --seed                   # migrate + seed
    ./utils/deploy.sh --auto-backup            # create backup before deploying
    ./utils/deploy.sh --fresh                  # reset DB/volumes (asks for confirmation)
    ./utils/deploy.sh --fresh --seed           # fresh + seed (asks for confirmation)
    ./utils/deploy.sh --fresh --no-interactive # fresh without prompts (for CI/automation)
    ./utils/deploy.sh --no-cache               # rebuild images without cache
    ./utils/deploy.sh --skip-build             # skip docker build (fast; uses existing images)
    ./utils/deploy.sh --test-notify            # test Telegram notifications
    ./utils/deploy.sh --skip-git-sync          # deploy local changes without git pull

Notes:
    - If you change backend/frontend code, DO NOT use --skip-build unless you have built images separately.
    - --no-cache has no effect when --skip-build is used.

IMPORTANT: Data Preservation
    - Without --fresh: All existing database data is PRESERVED
    - The pgdata Docker volume is NOT removed (only containers stop)
    - Only NEW migrations are applied
    - Use --fresh ONLY if you want a clean slate with no old data
    - Deploy will BLOCK if DB appears empty (unless --allow-empty-db or --seed)

Git Repository Sync:
    - By default, deploy syncs with remote (fetch + fast-forward/reset)
    - Use --skip-git-sync to deploy local uncommitted changes
    - Configure DEPLOY_GIT_FETCH_DELAY (default: 3s) to handle rapid commits
    - Set DEPLOY_FORCE_RESET=true to auto-reset on branch divergence

Telegram Notifications:
    - Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in backend/.env to enable
    - Notifications sent on deployment start, success, and failure
    - Use --test-notify to verify configuration

Environment Files:
    - Root .env: Docker Compose variables (VAPID keys, build args)
    - backend/.env: Laravel runtime configuration
    - Both files are gitignored and environment-specific
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

