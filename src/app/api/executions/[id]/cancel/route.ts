import { NextResponse } from "next/server";
import { cancelExecution } from "@/lib/agent/execution-manager";

export const runtime = "nodejs";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cancelled = await cancelExecution(id);
  return NextResponse.json({ cancelled }, { status: cancelled ? 200 : 404 });
}
