#!/bin/bash
# ============================================================
# Paperclip AI — Full VPS Setup Script
# Hostinger KVM2 | Ubuntu 22.04
# Run as root: bash 1-setup.sh
# ============================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }

echo ""
echo "============================================"
echo "  Paperclip AI — VPS Setup"
echo "  Server: $(hostname -I | awk '{print $1}')"
echo "============================================"
echo ""

# --------------------
# 1. System update
# --------------------
log "Updating system packages..."
apt-get update -qq && apt-get upgrade -y -qq

log "Installing base tools..."
apt-get install -y -qq curl wget git unzip ufw fail2ban

# --------------------
# 2. Node.js 20
# --------------------
if ! command -v node &>/dev/null || [[ $(node -v | cut -d. -f1 | tr -d 'v') -lt 20 ]]; then
  log "Installing Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
  log "Node.js $(node -v) installed"
else
  log "Node.js $(node -v) already installed"
fi

# --------------------
# 3. pnpm
# --------------------
if ! command -v pnpm &>/dev/null; then
  log "Installing pnpm..."
  npm install -g pnpm@latest
fi
log "pnpm $(pnpm -v) ready"

# --------------------
# 4. PM2
# --------------------
if ! command -v pm2 &>/dev/null; then
  log "Installing PM2..."
  npm install -g pm2
fi
log "PM2 $(pm2 -v) ready"

# --------------------
# 5. PostgreSQL 15
# --------------------
if ! command -v psql &>/dev/null; then
  log "Installing PostgreSQL 15..."
  apt-get install -y -qq postgresql postgresql-contrib
  systemctl enable postgresql
  systemctl start postgresql
  log "PostgreSQL installed and started"
else
  log "PostgreSQL already installed"
fi

# --------------------
# 6. Nginx
# --------------------
if ! command -v nginx &>/dev/null; then
  log "Installing Nginx..."
  apt-get install -y -qq nginx
  systemctl enable nginx
  systemctl start nginx
fi
log "Nginx ready"

# --------------------
# 7. Certbot (SSL)
# --------------------
if ! command -v certbot &>/dev/null; then
  log "Installing Certbot for SSL..."
  apt-get install -y -qq certbot python3-certbot-nginx
fi

# --------------------
# 8. PostgreSQL — create DB and user
# --------------------
log "Setting up PostgreSQL database..."
DB_NAME="paperclip"
DB_USER="paperclip"
DB_PASS=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 20)

# Create user and database (ignore errors if already exists)
sudo -u postgres psql -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASS}';" 2>/dev/null || warn "DB user may already exist — skipping"
sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};" 2>/dev/null || warn "Database may already exist — skipping"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};" 2>/dev/null

DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}"
log "Database ready: postgresql://${DB_USER}:****@localhost:5432/${DB_NAME}"

# --------------------
# 9. Clone Paperclip
# --------------------
INSTALL_DIR="/opt/paperclip"

if [ -d "$INSTALL_DIR" ]; then
  warn "Paperclip already exists at $INSTALL_DIR — pulling latest..."
  cd "$INSTALL_DIR" && git pull
else
  log "Cloning Paperclip from GitHub..."
  git clone https://github.com/paperclipai/paperclip.git "$INSTALL_DIR"
fi

cd "$INSTALL_DIR"

# --------------------
# 10. Write .env file
# --------------------
log "Writing .env configuration..."
ENV_FILE="$INSTALL_DIR/.env"

# Load values from paperclip.env if it exists in the same folder as this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$SCRIPT_DIR/paperclip.env" ]; then
  source "$SCRIPT_DIR/paperclip.env"
  log "Loaded paperclip.env settings"
fi

cat > "$ENV_FILE" << ENVEOF
# Database
DATABASE_URL=${DATABASE_URL}

# App
NODE_ENV=production
PORT=3000
APP_URL=${APP_URL:-http://$(hostname -I | awk '{print $1}')}

# AI Provider — Groq (OpenAI-compatible)
OPENAI_API_KEY=${GROQ_API_KEY:-REPLACE_WITH_YOUR_GROQ_KEY}
OPENAI_BASE_URL=https://api.groq.com/openai/v1
OPENAI_MODEL=${GROQ_MODEL:-meta-llama/llama-4-scout-17b-16e-instruct}

# Session secret
SESSION_SECRET=$(openssl rand -base64 48)
ENVEOF

log ".env file written to $ENV_FILE"

# --------------------
# 11. Install dependencies & build
# --------------------
log "Installing Paperclip dependencies (this may take 2-3 minutes)..."
cd "$INSTALL_DIR"
pnpm install --frozen-lockfile 2>&1 | tail -5

log "Building Paperclip..."
pnpm build 2>&1 | tail -10

# --------------------
# 12. PM2 — start & persist
# --------------------
log "Starting Paperclip with PM2..."
pm2 delete paperclip 2>/dev/null || true
pm2 start pnpm --name paperclip --cwd "$INSTALL_DIR" -- start
pm2 save
pm2 startup systemd -u root --hp /root | tail -1 | bash || true

log "Paperclip is running via PM2"
pm2 status paperclip

# --------------------
# 13. Nginx config
# --------------------
log "Configuring Nginx reverse proxy..."

SERVER_IP=$(hostname -I | awk '{print $1}')
DOMAIN=${APP_DOMAIN:-$SERVER_IP}

NGINX_CONF="/etc/nginx/sites-available/paperclip"
cat > "$NGINX_CONF" << NGINXEOF
server {
    listen 80;
    server_name ${DOMAIN};

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
NGINXEOF

ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/paperclip
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
log "Nginx configured"

# --------------------
# 14. Firewall
# --------------------
log "Configuring firewall..."
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
log "Firewall active (SSH + HTTP/HTTPS allowed)"

# --------------------
# Done
# --------------------
echo ""
echo "============================================"
echo "  PAPERCLIP SETUP COMPLETE"
echo "============================================"
echo ""
echo "  URL:      http://${DOMAIN}"
echo "  Install:  ${INSTALL_DIR}"
echo "  DB URL:   ${DATABASE_URL}"
echo "  Logs:     pm2 logs paperclip"
echo "  Status:   pm2 status"
echo "  Restart:  pm2 restart paperclip"
echo ""
echo "  NEXT STEPS:"
echo "  1. If you have a domain, run:"
echo "     certbot --nginx -d yourdomain.com"
echo "  2. Open http://${DOMAIN} in your browser"
echo "  3. Create your first AI company in Paperclip"
echo ""
warn "IMPORTANT: Edit /opt/paperclip/.env and replace"
warn "REPLACE_WITH_YOUR_GROQ_KEY with your real Groq API key"
warn "then run: pm2 restart paperclip"
echo ""
