import type { AgentDef } from "@/lib/types";

/**
 * Agents the workspace auto-detects on the machine. `detected` is a mock for
 * whether the agent's CLI/runtime is installed and usable. In a real build
 * this would probe the system; here it's a static, realistic-looking set.
 */
export const AGENTS: AgentDef[] = [
  {
    id: "codex",
    name: "Codex",
    description: "OpenAI's terminal coding agent. Strong at multi-file edits.",
    icon: "terminal",
    detected: true,
    vendor: "OpenAI",
  },
  {
    id: "cline",
    name: "Cline",
    description: "Autonomous coding assistant for VS Code-style flows.",
    icon: "bot",
    detected: true,
    vendor: "Cline",
  },
  {
    id: "opencode",
    name: "OpenCode",
    description: "Open-source coding agent with a pluggable tool system.",
    icon: "code",
    detected: true,
    vendor: "OpenCode",
  },
  {
    id: "kilocode",
    name: "KiloCode",
    description: "Lightweight agent focused on fast, incremental edits.",
    icon: "zap",
    detected: true,
    vendor: "KiloCode",
  },
  {
    id: "pi",
    name: "Pi",
    description: "Reasoning-first agent. Not detected on this machine.",
    icon: "brain",
    detected: false,
    vendor: "Inflection",
  },
  {
    id: "zcode",
    name: "ZCode",
    description: "Multi-language refactor agent. Not detected.",
    icon: "shuffle",
    detected: false,
    vendor: "ZCode",
  },
  {
    id: "hermes",
    name: "Hermes",
    description: "Streaming agent with tool use. Not detected.",
    icon: "feather",
    detected: false,
    vendor: "Nous",
  },
  {
    id: "omipy",
    name: "OmiPy",
    description: "Python-native data + scripting agent. Not detected.",
    icon: "flask",
    detected: false,
    vendor: "OmiPy",
  },
];

export const DEFAULT_AGENT_ID = "codex";
