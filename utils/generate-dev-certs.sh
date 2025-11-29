#!/usr/bin/env bash
set -euo pipefail

# Generate self-signed certificates for local HTTPS development
# These certs are for DEV ONLY and should never be used in production

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
CERT_DIR="$PROJECT_ROOT/backend/certs"
ENV_FILE="$PROJECT_ROOT/backend/.env"

FORCE="false"
for arg in "$@"; do
    case "$arg" in
        --force)
            FORCE="true" ;;
        -h|--help)
            cat <<'EOF'
Usage: ./utils/generate-dev-certs.sh [--force]

Generates self-signed localhost certificates for local development.
Safety checks:
    - Refuses to overwrite existing certs unless --force is provided
    - Refuses to run when APP_ENV is not development (unless --force)
EOF
            exit 0
            ;;
    esac
done

echo "=========================================="
echo "Generating Self-Signed Dev Certificates"
echo "=========================================="
echo ""
echo "⚠️  These certificates are for LOCAL DEVELOPMENT ONLY"
echo "⚠️  Never use self-signed certs in production"
echo ""

# Check APP_ENV (from backend/.env if present) — default to development if unknown
APP_ENV_VAL="development"
if [ -f "$ENV_FILE" ]; then
    APP_ENV_VAL=$(grep -E '^APP_ENV=' "$ENV_FILE" | tail -n1 | cut -d '=' -f2- || echo "development")
fi
if [ "$APP_ENV_VAL" != "development" ] && [ "$FORCE" != "true" ]; then
    echo "✗ APP_ENV=$APP_ENV_VAL — refusing to generate dev certificates."
    echo "  Set APP_ENV=development in backend/.env or run with --force if you know what you're doing."
    exit 1
fi

# Create certs directory if it doesn't exist
mkdir -p "$CERT_DIR"

# Refuse to overwrite existing certs unless forced
if [ -f "$CERT_DIR/localhost.crt" ] || [ -f "$CERT_DIR/localhost.key" ]; then
    if [ "$FORCE" != "true" ]; then
        echo "ℹ️  Certificates already exist at $CERT_DIR"
        echo "✓ Skipping generation to avoid overwrite. Delete existing files or run with --force to regenerate."
        exit 0
    fi
    echo "⚠️  --force provided: regenerating certificates..."
fi

# Generate self-signed certificate valid for 365 days
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout "$CERT_DIR/localhost.key" \
        -out "$CERT_DIR/localhost.crt" \
        -subj "/C=US/ST=Dev/L=Dev/O=Dev/CN=localhost" \
        -addext "subjectAltName=DNS:localhost,DNS:*.localhost,IP:127.0.0.1"

# Set appropriate permissions
chmod 644 "$CERT_DIR/localhost.crt"
chmod 600 "$CERT_DIR/localhost.key"

echo ""
echo "✓ Certificates generated successfully!"
echo ""
echo "Location: $CERT_DIR"
echo "  - Certificate: localhost.crt"
echo "  - Private Key: localhost.key"
echo ""
echo "Next steps:"
echo "  1. Enable HTTPS in backend/.env:"
echo "     APP_ENV=development"
echo "     ENABLE_HTTPS=true"
echo ""
echo "  2. Start environment (single entry point):"
echo "     ./utils/deploy.sh"
echo ""
echo "  3. Access your app via HTTPS:"
echo "     https://localhost (your browser will show a security warning - this is expected)"
echo ""
echo "  4. Trust the certificate (optional):"
echo "     - Chrome/Edge: Click 'Advanced' → 'Proceed to localhost (unsafe)'"
echo "     - Firefox: Click 'Advanced' → 'Accept the Risk and Continue'"
echo "     - System-wide: Import localhost.crt to your system's trusted certificates"
echo ""
