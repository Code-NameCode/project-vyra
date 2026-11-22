import { NextRequest } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { getCredential } from "@/lib/server/credential-vault";
import { streamProvider, type ProviderConfig, type ProviderEvent, type ProviderKind, type ProviderMessage } from "@/lib/server/providers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface InMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface ChatRequestBody {
  mode?: "code" | "chat";
  buildMode?: "plan" | "build";
  model?: string;
  providerType?: string;
  providerId?: string;
  messages: InMessage[];
  baseUrl?: string;
  useRealApi?: boolean;
  agentInstructions?: string;
  projectRules?: string;
  skills?: string[];
  skillsFolderPath?: string;
  agentId?: string;
}

interface SkillFile {
  name: string;
  description?: string;
  content: string;
}

function parseFrontmatter(content: string): { name?: string; description?: string } {
  const m = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!m) return {};
  const block = m[1];
  const get = (key: string) => {
    const r = block.match(new RegExp(`^${key}:\\s*(.+)$`, "m"));
    return r ? r[1].trim().replace(/^["']|["']$/g, "") : undefined;
  };
  return { name: get("name"), description: get("description") };
}

async function collectSkillFiles(dir: string, out: SkillFile[]): Promise<void> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = entries.filter((e) => e.isFile() && /\.(md|txt)$/i.test(e.name));
  if (files.length > 0) {
    const contents = await Promise.all(
      files.map((e) => fs.readFile(path.join(dir, e.name), "utf8"))
    );
    const fm = parseFrontmatter(contents[0]);
    const description =
      fm.description ||
      contents[0]
        .replace(/^---[\s\S]*?---\s*/, "")
        .split("\n")
        .find((l) => l.trim())
        ?.trim()
        .slice(0, 120);
    out.push({
      name: fm.name || path.basename(dir),
      description,
      content: contents.join("\n\n"),
    });
  }
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    await collectSkillFiles(path.join(dir, e.name), out);
  }
}

async function readSkillsFolder(folder?: string): Promise<SkillFile[]> {
  if (!folder || !folder.trim()) return [];
  try {
    const out: SkillFile[] = [];
    await collectSkillFiles(folder, out);
    return out;
  } catch {
    return [];
  }
}

const encoder = new TextEncoder();

function encodeSSE(data: unknown): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

/** Map a shared ProviderEvent onto the /api/chat SSE contract. */
function mapEvent(event: ProviderEvent): string | null {
  switch (event.type) {
    case "text":
      return encodeSSE({ type: "token", text: event.text });
    case "thinking":
      return encodeSSE({ type: "thinking", text: event.text });
    case "usage":
      return encodeSSE({ type: "usage", inputTokens: event.inputTokens, outputTokens: event.outputTokens });
    // Native tool calls are parsed by the shared layer for parity across
    // transports, but plain chat never executes tools — that is the
    // execution transport's job.
    case "tool_call":
      return null;
    case "error":
      return encodeSSE({ type: "error", code: "STREAM_ERROR", message: "Stream interrupted." });
  }
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as ChatRequestBody;
  const messages = body.messages ?? [];
  const signal = req.signal;

  const skillFiles = await readSkillsFolder(body.skillsFolderPath);

  const providerType = body.providerType;
  let serverApiKey: string | null = null;
  if (body.providerId) {
    try {
      serverApiKey = await getCredential(body.providerId);
    } catch (error) {
      // The vault only throws when VYRA_CREDENTIAL_KEY is unset/corrupt — a
      // configuration problem that must not masquerade as "no provider".
      return new Response(
        JSON.stringify({
          error: {
            code: "CREDENTIAL_VAULT_ERROR",
            message: `Credential vault unavailable: ${error instanceof Error ? error.message : "unknown error"}. Set VYRA_CREDENTIAL_KEY and restart the server.`,
          },
        }),
        { status: 503, headers: { "Content-Type": "application/json" } }
      );
    }
  }
  const wantsReal = body.useRealApi && !!body.baseUrl && (!!serverApiKey || providerType === "ollama");

  if (!wantsReal) {
    return new Response(
      JSON.stringify({
        error: {
          code: "NO_PROVIDER_CONFIGURED",
          message:
            "No LLM provider is configured. Add a provider in Settings and enable Use real API, or select an Ollama model.",
        },
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const systemParts = [
      body.agentInstructions,
      body.projectRules ? `# Project rules\n${body.projectRules}` : undefined,
      skillFiles.length
        ? `# Available skills (from ${body.skillsFolderPath})\n\n${skillFiles
            .map(
              (s) => `- **${s.name}**${s.description ? `: ${s.description}` : ""}`
            )
            .join("\n")}`
        : undefined,
      skillFiles.filter((s) => (body.skills ?? []).includes(s.name)).length
        ? `# Activated skill instructions\n\n${skillFiles
            .filter((s) => (body.skills ?? []).includes(s.name))
            .map((s) => `## Skill: ${s.name}\n\n${s.content}`)
            .join("\n\n---\n\n")}`
        : undefined,
      body.buildMode === "plan"
        ? "You are in PLAN mode: propose a clear, step-by-step plan. Do NOT edit files or run commands. Outline the approach, the files you'd touch, and the order of work."
        : undefined,
    ].filter(Boolean) as string[];

    const kind = (providerType ?? "custom") as ProviderKind;
    const config: ProviderConfig = {
      // The key is resolved from the server-side vault above and handed to the
      // shared layer directly; client-supplied keys are never accepted here.
      type: kind,
      baseUrl: body.baseUrl || "",
      model: body.model || (kind === "anthropic" ? "claude-3-5-sonnet-latest" : "gpt-4o-mini"),
      apiKey: serverApiKey ?? undefined,
    };
    const providerMessages: ProviderMessage[] = [
      ...systemParts.map((content) => ({ role: "system" as const, content })),
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    // Plain chat sends no tools (the execution transport owns tool execution),
    // but thinking, usage, and stray native tool-call deltas are parsed by the
    // shared layer exactly as the execution path sees them.
    const iterator = streamProvider(config, providerMessages, [], signal);

    // Pull the first event before responding: streamProvider is lazy, so this
    // is when the upstream fetch happens. Connection/auth failures keep the
    // historical JSON 502 contract instead of a 200 SSE stream that errors.
    const first = await iterator.next();
    if (!first.done && first.value.type === "error") {
      const status = Number((/^Provider returned (\d+)/.exec(first.value.message) || [])[1] || 0) || 502;
      return new Response(
        JSON.stringify({
          error: {
            code: `UPSTREAM_${status}`,
            message: first.value.message,
          },
        }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const write = (chunk: string) => controller.enqueue(encoder.encode(chunk));
        try {
          if (!first.done) {
            const mapped = mapEvent(first.value);
            if (mapped) write(mapped);
            for await (const event of iterator) {
              const mapped = mapEvent(event);
              if (mapped) write(mapped);
            }
          }
          write(encodeSSE({ type: "done" }));
        } catch (e) {
          // Client disconnects abort the upstream fetch; swallow those like a
          // normal disconnect instead of reporting a stream error.
          if (!(e instanceof DOMException && e.name === "AbortError")) {
            write(encodeSSE({ type: "error", code: "STREAM_ERROR", message: "Stream interrupted." }));
            write(encodeSSE({ type: "done" }));
          }
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown upstream error";
    return new Response(
      JSON.stringify({
        error: { code: "UPSTREAM_ERROR", message },
      }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }
}
