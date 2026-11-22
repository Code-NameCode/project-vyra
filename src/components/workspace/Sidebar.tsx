"use client";

import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ChevronRight,
  Folder,
  FolderPlus,
  History,
  Hourglass,
  PanelLeftClose,
  Search,
  SquarePen,
} from "lucide-react";
import { toast } from "sonner";
import { useAppStore } from "@/stores/useAppStore";
import { formatHours, useAccountStore } from "@/stores/useAccountStore";
import { useProjectsStore } from "@/stores/useProjectsStore";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ForgeLogo } from "./ForgeLogo";

/**
 * Sidebar — 320px (w-80) inner content panel, right of IconRail.
 * Parent layout controls collapse (conditionally renders) and mobile (Sheet).
 * Renders header, quick actions, and a clickable projects/legacy list.
 */
export function Sidebar() {
  const newChatTab = useAppStore((s) => s.newChatTab);
  const setSearchOpen = useAppStore((s) => s.setSearchOpen);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  const openProject = useAppStore((s) => s.openProject);
  const setRailPage = useAppStore((s) => s.setRailPage);

  const dailyHoursMs = useAccountStore((s) => s.dailyHoursMs);

  const projects = useProjectsStore((s) => s.projects);
  const legacy = useProjectsStore((s) => s.legacy);
  const addProject = useProjectsStore((s) => s.addProject);
  const activeProjectId = useAppStore((s) =>
    s.tabs.find((t) => t.id === s.activeTabId)?.projectId
  );

  const [legacyOpen, setLegacyOpen] = useState(false);

  const handleNewProject = () => {
    const id = addProject("New project");
    openProject(id, "New project");
    toast.success("Project created");
  };

  return (
    <aside className="flex h-full w-80 shrink-0 flex-col border-r border-ws-border bg-surface p-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <ForgeLogo size={24} />
        <div className="flex items-center gap-1">
          <IconButton aria-label="Search" onClick={() => setSearchOpen(true)}>
            <Search className="size-4" />
          </IconButton>
          <IconButton aria-label="Collapse sidebar" onClick={() => toggleSidebar()}>
            <PanelLeftClose className="size-4" />
          </IconButton>
        </div>
      </div>

      {/* Quick actions */}
      <div className="mt-3 flex flex-col gap-0.5">
        <MenuRow icon={SquarePen} label="New chat" onClick={() => newChatTab()} />
        <MenuRow
          icon={FolderPlus}
          label="New project"
          onClick={handleNewProject}
        />
        <MenuRow
          icon={Hourglass}
          label="Daily hours"
          trailing={
            <span className="rounded-full border border-accent-fill/30 bg-accent-fill/15 px-2 py-0.5 text-[11px] font-medium text-accent-hi">
              {formatHours(dailyHoursMs)}
            </span>
          }
        />
      </div>

      {/* Projects section */}
      <div className="mt-4 mb-1 flex items-center justify-between px-2">
        <button
          type="button"
          onClick={() => setRailPage("projects")}
          className="focus-ring -mx-1 rounded-[4px] px-1 text-[12px] uppercase tracking-wide text-ws-secondary transition-colors hover:text-foreground"
        >
          Projects
        </button>
        {projects.length > 0 && (
          <button
            type="button"
            onClick={() => setRailPage("projects")}
            className="focus-ring -mx-1 rounded-[4px] px-1 text-[11px] text-ws-disabled transition-colors hover:text-foreground"
          >
            Manage
          </button>
        )}
      </div>

      <div className="ws-scroll -mx-1 flex max-h-[min(40vh,280px)] flex-col gap-0.5 overflow-y-auto px-1">
        {projects.length === 0 ? (
          <p className="px-2 py-1 text-[13px] text-ws-disabled">
            Start your first project.
          </p>
        ) : (
          projects.map((p) => {
            const active = p.id === activeProjectId;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => openProject(p.id, p.name)}
                title={p.name}
                className={cn(
                  "focus-ring flex items-center gap-2 rounded-[6px] px-2 py-1.5 text-left text-[13px] transition-colors duration-150 hover:bg-hover",
                  active
                    ? "bg-hover text-foreground"
                    : "text-ws-secondary hover:text-foreground"
                )}
              >
                <Folder
                  className={cn(
                    "size-3.5 shrink-0",
                    active ? "text-accent-hi" : "text-ws-disabled"
                  )}
                />
                <span className="truncate">{p.name}</span>
              </button>
            );
          })
        )}
      </div>

      {/* Legacy collapsible */}
      <Collapsible open={legacyOpen} onOpenChange={setLegacyOpen} className="mt-1">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            aria-expanded={legacyOpen}
            className="focus-ring flex w-full items-center gap-1.5 rounded-[6px] px-2 py-1 text-[13px] text-ws-secondary transition-colors duration-150 hover:bg-hover hover:text-foreground"
          >
            <ChevronRight
              className={cn(
                "size-3.5 shrink-0 transition-transform duration-150",
                legacyOpen && "rotate-90"
              )}
            />
            <History className="size-3.5 shrink-0 text-ws-disabled" />
            <span>Legacy</span>
            <span className="ml-auto text-[12px] text-ws-disabled">
              {legacy.length}
            </span>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-0.5 flex flex-col gap-0.5">
            {legacy.map((l) => (
              <button
                key={l.id}
                type="button"
                className="focus-ring flex items-center rounded-[6px] px-2 py-1 text-left text-[13px] text-ws-secondary transition-colors duration-150 hover:bg-hover hover:text-foreground"
              >
                <span className="truncate">{l.title}</span>
              </button>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* hint pinned to bottom */}
      <div className="mt-auto px-2 pt-3 text-[11px] text-ws-disabled">
        Press{" "}
        <kbd className="rounded-[4px] border border-ws-border bg-card-ws px-1 py-0.5 font-mono text-[10px] text-ws-secondary">
          ⌘K
        </kbd>{" "}
        to search
      </div>
    </aside>
  );
}

/* ---------- small internal helpers ---------- */

interface IconButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  "aria-label": string;
}

function IconButton({ children, onClick, "aria-label": ariaLabel }: IconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="focus-ring flex size-8 items-center justify-center rounded-[8px] text-ws-secondary transition-colors duration-150 hover:bg-hover hover:text-foreground"
    >
      {children}
    </button>
  );
}

interface MenuRowProps {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  trailing?: React.ReactNode;
}

function MenuRow({ icon: Icon, label, onClick, trailing }: MenuRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="focus-ring flex h-10 items-center gap-2.5 rounded-[8px] px-2.5 text-[15px] text-foreground transition-colors duration-150 hover:bg-hover"
    >
      <Icon className="size-4 shrink-0 text-ws-secondary" />
      <span className="truncate">{label}</span>
      {trailing && <span className="ml-auto shrink-0">{trailing}</span>}
    </button>
  );
}
