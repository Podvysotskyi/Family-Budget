#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
command -v docker >/dev/null || { echo "Install and start Docker with Linux containers first."; exit 1; }
[ -f .env ] || cp .env.example .env
if grep -q '^APP_KEY=$' .env; then
  key=$(docker run --rm php:8.4-cli php -r 'echo "base64:".base64_encode(random_bytes(32));')
  awk -v key="$key" '/^APP_KEY=$/ { print "APP_KEY=" key; next } { print }' .env > .env.next
  mv .env.next .env
fi
docker compose up --build --detach --wait
echo 'Household is ready at http://localhost:8080'
