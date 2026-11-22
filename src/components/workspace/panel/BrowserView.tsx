"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, RotateCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { Conversation } from "@/lib/types";
import { cn } from "@/lib/utils";

interface BrowserViewProps {
  conv?: Conversation;
}

const DEFAULT_URL = "https://localhost:3000";

function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed === "") return "about:blank";
  if (/^https?:\/\//i.test(trimmed) || trimmed === "about:blank") return trimmed;
  return `https://${trimmed}`;
}

export function BrowserView({ conv }: BrowserViewProps) {
  // initialize from the conversation's browser URL; the parent remounts this
  // view (via key) when switching tabs so state resets naturally.
  const initial = conv?.workspace.browserUrl ?? DEFAULT_URL;

  const [urlInput, setUrlInput] = useState(initial);
  const [committed, setCommitted] = useState(initial);
  const [history, setHistory] = useState<string[]>([initial]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);

  const navigate = (target: string) => {
    const clean = normalizeUrl(target);
    setCommitted(clean);
    setUrlInput(clean);
    const next = [...history.slice(0, historyIndex + 1), clean];
    setHistory(next);
    setHistoryIndex(next.length - 1);
    setReloadKey((k) => k + 1);
  };

  const canBack = historyIndex > 0;
  const canForward = historyIndex < history.length - 1;

  const goBack = () => {
    if (!canBack) return;
    const idx = historyIndex - 1;
    setHistoryIndex(idx);
    setCommitted(history[idx]);
    setUrlInput(history[idx]);
    setReloadKey((k) => k + 1);
  };
  const goForward = () => {
    if (!canForward) return;
    const idx = historyIndex + 1;
    setHistoryIndex(idx);
    setCommitted(history[idx]);
    setUrlInput(history[idx]);
    setReloadKey((k) => k + 1);
  };
  const refresh = () => setReloadKey((k) => k + 1);

  const iframeSrc = committed === "about:blank" ? "about:blank" : committed;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex items-center gap-1 p-2 border-b border-ws-border">
        <button
          type="button"
          aria-label="Back"
          onClick={goBack}
          disabled={!canBack}
          className={cn(
            "size-7 rounded-[6px] flex items-center justify-center hover:bg-hover text-ws-secondary transition-colors duration-150 focus-ring",
            !canBack && "opacity-40 cursor-not-allowed hover:bg-transparent"
          )}
        >
          <ArrowLeft className="size-4" />
        </button>
        <button
          type="button"
          aria-label="Forward"
          onClick={goForward}
          disabled={!canForward}
          className={cn(
            "size-7 rounded-[6px] flex items-center justify-center hover:bg-hover text-ws-secondary transition-colors duration-150 focus-ring",
            !canForward && "opacity-40 cursor-not-allowed hover:bg-transparent"
          )}
        >
          <ArrowRight className="size-4" />
        </button>
        <button
          type="button"
          aria-label="Refresh"
          onClick={refresh}
          className="size-7 rounded-[6px] flex items-center justify-center hover:bg-hover text-ws-secondary transition-colors duration-150 focus-ring"
        >
          <RotateCw className="size-4" />
        </button>
        <Input
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") navigate(urlInput);
          }}
          spellCheck={false}
          className="bg-card-ws border border-ws-border text-[13px] h-8 flex-1 min-w-0"
          placeholder="Enter URL"
        />
      </div>
      <div className="text-[11px] text-ws-disabled px-2 py-1 border-b border-ws-border-soft">
        Simulated preview
      </div>
      <iframe
        key={reloadKey}
        src={iframeSrc}
        title="Preview"
        className="w-full flex-1 bg-page"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      />
    </div>
  );
}
