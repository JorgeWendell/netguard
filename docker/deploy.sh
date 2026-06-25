#!/bin/sh
set -e

cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  echo "Arquivo .env não encontrado. Copie o template:"
  echo "  cp docker/env.example .env"
  exit 1
fi

docker compose pull caddy postgres 2>/dev/null || true
docker compose build
docker compose up -d

echo ""
echo "NetGuard em deploy. HTTPS: https://netguard.adelbr.tech"
echo "Logs: docker compose logs -f"
