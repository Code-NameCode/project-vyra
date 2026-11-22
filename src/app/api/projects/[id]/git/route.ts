import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { profileRepository, projectRepository } from "@/lib/server/repositories";
import { assertWorkspacePath, getWorkspaceRoot, WorkspacePolicyError } from "@/lib/security/workspace";

const execFileAsync = promisify(execFile);
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await profileRepository.getOrCreate(process.env.VYRA_WORKSPACE_ROOT || process.cwd());
  const project = await projectRepository.getForProfile(id, profile.id);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  const root = await getWorkspaceRoot();
  let directory: string;
  try {
    directory = await assertWorkspacePath(project.directory, { allowRoot: true });
    // Second guard at the exec sink: git's cwd must canonically resolve inside
    // the workspace root, catching symlinked or re-rooted project directories.
    const canonical = await fs.realpath(directory).catch(() => null);
    if (canonical) {
      const relative = path.relative(root, canonical);
      if (relative.startsWith("..") || path.isAbsolute(relative)) {
        return NextResponse.json({ available: false, error: "Project directory escapes the workspace.", code: "WORKSPACE_BOUNDARY" }, { status: 403 });
      }
      directory = canonical;
    }
  } catch (error) {
    if (error instanceof WorkspacePolicyError) return NextResponse.json({ available: false, error: error.message, code: error.code }, { status: 403 });
    throw error;
  }
  try {
    const [{ stdout: status }, { stdout: branch }] = await Promise.all([
      execFileAsync("git", ["status", "--short"], { cwd: directory, windowsHide: true }),
      execFileAsync("git", ["branch", "--show-current"], { cwd: directory, windowsHide: true }),
    ]);
    return NextResponse.json({ available: true, branch: branch.trim() || "(detached)", files: status.split(/\r?\n/).filter(Boolean).map((line) => ({ status: line.slice(0, 2).trim(), path: line.slice(3) })) });
  } catch {
    return NextResponse.json({ available: false, reason: "NOT_A_GIT_REPOSITORY" });
  }
}
