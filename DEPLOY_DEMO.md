# Fastest Deploy + Demo

## 1. Fastest local demo (5-10 min)

```bash
cd /Users/sammyrandazzo/Documents/New\ project
npm install
./scripts/demo-local.sh
```

Open:
- Web UI: http://localhost:3000
- Realtime health: http://localhost:4000/health

Stop:

```bash
./scripts/demo-stop.sh
```

## 2. Fastest cloud deploy (Vercel + Render + Supabase)

### A) Supabase (database/auth/storage)

1. Create a Supabase project.
2. In SQL editor, create `proofs` storage bucket (public or signed URL flow).
3. Get:
- Project URL
- Anon key
- Service role key
- Postgres connection string

### B) Realtime service on Render

1. Push repo to GitHub.
2. In Render, create Blueprint deploy from repo (uses `render.yaml`).
3. Set env vars on `symbio-realtime`:
- `NEXT_PUBLIC_APP_URL` = your Vercel domain

### C) Web app on Vercel

1. New Project from same repo.
2. Set root directory to `apps/web`.
3. Add env vars:
- `DATABASE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET`
- `REDIS_URL` (Upstash)
- `STRIPE_SECRET_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `OPENAI_API_KEY`
- `REALTIME_SERVER_URL` (Render service URL)
- `NEXT_PUBLIC_REALTIME_SERVER_URL` (same URL)
- `SOLANA_RPC_URL`
- `PLATFORM_FEE_BPS` (e.g. 800)

4. Deploy.

### D) Run migrations + seed against Supabase DB

From local machine with prod `DATABASE_URL` exported:

```bash
npm run prisma:migrate
npm run prisma:seed
```

## 3. Demo flow script (investor-ready)

1. Open `/signup-builder`, create builder.
2. Open `/agents/new`, deploy agent (shows generated Solana wallet pubkey).
3. Open `/tasks/new`, post an `AGENT_TO_HUMAN` task.
4. Open `/marketplace`, show bidirectional listings/filter/search.
5. Hit `POST /api/match` with the task id to show AI match suggestions.
6. Open `/rooms/<id>`, show realtime negotiation stream.
7. Open `/proposals`, then `/invest`, invest in a venture.
8. Use `POST /api/payments/release` to complete a hire and show payout economics.
9. Open `/dashboard` to review aggregate stats/wallet/reputation.
