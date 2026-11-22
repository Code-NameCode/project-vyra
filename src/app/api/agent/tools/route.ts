import { NextResponse } from "next/server";
import { executeTool, TOOL_REGISTRY } from "@/lib/agent/tools";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ tools: Object.values(TOOL_REGISTRY).map(({ execute: _execute, ...definition }) => definition) });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || typeof body.tool !== "string" || !body.input || typeof body.input !== "object") {
    return NextResponse.json({ error: "tool and input are required" }, { status: 400 });
  }
  const result = await executeTool({ tool: body.tool, input: body.input as Record<string, unknown>, approvalId: typeof body.approvalId === "string" ? body.approvalId : undefined });
  return NextResponse.json(result, { status: result.requiresApproval ? 202 : result.ok ? 200 : 400 });
}
