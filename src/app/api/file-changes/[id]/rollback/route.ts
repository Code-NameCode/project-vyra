import { NextResponse } from "next/server";
import { fileChangeRepository } from "@/lib/server/repositories";
import { rollbackFileChange, FileConflictError } from "@/lib/server/file-transactions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const change = await fileChangeRepository.get(id);
  if (!change) return NextResponse.json({ error: "File change not found" }, { status: 404 });
  try {
    const transaction = await rollbackFileChange(change);
    await fileChangeRepository.updateStatus(id, "rolled_back");
    return NextResponse.json({ ok: true, transaction });
  } catch (error) {
    if (error instanceof FileConflictError) return NextResponse.json({ ok: false, code: error.code, error: error.message }, { status: 409 });
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Rollback failed" }, { status: 400 });
  }
}
