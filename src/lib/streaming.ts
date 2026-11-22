"use client";

import type { StreamEvent } from "@/lib/types";

/**
 * Reads a Server-Sent Events stream of newline-delimited JSON `data:` lines
 * and invokes onEvent for each parsed StreamEvent. Resolves when the stream
 * ends. Throws if the response is not ok.
 */
export async function readSSE(
  res: Response,
  onEvent: (e: StreamEvent) => void,
  signal?: AbortSignal
): Promise<void> {
  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    throw new Error(`Stream failed (${res.status}): ${text}`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const checkAbort = () => {
    if (signal?.aborted) {
      reader.cancel().catch(() => {});
      throw new DOMException("Aborted", "AbortError");
    }
  };

  while (true) {
    checkAbort();
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let idx: number;
    // SSE events are separated by a blank line (\n\n)
    while ((idx = buffer.indexOf("\n\n")) !== -1) {
      const rawEvent = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      const dataLines = rawEvent
        .split("\n")
        .filter((l) => l.startsWith("data:"))
        .map((l) => l.slice(5).trimStart());
      if (dataLines.length === 0) continue;
      const payload = dataLines.join("\n");
      if (payload === "[DONE]") continue;
      try {
        const evt = JSON.parse(payload) as StreamEvent;
        onEvent(evt);
      } catch {
        // ignore malformed lines
      }
    }
  }
}
