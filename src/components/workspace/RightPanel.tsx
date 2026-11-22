"use client";

import type { ComponentType } from "react";
import {
  ArrowLeft,
  FileCode2,
  Folder,
  GitBranch,
  Globe,
  LayoutList,
  TerminalSquare,
  X,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAppStore } from "@/stores/useAppStore";
import { useChatStore } from "@/stores/useChatStore";
import { cn } from "@/lib/utils";
import type { RightPanelView } from "@/lib/types";
import { OverviewView } from "./panel/OverviewView";
import { BrowserView } from "./panel/BrowserView";
import { FilesView } from "./panel/FilesView";
import { TerminalView } from "./panel/TerminalView";
import { ChangesView } from "./panel/ChangesView";
import { ArtifactsView } from "./panel/ArtifactsView";

const VIEW_LABELS: Record<RightPanelView, string> = {
  overview: "Overview",
  browser: "Browser",
  files: "Files",
  terminal: "Terminal",
  changes: "Changes",
  artifacts: "Artifacts",
};

interface NavItemProps {
  label: string;
  icon: ComponentType<{ className?: string }>;
  onClick: () => void;
  disabled?: boolean;
  disabledTooltip?: string;
}

function NavItem({
  label,
  icon: Icon,
  onClick,
  disabled = false,
  disabledTooltip,
}: NavItemProps) {
  const trigger = (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={cn(
        "w-full max-w-[260px] flex items-center gap-3 rounded-[10px] px-3 py-3 text-[15px] transition-colors duration-150 focus-ring",
        disabled
          ? "text-ws-disabled cursor-not-allowed"
          : "text-foreground hover:bg-hover"
      )}
    >
      <Icon className="size-5 text-ws-secondary shrink-0" />
      <span>{label}</span>
    </button>
  );

  if (disabled && disabledTooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{trigger}</TooltipTrigger>
        <TooltipContent side="right">{disabledTooltip}</TooltipContent>
      </Tooltip>
    );
  }
  return trigger;
}

export function RightPanel() {
  const rightPanelView = useAppStore((s) => s.rightPanelView);
  const setRightPanelView = useAppStore((s) => s.setRightPanelView);
  const setRightPanelOpen = useAppStore((s) => s.setRightPanelOpen);
  const activeTabId = useAppStore((s) => s.activeTabId);
  const conv = useChatStore((s) =>
    activeTabId ? s.conversations[activeTabId] : undefined
  );

  const hasArtifacts = (conv?.workspace.artifacts.length ?? 0) > 0;
  const started = !!conv?.started;
  const viewLabel = rightPanelView ? VIEW_LABELS[rightPanelView] : null;

  return (
    <div className="bg-surface border-l border-ws-border flex flex-col h-full w-full ws-fade-in">
      {/* Header tab strip */}
      <div className="h-9 border-b border-ws-border px-2 flex items-center gap-1 shrink-0">
        <div className="bg-card-ws text-[13px] text-foreground rounded-t-[10px] px-3 py-1.5 flex items-center gap-2 border border-b-0 border-ws-border-soft">
          <span>New tab</span>
          <button
            type="button"
            aria-label="Close panel"
            onClick={() => setRightPanelOpen(false)}
            className="size-[14px] rounded-[4px] flex items-center justify-center text-ws-secondary hover:text-foreground transition-colors duration-150 focus-ring"
          >
            <X className="size-3" />
          </button>
        </div>
        {viewLabel && (
          <span className="text-[12px] text-ws-secondary ml-1">{viewLabel}</span>
        )}
      </div>

      {/* Body */}
      {rightPanelView === null ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-1 p-4 overflow-y-auto ws-scroll">
          <NavItem
            label="Overview"
            icon={LayoutList}
            onClick={() => setRightPanelView("overview")}
            disabled={!started}
            disabledTooltip="Start a project first"
          />
          <NavItem
            label="Cloud browser"
            icon={Globe}
            onClick={() => setRightPanelView("browser")}
          />
          <NavItem
            label="Files"
            icon={Folder}
            onClick={() => setRightPanelView("files")}
          />
          <NavItem
            label="Terminal"
            icon={TerminalSquare}
            onClick={() => setRightPanelView("terminal")}
          />
          <NavItem
            label="Changes"
            icon={GitBranch}
            onClick={() => setRightPanelView("changes")}
          />
          <NavItem
            label="Artifacts"
            icon={FileCode2}
            onClick={() => setRightPanelView("artifacts")}
            disabled={!hasArtifacts}
            disabledTooltip="No artifacts yet"
          />
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="h-9 px-2 flex items-center gap-1 border-b border-ws-border shrink-0">
            <button
              type="button"
              aria-label="Back"
              onClick={() => setRightPanelView(null)}
              className="size-9 rounded-[8px] flex items-center justify-center text-ws-secondary hover:bg-hover hover:text-foreground transition-colors duration-150 focus-ring"
            >
              <ArrowLeft className="size-[18px]" />
            </button>
            {viewLabel && (
              <span className="text-[12px] text-ws-secondary">{viewLabel}</span>
            )}
          </div>
          <div className="flex-1 min-h-0 flex flex-col" key={activeTabId}>
            {rightPanelView === "overview" && <OverviewView conv={conv} />}
            {rightPanelView === "browser" && <BrowserView conv={conv} />}
            {rightPanelView === "files" && <FilesView conv={conv} />}
            {rightPanelView === "terminal" && <TerminalView conv={conv} />}
            {rightPanelView === "changes" && <ChangesView conv={conv} />}
            {rightPanelView === "artifacts" && <ArtifactsView conv={conv} />}
          </div>
        </div>
      )}
    </div>
  );
}
