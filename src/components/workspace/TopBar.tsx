"use client";

import { Code2, MessageSquare, Plus, X } from "lucide-react";
import { useAppStore } from "@/stores/useAppStore";
import { cn } from "@/lib/utils";

/**
 * TopBar — full-width 56px bar sitting ABOVE the main rounded container.
 * Left: segmented "Code | Chat" toggle pill.
 * Center: horizontally scrollable browser-style tab strip + new-tab "+".
 * Right: empty spacer (avatar lives in IconRail).
 */
export function TopBar() {
  const mode = useAppStore((s) => s.mode);
  const toggleMode = useAppStore((s) => s.toggleMode);
  const tabs = useAppStore((s) => s.tabs);
  const activeTabId = useAppStore((s) => s.activeTabId);
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const closeTab = useAppStore((s) => s.closeTab);
  const newChatTab = useAppStore((s) => s.newChatTab);

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 bg-page px-2.5">
      {/* Segmented Code | Chat toggle pill */}
      <div
        role="group"
        aria-label="Workspace mode"
        className="flex shrink-0 items-center gap-1 rounded-[8px] border border-ws-border bg-surface p-1"
      >
        <ToggleButton
          active={mode === "code"}
          onClick={() => {
            if (mode !== "code") toggleMode();
          }}
          label="Code"
        >
          <Code2 className="size-3.5" />
        </ToggleButton>
        <ToggleButton
          active={mode === "chat"}
          onClick={() => {
            if (mode !== "chat") toggleMode();
          }}
          label="Chat"
        >
          <MessageSquare className="size-3.5" />
        </ToggleButton>
      </div>

      {/* Browser-style tab strip */}
      <div className="ws-scroll no-scrollbar flex min-w-0 flex-1 items-end gap-1 overflow-x-auto">
        {tabs.map((tab) => {
          const active = tab.id === activeTabId;
          return (
            <div
              key={tab.id}
              role="tab"
              tabIndex={0}
              aria-selected={active}
              onClick={() => setActiveTab(tab.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setActiveTab(tab.id);
                }
              }}
              className={cn(
                "focus-ring group flex h-9 max-w-[160px] shrink-0 cursor-pointer items-center gap-2 rounded-t-[10px] border-b-2 px-3 transition-colors duration-150",
                active
                  ? "border-b-transparent bg-surface text-foreground"
                  : "border-b-transparent text-ws-secondary hover:bg-hover hover:text-foreground"
              )}
            >
              <span className="truncate text-[13px] leading-none">
                {tab.title || "Untitled"}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
                aria-label={`Close tab ${tab.title || "Untitled"}`}
                className={cn(
                  "focus-ring -mr-1 flex size-5 shrink-0 items-center justify-center rounded-[6px] text-ws-secondary transition-opacity duration-150 hover:bg-hover hover:text-foreground",
                  "opacity-0 group-hover:opacity-100",
                  active && "opacity-60"
                )}
              >
                <X className="size-3.5" />
              </button>
            </div>
          );
        })}

        <button
          type="button"
          onClick={() => newChatTab()}
          aria-label="New chat tab"
          className="focus-ring flex size-9 shrink-0 items-center justify-center rounded-[8px] text-ws-secondary transition-colors duration-150 hover:bg-hover hover:text-foreground"
        >
          <Plus className="size-4" />
        </button>
      </div>
    </header>
  );
}

interface ToggleButtonProps {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}

function ToggleButton({ active, onClick, label, children }: ToggleButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "focus-ring flex h-7 items-center gap-1.5 rounded-[6px] px-2.5 text-[13px] font-medium transition-colors duration-150",
        active
          ? "bg-accent-fill text-white"
          : "text-ws-secondary hover:text-foreground"
      )}
    >
      {children}
      {label}
    </button>
  );
}
