#!/usr/bin/env bash
set -euo pipefail

# --- Configuration ---
SCRIPT_PATH="${BASH_SOURCE[0]:-$0}"
SCRIPT_DIR="$(cd "$(dirname "$SCRIPT_PATH")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

load_root_env_file() {
    local env_file="$PROJECT_ROOT/.env"
    [ -f "$env_file" ] || return 0

    while IFS='=' read -r key value; do
        # Skip comments and empty/whitespace-only lines
        case "$key" in
            ''|\#*) continue ;;
        esac

        # Strip inline comments and surrounding whitespace from value
        value=${value%%#*}
        value=$(printf '%s' "$value" | sed 's/^[[:space:]]*//; s/[[:space:]]*$//')

        # Ignore lines without a key after trimming
        if [ -z "$key" ]; then
            continue
        fi

        # Only set if not already present in the environment
        if [ -z "${!key+x}" ]; then
            export "$key=$value"
        fi
    done < "$env_file"
}

load_root_env_file

# shellcheck source=./setup.sh
source "$SCRIPT_DIR/setup.sh"

# Self-update check BEFORE acquiring lock to avoid re-exec conflicts
if [ "${SKIP_GIT_SELF_UPDATE:-false}" != "true" ]; then
    CURRENT_COMMIT="$(git -C "$PROJECT_ROOT" rev-parse HEAD 2>/dev/null || echo "")"
    TARGET_BRANCH="$(determine_deploy_branch "${APP_ENV_CURRENT:-development}")"

    if [ -n "$TARGET_BRANCH" ] && [ -n "$CURRENT_COMMIT" ]; then
        echo "ℹ️  Checking for newer deploy script on branch $TARGET_BRANCH..."
        git -C "$PROJECT_ROOT" fetch origin "$TARGET_BRANCH" >/dev/null 2>&1 || true
        REMOTE_COMMIT="$(git -C "$PROJECT_ROOT" rev-parse "origin/$TARGET_BRANCH" 2>/dev/null || echo "")"

        if [ -n "$REMOTE_COMMIT" ] && [ "$REMOTE_COMMIT" != "$CURRENT_COMMIT" ]; then
            echo "ℹ️  New commit detected on origin/$TARGET_BRANCH. Updating and re-running deploy script..."

            # Try a fast-forward; if it fails, fall back to existing sync logic later
            if git -C "$PROJECT_ROOT" merge --ff-only "origin/$TARGET_BRANCH" >/dev/null 2>&1; then
                export SKIP_GIT_SELF_UPDATE=true
                exec "$SCRIPT_DIR/$(basename "$SCRIPT_PATH")" "$@"
            else
                echo "⚠️  Fast-forward of deploy script failed, continuing with current version."
            fi
        fi
    fi
fi

setup_initialize

# shellcheck source=./deploy_db.sh
source "$SCRIPT_DIR/deploy_db.sh"
# shellcheck source=./deploy_docker.sh
source "$SCRIPT_DIR/deploy_docker.sh"
# shellcheck source=./deploy_notify.sh
source "$SCRIPT_DIR/deploy_notify.sh"
# shellcheck source=./deploy_post.sh
source "$SCRIPT_DIR/deploy_post.sh"

## (Removed) get_db_stats and check_db_connection helpers to simplify deployment flow


# --- Main Script ---

# Parse command-line arguments
MIGRATE_COMMAND="migrate"
SEED="false"
NO_CACHE="false"
SKIP_BUILD="false"
FRESH="false"
NO_INTERACTIVE="false"
QUIET="false"
ALLOW_EMPTY_DB="false"
TEST_NOTIFY="false"
SKIP_GIT_SYNC="false"
CLEAN_UP="false"
AUTO_BACKUP="false"
RESTORE_DB="false"
RESTORE_UPLOADS="false"

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
        --skip-build)
            SKIP_BUILD="true"
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
        --clean-up)
            CLEAN_UP="true"
            ;;
        --restore-db)
            RESTORE_DB="true"
            ;;
        --restore-uploads)
            RESTORE_UPLOADS="true"
            ;;
        --restore)
            RESTORE_DB="true"
            RESTORE_UPLOADS="true"
            ;;
        --auto-backup)
            AUTO_BACKUP="true"
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

# Handle restore flags
if [ "$RESTORE_DB" = "true" ] || [ "$RESTORE_UPLOADS" = "true" ]; then
    if [ ! -f "$SCRIPT_DIR/backup.sh" ]; then
        echo "✗ Backup script not found at $SCRIPT_DIR/backup.sh" >&2
        exit 1
    fi

    echo ""
    echo "=========================================="
    echo "Data Restoration"
    echo "=========================================="
    echo ""

    if [ "$NO_INTERACTIVE" = "true" ]; then
        echo "⚠️  --no-interactive is enabled. Restore requires explicit targets via env vars." >&2
        echo "  For full restore: set DEPLOY_RESTORE_TIMESTAMP=YYYY-MM-DD_HH-MM-SS" >&2
        echo "  For DB restore:   set DEPLOY_RESTORE_DB_FILE=backups/backup-....sql.gz" >&2
        echo "  For uploads:      set DEPLOY_RESTORE_UPLOADS_FILE=backups/uploads_backup-....tar.gz" >&2
        echo "" >&2
    fi

    if [ "$RESTORE_DB" = "true" ] && [ "$RESTORE_UPLOADS" = "true" ]; then
        echo "Restoring both database and uploads..."
        if [ "$NO_INTERACTIVE" = "true" ]; then
            selected_stamp="${DEPLOY_RESTORE_TIMESTAMP:-}"
            if [ -z "$selected_stamp" ]; then
                echo "✗ Missing DEPLOY_RESTORE_TIMESTAMP for non-interactive restore" >&2
                exit 1
            fi
        else
            if ! "$SCRIPT_DIR/backup.sh" --list >/dev/null 2>&1; then
                echo "✗ No backups found" >&2
                exit 1
            fi

            # Get list of timestamps from both database and uploads backups
            STAMPS=$(ls -t "$PROJECT_ROOT/backups"/backup-*.sql.gz "$PROJECT_ROOT/backups"/uploads_backup-*.tar.gz 2>/dev/null | sed -E 's/.*backup-(.*)\.(sql\.gz|tar\.gz)/\1/' | sort -u -r | head -5)
            
            if [ -z "$STAMPS" ]; then
                echo "✗ No coordinated backups found" >&2
                exit 1
            fi

            echo "Available backup timestamps:"
            echo "$STAMPS"
            echo ""
            read -r -p "Enter timestamp to restore from (e.g. 2026-01-22_15-36-39) or 'cancel': " selected_stamp
        fi

        if [ "$selected_stamp" != "cancel" ] && [ -n "$selected_stamp" ]; then
            if "$SCRIPT_DIR/backup.sh" --restore-all "$selected_stamp"; then
                echo "✓ Coordinated restoration complete"
            else
                echo "✗ Coordinated restoration failed" >&2
                exit 1
            fi
        fi
    elif [ "$RESTORE_DB" = "true" ]; then
        echo "Restoring database..."
        if [ "$NO_INTERACTIVE" = "true" ]; then
            selected_backup="${DEPLOY_RESTORE_DB_FILE:-}"
            if [ -z "$selected_backup" ]; then
                echo "✗ Missing DEPLOY_RESTORE_DB_FILE for non-interactive DB restore" >&2
                exit 1
            fi
            if "$SCRIPT_DIR/backup.sh" --restore-database "$selected_backup"; then
                echo "✓ Database restoration complete"
            else
                echo "✗ Database restoration failed" >&2
                exit 1
            fi
        else
            # List available backups and let user choose
            if ! "$SCRIPT_DIR/backup.sh" --list >/dev/null 2>&1; then
                echo "✗ No database backups found" >&2
                exit 1
            fi

            # Get list of backups
            BACKUP_LIST=$(ls -t "$PROJECT_ROOT/backups"/backup-*.sql.gz 2>/dev/null | xargs -n1 basename | head -5)
            if [ -z "$BACKUP_LIST" ]; then
                echo "✗ No database backups found" >&2
                exit 1
            fi

            echo "Available database backups:"
            echo "$BACKUP_LIST"
            echo ""
            read -r -p "Enter backup filename to restore (or 'cancel' to skip): " selected_backup

            if [ "$selected_backup" != "cancel" ] && [ -n "$selected_backup" ]; then
                if [ -f "$PROJECT_ROOT/backups/$selected_backup" ]; then
                    echo "Restoring from: $selected_backup"
                    if "$SCRIPT_DIR/backup.sh" --restore-database "$PROJECT_ROOT/backups/$selected_backup"; then
                        echo "✓ Database restoration complete"
                    else
                        echo "✗ Database restoration failed" >&2
                        exit 1
                    fi
                else
                    echo "✗ Backup file not found: $selected_backup" >&2
                    exit 1
                fi
            fi
        fi
    elif [ "$RESTORE_UPLOADS" = "true" ]; then
        echo "Restoring uploads..."
        if [ "$NO_INTERACTIVE" = "true" ]; then
            selected_backup="${DEPLOY_RESTORE_UPLOADS_FILE:-}"
            if [ -z "$selected_backup" ]; then
                echo "✗ Missing DEPLOY_RESTORE_UPLOADS_FILE for non-interactive uploads restore" >&2
                exit 1
            fi
            if "$SCRIPT_DIR/backup.sh" --restore-uploads "$selected_backup"; then
                echo "✓ Uploads restoration complete"
            else
                echo "✗ Uploads restoration failed" >&2
                exit 1
            fi
        else
            if ! "$SCRIPT_DIR/backup.sh" --list >/dev/null 2>&1; then
                echo "✗ No uploads backups found" >&2
                exit 1
            fi

            # Get list of backups
            BACKUP_LIST=$(ls -t "$PROJECT_ROOT/backups"/uploads_backup-*.tar.gz 2>/dev/null | xargs -n1 basename | head -5)
            if [ -z "$BACKUP_LIST" ]; then
                echo "✗ No uploads backups found" >&2
                exit 1
            fi

            echo "Available uploads backups:"
            echo "$BACKUP_LIST"
            echo ""
            read -r -p "Enter backup filename to restore (or 'cancel' to skip): " selected_backup

            if [ "$selected_backup" != "cancel" ] && [ -n "$selected_backup" ]; then
                if [ -f "$PROJECT_ROOT/backups/$selected_backup" ]; then
                    echo "Restoring from: $selected_backup"
                    if "$SCRIPT_DIR/backup.sh" --restore-uploads "$PROJECT_ROOT/backups/$selected_backup"; then
                        echo "✓ Uploads restoration complete"
                    else
                        echo "✗ Uploads restoration failed" >&2
                        exit 1
                    fi
                else
                    echo "✗ Backup file not found: $selected_backup" >&2
                    exit 1
                fi
            fi
        fi
    fi

    echo ""
    echo "=========================================="
    echo "✓ Data restoration complete"
    echo "=========================================="
    echo ""
fi

# Handle --test-notify flag
if [ "$TEST_NOTIFY" = "true" ]; then
    echo "Testing notification systems..."
    echo ""
    
    # Test Telegram notifications
    if [ "$DEPLOY_NOTIFY_ENABLED" = "true" ]; then
        echo "✓ Telegram notifications are configured"
        echo "  Token: ${TELEGRAM_BOT_TOKEN:0:10}..."
        echo "  Chat ID: $CHAT_ID"
        echo "  Prefix: $DEPLOY_NOTIFY_PREFIX"
        echo ""
        echo "Sending Telegram test notification..."
        deploy_notify_send "Test notification sent at $(deploy_notify_now)."
        echo "✓ Telegram test notification sent successfully"
    else
        echo "✗ Telegram notifications are not configured"
        echo "  Set TELEGRAM_BOT_TOKEN and CHAT_ID in backend/.env to enable"
    fi
    
    echo ""
    
    # Test in-app notifications
    # shellcheck disable=SC2153 # ENV_FILE is set by setup.sh before this point
    notify_enabled=$(grep -E '^NOTIFY_SUPERADMIN_ON_DEPLOY=' "$ENV_FILE" 2>/dev/null | cut -d '=' -f2- | tr -d '\r' | tr -d '"' | tr -d "'" || echo "false")
    
    if [ "$notify_enabled" = "true" ]; then
        echo "✓ In-app notifications are enabled"
        echo ""
        echo "Sending in-app test notification..."
        
        # Ensure containers are running
        if ! docker compose ps backend | grep -q "Up"; then
            echo "Starting containers..."
            docker compose up -d >/dev/null 2>&1
            sleep 10
        fi
        
        test_title="🧪 Test Notification"
        test_body="This is a test notification sent via --test-notify flag at $(date '+%Y-%m-%d %H:%M:%S %z').

This notification should appear in your notification bell with both title and body text."
        
        if docker compose exec -T backend php artisan app:notify-superadmin \
            "$test_title" \
            "$test_body" >/dev/null 2>&1; then
            echo "✓ In-app test notification sent successfully"
            echo "  Check your notification bell at http://localhost:8000"
        else
            echo "✗ Failed to send in-app test notification"
            echo "  Make sure containers are running and database is accessible"
        fi
    else
        echo "✗ In-app notifications are disabled"
        echo "  Set NOTIFY_SUPERADMIN_ON_DEPLOY=true in backend/.env to enable"
    fi
    
    exit 0
fi

deploy_notify_register_traps

# --- Disk Space Check ---
DISK_SPACE_WARNING=""
check_disk_space() {
    local threshold="${DEPLOY_DISK_THRESHOLD:-10}"
    local mount_point="/"
    
    # Get disk usage percentage (used space)
    local usage_percent
    usage_percent=$(df "$mount_point" | awk 'NR==2 {gsub(/%/,""); print $5}')
    
    if [ -z "$usage_percent" ]; then
        note "⚠️  Could not determine disk usage"
        log_warn "Disk space check failed - could not determine usage"
        return 0
    fi
    
    local free_percent=$((100 - usage_percent))
    local total_size available_size
    total_size=$(df -h "$mount_point" | awk 'NR==2 {print $2}')
    available_size=$(df -h "$mount_point" | awk 'NR==2 {print $4}')
    
    if [ "$free_percent" -lt "$threshold" ]; then
        DISK_SPACE_WARNING="⚠️ LOW DISK SPACE: ${free_percent}% free (${available_size} of ${total_size})"
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "$DISK_SPACE_WARNING"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        log_warn "Low disk space detected" "free_percent=${free_percent} available=${available_size} total=${total_size}"
        
        # Export for notification inclusion
        export DISK_SPACE_WARNING
    else
        note "ℹ️  Disk space: ${free_percent}% free (${available_size} of ${total_size})"
        log_info "Disk space check passed" "free_percent=${free_percent} available=${available_size}"
    fi
}

check_disk_space

# Export deployment flags for notification messages
export DEPLOY_FLAG_FRESH="$FRESH"
export DEPLOY_FLAG_NO_CACHE="$NO_CACHE"
export DEPLOY_FLAG_SEED="$SEED"
export DEPLOY_FLAG_NO_INTERACTIVE="$NO_INTERACTIVE"
export DEPLOY_FLAG_SKIP_GIT_SYNC="$SKIP_GIT_SYNC"
export DEPLOY_FLAG_CLEAN_UP="$CLEAN_UP"
export DEPLOY_FLAG_AUTO_BACKUP="$AUTO_BACKUP"

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

    # Add configurable delay to handle rapid commits (default: 0 seconds)
    local fetch_delay="${DEPLOY_GIT_FETCH_DELAY:-0}"
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
                echo "⚠️  Repository remains diverged." >&2
                read -r -p "Continue without git sync (deploy current local state)? (y/N): " skip_confirm
                if [[ "$skip_confirm" =~ ^[yY]$ ]]; then
                    note "⚠️  Proceeding without git sync at user request."
                    log_warn "User opted to skip git sync after divergence" "local=$local_commit remote=$remote_commit"
                    SKIP_GIT_SYNC="true"
                    DEPLOY_FLAG_SKIP_GIT_SYNC="$SKIP_GIT_SYNC"
                    export DEPLOY_FLAG_SKIP_GIT_SYNC
                    return
                else
                    echo "✗ Cannot continue with diverged branches" >&2
                    log_error "User declined reset and skip - branches diverged"
                    exit 1
                fi
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
    read -r -p "Would you like to backup database and uploads first? (Y/n): " do_backup
    if [[ ! "$do_backup" =~ ^[nN]([oO])?$ ]]; then
        note "Preparing to run backup..."
        # Ensure containers are running for backup script
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

        if ! docker compose ps --status=running 2>/dev/null | grep -q " backend "; then
            note "Starting backend container for backup..."
            run_cmd_with_console docker compose up -d backend
            # Wait briefly for backend to be ready
            sleep 5
        fi

        if [ -f "$SCRIPT_DIR/backup.sh" ]; then
            run_cmd_with_console "$SCRIPT_DIR/backup.sh" all
            note "✓ Backup complete"
        else
            note "⚠️  Backup script not found at $SCRIPT_DIR/backup.sh"
        fi
    fi
fi

# Automatic backup if --auto-backup flag is used
if [ "$AUTO_BACKUP" = "true" ] && [ "$FRESH" = "false" ]; then
    note "Auto-backup enabled: Creating backup before deployment..."
    # Ensure containers are running for backup script
    if ! docker compose ps --status=running 2>/dev/null | grep -q " db "; then
        note "Starting database container for backup..."
        run_cmd_with_console docker compose up -d db
        # Wait briefly for db health
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

    if ! docker compose ps --status=running 2>/dev/null | grep -q " backend "; then
        note "Starting backend container for backup..."
        run_cmd_with_console docker compose up -d backend
        sleep 5
    fi

    if [ -f "$SCRIPT_DIR/backup.sh" ]; then
        run_cmd_with_console "$SCRIPT_DIR/backup.sh" all
        note "✓ Auto-backup complete"
    else
        note "⚠️  Backup script not found at $SCRIPT_DIR/backup.sh"
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
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "⚠️  Empty database detected before deployment."
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Options:"
    echo "  1. Seed the database (recommended for fresh setups)"
    echo "  2. Proceed without seeding (not recommended - app may not function correctly)"
    echo "  3. Cancel deployment"
    echo ""
    echo "Tip: You can also use --seed flag to auto-seed, or --allow-empty-db to skip this prompt."
    echo ""
    
    if [ "$NO_INTERACTIVE" = "true" ]; then
        echo "✗ Non-interactive mode: Cannot proceed with empty database."
        echo "  Use --seed to populate essential data, or --allow-empty-db to proceed anyway."
        log_error "Empty database detected in non-interactive mode without --seed or --allow-empty-db"
        exit 1
    fi
    
    while true; do
        read -r -p "Choose an option (1/2/3): " empty_db_choice
        case "$empty_db_choice" in
            1)
                note "ℹ️  Seeding database..."
                log_info "User chose to seed empty database"
                SEED="true"
                DEPLOY_FLAG_SEED="$SEED"
                export DEPLOY_FLAG_SEED
                break
                ;;
            2)
                echo ""
                echo "⚠️  Proceeding without seeding is NOT RECOMMENDED."
                echo "    The application may not function correctly without initial data."
                read -r -p "Are you sure you want to continue without seeding? (yes/no): " confirm_empty
                if [ "$confirm_empty" = "yes" ]; then
                    note "⚠️  Proceeding without seeding (user confirmed)"
                    log_warn "User confirmed proceeding with empty database without seeding"
                    ALLOW_EMPTY_DB="true"
                    break
                else
                    echo "Returning to options menu..."
                    echo ""
                fi
                ;;
            3)
                echo "❌ Deployment cancelled by user."
                log_info "Deployment cancelled by user due to empty database"
                exit 0
                ;;
            *)
                echo "Invalid option. Please enter 1, 2, or 3."
                ;;
        esac
    done
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
# shellcheck disable=SC2034 # exported for potential diagnostics and future use
VOLUME_FINGERPRINT_CHANGED="false"
VOLUME_DELETE_LOG="$PROJECT_ROOT/.deploy/volume-deletions.log"
mkdir -p "$(dirname "$VOLUME_DELETE_LOG")"

if docker volume inspect "$DB_VOLUME_NAME" >/dev/null 2>&1; then
    VOLUME_CREATED_AT=$(docker volume inspect "$DB_VOLUME_NAME" --format '{{ .CreatedAt }}')
    note "ℹ️  Volume $DB_VOLUME_NAME created at $VOLUME_CREATED_AT"
    log_info "DB volume found" "name=$DB_VOLUME_NAME created_at=$VOLUME_CREATED_AT"
    
    if [ -f "$DB_FINGERPRINT_FILE" ]; then
        PREV_FINGERPRINT=$(cat "$DB_FINGERPRINT_FILE" 2>/dev/null || true)
        if [ -n "$PREV_FINGERPRINT" ] && [ "$PREV_FINGERPRINT" != "$VOLUME_CREATED_AT" ]; then
            VOLUME_FINGERPRINT_CHANGED="true"
            echo "⚠️  DB volume fingerprint changed. Previous: $PREV_FINGERPRINT | Current: $VOLUME_CREATED_AT"
            log_warn "DB volume fingerprint changed - possible volume recreation" "previous=$PREV_FINGERPRINT current=$VOLUME_CREATED_AT"
            
            # Log volume deletion event if fingerprint changed
            {
                echo "=== VOLUME RECREATION DETECTED ==="
                echo "Timestamp: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
                echo "Local time: $(date '+%Y-%m-%d %H:%M:%S %Z')"
                echo "Previous fingerprint: $PREV_FINGERPRINT"
                echo "Current fingerprint: $VOLUME_CREATED_AT"
                echo "This suggests the volume was deleted and recreated outside of deploy.sh"
                echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
                echo ""
            } >> "$VOLUME_DELETE_LOG"
        fi
    fi
    # Persist current fingerprint for future runs
    echo "$VOLUME_CREATED_AT" > "$DB_FINGERPRINT_FILE"
    log_info "DB volume fingerprint saved" "fingerprint=$VOLUME_CREATED_AT file=$DB_FINGERPRINT_FILE"
else
    note "⚠️  Database volume $DB_VOLUME_NAME not found."
    log_warn "DB volume not found" "name=$DB_VOLUME_NAME"
fi

# Enhanced logging: Check for volume mount issues
DB_CONTAINER_MOUNTS=$(docker compose ps -q db 2>/dev/null | xargs -r docker inspect --format '{{range .Mounts}}{{.Type}}:{{.Source}}->{{.Destination}} {{end}}' 2>/dev/null || echo "unknown")
log_info "DB container mounts" "mounts=$DB_CONTAINER_MOUNTS"

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
    
    # In fresh mode we still need to build images so the new containers run the latest code.
    # Note: docker compose down -v removes containers/volumes, not images.
    if [ "$SKIP_BUILD" = "true" ]; then
        note "⚠️  Skipping Docker build (--skip-build): will use existing local images."
    else
        deploy_docker_prepare "$NO_CACHE"
    fi
else
    echo ""
    note "ℹ️  Standard deployment (data preservation mode)"
    note "ℹ️  Data preservation: Docker volumes will be preserved (no data loss)"
    
    # Pre-build to minimize downtime
    # (Documentation and Docker images are built while old containers are still running)
    if [ "$SKIP_BUILD" = "true" ]; then
        note "⚠️  Skipping Docker build (--skip-build): will use existing local images."
    else
        deploy_docker_prepare "$NO_CACHE"
    fi
    
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

# --- Deployment Logfile Cleanup (keep last N logfiles) ---
deploy_cleanup_logfiles() {
    local deploy_dir="$PROJECT_ROOT/.deploy"
    local keep_count=10
    
    if [ ! -d "$deploy_dir" ]; then
        note "ℹ️  .deploy folder does not exist, skipping logfile cleanup"
        return 0
    fi
    
    note "🧹 Cleaning up old logfiles in .deploy..."
    log_info "Starting logfile cleanup" "dir=$deploy_dir keep=$keep_count"
    
    # Find all log and json files, sorted by modification time (newest first)
    # Use subshell to prevent ERR trap from triggering on empty results
    local logfiles
    logfiles=$(find "$deploy_dir" -maxdepth 1 -type f \( -name "*.log" -o -name "*.json" \) -printf '%T@ %p\n' 2>/dev/null | sort -rn | cut -d' ' -f2- || echo "")
    
    if [ -z "$logfiles" ]; then
        note "ℹ️  No logfiles found in $deploy_dir"
        return 0
    fi
    
    local total_count
    total_count=$(printf '%s\n' "$logfiles" | grep -c . || echo "0")
    
    if [ "$total_count" -le "$keep_count" ]; then
        note "ℹ️  $total_count logfiles in .deploy (keeping all, threshold is $keep_count)"
        return 0
    fi
    
    # Files to delete are those beyond the keep threshold
    local files_to_delete
    files_to_delete=$(printf '%s\n' "$logfiles" | tail -n $((total_count - keep_count)) || echo "")
    
    if [ -z "$files_to_delete" ]; then
        return 0
    fi
    
    local deleted_count=0
    local recovered_size=0
    
    while IFS= read -r filepath; do
        if [ -n "$filepath" ] && [ -f "$filepath" ]; then
            local file_size
            file_size=$(stat -c%s "$filepath" 2>/dev/null || echo "0")
            recovered_size=$((recovered_size + file_size))
            
            rm -f "$filepath" 2>/dev/null || true
            deleted_count=$((deleted_count + 1))
        fi
    done <<< "$files_to_delete"
    
    if [ "$deleted_count" -gt 0 ]; then
        local readable_size
        readable_size=$(numfmt --to=iec "$recovered_size" 2>/dev/null || echo "${recovered_size}B")
        note "✓ Removed $deleted_count old logfiles from .deploy (freed ~$readable_size)"
        log_info "Logfile cleanup completed" "deleted=$deleted_count size=$readable_size"
    else
        note "ℹ️  No logfiles needed cleanup"
    fi
    
    return 0
}

# --- Docker Cleanup (if requested) ---
deploy_cleanup_docker() {
    note "🧹 Cleaning up old Docker images and containers..."
    log_info "Starting Docker cleanup"
    
    local cleaned_images=0
    local cleaned_containers=0
    local freed_space="0B"
    
    # Remove stopped containers (except current project ones)
    local stopped_containers
    stopped_containers=$(docker ps -aq --filter "status=exited" 2>/dev/null || true)
    if [ -n "$stopped_containers" ]; then
        local count
        count=$(echo "$stopped_containers" | wc -l)
        if docker container prune -f >/dev/null 2>&1; then
            cleaned_containers=$count
            note "✓ Removed $cleaned_containers stopped containers"
            log_info "Removed stopped containers" "count=$cleaned_containers"
        fi
    fi
    
    # Remove dangling images (untagged)
    local dangling_images
    dangling_images=$(docker images -q --filter "dangling=true" 2>/dev/null || true)
    if [ -n "$dangling_images" ]; then
        local img_count
        img_count=$(echo "$dangling_images" | wc -l)
        if docker image prune -f >/dev/null 2>&1; then
            cleaned_images=$img_count
            note "✓ Removed $cleaned_images dangling images"
            log_info "Removed dangling images" "count=$cleaned_images"
        fi
    fi
    
    # Remove unused images not associated with any container (more aggressive)
    # This is optional and can free significant space
    local unused_count
    unused_count=$(docker images --filter "dangling=false" --format '{{.ID}}' 2>/dev/null | wc -l || echo "0")
    if [ "$unused_count" -gt 10 ]; then
        note "ℹ️  Found $unused_count images. Removing unused ones..."
        local before_size after_size
        before_size=$(docker system df --format '{{.Size}}' 2>/dev/null | head -1 || echo "unknown")
        
        # Prune images not used by existing containers (keeps recent ones)
        if docker image prune -a --filter "until=24h" -f >/dev/null 2>&1; then
            after_size=$(docker system df --format '{{.Size}}' 2>/dev/null | head -1 || echo "unknown")
            note "✓ Pruned old unused images (was: $before_size, now: $after_size)"
            log_info "Pruned old unused images" "before=$before_size after=$after_size"
        fi
    fi
    
    # Clean build cache
    if docker builder prune -f --filter "until=168h" >/dev/null 2>&1; then
        note "✓ Cleaned build cache (older than 7 days)"
        log_info "Cleaned Docker build cache"
    fi
    
    # Report final disk usage
    local docker_usage
    docker_usage=$(docker system df 2>/dev/null || echo "Could not determine Docker disk usage")
    note "📊 Docker disk usage after cleanup:"
    while IFS= read -r line; do
        echo "   $line"
    done <<< "$docker_usage"
    log_info "Docker cleanup completed"
}

if [ "$CLEAN_UP" = "true" ]; then
    echo ""
    deploy_cleanup_logfiles
    deploy_cleanup_docker
fi

echo ""
note "✓ Deployment complete!"
[ "$FRESH" = "false" ] && note "✓ Existing data preserved"

# Send in-app notification to superadmin if enabled
deploy_post_notify_superadmin

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
