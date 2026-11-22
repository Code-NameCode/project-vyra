"use client";

import { Folder } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/useAppStore";
import { useProjectsStore } from "@/stores/useProjectsStore";
import { NewProjectDropdown } from "./NewProjectDropdown";
import { Composer } from "./Composer";
import { TemplateGallery } from "./TemplateGallery";

/**
 * HeroScreen — the centered home/hero column shown when a chat has not started.
 * When the active tab is a project workspace, shows a project badge above the
 * heading. Composes heading, NewProjectDropdown, Composer, TemplateGallery.
 * In chat mode, hides the project dropdown and template gallery.
 */
export function HeroScreen({ tabId }: { tabId: string }) {
  const mode = useAppStore((s) => s.mode);
  const projectId = useAppStore((s) =>
    s.tabs.find((t) => t.id === s.activeTabId)?.projectId
  );
  const project = useProjectsStore((s) =>
    projectId ? s.projects.find((p) => p.id === projectId) : undefined
  );

  return (
    <div
      className={cn(
        "mx-auto w-full max-w-[900px] flex flex-col items-center gap-5 pt-6",
        "ws-fade-in"
      )}
    >
      {project && (
        <div className="flex items-center gap-2 rounded-full border border-ws-border bg-card-ws px-3 py-1 text-[13px]">
          <Folder className="size-3.5 text-accent-hi" />
          <span className="max-w-[260px] truncate font-medium text-foreground">
            {project.name}
          </span>
          <span className="text-ws-disabled">·</span>
          <span className="text-ws-secondary">project</span>
        </div>
      )}

      <h1 className="text-[28px] font-semibold tracking-tight text-foreground text-center">
        What can I help build?
      </h1>

      {mode === "code" && !project && <NewProjectDropdown />}

      <Composer tabId={tabId} />

      {mode === "code" && !project && <TemplateGallery />}
    </div>
  );
}
