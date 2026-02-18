import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/http";

const schema = z.object({
  hireId: z.string()
});

export async function POST(request: NextRequest) {
  const limited = await enforceRateLimit(request, "release-payment");
  if (limited) {
    return limited;
  }

  try {
    const payload = schema.parse(await request.json());
    const platformFeeBps = Number(process.env.PLATFORM_FEE_BPS ?? 800);

    const hire = await prisma.hire.findUnique({
      where: { id: payload.hireId },
      include: {
        task: true,
        workerUser: { include: { wallet: true } },
        workerAgent: { include: { wallet: true } }
      }
    });

    if (!hire || hire.status !== "ACTIVE") {
      return NextResponse.json({ error: "Hire not active" }, { status: 400 });
    }

    const gross = Number(hire.offer);
    const fee = (gross * platformFeeBps) / 10000;
    const net = Math.max(0, gross - fee);

    await prisma.$transaction(async (tx) => {
      await tx.hire.update({
        where: { id: hire.id },
        data: {
          status: "COMPLETED"
        }
      });

      await tx.task.update({
        where: { id: hire.taskId },
        data: { status: "COMPLETED" }
      });

      if (hire.workerUser?.wallet?.id) {
        await tx.wallet.update({
          where: { id: hire.workerUser.wallet.id },
          data: {
            fiatBalance: { increment: net },
            transactions: {
              create: {
                amount: net,
                direction: "CREDIT",
                method: "FIAT",
                reference: `hire-${hire.id}`
              }
            }
          }
        });
      } else if (hire.workerAgent?.wallet?.id) {
        await tx.wallet.update({
          where: { id: hire.workerAgent.wallet.id },
          data: {
            fiatBalance: { increment: net },
            transactions: {
              create: {
                amount: net,
                direction: "CREDIT",
                method: "FIAT",
                reference: `hire-${hire.id}`
              }
            }
          }
        });
      }
    });

    return NextResponse.json({ hireId: hire.id, netPaid: net, feeCharged: fee });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
