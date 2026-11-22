"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, Folder, Plus, Trash2 } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/useAppStore";
import { useChatStore } from "@/stores/useChatStore";
import { useProjectsStore } from "@/stores/useProjectsStore";
import type { ChatMessage, Project } from "@/lib/types";

import { FileTree } from "./FileTree";
import { CodeViewer } from "./CodeViewer";

/**
 * stripMarkdown — collapse common markdown syntax to plain text so the
 * History tab reads cleanly without a full renderer.
 */
function stripMarkdown(s: string): string {
  return s
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^>\s?/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

/* ------------------------------------------------------------------ */
/* Detail header — inline rename + Open / Delete actions               */
/* ------------------------------------------------------------------ */

function DetailHeader({
  project,
  onDeleted,
}: {
  project: Project;
  onDeleted: () => void;
}) {
  const renameProject = useProjectsStore((s) => s.renameProject);
  const removeProject = useProjectsStore((s) => s.removeProject);
  const openProject = useAppStore((s) => s.openProject);

  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(project.name);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const beginEdit = () => {
    // seed the draft from the latest name so external renames are reflected
    setDraftName(project.name);
    setEditing(true);
  };

  const commit = () => {
    const v = draftName.trim();
    if (v && v !== project.name) {
      renameProject(project.id, v);
      toast.success("Renamed");
    } else {
      setDraftName(project.name);
    }
    setEditing(false);
  };

  const cancel = () => {
    setDraftName(project.name);
    setEditing(false);
  };

  const handleDelete = () => {
    removeProject(project.id);
    setDeleteOpen(false);
    onDeleted();
    toast.success("Project deleted");
  };

  return (
    <div className="shrink-0 border-b border-ws-border px-4 min-[640px]:px-5 py-3 flex flex-col min-[640px]:flex-row items-start min-[640px]:items-center gap-3 min-[640px]:gap-3">
      {editing ? (
        <Input
          ref={inputRef}
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              e.currentTarget.blur();
            } else if (e.key === "Escape") {
              e.preventDefault();
              cancel();
            }
          }}
          aria-label="Project name"
          className="bg-card-ws border border-ws-border h-8 text-[15px] w-full min-[640px]:w-[280px] focus-ring"
        />
      ) : (
        <button
          type="button"
          onClick={beginEdit}
          title="Rename project"
          className="text-[15px] font-medium text-foreground rounded-[6px] px-1.5 py-1 -ml-1.5 hover:bg-hover focus-ring transition-colors duration-150 truncate max-w-full min-[640px]:max-w-[360px]"
        >
          {project.name}
        </button>
      )}

      <div className="flex items-center gap-2 w-full min-[640px]:w-auto min-[640px]:ml-auto min-[640px]:justify-end">
        <button
          type="button"
          onClick={() => openProject(project.id, project.name)}
          className="inline-flex items-center gap-2 h-8 px-3 rounded-[8px] border border-ws-border text-[13px] text-foreground hover:bg-hover focus-ring transition-colors duration-150"
        >
          <ArrowUpRight className="size-4" />
          Open
        </button>
        <button
          type="button"
          onClick={() => setDeleteOpen(true)}
          className="inline-flex items-center gap-2 h-8 px-3 rounded-[8px] text-[13px] text-ws-secondary hover:text-red-400 hover:bg-hover focus-ring transition-colors duration-150"
        >
          <Trash2 className="size-4" />
          Delete
        </button>
      </div>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete project?</DialogTitle>
            <DialogDescription>
              This permanently removes {project.name} and its workspace.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setDeleteOpen(false)}
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
/* Files tab — FileTree + CodeViewer                                   */
/* ------------------------------------------------------------------ */

function FilesTab({ project }: { project: Project }) {
  const files = project.workspace.files;
  const [selectedPath, setSelectedPath] = useState<string | undefined>(
    undefined
  );

  const currentPath = files.some((f) => f.path === selectedPath)
    ? selectedPath
    : files[0]?.path;
  const selectedFile = files.find((f) => f.path === currentPath);

  if (files.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <span className="text-[13px] text-ws-secondary">
          No files yet. Files the agent creates will appear here.
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-[640px]:flex-row flex-1 min-h-0">
      <div className="w-full min-[640px]:w-[200px] shrink-0 max-h-[35vh] min-[640px]:max-h-none border-b min-[640px]:border-b-0 min-[640px]:border-r border-ws-border overflow-y-auto ws-scroll p-2">
        <FileTree
          files={files}
          selectedPath={currentPath}
          onSelect={setSelectedPath}
        />
      </div>
      <CodeViewer
        code={selectedFile?.content}
        language={selectedFile?.language}
        filename={selectedFile?.name}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* History tab — chat messages for the project's linked conversation   */
/* ------------------------------------------------------------------ */

function MessageRow({ message }: { message: ChatMessage }) {
  const time = formatDistanceToNow(new Date(message.createdAt), {
    addSuffix: true,
  });

  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="flex flex-col items-end gap-1 max-w-[80%]">
          <div className="rounded-[12px] rounded-br-[6px] bg-hover px-3.5 py-2 text-[14px] whitespace-pre-wrap break-words text-foreground">
            {message.content}
          </div>
          <span className="text-[11px] text-ws-disabled">{time}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="text-[14px] text-foreground whitespace-pre-wrap break-words">
        {stripMarkdown(message.content)}
      </div>
      <span className="text-[11px] text-ws-disabled">{time}</span>
    </div>
  );
}

function HistoryTab({ project }: { project: Project }) {
  const tabs = useAppStore((s) => s.tabs);
  const conversations = useChatStore((s) => s.conversations);
  const tab = tabs.find((t) => t.projectId === project.id);
  const conv = tab ? conversations[tab.id] : undefined;
  const messages = conv?.messages ?? [];

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <span className="text-[13px] text-ws-secondary">
          No chat history yet. Open the project and send a message.
        </span>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto ws-scroll px-5 py-4">
      <div className="flex flex-col gap-4 max-w-[760px] mx-auto">
        {messages.map((m) => (
          <MessageRow key={m.id} message={m} />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Rules tab — editable project rules textarea                         */
/* ------------------------------------------------------------------ */

function RulesTab({ project }: { project: Project }) {
  const setRules = useProjectsStore((s) => s.setRules);
  const [value, setValue] = useState(project.rules);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto ws-scroll p-5">
      <div className="flex flex-col gap-2 max-w-[760px] mx-auto">
        <div className="text-[13px] font-medium text-foreground">
          Project rules
        </div>
        <div className="text-[12px] text-ws-secondary">
          These instructions are sent to the agent when chatting in this
          project.
        </div>
        <Textarea
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setRules(project.id, e.target.value);
          }}
          placeholder={
            "# Project rules\n\nDescribe conventions, constraints, stack, and tone for this project."
          }
          className="min-h-[260px] font-mono text-[13px] bg-card-ws border border-ws-border rounded-[10px] focus-ring mt-1"
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* ProjectsPage — full-page project manager                            */
/* ------------------------------------------------------------------ */

export function ProjectsPage() {
  const projects = useProjectsStore((s) => s.projects);
  const addProject = useProjectsStore((s) => s.addProject);

  const [selectedId, setSelectedId] = useState<string>("");

  // derive the effective selection: fall back to the first project when the
  // stored id is stale (e.g. after a delete) or before any selection.
  const selectedProject = useMemo(
    () => projects.find((p) => p.id === selectedId) ?? projects[0],
    [projects, selectedId]
  );

  const handleNew = () => {
    const id = addProject("Untitled project");
    setSelectedId(id);
    toast.success("Project created");
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="shrink-0 border-b border-ws-border px-4 min-[640px]:px-6 py-4 flex flex-col min-[640px]:flex-row items-start min-[640px]:items-center gap-3 min-[640px]:gap-3">
        <div className="flex items-center gap-3 min-[640px]:gap-3">
          <h1 className="text-[20px] font-semibold text-foreground">Projects</h1>
          <span className="text-[13px] text-ws-secondary">
            {projects.length} project{projects.length === 1 ? "" : "s"}
          </span>
        </div>
        <button
          type="button"
          onClick={handleNew}
          className="min-[640px]:ml-auto inline-flex items-center gap-2 h-9 px-3 rounded-[8px] bg-accent-fill text-white text-[13px] hover:opacity-90 focus-ring transition-opacity duration-150"
        >
          <Plus className="size-4" />
          New project
        </button>
      </header>

      {/* Body: left list + right detail */}
      <div className="flex flex-col min-[768px]:flex-row flex-1 min-h-0">
        <div className="w-full min-[768px]:w-[260px] shrink-0 max-h-[35vh] min-[768px]:max-h-none border-b min-[768px]:border-b-0 min-[768px]:border-r border-ws-border overflow-y-auto ws-scroll p-2">
          {projects.length === 0 ? (
            <div className="flex h-full items-center justify-center px-3 text-center">
              <p className="text-[13px] text-ws-secondary">
                No projects yet. Create one to get started.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-0.5">
              {projects.map((p) => {
                const active = selectedProject?.id === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedId(p.id)}
                    className={cn(
                      "w-full flex items-center gap-2 rounded-[8px] px-2.5 py-2 text-left text-[14px] transition-colors focus-ring",
                      active
                        ? "bg-hover text-foreground"
                        : "text-ws-secondary hover:bg-hover hover:text-foreground"
                    )}
                  >
                    <Folder
                      className={cn(
                        "size-4 shrink-0",
                        active ? "text-accent-hi" : "text-ws-secondary"
                      )}
                    />
                    <span className="flex-1 min-w-0 flex flex-col gap-0.5">
                      <span className="truncate">{p.name}</span>
                      <span className="text-[11px] text-ws-disabled">
                        {formatDistanceToNow(new Date(p.createdAt), {
                          addSuffix: true,
                        })}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex-1 flex flex-col min-h-0">
          {!selectedProject ? (
            <div className="flex h-full items-center justify-center">
              <span className="text-[13px] text-ws-secondary">
                Select a project
              </span>
            </div>
          ) : (
            <div
              key={selectedProject.id}
              className="ws-fade-in flex-1 flex flex-col min-h-0"
            >
              <DetailHeader
                project={selectedProject}
                onDeleted={() => setSelectedId("")}
              />
              <Tabs
                defaultValue="files"
                className="flex-1 min-h-0 flex flex-col gap-0"
              >
                <div className="shrink-0 border-b border-ws-border px-5">
                  <TabsList className="bg-transparent h-9 p-0 gap-4 rounded-none">
                    <TabsTrigger
                      value="files"
                      className="text-[13px] data-[state=active]:bg-hover data-[state=active]:text-foreground"
                    >
                      Files
                    </TabsTrigger>
                    <TabsTrigger
                      value="history"
                      className="text-[13px] data-[state=active]:bg-hover data-[state=active]:text-foreground"
                    >
                      History
                    </TabsTrigger>
                    <TabsTrigger
                      value="rules"
                      className="text-[13px] data-[state=active]:bg-hover data-[state=active]:text-foreground"
                    >
                      Rules
                    </TabsTrigger>
                  </TabsList>
                </div>
                <TabsContent
                  value="files"
                  className="flex-1 min-h-0 flex flex-col"
                >
                  <FilesTab project={selectedProject} />
                </TabsContent>
                <TabsContent
                  value="history"
                  className="flex-1 min-h-0 flex flex-col"
                >
                  <HistoryTab project={selectedProject} />
                </TabsContent>
                <TabsContent
                  value="rules"
                  className="flex-1 min-h-0 flex flex-col"
                >
                  <RulesTab project={selectedProject} />
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
