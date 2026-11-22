"use client";

import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Check,
  ChevronRight,
  Copy,
  File,
  FileImage,
  FileText,
  FileVideo,
  Folder,
  FolderPlus,
  History,
  MoreHorizontal,
  PanelLeftClose,
  Pencil,
  Search,
  SquarePen,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useMemo } from "react";
import { useAppStore } from "@/stores/useAppStore";
import { useProjectsStore } from "@/stores/useProjectsStore";
import { useChatStore } from "@/stores/useChatStore";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ForgeLogo } from "./ForgeLogo";

/**
 * Sidebar — 320px (w-80) inner content panel, right of IconRail.
 * Renders header, quick actions, and a projects list where each project can
 * be opened, renamed, cloned, or deleted.
 */
export function Sidebar() {
  const newChatTab = useAppStore((s) => s.newChatTab);
  const setSearchOpen = useAppStore((s) => s.setSearchOpen);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  const openProject = useAppStore((s) => s.openProject);
  const setRailPage = useAppStore((s) => s.setRailPage);

  const projects = useProjectsStore((s) => s.projects);
  const legacy = useProjectsStore((s) => s.legacy);
  const addProject = useProjectsStore((s) => s.addProject);
  const cloneProject = useProjectsStore((s) => s.cloneProject);
  const removeProject = useProjectsStore((s) => s.removeProject);
  const renameProject = useProjectsStore((s) => s.renameProject);
  const activeProjectId = useAppStore((s) =>
    s.tabs.find((t) => t.id === s.activeTabId)?.projectId
  );

  const [legacyOpen, setLegacyOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleNewProject = () => {
    const id = addProject("New project");
    openProject(id, "New project");
    toast.success("Project created");
  };

  const beginRename = (id: string, name: string) => {
    setEditingId(id);
    setDraftName(name);
  };

  const commitRename = () => {
    if (!editingId) return;
    const name = draftName.trim();
    if (name) {
      renameProject(editingId, name);
      toast.success("Project renamed");
    }
    setEditingId(null);
  };

  const handleClone = (id: string) => {
    const newId = cloneProject(id);
    const p = useProjectsStore.getState().projects.find((x) => x.id === newId);
    if (p) openProject(newId, p.name);
    toast.success("Project cloned");
  };

  const confirmDelete = () => {
    if (!deleteId) return;
    removeProject(deleteId);
    setDeleteId(null);
    toast.success("Project deleted");
  };

  const deleteTarget = deleteId
    ? projects.find((p) => p.id === deleteId)
    : null;

  return (
    <aside className="flex h-full w-80 shrink-0 flex-col border-r border-ws-border bg-surface p-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <ForgeLogo size={24} />
        <div className="flex items-center gap-1">
          <IconButton aria-label="Search" onClick={() => setSearchOpen(true)}>
            <Search className="size-4" />
          </IconButton>
          <IconButton aria-label="Collapse sidebar" onClick={() => toggleSidebar()}>
            <PanelLeftClose className="size-4" />
          </IconButton>
        </div>
      </div>

      {/* Quick actions */}
      <div className="mt-3 flex flex-col gap-0.5">
        <MenuRow icon={SquarePen} label="New chat" onClick={() => newChatTab()} />
        <MenuRow
          icon={FolderPlus}
          label="New project"
          onClick={handleNewProject}
        />
      </div>

      {/* Projects section */}
      <div className="mt-4 mb-1 flex items-center justify-between px-2">
        <button
          type="button"
          onClick={() => setRailPage("projects")}
          className="focus-ring -mx-1 rounded-[4px] px-1 text-[12px] uppercase tracking-wide text-ws-secondary transition-colors hover:text-foreground"
        >
          Projects
        </button>
        {projects.length > 0 && (
          <button
            type="button"
            onClick={() => setRailPage("projects")}
            className="focus-ring -mx-1 rounded-[4px] px-1 text-[11px] text-ws-disabled transition-colors hover:text-foreground"
          >
            Manage
          </button>
        )}
      </div>

      <div className="ws-scroll -mx-1 flex max-h-[min(42vh,320px)] flex-col gap-0.5 overflow-y-auto px-1">
        {projects.length === 0 ? (
          <p className="px-2 py-1 text-[13px] text-ws-disabled">
            Start your first project.
          </p>
        ) : (
          projects.map((p) => {
            const active = p.id === activeProjectId;
            const editing = editingId === p.id;
            return (
              <div
                key={p.id}
                className={cn(
                  "group flex items-center gap-1 rounded-[6px] pr-1 transition-colors duration-150",
                  active ? "bg-hover" : "hover:bg-hover"
                )}
              >
                {editing ? (
                  <>
                    <Folder
                      className={cn(
                        "ml-1 size-3.5 shrink-0",
                        active ? "text-accent-hi" : "text-ws-disabled"
                      )}
                    />
                    <Input
                      autoFocus
                      value={draftName}
                      onChange={(e) => setDraftName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          commitRename();
                        } else if (e.key === "Escape") {
                          e.preventDefault();
                          setEditingId(null);
                        }
                      }}
                      onBlur={commitRename}
                      className="h-7 flex-1 border-ws-border bg-card-ws px-2 text-[13px] text-foreground"
                    />
                    <button
                      type="button"
                      aria-label="Save name"
                      onClick={commitRename}
                      className="focus-ring flex size-6 items-center justify-center rounded-[4px] text-accent-hi hover:bg-hover"
                    >
                      <Check className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label="Cancel rename"
                      onClick={() => setEditingId(null)}
                      className="focus-ring flex size-6 items-center justify-center rounded-[4px] text-ws-secondary hover:bg-hover"
                    >
                      <X className="size-3.5" />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => openProject(p.id, p.name)}
                      title={p.name}
                      className={cn(
                        "focus-ring flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5 text-left text-[13px] transition-colors duration-150",
                        active
                          ? "text-foreground"
                          : "text-ws-secondary hover:text-foreground"
                      )}
                    >
                      <Folder
                        className={cn(
                          "size-3.5 shrink-0",
                          active ? "text-accent-hi" : "text-ws-disabled"
                        )}
                      />
                      <span className="truncate">{p.name}</span>
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          aria-label={`Actions for ${p.name}`}
                          className="focus-ring flex size-6 shrink-0 items-center justify-center rounded-[4px] text-ws-secondary opacity-0 transition-opacity hover:bg-hover hover:text-foreground group-hover:opacity-100 focus:opacity-100"
                        >
                          <MoreHorizontal className="size-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        sideOffset={4}
                        className="min-w-[150px] p-1 rounded-[10px] border border-ws-border bg-popover"
                      >
                        <DropdownMenuItem
                          onSelect={() => beginRename(p.id, p.name)}
                          className="text-[13px] rounded-[8px] px-2.5 py-2 focus:bg-hover"
                        >
                          <Pencil className="size-4 text-ws-secondary" />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() => handleClone(p.id)}
                          className="text-[13px] rounded-[8px] px-2.5 py-2 focus:bg-hover"
                        >
                          <Copy className="size-4 text-ws-secondary" />
                          Clone
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() => setDeleteId(p.id)}
                          className="text-[13px] rounded-[8px] px-2.5 py-2 text-red-400 focus:bg-hover"
                        >
                          <Trash2 className="size-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Artifacts section */}
      <ArtifactsSection />

      {/* Legacy collapsible */}
      <Collapsible open={legacyOpen} onOpenChange={setLegacyOpen} className="mt-1">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            aria-expanded={legacyOpen}
            className="focus-ring flex w-full items-center gap-1.5 rounded-[6px] px-2 py-1 text-[13px] text-ws-secondary transition-colors duration-150 hover:bg-hover hover:text-foreground"
          >
            <ChevronRight
              className={cn(
                "size-3.5 shrink-0 transition-transform duration-150",
                legacyOpen && "rotate-90"
              )}
            />
            <History className="size-3.5 shrink-0 text-ws-disabled" />
            <span>Legacy</span>
            <span className="ml-auto text-[12px] text-ws-disabled">
              {legacy.length}
            </span>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-0.5 flex flex-col gap-0.5">
            {legacy.map((l) => (
              <button
                key={l.id}
                type="button"
                className="focus-ring flex items-center rounded-[6px] px-2 py-1 text-left text-[13px] text-ws-secondary transition-colors duration-150 hover:bg-hover hover:text-foreground"
              >
                <span className="truncate">{l.title}</span>
              </button>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* hint pinned to bottom */}
      <div className="mt-auto px-2 pt-3 text-[11px] text-ws-disabled">
        Press{" "}
        <kbd className="rounded-[4px] border border-ws-border bg-card-ws px-1 py-0.5 font-mono text-[10px] text-ws-secondary">
          ⌘K
        </kbd>{" "}
        to search
      </div>

      {/* Delete confirmation */}
      <Dialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <DialogContent className="max-w-[400px] p-0 border border-ws-border bg-popover">
          <DialogHeader className="px-5 pt-5 pb-3">
            <DialogTitle className="text-[16px]">Delete project?</DialogTitle>
            <DialogDescription className="text-[12.5px] text-ws-secondary">
              This permanently removes{" "}
              <span className="text-foreground font-medium">
                {deleteTarget?.name}
              </span>{" "}
              and its workspace.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="px-5 py-3 border-t border-ws-border sm:flex-row sm:justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDeleteId(null)}
              className="text-ws-secondary hover:text-foreground hover:bg-hover"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={confirmDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              <Trash2 className="size-3.5" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  );
}

/* ---------- small internal helpers ---------- */

interface IconButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  "aria-label": string;
}

function IconButton({ children, onClick, "aria-label": ariaLabel }: IconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="focus-ring flex size-8 items-center justify-center rounded-[8px] text-ws-secondary transition-colors duration-150 hover:bg-hover hover:text-foreground"
    >
      {children}
    </button>
  );
}

interface MenuRowProps {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
}

function MenuRow({ icon: Icon, label, onClick }: MenuRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="focus-ring flex h-10 items-center gap-2.5 rounded-[8px] px-2.5 text-[15px] text-foreground transition-colors duration-150 hover:bg-hover"
    >
      <Icon className="size-4 shrink-0 text-ws-secondary" />
      <span className="truncate">{label}</span>
    </button>
  );
}

/* ---------- Artifacts section ---------- */

function fileIcon(mime: string): LucideIcon {
  if (mime.startsWith("image/")) return FileImage;
  if (mime.startsWith("video/")) return FileVideo;
  if (mime.startsWith("text/") || mime.includes("json") || mime.includes("javascript") || mime.includes("typescript"))
    return FileText;
  return File;
}

function ArtifactsSection() {
  const [open, setOpen] = useState(false);
  const conversations = useChatStore((s) => s.conversations);
  const projects = useProjectsStore((s) => s.projects);
  const openRightTab = useAppStore((s) => s.openRightTab);
  const setActiveTab = useAppStore((s) => s.setActiveTab);

  const artifacts = useMemo(() => {
    const items: { name: string; path: string; source: string; tabId?: string; mimeType: string }[] = [];
    // files from conversation workspaces
    for (const conv of Object.values(conversations)) {
      for (const f of conv.workspace.files) {
        items.push({ name: f.name, path: f.path, source: conv.title || "Chat", tabId: conv.tabId, mimeType: "" });
      }
      // attachments from messages
      for (const m of conv.messages) {
        if (m.attachments) {
          for (const a of m.attachments) {
            items.push({ name: a.name, path: a.name, source: conv.title || "Chat", tabId: conv.tabId, mimeType: a.mimeType });
          }
        }
      }
    }
    // files from project workspaces
    for (const p of projects) {
      for (const f of p.workspace.files) {
        items.push({ name: f.name, path: f.path, source: p.name, mimeType: "" });
      }
    }
    return items.slice(0, 30); // cap at 30 for the sidebar
  }, [conversations, projects]);

  if (artifacts.length === 0) return null;

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="mt-1">
      <CollapsibleTrigger asChild>
        <button
          type="button"
          aria-expanded={open}
          className="focus-ring flex w-full items-center gap-1.5 rounded-[6px] px-2 py-1 text-[13px] text-ws-secondary transition-colors duration-150 hover:bg-hover hover:text-foreground"
        >
          <ChevronRight
            className={cn(
              "size-3.5 shrink-0 transition-transform duration-150",
              open && "rotate-90"
            )}
          />
          <FileText className="size-3.5 shrink-0 text-ws-disabled" />
          <span>Artifacts</span>
          <span className="ml-auto text-[12px] text-ws-disabled">
            {artifacts.length}
          </span>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-0.5 ws-scroll flex max-h-[200px] flex-col gap-0.5 overflow-y-auto">
          {artifacts.map((a, i) => {
            const Icon = a.mimeType ? fileIcon(a.mimeType) : FileText;
            return (
              <button
                key={`${a.source}-${a.path}-${i}`}
                type="button"
                title={`${a.source} — ${a.path}`}
                onClick={() => {
                  if (a.tabId) {
                    setActiveTab(a.tabId);
                    openRightTab("files");
                  }
                }}
                className="focus-ring flex items-center gap-1.5 rounded-[6px] px-2 py-1 text-left text-[12px] text-ws-secondary transition-colors duration-150 hover:bg-hover hover:text-foreground"
              >
                <Icon className="size-3 shrink-0 text-ws-disabled" />
                <span className="truncate">{a.name}</span>
              </button>
            );
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
