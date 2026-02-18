#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

export npm_config_cache="${npm_config_cache:-/tmp/npm-cache}"
mkdir -p "$npm_config_cache"

if [ ! -d node_modules ]; then
  echo "Installing dependencies..."
  npm install
fi

if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env from .env.example. Fill required secrets for Supabase/Stripe if needed."
fi

echo "Starting postgres + redis..."
if ! docker info >/dev/null 2>&1; then
  echo "Docker Desktop is not running or not accessible. Please open Docker Desktop and retry."
  exit 1
fi
docker compose up -d postgres redis

echo "Applying migrations + seed..."
npm run prisma:migrate
npm run prisma:seed

echo "Starting realtime service on :4000"
npm run dev:realtime &
REALTIME_PID=$!

echo "Starting web app on :3000"
npm run dev:web &
WEB_PID=$!

cleanup() {
  echo "Stopping local demo services..."
  kill "$REALTIME_PID" "$WEB_PID" >/dev/null 2>&1 || true
}

trap cleanup EXIT INT TERM

echo "Demo running:"
echo "  Web:      http://localhost:3000"
echo "  Realtime: http://localhost:4000/health"
echo "Press Ctrl+C to stop."

wait
