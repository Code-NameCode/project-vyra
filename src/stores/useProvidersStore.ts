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
  detectProviderModels: (providerId: string, hideAll?: boolean) => Promise<ProviderModel[]>;
  detectOllama: (baseUrl?: string) => Promise<ProviderModel[]>;
  importProviders: (
    items: {
      id: string;
      name: string;
      sourceCli: string;
      baseUrl: string;
      models: string[];
      hasApiKey: boolean;
    }[]
  ) => number;
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
  seedProvider(
    "zai",
    "Z.ai (Coding Plan)",
    "openai",
    "https://api.z.ai/api/coding/paas/v4",
    ["glm-5.3", "glm-5.3-flash"]
  ),
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

      detectProviderModels: async (providerId, hideAll = false) => {
        const provider = get().providers.find((p) => p.id === providerId);
        if (!provider) return [];
        set({ detecting: true });
        try {
          const params = new URLSearchParams({
            baseUrl: provider.baseUrl,
            type: provider.type,
            providerId: provider.id,
            providerName: provider.name,
          });
          const res = await fetch(`/api/models?${params.toString()}`);
          const data = (await res.json()) as {
            detected: boolean;
            models: string[];
            error: string | null;
          };
          const prev = provider.models;
          const identity =
            `${provider.baseUrl} ${provider.id} ${provider.name}`.toLowerCase();
          const isZaiCodingPlan =
            identity.includes("z.ai") ||
            identity.includes("zai") ||
            identity.includes("xzai") ||
            identity.includes("glm");
          // New models start hidden so the user curates which to show. Existing
          // models keep their hidden flag (so a refresh preserves your choices).
          // `hideAll` (used on connect) hides every fetched model.
          const models: ProviderModel[] = data.models.map((name) => {
            const existing = prev.find((pm) => pm.name === name);
            return {
              name,
              id: modelIdFor(providerId, name),
              hidden: isZaiCodingPlan
                ? false
                : hideAll
                  ? true
                  : existing
                    ? existing.hidden
                    : true,
            };
          });
          get().setProviderModels(providerId, models);
          return models;
        } finally {
          set({ detecting: false });
        }
      },

      importProviders: (items) => {
        let added = 0;
        set((s) => {
          const providers = [...s.providers];
          for (const item of items) {
            if (!item.models.length && !item.baseUrl) continue;
            const existingIdx = providers.findIndex((p) => p.id === item.id);
            const models: ProviderModel[] = item.models.map((name) => ({
              name,
              id: modelIdFor(item.id, name),
              hidden: false,
            }));
            if (existingIdx >= 0) {
              const existing = providers[existingIdx];
              const merged = new Map<string, ProviderModel>();
              for (const m of existing.models) merged.set(m.name, m);
              for (const m of models) merged.set(m.name, { ...m, hidden: false });
              providers[existingIdx] = {
                ...existing,
                name: item.name || existing.name,
                baseUrl: item.baseUrl || existing.baseUrl,
                apiKey: existing.apiKey,
                models: Array.from(merged.values()),
              };
            } else {
              providers.push({
                id: item.id,
                name: item.name,
                type: "openai",
                baseUrl: item.baseUrl,
                apiKey: "",
                enabled: true,
                models,
              });
              added++;
            }
          }
          return { providers };
        });
        return added;
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
      partialize: (state) => ({
        ...state,
        providers: state.providers.map(({ apiKey: _apiKey, ...provider }) => provider),
      }),
      merge: (persisted, current) => {
        const p = persisted as Partial<ProvidersState> | undefined;
        if (!p || !Array.isArray(p.providers)) return current as ProvidersState;
        // normalize persisted providers (ensure model ids + hidden flag)
        const isZai = (pr: Provider) => {
          const s = `${pr.baseUrl} ${pr.id} ${pr.name}`.toLowerCase();
          return (
            s.includes("z.ai") ||
            s.includes("zai") ||
            s.includes("xzai") ||
            s.includes("glm")
          );
        };
        const persistedNorm = p.providers.map((prov) => {
          const base = {
            ...prov,
            apiKey: "",
            models: (prov.models || []).map((m) => ({
              name: m.name,
              id: m.id || modelIdFor(prov.id, m.name),
              hidden: m.hidden,
            })),
          };
          // Migrate existing Z.ai providers to the GLM Coding Plan endpoint.
          if (isZai(base) && base.baseUrl.includes("api.z.ai")) {
            const codingBase =
              base.baseUrl.includes("/coding/") ||
              base.baseUrl.endsWith("/api/v1") ||
              base.baseUrl.includes("/api/anthropic")
                ? base.baseUrl
                : "https://api.z.ai/api/coding/paas/v4";
            const keep = new Set(["glm-5.3", "glm-5.3-flash"]);
            const models = base.models.filter((m) => keep.has(m.name));
            for (const name of keep) {
              if (!models.some((m) => m.name === name)) {
                models.push({
                  name,
                  id: modelIdFor(base.id, name),
                  hidden: false,
                });
              }
            }
            return {
              ...base,
              name: base.name.toLowerCase().includes("coding")
                ? base.name
                : "Z.ai (Coding Plan)",
              baseUrl: codingBase,
              models: models.map((m) => ({ ...m, hidden: false })),
            };
          }
          return base;
        });
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
