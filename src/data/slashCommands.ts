import type { SlashCommand } from "@/lib/types";

export const SLASH_COMMANDS: SlashCommand[] = [
  {
    id: "model",
    label: "/model",
    description: "Switch the active model",
    hint: "model",
  },
  {
    id: "agents",
    label: "/agents",
    description: "View and configure agents",
    hint: "agents",
  },
  {
    id: "clear",
    label: "/clear",
    description: "Clear the current conversation",
    hint: "clear",
  },
  {
    id: "init",
    label: "/init",
    description: "Initialize a new project workspace",
    hint: "init",
  },
  {
    id: "plan",
    label: "/plan",
    description: "Ask the agent to plan before coding",
    hint: "plan",
  },
  {
    id: "review",
    label: "/review",
    description: "Review recent changes",
    hint: "review",
  },
  {
    id: "help",
    label: "/help",
    description: "Show help and keyboard shortcuts",
    hint: "help",
  },
];
