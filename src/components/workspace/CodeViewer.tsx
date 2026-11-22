"use client";

import { cn } from "@/lib/utils";

interface CodeViewerProps {
  code?: string;
  language?: string;
  filename?: string;
}

export function CodeViewer({ code, language, filename }: CodeViewerProps) {
  if (!code) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <span className="text-ws-secondary text-[13px]">Select a file</span>
      </div>
    );
  }

  const lines = code.replace(/\n$/, "").split("\n");

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="bg-card-ws border-b border-ws-border px-3 py-2 flex items-center gap-2 shrink-0">
        <span className="text-[12px] text-foreground font-medium truncate">
          {filename ?? "Untitled"}
        </span>
        {language && (
          <span className="text-[11px] text-ws-secondary ml-auto uppercase tracking-wide">
            {language}
          </span>
        )}
      </div>
      <div className="flex-1 min-h-0 flex bg-page overflow-hidden">
        <div
          aria-hidden="true"
          className="text-[12px] text-ws-disabled text-right pr-3 pl-2 select-none font-mono ws-scroll overflow-y-auto py-2 shrink-0 tabular-nums"
        >
          {lines.map((_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>
        <pre className="text-[12px] font-mono text-foreground whitespace-pre ws-scroll overflow-auto py-2 px-3 flex-1 m-0">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
}
