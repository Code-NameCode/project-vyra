"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  Clock,
  Github,
  Loader2,
  Play,
  Plus,
  RefreshCw,
  Trash2,
  Workflow,
  XCircle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

import { cn } from "@/lib/utils";
import { uid } from "@/lib/id";
import { useTasksStore } from "@/stores/useTasksStore";
import type {
  GitHubRepo,
  Pipeline,
  PipelineStep,
  PipelineStepType,
  ScheduledTask,
  ScheduleType,
  TaskRun,
  TaskTrigger,
} from "@/lib/task-types";

/* ------------------------------------------------------------------ */
/* Static option maps                                                  */
/* ------------------------------------------------------------------ */

const TRIGGER_OPTIONS: { value: TaskTrigger; label: string }[] = [
  { value: "manual", label: "Manual" },
  { value: "schedule", label: "Schedule" },
  { value: "github-push", label: "GitHub push" },
  { value: "github-pr", label: "GitHub pull request" },
];

const SCHEDULE_OPTIONS: { value: ScheduleType; label: string }[] = [
  { value: "manual", label: "Manual" },
  { value: "interval", label: "Interval" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
];

const STEP_TYPE_OPTIONS: { value: PipelineStepType; label: string }[] = [
  { value: "prompt", label: "Prompt" },
  { value: "review", label: "Review" },
  { value: "test", label: "Test" },
  { value: "deploy", label: "Deploy" },
  { value: "notify", label: "Notify" },
];

/* ------------------------------------------------------------------ */
/* Small display helpers                                               */
/* ------------------------------------------------------------------ */

function triggerLabel(t: TaskTrigger): string {
  return TRIGGER_OPTIONS.find((o) => o.value === t)?.label ?? t;
}

function scheduleLabel(t: ScheduledTask): string {
  switch (t.scheduleType) {
    case "interval":
      return `Every ${t.interval || "—"}`;
    case "daily":
      return "Daily";
    case "weekly":
      return "Weekly";
    default:
      return "Manual";
  }
}

function relativeTime(ts?: number): string {
  if (!ts) return "Never run";
  try {
    return formatDistanceToNow(new Date(ts), { addSuffix: true });
  } catch {
    return "Never run";
  }
}

function TriggerBadge({ trigger }: { trigger: TaskTrigger }) {
  if (trigger === "schedule") {
    return (
      <Badge
        variant="outline"
        className="border-accent-fill/40 text-accent-hi bg-accent-fill/10 gap-1"
      >
        <Clock className="size-3" />
        {triggerLabel(trigger)}
      </Badge>
    );
  }
  if (trigger === "github-push" || trigger === "github-pr") {
    return (
      <Badge variant="outline" className="border-ws-border text-foreground gap-1">
        <Github className="size-3" />
        {triggerLabel(trigger)}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="border-ws-border text-ws-secondary gap-1">
      {triggerLabel(trigger)}
    </Badge>
  );
}

function StepTypeBadge({ type }: { type: PipelineStepType }) {
  const map: Record<
    PipelineStepType,
    { className: string; label: string }
  > = {
    prompt: {
      className: "border-ws-border text-ws-secondary",
      label: "Prompt",
    },
    review: {
      className: "border-streak/40 text-streak bg-streak/10",
      label: "Review",
    },
    test: {
      className: "border-accent-fill/40 text-accent-hi bg-accent-fill/10",
      label: "Test",
    },
    deploy: {
      className: "border-destructive/40 text-destructive bg-destructive/10",
      label: "Deploy",
    },
    notify: {
      className: "border-ws-border text-ws-secondary",
      label: "Notify",
    },
  };
  const cfg = map[type];
  return (
    <Badge variant="outline" className={cn("gap-1", cfg.className)}>
      {cfg.label}
    </Badge>
  );
}

function RunStatusIcon({
  status,
}: {
  status: TaskRun["status"];
}) {
  if (status === "running") {
    return <Loader2 className="size-3.5 animate-spin text-accent-hi" />;
  }
  if (status === "success") {
    return <CheckCircle2 className="size-3.5 text-accent-hi" />;
  }
  return <XCircle className="size-3.5 text-destructive" />;
}

function StepStatusDot({ status }: { status: TaskRun["steps"][number]["status"] }) {
  if (status === "running") {
    return <Loader2 className="size-3.5 animate-spin text-accent-hi shrink-0" />;
  }
  if (status === "done") {
    return <CheckCircle2 className="size-3.5 text-accent-hi shrink-0" />;
  }
  if (status === "failed") {
    return <XCircle className="size-3.5 text-destructive shrink-0" />;
  }
  return (
    <span className="size-2 rounded-full bg-ws-disabled shrink-0 mt-1" />
  );
}

/* ------------------------------------------------------------------ */
/* GitHub connection card                                              */
/* ------------------------------------------------------------------ */

function GitHubCard() {
  const github = useTasksStore((s) => s.github);
  const setGithubToken = useTasksStore((s) => s.setGithubToken);
  const setGithubRepos = useTasksStore((s) => s.setGithubRepos);
  const selectRepo = useTasksStore((s) => s.selectRepo);

  const [tokenInput, setTokenInput] = useState("");
  const [connecting, setConnecting] = useState(false);

  const connected = Boolean(github.token);

  const handleConnect = async () => {
    const token = tokenInput.trim();
    if (!token) {
      toast.error("Enter a GitHub token first");
      return;
    }
    setConnecting(true);
    try {
      const res = await fetch("/api/github/repos", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("request failed");
      const data = (await res.json()) as { repos: GitHubRepo[]; real?: boolean };
      setGithubToken(token);
      setGithubRepos(data.repos);
      if (data.repos.length > 0) {
        selectRepo(data.repos[0].fullName);
      }
      toast.success(
        data.real ? `Connected — ${data.repos.length} repos` : "Connected (demo repos)"
      );
      setTokenInput("");
    } catch {
      toast.error("Could not reach GitHub");
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = () => {
    setGithubToken("");
    setGithubRepos([]);
    toast("GitHub disconnected");
  };

  return (
    <div className="rounded-[10px] border border-ws-border bg-card-ws p-4 mb-4 ws-fade-in">
      <div className="flex flex-col min-[640px]:flex-row items-start min-[640px]:items-center gap-3 min-[640px]:gap-4">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-[8px] bg-hover flex items-center justify-center text-foreground">
            <Github className="size-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-[14px] font-medium text-foreground">
              GitHub
            </span>
            <span className="text-[12px] text-ws-secondary">
              {connected
                ? `${github.repos.length} repos linked`
                : "Connect a token to enable push and PR triggers"}
            </span>
          </div>
        </div>

        {connected ? (
          <div className="flex flex-col min-[640px]:flex-row items-stretch min-[640px]:items-center gap-2 w-full min-[640px]:w-auto min-[640px]:ml-auto">
            <Select
              value={github.selectedRepo ?? ""}
              onValueChange={(v) => selectRepo(v)}
            >
              <SelectTrigger className="bg-card-ws border border-ws-border h-9 text-[13px] w-full min-[640px]:w-[260px] focus-ring">
                <SelectValue placeholder="Select repository" />
              </SelectTrigger>
              <SelectContent className="bg-card-ws border border-ws-border">
                {github.repos.length === 0 ? (
                  <SelectItem value="__none" disabled>
                    No repos available
                  </SelectItem>
                ) : (
                  github.repos.map((r) => (
                    <SelectItem key={r.fullName} value={r.fullName}>
                      {r.fullName}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <button
              type="button"
              onClick={handleDisconnect}
              className="inline-flex items-center justify-center gap-2 h-9 px-3 rounded-[8px] border border-ws-border text-[13px] text-ws-secondary hover:text-foreground hover:bg-hover focus-ring transition-colors duration-150"
            >
              Disconnect
            </button>
          </div>
        ) : (
          <div className="flex flex-col min-[640px]:flex-row items-stretch min-[640px]:items-center gap-2 w-full min-[640px]:w-auto min-[640px]:ml-auto">
            <Input
              type="password"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleConnect();
                }
              }}
              placeholder="ghp_personal_access_token"
              aria-label="GitHub token"
              className="bg-card-ws border border-ws-border h-9 text-[13px] w-full min-[640px]:w-[260px] focus-ring"
            />
            <button
              type="button"
              onClick={handleConnect}
              disabled={connecting}
              className="inline-flex items-center justify-center gap-2 h-9 px-3 rounded-[8px] bg-accent-fill text-white text-[13px] hover:opacity-90 focus-ring transition-opacity duration-150 disabled:opacity-60"
            >
              {connecting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Github className="size-4" />
              )}
              Connect
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Task card                                                           */
/* ------------------------------------------------------------------ */

function TaskCard({
  task,
  pipeline,
  active,
  running,
}: {
  task: ScheduledTask;
  pipeline: Pipeline | undefined;
  active: boolean;
  running: boolean;
}) {
  const toggleTask = useTasksStore((s) => s.toggleTask);
  const removeTask = useTasksStore((s) => s.removeTask);
  const runTask = useTasksStore((s) => s.runTask);

  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleRun = () => {
    void runTask(task.id);
    toast(`Running "${task.name}"`);
  };

  const handleDelete = () => {
    removeTask(task.id);
    setConfirmOpen(false);
    toast.success("Task deleted");
  };

  return (
    <div className="rounded-[10px] border border-ws-border bg-card-ws p-3 mb-2 ws-fade-in">
      <div className="flex flex-col min-[640px]:flex-row items-start min-[640px]:items-center gap-3 min-[640px]:gap-3">
        {/* Left: identity + meta */}
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <div className="flex items-center gap-2 flex-wrap">
            {active ? (
              <Loader2 className="size-3.5 animate-spin text-accent-hi shrink-0" />
            ) : null}
            <span className="text-[14px] font-medium text-foreground truncate">
              {task.name}
            </span>
            <TriggerBadge trigger={task.trigger} />
            {!task.enabled && (
              <Badge
                variant="outline"
                className="border-ws-border text-ws-disabled"
              >
                Disabled
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 text-[12px] text-ws-secondary flex-wrap">
            <span className="inline-flex items-center gap-1.5">
              <Workflow className="size-3.5" />
              {pipeline ? pipeline.name : "No pipeline"}
            </span>
            {(task.trigger === "schedule" ||
              task.trigger === "github-push" ||
              task.trigger === "github-pr") && (
              <span className="inline-flex items-center gap-1.5">
                <Clock className="size-3.5" />
                {task.trigger === "schedule"
                  ? scheduleLabel(task)
                  : task.githubRepo ?? "No repo"}
              </span>
            )}
            <span>Last run {relativeTime(task.lastRunAt)}</span>
          </div>
        </div>

        {/* Right: controls */}
        <div className="flex items-center gap-2 shrink-0 w-full min-[640px]:w-auto min-[640px]:ml-auto justify-end">
          <div className="flex items-center gap-2">
            <Label
              htmlFor={`enable-${task.id}`}
              className="text-[12px] text-ws-secondary sr-only"
            >
              Enabled
            </Label>
            <Switch
              id={`enable-${task.id}`}
              checked={task.enabled}
              onCheckedChange={() => toggleTask(task.id)}
              aria-label="Toggle task"
            />
            <span className="text-[12px] text-ws-secondary w-[14px]">
              {task.enabled ? "On" : "Off"}
            </span>
          </div>
          <button
            type="button"
            onClick={handleRun}
            disabled={running}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-[8px] bg-accent-fill text-white text-[12px] hover:opacity-90 focus-ring transition-opacity duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {active ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Play className="size-3.5" />
            )}
            Run now
          </button>
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            className="inline-flex items-center justify-center h-8 w-8 rounded-[8px] text-ws-secondary hover:text-destructive hover:bg-hover focus-ring transition-colors duration-150"
            aria-label="Delete task"
            title="Delete task"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete task?</DialogTitle>
            <DialogDescription>
              This removes &ldquo;{task.name}&rdquo; and stops any future runs.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setConfirmOpen(false)}
              className="inline-flex items-center h-9 px-3 rounded-[8px] border border-ws-border text-[13px] text-foreground hover:bg-hover focus-ring transition-colors duration-150"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="inline-flex items-center h-9 px-3 rounded-[8px] bg-destructive text-white text-[13px] hover:opacity-90 focus-ring transition-opacity duration-150"
            >
              Delete
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Pipeline card                                                       */
/* ------------------------------------------------------------------ */

function PipelineCard({ pipeline }: { pipeline: Pipeline }) {
  const removePipeline = useTasksStore((s) => s.removePipeline);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleDelete = () => {
    removePipeline(pipeline.id);
    setConfirmOpen(false);
    toast.success("Pipeline deleted");
  };

  return (
    <div className="rounded-[10px] border border-ws-border bg-card-ws p-3">
      <div className="flex items-center gap-2 mb-2">
        <Workflow className="size-4 text-accent-hi shrink-0" />
        <span className="text-[14px] font-medium text-foreground truncate">
          {pipeline.name}
        </span>
        <Badge
          variant="outline"
          className="border-ws-border text-ws-secondary ml-auto"
        >
          {pipeline.steps.length} step{pipeline.steps.length === 1 ? "" : "s"}
        </Badge>
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          className="inline-flex items-center justify-center h-7 w-7 rounded-[8px] text-ws-secondary hover:text-destructive hover:bg-hover focus-ring transition-colors duration-150"
          aria-label="Delete pipeline"
          title="Delete pipeline"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
      {pipeline.steps.length === 0 ? (
        <p className="text-[12px] text-ws-disabled">No steps defined.</p>
      ) : (
        <ol className="flex flex-col gap-1.5">
          {pipeline.steps.map((step, i) => (
            <li
              key={step.id}
              className="flex items-center gap-2 rounded-[8px] bg-hover/60 px-2.5 py-1.5"
            >
              <span className="text-[11px] text-ws-disabled w-4 shrink-0">
                {i + 1}
              </span>
              <span className="text-[13px] text-foreground truncate flex-1">
                {step.name}
              </span>
              <StepTypeBadge type={step.type} />
            </li>
          ))}
        </ol>
      )}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete pipeline?</DialogTitle>
            <DialogDescription>
              Tasks using &ldquo;{pipeline.name}&rdquo; will keep their reference
              but won&rsquo;t have steps to run.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setConfirmOpen(false)}
              className="inline-flex items-center h-9 px-3 rounded-[8px] border border-ws-border text-[13px] text-foreground hover:bg-hover focus-ring transition-colors duration-150"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="inline-flex items-center h-9 px-3 rounded-[8px] bg-destructive text-white text-[13px] hover:opacity-90 focus-ring transition-opacity duration-150"
            >
              Delete
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* New task dialog                                                     */
/* ------------------------------------------------------------------ */

function NewTaskDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const pipelines = useTasksStore((s) => s.pipelines);
  const github = useTasksStore((s) => s.github);
  const addTask = useTasksStore((s) => s.addTask);

  const [name, setName] = useState("");
  const [pipelineId, setPipelineId] = useState("");
  const [trigger, setTrigger] = useState<TaskTrigger>("manual");
  const [scheduleType, setScheduleType] = useState<ScheduleType>("manual");
  const [intervalValue, setIntervalValue] = useState("");
  const [repo, setRepo] = useState("");

  const reset = () => {
    setName("");
    setPipelineId(pipelines[0]?.id ?? "");
    setTrigger("manual");
    setScheduleType("manual");
    setIntervalValue("");
    setRepo(github.selectedRepo ?? github.repos[0]?.fullName ?? "");
  };

  // Seed defaults whenever the dialog opens.
  const handleOpenChange = (v: boolean) => {
    if (v) reset();
    onOpenChange(v);
  };

  const needsSchedule = trigger === "schedule";
  const needsInterval = needsSchedule && scheduleType === "interval";
  const needsRepo = trigger === "github-push" || trigger === "github-pr";

  const canSubmit =
    name.trim().length > 0 &&
    pipelineId !== "" &&
    (!needsInterval || intervalValue.trim().length > 0) &&
    (!needsRepo || repo !== "");

  const handleSubmit = () => {
    if (!canSubmit) {
      toast.error("Fill in the required fields");
      return;
    }
    addTask({
      name: name.trim(),
      pipelineId,
      trigger,
      scheduleType: needsSchedule ? scheduleType : "manual",
      interval: needsInterval ? intervalValue.trim() : undefined,
      enabled: true,
      githubRepo: needsRepo ? repo : undefined,
    });
    toast.success("Task created");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>New task</DialogTitle>
          <DialogDescription>
            Automate a pipeline on a schedule or a GitHub event.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="task-name" className="text-[13px] text-ws-secondary">
              Name
            </Label>
            <Input
              id="task-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nightly build + deploy"
              className="bg-card-ws border border-ws-border h-9 text-[13px] focus-ring"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-[13px] text-ws-secondary">Pipeline</Label>
            <Select value={pipelineId} onValueChange={setPipelineId}>
              <SelectTrigger className="bg-card-ws border border-ws-border h-9 text-[13px] w-full focus-ring">
                <SelectValue placeholder="Choose a pipeline" />
              </SelectTrigger>
              <SelectContent className="bg-card-ws border border-ws-border">
                {pipelines.length === 0 ? (
                  <SelectItem value="__none" disabled>
                    No pipelines yet
                  </SelectItem>
                ) : (
                  pipelines.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-[13px] text-ws-secondary">Trigger</Label>
            <Select
              value={trigger}
              onValueChange={(v) => setTrigger(v as TaskTrigger)}
            >
              <SelectTrigger className="bg-card-ws border border-ws-border h-9 text-[13px] w-full focus-ring">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card-ws border border-ws-border">
                {TRIGGER_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {needsSchedule && (
            <div className="flex flex-col gap-1.5">
              <Label className="text-[13px] text-ws-secondary">
                Schedule type
              </Label>
              <Select
                value={scheduleType}
                onValueChange={(v) => setScheduleType(v as ScheduleType)}
              >
                <SelectTrigger className="bg-card-ws border border-ws-border h-9 text-[13px] w-full focus-ring">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card-ws border border-ws-border">
                  {SCHEDULE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {needsInterval && (
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="task-interval"
                className="text-[13px] text-ws-secondary"
              >
                Interval
              </Label>
              <Input
                id="task-interval"
                value={intervalValue}
                onChange={(e) => setIntervalValue(e.target.value)}
                placeholder="5m, 1h, 6h"
                className="bg-card-ws border border-ws-border h-9 text-[13px] focus-ring"
              />
            </div>
          )}

          {needsRepo && (
            <div className="flex flex-col gap-1.5">
              <Label className="text-[13px] text-ws-secondary">
                Repository
              </Label>
              {github.repos.length === 0 ? (
                <p className="text-[12px] text-ws-disabled rounded-[8px] border border-dashed border-ws-border px-3 py-2">
                  Connect GitHub above to pick a repository.
                </p>
              ) : (
                <Select value={repo} onValueChange={setRepo}>
                  <SelectTrigger className="bg-card-ws border border-ws-border h-9 text-[13px] w-full focus-ring">
                    <SelectValue placeholder="Select repository" />
                  </SelectTrigger>
                  <SelectContent className="bg-card-ws border border-ws-border">
                    {github.repos.map((r) => (
                      <SelectItem key={r.fullName} value={r.fullName}>
                        {r.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="inline-flex items-center h-9 px-3 rounded-[8px] border border-ws-border text-[13px] text-foreground hover:bg-hover focus-ring transition-colors duration-150"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="inline-flex items-center h-9 px-3 rounded-[8px] bg-accent-fill text-white text-[13px] hover:opacity-90 focus-ring transition-opacity duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Create task
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* New pipeline dialog                                                 */
/* ------------------------------------------------------------------ */

type DraftStep = {
  id: string;
  type: PipelineStepType;
  name: string;
  config: string;
};

function NewPipelineDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const addPipeline = useTasksStore((s) => s.addPipeline);

  const [name, setName] = useState("");
  const [steps, setSteps] = useState<DraftStep[]>([]);

  const handleOpenChange = (v: boolean) => {
    if (v) {
      setName("");
      setSteps([]);
    }
    onOpenChange(v);
  };

  const addStep = () => {
    setSteps((prev) => [
      ...prev,
      {
        id: uid("step"),
        type: "prompt",
        name: "",
        config: "",
      },
    ]);
  };

  const updateStep = (id: string, patch: Partial<DraftStep>) => {
    setSteps((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...patch } : s))
    );
  };

  const removeStep = (id: string) => {
    setSteps((prev) => prev.filter((s) => s.id !== id));
  };

  const canSubmit = name.trim().length > 0 && steps.length > 0;

  const handleSubmit = () => {
    if (!canSubmit) {
      toast.error("Add a name and at least one step");
      return;
    }
    const cleanSteps: PipelineStep[] = steps.map((s) => ({
      id: s.id,
      type: s.type,
      name: s.name.trim() || STEP_TYPE_OPTIONS.find((o) => o.value === s.type)?.label || s.type,
      config: s.config.trim(),
    }));
    addPipeline({ name: name.trim(), steps: cleanSteps });
    toast.success("Pipeline created");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>New pipeline</DialogTitle>
          <DialogDescription>
            Chain prompt, review, test, deploy, and notify steps.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto ws-scroll pr-1">
          <div className="flex flex-col gap-1.5">
            <Label
              htmlFor="pipe-name"
              className="text-[13px] text-ws-secondary"
            >
              Name
            </Label>
            <Input
              id="pipe-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Release pipeline"
              className="bg-card-ws border border-ws-border h-9 text-[13px] focus-ring"
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label className="text-[13px] text-ws-secondary">Steps</Label>
              <button
                type="button"
                onClick={addStep}
                className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-[8px] border border-ws-border text-[12px] text-foreground hover:bg-hover focus-ring transition-colors duration-150"
              >
                <Plus className="size-3.5" />
                Add step
              </button>
            </div>

            {steps.length === 0 ? (
              <p className="text-[12px] text-ws-disabled rounded-[8px] border border-dashed border-ws-border px-3 py-4 text-center">
                No steps yet. Add one to define the pipeline.
              </p>
            ) : (
              <ol className="flex flex-col gap-2">
                {steps.map((s, i) => (
                  <li
                    key={s.id}
                    className="rounded-[10px] border border-ws-border bg-hover/40 p-2.5 flex flex-col gap-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-ws-disabled w-4 shrink-0">
                        {i + 1}
                      </span>
                      <Select
                        value={s.type}
                        onValueChange={(v) =>
                          updateStep(s.id, { type: v as PipelineStepType })
                        }
                      >
                        <SelectTrigger
                          size="sm"
                          className="bg-card-ws border border-ws-border h-8 text-[12px] w-[120px] focus-ring"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-card-ws border border-ws-border">
                          {STEP_TYPE_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        value={s.name}
                        onChange={(e) =>
                          updateStep(s.id, { name: e.target.value })
                        }
                        placeholder="Step name"
                        className="bg-card-ws border border-ws-border h-8 text-[12px] flex-1 focus-ring"
                      />
                      <button
                        type="button"
                        onClick={() => removeStep(s.id)}
                        className="inline-flex items-center justify-center h-8 w-8 rounded-[8px] text-ws-secondary hover:text-destructive hover:bg-hover focus-ring transition-colors duration-150"
                        aria-label="Remove step"
                        title="Remove step"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                    <Input
                      value={s.config}
                      onChange={(e) =>
                        updateStep(s.id, { config: e.target.value })
                      }
                      placeholder="Config / command / prompt"
                      className="bg-card-ws border border-ws-border h-8 text-[12px] font-mono focus-ring"
                    />
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>

        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="inline-flex items-center h-9 px-3 rounded-[8px] border border-ws-border text-[13px] text-foreground hover:bg-hover focus-ring transition-colors duration-150"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="inline-flex items-center h-9 px-3 rounded-[8px] bg-accent-fill text-white text-[13px] hover:opacity-90 focus-ring transition-opacity duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Create pipeline
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Run row (expandable)                                                */
/* ------------------------------------------------------------------ */

function RunRow({ run }: { run: TaskRun }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-[10px] border border-ws-border bg-card-ws">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-hover rounded-[10px] focus-ring transition-colors duration-150"
      >
        <RunStatusIcon status={run.status} />
        <span className="text-[13px] font-medium text-foreground truncate flex-1">
          {run.taskName}
        </span>
        <Badge
          variant="outline"
          className="border-ws-border text-ws-secondary capitalize"
        >
          {run.trigger.replace("-", " ")}
        </Badge>
        <span className="text-[12px] text-ws-disabled shrink-0">
          {relativeTime(run.startedAt)}
        </span>
        <ChevronDown
          className={cn(
            "size-4 text-ws-disabled shrink-0 transition-transform duration-150",
            expanded && "rotate-180"
          )}
        />
      </button>
      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t border-ws-border">
          {run.steps.length === 0 ? (
            <p className="text-[12px] text-ws-disabled py-2">
              No step output recorded.
            </p>
          ) : (
            <ol className="flex flex-col gap-2 pt-2">
              {run.steps.map((step, i) => (
                <li key={`${run.id}-step-${i}`} className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <StepStatusDot status={step.status} />
                    <span className="text-[13px] text-foreground truncate">
                      {step.name}
                    </span>
                    <span className="text-[11px] text-ws-disabled capitalize ml-auto">
                      {step.status}
                    </span>
                  </div>
                  {step.output && (
                    <pre className="ml-5 rounded-[8px] bg-hover/70 px-2.5 py-2 text-[12px] font-mono text-ws-secondary whitespace-pre-wrap break-words max-h-[160px] overflow-y-auto ws-scroll">
                      {step.output}
                    </pre>
                  )}
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* TasksPage                                                           */
/* ------------------------------------------------------------------ */

export function TasksPage() {
  const tasks = useTasksStore((s) => s.tasks);
  const pipelines = useTasksStore((s) => s.pipelines);
  const runs = useTasksStore((s) => s.runs);
  const running = useTasksStore((s) => s.running);
  const clearRuns = useTasksStore((s) => s.clearRuns);

  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [pipeDialogOpen, setPipeDialogOpen] = useState(false);

  const pipelineById = useMemo(() => {
    const map = new Map<string, Pipeline>();
    pipelines.forEach((p) => map.set(p.id, p));
    return map;
  }, [pipelines]);

  // Task ids that currently have a "running" run entry (drives the per-card spinner).
  const activeTaskIds = useMemo(() => {
    const set = new Set<string>();
    runs.forEach((r) => {
      if (r.status === "running") set.add(r.taskId);
    });
    return set;
  }, [runs]);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="shrink-0 border-b border-ws-border px-4 min-[640px]:px-6 py-4 flex flex-col min-[640px]:flex-row items-start min-[640px]:items-center gap-3 min-[640px]:gap-4">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-[20px] font-semibold text-foreground">
            Tasks &amp; Pipelines
          </h1>
          <p className="text-[13px] text-ws-secondary">
            Automate recurring work with scheduled pipelines and GitHub
            triggers.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setTaskDialogOpen(true)}
          className="min-[640px]:ml-auto inline-flex items-center gap-2 h-9 px-3 rounded-[8px] bg-accent-fill text-white text-[13px] hover:opacity-90 focus-ring transition-opacity duration-150"
        >
          <Plus className="size-4" />
          New task
        </button>
      </header>

      {/* Body */}
      <div className="flex-1 overflow-y-auto ws-scroll px-4 min-[640px]:px-6 py-4">
        <div className="flex flex-col gap-6 max-w-[820px] mx-auto">
          <section>
            <GitHubCard />
          </section>

          {/* Tasks */}
          <section>
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-[14px] font-medium text-foreground">Tasks</h2>
              <span className="text-[12px] text-ws-secondary">
                {tasks.length} task{tasks.length === 1 ? "" : "s"}
              </span>
            </div>
            {tasks.length === 0 ? (
              <div className="rounded-[10px] border border-dashed border-ws-border bg-card-ws/50 px-4 py-10 text-center">
                <p className="text-[13px] text-ws-secondary">
                  No tasks yet. Create one to automate your workflow.
                </p>
                <button
                  type="button"
                  onClick={() => setTaskDialogOpen(true)}
                  className="mt-3 inline-flex items-center gap-2 h-8 px-3 rounded-[8px] bg-accent-fill text-white text-[12px] hover:opacity-90 focus-ring transition-opacity duration-150"
                >
                  <Plus className="size-3.5" />
                  New task
                </button>
              </div>
            ) : (
              <div className="flex flex-col">
                {tasks.map((t) => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    pipeline={pipelineById.get(t.pipelineId)}
                    active={activeTaskIds.has(t.id)}
                    running={running}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Pipelines */}
          <section>
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-[14px] font-medium text-foreground">
                Pipelines
              </h2>
              <span className="text-[12px] text-ws-secondary">
                {pipelines.length} pipeline{pipelines.length === 1 ? "" : "s"}
              </span>
              <button
                type="button"
                onClick={() => setPipeDialogOpen(true)}
                className="ml-auto inline-flex items-center gap-1.5 h-8 px-2.5 rounded-[8px] border border-ws-border text-[12px] text-foreground hover:bg-hover focus-ring transition-colors duration-150"
              >
                <Plus className="size-3.5" />
                New pipeline
              </button>
            </div>
            {pipelines.length === 0 ? (
              <div className="rounded-[10px] border border-dashed border-ws-border bg-card-ws/50 px-4 py-10 text-center">
                <p className="text-[13px] text-ws-secondary">
                  No pipelines yet. Create one to define reusable step chains.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 min-[768px]:grid-cols-2 gap-2">
                {pipelines.map((p) => (
                  <PipelineCard key={p.id} pipeline={p} />
                ))}
              </div>
            )}
          </section>

          {/* Recent runs */}
          <section>
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-[14px] font-medium text-foreground">
                Recent runs
              </h2>
              <span className="text-[12px] text-ws-secondary">
                {runs.length} run{runs.length === 1 ? "" : "s"}
              </span>
              {runs.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    clearRuns();
                    toast("Run history cleared");
                  }}
                  className="ml-auto inline-flex items-center gap-1.5 h-8 px-2.5 rounded-[8px] text-[12px] text-ws-secondary hover:text-foreground hover:bg-hover focus-ring transition-colors duration-150"
                >
                  <RefreshCw className="size-3.5" />
                  Clear
                </button>
              )}
            </div>
            {runs.length === 0 ? (
              <div className="rounded-[10px] border border-dashed border-ws-border bg-card-ws/50 px-4 py-10 text-center">
                <p className="text-[13px] text-ws-secondary">
                  No runs yet. Run a task to see step-by-step output here.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {runs.map((r) => (
                  <RunRow key={r.id} run={r} />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      <NewTaskDialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen} />
      <NewPipelineDialog
        open={pipeDialogOpen}
        onOpenChange={setPipeDialogOpen}
      />
    </div>
  );
}
