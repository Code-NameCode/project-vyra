"use client";

import * as React from "react";
import {
  Eye,
  EyeOff,
  FolderOpen,
  Loader2,
  Plus,
  RefreshCw,
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
import { toast } from "sonner";
import { useAppStore } from "@/stores/useAppStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { useProvidersStore } from "@/stores/useProvidersStore";
import modelsData from "@/data/models.json";
import type { ModelDef, Provider, ProviderType } from "@/lib/types";

const MODELS = modelsData as ModelDef[];

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

function ProviderCard({
  provider,
  onRemove,
}: {
  provider: Provider;
  onRemove: (p: Provider) => void;
}) {
  const updateProvider = useProvidersStore((s) => s.updateProvider);
  const toggleModelHidden = useProvidersStore((s) => s.toggleModelHidden);
  const detectOllama = useProvidersStore((s) => s.detectOllama);
  const detecting = useProvidersStore((s) => s.detecting);
  const isOllama = provider.type === "ollama";

  const onDetect = async () => {
    try {
      const models = await detectOllama(provider.baseUrl);
      if (models.length === 0) {
        toast.error("Ollama not reachable");
      } else {
        toast.success(`${models.length} Ollama model(s) detected`);
      }
    } catch {
      toast.error("Ollama not reachable");
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
            Ollama runs locally and needs no API key. Use the detect button
            below to fetch available models.
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
              placeholder="sk-..."
              className="h-8 bg-card-ws border-ws-border-soft text-[13px] focus-ring"
            />
          </FieldRow>
        )}
      </div>

      <div className="mt-2 flex flex-col gap-0.5">
        <div className="flex items-center justify-between px-2">
          <span className="text-[11px] uppercase tracking-wide text-ws-secondary">
            Models
          </span>
          <span className="text-[11px] text-ws-secondary">
            {provider.models.length}
          </span>
        </div>

        {provider.models.length === 0 ? (
          <div className="flex items-center justify-between px-2">
            <span className="text-[12px] text-ws-disabled py-1">No models</span>
            {isOllama ? (
              <button
                type="button"
                onClick={onDetect}
                disabled={detecting}
                className="inline-flex items-center gap-2 h-8 px-3 rounded-[8px] bg-accent-fill text-white text-[13px] hover:opacity-90 focus-ring disabled:opacity-60"
              >
                {detecting ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="size-3.5" />
                )}
                {detecting ? "Detecting..." : "Detect models"}
              </button>
            ) : null}
          </div>
        ) : (
          <>
            {provider.models.map((m) => (
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
                  onClick={() => toggleModelHidden(provider.id, m.id)}
                  aria-label={m.hidden ? "Show model" : "Hide model"}
                  className="ml-auto inline-flex items-center justify-center size-6 rounded-[6px] text-ws-secondary hover:bg-card-ws hover:text-foreground focus-ring"
                >
                  {m.hidden ? (
                    <EyeOff className="size-3.5" />
                  ) : (
                    <Eye className="size-3.5" />
                  )}
                </button>
              </div>
            ))}
            {isOllama ? (
              <div className="flex justify-end mt-1">
                <button
                  type="button"
                  onClick={onDetect}
                  disabled={detecting}
                  className="inline-flex items-center gap-2 h-8 px-3 rounded-[8px] bg-accent-fill text-white text-[13px] hover:opacity-90 focus-ring disabled:opacity-60"
                >
                  {detecting ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="size-3.5" />
                  )}
                  {detecting ? "Detecting..." : "Detect models"}
                </button>
              </div>
            ) : null}
          </>
        )}
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
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const agentInstructions = useSettingsStore((s) => s.agentInstructions);
  const setAgentInstructions = useSettingsStore((s) => s.setAgentInstructions);
  const skills = useSettingsStore((s) => s.skills);
  const addSkill = useSettingsStore((s) => s.addSkill);
  const removeSkill = useSettingsStore((s) => s.removeSkill);
  const skillsFolderPath = useSettingsStore((s) => s.skillsFolderPath);
  const setSkillsFolderPath = useSettingsStore((s) => s.setSkillsFolderPath);
  const useRealApi = useSettingsStore((s) => s.useRealApi);
  const setUseRealApi = useSettingsStore((s) => s.setUseRealApi);

  const providers = useProvidersStore((s) => s.providers);
  const addProvider = useProvidersStore((s) => s.addProvider);
  const removeProvider = useProvidersStore((s) => s.removeProvider);

  const [newSkill, setNewSkill] = React.useState("");
  const [tab, setTab] = React.useState("general");

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
    removeProvider(removeTarget.id);
    toast.success("Provider removed");
    setRemoveTarget(null);
  };

  const addSkillOnEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const v = newSkill.trim();
    if (!v) return;
    addSkill(v);
    setNewSkill("");
  };

  const folderInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const el = folderInputRef.current;
    if (el) {
      el.setAttribute("webkitdirectory", "");
    }
  }, []);

  const onFolderPicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) {
      e.target.value = "";
      return;
    }
    const first = fileList[0] as File & { webkitRelativePath?: string };
    const rel = first.webkitRelativePath;
    if (rel) {
      const folderName = rel.split("/")[0];
      if (folderName) setSkillsFolderPath(folderName);
    }
    const added = new Set<string>();
    for (let i = 0; i < fileList.length; i++) {
      const name = fileList[i].name;
      const lower = name.toLowerCase();
      if (!lower.endsWith(".md") && !lower.endsWith(".txt")) continue;
      const base = name.replace(/\.[^.]+$/, "");
      if (!base) continue;
      if (skills.includes(base) || added.has(base)) continue;
      addSkill(base);
      added.add(base);
    }
    if (added.size > 0) {
      toast.success(`${added.size} skill(s) imported from folder`);
    } else {
      toast("No skill files found in folder");
    }
    e.target.value = "";
  };

  return (
    <>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-[640px] p-0 bg-popover border border-ws-border">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-ws-border">
          <DialogTitle className="text-[15px]">Settings</DialogTitle>
          <DialogDescription className="sr-only">
            Configure API key, models, agent instructions and skills.
          </DialogDescription>
        </DialogHeader>

        <div className="px-5 py-4">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="bg-card-ws border border-ws-border h-8">
              <TabsTrigger value="general" className="text-[12.5px]">
                General
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
                      When off, Goodstuff-Agent uses mock streaming responses.
                    </span>
                  </div>
                  <Switch
                    checked={useRealApi}
                    onCheckedChange={setUseRealApi}
                    aria-label="Use real API"
                  />
                </div>
                <FieldRow label="Default model" htmlFor="settings-model">
                  <Select value={defaultModelId} onValueChange={setDefaultModelId}>
                    <SelectTrigger
                      id="settings-model"
                      className="focus-ring bg-card-ws border-ws-border text-[13px] w-full"
                    >
                      <SelectValue placeholder="Select default model" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-ws-border">
                      {MODELS.map((m) => (
                        <SelectItem key={m.id} value={m.id} className="text-[13px]">
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldRow>
                <FieldRow label="Theme" htmlFor="settings-theme" hint="Goodstuff-Agent is always dark visually.">
                  <Select value={theme} onValueChange={(v) => setTheme(v as "dark" | "light")}>
                    <SelectTrigger
                      id="settings-theme"
                      className="focus-ring bg-card-ws border-ws-border text-[13px] w-full"
                    >
                      <SelectValue placeholder="Select theme" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-ws-border">
                      <SelectItem value="dark" className="text-[13px]">
                        Dark
                      </SelectItem>
                      <SelectItem value="light" className="text-[13px]">
                        Light
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </FieldRow>
              </div>
            </TabsContent>

            <TabsContent value="providers" className="mt-4">
              <div className="grid gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="grid gap-0.5">
                    <span className="text-[14px] font-medium text-foreground">
                      Model providers
                    </span>
                    <span className="text-[12px] text-ws-secondary">
                      Configure API endpoints and keys. Ollama models are
                      auto-detected locally.
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

                <div className="ws-scroll max-h-[360px] overflow-y-auto flex flex-col gap-2 mt-3">
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
              <div className="grid gap-2">
                {MODELS.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-start justify-between rounded-lg border border-ws-border bg-card-ws px-3 py-2.5"
                  >
                    <div className="grid gap-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] text-foreground truncate">
                          {m.name}
                        </span>
                        <Badge
                          variant="secondary"
                          className="text-[10px] bg-hover text-ws-secondary border border-ws-border-soft"
                        >
                          {m.multiplier === 0 ? "unlimited" : `${m.multiplier}x`}
                        </Badge>
                      </div>
                      <p className="text-[12px] text-ws-secondary truncate">
                        {m.description}
                      </p>
                    </div>
                    <span className="text-[11px] text-ws-disabled font-mono ml-3 shrink-0">
                      {m.contextWindow}
                    </span>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="agents" className="mt-4">
              <FieldRow label="AGENTS.md" htmlFor="settings-agents">
                <Textarea
                  id="settings-agents"
                  value={agentInstructions}
                  onChange={(e) => setAgentInstructions(e.target.value)}
                  className="focus-ring bg-card-ws border-ws-border min-h-[200px] font-mono text-[13px]"
                />
              </FieldRow>
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
                    readOnly
                    value={skillsFolderPath || "No folder selected"}
                    aria-label="Skills folder path"
                    className="bg-card-ws border border-ws-border h-9 text-[13px] flex-1 font-mono focus-ring"
                  />
                  <button
                    type="button"
                    onClick={() => folderInputRef.current?.click()}
                    className="inline-flex items-center gap-2 h-9 px-3 rounded-[8px] border border-ws-border bg-card-ws text-[13px] hover:bg-hover focus-ring"
                  >
                    <FolderOpen className="size-3.5" />
                    Browse
                  </button>
                </div>
                <input
                  ref={(el) => {
                    folderInputRef.current = el;
                    if (el) el.setAttribute("webkitdirectory", "");
                  }}
                  type="file"
                  multiple
                  accept=".md,.txt"
                  onChange={onFolderPicked}
                  aria-hidden
                  className="hidden"
                />
              </div>

              <div className="grid gap-3 mt-4">
                <div className="flex flex-wrap gap-2">
                  {skills.length === 0 ? (
                    <p className="text-[12.5px] text-ws-disabled">
                      No skills configured.
                    </p>
                  ) : (
                    skills.map((s) => (
                      <Badge
                        key={s}
                        variant="secondary"
                        className="bg-hover text-foreground border border-ws-border-soft gap-1.5 pl-2.5 pr-1 py-1 text-[12px]"
                      >
                        {s}
                        <button
                          type="button"
                          onClick={() => removeSkill(s)}
                          aria-label={`Remove ${s}`}
                          className="focus-ring rounded p-0.5 text-ws-secondary hover:text-foreground"
                        >
                          <X className="size-3" />
                        </button>
                      </Badge>
                    ))
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    onKeyDown={addSkillOnEnter}
                    placeholder="Add a skill and press Enter"
                    className="focus-ring bg-card-ws border-ws-border text-[13px]"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="bg-card-ws border-ws-border text-ws-secondary hover:text-foreground"
                    onClick={() => {
                      const v = newSkill.trim();
                      if (!v) return;
                      addSkill(v);
                      setNewSkill("");
                    }}
                  >
                    <Plus className="size-3.5" />
                    Add
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="px-5 py-3 border-t border-ws-border">
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
      <DialogContent className="max-w-[420px] p-0 bg-popover border border-ws-border">
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
      <DialogContent className="max-w-[380px] p-0 bg-popover border border-ws-border">
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
