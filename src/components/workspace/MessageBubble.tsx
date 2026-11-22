"use client";

import { MarkdownRenderer } from "./MarkdownRenderer";
import type { ChatMessage } from "@/lib/types";

export function MessageBubble({ message }: { message: ChatMessage }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-[14px] rounded-br-[6px] bg-hover px-3.5 py-2.5 text-[14px] text-foreground whitespace-pre-wrap break-words">
          {message.content}
        </div>
      </div>
    );
  }

  if (message.role === "system") {
    return (
      <div className="w-full">
        <div className="rounded-[10px] border border-ws-border-soft bg-card-ws px-3 py-2 text-[12.5px] text-ws-secondary italic">
          {message.content}
        </div>
      </div>
    );
  }

  // assistant
  const isStreaming = !!message.streaming;
  const empty = !message.content || message.content.trim().length === 0;

  return (
    <div className="w-full">
      {isStreaming && empty ? (
        <div
          className="flex items-center gap-1.5 text-[13px] text-ws-secondary"
          aria-label="Thinking"
        >
          <span>Thinking</span>
          <span className="flex gap-1 items-center ml-0.5">
            <span
              className="w-1.5 h-1.5 rounded-full bg-ws-secondary pulse-dot"
              style={{ animationDelay: "0ms" }}
            />
            <span
              className="w-1.5 h-1.5 rounded-full bg-ws-secondary pulse-dot"
              style={{ animationDelay: "180ms" }}
            />
            <span
              className="w-1.5 h-1.5 rounded-full bg-ws-secondary pulse-dot"
              style={{ animationDelay: "360ms" }}
            />
          </span>
        </div>
      ) : (
        <MarkdownRenderer content={message.content} streaming={isStreaming} />
      )}
    </div>
  );
}
