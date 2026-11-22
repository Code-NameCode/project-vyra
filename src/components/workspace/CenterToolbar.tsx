"use client";

import type { ComponentType } from "react";
import { Folder, List, PanelRight, TerminalSquare } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAppStore } from "@/stores/useAppStore";
import { useChatStore } from "@/stores/useChatStore";
import { cn } from "@/lib/utils";

interface ToolButtonProps {
  label: string;
  icon: ComponentType<{ className?: string }>;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  disabledTooltip?: string;
}

function ToolButton({
  label,
  icon: Icon,
  onClick,
  active = false,
  disabled = false,
  disabledTooltip,
}: ToolButtonProps) {
  const tooltipText = disabled && disabledTooltip ? disabledTooltip : label;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          aria-label={label}
          aria-pressed={active}
          className={cn(
            "size-9 max-[639px]:size-8 rounded-[8px] flex items-center justify-center transition-colors duration-150 focus-ring",
            "text-ws-secondary hover:bg-hover hover:text-foreground",
            active && "border border-ws-border bg-hover text-foreground",
            disabled &&
              "text-ws-disabled hover:bg-transparent hover:text-ws-disabled cursor-not-allowed"
          )}
        >
          <Icon className="size-[18px] max-[639px]:size-[15px]" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{tooltipText}</TooltipContent>
    </Tooltip>
  );
}

export function CenterToolbar() {
  const rightPanelOpen = useAppStore((s) => s.rightPanelOpen);
  const rightTabs = useAppStore((s) => s.rightTabs);
  const rightActiveTab = useAppStore((s) => s.rightActiveTab);
  const openRightTab = useAppStore((s) => s.openRightTab);
  const toggleRightPanel = useAppStore((s) => s.toggleRightPanel);
  const activeTabId = useAppStore((s) => s.activeTabId);
  const conv = useChatStore((s) =>
    activeTabId ? s.conversations[activeTabId] : undefined
  );
  const started = !!conv?.started;

  const activeView = rightTabs[rightActiveTab];

  return (
    <div className="flex items-center gap-1">
      <ToolButton
        label="Overview"
        icon={List}
        onClick={() => openRightTab("overview")}
        active={rightPanelOpen && activeView === "overview"}
        disabled={!started}
        disabledTooltip="Start a project first"
      />
      <ToolButton
        label="Terminal"
        icon={TerminalSquare}
        onClick={() => openRightTab("terminal")}
        active={rightPanelOpen && activeView === "terminal"}
      />
      <ToolButton
        label="Files"
        icon={Folder}
        onClick={() => openRightTab("files")}
        active={rightPanelOpen && activeView === "files"}
      />
      <ToolButton
        label={rightPanelOpen ? "Close panel" : "Open panel"}
        icon={PanelRight}
        onClick={() => toggleRightPanel()}
        active={rightPanelOpen}
      />
    </div>
  );
}
