"use client";

import { useState } from "react";
import type { Conversation } from "@/lib/types";
import { FileTree } from "../FileTree";
import { DocumentViewer } from "../DocumentViewer";

interface FilesViewProps {
  conv?: Conversation;
  onUpdateFile?: (path: string, content: string) => void;
}

export function FilesView({ conv, onUpdateFile }: FilesViewProps) {
  const files = conv?.workspace.files ?? [];
  const [selectedPath, setSelectedPath] = useState<string | undefined>(
    undefined
  );

  const effectivePath =
    selectedPath && files.some((f) => f.path === selectedPath)
      ? selectedPath
      : files[0]?.path;
  const selected = files.find((f) => f.path === effectivePath);

  if (files.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
        <span className="text-[13px] text-ws-secondary">No files yet</span>
        <span className="mt-1 text-[12px] text-ws-disabled">
          Files the agent creates will appear here.
        </span>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-1">
      <div className="w-[180px] shrink-0 overflow-y-auto ws-scroll border-r border-ws-border p-2">
        <FileTree
          files={files}
          selectedPath={effectivePath}
          onSelect={setSelectedPath}
        />
      </div>
      <DocumentViewer
        code={selected?.content}
        language={selected?.language}
        filename={selected?.name}
        onChange={
          onUpdateFile && selected
            ? (content) => onUpdateFile(selected.path, content)
            : undefined
        }
      />
    </div>
  );
}