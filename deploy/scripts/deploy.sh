#!/bin/bash
# =============================================================================
# SealProof — Production Deployment Script
# =============================================================================
# Usage: ./deploy/scripts/deploy.sh [--skip-build] [--skip-migrate]
#
# Steps:
#   1. Pull latest code
#   2. Install dependencies
#   3. Run database migrations
#   4. Build frontend apps
#   5. Reload PM2 services (zero-downtime)
#   6. Reload nginx
#   7. Verify health checks
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
LOG_DIR="/var/log/sealproof"
SKIP_BUILD=false
SKIP_MIGRATE=false

# Parse args
for arg in "$@"; do
  case $arg in
    --skip-build) SKIP_BUILD=true ;;
    --skip-migrate) SKIP_MIGRATE=true ;;
  esac
done

cd "${PROJECT_DIR}"

echo "============================================="
echo "  SealProof — Production Deployment"
echo "  $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo "============================================="
echo ""

# Create log directory
mkdir -p "${LOG_DIR}"

# 1. Install dependencies
echo "[1/7] Installing dependencies..."
npm install --production --ignore-scripts 2>/dev/null
cd apps/customer-web && npm install --production 2>/dev/null && cd ../..
cd apps/notary-web && npm install --production 2>/dev/null && cd ../..
cd apps/admin-web && npm install --production 2>/dev/null && cd ../..
echo "  Done."

# 2. Run migrations
if [ "${SKIP_MIGRATE}" = false ]; then
  echo "[2/7] Running database migrations..."
  node shared/db/migrate.js
  echo "  Done."
else
  echo "[2/7] Skipping migrations (--skip-migrate)."
fi

# 3. Build frontend apps
if [ "${SKIP_BUILD}" = false ]; then
  echo "[3/7] Building customer-web..."
  cd apps/customer-web && npx next build && cd ../..

  echo "[4/7] Building notary-web..."
  cd apps/notary-web && npx next build && cd ../..

  echo "[5/7] Building admin-web..."
  cd apps/admin-web && npx next build && cd ../..
else
  echo "[3-5/7] Skipping builds (--skip-build)."
fi

# 4. Reload PM2 (zero-downtime)
echo "[6/7] Reloading PM2 processes..."
pm2 reload ecosystem.production.config.js --update-env
pm2 save
echo "  Done."

# 5. Reload nginx
echo "[7/7] Reloading nginx..."
nginx -t && systemctl reload nginx
echo "  Done."

echo ""
echo "============================================="
echo "  Deployment complete!"
echo "============================================="
echo ""

# Health checks
echo "Running health checks..."
SERVICES=(
  "notary-commission:4001"
  "notary-roster:4002"
  "session-orchestrator:4003"
  "kyc:4004"
  "livekit-bridge:4005"
  "esign-bridge:4006"
  "journal:4007"
  "recording:4008"
  "seal-applicator:4009"
  "payment:4010"
  "notification:4011"
  "audit-export:4012"
  "api-gateway:4013"
  "webhook:4014"
  "tenant:4015"
)

ALL_HEALTHY=true
for svc in "${SERVICES[@]}"; do
  NAME="${svc%%:*}"
  PORT="${svc##*:}"
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:${PORT}/health" 2>/dev/null || echo "000")
  if [ "${STATUS}" = "200" ]; then
    echo "  [OK] ${NAME} (port ${PORT})"
  else
    echo "  [FAIL] ${NAME} (port ${PORT}) — HTTP ${STATUS}"
    ALL_HEALTHY=false
  fi
done

echo ""
if [ "${ALL_HEALTHY}" = true ]; then
  echo "All services healthy."
else
  echo "WARNING: Some services failed health checks. Check PM2 logs:"
  echo "  pm2 logs --lines 50"
fi
