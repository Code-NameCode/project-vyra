"use client";

import * as React from "react";
import { Check, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import modelsData from "@/data/models.json";
import type { ModelDef } from "@/lib/types";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useChatStore } from "@/stores/useChatStore";
import { useSettingsStore } from "@/stores/useSettingsStore";

const MODELS = modelsData as ModelDef[];

function modelById(id: string): ModelDef | undefined {
  return MODELS.find((m) => m.id === id);
}

function MultiplierBadge({ multiplier }: { multiplier: number }) {
  let cls = "text-ws-secondary border-ws-border";
  let label = `${multiplier}x`;
  if (multiplier === 0) {
    cls = "text-accent-hi border-accent-fill/30 bg-accent-fill/10";
    label = "Unlimited";
  } else if (multiplier === 1) {
    cls = "text-ws-secondary border-ws-border";
    label = "1x";
  } else if (multiplier === 3) {
    cls = "text-streak border-streak/30 bg-streak/10";
    label = "3x";
  } else if (multiplier === 5) {
    cls = "text-streak border-streak/30 bg-streak/10";
    label = "5x";
  }
  return (
    <span
      className={cn(
        "text-[11px] rounded-full px-1.5 py-0.5 border whitespace-nowrap shrink-0",
        cls
      )}
    >
      {label}
    </span>
  );
}

/**
 * ModelPicker — a popover that lets the user switch the active model.
 * Controlled open state so callers (e.g. Composer slash command) can open it.
 */
export function ModelPicker({
  tabId,
  open,
  onOpenChange,
}: {
  tabId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const convModelId = useChatStore((s) => s.conversations[tabId]?.modelId);
  const defaultModelId = useSettingsStore((s) => s.defaultModelId);
  const setModel = useChatStore((s) => s.setModel);
  const setDefaultModelId = useSettingsStore((s) => s.setDefaultModelId);

  const modelId = convModelId ?? defaultModelId;
  const current = modelById(modelId) ?? MODELS[0];

  const standard = MODELS.filter((m) => m.multiplier > 0);
  const unlimited = MODELS.filter((m) => m.multiplier === 0);

  const handleSelect = (id: string) => {
    setModel(tabId, id);
    setDefaultModelId(id);
    onOpenChange(false);
  };

  const renderRow = (m: ModelDef) => {
    const selected = m.id === modelId;
    return (
      <button
        type="button"
        key={m.id}
        onClick={() => handleSelect(m.id)}
        className={cn(
          "w-full rounded-[8px] px-2.5 py-2 hover:bg-hover cursor-pointer",
          "flex items-start gap-2 text-left transition-colors",
          selected && "bg-hover"
        )}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[13px] font-medium text-foreground truncate">
              {m.name}
            </span>
            <span className="text-[11px] text-ws-secondary shrink-0">
              {m.contextWindow}
            </span>
          </div>
          <div className="text-[12px] text-ws-secondary line-clamp-1">
            {m.description}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <MultiplierBadge multiplier={m.multiplier} />
          {selected && <Check className="size-3.5 text-accent-hi shrink-0" />}
        </div>
      </button>
    );
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1.5 h-7 px-2.5 rounded-[8px]",
            "border border-ws-border bg-card-ws text-[13px] text-foreground",
            "hover:bg-hover transition-colors focus-ring max-w-[180px]"
          )}
        >
          <span className="truncate">{current.name}</span>
          <ChevronDown className="size-3.5 text-ws-secondary shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={6}
        className={cn(
          "w-[280px] p-1 rounded-[10px]",
          "bg-popover border border-ws-border"
        )}
      >
        <div className="text-[11px] uppercase tracking-wide text-ws-secondary px-2.5 pt-2 pb-1">
          Standard
        </div>
        <div className="flex flex-col gap-0.5">{standard.map(renderRow)}</div>
        <div className="text-[11px] uppercase tracking-wide text-ws-secondary px-2.5 pt-3 pb-1">
          Unlimited
        </div>
        <div className="flex flex-col gap-0.5">{unlimited.map(renderRow)}</div>
      </PopoverContent>
    </Popover>
  );
}
