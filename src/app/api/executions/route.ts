import { NextResponse } from "next/server";
import { createExecution } from "@/lib/agent/execution-manager";
import { executionRepository, profileRepository } from "@/lib/server/repositories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const profile = await profileRepository.getOrCreate(process.env.VYRA_WORKSPACE_ROOT || process.cwd());
  const executions = await executionRepository.list(profile.id, Number(url.searchParams.get("skip") || 0), Math.min(100, Number(url.searchParams.get("take") || 50)));
  return NextResponse.json({ executions });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null) as { request?: string; modelId?: string; projectId?: string; conversationId?: string; profileId?: string; toolCall?: { tool: string; input: Record<string, unknown>; approvalId?: string } } | null;
  if (!body?.request?.trim()) return NextResponse.json({ error: "request is required" }, { status: 400 });
  try {
    const execution = await createExecution(body as Parameters<typeof createExecution>[0]);
    return NextResponse.json({ execution }, { status: 202 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create execution" }, { status: 500 });
  }
}
