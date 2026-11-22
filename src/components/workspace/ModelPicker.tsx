"use client";

import * as React from "react";
import { Check, ChevronDown, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  listAllModelGroups,
  resolveModelName,
  type ModelGroup,
  type PickModel,
} from "@/lib/models";
import type { Provider } from "@/lib/types";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useChatStore } from "@/stores/useChatStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { useProvidersStore } from "@/stores/useProvidersStore";

type EnrichedGroup = ModelGroup & { type?: string };

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
 * Models are sourced from every enabled provider (Simulated + OpenAI +
 * Anthropic + auto-detected Ollama) via `listAllModelGroups`, and grouped.
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
  const providers = useProvidersStore((s) => s.providers);
  const detecting = useProvidersStore((s) => s.detecting);

  const modelId = convModelId ?? defaultModelId;
  const displayName = resolveModelName(modelId, providers);

  // Build the grouped model list, tagging each provider group with its type
  // so we can render badges. We also ensure an enabled Ollama provider always
  // appears (even with zero detected models) so its empty/detecting state shows.
  const groups = React.useMemo<EnrichedGroup[]>(() => {
    const base = listAllModelGroups(providers);
    const enriched: EnrichedGroup[] = base.map((g) => {
      if (g.label === "Simulated") {
        return { ...g, type: undefined };
      }
      const type =
        g.models[0]?.providerType ??
        providers.find((p) => p.name === g.label)?.type;
      return { ...g, type };
    });
    const hasOllama = enriched.some((g) => g.type === "ollama");
    if (!hasOllama) {
      const ollama = providers.find(
        (p) => p.type === "ollama" && p.enabled
      );
      if (ollama) {
        enriched.push({ label: ollama.name, models: [], type: "ollama" });
      }
    }
    return enriched;
  }, [providers]);

  const handleSelect = (id: string) => {
    setModel(tabId, id);
    setDefaultModelId(id);
    onOpenChange(false);
  };

  const renderRow = (m: PickModel, isSimulated: boolean) => {
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
            {isSimulated && m.contextWindow && (
              <span className="text-[11px] text-ws-secondary shrink-0">
                {m.contextWindow}
              </span>
            )}
          </div>
          <div className="text-[12px] text-ws-secondary line-clamp-1">
            {isSimulated ? m.description : m.providerName}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {isSimulated && m.multiplier !== undefined ? (
            <MultiplierBadge multiplier={m.multiplier} />
          ) : !isSimulated && m.providerType ? (
            <span className="text-[10px] rounded-full px-1.5 py-0.5 border text-ws-secondary border-ws-border whitespace-nowrap">
              {m.providerType}
            </span>
          ) : null}
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
          <span className="truncate">{displayName}</span>
          <ChevronDown className="size-3.5 text-ws-secondary shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={6}
        className={cn(
          "w-[300px] p-1 rounded-[10px]",
          "bg-popover border border-ws-border"
        )}
      >
        <div className="ws-scroll max-h-[340px] overflow-y-auto">
          {groups.map((group) => {
            const isSimulated = group.label === "Simulated";
            const isOllama = group.type === "ollama";
            const showEmpty = isOllama && group.models.length === 0 && !detecting;
            return (
              <div key={group.label}>
                <div className="text-[11px] uppercase tracking-wide text-ws-secondary px-2.5 pt-2 pb-1 flex items-center gap-1.5">
                  <span>{group.label}</span>
                  {group.type && (
                    <span className="text-[10px] text-ws-disabled normal-case tracking-normal">
                      {group.type}
                    </span>
                  )}
                </div>
                {isOllama && detecting && (
                  <div className="text-[12px] text-ws-secondary px-2.5 py-2 flex items-center gap-1.5">
                    <Loader2 className="size-3.5 animate-spin shrink-0" />
                    Detecting…
                  </div>
                )}
                {showEmpty ? (
                  <div className="text-[12px] text-ws-disabled px-2.5 py-2">
                    No models detected — run `ollama serve` and click Detect in
                    Settings
                  </div>
                ) : (
                  <div className="flex flex-col gap-0.5">
                    {group.models.map((m) => renderRow(m, isSimulated))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
