#!/bin/bash
# Fresh Database Setup Script
# This script recreates the database and loads the schema for native development
#
# Before running, make sure this script is executable:
#   chmod +x fresh-db.sh

set -e  # Exit on any error

echo "🔄 Setting up fresh database for native development..."

# Check if we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Error: Run this script from utils/dev-pgsql-docker directory"
    exit 1
fi

# Check if containers are running
if ! docker compose ps | grep -q "Up"; then
    echo "🚀 Starting PostgreSQL containers..."
    docker compose up -d
    echo "⏳ Waiting for database to be ready..."
    # Wait for PostgreSQL to be ready using pg_isready
    for i in {1..30}; do
        if docker compose exec -T postgres pg_isready -U user > /dev/null 2>&1; then
            echo "✅ Database is ready!"
            break
        else
            sleep 1
        fi
        if [ "$i" -eq 30 ]; then
            echo "❌ Database did not become ready in time."
            exit 1
        fi
    done
fi

# Copy schema file into container
echo "📄 Copying schema file..."
docker cp ../../backend/database/schema/pgsql-schema.sql postgres_dev:/tmp/schema.sql

# Drop and recreate database
echo "🗑️  Dropping existing database..."
docker compose exec postgres dropdb -U user meo_mai_moi 2>/dev/null || echo "Database didn't exist, continuing..."

echo "🆕 Creating fresh database..."
docker compose exec postgres createdb -U user meo_mai_moi

# Load schema
echo "📋 Loading schema..."
if ! OUTPUT=$(docker compose exec postgres psql -U user -d meo_mai_moi -f /tmp/schema.sql 2>&1 > /dev/null); then
    echo "❌ Error loading schema:"
    echo "$OUTPUT"
    exit 1
fi

echo "✅ Database setup complete!"
echo ""
echo "Next steps:"
echo "  cd ../../backend"
echo "  php artisan db:seed"
echo "  php artisan serve"
echo ""
echo "Access points:"
echo "  • Laravel: http://localhost:8000 (or 8001 if 8000 is busy)"
echo "  • PgAdmin: http://localhost:8888 (admin@example.com / admin123)"