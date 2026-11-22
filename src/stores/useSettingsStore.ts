"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SettingsState {
  apiKey: string;
  baseUrl: string;
  defaultModelId: string;
  theme: "dark" | "light";
  agentInstructions: string;
  skills: string[];
  useRealApi: boolean;

  setApiKey: (v: string) => void;
  setBaseUrl: (v: string) => void;
  setDefaultModelId: (v: string) => void;
  setTheme: (v: "dark" | "light") => void;
  setAgentInstructions: (v: string) => void;
  setUseRealApi: (v: boolean) => void;
  addSkill: (s: string) => void;
  removeSkill: (s: string) => void;
}

const DEFAULT_INSTRUCTIONS = `# AGENTS.md

You are Goodstuff-Agent, an autonomous coding agent inside a web workspace.

## Guidelines
- Think step by step before writing code.
- Prefer small, focused edits. Explain what changed and why.
- Run tests after meaningful changes.
- Keep files readable and well-structured.
- When unsure, ask the user a clarifying question.

## Tone
Friendly, concise, technical.
`;

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      apiKey: "",
      baseUrl: "https://api.openai.com/v1",
      defaultModelId: "forge-flash",
      theme: "dark",
      agentInstructions: DEFAULT_INSTRUCTIONS,
      skills: [
        "Web search",
        "File editor",
        "Terminal",
        "Code review",
        "Image generation",
      ],
      useRealApi: false,

      setApiKey: (v) => set({ apiKey: v }),
      setBaseUrl: (v) => set({ baseUrl: v }),
      setDefaultModelId: (v) => set({ defaultModelId: v }),
      setTheme: (v) => set({ theme: v }),
      setAgentInstructions: (v) => set({ agentInstructions: v }),
      setUseRealApi: (v) => set({ useRealApi: v }),
      addSkill: (s) =>
        set((st) =>
          st.skills.includes(s) ? st : { skills: [...st.skills, s] }
        ),
      removeSkill: (s) =>
        set((st) => ({ skills: st.skills.filter((x) => x !== s) })),
    }),
    { name: "forge-settings" }
  )
);
