"use client";

import { ChevronDown, FilePlus, FolderOpen, Github, LayoutTemplate, Plus } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAppStore } from "@/stores/useAppStore";
import { useProjectsStore } from "@/stores/useProjectsStore";

/**
 * NewProjectDropdown — the centered "+ New project" outlined pill button.
 */
export function NewProjectDropdown() {
  const addProject = useProjectsStore((s) => s.addProject);
  const openProject = useAppStore((s) => s.openProject);
  const setRailPage = useAppStore((s) => s.setRailPage);

  const handleBlank = () => {
    const id = addProject("Untitled project");
    openProject(id, "Untitled project");
    toast.success("Project created");
  };

  const handleTemplate = () => {
    setRailPage("templates");
  };

  const handleComingSoon = (label: string) => {
    toast.info(`${label} — coming soon`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-2 h-9 px-4 rounded-full",
            "border border-ws-border bg-card-ws text-[14px] text-foreground",
            "hover:bg-hover transition-colors focus-ring"
          )}
        >
          <Plus className="size-4" />
          <span>New project</span>
          <ChevronDown className="size-3.5 text-ws-secondary" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="center"
        sideOffset={6}
        className={cn(
          "min-w-[200px] p-1 rounded-[10px]",
          "bg-popover border border-ws-border"
        )}
      >
        <DropdownMenuItem
          onSelect={handleBlank}
          className="text-[13px] rounded-[8px] px-2.5 py-2 focus:bg-hover"
        >
          <FilePlus className="size-4 text-ws-secondary" />
          Blank project
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={handleTemplate}
          className="text-[13px] rounded-[8px] px-2.5 py-2 focus:bg-hover"
        >
          <LayoutTemplate className="size-4 text-ws-secondary" />
          From template
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => handleComingSoon("Import from GitHub")}
          className="text-[13px] rounded-[8px] px-2.5 py-2 focus:bg-hover"
        >
          <Github className="size-4 text-ws-secondary" />
          Import from GitHub
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => handleComingSoon("Open local folder")}
          className="text-[13px] rounded-[8px] px-2.5 py-2 focus:bg-hover"
        >
          <FolderOpen className="size-4 text-ws-secondary" />
          Open local folder
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
