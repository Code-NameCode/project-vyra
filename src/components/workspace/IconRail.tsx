"use client";

import type { LucideIcon } from "lucide-react";
import { Boxes, CircleHelp, Home, Layers, LayoutGrid, Settings } from "lucide-react";
import { useAppStore } from "@/stores/useAppStore";
import type { RailPage } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface RailItemDef {
  key: string;
  label: string;
  icon: LucideIcon;
  page?: RailPage;
  action?: () => void;
}

/**
 * IconRail — far-left 66px vertical rail inside the main container.
 * Top→bottom: Home, Sessions, Templates, Extensions, Settings (opens modal).
 * Bottom: Help + user avatar.
 */
export function IconRail() {
  const railPage = useAppStore((s) => s.railPage);
  const setRailPage = useAppStore((s) => s.setRailPage);
  const setSettingsOpen = useAppStore((s) => s.setSettingsOpen);

  const items: RailItemDef[] = [
    { key: "home", label: "Home", icon: Home, page: "home" },
    { key: "sessions", label: "Sessions", icon: Layers, page: "sessions" },
    { key: "templates", label: "Templates", icon: LayoutGrid, page: "templates" },
    { key: "extensions", label: "Extensions", icon: Boxes, page: "extensions" },
    { key: "settings", label: "Settings", icon: Settings, action: () => setSettingsOpen(true) },
  ];

  return (
    <TooltipProvider delayDuration={200}>
      <nav
        aria-label="Primary navigation"
        className="flex h-full w-[66px] shrink-0 flex-col items-center gap-2 border-r border-ws-border bg-surface py-3"
      >
        {items.map((item) => {
          const active = item.page != null && railPage === item.page;
          const Icon = item.icon;
          const handleClick = () => {
            if (item.action) item.action();
            else if (item.page) setRailPage(item.page);
          };
          return (
            <Tooltip key={item.key}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={handleClick}
                  aria-label={item.label}
                  aria-pressed={active}
                  className={cn(
                    "focus-ring flex size-11 items-center justify-center rounded-[10px] text-ws-secondary transition-colors duration-150",
                    "hover:bg-hover hover:text-foreground",
                    active && "border border-ws-border bg-card-ws text-foreground"
                  )}
                >
                  <Icon className="size-[18px]" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">{item.label}</TooltipContent>
            </Tooltip>
          );
        })}

        <div className="mt-auto flex flex-col items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label="Help"
                className="focus-ring flex size-11 items-center justify-center rounded-[10px] text-ws-secondary transition-colors duration-150 hover:bg-hover hover:text-foreground"
              >
                <CircleHelp className="size-[18px]" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Help</TooltipContent>
          </Tooltip>

          <Avatar className="size-11 rounded-[10px] bg-accent-fill">
            <AvatarFallback className="rounded-[10px] bg-accent-fill text-[15px] font-semibold text-white">
              G
            </AvatarFallback>
          </Avatar>
        </div>
      </nav>
    </TooltipProvider>
  );
}
