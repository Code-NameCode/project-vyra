import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Fetch the available models for a connected provider.
 *
 * Query params:
 *  - baseUrl: the provider base URL (e.g. https://api.openai.com/v1)
 *  - apiKey: the provider API key (omitted for ollama)
 *  - type: 'openai' | 'anthropic' | 'ollama' | 'custom'
 *
 * Returns { models: string[], detected: boolean, error: string | null }.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const baseUrl = (url.searchParams.get("baseUrl") || "").replace(/\/$/, "");
  const apiKey = url.searchParams.get("apiKey") || "";
  const type = url.searchParams.get("type") || "openai";

  if (!baseUrl) {
    return NextResponse.json(
      { models: [], detected: false, error: "Missing baseUrl" },
      { status: 200 }
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    let fetchUrl: string;
    let headers: Record<string, string>;
    let extract: (data: unknown) => string[];

    if (type === "ollama") {
      fetchUrl = `${baseUrl}/api/tags`;
      headers = { Accept: "application/json" };
      extract = (data) => {
        const arr = (data as { models?: { name?: string }[] }).models;
        return Array.isArray(arr)
          ? arr
              .map((m) => m.name)
              .filter((n): n is string => typeof n === "string")
          : [];
      };
    } else if (type === "anthropic") {
      fetchUrl = `${baseUrl}/models?limit=100`;
      headers = {
        Accept: "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      };
      extract = (data) => {
        const arr = (data as { data?: { id?: string }[] }).data;
        return Array.isArray(arr)
          ? arr
              .map((m) => m.id)
              .filter((n): n is string => typeof n === "string")
          : [];
      };
    } else {
      // openai-compatible (openai, mistral, openrouter, groq, z.ai, deepseek, custom)
      fetchUrl = `${baseUrl}/models`;
      headers = {
        Accept: "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      };
      extract = (data) => {
        const arr = (data as { data?: { id?: string }[] }).data;
        return Array.isArray(arr)
          ? arr
              .map((m) => m.id)
              .filter((n): n is string => typeof n === "string")
          : [];
      };
    }

    const res = await fetch(fetchUrl, {
      signal: controller.signal,
      headers,
    });
    clearTimeout(timeout);
    if (!res.ok) {
      return NextResponse.json(
        {
          models: [],
          detected: false,
          error: `Provider responded ${res.status}`,
        },
        { status: 200 }
      );
    }
    const data = await res.json();
    const models = extract(data);
    return NextResponse.json({
      models,
      detected: true,
      error: null,
    });
  } catch {
    clearTimeout(timeout);
    return NextResponse.json(
      {
        models: [],
        detected: false,
        error: "Provider not reachable. Check the base URL and API key.",
      },
      { status: 200 }
    );
  }
}
