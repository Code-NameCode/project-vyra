"use client";

import {
  Boxes,
  CircuitBoard,
  Cpu,
  FileText,
  LayoutPanelLeft,
  MessageSquarePlus,
  PanelLeft,
  PanelRight,
  Settings,
  Sparkles,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useAppStore } from "@/stores/useAppStore";
import { useProjectsStore } from "@/stores/useProjectsStore";
import { useChatStore } from "@/stores/useChatStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import modelsData from "@/data/models.json";
import templatesData from "@/data/templates.json";
import type { ModelDef, TemplateDef } from "@/lib/types";
import { toast } from "sonner";

const MODELS = modelsData as ModelDef[];
const TEMPLATES = templatesData as TemplateDef[];

export function CommandPalette() {
  const searchOpen = useAppStore((s) => s.searchOpen);
  const setSearchOpen = useAppStore((s) => s.setSearchOpen);

  const newChatTab = useAppStore((s) => s.newChatTab);
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  const toggleRightPanel = useAppStore((s) => s.toggleRightPanel);
  const setSettingsOpen = useAppStore((s) => s.setSettingsOpen);
  const setMode = useAppStore((s) => s.setMode);
  const mode = useAppStore((s) => s.mode);
  const tabs = useAppStore((s) => s.tabs);
  const activeTabId = useAppStore((s) => s.activeTabId);

  const projects = useProjectsStore((s) => s.projects);

  const prefillFromTemplate = useChatStore((s) => s.startFromTemplate);
  const defaultModelId = useSettingsStore((s) => s.defaultModelId);
  const setDefaultModelId = useSettingsStore((s) => s.setDefaultModelId);

  const close = () => setSearchOpen(false);

  const runAction = (fn: () => void) => {
    fn();
    close();
  };

  return (
    <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
      <DialogContent
        className="p-0 overflow-hidden max-w-[520px] border border-ws-border bg-popover"
        showCloseButton={false}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Command palette</DialogTitle>
          <DialogDescription>
            Search chats, projects, and actions.
          </DialogDescription>
        </DialogHeader>

        <Command
          className="bg-popover"
          loop
        >
          <CommandInput
            placeholder="Search chats, projects, actions…"
            className="text-[14px]"
          />
          <CommandList className="max-h-[360px] overflow-y-auto ws-scroll">
            <CommandEmpty>No results.</CommandEmpty>

            <CommandGroup
              heading="Actions"
              className="[&_[cmdk-group-heading]]:text-[12px] [&_[cmdk-group-heading]]:text-ws-secondary"
            >
              <CommandItem
                onSelect={() =>
                  runAction(() => {
                    newChatTab();
                  })
                }
                className="text-[13px]"
              >
                <MessageSquarePlus className="size-4 text-ws-secondary" />
                <span>New chat</span>
              </CommandItem>
              <CommandItem
                onSelect={() => runAction(toggleSidebar)}
                className="text-[13px]"
              >
                <PanelLeft className="size-4 text-ws-secondary" />
                <span>Toggle sidebar</span>
              </CommandItem>
              <CommandItem
                onSelect={() => runAction(toggleRightPanel)}
                className="text-[13px]"
              >
                <PanelRight className="size-4 text-ws-secondary" />
                <span>Toggle right panel</span>
              </CommandItem>
              <CommandItem
                onSelect={() => runAction(() => setSettingsOpen(true))}
                className="text-[13px]"
              >
                <Settings className="size-4 text-ws-secondary" />
                <span>Open settings</span>
              </CommandItem>
              <CommandItem
                onSelect={() => runAction(() => setMode("code"))}
                className="text-[13px]"
              >
                <CircuitBoard className="size-4 text-ws-secondary" />
                <span>
                  Switch to Code mode
                  {mode === "code" ? " (active)" : ""}
                </span>
              </CommandItem>
              <CommandItem
                onSelect={() => runAction(() => setMode("chat"))}
                className="text-[13px]"
              >
                <LayoutPanelLeft className="size-4 text-ws-secondary" />
                <span>
                  Switch to Chat mode
                  {mode === "chat" ? " (active)" : ""}
                </span>
              </CommandItem>
            </CommandGroup>

            {tabs.length > 0 ? (
              <CommandGroup
                heading="Chats"
                className="[&_[cmdk-group-heading]]:text-[12px] [&_[cmdk-group-heading]]:text-ws-secondary"
              >
                {tabs.map((t) => (
                  <CommandItem
                    key={t.id}
                    value={`chat ${t.title}`}
                    onSelect={() =>
                      runAction(() => {
                        setActiveTab(t.id);
                      })
                    }
                    className="text-[13px]"
                  >
                    <MessageSquarePlus className="size-4 text-ws-secondary" />
                    <span className="truncate">{t.title}</span>
                    {t.id === activeTabId ? (
                      <span className="ml-auto text-[11px] text-accent-hi">
                        active
                      </span>
                    ) : null}
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}

            {projects.length > 0 ? (
              <CommandGroup
                heading="Projects"
                className="[&_[cmdk-group-heading]]:text-[12px] [&_[cmdk-group-heading]]:text-ws-secondary"
              >
                {projects.map((p) => (
                  <CommandItem
                    key={p.id}
                    value={`project ${p.name}`}
                    onSelect={() =>
                      runAction(() => {
                        useAppStore.getState().openProject(p.id, p.name);
                      })
                    }
                    className="text-[13px]"
                  >
                    <Boxes className="size-4 text-ws-secondary" />
                    <span className="truncate">{p.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}

            {TEMPLATES.length > 0 ? (
              <CommandGroup
                heading="Templates"
                className="[&_[cmdk-group-heading]]:text-[12px] [&_[cmdk-group-heading]]:text-ws-secondary"
              >
                {TEMPLATES.map((tpl) => (
                  <CommandItem
                    key={tpl.id}
                    value={`template ${tpl.title} ${tpl.category}`}
                    onSelect={() =>
                      runAction(() => {
                        prefillFromTemplate(tpl.prompt, tpl.title, tpl.id);
                      })
                    }
                    className="text-[13px]"
                  >
                    <FileText className="size-4 text-ws-secondary" />
                    <span className="truncate">{tpl.title}</span>
                    <span className="ml-auto text-[11px] text-ws-disabled">
                      {tpl.category}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}

            <CommandGroup
              heading="Models"
              className="[&_[cmdk-group-heading]]:text-[12px] [&_[cmdk-group-heading]]:text-ws-secondary"
            >
              {MODELS.map((m) => (
                <CommandItem
                  key={m.id}
                  value={`model ${m.name} ${m.id}`}
                  onSelect={() =>
                    runAction(() => {
                      setDefaultModelId(m.id);
                      toast.success(`Default model: ${m.name}`);
                    })
                  }
                  className="text-[13px]"
                >
                  {m.id === defaultModelId ? (
                    <Sparkles className="size-4 text-accent-hi" />
                  ) : (
                    <Cpu className="size-4 text-ws-secondary" />
                  )}
                  <span className="truncate">{m.name}</span>
                  <span className="ml-auto text-[11px] text-ws-disabled font-mono">
                    {m.multiplier === 0 ? "unlimited" : `${m.multiplier}x`}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
