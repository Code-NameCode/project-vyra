"use client";

import { FileCode2 } from "lucide-react";
import type { Conversation } from "@/lib/types";

interface ArtifactsViewProps {
  conv?: Conversation;
}

export function ArtifactsView({ conv }: ArtifactsViewProps) {
  const artifacts = conv?.workspace.artifacts ?? [];

  if (artifacts.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <span className="text-ws-secondary text-[13px]">No artifacts yet</span>
        <span className="text-ws-disabled text-[12px] mt-1">
          Generated outputs will appear here.
        </span>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto ws-scroll p-3">
      <div className="flex flex-col gap-2">
        {artifacts.map((a) => (
          <div
            key={a.id}
            className="bg-card-ws border border-ws-border rounded-[10px] p-3 flex items-start gap-3"
          >
            <FileCode2 className="size-4 text-ws-secondary mt-0.5 shrink-0" />
            <div className="flex flex-col gap-1 min-w-0">
              <span className="text-[13px] text-foreground font-medium truncate">
                {a.name}
              </span>
              <span className="text-[11px] text-ws-secondary uppercase tracking-wide">
                {a.type}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
