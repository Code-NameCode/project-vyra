"use client";

import * as React from "react";
import {
  ArrowUp,
  BookOpen,
  Bot,
  Brain,
  Check,
  ChevronDown,
  CircleHelp,
  Code2,
  Cpu,
  Eraser,
  Feather,
  File,
  FileText,
  FlaskConical,
  Folder,
  Hammer,
  Map,
  Mic,
  Paperclip,
  Plus,
  Rocket,
  ScanSearch,
  Shuffle,
  Sparkles,
  Square,
  TerminalSquare,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useChatStore } from "@/stores/useChatStore";
import { useAppStore } from "@/stores/useAppStore";
import { useProjectsStore } from "@/stores/useProjectsStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { SLASH_COMMANDS } from "@/data/slashCommands";
import { AGENTS } from "@/data/agents";
import type {
  AgentDef,
  Conversation,
  FileNode,
  SlashCommand,
} from "@/lib/types";
import { ModelPicker } from "./ModelPicker";

/* ---- minimal Web Speech API typing (no `any`) ---- */
interface SpeechResultLike {
  0: { transcript: string };
  isFinal: boolean;
  length: number;
}
interface SpeechEventLike {
  results: ArrayLike<SpeechResultLike>;
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechEventLike) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onend: (() => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;
type WindowWithSpeech = Window & {
  SpeechRecognition?: SpeechRecognitionCtor;
  webkitSpeechRecognition?: SpeechRecognitionCtor;
};

/* ---- Plan / Build mode ---- */
type BuildMode = "plan" | "build";
// Other modules may extend Conversation/ChatState with buildMode. Access
// defensively so the Composer keeps working whether or not the store has
// been augmented yet.
type ConvWithBuild = Conversation & { buildMode?: BuildMode };
interface ChatStoreWithBuild {
  setBuildMode?: (tabId: string, mode: BuildMode) => void;
}

/* ---- skill icon map for slash commands ---- */
const SKILL_ICON: Record<string, LucideIcon> = {
  brain: Brain,
  hammer: Hammer,
  scan: ScanSearch,
  flask: FlaskConical,
  wrench: Wrench,
  book: BookOpen,
  shuffle: Shuffle,
  doc: FileText,
  rocket: Rocket,
  eraser: Eraser,
  cpu: Cpu,
  help: CircleHelp,
};
function skillIcon(key?: string): LucideIcon {
  if (key && SKILL_ICON[key]) return SKILL_ICON[key];
  return Sparkles;
}

/* ---- agent icon map ---- */
const AGENT_ICON: Record<string, LucideIcon> = {
  terminal: TerminalSquare,
  bot: Bot,
  code: Code2,
  zap: Zap,
  brain: Brain,
  shuffle: Shuffle,
  feather: Feather,
  flask: FlaskConical,
};
function agentIcon(key?: string): LucideIcon {
  if (key && AGENT_ICON[key]) return AGENT_ICON[key];
  return Bot;
}

/* ---- @ context reference item ---- */
type SlashCommandWithIcon = SlashCommand & { icon?: string };
interface RefItem {
  kind: "file" | "project";
  name: string;
  path: string;
  icon: LucideIcon;
}
const EMPTY_FILES: FileNode[] = [];
const EMPTY_SKILLS: string[] = [];

/** Strip a leading `/` from a slash command label (e.g. "/review" -> "review"). */
function stripSlash(label: string): string {
  return label.replace(/^\//, "");
}

/**
 * Composer — the core prompt input.
 * Auto-growing textarea, slash command popup (with skill icons) that adds
 * action skills as removable chips, Codex-style `@` context referencing,
 * attach menu, Plan/Build mode selector, agent picker chip, model picker
 * chip, and a send/stop/voice button.
 */
export function Composer({ tabId }: { tabId: string }) {
  const ensure = useChatStore((s) => s.ensure);
  const draft = useChatStore((s) => s.conversations[tabId]?.composerDraft ?? "");
  const streaming = useChatStore(
    (s) => s.conversations[tabId]?.streaming ?? false
  );
  const convModelId = useChatStore((s) => s.conversations[tabId]?.modelId);
  const defaultModelId = useSettingsStore((s) => s.defaultModelId);
  const setComposerDraft = useChatStore((s) => s.setComposerDraft);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const stopStreaming = useChatStore((s) => s.stopStreaming);
  const clearConversation = useChatStore((s) => s.clearConversation);

  /* ---- skills (multi-chip) ---- */
  const skills = useChatStore(
    (s) => s.conversations[tabId]?.skills ?? EMPTY_SKILLS
  );
  const addSkill = useChatStore((s) => s.addSkill);
  const removeSkill = useChatStore((s) => s.removeSkill);

  /* ---- agent picker ---- */
  const agentId = useChatStore(
    (s) => s.conversations[tabId]?.agentId ?? ""
  );
  const setAgent = useChatStore((s) => s.setAgent);

  /* ---- Plan / Build mode (defensive: works with or without store support) ---- */
  const storeBuildMode = useChatStore(
    (s) =>
      (s.conversations[tabId] as ConvWithBuild | undefined)?.buildMode ??
      ("build" as BuildMode)
  );
  const storeSetBuildMode = useChatStore(
    (s) => (s as unknown as ChatStoreWithBuild).setBuildMode
  );
  const [localBuildMode, setLocalBuildMode] =
    React.useState<BuildMode>("build");
  const buildMode: BuildMode = storeSetBuildMode
    ? (storeBuildMode as BuildMode)
    : localBuildMode;
  const setBuildMode = React.useCallback(
    (mode: BuildMode) => {
      if (storeSetBuildMode) storeSetBuildMode(tabId, mode);
      else setLocalBuildMode(mode);
    },
    [storeSetBuildMode, tabId]
  );

  /* ---- active workspace (reactive) for `@` referencing ---- */
  const projectId = useAppStore(
    (s) => s.tabs.find((t) => t.id === tabId)?.projectId
  );
  const projects = useProjectsStore((s) => s.projects);
  const convFiles = useChatStore(
    (s) => s.conversations[tabId]?.workspace.files
  );

  const files = React.useMemo<FileNode[]>(() => {
    if (projectId) {
      return (
        projects.find((p) => p.id === projectId)?.workspace.files ??
        EMPTY_FILES
      );
    }
    return convFiles ?? EMPTY_FILES;
  }, [projectId, projects, convFiles]);

  const refItems = React.useMemo<RefItem[]>(() => {
    const fileItems: RefItem[] = files.map((f) => ({
      kind: "file",
      name: f.name,
      path: f.path,
      icon: File,
    }));
    const projItems: RefItem[] = projects.map((p) => ({
      kind: "project",
      name: p.name,
      path: p.name,
      icon: Folder,
    }));
    return [...fileItems, ...projItems];
  }, [files, projects]);

  const modelId = convModelId ?? defaultModelId;

  const taRef = React.useRef<HTMLTextAreaElement>(null);
  const [modelOpen, setModelOpen] = React.useState(false);
  const [agentOpen, setAgentOpen] = React.useState(false);
  const [slashSuppressed, setSlashSuppressed] = React.useState(false);
  const [selIndex, setSelIndex] = React.useState(0);
  const [atSuppressed, setAtSuppressed] = React.useState(false);
  const [atIndex, setAtIndex] = React.useState(0);

  // ensure a conversation object exists so modelId/draft are stable
  React.useEffect(() => {
    ensure(tabId);
  }, [tabId, ensure]);

  // auto-grow textarea whenever draft changes (covers typing + external updates)
  React.useLayoutEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`;
  }, [draft]);

  // reset slash + @ suppression + selection whenever draft changes
  React.useEffect(() => {
    setSlashSuppressed(false);
    setSelIndex(0);
    setAtSuppressed(false);
    setAtIndex(0);
  }, [draft]);

  /* ---- slash command popup derivation ---- */
  const slashWithIcons = React.useMemo<SlashCommandWithIcon[]>(
    () => SLASH_COMMANDS as SlashCommandWithIcon[],
    []
  );
  const isSlashDraft =
    draft.startsWith("/") &&
    !draft.slice(1).includes(" ") &&
    !streaming;
  const filtered = React.useMemo<SlashCommand[]>(() => {
    if (!isSlashDraft) return [];
    const q = draft.slice(1).toLowerCase();
    if (!q) return slashWithIcons;
    return slashWithIcons.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q) ||
        c.hint.toLowerCase().includes(q)
    );
  }, [isSlashDraft, draft, slashWithIcons]);
  const slashVisible = isSlashDraft && !slashSuppressed && filtered.length > 0;

  /* ---- @ context reference popup derivation ---- */
  const atQuery = React.useMemo<{ index: number; query: string } | null>(() => {
    const lastAt = draft.lastIndexOf("@");
    if (lastAt === -1) return null;
    const after = draft.slice(lastAt + 1);
    // the query is the text from the last "@" to the end of the draft;
    // any whitespace terminates it.
    if (/\s/.test(after)) return null;
    return { index: lastAt, query: after };
  }, [draft]);

  const atFiltered = React.useMemo<RefItem[]>(() => {
    if (!atQuery) return [];
    const q = atQuery.query.toLowerCase();
    const list = q
      ? refItems.filter(
          (it) =>
            it.name.toLowerCase().includes(q) ||
            it.path.toLowerCase().includes(q)
        )
      : refItems;
    return list.slice(0, 12);
  }, [atQuery, refItems]);

  const atVisible =
    !streaming &&
    !slashVisible &&
    atQuery !== null &&
    !atSuppressed &&
    atFiltered.length > 0;

  // keep atIndex within bounds when the filtered list shrinks
  React.useEffect(() => {
    if (atFiltered.length > 0 && atIndex >= atFiltered.length) {
      setAtIndex(0);
    }
  }, [atFiltered, atIndex]);

  /* ---- actions ---- */
  const handleSend = React.useCallback(() => {
    if (streaming) return;
    const text = useChatStore.getState().conversations[tabId]?.composerDraft ?? "";
    if (!text.trim()) return;
    void sendMessage(tabId, text, modelId);
  }, [streaming, tabId, modelId, sendMessage]);

  const selectCommand = React.useCallback(
    (cmd: SlashCommand) => {
      // Read the live draft + skills from the store to avoid stale closures.
      const currentDraft =
        useChatStore.getState().conversations[tabId]?.composerDraft ?? "";
      const beforeSlash = currentDraft.slice(0, currentDraft.lastIndexOf("/"));
      const focusTextarea = () =>
        requestAnimationFrame(() => taRef.current?.focus());

      if (cmd.id === "model") {
        setComposerDraft(tabId, "");
        setModelOpen(true);
        return;
      }
      if (cmd.id === "clear") {
        clearConversation(tabId);
        setComposerDraft(tabId, "");
        toast("Conversation cleared");
        return;
      }
      if (cmd.id === "help") {
        setComposerDraft(tabId, "");
        toast("Press / for commands · Enter to send · Shift+Enter for newline", {
          duration: 4000,
        });
        return;
      }
      if (cmd.id === "plan") {
        setBuildMode("plan");
        setComposerDraft(tabId, beforeSlash);
        toast("Switched to Plan");
        focusTextarea();
        return;
      }
      if (cmd.id === "build") {
        setBuildMode("build");
        setComposerDraft(tabId, beforeSlash);
        toast("Switched to Build");
        focusTextarea();
        return;
      }
      // action skills (review, test, fix, explain, refactor, document, init):
      // add as a removable chip instead of inserting text.
      const currentSkills =
        useChatStore.getState().conversations[tabId]?.skills ?? [];
      if (currentSkills.includes(cmd.id)) {
        toast("Already added");
      } else {
        addSkill(tabId, cmd.id);
        toast(`${stripSlash(cmd.label)} skill added`);
      }
      setComposerDraft(tabId, beforeSlash);
      focusTextarea();
    },
    [
      tabId,
      setComposerDraft,
      clearConversation,
      addSkill,
      setBuildMode,
    ]
  );

  const selectRef = React.useCallback(
    (item: RefItem) => {
      if (!atQuery) return;
      const before = draft.slice(0, atQuery.index);
      const next = `${before}@${item.name} `;
      setComposerDraft(tabId, next);
      requestAnimationFrame(() => taRef.current?.focus());
    },
    [atQuery, draft, setComposerDraft, tabId]
  );

  /* ---- keyboard ---- */
  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (slashVisible) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelIndex((i) => (i + 1) % filtered.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelIndex((i) => (i - 1 + filtered.length) % filtered.length);
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const cmd = filtered[selIndex] ?? filtered[0];
        if (cmd) selectCommand(cmd);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setSlashSuppressed(true);
        return;
      }
      if (e.key === "Tab") {
        e.preventDefault();
        const cmd = filtered[selIndex] ?? filtered[0];
        if (cmd) selectCommand(cmd);
        return;
      }
    }
    if (atVisible) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setAtIndex((i) => (i + 1) % atFiltered.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setAtIndex((i) => (i - 1 + atFiltered.length) % atFiltered.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        const item = atFiltered[atIndex] ?? atFiltered[0];
        if (item) selectRef(item);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setAtSuppressed(true);
        return;
      }
    }
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      if (!streaming && draft.trim()) {
        e.preventDefault();
        handleSend();
      }
    }
  };

  /* ---- voice ---- */
  const startVoice = React.useCallback(() => {
    const w = window as WindowWithSpeech;
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) {
      toast.error("Voice input not supported in this browser");
      return;
    }
    try {
      const rec = new Ctor();
      rec.lang = "en-US";
      rec.continuous = false;
      rec.interimResults = false;
      rec.onresult = (event: SpeechEventLike) => {
        let transcript = "";
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (!transcript) return;
        const cur =
          useChatStore.getState().conversations[tabId]?.composerDraft ?? "";
        const next = (cur ? cur + " " : "") + transcript.trim();
        setComposerDraft(tabId, next);
      };
      rec.onerror = () => {
        toast.error("Voice input failed");
      };
      rec.start();
      toast("Listening…", { duration: 2500 });
    } catch {
      toast.error("Voice input could not start");
    }
  }, [tabId, setComposerDraft]);

  /* ---- send button state ---- */
  const canSend = draft.trim().length > 0;
  const sendState: "send" | "stop" | "voice" = streaming
    ? "stop"
    : canSend
    ? "send"
    : "voice";

  const onSendClick = () => {
    if (sendState === "stop") stopStreaming(tabId);
    else if (sendState === "send") handleSend();
    else startVoice();
  };

  const SendIcon = sendState === "stop" ? Square : sendState === "send" ? ArrowUp : Mic;
  const sendLabel = sendState === "stop" ? "Stop" : sendState === "send" ? "Send" : "Voice";

  /* ---- active agent (for the trigger chip) ---- */
  const activeAgent: AgentDef | undefined = agentId
    ? AGENTS.find((a) => a.id === agentId)
    : undefined;
  const agentTriggerName = activeAgent ? activeAgent.name : "Agent";

  const handleAgentSelect = (id: string, name: string) => {
    setAgent(tabId, id);
    setAgentOpen(false);
    toast(`${name} selected`);
  };

  return (
    <div className="relative w-full">
      {/* slash command popup (above the box) */}
      {slashVisible && (
        <div
          className={cn(
            "absolute bottom-full mb-2 left-0 w-[300px] z-30",
            "rounded-[12px] border border-ws-border bg-popover p-1.5 ws-fade-in",
            "shadow-2xl max-h-[260px] overflow-y-auto ws-scroll"
          )}
          role="listbox"
        >
          {filtered.map((c, i) => {
            const Icon = skillIcon(
              (c as SlashCommandWithIcon).icon
            );
            return (
              <button
                type="button"
                key={c.id}
                onMouseEnter={() => setSelIndex(i)}
                onClick={() => selectCommand(c)}
                className={cn(
                  "w-full flex items-center gap-2.5 rounded-[8px] px-2.5 py-2 cursor-pointer",
                  "transition-colors text-left",
                  i === selIndex ? "bg-hover" : "hover:bg-hover"
                )}
              >
                <Icon
                  className={cn(
                    "size-4 shrink-0",
                    i === selIndex ? "text-accent-hi" : "text-ws-secondary"
                  )}
                />
                <div className="min-w-0">
                  <div className="text-[13px] font-medium text-foreground">
                    {c.label}
                  </div>
                  <div className="text-[12px] text-ws-secondary line-clamp-1">
                    {c.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* `@` context reference popup (above the box) */}
      {atVisible && (
        <div
          className={cn(
            "absolute bottom-full mb-2 left-0 w-[320px] z-30",
            "rounded-[12px] border border-ws-border bg-popover p-1.5 ws-fade-in",
            "shadow-2xl max-h-[280px] overflow-y-auto ws-scroll"
          )}
          role="listbox"
        >
          {atFiltered.map((item, i) => {
            const ItemIcon = item.icon;
            return (
              <button
                type="button"
                key={`${item.kind}-${item.path}`}
                onMouseEnter={() => setAtIndex(i)}
                onClick={() => selectRef(item)}
                className={cn(
                  "w-full flex items-center gap-2 rounded-[8px] px-2.5 py-2",
                  "text-left cursor-pointer transition-colors",
                  i === atIndex ? "bg-hover" : "hover:bg-hover"
                )}
              >
                <ItemIcon className="size-3.5 shrink-0 text-ws-secondary" />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] text-foreground truncate">
                    {item.name}
                  </div>
                  <div className="text-[11px] text-ws-disabled truncate">
                    {item.kind === "project" ? "project" : item.path}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* composer box */}
      <div
        className={cn(
          "relative rounded-[14px] border border-ws-border",
          "bg-card-ws p-3.5 transition-colors duration-150",
          "focus-within:border-accent-fill/50"
        )}
      >
        {/* skills chip row (above the textarea, only when skills exist) */}
        {skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2 ws-fade-in">
            {skills.map((skillId) => {
              const cmd = SLASH_COMMANDS.find((c) => c.id === skillId);
              const Icon = cmd ? skillIcon(cmd.icon) : Sparkles;
              const label = cmd ? stripSlash(cmd.label) : skillId;
              return (
                <span
                  key={skillId}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full",
                    "border border-ws-border bg-hover pl-2 pr-1 py-0.5",
                    "text-[12px] text-foreground"
                  )}
                >
                  <Icon className="size-3 text-accent-hi" />
                  {label}
                  <button
                    type="button"
                    aria-label="Remove skill"
                    onClick={() => removeSkill(tabId, skillId)}
                    className={cn(
                      "inline-flex items-center justify-center size-4 rounded-full",
                      "text-ws-secondary hover:text-foreground hover:bg-card-ws",
                      "transition-colors focus-ring"
                    )}
                  >
                    <X className="size-3" />
                  </button>
                </span>
              );
            })}
          </div>
        )}

        <Textarea
          ref={taRef}
          value={draft}
          onChange={(e) => setComposerDraft(tabId, e.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          placeholder="Ask Goodstuff-Agent... Use / for commands"
          className={cn(
            "bg-transparent border-0 resize-none p-0 m-0",
            "text-[15px] leading-[1.55] text-foreground",
            "placeholder:text-ws-secondary/80",
            "focus-visible:ring-0 outline-none shadow-none",
            "max-h-[200px] min-h-[28px] ws-scroll",
            "[field-sizing:none]"
          )}
        />

        {/* bottom row */}
        <div className="flex items-center justify-between mt-2.5 gap-2">
          {/* left cluster: attach + Plan/Build selector + agent picker */}
          <div className="flex items-center gap-1.5">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Attach"
                  className={cn(
                    "inline-flex items-center justify-center size-8",
                    "rounded-[8px] text-ws-secondary hover:bg-hover hover:text-foreground",
                    "transition-colors focus-ring"
                  )}
                >
                  <Plus className="size-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                sideOffset={6}
                className={cn(
                  "min-w-[160px] p-1 rounded-[10px]",
                  "bg-popover border border-ws-border"
                )}
              >
                <DropdownMenuItem
                  onSelect={() => toast.info("Attachments are simulated")}
                  className="text-[13px] rounded-[8px] px-2.5 py-2 focus:bg-hover"
                >
                  <Paperclip className="size-4 text-ws-secondary" />
                  Attach file
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => toast.info("Attachments are simulated")}
                  className="text-[13px] rounded-[8px] px-2.5 py-2 focus:bg-hover"
                >
                  <Plus className="size-4 text-ws-secondary" />
                  Attach image
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Plan / Build mode selector */}
            <div
              className={cn(
                "inline-flex items-center rounded-[8px] border border-ws-border",
                "bg-card-ws p-0.5"
              )}
              role="group"
              aria-label="Build mode"
            >
              {(["plan", "build"] as BuildMode[]).map((mode) => {
                const active = buildMode === mode;
                const ModeIcon = mode === "plan" ? Map : Hammer;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setBuildMode(mode)}
                    aria-pressed={active}
                    className={cn(
                      "inline-flex items-center gap-1 h-7 px-2.5 rounded-[6px]",
                      "text-[12px] font-medium transition-colors focus-ring",
                      active
                        ? "bg-accent-fill text-white"
                        : "text-ws-secondary hover:text-foreground"
                    )}
                  >
                    <ModeIcon className="size-3.5" />
                    {mode === "plan" ? "Plan" : "Build"}
                  </button>
                );
              })}
            </div>

            {/* agent picker */}
            <Popover open={agentOpen} onOpenChange={setAgentOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-label="Pick agent"
                  className={cn(
                    "inline-flex items-center gap-1.5 h-8 px-2.5",
                    "rounded-[8px] border border-ws-border bg-card-ws",
                    "text-[12px] text-foreground hover:bg-hover",
                    "transition-colors focus-ring"
                  )}
                >
                  {React.createElement(agentIcon(activeAgent?.icon), {
                    className: "size-3.5 text-accent-hi",
                  })}
                  <span className="truncate max-w-[120px]">
                    {agentTriggerName}
                  </span>
                  <ChevronDown className="size-3 text-ws-secondary shrink-0" />
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                sideOffset={6}
                className={cn(
                  "w-[300px] p-1 rounded-[10px]",
                  "bg-popover border border-ws-border"
                )}
              >
                {/* None option (clears the agent) */}
                <button
                  type="button"
                  onClick={() => handleAgentSelect("", "None")}
                  className={cn(
                    "w-full rounded-[8px] px-2.5 py-2 flex items-start gap-2",
                    "text-left transition-colors cursor-pointer hover:bg-hover",
                    agentId === "" && "bg-hover"
                  )}
                >
                  <div className="size-7 rounded-[8px] bg-hover flex items-center justify-center shrink-0">
                    <Bot className="size-4 text-accent-hi" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-medium text-foreground">
                      None
                    </div>
                    <div className="text-[12px] text-ws-secondary line-clamp-1">
                      No specific agent
                    </div>
                  </div>
                  {agentId === "" && (
                    <Check className="size-3.5 text-accent-hi ml-auto shrink-0" />
                  )}
                </button>

                <div className="text-[11px] uppercase tracking-wide text-ws-secondary px-2.5 pt-2 pb-1">
                  Detected agents
                </div>

                {AGENTS.map((a) => {
                  const Icon = agentIcon(a.icon);
                  const selected = a.id === agentId;
                  return (
                    <div
                      key={a.id}
                      title={
                        a.detected ? undefined : "Not detected on this machine"
                      }
                      onClick={
                        a.detected
                          ? () => handleAgentSelect(a.id, a.name)
                          : undefined
                      }
                      className={cn(
                        "rounded-[8px] px-2.5 py-2 flex items-start gap-2",
                        "transition-colors",
                        a.detected
                          ? "hover:bg-hover cursor-pointer"
                          : "opacity-50",
                        selected && "bg-hover"
                      )}
                    >
                      <div className="size-7 rounded-[8px] bg-hover flex items-center justify-center shrink-0">
                        <Icon className="size-4 text-accent-hi" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[13px] font-medium text-foreground">
                            {a.name}
                          </span>
                          <span className="text-[11px] text-ws-disabled">
                            {a.vendor}
                          </span>
                        </div>
                        <div className="text-[12px] text-ws-secondary line-clamp-1">
                          {a.description}
                        </div>
                      </div>
                      {selected ? (
                        <Check className="size-3.5 text-accent-hi ml-auto shrink-0" />
                      ) : !a.detected ? (
                        <span className="ml-auto text-[10px] text-ws-disabled border border-ws-border rounded-full px-1.5 py-0.5 shrink-0">
                          Not detected
                        </span>
                      ) : null}
                    </div>
                  );
                })}
              </PopoverContent>
            </Popover>
          </div>

          {/* right cluster: model picker + send */}
          <div className="flex items-center gap-1.5">
            <ModelPicker tabId={tabId} open={modelOpen} onOpenChange={setModelOpen} />
            <button
              type="button"
              onClick={onSendClick}
              aria-label={sendLabel}
              className={cn(
                "inline-flex items-center justify-center size-8",
                "rounded-[8px] bg-accent-fill text-white",
                "hover:bg-accent-hi transition-colors focus-ring"
              )}
            >
              <SendIcon className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
