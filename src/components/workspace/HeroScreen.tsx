"use client";

import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/useAppStore";
import { StreakBanner } from "./StreakBanner";
import { NewProjectDropdown } from "./NewProjectDropdown";
import { Composer } from "./Composer";
import { TemplateGallery } from "./TemplateGallery";

/**
 * HeroScreen — the centered home/hero column shown when a chat has not started.
 * Composes StreakBanner, heading, NewProjectDropdown, Composer, TemplateGallery.
 * In chat mode, hides the project dropdown and template gallery.
 */
export function HeroScreen({ tabId }: { tabId: string }) {
  const mode = useAppStore((s) => s.mode);

  return (
    <div
      className={cn(
        "mx-auto w-full max-w-[900px] flex flex-col items-center gap-5 pt-6",
        "ws-fade-in"
      )}
    >
      <StreakBanner />

      <h1 className="text-[28px] font-semibold tracking-tight text-foreground text-center">
        What can I help build?
      </h1>

      {mode === "code" && <NewProjectDropdown />}

      <Composer tabId={tabId} />

      {mode === "code" && <TemplateGallery />}
    </div>
  );
}
