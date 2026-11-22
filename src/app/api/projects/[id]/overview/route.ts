import { NextResponse } from "next/server";
import { profileRepository, projectRepository } from "@/lib/server/repositories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await profileRepository.getOrCreate(process.env.VYRA_WORKSPACE_ROOT || process.cwd());
  const limit = Math.min(50, Math.max(1, Number(new URL(req.url).searchParams.get("limit") || 10)));
  const overview = await projectRepository.overview(id, profile.id, limit);
  return overview ? NextResponse.json(overview) : NextResponse.json({ error: "Project not found" }, { status: 404 });
}
