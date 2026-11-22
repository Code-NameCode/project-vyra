import { NextResponse } from "next/server";
import { executionRepository, profileRepository, projectRepository } from "@/lib/server/repositories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await profileRepository.getOrCreate(process.env.VYRA_WORKSPACE_ROOT || process.cwd());
  if (!await projectRepository.getForProfile(id, profile.id)) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  const url = new URL(req.url);
  const skip = Math.max(0, Number(url.searchParams.get("skip") || 0));
  const take = Math.min(100, Math.max(1, Number(url.searchParams.get("take") || 50)));
  const executions = await executionRepository.list(profile.id, skip, take, { projectId: id, status: url.searchParams.get("status") || undefined });
  return NextResponse.json({ executions, nextCursor: executions.length === take ? String(skip + take) : null });
}
