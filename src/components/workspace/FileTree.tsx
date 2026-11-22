"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, File, Folder } from "lucide-react";
import type { FileNode } from "@/lib/types";
import { cn } from "@/lib/utils";

interface FileTreeProps {
  files: FileNode[];
  selectedPath?: string;
  onSelect: (path: string) => void;
}

interface TreeNode {
  name: string;
  path: string;
  dir: boolean;
  children: Map<string, TreeNode>;
  file?: FileNode;
}

function buildTree(files: FileNode[]): TreeNode {
  const root: TreeNode = {
    name: "",
    path: "",
    dir: true,
    children: new Map(),
  };

  for (const f of files) {
    const parts = f.path.split("/").filter(Boolean);
    if (parts.length === 0) continue;
    let cur = root;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLeaf = i === parts.length - 1;
      const childPath = parts.slice(0, i + 1).join("/");
      let child = cur.children.get(part);
      if (!child) {
        child = {
          name: part,
          path: childPath,
          dir: !isLeaf ? true : f.type === "dir",
          children: new Map(),
          file: isLeaf && f.type === "file" ? f : undefined,
        };
        cur.children.set(part, child);
      } else if (isLeaf && f.type === "file" && !child.file) {
        child.file = f;
      }
      cur = child;
    }
  }
  return root;
}

function sortNodes(nodes: TreeNode[]): TreeNode[] {
  return nodes.sort((a, b) => {
    if (a.dir !== b.dir) return a.dir ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

function statusClass(status?: FileNode["status"]): string {
  switch (status) {
    case "added":
      return "text-accent-hi";
    case "modified":
      return "text-streak";
    case "deleted":
      return "line-through text-ws-disabled";
    default:
      return "text-foreground";
  }
}

interface RowProps {
  node: TreeNode;
  depth: number;
  selectedPath?: string;
  onSelect: (path: string) => void;
  expanded: Set<string>;
  toggle: (path: string) => void;
}

function Row({
  node,
  depth,
  selectedPath,
  onSelect,
  expanded,
  toggle,
}: RowProps) {
  const isOpen = expanded.has(node.path);
  const indentStyle = { paddingLeft: `${depth * 12 + 4}px` };

  if (node.dir) {
    const children = sortNodes(Array.from(node.children.values()));
    return (
      <div>
        <button
          type="button"
          onClick={() => toggle(node.path)}
          style={indentStyle}
          className="w-full text-[13px] px-1 py-1 rounded-[6px] hover:bg-hover cursor-pointer flex items-center gap-1.5 focus-ring text-foreground transition-colors duration-150"
        >
          {isOpen ? (
            <ChevronDown className="size-4 text-ws-secondary shrink-0" />
          ) : (
            <ChevronRight className="size-4 text-ws-secondary shrink-0" />
          )}
          <Folder className="size-4 text-ws-secondary shrink-0" />
          <span className="truncate">{node.name}</span>
        </button>
        {isOpen &&
          children.map((c) => (
            <Row
              key={c.path}
              node={c}
              depth={depth + 1}
              selectedPath={selectedPath}
              onSelect={onSelect}
              expanded={expanded}
              toggle={toggle}
            />
          ))}
      </div>
    );
  }

  const selected = selectedPath === node.path;
  const file = node.file;
  return (
    <button
      type="button"
      onClick={() => onSelect(node.path)}
      style={indentStyle}
      className={cn(
        "w-full text-[13px] px-1 py-1 rounded-[6px] cursor-pointer flex items-center gap-1.5 focus-ring transition-colors duration-150",
        selected ? "bg-hover" : "hover:bg-hover"
      )}
    >
      <span className="size-4 shrink-0" aria-hidden="true" />
      <File
        className={cn(
          "size-3.5 shrink-0",
          file?.status === "deleted" ? "text-ws-disabled" : "text-ws-secondary"
        )}
      />
      <span className={cn("truncate", statusClass(file?.status))}>
        {node.name}
      </span>
    </button>
  );
}

export function FileTree({ files, selectedPath, onSelect }: FileTreeProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const root = useMemo(() => buildTree(files), [files]);
  const top = useMemo(() => sortNodes(Array.from(root.children.values())), [root]);

  if (top.length === 0) {
    return (
      <div className="text-[12px] text-ws-disabled px-2 py-3">No files</div>
    );
  }

  return (
    <div className="flex flex-col">
      {top.map((node) => (
        <Row
          key={node.path}
          node={node}
          depth={0}
          selectedPath={selectedPath}
          onSelect={onSelect}
          expanded={expanded}
          toggle={toggle}
        />
      ))}
    </div>
  );
}
