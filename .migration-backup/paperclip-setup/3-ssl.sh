#!/bin/bash
# ============================================================
# Paperclip AI — SSL Setup (HTTPS via Let's Encrypt)
# Run AFTER 1-setup.sh and AFTER pointing your domain DNS to this VPS
# Usage: bash 3-ssl.sh yourdomain.com
# ============================================================

set -e

DOMAIN=$1

if [ -z "$DOMAIN" ]; then
  echo "Usage: bash 3-ssl.sh yourdomain.com"
  exit 1
fi

echo "[+] Requesting SSL certificate for $DOMAIN..."
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m admin@"$DOMAIN"

echo "[+] Updating .env with HTTPS URL..."
sed -i "s|^APP_URL=.*|APP_URL=https://${DOMAIN}|" /opt/paperclip/.env

echo "[+] Restarting Paperclip..."
pm2 restart paperclip

echo ""
echo "[✓] HTTPS enabled at https://${DOMAIN}"
echo "    Certificate auto-renews every 90 days."
