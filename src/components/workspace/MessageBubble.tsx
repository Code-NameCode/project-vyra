"use client";

import {
  Download,
  File,
  FileImage,
  FileText,
  FileVideo,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MarkdownRenderer } from "./MarkdownRenderer";
import type { ChatMessage, FileAttachment } from "@/lib/types";

/** Format a byte count as a short human-readable string. */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Pick an icon for an attachment card based on its mime type. */
function CardIcon({
  mimeType,
  className,
}: {
  mimeType: string;
  className?: string;
}) {
  if (mimeType.startsWith("image/")) return <FileImage className={className} />;
  if (mimeType.startsWith("video/")) return <FileVideo className={className} />;
  if (
    mimeType.startsWith("text/") ||
    mimeType === "application/json" ||
    mimeType === "application/javascript" ||
    mimeType === "application/xml"
  ) {
    return <FileText className={className} />;
  }
  return <File className={className} />;
}

/** Render a single attachment based on its mime type. */
function AttachmentView({ att }: { att: FileAttachment }) {
  const { mimeType, name, size, dataUrl, text } = att;

  // Images: inline thumbnail.
  if (mimeType.startsWith("image/") && dataUrl) {
    return (
      <img
        src={dataUrl}
        alt={name}
        className={cn(
          "rounded-[10px] max-w-full max-h-[300px] object-contain mt-2",
          "border border-ws-border ws-fade-in"
        )}
      />
    );
  }

  // Videos: inline player.
  if (mimeType.startsWith("video/") && dataUrl) {
    return (
      <video
        src={dataUrl}
        controls
        className="rounded-[10px] max-w-full max-h-[300px] mt-2 ws-fade-in"
      />
    );
  }

  // PDFs: card with "View PDF" button (opens data URL in a new tab).
  if (mimeType === "application/pdf" && dataUrl) {
    return (
      <div
        className={cn(
          "mt-2 flex items-center gap-2.5 rounded-[10px] border border-ws-border",
          "bg-card-ws px-3 py-2 ws-fade-in"
        )}
      >
        <FileText className="size-4 shrink-0 text-accent-hi" />
        <div className="min-w-0 flex-1">
          <div className="text-[12.5px] text-foreground truncate">{name}</div>
          <div className="text-[11px] text-ws-secondary">{formatSize(size)}</div>
        </div>
        <button
          type="button"
          onClick={() => window.open(dataUrl, "_blank", "noopener,noreferrer")}
          className={cn(
            "inline-flex items-center gap-1 h-7 px-2.5 rounded-[8px]",
            "border border-ws-border bg-hover text-[12px] text-foreground",
            "hover:text-accent-hi transition-colors focus-ring"
          )}
        >
          View PDF
        </button>
      </div>
    );
  }

  // HTML: sandboxed iframe via srcDoc.
  if (mimeType === "text/html" && typeof text === "string") {
    return (
      <iframe
        srcDoc={text}
        sandbox="allow-scripts"
        title={name}
        className={cn(
          "w-full h-[300px] rounded-[10px] border border-ws-border mt-2",
          "bg-white ws-fade-in"
        )}
      />
    );
  }

  // Text / code: scrollable pre block (reuses CodeBlock styling tokens).
  if (typeof text === "string") {
    return (
      <pre
        className={cn(
          "mt-2 bg-[#0d0e10] rounded-[10px] border border-ws-border p-3",
          "text-[12px] font-mono overflow-x-auto ws-scroll max-h-[200px]",
          "text-foreground ws-fade-in"
        )}
      >
        <code className="whitespace-pre">{text}</code>
      </pre>
    );
  }

  // Other binary: a downloadable file card.
  return (
    <div
      className={cn(
        "mt-2 flex items-center gap-2.5 rounded-[10px] border border-ws-border",
        "bg-card-ws px-3 py-2 ws-fade-in"
      )}
    >
      <CardIcon
        mimeType={mimeType}
        className="size-4 shrink-0 text-accent-hi"
      />
      <div className="min-w-0 flex-1">
        <div className="text-[12.5px] text-foreground truncate">{name}</div>
        <div className="text-[11px] text-ws-secondary">{formatSize(size)}</div>
      </div>
      {dataUrl && (
        <a
          href={dataUrl}
          download={name}
          className={cn(
            "inline-flex items-center gap-1 h-7 px-2.5 rounded-[8px]",
            "border border-ws-border bg-hover text-[12px] text-foreground",
            "hover:text-accent-hi transition-colors focus-ring"
          )}
        >
          <Download className="size-3.5" />
          Download
        </a>
      )}
    </div>
  );
}

/** Render all attachments for a message (if any). */
function Attachments({ items }: { items?: FileAttachment[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="flex flex-col items-start">
      {items.map((att) => (
        <AttachmentView key={att.id} att={att} />
      ))}
    </div>
  );
}

export function MessageBubble({ message }: { message: ChatMessage }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-[14px] rounded-br-[6px] bg-hover px-3.5 py-2.5 text-[14px] text-foreground whitespace-pre-wrap break-words">
          {message.content}
          {message.attachments && message.attachments.length > 0 && (
            <Attachments items={message.attachments} />
          )}
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
      {isStreaming && empty && !message.thinking ? (
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
        <>
          {message.thinking && (
            <details className="mb-1.5 rounded-[10px] border border-ws-border-soft bg-card-ws px-3 py-2 text-[12.5px] text-ws-secondary ws-fade-in">
              <summary className="cursor-pointer select-none">Thinking</summary>
              <div className="mt-1.5 whitespace-pre-wrap italic leading-relaxed">
                {message.thinking}
              </div>
            </details>
          )}
          <MarkdownRenderer content={message.content} streaming={isStreaming} />
          {message.usage && (message.usage.inputTokens || message.usage.outputTokens) ? (
            <div className="mt-1 text-[11px] text-ws-secondary">
              {message.usage.inputTokens ? `${message.usage.inputTokens} in` : ""}
              {message.usage.inputTokens && message.usage.outputTokens ? " · " : ""}
              {message.usage.outputTokens ? `${message.usage.outputTokens} out` : ""}
            </div>
          ) : null}
          {message.attachments && message.attachments.length > 0 && (
            <Attachments items={message.attachments} />
          )}
        </>
      )}
    </div>
  );
}
