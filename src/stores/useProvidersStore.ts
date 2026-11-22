"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { uid } from "@/lib/id";
import type { Provider, ProviderModel, ProviderType } from "@/lib/types";

interface ProvidersState {
  providers: Provider[];
  /** true while Ollama detection is in flight */
  detecting: boolean;

  addProvider: (p: Partial<Omit<Provider, "id">>) => string;
  updateProvider: (id: string, patch: Partial<Omit<Provider, "id">>) => void;
  removeProvider: (id: string) => void;
  setProviderModels: (id: string, models: ProviderModel[]) => void;
  detectOllama: (baseUrl?: string) => Promise<ProviderModel[]>;
}

function defaultModels(type: ProviderType): ProviderModel[] {
  switch (type) {
    case "openai":
      return [
        { id: "", name: "gpt-4o" },
        { id: "", name: "gpt-4o-mini" },
        { id: "", name: "gpt-4-turbo" },
        { id: "", name: "o1-mini" },
      ];
    case "anthropic":
      return [
        { id: "", name: "claude-3-5-sonnet-latest" },
        { id: "", name: "claude-3-5-haiku-latest" },
        { id: "", name: "claude-3-opus-latest" },
      ];
    default:
      return [];
  }
}

/** Build the unified model id for a provider model. */
export function modelIdFor(providerId: string, modelName: string): string {
  return `${providerId}:${modelName}`;
}

/** Parse a unified model id into providerId + modelName. Returns null if not provider-prefixed. */
export function parseModelId(
  id: string
): { providerId: string; modelName: string } | null {
  const i = id.indexOf(":");
  if (i <= 0) return null;
  return { providerId: id.slice(0, i), modelName: id.slice(i + 1) };
}

const DEFAULT_PROVIDERS: Provider[] = [
  {
    id: "openai",
    name: "OpenAI",
    type: "openai",
    baseUrl: "https://api.openai.com/v1",
    apiKey: "",
    enabled: true,
    models: defaultModels("openai").map((m) => ({
      ...m,
      id: modelIdFor("openai", m.name),
    })),
  },
  {
    id: "anthropic",
    name: "Anthropic",
    type: "anthropic",
    baseUrl: "https://api.anthropic.com/v1",
    apiKey: "",
    enabled: true,
    models: defaultModels("anthropic").map((m) => ({
      ...m,
      id: modelIdFor("anthropic", m.name),
    })),
  },
  {
    id: "ollama",
    name: "Ollama (local)",
    type: "ollama",
    baseUrl: "http://localhost:11434",
    apiKey: "",
    enabled: true,
    models: [],
  },
];

export const useProvidersStore = create<ProvidersState>()(
  persist(
    (set, get) => ({
      providers: DEFAULT_PROVIDERS,
      detecting: false,

      addProvider: (p) => {
        const id = uid("prov");
        const type = p.type || "custom";
        const provider: Provider = {
          id,
          name: p.name || "Custom provider",
          type,
          baseUrl: p.baseUrl || "",
          apiKey: p.apiKey || "",
          enabled: p.enabled ?? true,
          models:
            p.models ??
            defaultModels(type).map((m) => ({ ...m, id: modelIdFor(id, m.name) })),
        };
        set((s) => ({ providers: [...s.providers, provider] }));
        return id;
      },

      updateProvider: (id, patch) =>
        set((s) => ({
          providers: s.providers.map((p) =>
            p.id === id ? { ...p, ...patch } : p
          ),
        })),

      removeProvider: (id) =>
        set((s) => ({ providers: s.providers.filter((p) => p.id !== id) })),

      setProviderModels: (id, models) =>
        set((s) => ({
          providers: s.providers.map((p) =>
            p.id === id
              ? {
                  ...p,
                  models: models.map((m) => ({
                    name: m.name,
                    id: m.id || modelIdFor(id, m.name),
                  })),
                }
              : p
          ),
        })),

      detectOllama: async (baseUrl) => {
        // target the ollama provider matching the given baseUrl; fall back to
        // the first ollama provider; create one if none exists.
        const url = baseUrl || "http://localhost:11434";
        const ollama =
          get().providers.find(
            (p) => p.type === "ollama" && (!baseUrl || p.baseUrl === baseUrl)
          ) || get().providers.find((p) => p.type === "ollama");
        set({ detecting: true });
        try {
          const res = await fetch(
            `/api/models/ollama?baseUrl=${encodeURIComponent(url)}`
          );
          const data = (await res.json()) as {
            detected: boolean;
            models: string[];
          };
          const targetId = ollama?.id;
          const models: ProviderModel[] = data.models.map((name) => ({
            name,
            id: modelIdFor(targetId || "ollama", name),
          }));
          if (ollama) {
            get().setProviderModels(ollama.id, models);
          } else {
            get().addProvider({
              name: "Ollama (local)",
              type: "ollama",
              baseUrl: url,
              apiKey: "",
              enabled: true,
              models,
            });
          }
          return models;
        } finally {
          set({ detecting: false });
        }
      },
    }),
    {
      name: "forge-providers",
      merge: (persisted, current) => {
        const p = persisted as Partial<ProvidersState> | undefined;
        if (!p || !Array.isArray(p.providers)) return current as ProvidersState;
        // ensure each provider model has a unified id
        const providers = p.providers.map((prov) => ({
          ...prov,
          models: (prov.models || []).map((m) => ({
            name: m.name,
            id: m.id || modelIdFor(prov.id, m.name),
          })),
        }));
        return { ...current, ...p, providers } as ProvidersState;
      },
    }
  )
);
