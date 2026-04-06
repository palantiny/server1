#!/bin/bash
set -e

cd /home/ubuntu/server1

docker compose -f docker-compose.prod.yml --env-file .env.prod build
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d

echo "server1 deploy complete"
