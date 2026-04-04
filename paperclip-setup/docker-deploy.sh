#!/bin/bash
# One master command — checks if Paperclip is running, deploys if not
# Usage: GROQ_API_KEY=your_key bash docker-deploy.sh

set -e

GROQ_KEY="${GROQ_API_KEY:-REPLACE_ME}"
DIR="/opt/paperclip"

# Check if already running
if docker ps --format '{{.Names}}' | grep -q "paperclip"; then
  echo "[✓] Paperclip is already running!"
  docker ps | grep paperclip
  SERVER_IP=$(hostname -I | awk '{print $1}')
  echo "    Open: http://${SERVER_IP}"
  exit 0
fi

echo "[+] Deploying Paperclip with Docker..."
mkdir -p "$DIR" && cd "$DIR"

cat > docker-compose.yml << YAML
version: '3.8'
services:
  db:
    image: postgres:15-alpine
    container_name: paperclip-db
    restart: unless-stopped
    environment:
      POSTGRES_DB: paperclip
      POSTGRES_USER: paperclip
      POSTGRES_PASSWORD: paperclip_secret_123
    volumes:
      - pgdata:/var/lib/postgresql/data

  app:
    image: node:20-alpine
    container_name: paperclip
    restart: unless-stopped
    working_dir: /app
    ports:
      - "80:3000"
    environment:
      DATABASE_URL: postgresql://paperclip:paperclip_secret_123@db:5432/paperclip
      NODE_ENV: production
      PORT: 3000
      OPENAI_API_KEY: ${GROQ_KEY}
      OPENAI_BASE_URL: https://api.groq.com/openai/v1
      OPENAI_MODEL: meta-llama/llama-4-scout-17b-16e-instruct
    depends_on:
      - db
    command: >
      sh -c "apk add --no-cache git python3 make g++ coreutils &&
             git clone https://github.com/paperclipai/paperclip.git /app &&
             npm install -g pnpm &&
             NODE_ENV=development pnpm install &&
             NODE_ENV=development pnpm build &&
             NODE_ENV=production pnpm start"
    volumes:
      - appdata:/app

volumes:
  pgdata:
  appdata:
YAML

# Substitute the Groq key into the compose file
sed -i "s|\${GROQ_KEY}|${GROQ_KEY}|g" docker-compose.yml

echo "[+] Starting containers (first run takes 3-5 minutes to build)..."
docker compose up -d

echo ""
echo "[+] Watching build progress (Ctrl+C to stop watching, containers keep running)..."
docker logs -f paperclip &
LOG_PID=$!

# Wait for app to be ready
for i in $(seq 1 60); do
  sleep 5
  if curl -s http://localhost:80 > /dev/null 2>&1; then
    kill $LOG_PID 2>/dev/null || true
    SERVER_IP=$(hostname -I | awk '{print $1}')
    echo ""
    echo "============================================"
    echo "  PAPERCLIP IS LIVE!"
    echo "  Open: http://${SERVER_IP}"
    echo "============================================"
    echo "  Useful commands:"
    echo "  docker logs -f paperclip     (view logs)"
    echo "  docker restart paperclip     (restart app)"
    echo "  docker compose down          (stop all)"
    echo "============================================"
    exit 0
  fi
  echo "  Waiting... ($((i*5))s)"
done

kill $LOG_PID 2>/dev/null || true
echo "[!] Still building — check progress with: docker logs -f paperclip"
echo "    Then open http://$(hostname -I | awk '{print $1}') when ready"
