import { NextResponse } from "next/server";
import { getCredential } from "@/lib/server/credential-vault";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Fetch the available models for a connected provider.
 *
 * Query params:
 *  - baseUrl: the provider base URL (e.g. https://api.openai.com/v1)
 *  - apiKey: the provider API key (omitted for ollama)
 *  - type: 'openai' | 'anthropic' | 'ollama' | 'custom'
 *  - providerId / providerName: optional, used to detect special providers
 *
 * Returns { models: string[], detected: boolean, error: string | null }.
 */

/** Models included in the Z.ai GLM Coding Plan. */
const ZAI_CODING_MODELS = ["glm-5.3", "glm-5.3-flash"];

function isZaiProvider(
  baseUrl: string,
  providerId: string,
  providerName: string
): boolean {
  const identity = `${baseUrl} ${providerId} ${providerName}`.toLowerCase();
  return (
    identity.includes("z.ai") ||
    identity.includes("zai") ||
    identity.includes("xzai") ||
    identity.includes("glm")
  );
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const baseUrl = (url.searchParams.get("baseUrl") || "").replace(/\/$/, "");
  const providerId = url.searchParams.get("providerId") || "";
  const apiKey = providerId ? (await getCredential(providerId).catch(() => null)) || "" : "";
  const type = url.searchParams.get("type") || "openai";
  const providerName = url.searchParams.get("providerName") || "";

  if (!baseUrl) {
    return NextResponse.json(
      { models: [], detected: false, error: "Missing baseUrl" },
      { status: 200 }
    );
  }

  const zai = isZaiProvider(baseUrl, providerId, providerName);

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
      // Z.ai's coding-plan endpoint may not expose /models; the plan's model
      // set is known, so return those instead of an error.
      if (zai) {
        return NextResponse.json({
          models: ZAI_CODING_MODELS,
          detected: true,
          error: null,
        });
      }
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
    let models = extract(data);

    if (zai) {
      // Only surface the two models the coding plan actually grants access to.
      const keep = (n: string) => /glm[-_]?5\.3/i.test(n);
      const found = models.filter(keep);
      // Normalize to the exact documented ids.
      models = ZAI_CODING_MODELS.filter(
        (id) =>
          found.length === 0 ||
          found.some((f) => f.toLowerCase().includes(id.split("-")[1]))
      );
      if (models.length === 0) models = ZAI_CODING_MODELS;
    }

    return NextResponse.json({
      models,
      detected: true,
      error: null,
    });
  } catch {
    clearTimeout(timeout);
    if (zai) {
      return NextResponse.json({
        models: ZAI_CODING_MODELS,
        detected: true,
        error: null,
      });
    }
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
