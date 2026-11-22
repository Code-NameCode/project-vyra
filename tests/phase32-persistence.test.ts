import { afterAll, describe, expect, test } from "bun:test";
import { db } from "../src/lib/db";
import { conversationRepository, executionRepository, profileRepository, projectRepository } from "../src/lib/server/repositories";

const suffix = `phase32-test-${Date.now()}`;
let projectId = "";
let conversationId = "";

describe("Phase 3.2 persistence", () => {
  test("persists a project, one session, ordered messages, and multiple executions", async () => {
    const profile = await profileRepository.getOrCreate(process.env.VYRA_WORKSPACE_ROOT || process.cwd());
    projectId = `project-${suffix}`;
    conversationId = `conversation-${suffix}`;
    await projectRepository.upsert({ id: projectId, profileId: profile.id, name: "Phase 3.2 test", description: "test", icon: "folder", directory: process.cwd(), instructions: "", memory: "" });
    await conversationRepository.upsert({ id: conversationId, projectId, title: "Build a durable session", titleSource: "auto", modelId: "test-model" });
    await conversationRepository.appendMessage({ id: `message-1-${suffix}`, conversationId, role: "user", content: "First request" });
    await conversationRepository.appendMessage({ id: `message-2-${suffix}`, conversationId, role: "assistant", content: "First response" });
    await executionRepository.create({ id: `execution-1-${suffix}`, profileId: profile.id, projectId, conversationId, status: "completed", request: "{}" });
    await executionRepository.create({ id: `execution-2-${suffix}`, profileId: profile.id, projectId, conversationId, status: "failed", request: "{}" });

    const restored = await conversationRepository.get(conversationId);
    expect(restored?.messages.map((message) => message.content)).toEqual(["First request", "First response"]);
    expect(restored?.executions).toHaveLength(2);
    expect((await projectRepository.get(projectId))?._count.executions).toBe(2);
  });

  test("supports persisted pin and archive state", async () => {
    await conversationRepository.update(conversationId, { pinnedAt: new Date() });
    await conversationRepository.archive(conversationId, true);
    const restored = await conversationRepository.get(conversationId);
    expect(restored?.pinnedAt).toBeTruthy();
    expect(restored?.archivedAt).toBeTruthy();
  });
});

afterAll(async () => {
  if (conversationId) await db.conversationRecord.delete({ where: { id: conversationId } }).catch(() => undefined);
  if (projectId) await db.projectRecord.delete({ where: { id: projectId } }).catch(() => undefined);
  await db.$disconnect();
});
