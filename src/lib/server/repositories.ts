import type { Prisma, PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";

export type DbClient = PrismaClient | Prisma.TransactionClient;

export function withTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  return db.$transaction(fn);
}

export const profileRepository = {
  getOrCreate: async (workspaceRoot: string, name = "Local profile") => {
    const existing = await db.localProfile.findFirst({ where: { workspaceRoot }, orderBy: { createdAt: "asc" } });
    return existing ?? db.localProfile.create({ data: { workspaceRoot, name } });
  },
  updateWorkspaceRoot: (id: string, workspaceRoot: string) => db.localProfile.update({ where: { id }, data: { workspaceRoot } }),
};

export const projectRepository = {
  list: (profileId: string, skip = 0, take = 50, options?: { query?: string; includeArchived?: boolean; sort?: "recent" | "created" }) => db.projectRecord.findMany({
    where: { profileId, ...(options?.includeArchived ? {} : { archivedAt: null }), ...(options?.query ? { name: { contains: options.query } } : {}) },
    orderBy: options?.sort === "created" ? { createdAt: "desc" } : { updatedAt: "desc" }, skip, take,
    include: { _count: { select: { conversations: true, executions: true, changes: true } } },
  }),
  get: (id: string) => db.projectRecord.findUnique({ where: { id }, include: { conversations: { where: { deletedAt: null }, orderBy: { updatedAt: "desc" }, take: 50 }, _count: { select: { conversations: true, executions: true, changes: true } } } }),
  getForProfile: (id: string, profileId: string) => db.projectRecord.findFirst({ where: { id, profileId }, include: { _count: { select: { conversations: true, executions: true, changes: true } } } }),
  overview: async (id: string, profileId: string, limit = 10) => {
    const project = await db.projectRecord.findFirst({ where: { id, profileId }, include: { _count: { select: { conversations: true, executions: true, changes: true } } } });
    if (!project) return null;
    const [recentSessions, recentExecutions, recentChanges] = await Promise.all([
      db.conversationRecord.findMany({ where: { projectId: id, deletedAt: null }, orderBy: { updatedAt: "desc" }, take: limit, select: { id: true, title: true, modelId: true, updatedAt: true, pinnedAt: true, archivedAt: true } }),
      db.executionRecord.findMany({ where: { projectId: id }, orderBy: { createdAt: "desc" }, take: limit, select: { id: true, conversationId: true, status: true, request: true, createdAt: true, completedAt: true } }),
      db.fileChangeRecord.findMany({ where: { projectId: id }, orderBy: { createdAt: "desc" }, take: limit, select: { id: true, executionId: true, path: true, status: true, operationStatus: true, beforeHash: true, afterHash: true, createdAt: true, diff: true } }),
    ]);
    return { project, stats: project._count, recentSessions, recentExecutions, recentChanges, currentExecution: recentExecutions.find((execution) => ["queued", "running"].includes(execution.status)) ?? null };
  },
  upsert: (data: Prisma.ProjectRecordUncheckedCreateInput) => db.projectRecord.upsert({ where: { id: data.id }, create: data, update: { name: data.name, description: data.description, icon: data.icon, directory: data.directory, instructions: data.instructions, memory: data.memory, archivedAt: data.archivedAt, defaultProviderId: data.defaultProviderId, defaultModelId: data.defaultModelId } }),
  update: (id: string, data: Prisma.ProjectRecordUpdateInput) => db.projectRecord.update({ where: { id }, data }),
  archive: (id: string, archived: boolean) => db.projectRecord.update({ where: { id }, data: { archivedAt: archived ? new Date() : null } }),
  remove: (id: string) => db.projectRecord.delete({ where: { id } }),
};

export const conversationRepository = {
  list: (projectId: string | null, skip = 0, take = 50, options?: { includeArchived?: boolean; query?: string; sort?: "recent" | "created" }) => db.conversationRecord.findMany({ where: { projectId, deletedAt: null, ...(options?.includeArchived ? {} : { archivedAt: null }), ...(options?.query ? { OR: [{ title: { contains: options.query } }, { messages: { some: { content: { contains: options.query } } } }] } : {}) }, orderBy: options?.sort === "created" ? { createdAt: "desc" } : { updatedAt: "desc" }, skip, take, include: { messages: { orderBy: { createdAt: "desc" }, take: 1 }, _count: { select: { messages: true, executions: true } } } }),
  listAll: async (profileId: string, skip = 0, take = 50, options?: { includeArchived?: boolean; query?: string; sort?: "recent" | "created"; projectId?: string }) => db.conversationRecord.findMany({ where: { project: { profileId }, deletedAt: null, ...(options?.projectId ? { projectId: options.projectId } : {}), ...(options?.includeArchived ? {} : { archivedAt: null }), ...(options?.query ? { OR: [{ title: { contains: options.query } }, { messages: { some: { content: { contains: options.query } } } }] } : {}) }, include: { messages: { orderBy: { createdAt: "desc" }, take: 2 }, _count: { select: { messages: true, executions: true } } }, orderBy: options?.sort === "created" ? { createdAt: "desc" } : { updatedAt: "desc" }, skip, take }),
  get: (id: string) => db.conversationRecord.findUnique({ where: { id }, include: { messages: { orderBy: { createdAt: "asc" } }, executions: { orderBy: { createdAt: "desc" }, include: { eventsLog: { orderBy: { sequence: "asc" } }, changes: { orderBy: { createdAt: "asc" } } } } } }),
  messages: (id: string, skip = 0, take = 100) => db.messageRecord.findMany({ where: { conversationId: id }, orderBy: { createdAt: "asc" }, skip, take }),
  upsert: (data: Prisma.ConversationRecordUncheckedCreateInput) => db.conversationRecord.upsert({ where: { id: data.id }, create: data, update: { projectId: data.projectId, title: data.title, titleSource: data.titleSource, modelId: data.modelId } }),
  update: (id: string, data: Prisma.ConversationRecordUpdateInput) => db.conversationRecord.update({ where: { id }, data }),
  archive: (id: string, archived: boolean) => db.conversationRecord.update({ where: { id }, data: { archivedAt: archived ? new Date() : null } }),
  remove: (id: string) => db.conversationRecord.delete({ where: { id } }),
  appendMessage: async (data: Prisma.MessageRecordUncheckedCreateInput) => {
    const message = await db.messageRecord.upsert({ where: { id: data.id }, create: data, update: { role: data.role, content: data.content } });
    await db.conversationRecord.update({ where: { id: data.conversationId }, data: { updatedAt: new Date() } });
    return message;
  },
};

export const providerRepository = {
  list: (profileId: string) => db.providerRecord.findMany({ where: { profileId }, orderBy: { createdAt: "asc" } }),
  upsert: (data: Prisma.ProviderRecordUncheckedCreateInput) => db.providerRecord.upsert({ where: { id: data.id }, create: data, update: { name: data.name, type: data.type, baseUrl: data.baseUrl, encryptedKey: data.encryptedKey, enabled: data.enabled, capabilities: data.capabilities } }),
  remove: (id: string) => db.providerRecord.delete({ where: { id } }),
};

export const executionRepository = {
  create: (data: Prisma.ExecutionRecordUncheckedCreateInput) => db.executionRecord.create({ data }),
  get: (id: string) => db.executionRecord.findUnique({ where: { id }, include: { eventsLog: { orderBy: { sequence: "asc" } }, changes: { orderBy: { createdAt: "asc" } }, conversation: { select: { id: true, title: true } } } }),
  update: (id: string, data: Prisma.ExecutionRecordUpdateInput) => db.executionRecord.update({ where: { id }, data }),
  appendEvent: async (executionId: string, type: string, payload: unknown) => {
    const last = await db.executionEventRecord.findFirst({ where: { executionId }, orderBy: { sequence: "desc" }, select: { sequence: true } });
    return db.executionEventRecord.create({ data: { id: `${executionId}:${(last?.sequence ?? 0) + 1}`, executionId, type, payload: JSON.stringify(payload), sequence: (last?.sequence ?? 0) + 1 } });
  },
  markUnfinishedInterrupted: (profileId: string) => db.executionRecord.updateMany({
    where: { profileId, status: { in: ["queued", "running"] } },
    data: { status: "interrupted" },
  }),
  eventsAfter: (executionId: string, cursor = 0, take = 500) => db.executionEventRecord.findMany({
    where: { executionId, sequence: { gt: cursor } },
    orderBy: { sequence: "asc" },
    take,
  }),
  latestSequence: async (executionId: string) => (await db.executionEventRecord.findFirst({ where: { executionId }, orderBy: { sequence: "desc" }, select: { sequence: true } }))?.sequence ?? 0,
  list: (profileId: string, skip = 0, take = 50, options?: { projectId?: string; conversationId?: string; status?: string }) => db.executionRecord.findMany({ where: { profileId, ...(options?.projectId ? { projectId: options.projectId } : {}), ...(options?.conversationId ? { conversationId: options.conversationId } : {}), ...(options?.status ? { status: options.status } : {}) }, orderBy: { createdAt: "desc" }, skip, take, include: { conversation: { select: { id: true, title: true } }, changes: { select: { id: true, path: true, status: true } } } }),
};

export const approvalRepository = {
  create: (data: Prisma.ApprovalRecordUncheckedCreateInput) => db.approvalRecord.create({ data }),
  get: (id: string) => db.approvalRecord.findUnique({ where: { id } }),
  list: (status?: string, skip = 0, take = 100) => db.approvalRecord.findMany({ where: status ? { status } : undefined, orderBy: { createdAt: "desc" }, skip, take }),
  transition: (id: string, status: string, resolvedAt = new Date()) => db.approvalRecord.updateMany({ where: { id, status: "pending" }, data: { status, resolvedAt } }),
};

export const fileChangeRepository = {
  create: (data: Prisma.FileChangeRecordUncheckedCreateInput) => db.fileChangeRecord.create({ data }),
  listForExecution: (executionId: string) => db.fileChangeRecord.findMany({ where: { executionId }, orderBy: { createdAt: "asc" } }),
  listForProject: (projectId: string, skip = 0, take = 100) => db.fileChangeRecord.findMany({ where: { projectId }, orderBy: { createdAt: "desc" }, skip, take, include: { execution: { select: { id: true, conversationId: true, status: true, createdAt: true } } } }),
  get: (id: string) => db.fileChangeRecord.findUnique({ where: { id } }),
  updateStatus: (id: string, status: string) => db.fileChangeRecord.update({ where: { id }, data: { status } }),
};

export const migrationRepository = {
  get: (source: string, version: string) => db.migrationRecord.findUnique({ where: { source_version: { source, version } } }),
  create: (data: Prisma.MigrationRecordUncheckedCreateInput) => db.migrationRecord.create({ data }),
  complete: (id: string, status: string, report: unknown) => db.migrationRecord.update({ where: { id }, data: { status, report: JSON.stringify(report), completedAt: new Date() } }),
};

export async function databaseHealth() {
  const started = Date.now();
  try {
    await db.$queryRaw`SELECT 1`;
    return { ok: true, latencyMs: Date.now() - started };
  } catch (error) {
    return { ok: false, latencyMs: Date.now() - started, error: error instanceof Error ? error.message : "Database unavailable" };
  }
}
