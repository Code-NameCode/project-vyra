import { NextResponse } from "next/server";
import { databaseHealth } from "@/lib/server/repositories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const database = await databaseHealth();
  return NextResponse.json({ ok: database.ok, database }, { status: database.ok ? 200 : 503 });
}
