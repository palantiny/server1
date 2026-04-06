#!/bin/bash
set -e

cd /home/ubuntu/server1

docker compose -f docker-compose.prod.yml --env-file .env.prod down --remove-orphans 2>/dev/null || true
docker rm -f palantiny_postgres palantiny_web_app 2>/dev/null || true
docker compose -f docker-compose.prod.yml --env-file .env.prod build
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d

echo "server1 deploy complete"
