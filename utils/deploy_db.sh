# shellcheck shell=bash

if [[ "${MEO_DEPLOY_DB_LOADED:-false}" = "true" ]]; then
    return
fi
MEO_DEPLOY_DB_LOADED="true"

: "${PROJECT_ROOT:?PROJECT_ROOT must be set before sourcing deploy_db.sh}"
: "${ENV_FILE:?ENV_FILE must be set before sourcing deploy_db.sh}"

ROOT_ENV_FILE="${ROOT_ENV_FILE:-$PROJECT_ROOT/.env}"

read_env_value() {
    local file="$1"
    local key="$2"
    local default_value="${3:-}"

    if [ -f "$file" ]; then
        local value
        value=$(grep -E "^${key}=" "$file" | tail -n1 | cut -d '=' -f2- | tr -d '\r' | sed 's/^[[:space:]]*//; s/[[:space:]]*$//')
        if [ -n "$value" ]; then
            printf '%s' "$value"
            return
        fi
    fi

    printf '%s' "$default_value"
}

deploy_db_uses_local_service() {
    [ "${DB_SERVICE_MODE_ENV:-local}" = "local" ]
}

db_local_service_running() {
    docker compose ps --status=running 2>/dev/null | grep -q " db "
}

db_backend_running() {
    docker compose ps --status=running 2>/dev/null | grep -q " backend "
}

db_external_container_running() {
    [ -n "${DB_EXTERNAL_CONTAINER_ENV:-}" ] || return 1
    docker ps --format '{{.Names}}' | grep -Fxq "$DB_EXTERNAL_CONTAINER_ENV"
}

db_exec_client() {
    local client="$1"
    shift

    if deploy_db_uses_local_service; then
        docker compose exec -T db "$client" "$@"
        return
    fi

    if db_backend_running; then
        docker compose exec -T backend env PGPASSWORD="$DB_PASSWORD_ENV" "$client" -h "$DB_HOST_ENV" -p "$DB_PORT_ENV" "$@"
        return
    fi

    if db_external_container_running; then
        docker exec -e PGPASSWORD="$DB_PASSWORD_ENV" "$DB_EXTERNAL_CONTAINER_ENV" "$client" -h 127.0.0.1 -p "$DB_PORT_ENV" "$@"
        return
    fi

    return 1
}

deploy_db_initialize() {
    DEFAULT_ADMIN_EMAIL="admin@catarchy.space"
    ADMIN_EMAIL_TO_WATCH=${ADMIN_EMAIL_TO_WATCH:-}

    if [ -f "$ENV_FILE" ]; then
        DB_HOST_ENV=$(read_env_value "$ENV_FILE" "DB_HOST" "db")
        DB_PORT_ENV=$(read_env_value "$ENV_FILE" "DB_PORT" "5432")
        DB_USERNAME_ENV=$(grep -E '^DB_USERNAME=' "$ENV_FILE" | tail -n1 | cut -d '=' -f2-)
        DB_DATABASE_ENV=$(grep -E '^DB_DATABASE=' "$ENV_FILE" | tail -n1 | cut -d '=' -f2-)
        DB_PASSWORD_ENV=$(grep -E '^DB_PASSWORD=' "$ENV_FILE" | tail -n1 | cut -d '=' -f2-)
        ADMIN_EMAIL_ENV=$(grep -E '^SEED_ADMIN_EMAIL=' "$ENV_FILE" | tail -n1 | cut -d '=' -f2-)
    else
        DB_HOST_ENV="db"
        DB_PORT_ENV="5432"
        DB_USERNAME_ENV=""
        DB_DATABASE_ENV=""
        DB_PASSWORD_ENV=""
        ADMIN_EMAIL_ENV=""
    fi

    if [ -z "$ADMIN_EMAIL_TO_WATCH" ]; then
        if [ -n "$ADMIN_EMAIL_ENV" ]; then
            ADMIN_EMAIL_TO_WATCH="$ADMIN_EMAIL_ENV"
        else
            ADMIN_EMAIL_TO_WATCH="$DEFAULT_ADMIN_EMAIL"
        fi
    fi

    DB_USERNAME_ENV=${DB_USERNAME_ENV:-user}
    DB_DATABASE_ENV=${DB_DATABASE_ENV:-meo_mai_moi}
    DB_PASSWORD_ENV=${DB_PASSWORD_ENV:-password}
    DB_SERVICE_MODE_ENV=${DB_SERVICE_MODE:-$(read_env_value "$ROOT_ENV_FILE" "DB_SERVICE_MODE" "")}
    DB_EXTERNAL_CONTAINER_ENV=${DB_EXTERNAL_CONTAINER:-$(read_env_value "$ROOT_ENV_FILE" "DB_EXTERNAL_CONTAINER" "shared-postgres")}
    if [ -z "$DB_SERVICE_MODE_ENV" ]; then
        if [ "$DB_HOST_ENV" = "db" ]; then
            DB_SERVICE_MODE_ENV="local"
        else
            DB_SERVICE_MODE_ENV="external"
        fi
    fi
    DB_SERVICE_MODE_ENV=$(printf '%s' "$DB_SERVICE_MODE_ENV" | tr '[:upper:]' '[:lower:]')
    if deploy_db_uses_local_service; then
        DB_VOLUME_NAME=${DB_VOLUME_NAME:-${DOCKER_PROJECT_NAME}_pgdata}
    else
        DB_VOLUME_NAME=""
    fi
    # shellcheck disable=SC2034 # used by deploy.sh for volume fingerprint tracking
    DB_FINGERPRINT_FILE="$PROJECT_ROOT/.db_volume_fingerprint"
}

sql_quote_literal() {
    # Outputs a safely single-quoted SQL literal by doubling single quotes
    # Usage: sql_quote_literal "value" -> 'va''lue'
    local input="$1"
    local escaped
    escaped=$(printf %s "$input" | sed "s/'/''/g")
    printf "'%s'" "$escaped"
}

db_query() {
    local query="$1"
    shift  # Remaining args are variable assignments for psql
    
    local psql_args=(-U "$DB_USERNAME_ENV" -d "$DB_DATABASE_ENV" -At)
    
    # Add variable assignments for parameterized queries
    for var_assignment in "$@"; do
        psql_args+=(-v "$var_assignment")
    done
    
    local result
    if ! result=$(db_exec_client psql "${psql_args[@]}" -c "$query" 2>/dev/null); then
        echo "__ERROR__"
        return 1
    fi
    echo "$result" | tr -d '\r' | sed 's/[[:space:]]*$//'
    return 0
}

db_snapshot() {
    local stage="$1"
    local snapshot_timestamp
    snapshot_timestamp=$(date -u '+%Y-%m-%dT%H:%M:%SZ')

    if deploy_db_uses_local_service; then
        if ! db_local_service_running; then
            note "DB snapshot ($stage): db container not running"
            log_warn "DB snapshot failed - local db container not running" "stage=$stage"
            DB_SNAPSHOT_STAGE="$stage"
            DB_SNAPSHOT_USERS="unavailable"
            DB_SNAPSHOT_ADMIN="unavailable"
            return
        fi
    elif ! db_backend_running && ! db_external_container_running; then
        note "DB snapshot ($stage): external database client unavailable"
        log_warn "DB snapshot failed - external db client unavailable" "stage=$stage host=$DB_HOST_ENV port=$DB_PORT_ENV"
        DB_SNAPSHOT_STAGE="$stage"
        DB_SNAPSHOT_USERS="unavailable"
        DB_SNAPSHOT_ADMIN="unavailable"
        return
    fi

    if deploy_db_uses_local_service; then
        local db_container_id
        local db_container_uptime
        db_container_id=$(docker compose ps -q db 2>/dev/null || echo "unknown")
        if [ -n "$db_container_id" ] && [ "$db_container_id" != "unknown" ]; then
            db_container_uptime=$(docker inspect -f '{{.State.StartedAt}}' "$db_container_id" 2>/dev/null || echo "unknown")
            log_info "DB container state" "stage=$stage container_id=$db_container_id started_at=$db_container_uptime"
        fi

        if [ -n "$DB_VOLUME_NAME" ] && docker volume inspect "$DB_VOLUME_NAME" >/dev/null 2>&1; then
            local volume_mountpoint
            volume_mountpoint=$(docker volume inspect "$DB_VOLUME_NAME" --format '{{ .Mountpoint }}' 2>/dev/null || echo "unknown")
            log_info "DB volume state" "stage=$stage volume=$DB_VOLUME_NAME mountpoint=$volume_mountpoint"
        fi
    else
        log_info "External DB snapshot target" "stage=$stage host=$DB_HOST_ENV port=$DB_PORT_ENV database=$DB_DATABASE_ENV"
    fi

    local total_users
    local users_table_exists
    users_table_exists=$(db_query "SELECT to_regclass('public.users') IS NOT NULL;") || users_table_exists="__ERROR__"

    if [ "$users_table_exists" = "t" ] || [ "$users_table_exists" = "true" ]; then
        total_users=$(db_query "SELECT COUNT(*) FROM users;") || total_users="unavailable"
        [ -z "$total_users" ] && total_users="unavailable"
    elif [ "$users_table_exists" = "f" ] || [ "$users_table_exists" = "false" ]; then
        # Treat missing users table as an empty database
        total_users="0"
        log_warn "Users table does not exist" "stage=$stage"
    else
        # Any other error (e.g., connection), keep as unavailable so we don't misclassify
        total_users="unavailable"
        log_warn "Cannot determine users table existence" "stage=$stage error=$users_table_exists"
    fi

    # Enhanced: capture additional table counts for better diagnostics
    local pets_count roles_count permissions_count
    if [ "$users_table_exists" = "t" ] || [ "$users_table_exists" = "true" ]; then
        pets_count=$(db_query "SELECT COUNT(*) FROM pets;" 2>/dev/null || echo "?")
        roles_count=$(db_query "SELECT COUNT(*) FROM roles;" 2>/dev/null || echo "?")
        permissions_count=$(db_query "SELECT COUNT(*) FROM permissions;" 2>/dev/null || echo "?")
        log_info "DB counts" "stage=$stage users=$total_users pets=$pets_count roles=$roles_count permissions=$permissions_count timestamp=$snapshot_timestamp"
    fi

    local admin_present="not_tracked"
    local include_admin="false"
    if [ -n "$ADMIN_EMAIL_TO_WATCH" ] && [ "$ADMIN_EMAIL_TO_WATCH" != "ignore" ]; then
        include_admin="true"
        local admin_count
        if [ "$total_users" = "0" ]; then
            # If we already know there's no users table or it's empty, mark admin as missing
            admin_present="missing"
            log_warn "Admin user missing - empty users table" "stage=$stage email=$ADMIN_EMAIL_TO_WATCH"
        else
            # Use safe literal quoting to avoid SQL injection and psql variable pitfalls
            local admin_email_sql
            admin_email_sql=$(sql_quote_literal "$ADMIN_EMAIL_TO_WATCH")
            admin_count=$(db_query "SELECT COUNT(*) FROM users WHERE email = ${admin_email_sql};") || admin_count="unavailable"
            if [ "$admin_count" = "__ERROR__" ] || [ "$admin_count" = "unavailable" ]; then
                admin_present="unavailable"
                log_warn "Cannot check admin user" "stage=$stage email=$ADMIN_EMAIL_TO_WATCH"
            else
                admin_present=$([ "$admin_count" = "1" ] && echo "present" || echo "missing")
                if [ "$admin_present" = "missing" ]; then
                    log_warn "Admin user not found" "stage=$stage email=$ADMIN_EMAIL_TO_WATCH total_users=$total_users"
                fi
            fi
        fi
    fi

    local admin_summary=""
    if [ "$include_admin" = "true" ]; then
        admin_summary=" admin(${ADMIN_EMAIL_TO_WATCH})=${admin_present}"
    fi

    note "DB snapshot ($stage): users=${total_users}${admin_summary}"

    # Enhanced: if database is unexpectedly empty, capture more diagnostics
    if [ "$total_users" = "0" ] && [ "$stage" != "after-fresh" ] && [ "$stage" != "before-stop" ]; then
        log_warn "Unexpected empty database detected" "stage=$stage"
        
        # Check for recent postgres initialization
        if deploy_db_uses_local_service && [ -n "${db_container_id:-}" ] && [ "$db_container_id" != "unknown" ]; then
            local initdb_check
            initdb_check=$(docker logs --tail 200 "$db_container_id" 2>&1 | grep -c "database cluster will be initialized" || echo "0")
            if [ "$initdb_check" -gt 0 ]; then
                log_warn "Postgres cluster initialization detected in recent logs" "stage=$stage"
            fi
        fi
    fi

    if [ "$include_admin" = "true" ] && [ "$admin_present" = "missing" ]; then
        local recent_users
        recent_users=$(db_query "SELECT id || ':' || email FROM users ORDER BY created_at DESC LIMIT 5;") || recent_users=""
        if [ -n "$recent_users" ] && [ "$recent_users" != "__ERROR__" ]; then
            note "Recent users ($stage):"
            while IFS= read -r line; do
                [ -n "$line" ] && note "  - $line"
            done <<EOF
$recent_users
EOF
        fi
    fi
    
    # shellcheck disable=SC2034 # exported for deploy.sh post-snapshot checks
    DB_SNAPSHOT_STAGE="$stage"
    # shellcheck disable=SC2034 # exported for deploy.sh post-snapshot checks
    DB_SNAPSHOT_USERS="$total_users"
    if [ "$include_admin" = "true" ]; then
        # shellcheck disable=SC2034 # exported for deploy.sh post-snapshot checks
        DB_SNAPSHOT_ADMIN="$admin_present"
    else
        # shellcheck disable=SC2034 # exported for deploy.sh post-snapshot checks
        DB_SNAPSHOT_ADMIN="not_tracked"
    fi
    
    log_success "DB snapshot completed" "stage=$stage users=$total_users admin=$admin_present"
}
