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
  TrendingUp,
  UserPlus,
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
 * This component renders header, quick actions, projects/legacy list, and
 * a pinned bottom invite row.
 */
export function Sidebar() {
  const newChatTab = useAppStore((s) => s.newChatTab);
  const setSearchOpen = useAppStore((s) => s.setSearchOpen);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  const setUpgradeOpen = useAppStore((s) => s.setUpgradeOpen);
  const setInviteOpen = useAppStore((s) => s.setInviteOpen);

  const dailyHoursMs = useAccountStore((s) => s.dailyHoursMs);
  const referralCount = useAccountStore((s) => s.referralCount);
  const referralTarget = useAccountStore((s) => s.referralTarget);

  const projects = useProjectsStore((s) => s.projects);
  const legacy = useProjectsStore((s) => s.legacy);
  const addProject = useProjectsStore((s) => s.addProject);

  const [legacyOpen, setLegacyOpen] = useState(false);

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
          onClick={() => {
            addProject("New project");
            toast.success("Project created");
          }}
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
        <MenuRow
          icon={TrendingUp}
          label="Get 7x usage for $8"
          muted
          onClick={() => setUpgradeOpen(true)}
        />
      </div>
      <h2 className="mt-4 mb-1 px-2 text-[12px] uppercase tracking-wide text-ws-secondary">
        Projects
      </h2>

      {projects.length === 0 ? (
        <p className="px-2 text-[13px] text-ws-disabled">
          Start your first project.
        </p>
      ) : (
        <div className="flex flex-col gap-0.5">
          {projects.map((p) => (
            <button
              key={p.id}
              type="button"
              className="focus-ring flex items-center gap-2 rounded-[6px] px-2 py-1 text-left text-[13px] text-ws-secondary transition-colors duration-150 hover:bg-hover hover:text-foreground"
            >
              <Folder className="size-3.5 shrink-0 text-ws-disabled" />
              <span className="truncate">{p.name}</span>
            </button>
          ))}
        </div>
      )}

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

      {/* Bottom pinned */}
      <div className="mt-auto flex flex-col gap-0.5 border-t border-ws-border pt-3">
        <button
          type="button"
          onClick={() => setInviteOpen(true)}
          className="focus-ring flex items-center gap-2 rounded-[8px] px-2.5 py-2 text-[13px] text-foreground transition-colors duration-150 hover:bg-hover"
        >
          <UserPlus className="size-4 shrink-0 text-ws-secondary" />
          <span>Invite friends</span>
          <span className="ml-auto text-[12px] text-ws-secondary">
            {referralCount}/{referralTarget}
          </span>
        </button>
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
  muted?: boolean;
}

function MenuRow({ icon: Icon, label, onClick, trailing, muted }: MenuRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "focus-ring flex h-10 items-center gap-2.5 rounded-[8px] px-2.5 text-[15px] transition-colors duration-150 hover:bg-hover",
        muted ? "text-ws-secondary hover:text-foreground" : "text-foreground"
      )}
    >
      <Icon className="size-4 shrink-0 text-ws-secondary" />
      <span className="truncate">{label}</span>
      {trailing && <span className="ml-auto shrink-0">{trailing}</span>}
    </button>
  );
}
