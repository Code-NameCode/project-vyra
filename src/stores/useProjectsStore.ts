"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { uid } from "@/lib/id";
import type { LegacyChat, Project, Workspace } from "@/lib/types";

export function emptyWorkspace(): Workspace {
  return {
    files: [],
    changes: [],
    terminal: [],
    artifacts: [],
    browserUrl: "about:blank",
  };
}

interface ProjectsState {
  projects: Project[];
  legacy: LegacyChat[];
  addProject: (name: string, templateId?: string) => string;
  updateWorkspace: (projectId: string, updater: (ws: Workspace) => Workspace) => void;
  removeProject: (id: string) => void;
  renameProject: (id: string, name: string) => void;
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
            {
              id,
              name,
              templateId,
              createdAt: Date.now(),
              workspace: emptyWorkspace(),
            },
          ],
        }));
        return id;
      },
      updateWorkspace: (projectId, updater) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === projectId
              ? { ...p, workspace: updater(p.workspace) }
              : p
          ),
        })),
      removeProject: (id) =>
        set((s) => ({ projects: s.projects.filter((p) => p.id !== id) })),
      renameProject: (id, name) =>
        set((s) => ({
          projects: s.projects.map((p) => (p.id === id ? { ...p, name } : p)),
        })),
      addLegacy: (title) =>
        set((s) => ({
          legacy: [
            { id: uid("legacy"), title, createdAt: Date.now() },
            ...s.legacy,
          ],
        })),
    }),
    {
      name: "forge-projects",
      // backfill a workspace for any persisted project missing one
      merge: (persisted, current) => {
        const p = persisted as Partial<ProjectsState> | undefined;
        if (!p || !Array.isArray(p.projects)) return current as ProjectsState;
        const projects = p.projects.map((proj) =>
          proj.workspace ? proj : { ...proj, workspace: emptyWorkspace() }
        );
        return {
          ...current,
          ...p,
          projects,
        } as ProjectsState;
      },
    }
  )
);
