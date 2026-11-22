"use client";

import * as React from "react";
import {
  Check,
  Eye,
  EyeOff,
  FolderOpen,
  Import,
  Loader2,
  Palette,
  Plus,
  RefreshCw,
  RotateCcw,
  Star,
  Trash2,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useAppStore } from "@/stores/useAppStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { useProvidersStore } from "@/stores/useProvidersStore";
import { cn } from "@/lib/utils";
import type { Provider, ProviderType } from "@/lib/types";
import {
  CUSTOM_COLOR_FIELDS,
  PRESET_THEMES,
  SWATCH_VAR_KEYS,
  type ThemeDef,
  getPresetTheme,
} from "@/data/themes";
import { AGENTS } from "@/data/agents";

function FieldRow({
  label,
  htmlFor,
  children,
  hint,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="grid gap-1.5">
      <Label
        htmlFor={htmlFor}
        className="text-[11px] uppercase tracking-wide text-ws-secondary"
      >
        {label}
      </Label>
      {children}
      {hint ? (
        <p className="text-[12px] text-ws-disabled">{hint}</p>
      ) : null}
    </div>
  );
}

const PROVIDER_TYPE_LABEL: Record<ProviderType, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  ollama: "Ollama",
  custom: "Custom",
};

/** A provider is connected when enabled and either ollama (no key needed) or has an API key. */
function isConnected(p: Provider): boolean {
  return p.enabled && (p.type === "ollama" || !!p.apiKey || !!p.credentialConfigured);
}

function ProviderCard({
  provider,
  onRemove,
}: {
  provider: Provider;
  onRemove: (p: Provider) => void;
}) {
  const updateProvider = useProvidersStore((s) => s.updateProvider);
  const detectProviderModels = useProvidersStore((s) => s.detectProviderModels);
  const isOllama = provider.type === "ollama";
  const connected = isConnected(provider);
  const [fetching, setFetching] = React.useState(false);

  const onFetch = async () => {
    if (!connected) return;
    setFetching(true);
    try {
      const models = await detectProviderModels(provider.id);
      if (models.length > 0) {
        toast.success(
          `${models.length} model(s) fetched from ${provider.name}`
        );
      } else {
        toast.error("No models found — check the connection");
      }
    } catch {
      toast.error("No models found — check the connection");
    } finally {
      setFetching(false);
    }
  };

  return (
    <div className="rounded-[10px] border border-ws-border bg-card-ws p-3">
      <div className="flex items-center gap-2">
        <Input
          aria-label="Provider name"
          value={provider.name}
          onChange={(e) =>
            updateProvider(provider.id, { name: e.target.value })
          }
          className="flex-1 h-8 bg-card-ws border-ws-border-soft text-[13px] focus-ring"
        />
        <span className="text-[11px] rounded-full px-1.5 py-0.5 border text-ws-secondary border-ws-border whitespace-nowrap">
          {PROVIDER_TYPE_LABEL[provider.type]}
        </span>
        <Switch
          checked={provider.enabled}
          onCheckedChange={(v) =>
            updateProvider(provider.id, { enabled: v })
          }
          aria-label="Toggle provider enabled"
        />
        <button
          type="button"
          onClick={() => onRemove(provider)}
          aria-label={`Remove ${provider.name}`}
          className="inline-flex items-center justify-center size-7 text-ws-secondary hover:text-red-400 hover:bg-hover rounded-[8px] focus-ring"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>

      <div className="mt-2 grid gap-2">
        <FieldRow label="Base URL" htmlFor={`prov-base-${provider.id}`}>
          <Input
            id={`prov-base-${provider.id}`}
            value={provider.baseUrl}
            onChange={(e) =>
              updateProvider(provider.id, { baseUrl: e.target.value })
            }
            placeholder="https://api.openai.com/v1"
            className="h-8 bg-card-ws border-ws-border-soft text-[13px] focus-ring"
          />
        </FieldRow>

        {isOllama ? (
          <p className="text-[12px] text-ws-secondary px-1 py-1">
            Ollama runs locally and needs no API key. Use Fetch models to load
            available models.
          </p>
        ) : (
          <FieldRow label="API key" htmlFor={`prov-key-${provider.id}`}>
            <Input
              id={`prov-key-${provider.id}`}
              type="password"
              value={provider.apiKey}
              onChange={(e) =>
                updateProvider(provider.id, { apiKey: e.target.value })
              }
              onBlur={() => {
                if (provider.apiKey.trim()) {
                  const secret = provider.apiKey.trim();
                  void fetch("/api/credentials", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ providerId: provider.id, apiKey: secret }),
                  }).then(async (response) => {
                    if (!response.ok) throw new Error("Credential vault rejected the key");
                    updateProvider(provider.id, { apiKey: "", credentialConfigured: true });
                    await detectProviderModels(provider.id, true);
                    toast("Credential saved in the server vault; fetching models");
                  }).catch((error) => toast.error(error instanceof Error ? error.message : "Unable to save credential"));
                }
              }}
              placeholder="sk-..."
              className="h-8 bg-card-ws border-ws-border-soft text-[13px] focus-ring"
            />
          </FieldRow>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between px-2">
        <span className="text-[12px] text-ws-secondary">
          {provider.models.length} model(s)
        </span>
        <button
          type="button"
          onClick={onFetch}
          disabled={!connected || fetching}
          className={cn(
            "inline-flex items-center gap-2 h-7 px-2.5 rounded-[8px] bg-accent-fill text-white text-[12px] hover:opacity-90 focus-ring",
            (!connected || fetching) && "opacity-50 cursor-not-allowed"
          )}
        >
          {fetching ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <RefreshCw className="size-3.5" />
          )}
          {fetching ? "Fetching…" : "Fetch models"}
        </button>
      </div>
    </div>
  );
}

function ModelsTabContent() {
  const providers = useProvidersStore((s) => s.providers);
  const detectProviderModels = useProvidersStore((s) => s.detectProviderModels);
  const toggleModelHidden = useProvidersStore((s) => s.toggleModelHidden);
  const [fetchingId, setFetchingId] = React.useState<string | null>(null);

  const onFetch = async (p: Provider) => {
    if (!isConnected(p)) return;
    setFetchingId(p.id);
    try {
      const models = await detectProviderModels(p.id);
      if (models.length > 0) {
        toast.success(`${models.length} model(s) fetched from ${p.name}`);
      } else {
        toast.error("No models found — check the connection");
      }
    } catch {
      toast.error("No models found — check the connection");
    } finally {
      setFetchingId(null);
    }
  };

  return (
    <div className="grid gap-2">
      <div className="grid gap-0.5">
        <span className="text-[14px] font-medium text-foreground">Models</span>
        <span className="text-[12px] text-ws-secondary">
          Fetch models from connected providers and choose which to show in the
          composer.
        </span>
        <p className="text-[12px] text-ws-secondary mt-1">
          Connected providers auto-fetch models hidden by default — toggle the
          eye to show a model in the composer.
        </p>
      </div>

      <div className="ws-scroll max-h-[400px] overflow-y-auto flex flex-col gap-2 mt-3">
        {providers.length === 0 ? (
          <p className="text-[12.5px] text-ws-disabled">
            No providers configured.
          </p>
        ) : (
          providers.map((p) => {
            const connected = isConnected(p);
            const fetching = fetchingId === p.id;
            return (
              <div
                key={p.id}
                className="rounded-[10px] border border-ws-border bg-card-ws p-3"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-medium text-foreground truncate">
                    {p.name}
                  </span>
                  <span className="text-[10px] rounded-full px-1.5 py-0.5 border text-ws-secondary border-ws-border">
                    {PROVIDER_TYPE_LABEL[p.type]}
                  </span>
                  <span
                    className={cn(
                      "ml-auto text-[10px] rounded-full px-1.5 py-0.5 border",
                      connected
                        ? "text-accent-hi border-accent-fill/30 bg-accent-fill/10"
                        : "text-ws-disabled border-ws-border"
                    )}
                  >
                    {connected ? "connected" : "not connected"}
                  </span>
                </div>

                <div className="mt-2">
                  <button
                    type="button"
                    onClick={() => onFetch(p)}
                    disabled={!connected || fetching}
                    className={cn(
                      "inline-flex items-center gap-2 h-7 px-2.5 rounded-[8px] bg-accent-fill text-white text-[12px] hover:opacity-90 focus-ring",
                      (!connected || fetching) &&
                        "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {fetching ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="size-3.5" />
                    )}
                    {fetching ? "Fetching…" : "Fetch models"}
                  </button>
                </div>

                <div className="mt-2 flex flex-col gap-0.5">
                  {p.models.length === 0 ? (
                    <p className="text-[12px] text-ws-disabled px-2 py-1">
                      No models yet — click Fetch
                    </p>
                  ) : (
                    p.models.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center gap-2 rounded-[6px] px-2 py-1 hover:bg-hover"
                      >
                        <span className="text-[12.5px] text-foreground font-mono truncate">
                          {m.name}
                        </span>
                        {m.hidden ? (
                          <span className="text-[10px] text-ws-disabled border border-ws-border rounded-full px-1.5 py-0.5">
                            hidden
                          </span>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => toggleModelHidden(p.id, m.id)}
                          aria-label={m.hidden ? "Show" : "Hide"}
                          className="ml-auto inline-flex items-center justify-center size-6 rounded-[6px] text-ws-secondary hover:bg-card-ws hover:text-foreground focus-ring"
                        >
                          {m.hidden ? (
                            <EyeOff className="size-3.5" />
                          ) : (
                            <Eye className="size-3.5" />
                          )}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/** Build the preview swatches (surface / accent / accent-hi / border / text). */
function themeSwatches(theme: ThemeDef): string[] {
  return SWATCH_VAR_KEYS.map((key) => theme.vars[key] ?? "#000000");
}

function ThemeCard({
  theme,
  selected,
  onSelect,
}: {
  theme: ThemeDef;
  selected: boolean;
  onSelect: () => void;
}) {
  const swatches = themeSwatches(theme);
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`Select ${theme.name} theme`}
      className={cn(
        "group relative flex flex-col gap-2 rounded-[10px] border bg-card-ws p-3 text-left transition-colors focus-ring",
        selected
          ? "border-accent-hi ring-1 ring-accent-hi/40"
          : "border-ws-border hover:border-ws-border-soft hover:bg-hover"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] font-medium text-foreground truncate">
          {theme.name}
        </span>
        {selected ? (
          <span className="inline-flex size-4 items-center justify-center rounded-full bg-accent-fill text-white">
            <Check className="size-3" />
          </span>
        ) : null}
      </div>
      <div className="flex items-center gap-1.5">
        {swatches.map((c, i) => (
          <span
            key={i}
            className="size-4 rounded-full border border-ws-border-soft"
            style={{ backgroundColor: c }}
            aria-hidden
          />
        ))}
      </div>
      <p className="text-[12px] text-ws-secondary line-clamp-2">
        {theme.description}
      </p>
    </button>
  );
}

function AppearanceTabContent() {
  const themeId = useSettingsStore((s) => s.themeId);
  const defaultThemeId = useSettingsStore((s) => s.defaultThemeId);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const setDefaultTheme = useSettingsStore((s) => s.setDefaultTheme);
  const customVars = useSettingsStore((s) => s.customVars);
  const setCustomVar = useSettingsStore((s) => s.setCustomVar);
  const resetTheme = useSettingsStore((s) => s.resetTheme);
  const fontFamily = useSettingsStore((s) => s.fontFamily);
  const fontSize = useSettingsStore((s) => s.fontSize);
  const lineHeight = useSettingsStore((s) => s.lineHeight);
  const letterSpacing = useSettingsStore((s) => s.letterSpacing);
  const setFontFamily = useSettingsStore((s) => s.setFontFamily);
  const setFontSize = useSettingsStore((s) => s.setFontSize);
  const setLineHeight = useSettingsStore((s) => s.setLineHeight);
  const setLetterSpacing = useSettingsStore((s) => s.setLetterSpacing);

  const hasCustom = Object.keys(customVars).length > 0;
  const activePreset = getPresetTheme(themeId);

  const onReset = () => {
    resetTheme();
    toast("Theme reset to default");
  };

  /** Resolve a color picker value: custom override > preset > fallback. */
  const resolveColor = (varName: string): string =>
    customVars[varName] ?? activePreset.vars[varName] ?? "#000000";

  return (
    <div className="grid gap-5">
      <div className="grid gap-0.5">
        <span className="text-[14px] font-medium text-foreground">
          Appearance
        </span>
        <span className="text-[12px] text-ws-secondary">
          Choose a preset palette or fine-tune individual colors. Changes apply
          live across the workspace.
        </span>
      </div>

      {/* Preset themes */}
      <div className="grid gap-2">
        <div className="flex items-center gap-2">
          <Palette className="size-3.5 text-ws-secondary" />
          <span className="text-[12.5px] font-medium text-foreground">
            Preset themes
          </span>
          {hasCustom ? (
            <Badge
              variant="secondary"
              className="bg-accent-fill/10 text-accent-hi border border-accent-fill/30 text-[10px] px-1.5 py-0.5"
            >
              custom overlay active
            </Badge>
          ) : null}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {PRESET_THEMES.map((t) => (
            <ThemeCard
              key={t.id}
              theme={t}
              selected={t.id === themeId}
              onSelect={() => setTheme(t.id)}
            />
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-1">
          <button
            type="button"
            onClick={() => {
              setDefaultTheme();
              toast("Current theme set as default");
            }}
            className={cn(
              "inline-flex items-center gap-2 h-8 px-3 rounded-[8px]",
              "border border-ws-border bg-card-ws text-[12.5px] hover:bg-hover focus-ring"
            )}
          >
            <Star className="size-3.5 text-accent-hi" />
            Set current theme as default
          </button>
          <span className="text-[12px] text-ws-secondary">
            Default: {getPresetTheme(defaultThemeId).name}
          </span>
        </div>
      </div>

      {/* Custom overrides */}
      <div className="grid gap-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[12.5px] font-medium text-foreground">
              Custom theme
            </span>
            {hasCustom ? (
              <button
                type="button"
                onClick={() => {
                  // Clear just the custom overrides, keep the active preset.
                  for (const k of Object.keys(customVars)) setCustomVar(k, "");
                  toast("Custom colors cleared");
                }}
                className="text-[11px] text-ws-secondary hover:text-foreground focus-ring rounded px-1 py-0.5"
              >
                clear overrides
              </button>
            ) : null}
          </div>
          <span className="text-[11px] text-ws-disabled">
            Override on top of{" "}
            <span className="text-ws-secondary">{activePreset.name}</span>
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {CUSTOM_COLOR_FIELDS.map((field) => {
            const value = resolveColor(field.varName);
            return (
              <div
                key={field.varName}
                className="flex items-center gap-2 rounded-[8px] border border-ws-border bg-card-ws px-2.5 py-2"
              >
                <label
                  htmlFor={`custom-color-${field.varName}`}
                  className="relative inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md border border-ws-border-soft overflow-hidden"
                  style={{ backgroundColor: value }}
                  aria-hidden
                >
                  <input
                    id={`custom-color-${field.varName}`}
                    type="color"
                    value={value}
                    onChange={(e) => setCustomVar(field.varName, e.target.value)}
                    className="absolute inset-0 size-full cursor-pointer opacity-0"
                    aria-label={field.label}
                  />
                </label>
                <div className="grid gap-0.5 min-w-0">
                  <span className="text-[12px] text-foreground truncate">
                    {field.label}
                  </span>
                  <span className="text-[11px] font-mono text-ws-disabled uppercase truncate">
                    {value}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Fonts */}
      <div className="grid gap-3 rounded-[10px] border border-ws-border bg-card-ws px-3 py-3">
        <span className="text-[12.5px] font-medium text-foreground">Fonts</span>
        <div className="flex flex-wrap items-center gap-3">
          <div className="grid gap-1 flex-1 min-w-[140px]">
            <label className="text-[11px] text-ws-secondary">Font family</label>
            <Select value={fontFamily} onValueChange={setFontFamily}>
              <SelectTrigger className="focus-ring bg-card-ws border-ws-border text-[13px] h-8 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border border-ws-border max-h-[280px]">
                <SelectItem value="Inter">Inter / Geist (sans)</SelectItem>
                <SelectItem value="Roboto">Roboto</SelectItem>
                <SelectItem value="Open Sans">Open Sans</SelectItem>
                <SelectItem value="Poppins">Poppins</SelectItem>
                <SelectItem value="Space Grotesk">Space Grotesk</SelectItem>
                <SelectItem value="Lora">Lora (serif)</SelectItem>
                <SelectItem value="Playfair Display">Playfair Display (serif)</SelectItem>
                <SelectItem value="JetBrains Mono">JetBrains Mono</SelectItem>
                <SelectItem value="Fira Code">Fira Code</SelectItem>
                <SelectItem value="Monospace">System Monospace</SelectItem>
                <SelectItem value="Serif">System Serif</SelectItem>
                <SelectItem value="System">System UI</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1 min-w-[100px]">
            <label className="text-[11px] text-ws-secondary">Font size</label>
            <Select value={fontSize} onValueChange={setFontSize}>
              <SelectTrigger className="focus-ring bg-card-ws border-ws-border text-[13px] h-8 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border border-ws-border">
                <SelectItem value="12">12px</SelectItem>
                <SelectItem value="13">13px</SelectItem>
                <SelectItem value="14">14px</SelectItem>
                <SelectItem value="15">15px</SelectItem>
                <SelectItem value="16">16px</SelectItem>
                <SelectItem value="17">17px</SelectItem>
                <SelectItem value="18">18px</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1 min-w-[100px]">
            <label className="text-[11px] text-ws-secondary">Line height</label>
            <Select value={lineHeight} onValueChange={setLineHeight}>
              <SelectTrigger className="focus-ring bg-card-ws border-ws-border text-[13px] h-8 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border border-ws-border">
                <SelectItem value="1.4">Compact (1.4)</SelectItem>
                <SelectItem value="1.5">Normal (1.5)</SelectItem>
                <SelectItem value="1.625">Relaxed (1.625)</SelectItem>
                <SelectItem value="1.8">Loose (1.8)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1 min-w-[100px]">
            <label className="text-[11px] text-ws-secondary">Letter spacing</label>
            <Select value={letterSpacing} onValueChange={setLetterSpacing}>
              <SelectTrigger className="focus-ring bg-card-ws border-ws-border text-[13px] h-8 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border border-ws-border">
                <SelectItem value="-0.02em">Tight (-0.02em)</SelectItem>
                <SelectItem value="0">Normal (0)</SelectItem>
                <SelectItem value="0.02em">Wide (0.02em)</SelectItem>
                <SelectItem value="0.05em">Extra wide (0.05em)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Reset */}
      <div className="flex items-center justify-between gap-3 rounded-[10px] border border-ws-border bg-card-ws px-3 py-2.5">
        <div className="grid gap-0.5 min-w-0">
          <span className="text-[13px] text-foreground">Reset to default</span>
          <span className="text-[12px] text-ws-disabled">
            Restore the Forge Dark preset and clear all custom colors.
          </span>
        </div>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={onReset}
          className="shrink-0"
        >
          <RotateCcw className="size-3.5" />
          Reset
        </Button>
      </div>
    </div>
  );
}

export function SettingsModal() {
  const open = useAppStore((s) => s.settingsOpen);
  const setOpen = useAppStore((s) => s.setSettingsOpen);

  const apiKey = useSettingsStore((s) => s.apiKey);
  const setApiKey = useSettingsStore((s) => s.setApiKey);
  const baseUrl = useSettingsStore((s) => s.baseUrl);
  const setBaseUrl = useSettingsStore((s) => s.setBaseUrl);
  const defaultModelId = useSettingsStore((s) => s.defaultModelId);
  const setDefaultModelId = useSettingsStore((s) => s.setDefaultModelId);
  const defaultAgentId = useSettingsStore((s) => s.defaultAgentId);
  const setDefaultAgentId = useSettingsStore((s) => s.setDefaultAgentId);
  const agentInstructions = useSettingsStore((s) => s.agentInstructions);
  const setAgentInstructions = useSettingsStore((s) => s.setAgentInstructions);
  const skillsFolderPath = useSettingsStore((s) => s.skillsFolderPath);
  const setSkillsFolderPath = useSettingsStore((s) => s.setSkillsFolderPath);
  const setSkills = useSettingsStore((s) => s.setSkills);
  const useRealApi = useSettingsStore((s) => s.useRealApi);
  const setUseRealApi = useSettingsStore((s) => s.setUseRealApi);
  const enabledAgentIds = useSettingsStore((s) => s.enabledAgentIds);
  const detectedAgentIds = useSettingsStore((s) => s.detectedAgentIds);
  const setEnabledAgentIds = useSettingsStore((s) => s.setEnabledAgentIds);
  const setDetectedAgentIds = useSettingsStore((s) => s.setDetectedAgentIds);

  const providers = useProvidersStore((s) => s.providers);
  const addProvider = useProvidersStore((s) => s.addProvider);
  const removeProvider = useProvidersStore((s) => s.removeProvider);
  const updateProvider = useProvidersStore((s) => s.updateProvider);
  const importProviders = useProvidersStore((s) => s.importProviders);

  React.useEffect(() => {
    if (!open) return;
    void fetch("/api/credentials")
      .then((response) => (response.ok ? response.json() : { providers: [] }))
      .then((data: { providers?: string[] }) => {
        const configured = new Set(data.providers || []);
        for (const provider of useProvidersStore.getState().providers) {
          if (provider.credentialConfigured !== configured.has(provider.id)) {
            updateProvider(provider.id, { credentialConfigured: configured.has(provider.id), apiKey: "" });
          }
        }
      })
      .catch(() => undefined);
  }, [open, updateProvider]);

  // Visible provider models (from connected providers, non-hidden) — used to
  // populate the General tab's default-model picker instead of the old static
  // built-in model list.
  const visibleModels = React.useMemo(() => {
    const out: { id: string; label: string }[] = [];
    for (const p of providers) {
      if (!isConnected(p)) continue;
      for (const m of p.models) {
        if (m.hidden) continue;
        out.push({ id: m.id, label: m.name });
      }
    }
    return out;
  }, [providers]);

  const [tab, setTab] = React.useState("general");
  const [foundSkills, setFoundSkills] = React.useState<string[]>([]);
  const [scanning, setScanning] = React.useState(false);
  const [scanError, setScanError] = React.useState<string | null>(null);
  const [browseOpen, setBrowseOpen] = React.useState(false);
  const [browsePath, setBrowsePath] = React.useState("");
  const [browseEntries, setBrowseEntries] = React.useState<
    { name: string; type: string; path: string }[]
  >([]);
  const [browseParent, setBrowseParent] = React.useState<string | null>(null);
  const [browseCurrent, setBrowseCurrent] = React.useState("");
  const [browseLoading, setBrowseLoading] = React.useState(false);
  const [browseError, setBrowseError] = React.useState<string | null>(null);
  const [agentScanning, setAgentScanning] = React.useState(false);
  const [agentScanError, setAgentScanError] = React.useState<string | null>(
    null
  );
  const [agentResults, setAgentResults] = React.useState<
    { id: string; detected: boolean }[]
  >([]);
  const [cliProviders, setCliProviders] = React.useState<
    {
      id: string;
      name: string;
      sourceCli: string;
      baseUrl: string;
      models: string[];
      hasApiKey: boolean;
    }[]
  >([]);
  const [cliSelected, setCliSelected] = React.useState<string[]>([]);
  const [cliScanning, setCliScanning] = React.useState(false);
  const [cliError, setCliError] = React.useState<string | null>(null);

  const [addOpen, setAddOpen] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const [newType, setNewType] = React.useState<ProviderType>("custom");
  const [newBaseUrl, setNewBaseUrl] = React.useState("");
  const [removeTarget, setRemoveTarget] = React.useState<Provider | null>(
    null
  );

  const openAddProvider = () => {
    setNewName("");
    setNewType("custom");
    setNewBaseUrl("");
    setAddOpen(true);
  };

  const confirmAddProvider = () => {
    const name = newName.trim();
    if (!name) {
      toast.error("Provider name is required");
      return;
    }
    addProvider({ name, type: newType, baseUrl: newBaseUrl.trim() });
    toast.success("Provider added");
    setAddOpen(false);
  };

  const confirmRemove = () => {
    if (!removeTarget) return;
    void fetch("/api/credentials", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ providerId: removeTarget.id }),
    }).catch(() => undefined);
    removeProvider(removeTarget.id);
    toast.success("Provider removed");
    setRemoveTarget(null);
  };

  const scanSkillsFolder = async () => {
    const p = skillsFolderPath.trim();
    if (!p) return;
    setScanning(true);
    setScanError(null);
    try {
      const res = await fetch(`/api/skills?path=${encodeURIComponent(p)}`);
      const data = (await res.json()) as {
        skills: { name: string }[];
        error: string | null;
      };
      if (data.error) {
        setScanError(data.error);
        setFoundSkills([]);
      } else {
        const skills = (data.skills || []).map((s: { name: string; description?: string }) => ({
          name: s.name,
          description: s.description,
        }));
        setFoundSkills(skills.map((s) => s.name));
        setSkills(skills);
        setScanError(null);
      }
    } catch (e) {
      setScanError(e instanceof Error ? e.message : "Scan failed");
      setFoundSkills([]);
    } finally {
      setScanning(false);
    }
  };

  const scanCliConfigs = async () => {
    setCliScanning(true);
    setCliError(null);
    try {
      const res = await fetch("/api/import-config", { cache: "no-store" });
      const data = (await res.json()) as {
        providers: {
          id: string;
          name: string;
          sourceCli: string;
          baseUrl: string;
          models: string[];
          hasApiKey: boolean;
        }[];
        error?: string | null;
      };
      if (data.error) throw new Error(data.error);
      setCliProviders(data.providers || []);
      setCliSelected((data.providers || []).map((p) => p.id));
      toast.success(
        `Found ${data.providers?.length ?? 0} CLI provider(s)`
      );
    } catch (e) {
      setCliError(e instanceof Error ? e.message : "Import scan failed");
      setCliProviders([]);
    } finally {
      setCliScanning(false);
    }
  };

  const confirmCliImport = () => {
    const chosen = cliProviders.filter((p) => cliSelected.includes(p.id));
    const added = importProviders(chosen);
    toast.success(
      `Imported ${chosen.length} provider(s) (${added} new)`
    );
    setCliProviders([]);
    setCliSelected([]);
  };

  const toggleCliProvider = (id: string, on: boolean) => {
    setCliSelected((prev) =>
      on ? [...prev, id] : prev.filter((x) => x !== id)
    );
  };

  const scanAgents = async () => {
    setAgentScanning(true);
    setAgentScanError(null);
    try {
      const res = await fetch("/api/agents", { cache: "no-store" });
      const data = (await res.json()) as {
        agents: { id: string; detected: boolean }[];
        error?: string | null;
      };
      if (data.error) throw new Error(data.error);
      const detected = (data.agents || [])
        .filter((a) => a.detected)
        .map((a) => a.id);
      setDetectedAgentIds(detected);
      // On first scan, enable everything that was found. Afterwards keep the
      // user's selection but drop agents that are no longer installed.
      setEnabledAgentIds(
        enabledAgentIds.length > 0
          ? enabledAgentIds.filter((id) => detected.includes(id))
          : detected
      );
      setAgentResults(data.agents || []);
      toast.success(
        detected.length > 0
          ? `Detected ${detected.length} agent(s)`
          : "No agents detected"
      );
    } catch (e) {
      setAgentScanError(e instanceof Error ? e.message : "Detection failed");
    } finally {
      setAgentScanning(false);
    }
  };

  const toggleAgent = (id: string, on: boolean) => {
    setEnabledAgentIds(
      on
        ? [...enabledAgentIds, id]
        : enabledAgentIds.filter((x) => x !== id)
    );
  };

  const detectedMap = React.useMemo(() => {
    const map: Record<string, boolean> = {};
    if (agentResults.length > 0) {
      for (const r of agentResults) map[r.id] = r.detected;
    } else if (detectedAgentIds.length > 0) {
      for (const id of detectedAgentIds) map[id] = true;
    } else {
      for (const a of AGENTS) map[a.id] = a.detected;
    }
    return map;
  }, [agentResults, detectedAgentIds]);

  const effectiveEnabledAgentIds =
    enabledAgentIds.length > 0
      ? enabledAgentIds
      : AGENTS.filter((a) => detectedMap[a.id]).map((a) => a.id);

  const loadBrowse = async (p: string) => {
    setBrowseLoading(true);
    setBrowseError(null);
    try {
      const res = await fetch(`/api/browse?path=${encodeURIComponent(p)}`);
      const data = (await res.json()) as {
        current: string;
        parent: string | null;
        entries: { name: string; type: string; path: string }[];
        error: string | null;
      };
      if (data.error) {
        setBrowseError(data.error);
        setBrowseEntries([]);
      } else {
        setBrowseCurrent(data.current);
        setBrowsePath(data.current);
        setBrowseParent(data.parent);
        setBrowseEntries(data.entries || []);
      }
    } catch (e) {
      setBrowseError(e instanceof Error ? e.message : "Browse failed");
    } finally {
      setBrowseLoading(false);
    }
  };

  const openBrowse = () => {
    setBrowseOpen(true);
    loadBrowse(skillsFolderPath || "");
  };

  return (
    <>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-[640px] max-[639px]:max-w-[calc(100vw-1.5rem)] max-[639px]:w-[calc(100vw-1.5rem)] max-h-[90vh] flex flex-col p-0 bg-popover border border-ws-border">
        <DialogHeader className="shrink-0 px-5 pt-5 pb-3 border-b border-ws-border">
          <DialogTitle className="text-[15px]">Settings</DialogTitle>
          <DialogDescription className="sr-only">
            Configure API key, models, agent instructions and skills.
          </DialogDescription>
        </DialogHeader>

        <div className="px-5 py-4 overflow-y-auto ws-scroll min-h-0">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="bg-card-ws border border-ws-border h-8">
              <TabsTrigger value="general" className="text-[12.5px]">
                General
              </TabsTrigger>
              <TabsTrigger value="appearance" className="text-[12.5px]">
                Appearance
              </TabsTrigger>
              <TabsTrigger value="providers" className="text-[12.5px]">
                Providers
              </TabsTrigger>
              <TabsTrigger value="models" className="text-[12.5px]">
                Models
              </TabsTrigger>
              <TabsTrigger value="agents" className="text-[12.5px]">
                Agents
              </TabsTrigger>
              <TabsTrigger value="skills" className="text-[12.5px]">
                Skills
              </TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="mt-4">
              <div className="grid gap-4">
                <FieldRow label="API key" htmlFor="settings-api-key">
                  <Input
                    id="settings-api-key"
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-..."
                    className="focus-ring bg-card-ws border-ws-border text-[13px]"
                  />
                </FieldRow>
                <FieldRow label="Base URL" htmlFor="settings-base-url">
                  <Input
                    id="settings-base-url"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder="https://api.openai.com/v1"
                    className="focus-ring bg-card-ws border-ws-border text-[13px]"
                  />
                </FieldRow>
                <div className="flex items-center justify-between rounded-lg border border-ws-border bg-card-ws px-3 py-2.5">
                  <div className="grid gap-0.5">
                    <span className="text-[13px] text-foreground">
                      Use real OpenAI-compatible API
                    </span>
                    <span className="text-[12px] text-ws-disabled">
                      When off, chat requests fail with an error code instead
                      of contacting a provider.
                    </span>
                  </div>
                  <Switch
                    checked={useRealApi}
                    onCheckedChange={setUseRealApi}
                    aria-label="Use real API"
                  />
                </div>
                <FieldRow label="Default model" htmlFor="settings-model">
                  <Select
                    value={
                      visibleModels.some((m) => m.id === defaultModelId)
                        ? defaultModelId
                        : undefined
                    }
                    onValueChange={setDefaultModelId}
                  >
                    <SelectTrigger
                      id="settings-model"
                      className="focus-ring bg-card-ws border-ws-border text-[13px] w-full"
                    >
                      <SelectValue placeholder="Select default model" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-ws-border">
                      {visibleModels.length === 0 ? (
                        <SelectItem
                          value="__none__"
                          disabled
                          className="text-[13px]"
                        >
                          No models available
                        </SelectItem>
                      ) : (
                        visibleModels.map((m) => (
                          <SelectItem
                            key={m.id}
                            value={m.id}
                            className="text-[13px]"
                          >
                            {m.label}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </FieldRow>
                <FieldRow label="Default agent" htmlFor="settings-agent-default">
                  <Select
                    value={defaultAgentId || "__none__"}
                    onValueChange={(v) =>
                      setDefaultAgentId(v === "__none__" ? "" : v)
                    }
                  >
                    <SelectTrigger
                      id="settings-agent-default"
                      className="focus-ring bg-card-ws border-ws-border text-[13px] w-full"
                    >
                      <SelectValue placeholder="Select default agent" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-ws-border">
                      <SelectItem value="__none__" className="text-[13px]">
                        None
                      </SelectItem>
                      {effectiveEnabledAgentIds.map((id) => {
                        const a = AGENTS.find((x) => x.id === id);
                        if (!a) return null;
                        return (
                          <SelectItem key={id} value={id} className="text-[13px]">
                            {a.name} · {a.vendor}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </FieldRow>
              </div>
            </TabsContent>

            <TabsContent value="appearance" className="mt-4">
              <AppearanceTabContent />
            </TabsContent>

            <TabsContent value="providers" className="mt-4">
              <div className="grid gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="grid gap-0.5">
                    <span className="text-[14px] font-medium text-foreground">
                      Model providers
                    </span>
                    <span className="text-[12px] text-ws-secondary">
                      Configure API endpoints and keys. Use Fetch models to load
                      available models from each provider.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={openAddProvider}
                    className="inline-flex items-center gap-2 h-8 px-3 rounded-[8px] border border-ws-border bg-card-ws text-[13px] hover:bg-hover focus-ring"
                  >
                    <Plus className="size-3.5" />
                    Add provider
                  </button>
                </div>

                <div className="grid gap-2 rounded-[10px] border border-ws-border bg-card-ws p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="grid gap-0.5">
                      <span className="text-[13px] font-medium text-foreground">
                        Import from installed CLI configs
                      </span>
                      <span className="text-[12px] text-ws-secondary">
                        Pull providers and models from Codex, OpenCode, Kilo,
                        Claude Code and Gemini. Keys are never copied.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={scanCliConfigs}
                      disabled={cliScanning}
                      className="inline-flex items-center gap-2 h-8 px-3 rounded-[8px] border border-ws-border bg-hover text-[13px] hover:bg-card-ws focus-ring disabled:opacity-50"
                    >
                      {cliScanning ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Import className="size-3.5" />
                      )}
                      {cliScanning ? "Scanning…" : "Scan CLI configs"}
                    </button>
                  </div>

                  {cliError ? (
                    <p className="text-[12px] text-red-400">{cliError}</p>
                  ) : null}

                  {cliProviders.length > 0 ? (
                    <>
                      <div className="grid gap-1.5">
                        {cliProviders.map((p) => (
                          <label
                            key={p.id}
                            className={cn(
                              "flex items-start gap-3 rounded-[8px] border border-ws-border px-3 py-2",
                              "cursor-pointer hover:bg-hover"
                            )}
                          >
                            <Checkbox
                              checked={cliSelected.includes(p.id)}
                              onCheckedChange={(v) =>
                                toggleCliProvider(p.id, v === true)
                              }
                              className="mt-0.5"
                              aria-label={`Import ${p.name}`}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[13px] font-medium text-foreground">
                                  {p.name}
                                </span>
                                <Badge
                                  variant="secondary"
                                  className="text-[10px] px-1.5 py-0"
                                >
                                  {p.sourceCli}
                                </Badge>
                                {p.hasApiKey ? (
                                  <span className="text-[10px] text-accent-hi">
                                    key found in CLI (not copied)
                                  </span>
                                ) : null}
                              </div>
                              <div className="text-[11px] text-ws-disabled truncate font-mono">
                                {p.baseUrl || "No base URL found"}
                              </div>
                              <div className="text-[12px] text-ws-secondary">
                                {p.models.length} model(s):{" "}
                                {p.models.slice(0, 4).join(", ")}
                                {p.models.length > 4 ? "…" : ""}
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={confirmCliImport}
                          disabled={cliSelected.length === 0}
                          className="inline-flex items-center gap-2 h-8 px-3 rounded-[8px] bg-accent-fill text-white text-[13px] hover:bg-accent-hi focus-ring disabled:opacity-50"
                        >
                          Import {cliSelected.length} provider(s)
                        </button>
                      </div>
                    </>
                  ) : null}
                </div>

                <div className="ws-scroll max-h-[360px] overflow-y-auto flex flex-col gap-2 mt-1">
                  {providers.length === 0 ? (
                    <p className="text-[12.5px] text-ws-disabled">
                      No providers configured.
                    </p>
                  ) : (
                    providers.map((p) => (
                      <ProviderCard
                        key={p.id}
                        provider={p}
                        onRemove={setRemoveTarget}
                      />
                    ))
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="models" className="mt-4">
              <ModelsTabContent />
            </TabsContent>

            <TabsContent value="agents" className="mt-4">
              <div className="grid gap-3">
                <div className="grid gap-0.5">
                  <span className="text-[14px] font-medium text-foreground">
                    Installed agents
                  </span>
                  <span className="text-[12px] text-ws-secondary">
                    Detect coding agents installed on this machine, then choose
                    which ones appear in the composer agent picker.
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={scanAgents}
                    disabled={agentScanning}
                    className={cn(
                      "inline-flex items-center gap-2 h-9 px-3 rounded-[8px]",
                      "border border-ws-border bg-card-ws text-[13px] hover:bg-hover focus-ring",
                      "disabled:opacity-50"
                    )}
                  >
                    {agentScanning ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="size-3.5" />
                    )}
                    {agentScanning ? "Detecting..." : "Detect installed agents"}
                  </button>
                  <span className="text-[12px] text-ws-secondary">
                    {effectiveEnabledAgentIds.length} enabled
                  </span>
                </div>

                {agentScanError ? (
                  <p className="text-[12px] text-red-400">{agentScanError}</p>
                ) : null}

                <FieldRow label="Default agent" htmlFor="settings-agents-default">
                  <Select
                    value={defaultAgentId || "__none__"}
                    onValueChange={(v) =>
                      setDefaultAgentId(v === "__none__" ? "" : v)
                    }
                  >
                    <SelectTrigger
                      id="settings-agents-default"
                      className="focus-ring bg-card-ws border-ws-border text-[13px] w-full"
                    >
                      <SelectValue placeholder="Select default agent" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-ws-border">
                      <SelectItem value="__none__" className="text-[13px]">
                        None
                      </SelectItem>
                      {effectiveEnabledAgentIds.map((id) => {
                        const a = AGENTS.find((x) => x.id === id);
                        if (!a) return null;
                        return (
                          <SelectItem key={id} value={id} className="text-[13px]">
                            {a.name} · {a.vendor}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </FieldRow>

                <div className="grid gap-1.5">
                  {AGENTS.map((a) => {
                    const detected = Boolean(detectedMap[a.id]);
                    const enabled = effectiveEnabledAgentIds.includes(a.id);
                    return (
                      <label
                        key={a.id}
                        className={cn(
                          "flex items-start gap-3 rounded-[10px] border border-ws-border",
                          "bg-card-ws px-3 py-2.5",
                          detected
                            ? "cursor-pointer hover:bg-hover"
                            : "opacity-60"
                        )}
                      >
                        <Checkbox
                          checked={detected && enabled}
                          disabled={!detected}
                          onCheckedChange={(v) =>
                            toggleAgent(a.id, v === true)
                          }
                          className="mt-0.5"
                          aria-label={`Enable ${a.name}`}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-medium text-foreground">
                              {a.name}
                            </span>
                            <span className="text-[11px] text-ws-secondary">
                              {a.vendor}
                            </span>
                            {detected ? (
                              <Badge
                                variant="secondary"
                                className="bg-accent-fill/10 text-accent-hi border border-accent-fill/30 text-[10px] px-1.5 py-0"
                              >
                                installed
                              </Badge>
                            ) : (
                              <span className="text-[10px] uppercase tracking-wide text-ws-disabled">
                                not found
                              </span>
                            )}
                          </div>
                          <div className="text-[12px] text-ws-secondary line-clamp-1">
                            {a.description}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>

                <div className="h-px bg-ws-border my-1" />

                <FieldRow label="AGENTS.md" htmlFor="settings-agents">
                  <Textarea
                    id="settings-agents"
                    value={agentInstructions}
                    onChange={(e) => setAgentInstructions(e.target.value)}
                    className="focus-ring bg-card-ws border-ws-border min-h-[200px] font-mono text-[13px]"
                  />
                </FieldRow>
              </div>
            </TabsContent>

            <TabsContent value="skills" className="mt-4">
              <div className="grid gap-1.5">
                <div className="grid gap-0.5">
                  <span className="text-[14px] font-medium text-foreground">
                    Skills folder
                  </span>
                  <span className="text-[12px] text-ws-secondary">
                    Pick a local folder of skill files (.md). Detected skills
                    are added below.
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Input
                    value={skillsFolderPath}
                    onChange={(e) => setSkillsFolderPath(e.target.value)}
                    placeholder="C:\\path\\to\\skills (or relative folder)"
                    aria-label="Skills folder path"
                    className="bg-card-ws border border-ws-border h-9 text-[13px] flex-1 font-mono focus-ring"
                  />
                  <button
                    type="button"
                    onClick={scanSkillsFolder}
                    disabled={scanning || !skillsFolderPath.trim()}
                    className="inline-flex items-center gap-2 h-9 px-3 rounded-[8px] border border-ws-border bg-card-ws text-[13px] hover:bg-hover focus-ring disabled:opacity-50"
                  >
                    <FolderOpen className="size-3.5" />
                    {scanning ? "Scanning..." : "Scan"}
                  </button>
                  <button
                    type="button"
                    onClick={openBrowse}
                    className="inline-flex items-center gap-2 h-9 px-3 rounded-[8px] border border-ws-border bg-card-ws text-[13px] hover:bg-hover focus-ring"
                  >
                    Browse
                  </button>
                </div>
                {scanError && (
                  <p className="text-[12.5px] text-red-400 mt-2">{scanError}</p>
                )}
                {foundSkills.length > 0 && (
                  <div className="mt-2">
                    <p className="text-[12.5px] text-ws-secondary mb-1">
                      {foundSkills.length} skill(s) found in linked folder.
                    </p>
                    <div className="text-[12px] text-ws-secondary font-mono ws-scroll max-h-[160px] overflow-y-auto">
                      {foundSkills.map((s) => (
                        <div key={s} className="py-0.5">{s}</div>
                      ))}
                    </div>
                  </div>
                )}
                {browseOpen && (
                  <div className="mt-3 rounded-[8px] border border-ws-border bg-card-ws p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Input
                        value={browsePath}
                        onChange={(e) => setBrowsePath(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") loadBrowse(browsePath);
                        }}
                        className="bg-card-ws border border-ws-border h-8 text-[12px] flex-1 font-mono focus-ring"
                      />
                      <button
                        type="button"
                        onClick={() => loadBrowse(browsePath)}
                        className="h-8 px-2 rounded border border-ws-border text-[12px] hover:bg-hover"
                      >
                        Go
                      </button>
                      {browseParent && (
                        <button
                          type="button"
                          onClick={() => loadBrowse(browseParent)}
                          className="h-8 px-2 rounded border border-ws-border text-[12px] hover:bg-hover"
                        >
                          Up
                        </button>
                      )}
                    </div>
                    {browseError && (
                      <p className="text-[12px] text-red-400 mb-2">{browseError}</p>
                    )}
                    <div className="ws-scroll max-h-[220px] overflow-y-auto">
                      {browseLoading ? (
                        <p className="text-[12px] text-ws-secondary">Loading...</p>
                      ) : (
                        browseEntries
                          .filter((e) => e.type === "dir")
                          .map((e) => (
                            <button
                              key={e.path}
                              type="button"
                              onClick={() => loadBrowse(e.path)}
                              className="w-full text-left px-2 py-1 text-[12px] font-mono text-foreground hover:bg-hover rounded"
                            >
                              [dir] {e.name}
                            </button>
                          ))
                      )}
                    </div>
                    <div className="flex items-center justify-end gap-2 mt-3">
                      <button
                        type="button"
                        onClick={() => setBrowseOpen(false)}
                        className="h-8 px-3 rounded border border-ws-border text-[12px] hover:bg-hover"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSkillsFolderPath(browseCurrent || browsePath);
                          setBrowseOpen(false);
                        }}
                        className="h-8 px-3 rounded bg-accent-fill text-white text-[12px] hover:bg-accent-hi"
                      >
                        Select this folder
                      </button>
                    </div>
                  </div>
                )}
               </div>

              <div className="grid gap-3 mt-4">
                <p className="text-[12.5px] text-ws-disabled">
                  Skills are provided by the linked folder above.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="shrink-0 px-5 py-3 border-t border-ws-border">
          <Button
            type="button"
            onClick={() => setOpen(false)}
            className="bg-accent-fill text-white hover:bg-accent-hi"
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog open={addOpen} onOpenChange={setAddOpen}>
      <DialogContent className="max-w-[420px] max-[639px]:max-w-[calc(100vw-1.5rem)] max-[639px]:w-[calc(100vw-1.5rem)] p-0 bg-popover border border-ws-border">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-ws-border">
          <DialogTitle className="text-[14px]">Add provider</DialogTitle>
          <DialogDescription className="sr-only">
            Add a new model provider configuration.
          </DialogDescription>
        </DialogHeader>
        <div className="px-5 py-4 grid gap-3">
          <FieldRow label="Name" htmlFor="new-prov-name">
            <Input
              id="new-prov-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="My provider"
              className="h-8 bg-card-ws border-ws-border text-[13px] focus-ring"
            />
          </FieldRow>
          <FieldRow label="Type" htmlFor="new-prov-type">
            <Select
              value={newType}
              onValueChange={(v) => setNewType(v as ProviderType)}
            >
              <SelectTrigger
                id="new-prov-type"
                className="h-8 bg-card-ws border-ws-border text-[13px] w-full focus-ring"
              >
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-ws-border">
                <SelectItem value="openai" className="text-[13px]">
                  OpenAI
                </SelectItem>
                <SelectItem value="anthropic" className="text-[13px]">
                  Anthropic
                </SelectItem>
                <SelectItem value="ollama" className="text-[13px]">
                  Ollama
                </SelectItem>
                <SelectItem value="custom" className="text-[13px]">
                  Custom
                </SelectItem>
              </SelectContent>
            </Select>
          </FieldRow>
          <FieldRow label="Base URL" htmlFor="new-prov-url">
            <Input
              id="new-prov-url"
              value={newBaseUrl}
              onChange={(e) => setNewBaseUrl(e.target.value)}
              placeholder="https://api.openai.com/v1"
              className="h-8 bg-card-ws border-ws-border text-[13px] focus-ring"
            />
          </FieldRow>
        </div>
        <DialogFooter className="px-5 py-3 border-t border-ws-border">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setAddOpen(false)}
            className="bg-card-ws border-ws-border text-ws-secondary hover:text-foreground"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={confirmAddProvider}
            className="bg-accent-fill text-white hover:bg-accent-hi"
          >
            Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog
      open={removeTarget !== null}
      onOpenChange={(o) => {
        if (!o) setRemoveTarget(null);
      }}
    >
      <DialogContent className="max-w-[380px] max-[639px]:max-w-[calc(100vw-1.5rem)] max-[639px]:w-[calc(100vw-1.5rem)] p-0 bg-popover border border-ws-border">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-ws-border">
          <DialogTitle className="text-[14px]">Remove provider</DialogTitle>
          <DialogDescription>
            {removeTarget
              ? `Remove "${removeTarget.name}"? This will delete the provider and its model list.`
              : ""}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="px-5 py-3 border-t border-ws-border">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setRemoveTarget(null)}
            className="bg-card-ws border-ws-border text-ws-secondary hover:text-foreground"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={confirmRemove}
            className="bg-destructive text-white hover:opacity-90"
          >
            Remove
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
