import { NextResponse } from "next/server";
import { fileChangeRepository } from "@/lib/server/repositories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const change = await fileChangeRepository.get(id);
  return change ? NextResponse.json({ change }) : NextResponse.json({ error: "File change not found" }, { status: 404 });
}
