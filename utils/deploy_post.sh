# shellcheck shell=bash

if [[ "${MEO_DEPLOY_POST_LOADED:-false}" = "true" ]]; then
    return
fi
MEO_DEPLOY_POST_LOADED="true"

deploy_post_run_migrations() {
    local migrate_command="$1"
    local seed_flag="${2:-false}"

    note "Running database $migrate_command..."
    run_cmd_with_console docker compose exec backend php artisan "$migrate_command" --force

    if [ "$migrate_command" = "migrate:fresh" ]; then
        echo "Seeding database after fresh migration..."
        run_cmd_with_console docker compose exec backend php artisan db:seed --force
        echo "✓ Database seeded successfully"
    elif [ "$seed_flag" = "true" ]; then
        echo "Seeding database..."
        run_cmd_with_console docker compose exec backend php artisan db:seed --force
        echo "✓ Database seeded successfully"
    fi
}

deploy_post_finalize() {
    # Optional: Generate Filament Shield resources.
    # By default, we DO NOT regenerate policies to avoid overwriting customized policy logic (e.g., PetPolicy).
    # To force regeneration on demand, run deploy with: SHIELD_GENERATE=true ./utils/deploy.sh
    if [ "${SHIELD_GENERATE:-false}" = "true" ]; then
        note "Generating Filament Shield resources..."
        run_cmd_with_console docker compose exec backend php artisan shield:generate --all --panel=admin --minimal
    else
        note "Skipping Filament Shield generation (SHIELD_GENERATE=false)."
    fi

    note "Optimizing application..."
    run_cmd_with_console docker compose exec backend php artisan optimize
}

deploy_post_notify_superadmin() {
    # Check if in-app notifications for superadmin are enabled
    local notify_enabled
    notify_enabled=$(grep -E '^NOTIFY_SUPERADMIN_ON_DEPLOY=' "$ENV_FILE" 2>/dev/null | cut -d '=' -f2- | tr -d '\r' | tr -d '"' | tr -d "'" || echo "false")
    
    if [ "$notify_enabled" != "true" ]; then
        return 0
    fi
    
    note "Sending in-app notification to superadmin..."
    log_info "Attempting to send in-app notification to superadmin"
    
    # Get deployment info
    local deploy_env
    deploy_env=$(grep -E '^APP_ENV=' "$ENV_FILE" 2>/dev/null | cut -d '=' -f2- | tr -d '\r' || echo "unknown")
    
    local commit_hash
    commit_hash=$(git -C "$PROJECT_ROOT" rev-parse --short HEAD 2>/dev/null || echo "unknown")
    
    local deploy_time
    deploy_time=$(date '+%Y-%m-%d %H:%M:%S %Z')
    
    # Construct notification message
    local notification_title="🚀 Deployment Successful"
    local notification_body="Environment: ${deploy_env}
Commit: ${commit_hash}
Time: ${deploy_time}

The application has been successfully deployed and is now running."
    
    # Send notification via artisan command
    # We'll create a simple artisan command to send notifications to superadmin
    local result
    if result=$(docker compose exec -T backend php artisan app:notify-superadmin \
        "$notification_title" \
        "$notification_body" 2>&1); then
        note "✓ In-app notification sent to superadmin"
        log_success "Superadmin notified of deployment" "env=$deploy_env commit=$commit_hash"
    else
        note "⚠️  Failed to send in-app notification to superadmin"
        note "  Error: $result"
        log_warn "Failed to notify superadmin" "error=$result"
    fi
}


