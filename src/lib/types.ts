// Shared types for the Forge workspace.

export type AppMode = "code" | "chat";

export type RailPage =
  | "home"
  | "sessions"
  | "templates"
  | "extensions"
  | "projects"
  | "tasks"
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

export interface FileAttachment {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  dataUrl?: string; // base64 data URL for binary files (images, videos, PDFs)
  text?: string; // text content for text/code files
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: number;
  streaming?: boolean;
  thinking?: string;
  usage?: { inputTokens?: number; outputTokens?: number };
  attachments?: FileAttachment[];
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

export type BuildMode = "plan" | "build";

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
  buildMode: BuildMode;
  skills: string[];
  agentId: string;
  researchMode: boolean;
  pendingAttachments: FileAttachment[];
  projectId?: string;
  pinnedAt?: number;
  archivedAt?: number;
}

export interface AgentDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  detected: boolean;
  vendor: string;
  /** CLI binary / command used to detect the agent on the machine. */
  bin?: string;
  /** Alternate binaries that also indicate the agent is installed. */
  bins?: string[];
}

export type ProviderType = "openai" | "anthropic" | "ollama" | "custom";

export interface ProviderModel {
  id: string; // unified id: `${providerId}:${modelName}`
  name: string; // display name
  hidden?: boolean; // hide from the model picker when true
}

export interface Provider {
  id: string;
  name: string;
  type: ProviderType;
  baseUrl: string;
  apiKey: string;
  /** Server-side vault contains a credential; never contains the secret. */
  credentialConfigured?: boolean;
  enabled: boolean;
  models: ProviderModel[];
}

export interface Project {
  id: string;
  name: string;
  templateId?: string;
  createdAt: number;
  workspace: Workspace;
  rules: string;
  description?: string;
  icon?: string;
  directory?: string;
  archivedAt?: number;
  stats?: { conversations: number; executions: number; changes: number };
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
  icon?: string;
}

export interface SkillDef {
  name: string;
  description?: string;
}

// SSE event payloads emitted by /api/chat
export type StreamEvent =
  | { type: "step_start"; id: string; title: string; kind: AgentStep["kind"] }
  | { type: "step_done"; id: string; durationMs: number }
  | { type: "token"; text: string }
  | { type: "thinking"; text: string }
  | { type: "usage"; inputTokens?: number; outputTokens?: number }
  | { type: "file"; path: string; action: "create" | "modify"; language: string; content: string }
  | { type: "terminal"; command: string; output: string }
  | { type: "change"; path: string; status: FileChange["status"]; additions: number; deletions: number; diff: string }
  | { type: "done" }
  | { type: "error"; code?: string; message?: string };

export type ExecutionStatus = "queued" | "running" | "completed" | "failed" | "cancelled" | "interrupted";

export interface ProviderCapabilities {
  streaming: boolean;
  toolCalling: boolean;
  vision: boolean;
  structuredOutput: boolean;
  contextWindow?: number;
}

export interface Execution {
  id: string;
  profileId: string;
  projectId?: string;
  conversationId?: string;
  modelId: string;
  status: ExecutionStatus;
  stage: string;
  request: string;
  createdAt: number;
  completedAt?: number;
}

export type AgentEvent = (
  | { type: "execution_started"; execution: Execution }
  | { type: "status_changed"; status: ExecutionStatus; stage: string }
  | { type: "text"; text: string }
  | { type: "thinking"; text: string }
  | { type: "usage"; inputTokens?: number; outputTokens?: number }
  | { type: "tool_call_requested"; tool: string; input: Record<string, unknown> }
  | { type: "approval_required"; approval: unknown }
  | { type: "approval_received"; approvalId: string; status: string }
  | { type: "tool_started"; tool: string }
  | { type: "tool_completed"; tool: string; result: unknown }
  | { type: "tool_failed"; tool: string; error: string }
  | { type: "file_modified"; path: string; status: string }
  | { type: "verification_started"; command?: string }
  | { type: "verification_completed"; result: unknown }
  | { type: "cancelled" }
  | { type: "failed"; error: string }
  | { type: "completed"; summary: unknown }
) & { sequence?: number };
