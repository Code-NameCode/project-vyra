import { NextResponse } from "next/server";
import { getApproval, listApprovals, resolveApproval } from "@/lib/security/approvals";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ approvals: await listApprovals() });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { id?: string; decision?: "approved" | "rejected" };
  if (!body.id || !body.decision) return NextResponse.json({ error: "id and decision are required" }, { status: 400 });
  const current = await getApproval(body.id);
  if (!current) return NextResponse.json({ error: "Approval not found" }, { status: 404 });
  const result = await resolveApproval(body.id, body.decision);
  if (!result) return NextResponse.json({ error: "Approval is no longer pending" }, { status: 409 });
  return NextResponse.json({ approval: result });
}
