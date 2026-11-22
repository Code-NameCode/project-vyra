"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import templatesData from "@/data/templates.json";
import type { TemplateDef } from "@/lib/types";
import { useAppStore } from "@/stores/useAppStore";
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

/**
 * TemplateGallery — horizontal scrollable row of template cards with a
 * category filter and left/right scroll arrows.
 */
export function TemplateGallery() {
  const [filter, setFilter] = React.useState<FilterKey>("Featured");
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const filtered = React.useMemo(() => {
    switch (filter) {
      case "Featured":
        return TEMPLATES.filter((t) => t.featured);
      case "All":
        return TEMPLATES;
      default:
        return TEMPLATES.filter((t) => t.category === filter);
    }
  }, [filter]);

  const scrollBy = (dx: number) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dx, behavior: "smooth" });
  };

  const handlePick = (t: TemplateDef) => {
    const activeTabId = useAppStore.getState().activeTabId;
    if (!activeTabId) {
      toast.error("No active tab");
      return;
    }
    useChatStore.getState().prefillFromTemplate(
      activeTabId,
      t.prompt,
      t.title,
      t.id
    );
    toast.success("Template loaded");
  };

  return (
    <div className="w-full">
      {/* header row: label + filter chips + arrows */}
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[13px] text-ws-secondary mr-1">
            Start with a template
          </span>
          {FILTERS.map((f) => {
            const active = filter === f;
            return (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={cn(
                  "rounded-[8px] px-3 py-1 text-[12px] border transition-colors",
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

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            aria-label="Scroll left"
            onClick={() => scrollBy(-320)}
            className={cn(
              "inline-flex items-center justify-center size-8",
              "rounded-[8px] border border-ws-border hover:bg-hover",
              "text-ws-secondary transition-colors focus-ring"
            )}
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Scroll right"
            onClick={() => scrollBy(320)}
            className={cn(
              "inline-flex items-center justify-center size-8",
              "rounded-[8px] border border-ws-border hover:bg-hover",
              "text-ws-secondary transition-colors focus-ring"
            )}
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      {/* card row */}
      <div className="relative">
        <div
          ref={scrollRef}
          className={cn(
            "flex gap-3 overflow-x-auto no-scrollbar fade-right",
            "pb-1"
          )}
        >
          {filtered.length === 0 && (
            <div className="text-[13px] text-ws-disabled py-6 px-1">
              No templates in this category.
            </div>
          )}
          {filtered.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => handlePick(t)}
              className={cn(
                "w-[145px] h-[130px] shrink-0",
                "rounded-[10px] border border-ws-border bg-card-ws",
                "overflow-hidden cursor-pointer text-left",
                "hover:border-ws-border-soft hover:bg-hover transition-colors",
                "focus-ring"
              )}
            >
              <ThumbnailArt thumbKey={t.thumbKey} />
              <div className="text-[13px] font-medium text-foreground px-2 py-1.5 truncate">
                {t.title}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
