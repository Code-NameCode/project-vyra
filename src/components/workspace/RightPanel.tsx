"use client";

import type { ComponentType } from "react";
import {
  FileCode2,
  Folder,
  GitBranch,
  Globe,
  LayoutList,
  Plus,
  TerminalSquare,
  X,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAppStore } from "@/stores/useAppStore";
import { useChatStore } from "@/stores/useChatStore";
import { useProjectsStore } from "@/stores/useProjectsStore";
import { cn } from "@/lib/utils";
import type { Conversation, RightPanelView } from "@/lib/types";
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

type ViewIcon = ComponentType<{ className?: string }>;

const VIEW_META: { view: RightPanelView; label: string; icon: ViewIcon }[] = [
  { view: "overview", label: VIEW_LABELS.overview, icon: LayoutList },
  { view: "browser", label: VIEW_LABELS.browser, icon: Globe },
  { view: "files", label: VIEW_LABELS.files, icon: Folder },
  { view: "terminal", label: VIEW_LABELS.terminal, icon: TerminalSquare },
  { view: "changes", label: VIEW_LABELS.changes, icon: GitBranch },
  { view: "artifacts", label: VIEW_LABELS.artifacts, icon: FileCode2 },
];

const VIEW_ICONS: Record<RightPanelView, ViewIcon> = {
  overview: LayoutList,
  browser: Globe,
  files: Folder,
  terminal: TerminalSquare,
  changes: GitBranch,
  artifacts: FileCode2,
};

interface NavItemProps {
  label: string;
  icon: ViewIcon;
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
      tabIndex={disabled ? -1 : 0}
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
  // tab system
  const rightTabs = useAppStore((s) => s.rightTabs);
  const rightActiveTab = useAppStore((s) => s.rightActiveTab);
  const openRightTab = useAppStore((s) => s.openRightTab);
  const closeRightTab = useAppStore((s) => s.closeRightTab);
  const setRightActiveTab = useAppStore((s) => s.setRightActiveTab);
  const setRightPanelOpen = useAppStore((s) => s.setRightPanelOpen);

  // chat / projects context (kept identical to the previous effectiveConv logic)
  const activeTabId = useAppStore((s) => s.activeTabId);
  const projectId = useAppStore((s) =>
    s.tabs.find((t) => t.id === s.activeTabId)?.projectId
  );
  const conv = useChatStore((s) =>
    activeTabId ? s.conversations[activeTabId] : undefined
  );
  const projectWorkspace = useProjectsStore((s) =>
    projectId
      ? s.projects.find((p) => p.id === projectId)?.workspace
      : undefined
  );

  // surface the linked project's workspace (files/terminal/changes) when a
  // project tab is active, while keeping the conversation's steps/messages.
  const effectiveConv: Conversation | undefined =
    projectId && projectWorkspace && conv
      ? { ...conv, workspace: projectWorkspace }
      : conv;

  const hasArtifacts = (effectiveConv?.workspace.artifacts.length ?? 0) > 0;
  const started = !!effectiveConv?.started;

  const activeView: RightPanelView | undefined = rightTabs[rightActiveTab];
  const isEmpty = rightTabs.length === 0;

  const renderView = (view: RightPanelView) => {
    switch (view) {
      case "overview":
        return <OverviewView conv={effectiveConv} />;
      case "browser":
        return <BrowserView conv={effectiveConv} />;
      case "files":
        return <FilesView conv={effectiveConv} />;
      case "terminal":
        return <TerminalView conv={effectiveConv} />;
      case "changes":
        return <ChangesView conv={effectiveConv} />;
      case "artifacts":
        return <ArtifactsView conv={effectiveConv} />;
    }
  };

  return (
    <div className="bg-surface border-l border-ws-border flex flex-col h-full w-full ws-fade-in">
      {/* Header tab strip */}
      <div className="shrink-0 border-b border-ws-border h-9 flex items-center gap-0.5 px-1.5">
        {rightTabs.map((view, index) => {
          const Icon = VIEW_ICONS[view];
          const isActive = index === rightActiveTab;
          return (
            <div
              key={`${view}-${index}`}
              role="tab"
              aria-selected={isActive}
              tabIndex={0}
              onClick={() => setRightActiveTab(index)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setRightActiveTab(index);
                }
              }}
              className={cn(
                "inline-flex items-center gap-1.5 h-7 px-2 rounded-[6px] text-[12px] transition-colors duration-150 max-w-[140px] cursor-default focus-ring",
                isActive
                  ? "bg-hover text-foreground"
                  : "text-ws-secondary hover:bg-hover hover:text-foreground"
              )}
            >
              <Icon className="size-[13px] shrink-0" />
              <span className="truncate">{VIEW_LABELS[view]}</span>
              <button
                type="button"
                aria-label="Close tab"
                onClick={(e) => {
                  e.stopPropagation();
                  closeRightTab(index);
                }}
                tabIndex={-1}
                className="size-3 flex items-center justify-center rounded-[4px] text-ws-secondary hover:text-foreground transition-colors duration-150 focus-ring"
              >
                <X className="size-3" />
              </button>
            </div>
          );
        })}

        {/* Add-tab dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Add tab"
              tabIndex={0}
              className="size-7 rounded-[6px] text-ws-secondary hover:bg-hover hover:text-foreground transition-colors duration-150 focus-ring flex items-center justify-center"
            >
              <Plus className="size-[14px]" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" sideOffset={4}>
            {VIEW_META.map(({ view, label, icon: Icon }) => {
              const disabled =
                (view === "overview" && !started) ||
                (view === "artifacts" && !hasArtifacts);
              return (
                <DropdownMenuItem
                  key={view}
                  disabled={disabled}
                  onSelect={() => openRightTab(view)}
                  className={cn(
                    "flex items-center gap-2 text-[13px]",
                    disabled && "text-ws-disabled"
                  )}
                >
                  <Icon className="size-4 text-ws-secondary" />
                  <span>{label}</span>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Close-panel button */}
        <button
          type="button"
          aria-label="Close panel"
          onClick={() => setRightPanelOpen(false)}
          tabIndex={0}
          className="ml-auto size-7 rounded-[6px] text-ws-secondary hover:bg-hover hover:text-foreground transition-colors duration-150 focus-ring flex items-center justify-center"
        >
          <X className="size-[14px]" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 flex flex-col">
        {isEmpty ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-1 p-4 overflow-y-auto ws-scroll">
            <NavItem
              label="Overview"
              icon={LayoutList}
              onClick={() => openRightTab("overview")}
              disabled={!started}
              disabledTooltip="Start a project first"
            />
            <NavItem
              label="Browser"
              icon={Globe}
              onClick={() => openRightTab("browser")}
            />
            <NavItem
              label="Files"
              icon={Folder}
              onClick={() => openRightTab("files")}
            />
            <NavItem
              label="Terminal"
              icon={TerminalSquare}
              onClick={() => openRightTab("terminal")}
            />
            <NavItem
              label="Changes"
              icon={GitBranch}
              onClick={() => openRightTab("changes")}
            />
            <NavItem
              label="Artifacts"
              icon={FileCode2}
              onClick={() => openRightTab("artifacts")}
              disabled={!hasArtifacts}
              disabledTooltip="No artifacts yet"
            />
          </div>
        ) : (
          activeView && (
            <div
              key={`${activeTabId}-${activeView}`}
              className="flex-1 min-h-0 flex flex-col"
            >
              {renderView(activeView)}
            </div>
          )
        )}
      </div>
    </div>
  );
}
