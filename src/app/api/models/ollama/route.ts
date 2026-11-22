import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Probes a local Ollama server (default http://localhost:11434) for installed
 * models. Returns the list of model names so the workspace can surface them as
 * detected models. If Ollama isn't running or is unreachable, returns an empty
 * list with detected:false.
 *
 * Accepts an optional `?baseUrl=...` query to probe a non-default host.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const baseUrl = (
    url.searchParams.get("baseUrl") ||
    "http://localhost:11434"
  ).replace(/\/$/, "");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2500);
  try {
    const res = await fetch(`${baseUrl}/api/tags`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    clearTimeout(timeout);
    if (!res.ok) {
      return NextResponse.json(
        { detected: false, models: [], error: `Ollama responded ${res.status}` },
        { status: 200 }
      );
    }
    const data = (await res.json()) as { models?: { name: string }[] };
    const models = Array.isArray(data.models)
      ? data.models.map((m) => m.name).filter(Boolean)
      : [];
    return NextResponse.json({ detected: true, models, error: null });
  } catch {
    clearTimeout(timeout);
    return NextResponse.json(
      {
        detected: false,
        models: [],
        error: "Ollama not reachable. Is `ollama serve` running?",
      },
      { status: 200 }
    );
  }
}
