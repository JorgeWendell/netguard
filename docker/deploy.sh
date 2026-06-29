#!/bin/sh
set -e

cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  echo "Arquivo .env não encontrado. Copie o template:"
  echo "  cp .env.docker.example .env"
  exit 1
fi

docker compose build
docker compose up -d

echo ""
echo "NetGuard em deploy. HTTPS: https://netguard.adelbr.tech"
echo "Logs: docker compose logs -f app worker"
