import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { uploadProof } from "@/lib/storage";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/http";

const schema = z.object({
  hireId: z.string(),
  fileBase64: z.string().min(20)
});

export async function POST(request: NextRequest) {
  const limited = await enforceRateLimit(request, "hire-proof");
  if (limited) {
    return limited;
  }

  try {
    const payload = schema.parse(await request.json());
    const objectPath = `hire-proof/${payload.hireId}/${Date.now()}.bin`;
    const proofUrl = await uploadProof(payload.fileBase64, objectPath);

    const hire = await prisma.hire.update({
      where: { id: payload.hireId },
      data: { proofUrl }
    });

    return NextResponse.json({ hire }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
