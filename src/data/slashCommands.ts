import type { SlashCommand } from "@/lib/types";

/**
 * Codex-style skills invoked via "/" in the composer.
 * `icon` is a key the Composer maps to a lucide icon.
 */
export const SLASH_COMMANDS: SlashCommand[] = [
  {
    id: "plan",
    label: "/plan",
    description: "Plan the work before building",
    hint: "plan",
    icon: "brain",
  },
  {
    id: "build",
    label: "/build",
    description: "Build and execute the changes",
    hint: "build",
    icon: "hammer",
  },
  {
    id: "review",
    label: "/review",
    description: "Review recent changes",
    hint: "review",
    icon: "scan",
  },
  {
    id: "test",
    label: "/test",
    description: "Write or run tests",
    hint: "test",
    icon: "flask",
  },
  {
    id: "fix",
    label: "/fix",
    description: "Fix a bug or issue",
    hint: "fix",
    icon: "wrench",
  },
  {
    id: "explain",
    label: "/explain",
    description: "Explain the selected code",
    hint: "explain",
    icon: "book",
  },
  {
    id: "refactor",
    label: "/refactor",
    description: "Refactor for clarity",
    hint: "refactor",
    icon: "shuffle",
  },
  {
    id: "document",
    label: "/document",
    description: "Add documentation",
    hint: "document",
    icon: "doc",
  },
  {
    id: "init",
    label: "/init",
    description: "Initialize the project workspace",
    hint: "init",
    icon: "rocket",
  },
  {
    id: "clear",
    label: "/clear",
    description: "Clear the conversation",
    hint: "clear",
    icon: "eraser",
  },
  {
    id: "model",
    label: "/model",
    description: "Switch the active model",
    hint: "model",
    icon: "cpu",
  },
  {
    id: "help",
    label: "/help",
    description: "Show help and shortcuts",
    hint: "help",
    icon: "help",
  },
];
