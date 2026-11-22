import { NextResponse } from "next/server";
import { deleteCredential, listCredentialIds, setCredential } from "@/lib/server/credential-vault";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try { return NextResponse.json({ providers: await listCredentialIds() }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Credential vault unavailable" }, { status: 503 }); }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({})) as { providerId?: string; apiKey?: string };
  if (!body.providerId || !body.apiKey) return NextResponse.json({ error: "providerId and apiKey are required" }, { status: 400 });
  try { await setCredential(body.providerId, body.apiKey); return NextResponse.json({ ok: true, providerId: body.providerId }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Credential vault unavailable" }, { status: 503 }); }
}

export async function DELETE(req: Request) {
  const body = await req.json().catch(() => ({})) as { providerId?: string };
  if (!body.providerId) return NextResponse.json({ error: "providerId is required" }, { status: 400 });
  try { await deleteCredential(body.providerId); return NextResponse.json({ ok: true }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Credential vault unavailable" }, { status: 503 }); }
}
