import { executionRepository } from "@/lib/server/repositories";
import { subscribeExecution } from "@/lib/agent/execution-manager";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const execution = await executionRepository.get(id);
  if (!execution) return new Response("Execution not found", { status: 404 });
  const cursor = Math.max(0, Number(new URL(req.url).searchParams.get("cursor") || 0));
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const buffered: Array<{ sequence?: number; event: unknown }> = [];
      let replaying = true;
      let closed = false;
      const seen = new Set<number>();
      const write = (sequence: number | undefined, event: unknown) => {
        if (closed || (sequence !== undefined && (sequence <= cursor || seen.has(sequence)))) return;
        if (sequence !== undefined) seen.add(sequence);
        controller.enqueue(encoder.encode(`${sequence !== undefined ? `id: ${sequence}\n` : ""}data: ${JSON.stringify(event)}\n\n`));
      };
      const unsubscribe = subscribeExecution(id, (event) => {
        const sequence = (event as { sequence?: number }).sequence;
        if (replaying) buffered.push({ sequence, event });
        else write(sequence, event);
      });
      const watermark = await executionRepository.latestSequence(id);
      const historical = await executionRepository.eventsAfter(id, cursor, 1000);
      for (const event of historical.filter((item) => item.sequence <= watermark)) write(event.sequence, JSON.parse(event.payload));
      replaying = false;
      buffered.sort((a, b) => (a.sequence ?? Number.MAX_SAFE_INTEGER) - (b.sequence ?? Number.MAX_SAFE_INTEGER));
      for (const event of buffered) if (event.sequence === undefined || event.sequence > watermark) write(event.sequence, event.event);
      if (!unsubscribe && historical.length === 0) { closed = true; controller.close(); }
      req.signal.addEventListener("abort", () => { closed = true; unsubscribe?.(); try { controller.close(); } catch {} }, { once: true });
    },
    cancel() {},
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive" } });
}
