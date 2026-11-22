"use client";

import { FolderKanban, Home, Layers, LayoutGrid, Settings, Workflow } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAppStore } from "@/stores/useAppStore";
import type { RailPage } from "@/lib/types";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  icon: LucideIcon;
  page: RailPage;
  action?: () => void;
}

export function MobileNav() {
  const railPage = useAppStore((s) => s.railPage);
  const setRailPage = useAppStore((s) => s.setRailPage);
  const setSettingsOpen = useAppStore((s) => s.setSettingsOpen);

  const items: NavItem[] = [
    { label: "Home", icon: Home, page: "home" },
    { label: "Sessions", icon: Layers, page: "sessions" },
    { label: "Projects", icon: FolderKanban, page: "projects" },
    { label: "Tasks", icon: Workflow, page: "tasks" },
    { label: "Templates", icon: LayoutGrid, page: "templates" },
    {
      label: "Settings",
      icon: Settings,
      page: "settings",
      action: () => setSettingsOpen(true),
    },
  ];

  return (
    <nav
      aria-label="Mobile navigation"
      className={cn(
        "min-[640px]:hidden shrink-0 h-[54px] flex items-center justify-around",
        "border-t border-ws-border bg-surface px-2"
      )}
    >
      {items.map((item) => {
        const active = !item.action && railPage === item.page;
        const Icon = item.icon;
        return (
          <button
            key={item.label}
            type="button"
            onClick={() => {
              if (item.action) item.action();
              else setRailPage(item.page);
            }}
            aria-label={item.label}
            aria-pressed={active}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 rounded-[8px] px-3 py-1 transition-colors duration-150",
              active
                ? "text-accent-hi"
                : "text-ws-secondary hover:text-foreground"
            )}
          >
            <Icon className="size-[20px]" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
