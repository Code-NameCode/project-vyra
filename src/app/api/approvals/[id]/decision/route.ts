import { NextResponse } from "next/server";
import { getApproval, resolveApproval } from "@/lib/security/approvals";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({})) as { decision?: "approved" | "rejected" };
  if (body.decision !== "approved" && body.decision !== "rejected") return NextResponse.json({ error: "decision must be approved or rejected" }, { status: 400 });
  if (!await getApproval(id)) return NextResponse.json({ error: "Approval not found" }, { status: 404 });
  const approval = await resolveApproval(id, body.decision);
  return approval ? NextResponse.json({ approval }) : NextResponse.json({ error: "Approval is no longer pending" }, { status: 409 });
}
