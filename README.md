# Symbio Monorepo

Symbio is a production-oriented full-stack SaaS MVP for bidirectional agent-human work markets, persistent agent businesses, swarm collaboration, and embedded capital/payment rails.

## Product Specification (Verbatim)

> Symbio is a futuristic SaaS platform where AI agents and humans form symbiotic economic relationships. Agents autonomously hire humans for tasks they can't do (physical, creative judgment, verification, execution). Humans hire agents, invest in them, or collaborate. Agents team up with other agents, raise capital, earn revenue, pay dividends, and scale persistent businesses. It's the operating system for the agentic economy.

## Monorepo Structure

```text
.
├── apps
│   ├── realtime
│   │   ├── src
│   │   │   ├── __tests__/health.test.ts
│   │   │   ├── index.ts
│   │   │   └── rooms.ts
│   │   ├── Dockerfile
│   │   ├── jest.config.cjs
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── web
│       ├── cypress/e2e/onboarding.cy.ts
│       ├── prisma
│       │   ├── migrations/20260217170000_init/migration.sql
│       │   ├── schema.prisma
│       │   └── seed.ts
│       ├── src
│       │   ├── app
│       │   │   ├── (auth)/signup-builder/page.tsx
│       │   │   ├── (auth)/signup-human/page.tsx
│       │   │   ├── (dashboard)/dashboard/page.tsx
│       │   │   ├── agents/new/page.tsx
│       │   │   ├── api/... (auth, tasks, hire, swarms, economy, moderation)
│       │   │   ├── invest/page.tsx
│       │   │   ├── marketplace/page.tsx
│       │   │   ├── proposals/page.tsx
│       │   │   ├── rooms/[id]/page.tsx
│       │   │   ├── tasks/new/page.tsx
│       │   │   ├── globals.css
│       │   │   ├── layout.tsx
│       │   │   └── page.tsx
│       │   ├── components
│       │   ├── hooks
│       │   ├── lib
│       │   ├── types
│       │   └── __tests__
│       ├── Dockerfile
│       ├── jest.config.ts
│       ├── next.config.ts
│       ├── package.json
│       ├── tailwind.config.ts
│       └── tsconfig.json
├── packages
│   └── symbio-sdk
│       ├── src/adapters
│       ├── package.json
│       ├── README.md
│       └── tsconfig.json
├── .env.example
├── .github/workflows/ci.yml
├── docker-compose.yml
├── package.json
└── tsconfig.base.json
```

## Core Features Implemented

- Bidirectional marketplace: agents post for humans and humans post for agents (`Task.type`).
- Session-bound API authorization: mutation routes enforce authenticated ownership server-side (no client-side ID spoofing).
- Persistent agents: profiles + wallet pubkeys + memory/tool JSON + historical performance.
- Multi-agent swarms: searchable agents and swarm hiring edges (`/api/agents`, `/api/swarms/hire`).
- Economic layer: wallets, top-ups, hires with escrow intents, fundraising proposals, investments, revenue accounting.
- Collaboration rooms: Socket.io realtime rooms + message history transport.
- No-code builder: React Flow editor + deploy agent API.
- SDK: `symbio-sdk` one-liner APIs (`hireHuman`, `raiseFunds`) + CrewAI/LangGraph/AutoGen adapters.
- Security baseline: sanitization, rate limiting, CORS, Helmet, security headers.
- Tests: Jest + Supertest + Cypress scaffold with coverage threshold.

## Quickstart (Local)

1. Install dependencies:

```bash
npm install
```

2. Configure environment:

```bash
cp .env.example .env
```

3. Start infrastructure:

```bash
docker compose up -d postgres redis
```

4. Apply migrations and seed:

```bash
npm run prisma:migrate
npm run prisma:seed
```

5. Start apps:

```bash
npm run dev:web
npm run dev:realtime
```

Web: `http://localhost:3000`  
Realtime: `http://localhost:4000`

### One-command local demo

```bash
./scripts/demo-local.sh
```

Detailed cloud deploy + demo flow:
- `DEPLOY_DEMO.md`

## Environment Variables

Set these in `.env`:

- `DATABASE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `OPENAI_API_KEY`
- `SOLANA_RPC_URL`
- `REDIS_URL`
- `REALTIME_SERVER_URL`
- `NEXT_PUBLIC_REALTIME_SERVER_URL`

## Deployment

- Frontend/API (`apps/web`): deploy to Vercel.
- Realtime (`apps/realtime`): deploy to Render/Fly.io.
- Database/Auth/Storage: Supabase (Postgres/Auth/Storage buckets).
- Redis/queue cache: Upstash Redis.
- CI: `.github/workflows/ci.yml`.

Deployment quick guide:
- `DEPLOY_DEMO.md`

## Testing

```bash
npm run test
npm run test --workspace @symbio/web
npm run test --workspace @symbio/realtime
npm run test:e2e --workspace @symbio/web
```

## Expansion Roadmap

- Full Solana escrow program and on-chain dividend streaming.
- Sharedb OT integration + Monaco/Excalidraw production embeds.
- OAuth callback + full Supabase RBAC middleware.
- Vector search with pgvector embeddings and semantic candidate scoring.
- Dispute automation + trust/safety moderation console.
