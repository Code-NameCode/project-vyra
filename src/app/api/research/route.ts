import { NextRequest } from "next/server";

export const runtime = "edge";

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(new DOMException("Aborted", "AbortError")); return; }
    const t = setTimeout(() => { signal?.removeEventListener("abort", onAbort); resolve(); }, ms);
    const onAbort = () => { clearTimeout(t); reject(new DOMException("Aborted", "AbortError")); };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

function deriveTopic(messages: { role: string; content: string }[]): string {
  const last = [...messages].reverse().find((m) => m.role === "user");
  const text = last?.content.trim() ?? "the topic";
  return text.slice(0, 60);
}

function buildReport(topic: string): string {
  return `# Deep Research: ${topic}

## Overview
This report synthesizes findings from multiple sources on **${topic}**. The research was conducted in four phases: searching, reading, analyzing, and writing.

## Key Findings

### 1. Current State
Based on the gathered sources, ${topic} is an active area with significant recent developments. The landscape includes both established approaches and emerging methodologies.

### 2. Technical Analysis
- **Approach A**: Widely adopted, well-documented, strong community support.
- **Approach B**: Newer, offers performance advantages but lacks maturity.
- **Approach C**: Niche use case, specialized tooling required.

### 3. Comparative Assessment
| Criteria | Approach A | Approach B | Approach C |
|---|---|---|---|
| Maturity | High | Medium | Low |
| Performance | Good | Excellent | Variable |
| Community | Large | Growing | Small |

### 4. Recommendations
1. **Short-term**: Adopt Approach A for immediate needs — it's proven and well-supported.
2. **Medium-term**: Pilot Approach B for performance-critical workloads.
3. **Long-term**: Monitor Approach C as it matures.

## Sources
1. _"Overview of ${topic}"_ — Technical Documentation, 2024.
2. _"Comparative Study: Approaches A vs B"_ — Research Paper, 2024.
3. _"Community Survey: ${topic}"_ — Industry Report, 2024.
4. _"Performance Benchmarks"_ — Benchmark Suite, 2024.

## Methodology
This research was conducted using an automated multi-step process:
1. **Search**: Generated search queries and gathered relevant sources.
2. **Read**: Parsed and extracted key information from each source.
3. **Analyze**: Cross-referenced findings and identified patterns.
4. **Synthesize**: Compiled this report with citations.

_Confidence: Medium-High. Findings are based on simulated research for demonstration._`;
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    query?: string;
    messages?: { role: string; content: string }[];
  };
  const signal = req.signal;
  const topic = body.query || deriveTopic(body.messages ?? []);
  const enc = new TextEncoder();

  const phases = [
    { id: "search", title: "Searching sources", kind: "search" as const },
    { id: "read", title: "Reading and extracting", kind: "plan" as const },
    { id: "analyze", title: "Analyzing findings", kind: "review" as const },
    { id: "write", title: "Writing report", kind: "edit" as const },
  ];

  const report = buildReport(topic);

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (data: unknown) => {
        if (signal?.aborted) return;
        try { controller.enqueue(enc.encode(`data: ${JSON.stringify(data)}\n\n`)); } catch {}
      };
      try {
        // Phase 1-3: searching, reading, analyzing (with mock step progress)
        for (const phase of phases.slice(0, 3)) {
          send({ type: "step_start", id: phase.id, title: phase.title, kind: phase.kind });
          await sleep(1500 + Math.random() * 1000, signal);
          send({ type: "step_done", id: phase.id, durationMs: 1800 });
        }

        // Phase 4: stream the report tokens
        send({ type: "step_start", id: "write", title: "Writing report", kind: "edit" });
        const tokens = report.match(/\S+\s*|\s+/g) ?? [report];
        for (const tk of tokens) {
          send({ type: "token", text: tk });
          await sleep(8 + Math.random() * 20, signal);
        }
        send({ type: "step_done", id: "write", durationMs: 3000 });
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
