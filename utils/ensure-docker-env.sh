#!/usr/bin/env bash
set -euo pipefail

# Ensure script is run from repo root
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

ENV_DIR="backend"
ENV_FILE="$ENV_DIR/.env.docker"
ENV_EXAMPLE="$ENV_DIR/.env.docker.example"

if [[ ! -f "$ENV_EXAMPLE" ]]; then
  echo "Error: $ENV_EXAMPLE not found."
  exit 1
fi

# If .env.docker exists, ask to overwrite
if [[ -f "$ENV_FILE" ]]; then
  read -p "$ENV_FILE already exists. Overwrite with $ENV_EXAMPLE? [y/N] " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Overwriting $ENV_FILE with $ENV_EXAMPLE"
    cp "$ENV_EXAMPLE" "$ENV_FILE"
  else
    echo "Skipping overwrite. You can edit it manually or delete it to regenerate from the example."
    exit 0
  fi
else
    echo "Creating $ENV_FILE from $ENV_EXAMPLE"
    cp "$ENV_EXAMPLE" "$ENV_FILE"
fi

# Helper to get current value from env file
get_val() {
  local key="$1"
  # Use grep to find the first non-commented match
  local line
  line=$(grep -E "^${key}=" -m1 "$ENV_FILE" || true)
  echo "${line#*=}"
}

# Function to generate a random 32-byte key and base64 encode it
generate_laravel_key() {
  head -c 32 /dev/urandom | base64
}

# Prompt function with default
prompt() {
  local key="$1"; shift
  local current="$1"; shift
  local label="$1"; shift

  local input
  if [[ -t 0 ]]; then
    read -rp "$label [$current]: " input || true
  else
    input=""
  fi
  if [[ -z "$input" ]]; then
    echo "$current"
  else
    echo "$input"
  fi
}

# Read current values or defaults
current_app_url=$(get_val APP_URL)
current_frontend_url=$(get_val FRONTEND_URL)
current_app_key=$(get_val APP_KEY)

# Fallback defaults if not present in file
: "${current_app_url:=http://localhost:8000}"
: "${current_frontend_url:=http://localhost:8000}"

# Prompt user (only on first creation). Non-TTY keeps existing/default values
new_app_url=$(prompt APP_URL "$current_app_url" "Enter APP_URL")
new_frontend_url=$(prompt FRONTEND_URL "$current_frontend_url" "Enter FRONTEND_URL")

# Safely update or insert key=value in env file
set_kv() {
  local key="$1"; shift
  local val="$1"; shift
  if grep -q -E "^${key}=" "$ENV_FILE"; then
    sed -i "s|^${key}=.*|${key}=${val}|" "$ENV_FILE"
  else
    printf "%s=%s\n" "$key" "$val" >>"$ENV_FILE"
  fi
}

set_kv APP_URL "$new_app_url"
set_kv FRONTEND_URL "$new_frontend_url"

# Generate APP_KEY if it's missing
if [[ -z "$current_app_key" ]]; then
  echo "Generating new APP_KEY..."
  new_app_key=$(generate_laravel_key)
  set_kv APP_KEY "$new_app_key"
  app_key_display="[generated]"
else
  new_app_key="$current_app_key"
  app_key_display="[exists]"
fi


# Show a summary
echo "Updated $ENV_FILE with:"
printf "  %-15s %s\n" APP_URL "$new_app_url"
printf "  %-15s %s\n" FRONTEND_URL "$new_frontend_url"
printf "  %-15s %s\n" APP_KEY "$app_key_display"


cat <<'TIP'
Tip: Next steps
  - Build and start containers: docker compose up -d --build
  - Seed database (optional):   docker compose exec backend php artisan migrate:fresh --seed
TIP