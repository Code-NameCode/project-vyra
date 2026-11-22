"use client";

import * as React from "react";
import { Plus, X } from "lucide-react";
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
import { useAppStore } from "@/stores/useAppStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import modelsData from "@/data/models.json";
import type { ModelDef } from "@/lib/types";

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
  const useRealApi = useSettingsStore((s) => s.useRealApi);
  const setUseRealApi = useSettingsStore((s) => s.setUseRealApi);

  const [newSkill, setNewSkill] = React.useState("");
  const [tab, setTab] = React.useState("general");

  const addSkillOnEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const v = newSkill.trim();
    if (!v) return;
    addSkill(v);
    setNewSkill("");
  };

  return (
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
                      When off, Forge uses mock streaming responses.
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
                <FieldRow label="Theme" htmlFor="settings-theme" hint="Forge is always dark visually.">
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
              <div className="grid gap-3">
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
  );
}
