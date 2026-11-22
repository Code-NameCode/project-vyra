"use client";

import * as React from "react";
import {
  ArrowUp,
  Mic,
  Paperclip,
  Plus,
  Square,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useChatStore } from "@/stores/useChatStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { SLASH_COMMANDS } from "@/data/slashCommands";
import type { SlashCommand } from "@/lib/types";
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

/**
 * Composer — the core prompt input.
 * Auto-growing textarea, slash command popup, attach menu, model picker chip,
 * and a send/stop/voice button.
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

  const modelId = convModelId ?? defaultModelId;

  const taRef = React.useRef<HTMLTextAreaElement>(null);
  const [modelOpen, setModelOpen] = React.useState(false);
  const [slashSuppressed, setSlashSuppressed] = React.useState(false);
  const [selIndex, setSelIndex] = React.useState(0);

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

  // reset slash suppression + selection whenever draft changes
  React.useEffect(() => {
    setSlashSuppressed(false);
    setSelIndex(0);
  }, [draft]);

  /* ---- slash command popup derivation ---- */
  const isSlashDraft =
    draft.startsWith("/") &&
    !draft.slice(1).includes(" ") &&
    !streaming;
  const filtered = React.useMemo<SlashCommand[]>(() => {
    if (!isSlashDraft) return [];
    const q = draft.slice(1).toLowerCase();
    if (!q) return SLASH_COMMANDS;
    return SLASH_COMMANDS.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q) ||
        c.hint.toLowerCase().includes(q)
    );
  }, [isSlashDraft, draft]);
  const slashVisible = isSlashDraft && !slashSuppressed && filtered.length > 0;

  /* ---- actions ---- */
  const handleSend = React.useCallback(() => {
    if (streaming) return;
    const text = useChatStore.getState().conversations[tabId]?.composerDraft ?? "";
    if (!text.trim()) return;
    void sendMessage(tabId, text, modelId);
  }, [streaming, tabId, modelId, sendMessage]);

  const selectCommand = React.useCallback(
    (cmd: SlashCommand) => {
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
      // default: insert command label + trailing space, popup auto-closes
      setComposerDraft(tabId, `${cmd.label} `);
      // keep focus in textarea
      requestAnimationFrame(() => taRef.current?.focus());
    },
    [tabId, setComposerDraft, clearConversation]
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

  return (
    <div className="relative w-full">
      {/* slash command popup (above the box) */}
      {slashVisible && (
        <div
          className={cn(
            "absolute bottom-full mb-2 left-0 w-[300px] z-30",
            "rounded-[10px] border border-ws-border bg-popover p-1 ws-fade-in",
            "shadow-lg max-h-[260px] overflow-y-auto ws-scroll"
          )}
          role="listbox"
        >
          {filtered.map((c, i) => (
            <button
              type="button"
              key={c.id}
              onMouseEnter={() => setSelIndex(i)}
              onClick={() => selectCommand(c)}
              className={cn(
                "w-full text-left rounded-[8px] px-2.5 py-2 cursor-pointer",
                "transition-colors",
                i === selIndex ? "bg-hover" : "hover:bg-hover"
              )}
            >
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-medium text-foreground">
                  {c.label}
                </span>
              </div>
              <div className="text-[12px] text-ws-secondary line-clamp-1">
                {c.description}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* composer box */}
      <div
        className={cn(
          "relative rounded-[14px] border-2 border-[#3a3d41] border-b-[#44474b]",
          "bg-card-ws p-3 min-h-[96px] transition-colors",
          "focus-within:border-accent-fill/60"
        )}
      >
        <Textarea
          ref={taRef}
          value={draft}
          onChange={(e) => setComposerDraft(tabId, e.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          placeholder="Ask Forge... Use / for commands"
          className={cn(
            "bg-transparent border-0 resize-none p-0 m-0",
            "text-[15px] leading-[1.5] text-foreground",
            "placeholder:text-ws-secondary",
            "focus-visible:ring-0 outline-none shadow-none",
            "max-h-[200px] min-h-[24px] ws-scroll",
            "[field-sizing:none]"
          )}
        />

        {/* bottom row */}
        <div className="flex items-center justify-between mt-2 gap-2">
          {/* left: attach */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Attach"
                className={cn(
                  "inline-flex items-center justify-center size-9",
                  "rounded-[8px] text-ws-secondary hover:bg-hover",
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

          {/* right: model picker + send */}
          <div className="flex items-center gap-2">
            <ModelPicker tabId={tabId} open={modelOpen} onOpenChange={setModelOpen} />
            <button
              type="button"
              onClick={onSendClick}
              aria-label={sendLabel}
              className={cn(
                "inline-flex items-center justify-center size-9",
                "rounded-[10px] bg-accent-fill text-white",
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
