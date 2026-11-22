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
  toggleModelHidden: (providerId: string, modelId: string) => void;
  detectProviderModels: (providerId: string) => Promise<ProviderModel[]>;
  detectOllama: (baseUrl?: string) => Promise<ProviderModel[]>;
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

function withIds(providerId: string, names: string[]): ProviderModel[] {
  return names.map((name) => ({ name, id: modelIdFor(providerId, name) }));
}

/** Seed providers with sensible default models. */
function seedProvider(
  id: string,
  name: string,
  type: ProviderType,
  baseUrl: string,
  modelNames: string[]
): Provider {
  return {
    id,
    name,
    type,
    baseUrl,
    apiKey: "",
    enabled: true,
    models: withIds(id, modelNames),
  };
}

const DEFAULT_PROVIDERS: Provider[] = [
  seedProvider("openai", "OpenAI", "openai", "https://api.openai.com/v1", [
    "gpt-4o",
    "gpt-4o-mini",
    "gpt-4-turbo",
    "o1-mini",
  ]),
  seedProvider(
    "anthropic",
    "Anthropic",
    "anthropic",
    "https://api.anthropic.com/v1",
    [
      "claude-3-5-sonnet-latest",
      "claude-3-5-haiku-latest",
      "claude-3-opus-latest",
    ]
  ),
  seedProvider("mistral", "Mistral", "openai", "https://api.mistral.ai/v1", [
    "mistral-large-latest",
    "mistral-small-latest",
    "codestral-latest",
  ]),
  seedProvider(
    "openrouter",
    "OpenRouter",
    "openai",
    "https://openrouter.ai/api/v1",
    ["openai/gpt-4o-mini", "anthropic/claude-3.5-sonnet", "google/gemini-flash-1.5"]
  ),
  seedProvider("groq", "Groq", "openai", "https://api.groq.com/openai/v1", [
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
    "mixtral-8x7b-32768",
  ]),
  seedProvider("zai", "Z.ai", "openai", "https://api.z.ai/api/paas/v4", [
    "glm-4.6",
    "glm-4.5-air",
    "glm-4v-flash",
  ]),
  seedProvider("deepseek", "DeepSeek", "openai", "https://api.deepseek.com", [
    "deepseek-chat",
    "deepseek-reasoner",
  ]),
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
          models: p.models ?? [],
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
                    hidden: m.hidden,
                  })),
                }
              : p
          ),
        })),

      toggleModelHidden: (providerId, modelId) =>
        set((s) => ({
          providers: s.providers.map((p) =>
            p.id === providerId
              ? {
                  ...p,
                  models: p.models.map((m) =>
                    m.id === modelId ? { ...m, hidden: !m.hidden } : m
                  ),
                }
              : p
          ),
        })),

      detectProviderModels: async (providerId) => {
        const provider = get().providers.find((p) => p.id === providerId);
        if (!provider) return [];
        set({ detecting: true });
        try {
          const params = new URLSearchParams({
            baseUrl: provider.baseUrl,
            apiKey: provider.apiKey,
            type: provider.type,
          });
          const res = await fetch(`/api/models?${params.toString()}`);
          const data = (await res.json()) as {
            detected: boolean;
            models: string[];
            error: string | null;
          };
          const prev = provider.models;
          // preserve hidden flags for models that already existed
          const models: ProviderModel[] = data.models.map((name) => {
            const existing = prev.find((pm) => pm.name === name);
            return {
              name,
              id: modelIdFor(providerId, name),
              hidden: existing?.hidden,
            };
          });
          get().setProviderModels(providerId, models);
          return models;
        } finally {
          set({ detecting: false });
        }
      },

      detectOllama: async (baseUrl) => {
        // target the ollama provider matching the given baseUrl; fall back to
        // the first ollama provider; create one if none exists.
        const url = baseUrl || "http://localhost:11434";
        let ollama =
          get().providers.find(
            (p) => p.type === "ollama" && (!baseUrl || p.baseUrl === baseUrl)
          ) || get().providers.find((p) => p.type === "ollama");
        if (!ollama) {
          const id = get().addProvider({
            name: "Ollama (local)",
            type: "ollama",
            baseUrl: url,
            apiKey: "",
            enabled: true,
            models: [],
          });
          ollama = get().providers.find((p) => p.id === id) || undefined;
        }
        if (!ollama) return [];
        return get().detectProviderModels(ollama.id);
      },
    }),
    {
      name: "forge-providers",
      merge: (persisted, current) => {
        const p = persisted as Partial<ProvidersState> | undefined;
        if (!p || !Array.isArray(p.providers)) return current as ProvidersState;
        // normalize persisted providers (ensure model ids + hidden flag)
        const persistedNorm = p.providers.map((prov) => ({
          ...prov,
          models: (prov.models || []).map((m) => ({
            name: m.name,
            id: m.id || modelIdFor(prov.id, m.name),
            hidden: m.hidden,
          })),
        }));
        // start from defaults, override with persisted (by id) so new default
        // providers appear for existing users while preserving their edits;
        // then append any user-added providers not in defaults.
        const byId = new Map(persistedNorm.map((pr) => [pr.id, pr]));
        const merged: Provider[] = DEFAULT_PROVIDERS.map(
          (def) => byId.get(def.id) ?? def
        );
        for (const pr of persistedNorm) {
          if (!DEFAULT_PROVIDERS.find((d) => d.id === pr.id)) merged.push(pr);
        }
        return { ...current, ...p, providers: merged } as ProvidersState;
      },
    }
  )
);
