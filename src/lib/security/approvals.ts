import { uid } from "@/lib/id";
import { approvalRepository } from "@/lib/server/repositories";
import type { ApprovalLevel } from "./workspace";

export type ApprovalStatus = "pending" | "approved" | "rejected" | "expired" | "executed" | "failed" | "cancelled";

export interface ApprovalRequest {
  id: string;
  executionId?: string;
  tool: string;
  level: ApprovalLevel;
  action: string;
  description: string;
  input: Record<string, unknown>;
  status: ApprovalStatus;
  createdAt: number;
  expiresAt: number;
  resolvedAt?: number;
}

const TTL_MS = 10 * 60 * 1000;

function fromRow(row: { id: string; executionId: string | null; level: string; action: string; input: string; status: string; createdAt: Date; resolvedAt: Date | null }): ApprovalRequest {
  let input: Record<string, unknown> = {};
  try { input = JSON.parse(row.input) as Record<string, unknown>; } catch { /* preserve malformed records as empty */ }
  const createdAt = row.createdAt.getTime();
  return { id: row.id, executionId: row.executionId ?? undefined, tool: row.action, level: row.level as ApprovalLevel, action: row.action, description: row.action, input, status: row.status as ApprovalStatus, createdAt, expiresAt: createdAt + TTL_MS, resolvedAt: row.resolvedAt?.getTime() };
}

export async function createApproval(input: { executionId?: string; tool: string; level: ApprovalLevel; action: string; description: string; input: Record<string, unknown> }): Promise<ApprovalRequest> {
  const id = uid("approval");
  const row = await approvalRepository.create({ id, executionId: input.executionId, level: input.level, action: input.action, input: JSON.stringify(input.input), status: "pending" });
  return fromRow(row);
}

export async function listApprovals(status?: ApprovalStatus): Promise<ApprovalRequest[]> {
  const rows = await approvalRepository.list(status);
  const now = Date.now();
  await Promise.all(rows.filter((row) => row.status === "pending" && row.createdAt.getTime() + TTL_MS <= now).map((row) => approvalRepository.transition(row.id, "expired")));
  return rows.map(fromRow).map((item) => item.status === "pending" && item.expiresAt <= now ? { ...item, status: "expired" as const } : item);
}

export async function getApproval(id: string): Promise<ApprovalRequest | null> {
  const row = await approvalRepository.get(id);
  if (!row) return null;
  if (row.status === "pending" && row.createdAt.getTime() + TTL_MS <= Date.now()) {
    await approvalRepository.transition(id, "expired");
    return { ...fromRow(row), status: "expired" };
  }
  return fromRow(row);
}

export async function resolveApproval(id: string, status: "approved" | "rejected"): Promise<ApprovalRequest | null> {
  const current = await getApproval(id);
  if (!current || current.status !== "pending") return null;
  const result = await approvalRepository.transition(id, status);
  if (result.count !== 1) return null;
  return getApproval(id);
}

export async function consumeApproval(id: string | undefined, action: string, input: Record<string, unknown>, executionId?: string): Promise<ApprovalRequest | null> {
  if (!id) return null;
  const current = await getApproval(id);
  if (!current || current.status !== "approved" || current.action !== action || (current.executionId && current.executionId !== executionId) || stable(current.input) !== stable(input)) return null;
  const result = await approvalRepository.transition(id, "executed");
  return result.count === 1 ? { ...current, status: "executed", resolvedAt: Date.now() } : null;
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).sort().join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`).join(",")}}`;
  return JSON.stringify(value);
}
