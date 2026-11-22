"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getPresetTheme } from "@/data/themes";
import type { SkillDef } from "@/lib/types";

interface SettingsState {
  apiKey: string;
  baseUrl: string;
  defaultModelId: string;
  defaultAgentId: string;
  themeId: string;
  defaultThemeId: string;
  customVars: Record<string, string>;
  fontFamily: string;
  fontSize: string;
  lineHeight: string;
  letterSpacing: string;
  agentInstructions: string;
  skills: SkillDef[];
  skillsFolderPath: string;
  useRealApi: boolean;
  enabledAgentIds: string[];
  detectedAgentIds: string[];

  setApiKey: (v: string) => void;
  setBaseUrl: (v: string) => void;
  setDefaultModelId: (v: string) => void;
  setDefaultAgentId: (v: string) => void;
  setTheme: (id: string) => void;
  setDefaultTheme: () => void;
  setCustomVar: (name: string, value: string) => void;
  clearCustomVars: () => void;
  resetTheme: () => void;
  setFontFamily: (v: string) => void;
  setFontSize: (v: string) => void;
  setLineHeight: (v: string) => void;
  setLetterSpacing: (v: string) => void;
  setAgentInstructions: (v: string) => void;
  setUseRealApi: (v: boolean) => void;
  setSkillsFolderPath: (v: string) => void;
  addSkill: (s: string | SkillDef) => void;
  removeSkill: (name: string) => void;
  setSkills: (s: SkillDef[]) => void;
  setEnabledAgentIds: (ids: string[]) => void;
  setDetectedAgentIds: (ids: string[]) => void;
}

const DEFAULT_INSTRUCTIONS = `# AGENTS.md

You are Goodstuff-VYRA, an autonomous coding agent inside a web workspace.

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
      defaultModelId: "",
      defaultAgentId: "",
      themeId: "forge-dark",
      defaultThemeId: "forge-dark",
      customVars: {},
      fontFamily: "Inter",
      fontSize: "14",
      lineHeight: "1.5",
      letterSpacing: "0",
      agentInstructions: DEFAULT_INSTRUCTIONS,
      skills: [],
      skillsFolderPath: "",
      useRealApi: false,
      enabledAgentIds: [],
      detectedAgentIds: [],

      setApiKey: (v) => set({ apiKey: v }),
      setBaseUrl: (v) => set({ baseUrl: v }),
      setDefaultModelId: (v) => set({ defaultModelId: v }),
      setDefaultAgentId: (v) => set({ defaultAgentId: v }),
      setTheme: (id) => set({ themeId: id }),
      setDefaultTheme: () =>
        set((st) => ({ defaultThemeId: st.themeId })),
      setCustomVar: (name, value) =>
        set((st) => {
          const next = { ...st.customVars };
          if (!value) {
            delete next[name];
          } else {
            next[name] = value;
          }
          return { customVars: next };
        }),
      clearCustomVars: () => set({ customVars: {} }),
      resetTheme: () =>
        set((st) => ({
          themeId: st.defaultThemeId || getPresetTheme("forge-dark").id,
          customVars: {},
          fontFamily: "Inter",
          fontSize: "14",
          lineHeight: "1.5",
          letterSpacing: "0",
        })),
      setFontFamily: (v) => set({ fontFamily: v }),
      setFontSize: (v) => set({ fontSize: v }),
      setLineHeight: (v) => set({ lineHeight: v }),
      setLetterSpacing: (v) => set({ letterSpacing: v }),
      setAgentInstructions: (v) => set({ agentInstructions: v }),
      setUseRealApi: (v) => set({ useRealApi: v }),
      setSkillsFolderPath: (v) => set({ skillsFolderPath: v }),
      addSkill: (s) =>
        set((st) => {
          const name = typeof s === "string" ? s : s.name;
          if (st.skills.some((x) => x.name === name)) return st;
          const def: SkillDef =
            typeof s === "string" ? { name: s } : s;
          return { skills: [...st.skills, def] };
        }),
      removeSkill: (name) =>
        set((st) => ({ skills: st.skills.filter((x) => x.name !== name) })),
      setSkills: (s) => set({ skills: s }),
      setEnabledAgentIds: (ids) =>
        set({ enabledAgentIds: Array.from(new Set(ids)) }),
      setDetectedAgentIds: (ids) =>
        set({ detectedAgentIds: Array.from(new Set(ids)) }),
    }),
    {
      name: "forge-settings",
      partialize: (state) => {
        const { apiKey: _apiKey, ...safe } = state;
        return safe;
      },
      merge: (persisted, current) => {
        const p = (persisted as Partial<SettingsState>) || {};
        const rawSkills = Array.isArray(p.skills) ? p.skills : [];
        const skills = rawSkills.map((s) =>
          typeof s === "string" ? { name: s } : (s as SkillDef)
        );
        // Adopt the user's currently active theme as the default the first
        // time we see persisted settings that predate `defaultThemeId`.
        const defaultThemeId =
          p.defaultThemeId || p.themeId || current.defaultThemeId;
        return {
          ...current,
          ...p,
          apiKey: "",
          skills,
          defaultThemeId,
          defaultAgentId:
            typeof p.defaultAgentId === "string" ? p.defaultAgentId : "",
          enabledAgentIds: Array.isArray(p.enabledAgentIds)
            ? p.enabledAgentIds
            : [],
          detectedAgentIds: Array.isArray(p.detectedAgentIds)
            ? p.detectedAgentIds
            : [],
        } as SettingsState;
      },
    }
  )
);
