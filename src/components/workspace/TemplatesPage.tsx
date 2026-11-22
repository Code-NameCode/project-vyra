"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import templatesData from "@/data/templates.json";
import type { TemplateDef } from "@/lib/types";
import { useChatStore } from "@/stores/useChatStore";
import { ThumbnailArt } from "./ThumbnailArt";

const TEMPLATES = templatesData as TemplateDef[];

type FilterKey =
  | "Featured"
  | "All"
  | "Landing pages"
  | "Stores"
  | "Portfolio"
  | "Games"
  | "SaaS"
  | "Starters";

const FILTERS: FilterKey[] = [
  "Featured",
  "All",
  "Landing pages",
  "Stores",
  "Portfolio",
  "Games",
  "SaaS",
  "Starters",
];

export function TemplatesPage() {
  const [filter, setFilter] = useState<FilterKey>("Featured");

  const filtered = useMemo(() => {
    switch (filter) {
      case "Featured":
        return TEMPLATES.filter((t) => t.featured);
      case "All":
        return TEMPLATES;
      default:
        return TEMPLATES.filter((t) => t.category === filter);
    }
  }, [filter]);

  const handlePick = (t: TemplateDef) => {
    // creates a project (with its own workspace) + opens a project tab
    // prefilled with the template prompt
    useChatStore.getState().startFromTemplate(t.prompt, t.title, t.id);
    toast.success("Template loaded");
  };

  return (
    <div className="flex h-full flex-col">
      <header className="shrink-0 border-b border-ws-border px-6 py-4">
        <h1 className="text-[20px] font-semibold text-foreground">Templates</h1>
        <p className="text-[13px] text-ws-secondary">
          Start a project from a template
        </p>
        <div className="flex flex-wrap items-center gap-2 mt-3">
          {FILTERS.map((f) => {
            const active = filter === f;
            return (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={cn(
                  "rounded-[8px] px-3 py-1 text-[12px] border transition-colors duration-150 focus-ring",
                  active
                    ? "bg-foreground text-background border-transparent"
                    : "text-ws-secondary border-ws-border hover:bg-hover"
                )}
              >
                {f}
              </button>
            );
          })}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto ws-scroll px-6 py-5">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-[13px] text-ws-secondary">
              No templates in this category.
            </p>
          </div>
        ) : (
          <div className="ws-fade-in grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-[1100px] mx-auto">
            {filtered.map((t) => (
              <div
                key={t.id}
                role="button"
                tabIndex={0}
                onClick={() => handlePick(t)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handlePick(t);
                  }
                }}
                className="rounded-[12px] border border-ws-border bg-card-ws overflow-hidden hover:border-ws-border-soft hover:bg-hover cursor-pointer transition-colors duration-150 focus-ring"
              >
                <ThumbnailArt thumbKey={t.thumbKey} />
                <div className="p-3">
                  <div className="text-[14px] font-medium text-foreground">
                    {t.title}
                  </div>
                  <div className="text-[11px] text-ws-secondary uppercase tracking-wide">
                    {t.category}
                  </div>
                  <div className="text-[12px] text-ws-disabled line-clamp-2 mt-1.5">
                    {t.prompt}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
