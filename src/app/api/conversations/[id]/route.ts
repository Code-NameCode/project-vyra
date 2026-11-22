import { NextResponse } from "next/server";
import { conversationRepository } from "@/lib/server/repositories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const conversation = await conversationRepository.get(id);
  return conversation ? NextResponse.json({ conversation }) : NextResponse.json({ error: "Conversation not found" }, { status: 404 });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({})) as { title?: string; pin?: boolean; archive?: boolean };
  const existing = await conversationRepository.get(id);
  if (!existing) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  const data: Record<string, unknown> = {};
  if (typeof body.title === "string") { data.title = body.title.trim(); data.titleSource = "manual"; }
  if (typeof body.pin === "boolean") data.pinnedAt = body.pin ? new Date() : null;
  if (typeof body.archive === "boolean") data.archivedAt = body.archive ? new Date() : null;
  const conversation = await conversationRepository.update(id, data);
  return NextResponse.json({ conversation });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const existing = await conversationRepository.get(id);
  if (!existing) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  await conversationRepository.remove(id);
  return NextResponse.json({ ok: true });
}
