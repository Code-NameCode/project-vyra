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

/** Deep-clone a workspace (all fields are plain serializable data). */
function cloneWorkspace(ws: Workspace): Workspace {
  return JSON.parse(JSON.stringify(ws)) as Workspace;
}

interface ProjectsState {
  projects: Project[];
  legacy: LegacyChat[];
  addProject: (name: string, templateId?: string) => string;
  cloneProject: (id: string) => string;
  updateWorkspace: (projectId: string, updater: (ws: Workspace) => Workspace) => void;
  removeProject: (id: string) => void;
  renameProject: (id: string, name: string) => void;
  setRules: (projectId: string, rules: string) => void;
  addLegacy: (title: string) => void;
}

export const useProjectsStore = create<ProjectsState>()(
  persist(
    (set, get) => ({
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
              rules: "",
            },
          ],
        }));
        return id;
      },
      cloneProject: (id) => {
        const src = get().projects.find((p) => p.id === id);
        const newId = uid("proj");
        set((s) => ({
          projects: [
            ...s.projects,
            {
              id: newId,
              name: src ? `${src.name} copy` : "Untitled project",
              templateId: src?.templateId,
              createdAt: Date.now(),
              workspace: src ? cloneWorkspace(src.workspace) : emptyWorkspace(),
              rules: src?.rules ?? "",
            },
          ],
        }));
        return newId;
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
      setRules: (projectId, rules) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === projectId ? { ...p, rules } : p
          ),
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
      // backfill a workspace + rules for any persisted project missing them
      merge: (persisted, current) => {
        const p = persisted as Partial<ProjectsState> | undefined;
        if (!p || !Array.isArray(p.projects)) return current as ProjectsState;
        const projects = p.projects.map((proj) => ({
          ...proj,
          workspace: proj.workspace ?? emptyWorkspace(),
          rules: proj.rules ?? "",
        }));
        return {
          ...current,
          ...p,
          projects,
        } as ProjectsState;
      },
    }
  )
);
