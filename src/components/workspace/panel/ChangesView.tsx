"use client";

import type { Conversation, FileChange } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ChangesViewProps {
  conv?: Conversation;
}

function DiffLine({ line }: { line: string }) {
  if (line.startsWith("+++") || line.startsWith("---")) {
    return <div className="text-ws-secondary whitespace-pre">{line}</div>;
  }
  if (line.startsWith("+")) {
    return <div className="text-accent-hi whitespace-pre">{line}</div>;
  }
  if (line.startsWith("-")) {
    return <div className="text-red-400 whitespace-pre">{line}</div>;
  }
  if (
    line.startsWith("@@") ||
    line.startsWith("diff") ||
    line.startsWith("index")
  ) {
    return <div className="text-ws-secondary whitespace-pre">{line}</div>;
  }
  return <div className="text-foreground whitespace-pre">{line}</div>;
}

function StatusBadge({ status }: { status: FileChange["status"] }) {
  if (status === "added") {
    return (
      <span className="text-accent-hi text-[11px] uppercase tracking-wide">
        added
      </span>
    );
  }
  if (status === "modified") {
    return (
      <span className="text-streak text-[11px] uppercase tracking-wide">
        modified
      </span>
    );
  }
  return (
    <span className="text-ws-disabled text-[11px] uppercase tracking-wide">
      deleted
    </span>
  );
}

export function ChangesView({ conv }: ChangesViewProps) {
  const changes = conv?.workspace.changes ?? [];

  if (changes.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <span className="text-ws-secondary text-[13px]">No changes yet</span>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="bg-card-ws border-b border-ws-border px-3 py-2 text-[13px] text-foreground shrink-0">
        Changes
      </div>
      <div className="overflow-y-auto ws-scroll flex-1">
        {changes.map((change) => {
          const lines = change.diff.split("\n");
          return (
            <div
              key={change.id}
              className="px-3 py-2 border-b border-ws-border"
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[13px] text-foreground font-mono truncate">
                  {change.path}
                </span>
                <StatusBadge status={change.status} />
                <span className="text-[12px] ml-auto tabular-nums">
                  <span className="text-accent-hi">+{change.additions}</span>
                  <span className="text-ws-secondary mx-1">/</span>
                  <span className="text-red-400">-{change.deletions}</span>
                </span>
              </div>
              <pre className="text-[12px] font-mono ws-scroll overflow-x-auto p-2 bg-[#0d0e10] mt-2 rounded-[6px] border border-ws-border-soft">
                {lines.map((line, i) => (
                  <DiffLine key={i} line={line} />
                ))}
              </pre>
            </div>
          );
        })}
      </div>
    </div>
  );
}
