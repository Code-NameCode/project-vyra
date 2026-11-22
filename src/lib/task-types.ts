// Task scheduler + pipeline + GitHub integration + deep research types.

export type TaskTrigger = "manual" | "schedule" | "github-push" | "github-pr";
export type ScheduleType = "manual" | "interval" | "daily" | "weekly";
export type PipelineStepType = "prompt" | "review" | "test" | "deploy" | "notify";

export interface PipelineStep {
  id: string;
  type: PipelineStepType;
  name: string;
  config: string;
}

export interface Pipeline {
  id: string;
  name: string;
  steps: PipelineStep[];
}

export interface ScheduledTask {
  id: string;
  name: string;
  pipelineId: string;
  trigger: TaskTrigger;
  scheduleType: ScheduleType;
  interval?: string; // "5m", "1h", "6h"
  nextRunAt?: number;
  lastRunAt?: number;
  enabled: boolean;
  githubRepo?: string;
}

export interface TaskRunStep {
  name: string;
  status: "pending" | "running" | "done" | "failed";
  output?: string;
}

export interface TaskRun {
  id: string;
  taskId: string;
  taskName: string;
  status: "running" | "success" | "failed";
  startedAt: number;
  completedAt?: number;
  steps: TaskRunStep[];
  trigger: string;
}

export interface GitHubRepo {
  owner: string;
  name: string;
  fullName: string;
}

export interface GitHubConnection {
  token: string;
  repos: GitHubRepo[];
  selectedRepo?: string;
}

export type ResearchPhase = "searching" | "reading" | "analyzing" | "writing";
