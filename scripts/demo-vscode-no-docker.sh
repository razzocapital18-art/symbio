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
  echo "Created .env. You must set DATABASE_URL to your Supabase Postgres URI first."
  exit 1
fi

if grep -q 'DATABASE_URL=postgresql://postgres:postgres@localhost:5432/symbio' .env; then
  echo "DATABASE_URL is still local. Please replace it with your Supabase DB URI in .env, then rerun."
  exit 1
fi

echo "Generating Prisma client..."
npx prisma generate --schema apps/web/prisma/schema.prisma

echo "Applying migrations..."
npm run prisma:migrate

echo "Seeding data..."
npm run prisma:seed || true

echo "Starting realtime service on :4000"
npm run dev:realtime &
REALTIME_PID=$!

echo "Starting web app on :3000"
npm run dev:web &
WEB_PID=$!

cleanup() {
  echo "Stopping services..."
  kill "$REALTIME_PID" "$WEB_PID" >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM

echo "App ready: http://localhost:3000"
wait
