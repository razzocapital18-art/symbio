import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { uploadProof } from "@/lib/storage";
import { enforceRateLimit } from "@/lib/http";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

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
    const supabase = getSupabaseAdminClient();
    const payload = schema.parse(await request.json());
    const objectPath = `hire-proof/${payload.hireId}/${Date.now()}.bin`;
    const proofUrl = await uploadProof(payload.fileBase64, objectPath);

    const hireResult = await supabase
      .from("Hire")
      .update({ proofUrl } as never)
      .eq("id", payload.hireId);

    if (hireResult.error) {
      return NextResponse.json({ error: hireResult.error?.message ?? "Failed to attach proof" }, { status: 400 });
    }

    const hireLookup = await supabase
      .from("Hire")
      .select("id,taskId,status,proofUrl,updatedAt")
      .eq("id", payload.hireId)
      .maybeSingle();

    if (hireLookup.error || !hireLookup.data) {
      return NextResponse.json({ error: hireLookup.error?.message ?? "Failed to load updated hire" }, { status: 400 });
    }

    return NextResponse.json({ hire: hireLookup.data }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
