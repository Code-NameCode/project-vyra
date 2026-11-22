import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { NextRequest } from "next/server";
import { streamProvider, type ProviderConfig, type ProviderEvent, type ProviderTool } from "../src/lib/server/providers";
import { setCredential } from "../src/lib/server/credential-vault";
// Route handler import also exercises the Next route module under bun.
import { POST } from "../src/app/api/chat/route";

function chatRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// Isolated vault for route-level tests that resolve keys by providerId.
process.env.VYRA_CREDENTIAL_KEY = "chat-streaming-test-key";
process.env.VYRA_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "vyra-chat-stream-"));

const encoder = new TextEncoder();

function sse(frames: string[]): Response {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const frame of frames) controller.enqueue(encoder.encode(`data: ${frame}\n\n`));
      controller.close();
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream" } });
}

interface RecordedRequest { path: string; headers: Record<string, string>; body: any }
interface MockProvider { url: string; requests: RecordedRequest[]; stop: () => void }

/** Start a throwaway HTTP server that answers every request with the given SSE frames. */
function mockProvider(respond: (req: Request) => Response): MockProvider {
  const requests: RecordedRequest[] = [];
  const server = Bun.serve({
    port: 0,
    async fetch(req) {
      const url = new URL(req.url);
      let body: any;
      try { body = await req.json(); } catch { body = null; }
      requests.push({ path: url.pathname, headers: Object.fromEntries(req.headers.entries()), body });
      return respond(req);
    },
  });
  return { url: `http://127.0.0.1:${server.port}`, requests, stop: () => server.stop(true) };
}

async function collect(gen: AsyncGenerator<ProviderEvent>): Promise<ProviderEvent[]> {
  const out: ProviderEvent[] = [];
  for await (const event of gen) out.push(event);
  return out;
}

const TOOL: ProviderTool = { name: "list_files", description: "list files", inputSchema: { type: "object" } };

describe("streamProvider — openai-compatible transports (openai/custom)", () => {
  test("streams thinking, text and usage in arrival order and reassembles tool calls", async () => {
    const mock = mockProvider(() => sse([
      JSON.stringify({ choices: [{ delta: { reasoning_content: "Let me think " } }] }),
      JSON.stringify({ choices: [{ delta: { reasoning_content: "about it." } }] }),
      JSON.stringify({ choices: [{ delta: { content: "Hello" } }] }),
      JSON.stringify({ choices: [{ delta: { content: " world" } }] }),
      JSON.stringify({ choices: [{ delta: { tool_calls: [{ id: "call_1", function: { name: "list_files", arguments: "{\"pa" } }] } }] }),
      JSON.stringify({ choices: [{ delta: { tool_calls: [{ function: { arguments: "th\":\".\"}" } }] } }] }),
      JSON.stringify({ choices: [{ delta: {} }], usage: { prompt_tokens: 12, completion_tokens: 34 } }),
      "[DONE]",
    ]));
    try {
      const events = await collect(streamProvider(
        { type: "custom", baseUrl: mock.url, model: "gpt-x", apiKey: "sk-test" },
        [{ role: "user", content: "hi" }],
        [TOOL],
      ));
      expect(events).toEqual([
        { type: "thinking", text: "Let me think " },
        { type: "thinking", text: "about it." },
        { type: "text", text: "Hello" },
        { type: "text", text: " world" },
        { type: "usage", inputTokens: 12, outputTokens: 34 },
        { type: "tool_call", id: "call_1", name: "list_files", arguments: "{\"path\":\".\"}" },
      ]);
      const req = mock.requests[0];
      expect(req.path).toBe("/chat/completions");
      expect(req.headers["authorization"]).toBe("Bearer sk-test");
      expect(req.body.tools[0].function.name).toBe("list_files");
      expect(req.body.tool_choice).toBe("auto");
    } finally { mock.stop(); }
  });

  test("custom providers share the same /chat/completions path and parsing", async () => {
    const mock = mockProvider(() => sse([
      JSON.stringify({ choices: [{ delta: { content: "ok" } }] }),
    ]));
    try {
      const events = await collect(streamProvider({ type: "custom", baseUrl: mock.url, model: "m" }, [{ role: "user", content: "hi" }], []));
      expect(events).toEqual([{ type: "text", text: "ok" }]);
      expect(mock.requests[0].path).toBe("/chat/completions");
      // No tools requested → no tools/tool_choice fields reach the provider.
      expect(mock.requests[0].body.tools).toBeUndefined();
      expect(mock.requests[0].body.tool_choice).toBeUndefined();
    } finally { mock.stop(); }
  });

  test("reasoning-disabled responses emit no thinking events", async () => {
    const mock = mockProvider(() => sse([
      JSON.stringify({ choices: [{ delta: { content: "plain answer" } }] }),
    ]));
    try {
      const events = await collect(streamProvider({ type: "openai", baseUrl: mock.url, model: "m" }, [{ role: "user", content: "hi" }], []));
      expect(events.every((e) => e.type !== "thinking")).toBe(true);
    } finally { mock.stop(); }
  });

  test("z.ai/GLM endpoints get thinking-enabled request parameters", async () => {
    const mock = mockProvider(() => sse([JSON.stringify({ choices: [{ delta: { content: "x" } }] })]));
    try {
      await collect(streamProvider({ type: "custom", baseUrl: `${mock.url}/glm-route`, model: "glm-5.3" }, [{ role: "user", content: "hi" }], []));
      expect(mock.requests[0].body.temperature).toBe(1.0);
      expect(mock.requests[0].body.thinking).toEqual({ type: "enabled" });
      expect(mock.requests[0].body.reasoning_effort).toBe("max");
    } finally { mock.stop(); }
  });

  test("non-z.ai endpoints get no special-cased parameters", async () => {
    const mock = mockProvider(() => sse([JSON.stringify({ choices: [{ delta: { content: "x" } }] })]));
    try {
      await collect(streamProvider({ type: "custom", baseUrl: mock.url, model: "m" }, [{ role: "user", content: "hi" }], []));
      expect(mock.requests[0].body.temperature).toBeUndefined();
      expect(mock.requests[0].body.thinking).toBeUndefined();
      expect(mock.requests[0].body.reasoning_effort).toBeUndefined();
    } finally { mock.stop(); }
  });
});

describe("streamProvider — anthropic", () => {
  test("extracts system, streams text/thinking deltas, reassembles tool_use and usage", async () => {
    const mock = mockProvider(() => sse([
      JSON.stringify({ type: "content_block_delta", delta: { type: "text_delta", text: "Hi" } }),
      JSON.stringify({ type: "content_block_delta", delta: { type: "thinking_delta", thinking: "reasoning chunk" } }),
      JSON.stringify({ type: "content_block_delta", delta: { type: "text_delta", text: " there" } }),
      JSON.stringify({ type: "content_block_start", content_block: { type: "tool_use", id: "toolu_1", name: "read_file" } }),
      JSON.stringify({ type: "content_block_delta", delta: { type: "partial_json", partial_json: "{\"path\":" } }),
      JSON.stringify({ type: "content_block_delta", delta: { type: "partial_json", partial_json: "\"x\"}" } }),
      JSON.stringify({ type: "message_delta", usage: { output_tokens: 21 } }),
    ]));
    try {
      const events = await collect(streamProvider(
        { type: "anthropic", baseUrl: mock.url, model: "claude-x", apiKey: "ak-test" },
        [{ role: "system", content: "sys prompt" }, { role: "user", content: "hi" }],
        [TOOL],
      ));
      expect(events).toEqual([
        { type: "text", text: "Hi" },
        { type: "thinking", text: "reasoning chunk" },
        { type: "text", text: " there" },
        { type: "usage", outputTokens: 21 },
        { type: "tool_call", id: "toolu_1", name: "read_file", arguments: "{\"path\":\"x\"}" },
      ]);
      const req = mock.requests[0];
      expect(req.path).toBe("/messages");
      expect(req.headers["x-api-key"]).toBe("ak-test");
      expect(req.headers["anthropic-version"]).toBe("2023-06-01");
      expect(req.body.max_tokens).toBe(4096);
      expect(req.body.system).toBe("sys prompt");
      expect(req.body.messages).toEqual([{ role: "user", content: "hi" }]);
      expect(req.body.tools[0].name).toBe("list_files");
    } finally { mock.stop(); }
  });
});

describe("streamProvider — ollama", () => {
  test("uses the /v1/chat/completions path and sends no auth header", async () => {
    const mock = mockProvider(() => sse([
      JSON.stringify({ choices: [{ delta: { content: "ollama says hi" } }] }),
    ]));
    try {
      const events = await collect(streamProvider({ type: "ollama", baseUrl: mock.url, model: "llama3" }, [{ role: "user", content: "hi" }], []));
      expect(events).toEqual([{ type: "text", text: "ollama says hi" }]);
      expect(mock.requests[0].path).toBe("/v1/chat/completions");
      expect(mock.requests[0].headers["authorization"]).toBeUndefined();
    } finally { mock.stop(); }
  });
});

describe("streamProvider — failures and cancellation", () => {
  test("authentication failures surface as an error event with the status", async () => {
    const mock = mockProvider(() => new Response(JSON.stringify({ error: "bad key" }), { status: 401 }));
    try {
      const events = await collect(streamProvider({ type: "custom", baseUrl: mock.url, model: "m", apiKey: "wrong" }, [{ role: "user", content: "hi" }], []));
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe("error");
      expect((events[0] as { message: string }).message).toContain("401");
    } finally { mock.stop(); }
  });

  test("aborting mid-stream rejects the generator with an AbortError", async () => {
    const server = Bun.serve({
      port: 0,
      fetch() {
        const stream = new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: "first" } }] })}\n\n`));
            // Never closes — only an abort can end this stream.
          },
        });
        return new Response(stream, { headers: { "Content-Type": "text/event-stream" } });
      },
    });
    const controller = new AbortController();
    try {
      const gen = streamProvider({ type: "custom", baseUrl: `http://127.0.0.1:${server.port}`, model: "m" }, [{ role: "user", content: "hi" }], [], controller.signal);
      const first = await gen.next();
      expect(first.value).toEqual({ type: "text", text: "first" });
      controller.abort();
      let aborted = false;
      try { await gen.next(); } catch (e) { aborted = e instanceof Error && e.name === "AbortError"; }
      expect(aborted).toBe(true);
    } finally { server.stop(true); }
  });
});

describe("/api/chat route contract", () => {
  test("streams token/thinking/usage over SSE with done last", async () => {
    const mock = mockProvider(() => sse([
      JSON.stringify({ choices: [{ delta: { reasoning_content: "hmm " } }] }),
      JSON.stringify({ choices: [{ delta: { content: "answer" } }] }),
      JSON.stringify({ choices: [{ delta: {} }], usage: { prompt_tokens: 5, completion_tokens: 2 } }),
      "[DONE]",
    ]));
    try {
      const res = await POST(chatRequest({ useRealApi: true, providerType: "ollama", baseUrl: mock.url, model: "llama3", messages: [{ role: "user", content: "hi" }] }));
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("text/event-stream");
      const events = (await res.text())
        .split("\n\n")
        .filter((line) => line.startsWith("data:"))
        .map((line) => JSON.parse(line.slice(5).trim()));
      expect(events.at(-1)).toEqual({ type: "done" });
      expect(events).toEqual([
        { type: "thinking", text: "hmm " },
        { type: "token", text: "answer" },
        { type: "usage", inputTokens: 5, outputTokens: 2 },
        { type: "done" },
      ]);
      // No tools are sent for plain chat; the execution transport owns tools.
      expect(mock.requests[0].body.tools).toBeUndefined();
    } finally { mock.stop(); }
  });

  test("upstream authentication failures keep the JSON 502 UPSTREAM_<status> contract", async () => {
    const mock = mockProvider(() => new Response("unauthorized", { status: 401 }));
    try {
      await setCredential("route-test-provider", "server-side-key");
      const res = await POST(chatRequest({ useRealApi: true, providerType: "openai", providerId: "route-test-provider", baseUrl: mock.url, model: "m", messages: [{ role: "user", content: "hi" }] }));
      expect(res.status).toBe(502);
      const data = await res.json();
      expect(data.error.code).toBe("UPSTREAM_401");
    } finally { mock.stop(); }
  });

  test("missing provider configuration returns the 400 NO_PROVIDER_CONFIGURED contract", async () => {
    const res = await POST(chatRequest({ useRealApi: false, messages: [{ role: "user", content: "hi" }] }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error.code).toBe("NO_PROVIDER_CONFIGURED");
  });
});
