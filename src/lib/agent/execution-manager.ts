import { uid } from "@/lib/id";
import { executionRepository, profileRepository } from "@/lib/server/repositories";
import { executeTool, TOOL_REGISTRY, type ToolCallInput, type ToolResult } from "@/lib/agent/tools";
import { streamProvider, type ProviderConfig, type ProviderMessage, type ProviderTool } from "@/lib/server/providers";
import type { AgentEvent, Execution, ExecutionStatus } from "@/lib/types";

type Listener = (event: AgentEvent) => void;
interface RuntimeExecution { id: string; status: ExecutionStatus; listeners: Set<Listener>; cancelled: boolean; projectId?: string; request: string; config: ProviderConfig; messages: ProviderMessage[]; pending?: ToolCallInput; iterations: number; startedAt?: number; }
const runtimes = new Map<string, RuntimeExecution>();
const projectLocks = new Set<string>();
const MAX_ITERATIONS = Number(process.env.VYRA_MAX_ITERATIONS || 12);
const MAX_TOOL_CALLS = Number(process.env.VYRA_MAX_TOOL_CALLS || 40);
const MAX_DURATION_MS = Number(process.env.VYRA_MAX_EXECUTION_MS || 15 * 60 * 1000);

async function emit(runtime: RuntimeExecution, event: AgentEvent) {
  const row = await executionRepository.appendEvent(runtime.id, event.type, event);
  const enriched = { ...event, sequence: row.sequence } as AgentEvent;
  for (const listener of runtime.listeners) listener(enriched);
}
function executionShape(id: string, profileId: string, input: { request: string; modelId?: string; projectId?: string; conversationId?: string }): Execution { return { id, profileId, projectId: input.projectId, conversationId: input.conversationId, modelId: input.modelId || "", status: "queued", stage: "queued", request: input.request, createdAt: Date.now() }; }
function providerTools(): ProviderTool[] { return Object.values(TOOL_REGISTRY).map((tool) => ({ name: tool.name, description: tool.description, inputSchema: { type: "object", additionalProperties: true } })); }

export async function createExecution(input: { request: string; modelId?: string; projectId?: string; conversationId?: string; profileId?: string; provider?: ProviderConfig; messages?: ProviderMessage[]; toolCall?: ToolCallInput }): Promise<Execution> {
  const profile = input.profileId ? { id: input.profileId } : await profileRepository.getOrCreate(process.env.VYRA_WORKSPACE_ROOT || process.cwd());
  const id = uid("exec"); const execution = executionShape(id, profile.id, input);
  const config = input.provider || { type: "custom", baseUrl: "", model: input.modelId || "" } as ProviderConfig;
  const messages = input.messages || [{ role: "user", content: input.request }];
  await executionRepository.create({ id, profileId: profile.id, projectId: input.projectId, conversationId: input.conversationId, status: "queued", request: JSON.stringify({ ...input, provider: { ...config, apiKey: undefined }, messages }) });
  const runtime: RuntimeExecution = { id, status: "queued", listeners: new Set(), cancelled: false, projectId: input.projectId, request: input.request, config, messages, pending: input.toolCall, iterations: 0 };
  runtimes.set(id, runtime); void runExecution(runtime, execution); return execution;
}

async function runExecution(runtime: RuntimeExecution, execution: Execution) {
  if (runtime.projectId && projectLocks.has(runtime.projectId)) return fail(runtime, "Project already has an active execution");
  if (runtime.projectId) projectLocks.add(runtime.projectId); runtime.status = "running"; runtime.startedAt = Date.now(); await executionRepository.update(runtime.id, { status: "running" }); await emit(runtime, { type: "execution_started", execution: { ...execution, status: "running", stage: "model" } });
  try {
    let toolCount = 0;
    while (!runtime.cancelled && runtime.iterations < MAX_ITERATIONS && toolCount < MAX_TOOL_CALLS) {
      if (runtime.startedAt && Date.now() - runtime.startedAt >= MAX_DURATION_MS) return fail(runtime, "Execution exceeded its maximum duration");
      runtime.iterations++; await emit(runtime, { type: "status_changed", status: "running", stage: `model:${runtime.iterations}` });
      const pending = runtime.pending; runtime.pending = undefined;
      if (pending) {
        const result = await executeTool({ ...pending, executionId: runtime.id, projectId: runtime.projectId }); if (result.requiresApproval) { runtime.pending = pending; await emit(runtime, { type: "approval_required", approval: result.approval }); return pause(runtime); }
        if (!result.ok) throw new Error(result.error || "Tool failed");
        runtime.messages.push({ role: "tool", content: JSON.stringify(result.output), toolCallId: pending.tool }); await emit(runtime, { type: "tool_completed", tool: pending.tool, result });
      }
      let text = "";
      const calls: ToolCallInput[] = [];
      for await (const event of streamProvider(runtime.config, runtime.messages, providerTools())) {
        if (runtime.cancelled) return cancel(runtime);
        if (event.type === "text") { text += event.text; await emit(runtime, { type: "text", text: event.text }); }
        if (event.type === "thinking") await emit(runtime, { type: "thinking", text: event.text });
        if (event.type === "usage") await emit(runtime, { type: "usage", inputTokens: event.inputTokens, outputTokens: event.outputTokens });
        if (event.type === "tool_call") { let input: Record<string, unknown>; try { input = JSON.parse(event.arguments || "{}"); } catch { throw new Error(`Invalid tool arguments for ${event.name}`); } calls.push({ tool: event.name, input, approvalId: undefined }); }
        if (event.type === "error") throw new Error(event.message);
      }
      if (text) runtime.messages.push({ role: "assistant", content: text });
      if (calls.length === 0) return complete(runtime, { iterations: runtime.iterations, text });
      for (const call of calls) {
        toolCount++; await emit(runtime, { type: "tool_call_requested", tool: call.tool, input: call.input }); await emit(runtime, { type: "tool_started", tool: call.tool });
        const result = await executeTool({ ...call, executionId: runtime.id, projectId: runtime.projectId });
        if (result.requiresApproval) { runtime.pending = { ...call, approvalId: result.approval?.id }; await emit(runtime, { type: "approval_required", approval: result.approval }); return pause(runtime); }
        if (!result.ok) { await emit(runtime, { type: "tool_failed", tool: call.tool, error: result.error || "Tool failed" }); runtime.messages.push({ role: "tool", content: JSON.stringify({ error: result.error }), toolCallId: call.tool }); }
        else { await emit(runtime, { type: "tool_completed", tool: call.tool, result }); runtime.messages.push({ role: "tool", content: JSON.stringify(result.output), toolCallId: call.tool }); }
      }
    }
    if (runtime.cancelled) return cancel(runtime); return fail(runtime, "Execution limit reached before completion");
  } catch (error) { return fail(runtime, error instanceof Error ? error.message : "Execution failed"); }
  finally { if (runtime.projectId) projectLocks.delete(runtime.projectId); }
}

async function pause(runtime: RuntimeExecution) { runtime.status = "queued"; await executionRepository.update(runtime.id, { status: "queued" }); await emit(runtime, { type: "status_changed", status: "queued", stage: "approval" }); }
async function complete(runtime: RuntimeExecution, summary: unknown) { runtime.status = "completed"; await executionRepository.update(runtime.id, { status: "completed", completedAt: new Date() }); await emit(runtime, { type: "completed", summary }); }
async function fail(runtime: RuntimeExecution, error: string) { runtime.status = "failed"; await executionRepository.update(runtime.id, { status: "failed", completedAt: new Date() }); await emit(runtime, { type: "failed", error }); }
async function cancel(runtime: RuntimeExecution) { runtime.status = "cancelled"; await executionRepository.update(runtime.id, { status: "cancelled", completedAt: new Date() }); await emit(runtime, { type: "cancelled" }); }

export function subscribeExecution(id: string, listener: Listener): (() => void) | null { const runtime = runtimes.get(id); if (!runtime) return null; runtime.listeners.add(listener); return () => runtime.listeners.delete(listener); }
export async function cancelExecution(id: string) { const runtime = runtimes.get(id); if (!runtime || ["completed", "failed", "cancelled"].includes(runtime.status)) return false; runtime.cancelled = true; await cancel(runtime); return true; }
export async function resumeExecution(id: string, approvalId: string) { const runtime = runtimes.get(id); if (!runtime?.pending) return false; runtime.pending.approvalId = approvalId; await emit(runtime, { type: "approval_received", approvalId, status: "approved" }); const execution = await executionRepository.get(id); if (!execution) return false; void runExecution(runtime, { id, profileId: execution.profileId, projectId: runtime.projectId, modelId: runtime.config.model, status: "queued", stage: "resume", request: runtime.request, createdAt: execution.createdAt.getTime() }); return true; }

export async function recoverInterruptedExecutions(profileId: string) {
  return executionRepository.markUnfinishedInterrupted(profileId);
}
