#!/bin/bash
# ============================================================
# Paperclip AI — Update Script
# Run this whenever Paperclip releases a new version
# Usage: bash 2-update.sh
# ============================================================

set -e

INSTALL_DIR="/opt/paperclip"

echo "[+] Pulling latest Paperclip from GitHub..."
cd "$INSTALL_DIR"
git pull

echo "[+] Installing new dependencies..."
pnpm install --frozen-lockfile

echo "[+] Building..."
pnpm build

echo "[+] Restarting Paperclip..."
pm2 restart paperclip

echo ""
echo "[✓] Update complete. Running version:"
cd "$INSTALL_DIR" && git log --oneline -1
echo ""
pm2 status paperclip
