"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { uid } from "@/lib/id";
import type { LegacyChat, Project } from "@/lib/types";

interface ProjectsState {
  projects: Project[];
  legacy: LegacyChat[];
  addProject: (name: string, templateId?: string) => string;
  removeProject: (id: string) => void;
  addLegacy: (title: string) => void;
}

export const useProjectsStore = create<ProjectsState>()(
  persist(
    (set) => ({
      projects: [],
      legacy: [
        {
          id: uid("legacy"),
          title: "Color palette generator",
          createdAt: Date.now() - 2 * 86400000,
        },
        {
          id: uid("legacy"),
          title: "Markdown previewer",
          createdAt: Date.now() - 5 * 86400000,
        },
      ],
      addProject: (name, templateId) => {
        const id = uid("proj");
        set((s) => ({
          projects: [
            ...s.projects,
            { id, name, templateId, createdAt: Date.now() },
          ],
        }));
        return id;
      },
      removeProject: (id) =>
        set((s) => ({ projects: s.projects.filter((p) => p.id !== id) })),
      addLegacy: (title) =>
        set((s) => ({
          legacy: [
            { id: uid("legacy"), title, createdAt: Date.now() },
            ...s.legacy,
          ],
        })),
    }),
    { name: "forge-projects" }
  )
);
