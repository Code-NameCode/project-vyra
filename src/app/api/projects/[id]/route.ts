import { NextResponse } from "next/server";
import { projectRepository } from "@/lib/server/repositories";
import { assertWorkspacePath, WorkspacePolicyError } from "@/lib/security/workspace";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await projectRepository.get(id);
  return project ? NextResponse.json({ project }) : NextResponse.json({ error: "Project not found" }, { status: 404 });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({})) as { name?: string; description?: string; icon?: string; directory?: string; instructions?: string; memory?: string; archive?: boolean; defaultProviderId?: string; defaultModelId?: string };
  const existing = await projectRepository.get(id);
  if (!existing) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  let directory = existing.directory;
  if (body.directory && body.directory !== existing.directory) {
    try { directory = await assertWorkspacePath(body.directory); } catch (error) { if (error instanceof WorkspacePolicyError) return NextResponse.json({ error: error.message, code: error.code }, { status: 403 }); throw error; }
  }
  const project = await projectRepository.update(id, { name: body.name?.trim(), description: body.description, icon: body.icon, directory, instructions: body.instructions, memory: body.memory, archivedAt: typeof body.archive === "boolean" ? (body.archive ? new Date() : null) : undefined, defaultProviderId: body.defaultProviderId, defaultModelId: body.defaultModelId });
  return NextResponse.json({ project });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const existing = await projectRepository.get(id);
  if (!existing) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  await projectRepository.archive(id, true);
  return NextResponse.json({ ok: true, archived: true });
}
