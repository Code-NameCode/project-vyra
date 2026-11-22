"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { uid } from "@/lib/id";
import { readSSE } from "@/lib/streaming";
import type {
  AgentStep,
  BuildMode,
  ChatMessage,
  Conversation,
  FileAttachment,
  StreamEvent,
  Workspace,
} from "@/lib/types";
import { useAppStore } from "./useAppStore";
import { useSettingsStore } from "./useSettingsStore";
import { useProjectsStore } from "./useProjectsStore";
import { useProvidersStore, parseModelId } from "./useProvidersStore";

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
    buildMode: "build",
    skills: [],
    agentId: "",
    researchMode: false,
    pendingAttachments: [],
  };
}

// module-scoped abort controllers (kept out of React state)
const controllers = new Map<string, AbortController>();

interface ChatState {
  conversations: Record<string, Conversation>;

  ensure: (tabId: string, modelId?: string) => Conversation;
  getConversation: (tabId: string) => Conversation | undefined;
  hydrateConversation: (conversation: Conversation) => void;
  setComposerDraft: (tabId: string, text: string) => void;
  setModel: (tabId: string, modelId: string) => void;
  setBuildMode: (tabId: string, mode: BuildMode) => void;
  addSkill: (tabId: string, skillId: string) => void;
  removeSkill: (tabId: string, skillId: string) => void;
  clearSkills: (tabId: string) => void;
  setAgent: (tabId: string, agentId: string) => void;
  setResearchMode: (tabId: string, mode: boolean) => void;
  addAttachment: (tabId: string, file: FileAttachment) => void;
  removeAttachment: (tabId: string, fileId: string) => void;
  clearAttachments: (tabId: string) => void;
  clearConversation: (tabId: string) => void;
  startFromTemplate: (prompt: string, title: string, templateId: string) => void;
  sendMessage: (tabId: string, text: string, modelId: string) => Promise<void>;
  stopStreaming: (tabId: string) => void;
  recordTerminal: (tabId: string, command: string, output: string) => void;
  updateWorkspace: (tabId: string, updater: (ws: Workspace) => Workspace) => void;
}

export const useChatStore = create<ChatState>()(
  persist((set, get) => ({
  conversations: {},

  ensure: (tabId, modelId) => {
    const existing = get().conversations[tabId];
    if (existing) return existing;
    const settings = useSettingsStore.getState();
    const conv = emptyConversation(
      tabId,
      modelId ?? settings.defaultModelId
    );
    conv.agentId = settings.defaultAgentId ?? "";
    set((s) => ({ conversations: { ...s.conversations, [tabId]: conv } }));
    return conv;
  },

  getConversation: (tabId) => get().conversations[tabId],
  hydrateConversation: (conversation) => set((s) => ({ conversations: { ...s.conversations, [conversation.tabId]: conversation } })),

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

  setBuildMode: (tabId, mode) =>
    set((s) => {
      const conv = s.conversations[tabId];
      if (!conv) return {};
      return {
        conversations: {
          ...s.conversations,
          [tabId]: { ...conv, buildMode: mode },
        },
      };
    }),

  addSkill: (tabId, skillId) =>
    set((s) => {
      const conv = s.conversations[tabId];
      if (!conv) return {};
      if (conv.skills.includes(skillId)) return {};
      return {
        conversations: {
          ...s.conversations,
          [tabId]: { ...conv, skills: [...conv.skills, skillId] },
        },
      };
    }),

  removeSkill: (tabId, skillId) =>
    set((s) => {
      const conv = s.conversations[tabId];
      if (!conv) return {};
      return {
        conversations: {
          ...s.conversations,
          [tabId]: {
            ...conv,
            skills: conv.skills.filter((sk) => sk !== skillId),
          },
        },
      };
    }),

  clearSkills: (tabId) =>
    set((s) => {
      const conv = s.conversations[tabId];
      if (!conv) return {};
      return {
        conversations: {
          ...s.conversations,
          [tabId]: { ...conv, skills: [] },
        },
      };
    }),

  setAgent: (tabId, agentId) =>
    set((s) => {
      const conv = s.conversations[tabId];
      if (!conv) return {};
      return {
        conversations: {
          ...s.conversations,
          [tabId]: { ...conv, agentId },
        },
      };
    }),

  setResearchMode: (tabId, mode) =>
    set((s) => {
      const conv = s.conversations[tabId];
      if (!conv) return {};
      return {
        conversations: {
          ...s.conversations,
          [tabId]: { ...conv, researchMode: mode },
        },
      };
    }),

  addAttachment: (tabId, file) =>
    set((s) => {
      const conv = s.conversations[tabId];
      if (!conv) return {};
      return {
        conversations: {
          ...s.conversations,
          [tabId]: {
            ...conv,
            pendingAttachments: [...conv.pendingAttachments, file],
          },
        },
      };
    }),

  removeAttachment: (tabId, fileId) =>
    set((s) => {
      const conv = s.conversations[tabId];
      if (!conv) return {};
      return {
        conversations: {
          ...s.conversations,
          [tabId]: {
            ...conv,
            pendingAttachments: conv.pendingAttachments.filter(
              (f) => f.id !== fileId
            ),
          },
        },
      };
    }),

  clearAttachments: (tabId) =>
    set((s) => {
      const conv = s.conversations[tabId];
      if (!conv) return {};
      return {
        conversations: {
          ...s.conversations,
          [tabId]: { ...conv, pendingAttachments: [] },
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

    // ensure conversation + push user message
    get().ensure(tabId, modelId);

    // snapshot pending attachments (cleared on send) — kept in-memory only
    const pending =
      get().conversations[tabId]?.pendingAttachments ?? [];

    const userMsg: ChatMessage = {
      id: uid("msg"),
      role: "user",
      content: trimmed,
      createdAt: Date.now(),
      attachments: pending.length > 0 ? pending : undefined,
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
            pendingAttachments: [],
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

    // route workspace mutations (files/terminal/changes) to the linked
    // project's workspace when the active tab is a project tab, otherwise
    // to the conversation's own workspace.
    const projectId = useAppStore
      .getState()
      .tabs.find((t) => t.id === tabId)?.projectId;
    const persistConversation = () => {
      const snapshot = get().conversations[tabId];
      if (!snapshot) return;
      const tabTitle = useAppStore.getState().tabs.find((tab) => tab.id === tabId)?.title || snapshot.title;
      void fetch(projectId ? `/api/projects/${encodeURIComponent(projectId)}/conversations` : "/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: tabId,
          projectId,
          title: tabTitle === "New chat" ? trimmed.slice(0, 80) : tabTitle,
          modelId: snapshot.modelId,
          titleSource: tabTitle && tabTitle !== "New chat" ? "manual" : "auto",
          messages: snapshot.messages.map((message) => ({
            id: message.id,
            role: message.role,
            content: message.content,
            createdAt: message.createdAt,
          })),
        }),
      }).catch(() => undefined);
    };
    const apply = (mut: (c: Conversation) => Conversation) =>
      set((s) => {
        const c = s.conversations[tabId];
        if (!c) return {};
        const next = mut(c);
        queueMicrotask(persistConversation);
        return { conversations: { ...s.conversations, [tabId]: next } };
      });
    persistConversation();
    const applyWorkspace = (mut: (ws: Workspace) => Workspace) => {
      if (projectId) {
        useProjectsStore.getState().updateWorkspace(projectId, mut);
      } else {
        apply((c) => ({ ...c, workspace: mut(c.workspace) }));
      }
    };

    // gather project rules + build mode for the request
    const projectRules = projectId
      ? useProjectsStore.getState().projects.find((p) => p.id === projectId)?.rules ?? ""
      : "";
    const buildMode = conv?.buildMode ?? "build";

    // resolve the provider from the model id (provider-prefixed models use
    // that provider's baseUrl/apiKey + real API; simulated models use settings)
    const providersState = useProvidersStore.getState();
    const parsed = parseModelId(modelId);
    let reqApiKey = settings.apiKey;
    let reqBaseUrl = settings.baseUrl;
    let reqUseRealApi = settings.useRealApi;
    let reqModel: string = modelId;
    let providerType: string | undefined;
    if (parsed) {
      const provider = providersState.providers.find(
        (p) => p.id === parsed.providerId
      );
      if (provider && provider.enabled) {
        reqApiKey = provider.apiKey;
        reqBaseUrl = provider.baseUrl;
        reqModel = parsed.modelName;
        providerType = provider.type;
        // ollama needs no key; treat any provider with a configured model as real
        reqUseRealApi = provider.type === "ollama" ? true : !!provider.apiKey;
      }
    }

    const isResearch = !!conv?.researchMode;

    try {
      if (!isResearch) {
        const projectId = useAppStore.getState().tabs.find((t) => t.id === tabId)?.projectId;
        const createRes = await fetch("/api/executions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            request: trimmed,
            modelId: reqModel,
            projectId,
            conversationId: tabId,
            provider: { id: parsed?.providerId, type: providerType || "custom", baseUrl: reqBaseUrl, model: reqModel },
            messages: [...history, { role: "user", content: trimmed }],
          }),
        });
        if (!createRes.ok) throw new Error(`Execution failed (${createRes.status})`);
        const created = (await createRes.json()) as { execution?: { id: string } };
        if (!created.execution?.id) throw new Error("Execution did not return an id");
        const eventRes = await fetch(`/api/executions/${encodeURIComponent(created.execution.id)}/events`, { signal: controller.signal });
        await readSSE(eventRes, (event) => {
          const evt = event as unknown as { type: string; text?: string; tool?: string; error?: string; approval?: unknown; summary?: unknown };
          if (evt.type === "text") apply((c) => ({ ...c, messages: c.messages.map((m) => m.id === assistantMsg.id ? { ...m, content: m.content + (evt.text || "") } : m) }));
          else if (evt.type === "tool_started") apply((c) => ({ ...c, steps: [...c.steps, { id: uid("step"), title: evt.tool || "Tool", kind: "run", status: "running", detail: "Executing tool", startedAt: Date.now() }] }));
          else if (evt.type === "approval_required") apply((c) => ({ ...c, messages: c.messages.map((m) => m.id === assistantMsg.id ? { ...m, content: `${m.content}\n\n_Approval required for a restricted action._` } : m) }));
          else if (evt.type === "failed") apply((c) => ({ ...c, messages: c.messages.map((m) => m.id === assistantMsg.id ? { ...m, content: `${m.content}\n\n**Execution failed**\n\n${evt.error || "Unknown error"}` } : m) }));
          else if (evt.type === "completed" || evt.type === "cancelled") apply((c) => ({ ...c, streaming: false, messages: c.messages.map((m) => m.id === assistantMsg.id ? { ...m, streaming: false } : m) }));
        }, controller.signal);
        apply((c) => ({ ...c, streaming: false, messages: c.messages.map((m) => m.id === assistantMsg.id ? { ...m, streaming: false } : m) }));
        return;
      }
      const url = isResearch ? "/api/research" : "/api/chat";
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify(
          isResearch
            ? { query: trimmed, messages: [...history, { role: "user", content: trimmed }] }
            : {
                mode: useAppStore.getState().mode,
                buildMode,
                model: reqModel,
                providerType,
                providerId: parsed?.providerId,
                messages: [...history, { role: "user", content: trimmed }],
                baseUrl: reqBaseUrl,
                useRealApi: reqUseRealApi,
                agentInstructions: settings.agentInstructions,
                projectRules,
                skills: conv?.skills ?? [],
                 skillsFolderPath: useSettingsStore.getState().skillsFolderPath,
                agentId: conv?.agentId ?? "",
            }
        ),
      });

      if (!res.ok) {
        let code = "HTTP_ERROR";
        let message = `Request failed (${res.status})`;
        try {
          const data = await res.json();
          code = data?.error?.code ?? code;
          message = data?.error?.message ?? message;
        } catch {
          /* response wasn't JSON */
        }
        apply((c) => ({
          ...c,
          streaming: false,
          messages: c.messages.map((m) =>
            m.id === assistantMsg.id
              ? {
                  ...m,
                  streaming: false,
                  content: `**Error ${code}**\n\n${message}`,
                }
              : m
          ),
        }));
        return;
      }

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
          case "error": {
            apply((c) => ({
              ...c,
              messages: c.messages.map((m) =>
                m.id === assistantMsg.id
                  ? {
                      ...m,
                      content:
                        (m.content ? m.content + "\n\n" : "") +
                        `**Error ${evt.code ?? "ERROR"}**\n\n${evt.message ?? "Unknown error"}`,
                    }
                  : m
              ),
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
  updateWorkspace: (tabId, updater) =>
    set((s) => {
      const conv = s.conversations[tabId];
      if (!conv) return {};
      return {
        conversations: {
          ...s.conversations,
          [tabId]: { ...conv, workspace: updater(conv.workspace) },
        },
      };
    }),
  }),
    {
      name: "forge-conversations",
      partialize: (s) => ({
        // strip attachments (base64 data URLs) + pendingAttachments to
        // avoid blowing past localStorage quota; they are kept in-memory
        // only and do not need to survive a reload.
        conversations: Object.fromEntries(
          Object.entries(s.conversations).map(([id, conv]) => [
            id,
            {
              ...conv,
              pendingAttachments: [],
              messages: conv.messages.map((m) =>
                m.attachments ? { ...m, attachments: undefined } : m
              ),
            },
          ])
        ),
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        // a conversation that was mid-stream when the page closed is
        // treated as stopped; running steps are marked done.
        for (const id of Object.keys(state.conversations)) {
          const c = state.conversations[id];
          c.streaming = false;
          if (!c.title) c.title = "";
          if (!c.updatedAt) c.updatedAt = Date.now();
          if (!c.buildMode) c.buildMode = "build";
          if (!Array.isArray(c.skills)) c.skills = [];
          if (typeof c.agentId !== "string") c.agentId = "";
          if (typeof c.researchMode !== "boolean") c.researchMode = false;
          if (!Array.isArray(c.pendingAttachments)) c.pendingAttachments = [];
          c.steps = c.steps.map((st) =>
            st.status === "running" ? { ...st, status: "done" } : st
          );
          c.messages = c.messages.map((m) =>
            m.streaming ? { ...m, streaming: false } : m
          );
        }
      },
    }
  )
);
