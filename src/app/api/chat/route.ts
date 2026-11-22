import { NextRequest } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { getCredential } from "@/lib/server/credential-vault";

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
  apiKey?: string;
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

const AGENT_NAMES: Record<string, string> = {
  codex: "Codex",
  cline: "Cline",
  opencode: "OpenCode",
  kilocode: "KiloCode",
  pi: "Pi",
  zcode: "ZCode",
  hermes: "Hermes",
  omipy: "OmiPy",
};

function buildContextLine(agentId?: string, skills?: string[]): string {
  const parts: string[] = [];
  if (agentId) {
    const name = AGENT_NAMES[agentId] ?? agentId;
    parts.push(`Running with **${name}**`);
  }
  if (skills && skills.length) {
    parts.push(`skills: ${skills.map((s) => `\`/${s}\``).join(", ")}`);
  }
  return parts.length ? `_${parts.join(" · ")}_` : "";
}

function encodeSSE(data: unknown): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

/** Z.ai GLM Coding Plan requires thinking enabled for GLM-5.3 models. */
function isZaiCodingEndpoint(baseUrl: string): boolean {
  const s = baseUrl.toLowerCase();
  return s.includes("z.ai") || s.includes("glm");
}

const encoder = new TextEncoder();

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as ChatRequestBody;
  const mode = body.mode ?? "code";
  const messages = body.messages ?? [];
  const signal = req.signal;

  const skillFiles = await readSkillsFolder(body.skillsFolderPath);
  const skillNames = Array.from(
    new Set([...(body.skills ?? []), ...skillFiles.map((s) => s.name)])
  );

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

    const base = (body.baseUrl || "").replace(/\/$/, "");
    let upstreamUrl: string;
    let headers: Record<string, string>;
    let reqBody: string;

    if (providerType === "anthropic") {
      upstreamUrl = `${base}/messages`;
      headers = {
        "Content-Type": "application/json",
        "x-api-key": serverApiKey || "",
        "anthropic-version": "2023-06-01",
      };
      reqBody = JSON.stringify({
        model: body.model ?? "claude-3-5-sonnet-latest",
        max_tokens: 2048,
        stream: true,
        system: systemParts.join("\n\n"),
        messages: messages.map((m) => ({
          role: m.role === "system" ? "user" : m.role,
          content: m.content,
        })),
      });
    } else {
      const chatPath =
        providerType === "ollama" ? "/v1/chat/completions" : "/chat/completions";
      upstreamUrl = `${base}${chatPath}`;
      headers = {
        "Content-Type": "application/json",
        ...(serverApiKey ? { Authorization: `Bearer ${serverApiKey}` } : {}),
      };
      reqBody = JSON.stringify({
        model: body.model ?? "gpt-4o-mini",
        stream: true,
        messages: [
          ...systemParts.map((content) => ({ role: "system", content })),
          ...messages,
        ],
        ...(isZaiCodingEndpoint(base)
          ? {
              temperature: 1.0,
              thinking: { type: "enabled" },
              reasoning_effort: "max",
            }
          : {}),
      });
    }

    const upstream = await fetch(upstreamUrl, {
      method: "POST",
      headers,
      body: reqBody,
      signal,
    });

    if (!upstream.ok || !upstream.body) {
      let detail = "";
      try {
        detail = await upstream.text();
      } catch {
        detail = "";
      }
      return new Response(
        JSON.stringify({
          error: {
            code: `UPSTREAM_${upstream.status}`,
            message: `Provider returned ${upstream.status} ${upstream.statusText}${
              detail ? `: ${detail.slice(0, 300)}` : ""
            }`,
          },
        }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const reader = upstream.body!.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buf += decoder.decode(value, { stream: true });
            let idx: number;
            while ((idx = buf.indexOf("\n")) !== -1) {
              const line = buf.slice(0, idx).trim();
              buf = buf.slice(idx + 1);
              if (!line.startsWith("data:")) continue;
              const payload = line.slice(5).trim();
              if (payload === "[DONE]") continue;
              try {
                const json = JSON.parse(payload) as
                  | { choices?: { delta?: { content?: string } }[] }
                  | { type?: string; delta?: { text?: string } };
                let token: string | undefined;
                if (providerType === "anthropic") {
                  const a = json as { type?: string; delta?: { text?: string } };
                  token =
                    a.type === "content_block_delta" ? a.delta?.text : undefined;
                } else {
                  const o = json as { choices?: { delta?: { content?: string } }[] };
                  token = o.choices?.[0]?.delta?.content;
                }
                if (token) {
                  controller.enqueue(encoder.encode(encodeSSE({ type: "token", text: token })));
                }
              } catch {
                /* ignore malformed lines */
              }
            }
          }
          controller.enqueue(encoder.encode(encodeSSE({ type: "done" })));
        } catch (e) {
          if (!(e instanceof DOMException && e.name === "AbortError")) {
            controller.enqueue(
              encoder.encode(
                encodeSSE({
                  type: "error",
                  code: "STREAM_ERROR",
                  message: "Stream interrupted.",
                })
              )
            );
            controller.enqueue(encoder.encode(encodeSSE({ type: "done" })));
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
