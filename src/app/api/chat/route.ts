import { NextRequest } from "next/server";

export const runtime = "edge";

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
  agentId?: string;
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
  return parts.length ? `_${parts.join(" \u00b7 ")}_` : "";
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const t = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(t);
      reject(new DOMException("Aborted", "AbortError"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

function encodeSSE(data: unknown): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

function deriveTopic(messages: InMessage[]): string {
  const last = [...messages].reverse().find((m) => m.role === "user");
  const text = last?.content.trim() ?? "your app";
  const words = text.replace(/[^\w\s]/g, " ").split(/\s+/).filter(Boolean);
  const topic = words.slice(0, 6).join(" ");
  return topic || text.slice(0, 40);
}

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

const encoder = new TextEncoder();

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as ChatRequestBody;
  const mode = body.mode ?? "code";
  const messages = body.messages ?? [];
  const signal = req.signal;

  // ---------- Real provider path (OpenAI / Ollama / Anthropic / custom) ----------
  const providerType = body.providerType;
  const wantsReal =
    body.useRealApi &&
    !!body.baseUrl &&
    (!!body.apiKey || providerType === "ollama");
  if (wantsReal) {
    try {
      const systemParts = [
        body.agentInstructions,
        body.projectRules ? `# Project rules\n${body.projectRules}` : undefined,
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
          "x-api-key": body.apiKey || "",
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
        // openai-compatible (openai, ollama, custom)
        const chatPath =
          providerType === "ollama" ? "/v1/chat/completions" : "/chat/completions";
        upstreamUrl = `${base}${chatPath}`;
        headers = {
          "Content-Type": "application/json",
          ...(body.apiKey ? { Authorization: `Bearer ${body.apiKey}` } : {}),
        };
        reqBody = JSON.stringify({
          model: body.model ?? "gpt-4o-mini",
          stream: true,
          messages: [
            ...systemParts.map((content) => ({ role: "system", content })),
            ...messages,
          ],
        });
      }

      const upstream = await fetch(upstreamUrl, {
        method: "POST",
        headers,
        body: reqBody,
        signal,
      });

      if (!upstream.ok || !upstream.body) {
        throw new Error(`upstream ${upstream.status}`);
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
                    const a = json as {
                      type?: string;
                      delta?: { text?: string };
                    };
                    token =
                      a.type === "content_block_delta"
                        ? a.delta?.text
                        : undefined;
                  } else {
                    const o = json as {
                      choices?: { delta?: { content?: string } }[];
                    };
                    token = o.choices?.[0]?.delta?.content;
                  }
                  if (token) {
                    controller.enqueue(
                      encoder.encode(
                        encodeSSE({ type: "token", text: token })
                      )
                    );
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
                    type: "token",
                    text: "_The configured provider returned an error. Check the provider settings in Settings._",
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
    } catch {
      // fall through to simulation
    }
  }

  // ---------- Simulated agent path ----------
  const buildMode = body.buildMode ?? "build";
  const topic = deriveTopic(messages);
  const title = titleCase(topic);
  const contextLine = buildContextLine(body.agentId, body.skills ?? []);
  const finalAnswer =
    (contextLine ? contextLine + "\n\n" : "") +
    (buildMode === "plan"
      ? buildPlanAnswer(topic, title)
      : mode === "code"
      ? buildCodeAnswer(title)
      : buildChatAnswer(topic));

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (data: unknown) => {
        if (signal?.aborted) return;
        try {
          controller.enqueue(encoder.encode(encodeSSE(data)));
        } catch {
          // stream closed/errored (client disconnect) — stop silently
        }
      };

      try {
        if (buildMode === "plan") {
          // Plan mode: reason and propose a plan without executing changes.
          const s1 = "step_plan";
          send({ type: "step_start", id: s1, title: "Planning", kind: "plan" });
          await sleep(1100 + Math.random() * 700, signal);
          send({ type: "step_done", id: s1, durationMs: 1400 });

          const s2 = "step_review";
          send({ type: "step_start", id: s2, title: "Reviewing approach", kind: "review" });
          await sleep(700 + Math.random() * 400, signal);
          send({ type: "step_done", id: s2, durationMs: 900 });
        } else if (mode === "code") {
          const s1 = "step_files";
          send({ type: "step_start", id: s1, title: "Finding files", kind: "search" });
          await sleep(700 + Math.random() * 500, signal);
          send({ type: "step_done", id: s1, durationMs: 900 });

          const s2 = "step_plan";
          send({ type: "step_start", id: s2, title: "Planning", kind: "plan" });
          await sleep(1100 + Math.random() * 600, signal);
          send({ type: "step_done", id: s2, durationMs: 1300 });

          const s3 = "step_edit";
          send({ type: "step_start", id: s3, title: "Editing src/App.tsx", kind: "edit" });
          await sleep(400, signal);
          const fileContent = buildAppFile(title);
          send({
            type: "file",
            path: "src/App.tsx",
            action: "create",
            language: "tsx",
            content: fileContent,
          });
          await sleep(500, signal);
          send({ type: "step_done", id: s3, durationMs: 900 });

          send({
            type: "file",
            path: "src/App.css",
            action: "create",
            language: "css",
            content: ".app-shell{padding:24px;color:#f2f2f2;background:#0b0b0c;}",
          });
          send({
            type: "change",
            path: "src/App.tsx",
            status: "added",
            additions: fileContent.split("\n").length,
            deletions: 0,
            diff: buildDiff("src/App.tsx", fileContent),
          });

          const s4 = "step_run";
          send({ type: "step_start", id: s4, title: "Running npm test", kind: "run" });
          await sleep(300, signal);
          send({
            type: "terminal",
            command: "$ npm test",
            output:
              "> forge-app@0.1.0 test\n> vitest run\n\n \u2713 src/App.test.tsx (3)\n \u2713 src/__tests__/setup.test.ts (9)\n\n Test Files  2 passed (2)\n      Tests  12 passed (12)\n   Duration  1.84s",
          });
          await sleep(700, signal);
          send({ type: "step_done", id: s4, durationMs: 1000 });

          const s5 = "step_review";
          send({ type: "step_start", id: s5, title: "Reviewing changes", kind: "review" });
          await sleep(600 + Math.random() * 400, signal);
          send({ type: "step_done", id: s5, durationMs: 800 });
        } else {
          const s1 = "step_plan";
          send({ type: "step_start", id: s1, title: "Thinking", kind: "plan" });
          await sleep(900 + Math.random() * 500, signal);
          send({ type: "step_done", id: s1, durationMs: 1100 });
        }

        const tokens = finalAnswer.match(/\S+\s*|\s+/g) ?? [finalAnswer];
        for (const tk of tokens) {
          send({ type: "token", text: tk });
          await sleep(10 + Math.random() * 26, signal);
        }

        send({ type: "done" });
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") {
          // client aborted; stop quietly
        } else {
          try {
            send({ type: "done" });
          } catch {
            /* ignore */
          }
        }
      } finally {
        try {
          controller.close();
        } catch {
          /* already closed/errored */
        }
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
}

function buildCodeAnswer(title: string): string {
  return `I've scaffolded **${title}** based on your request. Here's a summary of what I did.

## Plan
1. Searched the workspace for existing files and conventions.
2. Drafted an implementation plan and picked a minimal structure.
3. Edited \`src/App.tsx\` to add the main component.
4. Ran the test suite \u2014 **12 passing**.
5. Reviewed the diff for correctness and style.

## What changed
- **src/App.tsx** \u2014 added the main component with a default export and basic layout.
- **src/App.css** \u2014 added base styles for the shell.

\`\`\`tsx
export default function App() {
  return <main className="app-shell">{/* ${title} */}</main>;
}
\`\`\`

## Next steps
1. Add routing if you need multiple pages.
2. Theme the components with Tailwind classes.
3. Run \`npm run dev\` to preview locally.

Want me to add interactivity, tests, or a different layout? Just say the word.`;
}

function buildChatAnswer(topic: string): string {
  return `Here's my take on **${topic}**.

Let me think through this step by step:

- First, I'd clarify the goal and constraints so the solution stays focused.
- Then I'd break the problem into smaller, testable pieces.
- Finally, I'd verify the result against your original request.

If you'd like, I can switch to **Code mode** and actually build it out \u2014 just toggle the pill in the top bar. Otherwise, I'm happy to keep brainstorming here.`;
}

function buildPlanAnswer(topic: string, title: string): string {
  return `Here's a plan for **${title}**. I haven't changed anything yet \u2014 switch to **Build** when you're ready to execute.

## Goal
${title} \u2014 built from your request: "${topic}".

## Proposed approach
1. Scaffold the project structure and base layout.
2. Implement the core component(s) and data flow.
3. Wire up styling and responsive behavior.
4. Add basic tests for the key paths.
5. Run the test suite and review the diff.

## Files I'd touch
- \`src/App.tsx\` \u2014 main component scaffold
- \`src/App.css\` \u2014 base styles
- A few supporting components/modules as needed

## Open questions
- Should this be a single page or multi-route?
- Any specific styling system or design tokens to follow?

## Risks / notes
- Keep edits small and reviewable.
- Verify nothing breaks existing tests.

Switch the composer to **Build** and send again to execute this plan.`;
}

function buildAppFile(title: string): string {
  return `import "./App.css";

export default function App() {
  return (
    <main className="app-shell">
      <h1>${title}</h1>
      <p>Built with Goodstuff-Agent.</p>
    </main>
  );
}
`;
}

function buildDiff(path: string, content: string): string {
  const lines = content.split("\n");
  const header = `diff --git a/${path} b/${path}\nnew file mode 100644\nindex 0000000..1111111\n--- /dev/null\n+++ b/${path}`;
  const body = lines.map((l) => `+${l}`).join("\n");
  return `${header}\n${body}`;
}
