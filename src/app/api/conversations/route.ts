import { NextResponse } from "next/server";
import { conversationRepository, profileRepository } from "@/lib/server/repositories";
import { uid } from "@/lib/id";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const profile = await profileRepository.getOrCreate(process.env.VYRA_WORKSPACE_ROOT || process.cwd());
  const skip = Math.max(0, Number(url.searchParams.get("skip") || 0));
  const take = Math.min(100, Math.max(1, Number(url.searchParams.get("take") || 50)));
  const projectId = url.searchParams.get("projectId") || undefined;
  const query = url.searchParams.get("query") || undefined;
  const includeArchived = url.searchParams.get("includeArchived") === "true";
  const sort = url.searchParams.get("sort") === "created" ? "created" : "recent";
  const conversations = await conversationRepository.listAll(profile.id, skip, take, { projectId, query, includeArchived, sort });
  return NextResponse.json({ conversations, nextCursor: conversations.length === take ? String(skip + take) : null });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({})) as { id?: string; projectId?: string; title?: string; modelId?: string; titleSource?: string; messages?: { id?: string; role: string; content: string; createdAt?: number }[] };
  try {
    const conversationId = body.id || uid("conversation");
    const conversation = await conversationRepository.upsert({ id: conversationId, projectId: body.projectId, title: body.title || "", titleSource: body.titleSource || "auto", modelId: body.modelId || "" });
    for (const message of body.messages || []) await conversationRepository.appendMessage({ id: message.id || uid("message"), conversationId, role: message.role, content: message.content, createdAt: message.createdAt ? new Date(message.createdAt) : undefined });
    return NextResponse.json({ conversation: await conversationRepository.get(conversationId) }, { status: 201 });
  } catch (error) {
    console.error("Failed to persist conversation:", error);
    return NextResponse.json({ error: "Failed to persist conversation" }, { status: 500 });
  }
}
