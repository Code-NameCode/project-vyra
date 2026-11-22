// Shared types for the Forge workspace.

export type AppMode = "code" | "chat";

export type RailPage =
  | "home"
  | "sessions"
  | "templates"
  | "extensions"
  | "settings";

export type TabType = "chat" | "project";

export interface Tab {
  id: string;
  title: string;
  type: TabType;
  projectId?: string;
  createdAt: number;
}

export type RightPanelView =
  | "overview"
  | "browser"
  | "files"
  | "terminal"
  | "changes"
  | "artifacts";

export type MessageRole = "user" | "assistant" | "system";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: number;
  streaming?: boolean;
}

export type StepStatus = "running" | "done" | "error";

export interface AgentStep {
  id: string;
  title: string;
  status: StepStatus;
  detail: string;
  durationMs?: number;
  startedAt: number;
  kind: "search" | "plan" | "edit" | "run" | "review";
}

export interface FileNode {
  id: string;
  name: string;
  path: string;
  type: "file" | "dir";
  content?: string;
  language?: string;
  children?: FileNode[];
  status?: "added" | "modified" | "deleted";
}

export interface FileChange {
  id: string;
  path: string;
  status: "added" | "modified" | "deleted";
  additions: number;
  deletions: number;
  diff: string;
}

export interface TerminalLine {
  id: string;
  kind: "in" | "out" | "err";
  text: string;
}

export interface Artifact {
  id: string;
  name: string;
  type: string;
  preview?: string;
}

export interface Workspace {
  files: FileNode[];
  changes: FileChange[];
  terminal: TerminalLine[];
  artifacts: Artifact[];
  browserUrl: string;
}

export interface Conversation {
  tabId: string;
  title: string;
  messages: ChatMessage[];
  steps: AgentStep[];
  streaming: boolean;
  modelId: string;
  composerDraft: string;
  workspace: Workspace;
  started: boolean;
  updatedAt: number;
}

export interface Project {
  id: string;
  name: string;
  templateId?: string;
  createdAt: number;
  workspace: Workspace;
}

export interface LegacyChat {
  id: string;
  title: string;
  createdAt: number;
}

export interface ModelDef {
  id: string;
  name: string;
  description: string;
  multiplier: number; // cost multiplier (1x, 3x). 0 = unlimited/free
  supportsImages: boolean;
  contextWindow: string;
  tier: "free" | "pro" | "unlimited";
}

export interface TemplateDef {
  id: string;
  title: string;
  category: string;
  featured: boolean;
  prompt: string;
  thumbKey: string; // key into ThumbnailArt component
}

export interface SlashCommand {
  id: string;
  label: string;
  description: string;
  hint: string;
}

// SSE event payloads emitted by /api/chat
export type StreamEvent =
  | { type: "step_start"; id: string; title: string; kind: AgentStep["kind"] }
  | { type: "step_done"; id: string; durationMs: number }
  | { type: "token"; text: string }
  | { type: "file"; path: string; action: "create" | "modify"; language: string; content: string }
  | { type: "terminal"; command: string; output: string }
  | { type: "change"; path: string; status: FileChange["status"]; additions: number; deletions: number; diff: string }
  | { type: "done" };
