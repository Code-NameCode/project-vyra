import { NextRequest } from "next/server";

export const runtime = "edge";

interface StepInput {
  name: string;
  type: string;
  config: string;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(new DOMException("Aborted", "AbortError")); return; }
    const t = setTimeout(() => { signal?.removeEventListener("abort", onAbort); resolve(); }, ms);
    const onAbort = () => { clearTimeout(t); reject(new DOMException("Aborted", "AbortError")); };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

function mockOutput(step: StepInput): string {
  switch (step.type) {
    case "review": return `Reviewed 3 files. Found 0 issues. Code looks clean.`;
    case "test": return `> vitest run\n\n Test Files  4 passed (4)\n      Tests  24 passed (24)\n   Duration  2.1s`;
    case "deploy": return `Deployed to production.\nURL: https://app.example.com\nBuild: #142`;
    case "notify": return `Notification sent to #deployments channel.`;
    default: return `Prompt executed: "${step.config.slice(0, 80)}"`;
  }
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { steps?: StepInput[] };
  const steps = body.steps ?? [];
  const signal = req.signal;
  const enc = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (data: unknown) => {
        if (signal?.aborted) return;
        try { controller.enqueue(enc.encode(`data: ${JSON.stringify(data)}\n\n`)); } catch {}
      };
      try {
        for (let i = 0; i < steps.length; i++) {
          send({ type: "step_start", index: i, name: steps[i].name });
          await sleep(1200 + Math.random() * 800, signal);
          send({ type: "step_done", index: i, output: mockOutput(steps[i]) });
        }
        send({ type: "done" });
      } catch (e) {
        if (!(e instanceof DOMException && e.name === "AbortError")) {
          send({ type: "done" });
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
  });
}
