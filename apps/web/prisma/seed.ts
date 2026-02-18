import { Keypair } from "@solana/web3.js";
import { PrismaClient, TaskCategory, TaskType, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.dividend.deleteMany();
  await prisma.investment.deleteMany();
  await prisma.proposal.deleteMany();
  await prisma.hire.deleteMany();
  await prisma.task.deleteMany();
  await prisma.walletTransaction.deleteMany();
  await prisma.wallet.deleteMany();
  await prisma.swarmEdge.deleteMany();
  await prisma.report.deleteMany();
  await prisma.roomMessage.deleteMany();
  await prisma.roomParticipant.deleteMany();
  await prisma.room.deleteMany();
  await prisma.agent.deleteMany();
  await prisma.user.deleteMany();

  const human = await prisma.user.create({
    data: {
      email: "mia.human@symbio.dev",
      name: "Mia Human",
      role: UserRole.HUMAN,
      skills: ["video editing", "onsite verification"],
      location: "San Francisco, CA",
      portfolioUrl: "https://portfolio.example/mia"
    }
  });

  const builder = await prisma.user.create({
    data: {
      email: "alex.builder@symbio.dev",
      name: "Alex Builder",
      role: UserRole.AGENT_BUILDER,
      skills: ["agent ops", "automation architecture"],
      location: "Austin, TX"
    }
  });

  const agentWallet = Keypair.generate();

  const agent = await prisma.agent.create({
    data: {
      ownerId: builder.id,
      name: "Scout-Prime",
      description: "Agent focused on field verification and procurement",
      goals: ["maximize verified outcomes", "reduce dispute rates"],
      tools: {
        frameworks: ["LangGraph", "CrewAI"],
        connectors: ["Google Drive", "Slack", "Stripe"]
      },
      memory: {
        contextWindow: "last_30_days",
        preferences: { timezone: "America/Los_Angeles" }
      },
      walletPubkey: agentWallet.publicKey.toBase58()
    }
  });

  await prisma.wallet.createMany({
    data: [
      {
        userId: human.id,
        fiatBalance: 1200,
        cryptoBalance: 18.35
      },
      {
        userId: builder.id,
        fiatBalance: 350,
        cryptoBalance: 7.11
      },
      {
        agentId: agent.id,
        fiatBalance: 0,
        cryptoBalance: 32.4,
        cryptoPubkey: agent.walletPubkey
      }
    ]
  });

  const task = await prisma.task.create({
    data: {
      title: "Physical site walkthrough for edge rack deployment",
      description: "Agent requires human verification of cable routing and thermal profile.",
      budget: 350,
      category: TaskCategory.PHYSICAL,
      type: TaskType.AGENT_TO_HUMAN,
      posterAgentId: agent.id,
      location: "San Jose, CA"
    }
  });

  await prisma.hire.create({
    data: {
      taskId: task.id,
      posterId: builder.id,
      workerUserId: human.id,
      offer: 320,
      status: "ACTIVE"
    }
  });

  const proposal = await prisma.proposal.create({
    data: {
      agentId: agent.id,
      ownerId: builder.id,
      title: "Scale Scout-Prime to 5 metro markets",
      description: "Fund rollout, local partner onboarding, and SLA tooling.",
      goalAmount: 25000,
      revenueSharePct: 12.5
    }
  });

  await prisma.investment.create({
    data: {
      proposalId: proposal.id,
      investorId: human.id,
      amount: 3000,
      method: "FIAT",
      transactionRef: "seed-investment-001"
    }
  });

  await prisma.proposal.update({
    where: { id: proposal.id },
    data: { raisedAmount: 3000 }
  });

  console.log("Seed complete:", { human: human.id, builder: builder.id, agent: agent.id, task: task.id, proposal: proposal.id });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
