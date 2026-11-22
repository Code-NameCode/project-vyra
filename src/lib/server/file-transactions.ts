import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { uid } from "@/lib/id";
import { fileChangeRepository } from "@/lib/server/repositories";

export class FileConflictError extends Error { code = "FILE_CONFLICT"; }
const locks = new Map<string, Promise<void>>();

async function withPathLock<T>(filePath: string, fn: () => Promise<T>): Promise<T> {
  const previous = locks.get(filePath) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => { release = resolve; });
  const queued = previous.then(() => current);
  locks.set(filePath, queued);
  await previous;
  try { return await fn(); } finally { release(); if (locks.get(filePath) === queued) locks.delete(filePath); }
}

function unifiedDiff(filePath: string, before: string, after: string): string {
  const a = before.split(/\r?\n/); const b = after.split(/\r?\n/);
  const rows: string[] = [`--- ${filePath}`, `+++ ${filePath}`];
  const max = Math.max(a.length, b.length);
  for (let i = 0; i < max; i++) {
    if (a[i] === b[i]) rows.push(` ${a[i] ?? ""}`);
    else { if (a[i] !== undefined) rows.push(`-${a[i]}`); if (b[i] !== undefined) rows.push(`+${b[i]}`); }
  }
  return rows.join("\n");
}

export async function fileHash(filePath: string): Promise<string | null> {
  try { return createHash("sha256").update(await fs.readFile(filePath)).digest("hex"); }
  catch { return null; }
}

function snapshotRoot() { return path.join(process.env.VYRA_DATA_DIR || path.join(process.cwd(), ".vyra"), "snapshots"); }

export async function atomicWrite(filePath: string, content: string, expectedHash?: string | null, metadata?: { executionId?: string; projectId?: string; tool?: string; approvalId?: string; groupId?: string }) {
  return withPathLock(filePath, async () => {
    const currentHash = await fileHash(filePath);
    if (expectedHash !== undefined && currentHash !== expectedHash) throw new FileConflictError("The file changed since it was inspected; refusing to overwrite it.");
    const original = await fs.readFile(filePath).catch(() => null);
    const snapshotId = `${Date.now()}-${createHash("sha1").update(filePath).digest("hex").slice(0, 12)}`;
    await fs.mkdir(snapshotRoot(), { recursive: true });
    const originalSnapshot = original ? `${snapshotId}.original` : undefined;
    if (original) await fs.writeFile(path.join(snapshotRoot(), originalSnapshot!), original, { mode: 0o600 });
    const temp = `${filePath}.vyra-${process.pid}-${Date.now()}.tmp`;
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(temp, content, "utf8");
    const beforeCommitHash = await fileHash(filePath);
    if (beforeCommitHash !== currentHash) { await fs.rm(temp, { force: true }); throw new FileConflictError("The file changed before the transaction could commit."); }
    await fs.rename(temp, filePath);
    const modifiedSnapshot = `${snapshotId}.modified`;
    await fs.writeFile(path.join(snapshotRoot(), modifiedSnapshot), content, { mode: 0o600 });
    const afterHash = await fileHash(filePath);
    if (metadata?.projectId) await fileChangeRepository.create({ id: uid("change"), projectId: metadata.projectId, executionId: metadata.executionId, tool: metadata.tool || "write_file", approvalId: metadata.approvalId, groupId: metadata.groupId, path: filePath, status: "modified", beforeHash: currentHash, afterHash, originalSnapshot, modifiedSnapshot, diff: unifiedDiff(filePath, original?.toString("utf8") || "", content), operationStatus: "committed" });
    return { snapshotId, beforeHash: currentHash, afterHash, originalSnapshot, modifiedSnapshot };
  });
}

export async function rollbackFileChange(change: { path: string; afterHash: string | null; originalSnapshot: string | null; modifiedSnapshot: string | null }) {
  if (!change.originalSnapshot) throw new FileConflictError("No original snapshot is available for this change.");
  return withPathLock(change.path, async () => {
    const currentHash = await fileHash(change.path);
    if (currentHash !== change.afterHash) throw new FileConflictError("The file changed after the recorded transaction; rollback was refused.");
    const original = await fs.readFile(path.join(snapshotRoot(), change.originalSnapshot!), "utf8");
    const temp = `${change.path}.vyra-rollback-${process.pid}-${Date.now()}.tmp`;
    await fs.writeFile(temp, original, "utf8");
    if (await fileHash(change.path) !== change.afterHash) { await fs.rm(temp, { force: true }); throw new FileConflictError("The file changed immediately before rollback commit."); }
    await fs.rename(temp, change.path);
    return { restoredHash: await fileHash(change.path) };
  });
}
