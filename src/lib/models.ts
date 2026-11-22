import modelsData from "@/data/models.json";
import type { ModelDef, Provider } from "@/lib/types";

const SIMULATED = modelsData as ModelDef[];

export interface PickModel {
  id: string; // unified id (simulated id or `${providerId}:${modelName}`)
  name: string;
  description?: string;
  contextWindow?: string;
  multiplier?: number;
  providerName?: string;
  providerType?: string;
}

export interface ModelGroup {
  label: string;
  models: PickModel[];
}

/** All selectable models grouped: Simulated first, then each enabled provider. */
export function listAllModelGroups(providers: Provider[]): ModelGroup[] {
  const groups: ModelGroup[] = [
    {
      label: "Simulated",
      models: SIMULATED.map((m) => ({
        id: m.id,
        name: m.name,
        description: m.description,
        contextWindow: m.contextWindow,
        multiplier: m.multiplier,
      })),
    },
  ];
  for (const p of providers) {
    if (!p.enabled) continue;
    if (p.models.length === 0) continue;
    groups.push({
      label: p.name,
      models: p.models.map((m) => ({
        id: m.id,
        name: m.name,
        providerName: p.name,
        providerType: p.type,
      })),
    });
  }
  return groups;
}

/** Resolve a unified model id to a human-readable name. */
export function resolveModelName(id: string, providers: Provider[]): string {
  const sim = SIMULATED.find((m) => m.id === id);
  if (sim) return sim.name;
  const i = id.indexOf(":");
  if (i > 0) {
    return id.slice(i + 1);
  }
  return id;
}
