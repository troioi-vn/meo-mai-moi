#!/bin/bash
# This script is run by PostgreSQL during container initialization
# to create a separate test database for PHPUnit tests.
# This prevents tests from accidentally wiping the development database.

set -e

# Create the test database if it doesn't exist
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    SELECT 'CREATE DATABASE meo_mai_moi_test'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'meo_mai_moi_test')\gexec
EOSQL

echo "Test database 'meo_mai_moi_test' is ready."
