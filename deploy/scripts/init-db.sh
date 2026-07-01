#!/bin/bash
# =============================================================================
# SealProof — Database Initialization Script
# =============================================================================
# Creates database, roles, runs migrations, seeds initial data.
# Run once on fresh deployment.
# =============================================================================

set -euo pipefail

DB_NAME="${DB_NAME:-sealproof}"
DB_USER="${DB_USER:-sealproof_app}"
DB_PASSWORD="${DB_PASSWORD:-changeme}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
PG_ADMIN="${PG_ADMIN:-postgres}"

echo "=== SealProof Database Initialization ==="
echo "Host: ${DB_HOST}:${DB_PORT}"
echo "Database: ${DB_NAME}"
echo ""

# 1. Create database and roles
echo "[1/5] Creating database and roles..."
psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${PG_ADMIN}" <<SQL
-- Create the application database
SELECT 'CREATE DATABASE ${DB_NAME}'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${DB_NAME}');
\gexec

-- Create application role
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${DB_USER}') THEN
    CREATE ROLE ${DB_USER} WITH LOGIN PASSWORD '${DB_PASSWORD}';
  END IF;
END
\$\$;

-- Create journal admin role (restricted, for emergency use only)
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'journal_admin') THEN
    CREATE ROLE journal_admin WITH NOLOGIN;
  END IF;
END
\$\$;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};
SQL

# 2. Enable extensions
echo "[2/5] Enabling PostgreSQL extensions..."
psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${PG_ADMIN}" -d "${DB_NAME}" <<SQL
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
SQL

# 3. Run migrations
echo "[3/5] Running migrations..."
MIGRATIONS_DIR="$(dirname "$0")/../../shared/db/migrations"

for migration in $(ls "${MIGRATIONS_DIR}"/*.sql | sort); do
    echo "  Running: $(basename ${migration})"
    psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -f "${migration}"
done

# 4. Apply security restrictions
echo "[4/5] Applying security restrictions..."
psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${PG_ADMIN}" -d "${DB_NAME}" <<SQL
-- Immutable tables: revoke UPDATE/DELETE from application role
REVOKE UPDATE, DELETE ON notary_journal_entries FROM ${DB_USER};
REVOKE UPDATE, DELETE ON audit_log FROM ${DB_USER};

-- Grant journal_admin role the ability to modify (emergency only)
GRANT UPDATE, DELETE ON notary_journal_entries TO journal_admin;

-- Ensure app role has INSERT on immutable tables
GRANT INSERT ON notary_journal_entries TO ${DB_USER};
GRANT INSERT ON audit_log TO ${DB_USER};
SQL

# 5. Seed initial data
echo "[5/5] Seeding initial data..."
psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -f "$(dirname "$0")/seed-data.sql"

echo ""
echo "=== Database initialization complete ==="
echo "Database: ${DB_NAME}"
echo "App role: ${DB_USER}"
echo "Migrations: applied"
echo "Security: journal + audit_log UPDATE/DELETE revoked from app role"
echo "Seed data: inserted"
