#!/bin/bash
# This script is run by PostgreSQL during container initialization
# to create a separate test database for PHPUnit tests.
# This prevents tests from accidentally wiping the development database.

set -e

# Create the test database if it doesn't exist
TEST_DB_NAME="${POSTGRES_TEST_DB:-meo_mai_moi_testing}"

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    SELECT 'CREATE DATABASE ' || quote_ident('$TEST_DB_NAME')
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$TEST_DB_NAME')\gexec
EOSQL

echo "Test database '$TEST_DB_NAME' is ready."
