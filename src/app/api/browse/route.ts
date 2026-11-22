import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { assertWorkspacePath, WorkspacePolicyError } from "@/lib/security/workspace";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const input = (url.searchParams.get("path") || "").trim();
  const target = input || ".";
  try {
    const resolved = await assertWorkspacePath(target, { allowRoot: true });
    const entries = await fs.readdir(resolved, { withFileTypes: true });
    const list = entries
      .map((e) => ({
        name: e.name,
        type: e.isDirectory() ? "dir" : "file",
        path: path.join(resolved, e.name),
      }))
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
    const parent = path.dirname(resolved);
    return NextResponse.json({
      current: resolved,
      parent: parent !== resolved ? parent : null,
      entries: list,
      error: null,
    });
  } catch (e) {
    return NextResponse.json({
      current: target,
      parent: null,
      entries: [],
      error: e instanceof Error ? e.message : "Unable to read directory",
      code: e instanceof WorkspacePolicyError ? e.code : undefined,
    }, { status: e instanceof WorkspacePolicyError ? 403 : 200 });
  }
}
