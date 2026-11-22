"use client";

import { useMemo, useState } from "react";
import { Clock, MessageSquare, Plus, Sparkles } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { Input } from "@/components/ui/input";
import { useAppStore } from "@/stores/useAppStore";
import { useChatStore } from "@/stores/useChatStore";
import modelsData from "@/data/models.json";
import type { Conversation, ModelDef } from "@/lib/types";

const MODELS = modelsData as ModelDef[];

/**
 * stripMarkdown — collapse common markdown syntax to plain text so session
 * previews read cleanly in the history list.
 */
function stripMarkdown(s: string): string {
  return s
    .replace(/```[\s\S]*?```/g, " ") // fenced code blocks
    .replace(/`([^`]*)`/g, "$1") // inline code
    .replace(/^#{1,6}\s+/gm, "") // headings
    .replace(/\*\*([^*]+)\*\*/g, "$1") // bold
    .replace(/\*([^*]+)\*/g, "$1") // italic
    .replace(/__([^_]+)__/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // links -> label
    .replace(/^>\s?/gm, "") // blockquotes
    .replace(/^\s*[-*+]\s+/gm, "") // unordered list markers
    .replace(/^\s*\d+\.\s+/gm, "") // ordered list markers
    .replace(/\s+/g, " ")
    .trim();
}

function firstUserPreview(conv: Conversation): string {
  const firstUser = conv.messages.find((m) => m.role === "user");
  if (!firstUser) return "";
  return stripMarkdown(firstUser.content).slice(0, 60);
}

function lastMessagePreview(conv: Conversation): string {
  if (conv.messages.length === 0) return "";
  const last = conv.messages[conv.messages.length - 1];
  return stripMarkdown(last.content).slice(0, 160);
}

function modelName(id: string): string {
  return MODELS.find((m) => m.id === id)?.name ?? id;
}

export function SessionsPage() {
  const conversations = useChatStore((s) => s.conversations);
  const [query, setQuery] = useState("");

  const totalCount = useMemo(
    () => Object.values(conversations).filter((c) => c.started).length,
    [conversations]
  );

  const sessions = useMemo(() => {
    const all = Object.values(conversations).filter((c) => c.started);
    const sorted = [...all].sort((a, b) => b.updatedAt - a.updatedAt);
    const q = query.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter((c) => {
      const title = (
        c.title ||
        firstUserPreview(c) ||
        "New chat"
      ).toLowerCase();
      if (title.includes(q)) return true;
      return c.messages.some((m) =>
        stripMarkdown(m.content).toLowerCase().includes(q)
      );
    });
  }, [conversations, query]);

  const openSession = (conv: Conversation) => {
    const title = conv.title || firstUserPreview(conv) || "New chat";
    useAppStore.getState().openSession(conv.tabId, title);
  };

  return (
    <div className="flex h-full flex-col">
      <header className="shrink-0 border-b border-ws-border px-6 py-4 flex items-center gap-4">
        <h1 className="text-[20px] font-semibold text-foreground">Sessions</h1>
        <span className="text-[13px] text-ws-secondary">
          {totalCount} session{totalCount === 1 ? "" : "s"}
        </span>
        <div className="ml-auto flex items-center gap-3">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search sessions"
            aria-label="Search sessions"
            className="bg-card-ws border border-ws-border h-9 text-[13px] w-[280px] focus-ring"
          />
          <button
            type="button"
            onClick={() => useAppStore.getState().newChatTab()}
            className="inline-flex items-center gap-2 h-9 px-3 rounded-[8px] bg-accent-fill text-white text-[13px] hover:opacity-90 transition-opacity duration-150 focus-ring"
          >
            <Plus className="size-4" />
            New chat
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto ws-scroll px-6 py-4">
        {totalCount === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <MessageSquare className="size-10 text-ws-disabled" />
            <p className="text-[16px] text-foreground font-medium mt-3">
              No sessions yet
            </p>
            <p className="text-[13px] text-ws-secondary mt-1">
              Start a new chat to see your history here.
            </p>
            <button
              type="button"
              onClick={() => useAppStore.getState().newChatTab()}
              className="mt-4 inline-flex items-center gap-2 h-9 px-3 rounded-[8px] bg-accent-fill text-white text-[13px] hover:opacity-90 transition-opacity duration-150 focus-ring"
            >
              <Plus className="size-4" />
              New chat
            </button>
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-[13px] text-ws-secondary">
              No sessions match &ldquo;{query}&rdquo;
            </p>
          </div>
        ) : (
          <div className="ws-fade-in flex flex-col gap-2 max-w-[820px] mx-auto">
            {sessions.map((conv) => {
              const title =
                conv.title || firstUserPreview(conv) || "New chat";
              const preview =
                lastMessagePreview(conv) || "No messages yet.";
              return (
                <div
                  key={conv.tabId}
                  role="button"
                  tabIndex={0}
                  onClick={() => openSession(conv)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openSession(conv);
                    }
                  }}
                  className="text-left rounded-[12px] border border-ws-border bg-card-ws p-4 hover:bg-hover cursor-pointer transition-colors duration-150 focus-ring"
                >
                  <div className="text-[15px] font-medium text-foreground truncate">
                    {title}
                  </div>
                  <div className="text-[13px] text-ws-secondary line-clamp-2 mt-1">
                    {preview}
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-[12px] text-ws-disabled">
                    <span className="inline-flex items-center gap-1.5">
                      <Sparkles className="size-3.5" />
                      {modelName(conv.modelId)}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <MessageSquare className="size-3.5" />
                      {conv.messages.length} message
                      {conv.messages.length === 1 ? "" : "s"}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="size-3.5" />
                      {formatDistanceToNow(new Date(conv.updatedAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
