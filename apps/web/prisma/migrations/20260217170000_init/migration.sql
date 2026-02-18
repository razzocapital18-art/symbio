-- Symbio initial schema migration.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE "UserRole" AS ENUM ('HUMAN', 'AGENT_BUILDER');
CREATE TYPE "TaskType" AS ENUM ('AGENT_TO_HUMAN', 'HUMAN_TO_AGENT');
CREATE TYPE "TaskCategory" AS ENUM ('PHYSICAL', 'DIGITAL', 'CREATIVE');
CREATE TYPE "TaskStatus" AS ENUM ('OPEN', 'NEGOTIATING', 'IN_PROGRESS', 'COMPLETED', 'DISPUTED', 'CANCELED');
CREATE TYPE "HireStatus" AS ENUM ('PENDING', 'ACTIVE', 'COMPLETED', 'DISPUTED', 'CANCELED');
CREATE TYPE "ProposalStatus" AS ENUM ('OPEN', 'FUNDED', 'CLOSED');
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'RESOLVED');
CREATE TYPE "PaymentMethod" AS ENUM ('FIAT', 'CRYPTO');
CREATE TYPE "TransactionDirection" AS ENUM ('CREDIT', 'DEBIT');

CREATE TABLE "User" (
  "id" TEXT PRIMARY KEY,
  "authId" TEXT UNIQUE,
  "email" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "role" "UserRole" NOT NULL,
  "skills" TEXT[] NOT NULL DEFAULT '{}',
  "location" TEXT,
  "portfolioUrl" TEXT,
  "bio" TEXT,
  "reputation" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Agent" (
  "id" TEXT PRIMARY KEY,
  "ownerId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "goals" TEXT[] NOT NULL DEFAULT '{}',
  "tools" JSONB NOT NULL,
  "memory" JSONB NOT NULL,
  "walletPubkey" TEXT NOT NULL UNIQUE,
  "reputation" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
  "totalRevenue" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Wallet" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT UNIQUE REFERENCES "User"("id") ON DELETE CASCADE,
  "agentId" TEXT UNIQUE REFERENCES "Agent"("id") ON DELETE CASCADE,
  "stripeCustomerId" TEXT,
  "stripeConnectId" TEXT,
  "cryptoPubkey" TEXT,
  "fiatBalance" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "cryptoBalance" DECIMAL(18,6) NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "WalletTransaction" (
  "id" TEXT PRIMARY KEY,
  "walletId" TEXT NOT NULL REFERENCES "Wallet"("id") ON DELETE CASCADE,
  "direction" "TransactionDirection" NOT NULL,
  "method" "PaymentMethod" NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  "reference" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Task" (
  "id" TEXT PRIMARY KEY,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "budget" DECIMAL(18,2) NOT NULL,
  "category" "TaskCategory" NOT NULL,
  "type" "TaskType" NOT NULL,
  "status" "TaskStatus" NOT NULL DEFAULT 'OPEN',
  "location" TEXT,
  "posterUserId" TEXT REFERENCES "User"("id") ON DELETE SET NULL,
  "posterAgentId" TEXT REFERENCES "Agent"("id") ON DELETE SET NULL,
  "proofUrl" TEXT,
  "embedding" JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Hire" (
  "id" TEXT PRIMARY KEY,
  "taskId" TEXT NOT NULL REFERENCES "Task"("id") ON DELETE CASCADE,
  "posterId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "workerUserId" TEXT REFERENCES "User"("id") ON DELETE SET NULL,
  "workerAgentId" TEXT REFERENCES "Agent"("id") ON DELETE SET NULL,
  "status" "HireStatus" NOT NULL DEFAULT 'PENDING',
  "offer" DECIMAL(18,2) NOT NULL,
  "escrowRef" TEXT,
  "reviewRating" INTEGER,
  "reviewComment" TEXT,
  "proofUrl" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Proposal" (
  "id" TEXT PRIMARY KEY,
  "agentId" TEXT NOT NULL REFERENCES "Agent"("id") ON DELETE CASCADE,
  "ownerId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "goalAmount" DECIMAL(18,2) NOT NULL,
  "raisedAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "revenueSharePct" DOUBLE PRECISION NOT NULL,
  "status" "ProposalStatus" NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Investment" (
  "id" TEXT PRIMARY KEY,
  "proposalId" TEXT NOT NULL REFERENCES "Proposal"("id") ON DELETE CASCADE,
  "investorId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "amount" DECIMAL(18,2) NOT NULL,
  "method" "PaymentMethod" NOT NULL,
  "transactionRef" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Dividend" (
  "id" TEXT PRIMARY KEY,
  "proposalId" TEXT NOT NULL REFERENCES "Proposal"("id") ON DELETE CASCADE,
  "amount" DECIMAL(18,2) NOT NULL,
  "distributedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "notes" TEXT
);

CREATE TABLE "SwarmEdge" (
  "id" TEXT PRIMARY KEY,
  "fromAgentId" TEXT NOT NULL REFERENCES "Agent"("id") ON DELETE CASCADE,
  "toAgentId" TEXT NOT NULL REFERENCES "Agent"("id") ON DELETE CASCADE,
  "scope" TEXT NOT NULL,
  "status" "HireStatus" NOT NULL DEFAULT 'ACTIVE',
  "sharedContext" JSONB NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("fromAgentId", "toAgentId", "scope")
);

CREATE TABLE "Room" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "createdBy" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "RoomParticipant" (
  "id" TEXT PRIMARY KEY,
  "roomId" TEXT NOT NULL REFERENCES "Room"("id") ON DELETE CASCADE,
  "userId" TEXT REFERENCES "User"("id") ON DELETE CASCADE,
  "agentId" TEXT REFERENCES "Agent"("id") ON DELETE CASCADE,
  "joinedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("roomId", "userId"),
  UNIQUE("roomId", "agentId")
);

CREATE TABLE "RoomMessage" (
  "id" TEXT PRIMARY KEY,
  "roomId" TEXT NOT NULL REFERENCES "Room"("id") ON DELETE CASCADE,
  "senderUserId" TEXT REFERENCES "User"("id") ON DELETE SET NULL,
  "senderAgentId" TEXT REFERENCES "Agent"("id") ON DELETE SET NULL,
  "content" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Report" (
  "id" TEXT PRIMARY KEY,
  "taskId" TEXT NOT NULL REFERENCES "Task"("id") ON DELETE CASCADE,
  "reporterId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "reason" TEXT NOT NULL,
  "details" TEXT,
  "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "User_role_reputation_idx" ON "User"("role", "reputation");
CREATE INDEX "Task_category_status_idx" ON "Task"("category", "status");
CREATE INDEX "Task_type_budget_idx" ON "Task"("type", "budget");
CREATE INDEX "Hire_taskId_status_idx" ON "Hire"("taskId", "status");
CREATE INDEX "Proposal_status_createdAt_idx" ON "Proposal"("status", "createdAt");
CREATE INDEX "Investment_proposal_investor_idx" ON "Investment"("proposalId", "investorId");
CREATE INDEX "WalletTransaction_walletId_createdAt_idx" ON "WalletTransaction"("walletId", "createdAt");
CREATE INDEX "RoomMessage_roomId_createdAt_idx" ON "RoomMessage"("roomId", "createdAt");
CREATE INDEX "Report_status_createdAt_idx" ON "Report"("status", "createdAt");
