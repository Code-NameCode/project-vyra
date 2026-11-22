import fs from "node:fs/promises";
import path from "node:path";

export type ApprovalLevel = "read" | "write" | "terminal" | "destructive" | "external";

export class WorkspacePolicyError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "WorkspacePolicyError";
    this.code = code;
  }
}

function configuredRoot(): string {
  const value = process.env.VYRA_WORKSPACE_ROOT?.trim();
  return path.resolve(value || process.cwd());
}

export async function getWorkspaceRoot(): Promise<string> {
  const root = configuredRoot();
  await fs.mkdir(root, { recursive: true });
  return root;
}

function isInside(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return relative === "" || (relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

/** Resolve a user supplied path without allowing traversal or symlink escapes. */
export async function resolveWorkspacePath(input: string | undefined, options?: { allowRoot?: boolean }): Promise<string> {
  const root = await getWorkspaceRoot();
  const raw = (input || ".").trim();
  const candidate = path.resolve(root, raw);
  if (!isInside(root, candidate) || (!options?.allowRoot && candidate === root)) {
    throw new WorkspacePolicyError("WORKSPACE_BOUNDARY", "Path must remain inside the configured workspace root.");
  }

  const existing = await fs.realpath(candidate).catch(() => null);
  if (existing && !isInside(root, existing)) {
    throw new WorkspacePolicyError("WORKSPACE_SYMLINK", "Symlink escapes are not allowed.");
  }
  return candidate;
}

export async function assertWorkspacePath(input: string | undefined, options?: { allowRoot?: boolean }): Promise<string> {
  const resolved = await resolveWorkspacePath(input, options);
  const root = await getWorkspaceRoot();
  if (!isInside(root, resolved)) throw new WorkspacePolicyError("WORKSPACE_BOUNDARY", "Path is outside the workspace.");
  return resolved;
}

export function approvalRequired(level: ApprovalLevel): boolean {
  return level !== "read";
}

export function relativeWorkspacePath(absolutePath: string): string {
  return path.relative(configuredRoot(), absolutePath) || ".";
}
