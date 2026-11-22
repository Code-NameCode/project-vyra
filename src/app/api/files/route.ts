import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { consumeApproval, createApproval } from "@/lib/security/approvals";
import { assertWorkspacePath, relativeWorkspacePath, WorkspacePolicyError } from "@/lib/security/workspace";
import { atomicWrite } from "@/lib/server/file-transactions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errorResponse(error: unknown) {
  if (error instanceof WorkspacePolicyError) return NextResponse.json({ error: error.message, code: error.code }, { status: 403 });
  return NextResponse.json({ error: error instanceof Error ? error.message : "Filesystem operation failed" }, { status: 400 });
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const target = await assertWorkspacePath(url.searchParams.get("path") || ".", { allowRoot: true });
    const stat = await fs.stat(target);
    if (stat.isDirectory()) {
      const entries = await fs.readdir(target, { withFileTypes: true });
      return NextResponse.json({ path: relativeWorkspacePath(target), type: "dir", entries: entries.map((entry) => ({ name: entry.name, type: entry.isDirectory() ? "dir" : "file" })).sort((a, b) => a.type === b.type ? a.name.localeCompare(b.name) : a.type === "dir" ? -1 : 1) });
    }
    if (stat.size > 2_000_000) return NextResponse.json({ error: "File exceeds the 2 MB preview limit" }, { status: 413 });
    return NextResponse.json({ path: relativeWorkspacePath(target), type: "file", content: await fs.readFile(target, "utf8") });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { action?: string; path?: string; content?: string; newPath?: string; approvalId?: string; expectedHash?: string | null };
    const action = body.action || "";
    const target = await assertWorkspacePath(body.path);
    const destructive = action === "delete";
    const approvalInput = { path: relativeWorkspacePath(target), newPath: body.newPath, content: body.content };
    const consumed = await consumeApproval(body.approvalId, action, approvalInput);
    if (!consumed) {
      const request = await createApproval({ tool: "filesystem", level: destructive ? "destructive" : "write", action, description: `${action} ${relativeWorkspacePath(target)}`, input: approvalInput });
      return NextResponse.json({ requiresApproval: true, approval: request }, { status: 202 });
    }

    if (action === "write") {
      if (typeof body.content !== "string") return NextResponse.json({ error: "content is required" }, { status: 400 });
      await atomicWrite(target, body.content, body.expectedHash);
    } else if (action === "mkdir") {
      await fs.mkdir(target, { recursive: true });
    } else if (action === "delete") {
      await fs.rm(target, { recursive: true, force: false });
    } else if (action === "rename") {
      const next = await assertWorkspacePath(body.newPath);
      await fs.rename(target, next);
    } else {
      return NextResponse.json({ error: "Unsupported file action" }, { status: 400 });
    }
    return NextResponse.json({ ok: true, path: relativeWorkspacePath(target) });
  } catch (error) {
    return errorResponse(error);
  }
}
