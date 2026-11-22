import { NextResponse } from "next/server";
import { resumeExecution } from "@/lib/agent/execution-manager";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({})) as { approvalId?: string };
  if (!body.approvalId) return NextResponse.json({ error: "approvalId is required" }, { status: 400 });
  const resumed = await resumeExecution(id, body.approvalId);
  return NextResponse.json({ resumed }, { status: resumed ? 200 : 409 });
}
