"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { uid } from "@/lib/id";
import { readSSE } from "@/lib/streaming";
import type {
  AgentStep,
  ChatMessage,
  Conversation,
  StreamEvent,
  Workspace,
} from "@/lib/types";
import { useAppStore } from "./useAppStore";
import { useAccountStore } from "./useAccountStore";
import { useSettingsStore } from "./useSettingsStore";
import { useProjectsStore } from "./useProjectsStore";
import modelsData from "@/data/models.json";
import type { ModelDef } from "@/lib/types";

const MODELS = modelsData as ModelDef[];

function modelMultiplier(id: string): number {
  return MODELS.find((m) => m.id === id)?.multiplier ?? 1;
}

function emptyWorkspace(): Workspace {
  return {
    files: [],
    changes: [],
    terminal: [],
    artifacts: [],
    browserUrl: "about:blank",
  };
}

function emptyConversation(tabId: string, modelId: string): Conversation {
  return {
    tabId,
    title: "",
    messages: [],
    steps: [],
    streaming: false,
    modelId,
    composerDraft: "",
    workspace: emptyWorkspace(),
    started: false,
    updatedAt: Date.now(),
  };
}

// module-scoped abort controllers + tick timer (kept out of React state)
const controllers = new Map<string, AbortController>();
let tickTimer: ReturnType<typeof setInterval> | null = null;

interface ChatState {
  conversations: Record<string, Conversation>;

  ensure: (tabId: string, modelId?: string) => Conversation;
  getConversation: (tabId: string) => Conversation | undefined;
  setComposerDraft: (tabId: string, text: string) => void;
  setModel: (tabId: string, modelId: string) => void;
  clearConversation: (tabId: string) => void;
  startFromTemplate: (prompt: string, title: string, templateId: string) => void;
  sendMessage: (tabId: string, text: string, modelId: string) => Promise<void>;
  stopStreaming: (tabId: string) => void;
  recordTerminal: (tabId: string, command: string, output: string) => void;
}

export const useChatStore = create<ChatState>()(
  persist((set, get) => ({
  conversations: {},

  ensure: (tabId, modelId) => {
    const existing = get().conversations[tabId];
    if (existing) return existing;
    const conv = emptyConversation(
      tabId,
      modelId ?? useSettingsStore.getState().defaultModelId
    );
    set((s) => ({ conversations: { ...s.conversations, [tabId]: conv } }));
    return conv;
  },

  getConversation: (tabId) => get().conversations[tabId],

  setComposerDraft: (tabId, text) =>
    set((s) => {
      const conv = s.conversations[tabId];
      if (!conv) return {};
      return {
        conversations: {
          ...s.conversations,
          [tabId]: { ...conv, composerDraft: text },
        },
      };
    }),

  setModel: (tabId, modelId) =>
    set((s) => {
      const conv = s.conversations[tabId];
      if (!conv) return {};
      return {
        conversations: {
          ...s.conversations,
          [tabId]: { ...conv, modelId },
        },
      };
    }),

  clearConversation: (tabId) =>
    set((s) => {
      const conv = s.conversations[tabId];
      if (!conv) return {};
      return {
        conversations: {
          ...s.conversations,
          [tabId]: {
            ...emptyConversation(tabId, conv.modelId),
            composerDraft: conv.composerDraft,
          },
        },
      };
    }),

  startFromTemplate: (prompt, title, templateId) => {
    // create a project (with its own workspace) + open a project tab,
    // then prefill that tab's composer with the template prompt.
    const pid = useProjectsStore.getState().addProject(title, templateId);
    const tabId = useAppStore.getState().openProject(pid, title);
    get().ensure(tabId);
    useAppStore.getState().renameTab(tabId, title);
    set((s) => {
      const conv = s.conversations[tabId];
      if (!conv) return {};
      return {
        conversations: {
          ...s.conversations,
          [tabId]: { ...conv, composerDraft: prompt },
        },
      };
    });
  },

  sendMessage: async (tabId, text, modelId) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const account = useAccountStore.getState();
    account.resetDailyIfStale();

    const mult = modelMultiplier(modelId);
    if (!account.canRun(mult)) {
      useAppStore.getState().setHoursExhaustedOpen(true);
      return;
    }

    // ensure conversation + push user message
    get().ensure(tabId, modelId);
    const userMsg: ChatMessage = {
      id: uid("msg"),
      role: "user",
      content: trimmed,
      createdAt: Date.now(),
    };
    const assistantMsg: ChatMessage = {
      id: uid("msg"),
      role: "assistant",
      content: "",
      createdAt: Date.now(),
      streaming: true,
    };

    set((s) => {
      const conv = s.conversations[tabId];
      if (!conv) return {};
      return {
        conversations: {
          ...s.conversations,
          [tabId]: {
            ...conv,
            started: true,
            streaming: true,
            composerDraft: "",
            modelId,
            title: conv.title || trimmed.slice(0, 40),
            updatedAt: Date.now(),
            // reset step cards for the new turn (avoids duplicate step ids
            // across turns; only the current run's steps are shown)
            steps: [],
            messages: [...conv.messages, userMsg, assistantMsg],
          },
        },
      };
    });

    // auto-generate tab title from first message
    const app = useAppStore.getState();
    const tab = app.tabs.find((t) => t.id === tabId);
    if (tab && (tab.title === "New chat" || !tab.title)) {
      app.renameTab(tabId, trimmed.slice(0, 40));
    }

    // start hours ticker
    account.startRunning(mult);
    if (tickTimer) clearInterval(tickTimer);
    const startedAt = Date.now();
    tickTimer = setInterval(() => {
      useAccountStore.getState().tick(1000);
      const a = useAccountStore.getState();
      if (
        a.dailyHoursMs <= 0 &&
        a.referralWalletMs <= 0 &&
        a.running
      ) {
        useAppStore.getState().setHoursExhaustedOpen(true);
      }
    }, 1000);

    // build request payload from current history
    const conv = get().conversations[tabId];
    const history = conv
      ? conv.messages
          .filter((m) => m.id !== assistantMsg.id)
          .map((m) => ({ role: m.role, content: m.content }))
      : [];
    const settings = useSettingsStore.getState();

    const controller = new AbortController();
    controllers.set(tabId, controller);

    const apply = (mut: (c: Conversation) => Conversation) =>
      set((s) => {
        const c = s.conversations[tabId];
        if (!c) return {};
        return { conversations: { ...s.conversations, [tabId]: mut(c) } };
      });

    // route workspace mutations (files/terminal/changes) to the linked
    // project's workspace when the active tab is a project tab, otherwise
    // to the conversation's own workspace.
    const projectId = useAppStore
      .getState()
      .tabs.find((t) => t.id === tabId)?.projectId;
    const applyWorkspace = (mut: (ws: Workspace) => Workspace) => {
      if (projectId) {
        useProjectsStore.getState().updateWorkspace(projectId, mut);
      } else {
        apply((c) => ({ ...c, workspace: mut(c.workspace) }));
      }
    };

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          mode: useAppStore.getState().mode,
          model: modelId,
          messages: [...history, { role: "user", content: trimmed }],
          apiKey: settings.apiKey,
          baseUrl: settings.baseUrl,
          useRealApi: settings.useRealApi,
          agentInstructions: settings.agentInstructions,
        }),
      });

      await readSSE(res, (evt: StreamEvent) => {
        switch (evt.type) {
          case "step_start": {
            const step: AgentStep = {
              id: evt.id,
              title: evt.title,
              kind: evt.kind,
              status: "running",
              detail: "",
              startedAt: Date.now(),
            };
            apply((c) => ({ ...c, steps: [...c.steps, step] }));
            break;
          }
          case "step_done": {
            apply((c) => ({
              ...c,
              steps: c.steps.map((st) =>
                st.id === evt.id
                  ? { ...st, status: "done", durationMs: evt.durationMs }
                  : st
              ),
            }));
            break;
          }
          case "token": {
            apply((c) => ({
              ...c,
              messages: c.messages.map((m) =>
                m.id === assistantMsg.id
                  ? { ...m, content: m.content + evt.text }
                  : m
              ),
            }));
            break;
          }
          case "file": {
            applyWorkspace((ws) => {
              const path = evt.path;
              const exists = ws.files.some((f) => f.path === path);
              const node = {
                id: uid("file"),
                name: path.split("/").pop() || path,
                path,
                type: "file" as const,
                content: evt.content,
                language: evt.language,
                status: (evt.action === "create" ? "added" : "modified") as
                  | "added"
                  | "modified",
              };
              return {
                ...ws,
                files: exists
                  ? ws.files.map((f) =>
                      f.path === path ? { ...f, ...node } : f
                    )
                  : [...ws.files, node],
              };
            });
            break;
          }
          case "terminal": {
            applyWorkspace((ws) => ({
              ...ws,
              terminal: [
                ...ws.terminal,
                { id: uid("term"), kind: "in" as const, text: evt.command },
                { id: uid("term"), kind: "out" as const, text: evt.output },
              ],
            }));
            break;
          }
          case "change": {
            applyWorkspace((ws) => ({
              ...ws,
              changes: ws.changes.some((ch) => ch.path === evt.path)
                ? ws.changes.map((ch) =>
                    ch.path === evt.path
                      ? {
                          ...ch,
                          status: evt.status,
                          additions: evt.additions,
                          deletions: evt.deletions,
                          diff: evt.diff,
                        }
                      : ch
                  )
                : [
                    ...ws.changes,
                    {
                      id: uid("change"),
                      path: evt.path,
                      status: evt.status,
                      additions: evt.additions,
                      deletions: evt.deletions,
                      diff: evt.diff,
                    },
                  ],
            }));
            break;
          }
          case "done": {
            apply((c) => ({
              ...c,
              streaming: false,
              messages: c.messages.map((m) =>
                m.id === assistantMsg.id ? { ...m, streaming: false } : m
              ),
            }));
            break;
          }
        }
      }, controller.signal);
    } catch (err) {
      const aborted =
        err instanceof DOMException && err.name === "AbortError";
      apply((c) => ({
        ...c,
        streaming: false,
        messages: c.messages.map((m) =>
          m.id === assistantMsg.id
            ? {
                ...m,
                streaming: false,
                content:
                  m.content ||
                  (aborted
                    ? "_Generation stopped._"
                    : "_Something went wrong while streaming. Please try again._"),
              }
            : m
        ),
        steps: c.steps.map((st) =>
          st.status === "running"
            ? { ...st, status: "done", durationMs: Date.now() - st.startedAt }
            : st
        ),
      }));
    } finally {
      controllers.delete(tabId);
      account.stopRunning();
      if (tickTimer) {
        clearInterval(tickTimer);
        tickTimer = null;
      }
      // record spent time from real elapsed
      const elapsed = Date.now() - startedAt;
      void account.spendForTurn(mult, elapsed);
    }
  },

  stopStreaming: (tabId) => {
    const controller = controllers.get(tabId);
    if (controller) controller.abort();
  },

  recordTerminal: (tabId, command, output) =>
    set((s) => {
      const conv = s.conversations[tabId];
      if (!conv) return {};
      return {
        conversations: {
          ...s.conversations,
          [tabId]: {
            ...conv,
            workspace: {
              ...conv.workspace,
              terminal: [
                ...conv.workspace.terminal,
                { id: uid("term"), kind: "in", text: command },
                { id: uid("term"), kind: "out", text: output },
              ],
            },
          },
        },
      };
    }),
  }),
    {
      name: "forge-conversations",
      partialize: (s) => ({ conversations: s.conversations }),
      onRehydrateStorage: () => ({
        onRehydrate: (state) => {
          if (!state) return;
          // a conversation that was mid-stream when the page closed is
          // treated as stopped; running steps are marked done.
          for (const id of Object.keys(state.conversations)) {
            const c = state.conversations[id];
            c.streaming = false;
            if (!c.title) c.title = "";
            if (!c.updatedAt) c.updatedAt = Date.now();
            c.steps = c.steps.map((st) =>
              st.status === "running" ? { ...st, status: "done" } : st
            );
            c.messages = c.messages.map((m) =>
              m.streaming ? { ...m, streaming: false } : m
            );
          }
        },
      }),
    }
  )
);
