import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const [users, agents, openTasks, completedHires, disputedHires, investments, proposals] = await Promise.all([
    prisma.user.count(),
    prisma.agent.count(),
    prisma.task.count({ where: { status: "OPEN" } }),
    prisma.hire.count({ where: { status: "COMPLETED" } }),
    prisma.hire.count({ where: { status: "DISPUTED" } }),
    prisma.investment.aggregate({ _sum: { amount: true } }),
    prisma.proposal.aggregate({ _sum: { raisedAmount: true } })
  ]);

  return NextResponse.json({
    users,
    agents,
    openTasks,
    completedHires,
    disputedHires,
    investedCapital: Number(investments._sum.amount ?? 0),
    raisedCapital: Number(proposals._sum.raisedAmount ?? 0)
  });
}
