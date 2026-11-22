"use client";

import * as React from "react";
import { Check, ChevronDown, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  listAllModelGroups,
  resolveModelName,
  isProviderModel,
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

type EnrichedGroup = ModelGroup & { type?: string; providerId?: string };

/**
 * ModelPicker — a popover that lets the user switch the active model.
 * Models come only from connected providers (no built-in/simulated models).
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
  const valid = isProviderModel(modelId, providers);
  const displayName = valid ? resolveModelName(modelId, providers) : "";

  const groups = React.useMemo<EnrichedGroup[]>(() => {
    const base = listAllModelGroups(providers);
    const enriched: EnrichedGroup[] = base.map((g) => {
      const provider = providers.find((p) => p.name === g.label);
      return {
        ...g,
        type: g.models[0]?.providerType ?? provider?.type,
        providerId: provider?.id,
      };
    });
    // ensure an enabled Ollama provider always appears (even with zero models)
    const hasOllama = enriched.some((g) => g.type === "ollama");
    if (!hasOllama) {
      const ollama = providers.find((p) => p.type === "ollama" && p.enabled);
      if (ollama) {
        enriched.push({
          label: ollama.name,
          models: [],
          type: "ollama",
          providerId: ollama.id,
        });
      }
    }
    return enriched;
  }, [providers]);

  const handleSelect = (id: string) => {
    setModel(tabId, id);
    setDefaultModelId(id);
    onOpenChange(false);
  };

  const renderRow = (m: PickModel, type?: string) => {
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
          </div>
          <div className="text-[12px] text-ws-secondary line-clamp-1">
            {m.providerName}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {type && (
            <span className="text-[10px] rounded-full px-1.5 py-0.5 border text-ws-secondary border-ws-border whitespace-nowrap">
              {type}
            </span>
          )}
          {selected && <Check className="size-3.5 text-accent-hi shrink-0" />}
        </div>
      </button>
    );
  };

  const empty = groups.every((g) => g.models.length === 0);

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1.5 h-7 px-2.5 rounded-[8px]",
            "border border-ws-border bg-card-ws text-[13px]",
            valid ? "text-foreground" : "text-ws-secondary",
            "hover:bg-hover transition-colors focus-ring max-w-[200px]"
          )}
        >
          <span className="truncate">{displayName || "Select model"}</span>
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
          {empty && !detecting && (
            <div className="text-[12px] text-ws-disabled px-2.5 py-3">
              No models yet — connect a provider in Settings and fetch models.
            </div>
          )}
          {groups.map((group) => {
            const isOllama = group.type === "ollama";
            const showEmpty =
              group.models.length === 0 && !detecting;
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
                    {isOllama
                      ? "No models detected — run `ollama serve` and click Detect in Settings"
                      : "No models — click Fetch in Settings"}
                  </div>
                ) : (
                  <div className="flex flex-col gap-0.5">
                    {group.models.map((m) => renderRow(m, group.type))}
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
