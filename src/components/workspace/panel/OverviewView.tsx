"use client";

import type { ComponentType } from "react";
import { CheckCircle2, File, GitBranch, TerminalSquare } from "lucide-react";
import type { Conversation } from "@/lib/types";

interface OverviewViewProps {
  conv?: Conversation;
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <div className="bg-card-ws border border-ws-border-soft rounded-[10px] p-3 flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-ws-secondary">
        <Icon className="size-3.5" />
        <span className="text-[11px] uppercase tracking-wide">{label}</span>
      </div>
      <div className="text-[18px] font-semibold text-foreground tabular-nums">
        {value}
      </div>
    </div>
  );
}

export function OverviewView({ conv }: OverviewViewProps) {
  if (!conv || !conv.started) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <span className="text-ws-secondary text-[13px]">No project yet</span>
      </div>
    );
  }

  const steps = conv.steps.length;
  const files = conv.workspace.files.length;
  const changes = conv.workspace.changes.length;
  const terminal = conv.workspace.terminal.length;

  return (
    <div className="flex-1 overflow-y-auto ws-scroll p-3">
      <div className="grid grid-cols-2 gap-2">
        <StatCard label="Steps" value={steps} icon={CheckCircle2} />
        <StatCard label="Files" value={files} icon={File} />
        <StatCard label="Changes" value={changes} icon={GitBranch} />
        <StatCard label="Terminal" value={terminal} icon={TerminalSquare} />
      </div>
    </div>
  );
}
