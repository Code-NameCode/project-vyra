import { NextResponse } from "next/server";
import { executionRepository } from "@/lib/server/repositories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const execution = await executionRepository.get(id);
  return execution ? NextResponse.json({ execution }) : NextResponse.json({ error: "Execution not found" }, { status: 404 });
}
