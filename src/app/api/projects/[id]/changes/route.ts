import { NextResponse } from "next/server";
import { fileChangeRepository, profileRepository, projectRepository } from "@/lib/server/repositories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await profileRepository.getOrCreate(process.env.VYRA_WORKSPACE_ROOT || process.cwd());
  if (!await projectRepository.getForProfile(id, profile.id)) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  const url = new URL(req.url);
  const skip = Math.max(0, Number(url.searchParams.get("skip") || 0));
  const take = Math.min(200, Math.max(1, Number(url.searchParams.get("take") || 100)));
  const changes = await fileChangeRepository.listForProject(id, skip, take);
  return NextResponse.json({ changes, nextCursor: changes.length === take ? String(skip + take) : null });
}
