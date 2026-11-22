"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { uid } from "@/lib/id";
import type { Conversation, TerminalLine } from "@/lib/types";
import { cn } from "@/lib/utils";

interface TerminalViewProps {
  conv?: Conversation;
}

const PROMPT = "forge@workspace:~$";

export function TerminalView({ conv }: TerminalViewProps) {
  const storeLines = conv?.workspace.terminal ?? [];
  const [localLines, setLocalLines] = useState<TerminalLine[]>([]);
  const [input, setInput] = useState("");
  const bodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [storeLines.length, localLines.length]);

  const lines: TerminalLine[] = [...storeLines, ...localLines];

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const cmd = input.trim();
    if (!cmd) return;
    const firstToken = cmd.split(/\s+/)[0];
    const newLines: TerminalLine[] = [
      { id: uid("term"), kind: "in", text: cmd },
      {
        id: uid("term"),
        kind: "err",
        text: `zsh: command not found: ${firstToken}`,
      },
    ];
    setLocalLines((prev) => [...prev, ...newLines]);
    setInput("");
  };

  return (
    <div className="bg-[#0d0e10] flex-1 flex flex-col font-mono text-[12px] min-h-0">
      <div className="bg-card-ws border-b border-ws-border px-3 py-1.5 text-[12px] text-ws-secondary shrink-0">
        bash
      </div>
      <div
        ref={bodyRef}
        onClick={() => inputRef.current?.focus()}
        className="p-3 overflow-y-auto ws-scroll flex-1 cursor-text"
      >
        {lines.length === 0 ? (
          <div className="text-accent-hi">
            <span>{PROMPT} </span>
            <span className="stream-caret" />
          </div>
        ) : (
          lines.map((line) => (
            <div
              key={line.id}
              className={cn(
                "whitespace-pre-wrap break-words",
                line.kind === "out" && "whitespace-pre"
              )}
            >
              {line.kind === "in" ? (
                <span className="text-accent-hi">
                  <span>$ </span>
                  <span>{line.text}</span>
                </span>
              ) : line.kind === "err" ? (
                <span className="text-red-400">{line.text}</span>
              ) : (
                <span className="text-ws-secondary">{line.text}</span>
              )}
            </div>
          ))
        )}
      </div>
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 px-3 py-2 border-t border-ws-border shrink-0"
      >
        <span className="text-accent-hi shrink-0 select-none">{PROMPT}</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          spellCheck={false}
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          className="text-foreground font-mono outline-none flex-1 bg-transparent text-[12px]"
          aria-label="Terminal input"
        />
      </form>
    </div>
  );
}
