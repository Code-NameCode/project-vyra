"use client";

import { useEffect, useRef, useState } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import "@xterm/xterm/css/xterm.css";
import type { Conversation } from "@/lib/types";
import { cn } from "@/lib/utils";

interface TerminalViewProps {
  conv?: Conversation;
}

type TerminalStatus = "connecting" | "ready" | "closed" | "error";

const TERM_THEME = {
  background: "#0d0a0a",
  foreground: "#f4f1ef",
  cursor: "#fa3a18",
  cursorAccent: "#0d0a0a",
  selectionBackground: "rgba(250, 58, 24, 0.28)",
  black: "#1a1615",
  red: "#f87171",
  green: "#7bc65a",
  yellow: "#e5c07b",
  blue: "#6b8afd",
  magenta: "#c678dd",
  cyan: "#4ab8b8",
  white: "#e6e2e0",
  brightBlack: "#5f5754",
  brightRed: "#ff8a7a",
  brightGreen: "#9be07a",
  brightYellow: "#f0d197",
  brightBlue: "#8baaff",
  brightMagenta: "#d99ae8",
  brightCyan: "#6fd6d6",
  brightWhite: "#ffffff",
};

function shellLabel(path: string): string {
  const base = path.split(/[\\/]/).filter(Boolean).pop();
  return base ? base.replace(/\.exe$/i, "") : path;
}

export function TerminalView({ conv }: TerminalViewProps) {
  // Kept for API compatibility with the panel router; the PTY owns its own
  // scrollback so the conversation store is no longer used for output.
  void conv;

  const containerRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const [status, setStatus] = useState<TerminalStatus>("connecting");
  const [shell, setShell] = useState("shell");

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let disposed = false;

    const term = new Terminal({
      allowProposedApi: true,
      cursorBlink: true,
      convertEol: false,
      scrollback: 5000,
      fontFamily:
        "'JetBrains Mono', 'Fira Code', ui-monospace, SFMono-Regular, Menlo, monospace",
      fontSize: 12,
      lineHeight: 1.25,
      theme: TERM_THEME,
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.loadAddon(new WebLinksAddon());
    term.open(el);
    try {
      fit.fit();
    } catch {
      /* container may be hidden while mounting */
    }

    const post = (body: Record<string, unknown>) =>
      fetch("/api/terminal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        keepalive: true,
      }).catch(() => undefined);

    let sessionId: string | null = null;
    let queue = "";
    let flushTimer: ReturnType<typeof setTimeout> | null = null;

    const flush = () => {
      flushTimer = null;
      if (!queue || !sessionId) return;
      const data = queue;
      queue = "";
      void post({ action: "input", sessionId, data });
    };

    const dataDisposable = term.onData((data) => {
      queue += data;
      if (!flushTimer) flushTimer = setTimeout(flush, 8);
    });

    (async () => {
      try {
        const res = await fetch("/api/terminal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "create",
            cols: term.cols,
            rows: term.rows,
          }),
        });
        const json = (await res.json()) as {
          sessionId?: string;
          shell?: string;
          error?: string;
        };
        if (disposed) {
          if (json.sessionId) {
            void post({ action: "close", sessionId: json.sessionId });
          }
          return;
        }
        if (!res.ok || !json.sessionId) {
          throw new Error(json.error || "Unable to start terminal");
        }

        sessionId = json.sessionId;
        if (json.shell) setShell(shellLabel(json.shell));
        setStatus("ready");

        const es = new EventSource(
          `/api/terminal?session=${encodeURIComponent(json.sessionId)}`
        );
        eventSourceRef.current = es;
        es.addEventListener("data", (event) => {
          const payload = (event as MessageEvent).data;
          try {
            term.write(JSON.parse(payload) as string);
          } catch {
            term.write(payload);
          }
        });
        es.onerror = () => {
          if (!disposed) setStatus("closed");
        };
      } catch (e) {
        if (disposed) return;
        setStatus("error");
        term.writeln(
          `\x1b[31m${e instanceof Error ? e.message : "Terminal error"}\x1b[0m`
        );
      }
    })();

    const syncSize = () => {
      try {
        fit.fit();
      } catch {
        return;
      }
      if (sessionId) {
        void post({
          action: "resize",
          sessionId,
          cols: term.cols,
          rows: term.rows,
        });
      }
    };

    const observer = new ResizeObserver(() => syncSize());
    observer.observe(el);
    window.addEventListener("resize", syncSize);
    const focusTimer = setTimeout(() => term.focus(), 60);

    return () => {
      disposed = true;
      clearTimeout(focusTimer);
      observer.disconnect();
      window.removeEventListener("resize", syncSize);
      dataDisposable.dispose();
      if (flushTimer) clearTimeout(flushTimer);
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
      if (sessionId) {
        void post({ action: "close", sessionId });
      }
      term.dispose();
    };
  }, []);

  return (
    <div className="bg-[#0d0a0a] flex-1 flex flex-col font-mono text-[12px] min-h-0">
      <div className="bg-card-ws border-b border-ws-border px-3 py-1.5 text-[12px] text-ws-secondary shrink-0 flex items-center gap-2">
        <span>{shell}</span>
        <span
          className={cn(
            "inline-block size-1.5 rounded-full",
            status === "ready" && "bg-accent-fill",
            status === "connecting" && "bg-yellow-500 animate-pulse",
            status === "closed" && "bg-ws-disabled",
            status === "error" && "bg-red-500"
          )}
        />
        <span className="text-[11px] text-ws-disabled">
          {status === "connecting"
            ? "starting…"
            : status === "ready"
              ? "connected"
              : status === "closed"
                ? "session ended"
                : "failed to start"}
        </span>
      </div>
      <div
        ref={containerRef}
        onClick={() => containerRef.current?.focus()}
        className="flex-1 min-h-0 p-2 overflow-hidden cursor-text"
      />
    </div>
  );
}
