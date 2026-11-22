"use client";

import * as React from "react";
import {
  AlertCircle,
  Brain,
  Check,
  ChevronDown,
  FilePen,
  GitBranch,
  Loader2,
  Search,
  TerminalSquare,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { AgentStep } from "@/lib/types";
import { cn } from "@/lib/utils";

const KIND_ICON: Record<
  AgentStep["kind"],
  React.ComponentType<{ className?: string }>
> = {
  search: Search,
  plan: Brain,
  edit: FilePen,
  run: TerminalSquare,
  review: GitBranch,
};

const KIND_DEFAULT_DETAIL: Record<AgentStep["kind"], string> = {
  search: "Searching workspace for relevant files…",
  plan: "Drafting an execution plan.",
  edit: "Editing files in the workspace.",
  run: "Running command in terminal.",
  review: "Reviewing recent changes.",
};

function formatDuration(ms?: number): string {
  if (ms == null) return "";
  return `${(ms / 1000).toFixed(1)}s`;
}

export function AgentStepCard({ step }: { step: AgentStep }) {
  const [open, setOpen] = React.useState(false);
  const Icon = KIND_ICON[step.kind];
  const detail = step.detail?.trim()
    ? step.detail
    : KIND_DEFAULT_DETAIL[step.kind];

  const StatusIcon =
    step.status === "running"
      ? Loader2
      : step.status === "done"
      ? Check
      : AlertCircle;

  const statusClass =
    step.status === "running"
      ? "text-accent-hi animate-spin"
      : step.status === "done"
      ? "text-accent-hi"
      : "text-red-400";

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="rounded-[10px] border border-ws-border bg-card-ws overflow-hidden"
    >
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className={cn(
            "focus-ring flex items-center gap-2 px-3 py-2.5 w-full",
            "hover:bg-hover transition-colors duration-150 text-left"
          )}
        >
          <Icon className="size-4 text-ws-secondary shrink-0" />
          <StatusIcon className={cn("size-3.5 shrink-0", statusClass)} />
          <span className="text-[13px] text-foreground flex-1 truncate">
            {step.title}
          </span>
          {step.durationMs != null ? (
            <span className="text-[12px] text-ws-secondary tabular-nums">
              {formatDuration(step.durationMs)}
            </span>
          ) : null}
          <ChevronDown
            className={cn(
              "size-3.5 text-ws-secondary transition-transform duration-150",
              open && "rotate-180"
            )}
          />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="px-3 pb-3 pt-1">
        <div className="text-[12.5px] text-ws-secondary whitespace-pre-wrap font-mono">
          {detail}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
