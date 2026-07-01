#!/bin/bash
# =============================================================================
# SealProof — SSL Certificate Setup via Let's Encrypt (certbot)
# =============================================================================
# Run on the production server after DNS records are pointed.
# Requires: certbot, nginx
# =============================================================================

set -euo pipefail

DOMAIN="sealproof.ai"
EMAIL="admin@trgtechlink.com"
WEBROOT="/var/www/certbot"

echo "=== SealProof SSL Setup ==="
echo "Domain: ${DOMAIN}"
echo "Email: ${EMAIL}"
echo ""

# 1. Create webroot directory
mkdir -p "${WEBROOT}"

# 2. Generate DH params if not present
if [ ! -f /etc/nginx/dhparam.pem ]; then
    echo "[1/4] Generating DH parameters (this takes a few minutes)..."
    openssl dhparam -out /etc/nginx/dhparam.pem 2048
else
    echo "[1/4] DH parameters already exist, skipping."
fi

# 3. Request certificates for all domains
echo "[2/4] Requesting certificates from Let's Encrypt..."
certbot certonly \
    --webroot \
    --webroot-path="${WEBROOT}" \
    --email "${EMAIL}" \
    --agree-tos \
    --no-eff-email \
    -d "${DOMAIN}" \
    -d "www.${DOMAIN}" \
    -d "notary.${DOMAIN}" \
    -d "admin.${DOMAIN}" \
    -d "api.${DOMAIN}"

# 4. Copy SSL params snippet
echo "[3/4] Installing SSL params snippet..."
cp "$(dirname "$0")/../nginx/ssl-params.conf" /etc/nginx/snippets/ssl-params.conf

# 5. Install nginx config
echo "[4/4] Installing nginx config..."
cp "$(dirname "$0")/../nginx/sealproof.conf" /etc/nginx/sites-available/sealproof.conf
ln -sf /etc/nginx/sites-available/sealproof.conf /etc/nginx/sites-enabled/sealproof.conf

# Test and reload
nginx -t
systemctl reload nginx

echo ""
echo "=== SSL setup complete ==="
echo "Certificates installed for:"
echo "  - ${DOMAIN}"
echo "  - www.${DOMAIN}"
echo "  - notary.${DOMAIN}"
echo "  - admin.${DOMAIN}"
echo "  - api.${DOMAIN}"
echo ""
echo "Auto-renewal is handled by certbot's systemd timer."
echo "Verify: sudo certbot renew --dry-run"
