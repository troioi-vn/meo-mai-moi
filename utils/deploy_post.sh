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


