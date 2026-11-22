"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { uid } from "@/lib/id";
import type {
  GitHubConnection,
  Pipeline,
  PipelineStep,
  ScheduledTask,
  TaskRun,
  TaskRunStep,
} from "@/lib/task-types";

const DEFAULT_PIPELINES: Pipeline[] = [
  {
    id: "pipe-ci",
    name: "CI: Lint + Test",
    steps: [
      { id: uid("step"), type: "review", name: "Code review", config: "Review changed files for style + bugs" },
      { id: uid("step"), type: "test", name: "Run tests", config: "npm test" },
    ],
  },
  {
    id: "pipe-deploy",
    name: "Build + Deploy",
    steps: [
      { id: uid("step"), type: "test", name: "Run tests", config: "npm test" },
      { id: uid("step"), type: "deploy", name: "Deploy", config: "Deploy to production" },
      { id: uid("step"), type: "notify", name: "Notify", config: "Send deployment notification" },
    ],
  },
];

interface TasksState {
  tasks: ScheduledTask[];
  pipelines: Pipeline[];
  runs: TaskRun[];
  github: GitHubConnection;
  running: boolean;

  // task CRUD
  addTask: (t: Partial<Omit<ScheduledTask, "id">>) => string;
  updateTask: (id: string, patch: Partial<ScheduledTask>) => void;
  removeTask: (id: string) => void;
  toggleTask: (id: string) => void;

  // pipeline CRUD
  addPipeline: (p: Partial<Omit<Pipeline, "id">>) => string;
  updatePipeline: (id: string, patch: Partial<Pipeline>) => void;
  removePipeline: (id: string) => void;

  // runs
  addRun: (r: TaskRun) => void;
  updateRun: (id: string, patch: Partial<TaskRun>) => void;
  clearRuns: () => void;

  // GitHub
  setGithubToken: (t: string) => void;
  setGithubRepos: (repos: GitHubConnection["repos"]) => void;
  selectRepo: (fullName: string) => void;

  // execution
  runTask: (taskId: string) => Promise<void>;
}

export const useTasksStore = create<TasksState>()(
  persist(
    (set, get) => ({
      tasks: [],
      pipelines: DEFAULT_PIPELINES,
      runs: [],
      github: { token: "", repos: [], selectedRepo: undefined },
      running: false,

      addTask: (t) => {
        const id = uid("task");
        const task: ScheduledTask = {
          id,
          name: t.name || "Untitled task",
          pipelineId: t.pipelineId || "",
          trigger: t.trigger || "manual",
          scheduleType: t.scheduleType || "manual",
          interval: t.interval,
          nextRunAt: t.nextRunAt,
          enabled: t.enabled ?? true,
          githubRepo: t.githubRepo,
        };
        set((s) => ({ tasks: [...s.tasks, task] }));
        return id;
      },

      updateTask: (id, patch) =>
        set((s) => ({
          tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
        })),

      removeTask: (id) =>
        set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),

      toggleTask: (id) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id ? { ...t, enabled: !t.enabled } : t
          ),
        })),

      addPipeline: (p) => {
        const id = uid("pipe");
        const pipe: Pipeline = {
          id,
          name: p.name || "New pipeline",
          steps: p.steps || [],
        };
        set((s) => ({ pipelines: [...s.pipelines, pipe] }));
        return id;
      },

      updatePipeline: (id, patch) =>
        set((s) => ({
          pipelines: s.pipelines.map((p) =>
            p.id === id ? { ...p, ...patch } : p
          ),
        })),

      removePipeline: (id) =>
        set((s) => ({ pipelines: s.pipelines.filter((p) => p.id !== id) })),

      addRun: (r) => set((s) => ({ runs: [r, ...s.runs].slice(0, 50) })),
      updateRun: (id, patch) =>
        set((s) => ({
          runs: s.runs.map((r) => (r.id === id ? { ...r, ...patch } : r)),
        })),
      clearRuns: () => set({ runs: [] }),

      setGithubToken: (t) =>
        set((s) => ({ github: { ...s.github, token: t } })),
      setGithubRepos: (repos) =>
        set((s) => ({ github: { ...s.github, repos } })),
      selectRepo: (fullName) =>
        set((s) => ({ github: { ...s.github, selectedRepo: fullName } })),

      runTask: async (taskId) => {
        const task = get().tasks.find((t) => t.id === taskId);
        if (!task) return;
        const pipeline = get().pipelines.find((p) => p.id === task.pipelineId);
        if (!pipeline) return;

        const runId = uid("run");
        const steps: TaskRunStep[] = pipeline.steps.map((s) => ({
          name: s.name,
          status: "pending" as const,
        }));
        const run: TaskRun = {
          id: runId,
          taskId,
          taskName: task.name,
          status: "running",
          startedAt: Date.now(),
          steps,
          trigger: task.trigger,
        };
        get().addRun(run);
        set({ running: true });

        try {
          const res = await fetch("/api/tasks/run", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ steps: pipeline.steps }),
          });
          if (!res.ok || !res.body) throw new Error("run failed");

          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buf = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buf += decoder.decode(value, { stream: true });
            let idx: number;
            while ((idx = buf.indexOf("\n\n")) !== -1) {
              const chunk = buf.slice(0, idx);
              buf = buf.slice(idx + 2);
              const line = chunk.split("\n").find((l) => l.startsWith("data:"));
              if (!line) continue;
              const payload = line.slice(5).trim();
              try {
                const evt = JSON.parse(payload);
                if (evt.type === "step_start") {
                  get().updateRun(runId, {
                    steps: run.steps.map((s, i) =>
                      i === evt.index ? { ...s, status: "running" } : s
                    ),
                  });
                } else if (evt.type === "step_done") {
                  get().updateRun(runId, {
                    steps: run.steps.map((s, i) =>
                      i === evt.index
                        ? { ...s, status: "done", output: evt.output }
                        : s
                    ),
                  });
                }
              } catch {
                /* ignore */
              }
            }
          }

          get().updateRun(runId, {
            status: "success",
            completedAt: Date.now(),
            steps: run.steps.map((s) => ({ ...s, status: "done" as const })),
          });
          get().updateTask(taskId, { lastRunAt: Date.now() });
        } catch {
          get().updateRun(runId, {
            status: "failed",
            completedAt: Date.now(),
          });
        } finally {
          set({ running: false });
        }
      },
    }),
    { name: "forge-tasks" }
  )
);
