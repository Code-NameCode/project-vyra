import type { AgentDef } from "@/lib/types";

/**
 * Agents the workspace can detect on the machine.
 *
 * `detected` is only a fallback used before the first scan; the real value is
 * resolved at runtime by `/api/agents`, which probes the PATH for `bin` (and
 * any `bins` aliases). Users choose which detected agents to enable in
 * Settings → Agents.
 */
export const AGENTS: AgentDef[] = [
  {
    id: "codex",
    name: "Codex",
    description: "OpenAI's terminal coding agent. Strong at multi-file edits.",
    icon: "terminal",
    detected: true,
    vendor: "OpenAI",
    bin: "codex",
  },
  {
    id: "cline",
    name: "Cline",
    description: "Autonomous coding assistant for VS Code-style flows.",
    icon: "bot",
    detected: true,
    vendor: "Cline",
    bin: "cline",
  },
  {
    id: "opencode",
    name: "OpenCode",
    description: "Open-source coding agent with a pluggable tool system.",
    icon: "code",
    detected: true,
    vendor: "OpenCode",
    bin: "opencode",
  },
  {
    id: "kilocode",
    name: "KiloCode",
    description: "Lightweight agent focused on fast, incremental edits.",
    icon: "zap",
    detected: true,
    vendor: "KiloCode",
    bin: "kilocode",
  },
  {
    id: "pi",
    name: "Pi",
    description: "Reasoning-first agent.",
    icon: "brain",
    detected: false,
    vendor: "Inflection",
    bin: "pi",
  },
  {
    id: "zcode",
    name: "ZCode",
    description: "Multi-language refactor agent.",
    icon: "shuffle",
    detected: false,
    vendor: "ZCode",
    bin: "zcode",
  },
  {
    id: "hermes",
    name: "Hermes",
    description: "Streaming agent with tool use.",
    icon: "feather",
    detected: false,
    vendor: "Nous",
    bin: "hermes",
  },
  {
    id: "omipy",
    name: "OmiPy",
    description: "Python-native data + scripting agent.",
    icon: "flask",
    detected: false,
    vendor: "OmiPy",
    bin: "omipy",
  },
];

export const DEFAULT_AGENT_ID = "codex";

/** Agent ids that should be enabled before the user runs a detection scan. */
export const DEFAULT_ENABLED_AGENT_IDS = AGENTS.filter((a) => a.detected).map(
  (a) => a.id
);
