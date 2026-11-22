import { NextResponse } from "next/server";
import { uid } from "@/lib/id";
import { profileRepository, projectRepository } from "@/lib/server/repositories";
import { assertWorkspacePath, WorkspacePolicyError } from "@/lib/security/workspace";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const profile = await profileRepository.getOrCreate(process.env.VYRA_WORKSPACE_ROOT || process.cwd());
  const skip = Math.max(0, Number(url.searchParams.get("skip") || 0));
  const take = Math.min(100, Math.max(1, Number(url.searchParams.get("take") || 50)));
  const projects = await projectRepository.list(profile.id, skip, take, { query: url.searchParams.get("query") || undefined, includeArchived: url.searchParams.get("includeArchived") === "true", sort: url.searchParams.get("sort") === "created" ? "created" : "recent" });
  return NextResponse.json({ projects, nextCursor: projects.length === take ? String(skip + take) : null });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({})) as { id?: string; name?: string; description?: string; icon?: string; directory?: string; instructions?: string; memory?: string; profileId?: string; defaultProviderId?: string; defaultModelId?: string };
  if (!body.name?.trim() || !body.directory?.trim()) return NextResponse.json({ error: "name and directory are required" }, { status: 400 });
  const profile = await profileRepository.getOrCreate(process.env.VYRA_WORKSPACE_ROOT || process.cwd());
  let directory: string;
  try {
    directory = await assertWorkspacePath(body.directory);
  } catch (error) {
    if (error instanceof WorkspacePolicyError) return NextResponse.json({ error: error.message, code: error.code }, { status: 403 });
    throw error;
  }
  const project = await projectRepository.upsert({ id: body.id || uid("project"), profileId: profile.id, name: body.name.trim(), description: body.description || "", icon: body.icon || "folder", directory, instructions: body.instructions || "", memory: body.memory || "", defaultProviderId: body.defaultProviderId, defaultModelId: body.defaultModelId });
  return NextResponse.json({ project }, { status: 201 });
}
