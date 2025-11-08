#!/usr/bin/env bash
set -euo pipefail

# --- Configuration ---
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# shellcheck source=./setup.sh
source "$SCRIPT_DIR/setup.sh"
# shellcheck source=./deploy_db.sh
source "$SCRIPT_DIR/deploy_db.sh"
# shellcheck source=./deploy_docker.sh
source "$SCRIPT_DIR/deploy_docker.sh"
# shellcheck source=./deploy_notify.sh
source "$SCRIPT_DIR/deploy_notify.sh"
# shellcheck source=./deploy_post.sh
source "$SCRIPT_DIR/deploy_post.sh"

setup_initialize

## (Removed) get_db_stats and check_db_connection helpers to simplify deployment flow


# --- Main Script ---

# Parse command-line arguments
MIGRATE_COMMAND="migrate"
SEED="false"
NO_CACHE="false"
FRESH="false"
NO_INTERACTIVE="false"
QUIET="false"
ALLOW_EMPTY_DB="false"
TEST_NOTIFY="false"
SKIP_GIT_SYNC="false"

for arg in "$@"; do
    case "$arg" in
        --fresh)
            FRESH="true"
            MIGRATE_COMMAND="migrate:fresh"
            ;;
        --seed)
            SEED="true"
            ;;
        --no-cache)
            NO_CACHE="true"
            ;;
        --no-interactive)
            NO_INTERACTIVE="true"
            ;;
        --quiet)
            QUIET="true"
            ;;
        --allow-empty-db)
            ALLOW_EMPTY_DB="true"
            ;;
        --test-notify)
            TEST_NOTIFY="true"
            ;;
        --skip-git-sync)
            SKIP_GIT_SYNC="true"
            ;;
        -h|--help)
            print_help
            exit 0
            ;;
        *)
            echo "Unknown argument: $arg" >&2
            print_help
            exit 1
            ;;
    esac
done

# --- Logging configuration post-args ---
# Provide a helper for concise console notes while keeping full logs in the file.
note() {
    # Always write to log (stdout). In quiet mode, also print to the preserved console (fd 3).
    echo "$1"
    if [ "$QUIET" = "true" ]; then
        echo "$1" >&3
    fi
}

# Run a command and stream its output to the console when in quiet mode
# This preserves full logs while still showing progress (e.g., docker build)
run_cmd_with_console() {
    if [ "$QUIET" = "true" ]; then
        # Stream to console (fd 3) and to log (stdout)
        "$@" 2>&1 | tee /proc/self/fd/3
    else
        "$@"
    fi
}

deploy_notify_initialize

# Handle --test-notify flag
if [ "$TEST_NOTIFY" = "true" ]; then
    if [ "$DEPLOY_NOTIFY_ENABLED" = "true" ]; then
        echo "✓ Telegram notifications are configured"
        echo "  Token: ${DEPLOY_NOTIFY_BOT_TOKEN:0:10}..."
        echo "  Chat ID: $DEPLOY_NOTIFY_CHAT_ID"
        echo "  Prefix: $DEPLOY_NOTIFY_PREFIX"
        echo ""
        echo "Sending test notification..."
        deploy_notify_send "Test notification sent at $(deploy_notify_now)."
        echo "✓ Test notification sent successfully"
        exit 0
    else
        echo "✗ Telegram notifications are not configured"
        echo "  Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in backend/.env.docker"
        exit 1
    fi
fi

deploy_notify_register_traps
deploy_notify_send_start

# Rollback support
ROLLBACK_SNAPSHOT=""
ROLLBACK_DIR="$PROJECT_ROOT/.rollback"

create_rollback_point() {
    ROLLBACK_SNAPSHOT="rollback-$(date +%s)"
    mkdir -p "$ROLLBACK_DIR"
    
    note "Creating rollback point: $ROLLBACK_SNAPSHOT"
    log_info "Creating rollback point" "snapshot=$ROLLBACK_SNAPSHOT"
    
    # Tag current git commit
    if git -C "$PROJECT_ROOT" tag -f "$ROLLBACK_SNAPSHOT" HEAD 2>/dev/null; then
        note "✓ Git tag created: $ROLLBACK_SNAPSHOT"
    else
        note "⚠️  Could not create git tag for rollback"
        log_warn "Git tag creation failed" "snapshot=$ROLLBACK_SNAPSHOT"
    fi
    
    # Save current commit hash
    local current_commit
    current_commit=$(git -C "$PROJECT_ROOT" rev-parse HEAD 2>/dev/null || echo "unknown")
    echo "$current_commit" > "$ROLLBACK_DIR/$ROLLBACK_SNAPSHOT.commit"
    
    # Save docker compose config state
    docker compose config > "$ROLLBACK_DIR/$ROLLBACK_SNAPSHOT.compose.yml" 2>/dev/null || true
    
    # Save image IDs
    docker compose images --quiet > "$ROLLBACK_DIR/$ROLLBACK_SNAPSHOT.images" 2>/dev/null || true
    
    note "✓ Rollback point created"
    note "  To rollback: ./utils/rollback.sh $ROLLBACK_SNAPSHOT"
    log_success "Rollback point created" "snapshot=$ROLLBACK_SNAPSHOT commit=$current_commit"
}

sync_repository_with_remote() {
    local env="$1"
    local branch_override="${DEPLOY_BRANCH_OVERRIDE:-}"
    local target_branch

    if [ -n "$branch_override" ]; then
        target_branch="$branch_override"
    else
        target_branch=$(determine_deploy_branch "$env")
    fi

    if [ -z "$target_branch" ]; then
        note "⚠️  Unable to determine target git branch for environment '$env'. Skipping repository sync."
        log_warn "Repository sync skipped - no target branch for env: $env"
        return
    fi

    local current_branch
    current_branch=$(git -C "$PROJECT_ROOT" rev-parse --abbrev-ref HEAD || echo "")

    if [ -z "$current_branch" ]; then
        echo "✗ Unable to identify current git branch. Aborting deployment." >&2
        log_error "Unable to identify current git branch"
        exit 1
    fi

    if [ "$current_branch" != "$target_branch" ]; then
        if [ -z "$branch_override" ]; then
            echo "✗ Current branch ($current_branch) does not match target deployment branch ($target_branch)." >&2
            echo "  Switch branches or set DEPLOY_BRANCH_OVERRIDE before rerunning this script." >&2
            log_error "Branch mismatch" "current=$current_branch target=$target_branch"
            exit 1
        else
            note "⚠️  Working tree on branch '$current_branch' but DEPLOY_BRANCH_OVERRIDE='$branch_override'. Proceeding with repository sync."
            log_warn "Branch override active" "current=$current_branch override=$branch_override"
        fi
    fi

    local git_status
    git_status=$(git -C "$PROJECT_ROOT" status --porcelain || true)
    if [ -n "$git_status" ]; then
        note "⚠️  Uncommitted changes detected; this may affect git sync."
        log_warn "Uncommitted changes detected"
    fi

    # Add configurable delay to handle rapid commits (default: 3 seconds)
    local fetch_delay="${DEPLOY_GIT_FETCH_DELAY:-3}"
    if [ "$fetch_delay" -gt 0 ]; then
        note "ℹ️  Waiting ${fetch_delay}s to allow rapid commits to settle on remote..."
        log_info "Git fetch delay" "seconds=$fetch_delay"
        sleep "$fetch_delay"
    fi

    # Retry fetch up to 3 times to handle temporary network issues or pending pushes
    local fetch_attempts=0
    local fetch_max_attempts=3
    local fetch_succeeded=false
    
    while [ $fetch_attempts -lt $fetch_max_attempts ]; do
        fetch_attempts=$((fetch_attempts + 1))
        
        if [ $fetch_attempts -gt 1 ]; then
            note "ℹ️  Retry attempt $fetch_attempts of $fetch_max_attempts..."
            sleep 2
        fi
        
        note "ℹ️  Fetching latest changes from origin/$target_branch..."
        log_info "Fetching from remote" "branch=$target_branch attempt=$fetch_attempts"
        
        if git -C "$PROJECT_ROOT" fetch origin "$target_branch"; then
            fetch_succeeded=true
            break
        else
            note "⚠️  Fetch attempt $fetch_attempts failed"
            log_warn "Git fetch failed" "branch=$target_branch attempt=$fetch_attempts"
        fi
    done
    
    if [ "$fetch_succeeded" != "true" ]; then
        echo "✗ Failed to fetch from remote after $fetch_max_attempts attempts" >&2
        log_error "Git fetch failed after retries" "branch=$target_branch attempts=$fetch_max_attempts"
        exit 1
    fi
    
    local local_commit remote_commit
    local_commit=$(git -C "$PROJECT_ROOT" rev-parse HEAD 2>/dev/null || echo "")
    remote_commit=$(git -C "$PROJECT_ROOT" rev-parse "origin/$target_branch" 2>/dev/null || echo "")
    
    if [ "$local_commit" = "$remote_commit" ]; then
        note "✓ Already up to date"
        log_info "Repository already up to date" "commit=$local_commit"
        return
    fi
    
    # Check if we can fast-forward
    if git -C "$PROJECT_ROOT" merge-base --is-ancestor HEAD "origin/$target_branch" 2>/dev/null; then
        note "Fast-forwarding to origin/$target_branch..."
        log_info "Fast-forwarding to remote" "from=$local_commit to=$remote_commit"
        git -C "$PROJECT_ROOT" merge --ff-only "origin/$target_branch" || {
            echo "✗ Fast-forward merge failed" >&2
            log_error "Fast-forward merge failed"
            exit 1
        }
        note "✓ Repository updated successfully"
        log_success "Repository updated" "commit=$remote_commit"
    else
        # Branches have diverged
        echo "⚠️  Local branch has diverged from origin/$target_branch" >&2
        echo "  Local commit:  $local_commit" >&2
        echo "  Remote commit: $remote_commit" >&2
        log_warn "Branch divergence detected" "local=$local_commit remote=$remote_commit"
        
        if [ "${DEPLOY_FORCE_RESET:-false}" = "true" ]; then
            note "DEPLOY_FORCE_RESET=true: Resetting to origin/$target_branch..."
            log_warn "Force reset to remote" "target=$remote_commit"
            git -C "$PROJECT_ROOT" reset --hard "origin/$target_branch"
            note "✓ Repository reset to remote state"
            log_success "Repository reset to remote" "commit=$remote_commit"
        elif [ "$NO_INTERACTIVE" = "false" ]; then
            read -r -p "Reset local branch to match origin/$target_branch? (y/N): " reset_confirm
            if [[ "$reset_confirm" =~ ^[yY]$ ]]; then
                note "Resetting to origin/$target_branch..."
                log_info "User confirmed reset to remote" "target=$remote_commit"
                git -C "$PROJECT_ROOT" reset --hard "origin/$target_branch"
                note "✓ Repository reset to remote state"
                log_success "Repository reset to remote" "commit=$remote_commit"
            else
                echo "✗ Cannot continue with diverged branches" >&2
                log_error "User declined reset - branches diverged"
                exit 1
            fi
        else
            echo "✗ Cannot proceed with diverged branches in non-interactive mode" >&2
            echo "  Set DEPLOY_FORCE_RESET=true to auto-reset, or run interactively" >&2
            log_error "Branch divergence in non-interactive mode"
            exit 1
        fi
    fi
}

if [ "$SKIP_GIT_SYNC" = "true" ]; then
    note "⚠️  Skipping git repository sync (--skip-git-sync flag set)"
    log_warn "Git sync skipped by user flag"
else
    sync_repository_with_remote "$APP_ENV_CURRENT"
fi

deploy_db_initialize

if [ "$QUIET" = "true" ]; then
    # Reduce console noise: route stdout/stderr to log file, keep fd 3 for concise messages
    exec 1>>"$DEPLOY_LOG" 2>&1
    printf "ℹ️  Quiet mode enabled. Full logs: %s\n" "$DEPLOY_LOG" >&3
fi

# --- Pre-deployment Checks --- (simplified)
# Optional backup before making changes (recommended for production)
if [ "$FRESH" = "false" ] && [ "$NO_INTERACTIVE" = "false" ]; then
    echo ""
    read -r -p "Would you like to backup the database first? (Y/n): " do_backup
    if [[ ! "$do_backup" =~ ^[nN]([oO])?$ ]]; then
        note "Preparing to run backup..."
        # Ensure DB container is running for backup script
        if ! docker compose ps --status=running 2>/dev/null | grep -q " db "; then
            note "Starting database container for backup..."
            run_cmd_with_console docker compose up -d db
            # Wait briefly for db health (best-effort)
            WAIT_TIMEOUT=60
            WAIT_INTERVAL=2
            elapsed=0
            while [ "$elapsed" -lt "$WAIT_TIMEOUT" ]; do
                if docker compose ps db 2>/dev/null | grep -q '(healthy)'; then
                    note "✓ Database is healthy for backup"
                    break
                fi
                sleep "$WAIT_INTERVAL"
                elapsed=$((elapsed + WAIT_INTERVAL))
            done
        fi

        if [ -f "$SCRIPT_DIR/backup.sh" ]; then
            run_cmd_with_console "$SCRIPT_DIR/backup.sh"
            note "✓ Backup complete"
        else
            note "⚠️  Backup script not found at $SCRIPT_DIR/backup.sh"
        fi
    fi
fi

db_snapshot "before-stop"

# Create rollback point before making changes (unless doing a fresh deployment)
if [ "$FRESH" = "false" ]; then
    create_rollback_point
fi

EMPTY_DB_DETECTED="false"
if [ "$DB_SNAPSHOT_USERS" = "0" ]; then
    EMPTY_DB_DETECTED="true"
fi

if [ "$FRESH" = "false" ] && [ "$EMPTY_DB_DETECTED" = "true" ] && [ "$ALLOW_EMPTY_DB" = "false" ] && [ "$SEED" = "false" ]; then
    echo ""
    echo "✗ Empty database detected before deployment."
    echo "  Use --seed to populate essential data, or --allow-empty-db to proceed anyway."
    echo "  To quickly recreate the admin: docker compose exec backend php artisan db:seed --class=UserSeeder --force"
    exit 1
fi

if [ "$SEED" = "false" ] && [ "$DB_SNAPSHOT_ADMIN" = "missing" ] && [ -n "$ADMIN_EMAIL_TO_WATCH" ] && [ "$ADMIN_EMAIL_TO_WATCH" != "ignore" ]; then
    note "⚠️  Admin user $ADMIN_EMAIL_TO_WATCH missing before deployment."
    if [ "$NO_INTERACTIVE" = "false" ]; then
        read -r -p "Run UserSeeder to recreate core users now? (Y/n): " seed_admin
        if [[ ! "$seed_admin" =~ ^[nN]([oO])?$ ]]; then
            note "Running targeted seeder (UserSeeder)..."
            run_cmd_with_console docker compose exec backend php artisan db:seed --class=UserSeeder --force
            db_snapshot "post-user-seeder"
        fi
    else
        note "ℹ️  Re-run with --seed or execute 'docker compose exec backend php artisan db:seed --class=UserSeeder --force' to recreate core users."
    fi
fi

VOLUME_CREATED_AT=""
VOLUME_FINGERPRINT_CHANGED="false"
if docker volume inspect "$DB_VOLUME_NAME" >/dev/null 2>&1; then
    VOLUME_CREATED_AT=$(docker volume inspect "$DB_VOLUME_NAME" --format '{{ .CreatedAt }}')
    note "ℹ️  Volume $DB_VOLUME_NAME created at $VOLUME_CREATED_AT"
    if [ -f "$DB_FINGERPRINT_FILE" ]; then
        PREV_FINGERPRINT=$(cat "$DB_FINGERPRINT_FILE" 2>/dev/null || true)
        if [ -n "$PREV_FINGERPRINT" ] && [ "$PREV_FINGERPRINT" != "$VOLUME_CREATED_AT" ]; then
            VOLUME_FINGERPRINT_CHANGED="true"
            echo "⚠️  DB volume fingerprint changed. Previous: $PREV_FINGERPRINT | Current: $VOLUME_CREATED_AT"
        fi
    fi
    # Persist current fingerprint for future runs
    echo "$VOLUME_CREATED_AT" > "$DB_FINGERPRINT_FILE"
else
    note "⚠️  Database volume $DB_VOLUME_NAME not found."
fi

# (moved) Postgres cluster initialization detection will run AFTER containers are up,
# scoped to the current db container start time to avoid stale warnings

# --- Container Management ---
if [ "$FRESH" = "true" ]; then
    echo ""
    echo "⚠️  FRESH deployment: All data and volumes will be DELETED"
    
    if [ "$NO_INTERACTIVE" = "false" ]; then
        read -r -p "Type 'yes' to confirm deletion of all data: " confirmation
        if [ "$confirmation" != "yes" ]; then
            echo "❌ Deployment cancelled"
            exit 1
        fi
    fi
    
    # Log volume deletion event before destroying
    VOLUME_DELETE_LOG="$PROJECT_ROOT/.deploy/volume-deletions.log"
    mkdir -p "$(dirname "$VOLUME_DELETE_LOG")"
    {
        echo "=== VOLUME DELETION EVENT ==="
        echo "Timestamp: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
        echo "Local time: $(date '+%Y-%m-%d %H:%M:%S %Z')"
        echo "User: $(whoami)"
        echo "Command: deploy.sh --fresh"
        echo "Reason: Fresh deployment requested"
        echo "Volumes to be deleted:"
        docker volume ls --filter "name=$(basename "$PROJECT_ROOT")" --format "  - {{.Name}}" 2>/dev/null || echo "  (could not list volumes)"
        echo ""
    } >> "$VOLUME_DELETE_LOG"
    log_info "Volume deletion logged" "log=$VOLUME_DELETE_LOG"
    
    echo "Removing containers and volumes..."
    docker compose down -v --remove-orphans || {
        echo "⚠️  docker compose down returned non-zero (containers may not have been running)"
    }
    echo "✓ Cleanup complete"
    
    # Log completion
    {
        echo "Status: Completed at $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
    } >> "$VOLUME_DELETE_LOG"
else
    echo ""
    note "ℹ️  Standard deployment (data preservation mode)"
    note "ℹ️  Data preservation: Docker volumes will be preserved (no data loss)"
    note "Stopping containers..."
    docker compose stop 2>/dev/null || true
fi

echo ""
deploy_docker_start "$NO_CACHE"
if ! deploy_docker_wait_for_backend 300 5; then
    exit 1
fi
echo ""

# Verify application is working properly
if ! deploy_docker_verify_application; then
    echo "✗ Application verification failed. Check logs for details." >&2
    log_error "Application verification failed - aborting deployment"
    exit 1
fi
echo ""

## Detect Postgres initdb only for current DB container lifetime
DB_CONTAINER_ID=$(docker compose ps -q db 2>/dev/null || true)
if [ -n "$DB_CONTAINER_ID" ]; then
    DB_STARTED_AT=$(docker inspect -f '{{.State.StartedAt}}' "$DB_CONTAINER_ID" 2>/dev/null || true)
    if [ -n "$DB_STARTED_AT" ]; then
        if docker logs --since "$DB_STARTED_AT" "$DB_CONTAINER_ID" 2>/dev/null | grep -q "The database cluster will be initialized"; then
            echo "⚠️  Postgres cluster initialization detected for current container start (fresh data directory)."
        fi
    fi
fi

# After a --fresh reset, update the stored DB volume fingerprint to the NEW CreatedAt
if [ "$FRESH" = "true" ]; then
    if docker volume inspect "$DB_VOLUME_NAME" >/dev/null 2>&1; then
        NEW_CREATED_AT=$(docker volume inspect "$DB_VOLUME_NAME" --format '{{ .CreatedAt }}' 2>/dev/null || true)
        if [ -n "$NEW_CREATED_AT" ]; then
            echo "$NEW_CREATED_AT" > "$DB_FINGERPRINT_FILE"
            note "ℹ️  Updated DB volume fingerprint after fresh reset: $NEW_CREATED_AT"
        fi
    fi
fi

db_snapshot "after-up"

## (Removed) post-start DB stats re-check

echo ""
deploy_post_run_migrations "$MIGRATE_COMMAND" "$SEED"

echo ""
deploy_post_finalize

db_snapshot "after-migrate"

## (Removed) post-deployment DB summary for simplicity

echo ""
note "✓ Deployment complete!"
[ "$FRESH" = "false" ] && note "✓ Existing data preserved"

# Calculate and report deployment duration
if [ -n "$DEPLOY_START_TIME" ]; then
    DEPLOY_END_TIME=$(date +%s)
    DEPLOY_DURATION=$((DEPLOY_END_TIME - DEPLOY_START_TIME))
    note "⏱️  Deployment completed in ${DEPLOY_DURATION}s"
    log_success "Deployment completed" "duration=${DEPLOY_DURATION}s"
fi

echo ""
note "📝 Full deployment log: $DEPLOY_LOG"
note "📊 JSON log: $DEPLOY_LOG_JSON"
