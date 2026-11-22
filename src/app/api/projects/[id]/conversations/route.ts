import { NextResponse } from "next/server";
import { uid } from "@/lib/id";
import { conversationRepository, profileRepository, projectRepository } from "@/lib/server/repositories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await profileRepository.getOrCreate(process.env.VYRA_WORKSPACE_ROOT || process.cwd());
  if (!await projectRepository.getForProfile(id, profile.id)) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  const url = new URL(req.url);
  return NextResponse.json({ conversations: await conversationRepository.list(id, Number(url.searchParams.get("skip") || 0), Math.min(100, Number(url.searchParams.get("take") || 50))) });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params;
  const profile = await profileRepository.getOrCreate(process.env.VYRA_WORKSPACE_ROOT || process.cwd());
  if (!await projectRepository.getForProfile(projectId, profile.id)) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  const body = await req.json().catch(() => ({})) as { id?: string; title?: string; titleSource?: string; modelId?: string; messages?: { id?: string; role: string; content: string; createdAt?: number }[] };
  const conversationId = body.id || uid("conversation");
  const conversation = await conversationRepository.upsert({ id: conversationId, projectId, title: body.title || "", titleSource: body.titleSource || "auto", modelId: body.modelId || "" });
  for (const message of body.messages || []) await conversationRepository.appendMessage({ id: message.id || uid("message"), conversationId, role: message.role, content: message.content, createdAt: message.createdAt ? new Date(message.createdAt) : undefined });
  return NextResponse.json({ conversation: await conversationRepository.get(conversationId) }, { status: 201 });
}
