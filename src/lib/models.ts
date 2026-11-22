import type { Provider } from "@/lib/types";

export interface PickModel {
  id: string; // unified id `${providerId}:${modelName}`
  name: string;
  providerName?: string;
  providerType?: string;
}

export interface ModelGroup {
  label: string;
  models: PickModel[];
}

/**
 * All selectable models grouped by enabled provider. Models marked `hidden`
 * are filtered out (the user curates which to show via the Models tab). There
 * are no built-in/simulated models — only real provider models.
 */
export function listAllModelGroups(providers: Provider[]): ModelGroup[] {
  const groups: ModelGroup[] = [];
  for (const p of providers) {
    if (!p.enabled) continue;
    const visible = p.models.filter((m) => !m.hidden);
    if (visible.length === 0) continue;
    groups.push({
      label: p.name,
      models: visible.map((m) => ({
        id: m.id,
        name: m.name,
        providerName: p.name,
        providerType: p.type,
      })),
    });
  }
  return groups;
}

/** Whether a model id belongs to a provider (i.e. is a real, selectable model). */
export function isProviderModel(
  id: string,
  providers: Provider[]
): boolean {
  if (!id) return false;
  return providers.some((p) => p.models.some((m) => m.id === id && !m.hidden));
}

/** Resolve a unified model id to a human-readable name (the model part). */
export function resolveModelName(id: string, _providers?: Provider[]): string {
  if (!id) return "";
  const i = id.indexOf(":");
  if (i > 0) {
    return id.slice(i + 1);
  }
  return id;
}
