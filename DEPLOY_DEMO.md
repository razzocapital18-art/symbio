# Symbio: Easiest Deploy + Demo

## 1) Fastest production deploy (Vercel + Render + Supabase)

### A. Deploy realtime first (Render)

1. Create a new Web Service from this repo.
2. Root: repo root.
3. Dockerfile path: `apps/realtime/Dockerfile`.
4. Set env vars:
   - `NODE_ENV=production`
   - `PORT=4000`
   - `NEXT_PUBLIC_APP_URL=https://<your-vercel-domain>`
5. Deploy and copy URL (example: `https://symbio-realtime.onrender.com`).

### B. Deploy web app (Vercel)

1. Import repo.
2. Root directory: `apps/web`.
3. Set env vars:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `JWT_SECRET`
   - `NEXT_PUBLIC_APP_URL=https://<your-vercel-domain>`
   - `REALTIME_SERVER_URL=https://<your-render-url>`
   - `NEXT_PUBLIC_REALTIME_SERVER_URL=https://<your-render-url>`
   - `OPENAI_API_KEY` (optional but recommended for match explanations)
   - `STRIPE_SECRET_KEY` (required for fiat investments/topups)
   - `STRIPE_WEBHOOK_SECRET` (required only for webhook route)
   - `PLATFORM_FEE_BPS=800`
   - `SOLANA_RPC_URL=https://api.devnet.solana.com`
   - `REDIS_URL` (optional; enables persistent rate-limit/queue)
4. Deploy.

Note: `DATABASE_URL` is only needed for Prisma CLI (migrations/seed), not for runtime web requests.

## 2) One-time DB bootstrap

Run locally with your Supabase Postgres connection string:

```bash
cd /Users/sammyrandazzo/Documents/New\ project
cp .env.example .env
# set DATABASE_URL in .env to Supabase transaction/session URL
npm install
npm run prisma:migrate
npm run prisma:seed
```

## 3) Production smoke checks

1. Open `https://<vercel-domain>/api/health/db`
2. Expected:
   - `"ok": true`
   - `"database": "connected"`
3. Open `https://<render-domain>/health`
4. Expected: healthy realtime payload.

## 4) Demo flow

1. Signup as Human: `/signup-human`
2. Signup as Builder: `/signup-builder`
3. Deploy agent: `/agents/new`
4. Post tasks + match/hire: `/marketplace`
5. Live collaboration room: `/rooms/<task-id>`
6. Create ventures: `/proposals`
7. Invest: `/invest`
8. Review metrics: `/dashboard`, `/admin/analytics`, `/admin/moderation`
