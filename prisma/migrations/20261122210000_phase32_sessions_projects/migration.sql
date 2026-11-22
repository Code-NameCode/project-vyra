-- Phase 3.2: persistent sessions, project metadata, and execution ownership.
-- All additions are nullable or have defaults so existing Phase 3.1 data is preserved.
-- Repair databases where the Phase 3.1 migration was recorded as applied after
-- creating runtime tables but omitted LocalProfile.
CREATE TABLE IF NOT EXISTS "LocalProfile" ("id" TEXT NOT NULL PRIMARY KEY, "name" TEXT, "workspaceRoot" TEXT NOT NULL, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL);
ALTER TABLE "LocalProfile" ADD COLUMN "activeProjectId" TEXT;
ALTER TABLE "ProjectRecord" ADD COLUMN "description" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ProjectRecord" ADD COLUMN "icon" TEXT NOT NULL DEFAULT 'folder';
ALTER TABLE "ProjectRecord" ADD COLUMN "archivedAt" DATETIME;
ALTER TABLE "ProjectRecord" ADD COLUMN "defaultProviderId" TEXT;
ALTER TABLE "ProjectRecord" ADD COLUMN "defaultModelId" TEXT;
ALTER TABLE "ConversationRecord" ADD COLUMN "titleSource" TEXT NOT NULL DEFAULT 'auto';
ALTER TABLE "ConversationRecord" ADD COLUMN "pinnedAt" DATETIME;
ALTER TABLE "ConversationRecord" ADD COLUMN "archivedAt" DATETIME;
ALTER TABLE "ConversationRecord" ADD COLUMN "deletedAt" DATETIME;
ALTER TABLE "ExecutionRecord" ADD COLUMN "conversationId" TEXT;
CREATE INDEX "ConversationRecord_updatedAt_archivedAt_idx" ON "ConversationRecord"("updatedAt", "archivedAt");
CREATE INDEX "ConversationRecord_pinnedAt_updatedAt_idx" ON "ConversationRecord"("pinnedAt", "updatedAt");
CREATE INDEX "ExecutionRecord_conversationId_createdAt_idx" ON "ExecutionRecord"("conversationId", "createdAt");
CREATE INDEX "ExecutionRecord_projectId_createdAt_idx" ON "ExecutionRecord"("projectId", "createdAt");
