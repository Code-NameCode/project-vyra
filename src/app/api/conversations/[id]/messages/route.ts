import { NextResponse } from "next/server";
import { conversationRepository } from "@/lib/server/repositories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(req.url);
  const skip = Math.max(0, Number(url.searchParams.get("skip") || 0));
  const take = Math.min(200, Math.max(1, Number(url.searchParams.get("take") || 100)));
  const messages = await conversationRepository.messages(id, skip, take);
  return NextResponse.json({ messages, nextCursor: messages.length === take ? String(skip + take) : null });
}
