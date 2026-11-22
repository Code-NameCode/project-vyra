import { getCredential } from "@/lib/server/credential-vault";

export type ProviderKind = "openai" | "anthropic" | "ollama" | "custom";
export interface ProviderConfig { id?: string; type: ProviderKind; baseUrl: string; model: string; apiKey?: string; }
export interface ProviderMessage { role: "system" | "user" | "assistant" | "tool"; content: string; toolCallId?: string; }
export interface ProviderTool { name: string; description: string; inputSchema: Record<string, unknown>; }
export interface ProviderCapabilities { streaming: boolean; toolCalling: boolean; vision: boolean; structuredOutput: boolean; contextWindow?: number; }
export type ProviderEvent =
  | { type: "text"; text: string }
  | { type: "thinking"; text: string }
  | { type: "tool_call"; id: string; name: string; arguments: string }
  | { type: "usage"; inputTokens?: number; outputTokens?: number }
  | { type: "error"; message: string };

/** Z.ai GLM Coding Plan requires thinking enabled for GLM-5.3 models. */
export function isZaiCodingEndpoint(baseUrl: string): boolean {
  const s = baseUrl.toLowerCase();
  return s.includes("z.ai") || s.includes("glm");
}

export async function resolveProviderKey(config: ProviderConfig): Promise<string | undefined> {
  if (config.type === "ollama") return undefined;
  if (config.id) return (await getCredential(config.id)) || undefined;
  return config.apiKey;
}

export function capabilitiesFor(config: ProviderConfig): ProviderCapabilities {
  if (config.type === "ollama") return { streaming: true, toolCalling: true, vision: /vision|llava/i.test(config.model), structuredOutput: true };
  if (config.type === "anthropic") return { streaming: true, toolCalling: true, vision: /claude/i.test(config.model), structuredOutput: true };
  return { streaming: true, toolCalling: !/legacy|text-davinci/i.test(config.model), vision: /vision|4o|gemini/i.test(config.model), structuredOutput: true };
}

function sseLines(chunk: string) { return chunk.split(/\r?\n/).filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trim()).filter(Boolean); }

export async function* streamProvider(config: ProviderConfig, messages: ProviderMessage[], tools: ProviderTool[], signal?: AbortSignal): AsyncGenerator<ProviderEvent> {
  const key = await resolveProviderKey(config);
  const caps = capabilitiesFor(config);
  const base = config.baseUrl.replace(/\/$/, "");
  let url: string;
  let headers: Record<string, string>;
  let body: Record<string, unknown>;
  if (config.type === "anthropic") {
    url = `${base}/messages`;
    headers = { "Content-Type": "application/json", "anthropic-version": "2023-06-01", ...(key ? { "x-api-key": key } : {}) };
    body = { model: config.model, max_tokens: 4096, stream: true, messages: messages.filter((m) => m.role !== "system").map((m) => ({ role: m.role === "tool" ? "user" : m.role, content: m.content })), system: messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n"), tools: caps.toolCalling && tools.length > 0 ? tools.map((tool) => ({ name: tool.name, description: tool.description, input_schema: tool.inputSchema })) : undefined };
  } else {
    url = `${base}${config.type === "ollama" ? "/v1/chat/completions" : "/chat/completions"}`;
    headers = { "Content-Type": "application/json", ...(key ? { Authorization: `Bearer ${key}` } : {}) };
    body = {
      model: config.model,
      stream: true,
      messages,
      tools: caps.toolCalling && tools.length > 0 ? tools.map((tool) => ({ type: "function", function: { name: tool.name, description: tool.description, parameters: tool.inputSchema } })) : undefined,
      tool_choice: caps.toolCalling && tools.length > 0 ? "auto" : undefined,
      ...(isZaiCodingEndpoint(base) ? { temperature: 1.0, thinking: { type: "enabled" }, reasoning_effort: "max" } : {}),
    };
  }
  const response = await fetch(url, { method: "POST", headers, body: JSON.stringify(body), signal });
  if (!response.ok || !response.body) {
    const detail = await response.text().catch(() => "");
    yield { type: "error", message: `Provider returned ${response.status}${detail ? `: ${detail.slice(0, 300)}` : ""}` };
    return;
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const toolBuffers = new Map<string, { name: string; args: string }>();
  // Continuation chunks for a tool call omit the id and carry only the
  // streaming index, so remember which id each index maps to.
  const toolIdsByIndex = new Map<number, string>();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split(/\n\n/);
    buffer = parts.pop() || "";
    for (const raw of parts) {
      for (const payload of sseLines(raw)) {
        if (payload === "[DONE]") continue;
        let json: any;
        try { json = JSON.parse(payload); } catch { continue; }
        if (config.type === "anthropic") {
          if (json.type === "content_block_delta" && json.delta?.text) yield { type: "text", text: json.delta.text };
          if (json.type === "content_block_delta" && json.delta?.type === "thinking_delta" && json.delta?.thinking) yield { type: "thinking", text: json.delta.thinking };
          if (json.type === "content_block_start" && json.content_block?.type === "tool_use") toolBuffers.set(json.content_block.id, { name: json.content_block.name, args: "" });
          if (json.type === "content_block_delta" && json.delta?.partial_json) {
            const id = [...toolBuffers.keys()].at(-1); if (id) toolBuffers.get(id)!.args += json.delta.partial_json;
          }
          if (json.type === "message_delta" && json.usage) yield { type: "usage", outputTokens: json.usage.output_tokens };
        } else {
          const choice = json.choices?.[0];
          const delta = choice?.delta;
          if (delta?.content) yield { type: "text", text: delta.content };
          // Reasoning deltas (GLM/DeepSeek `reasoning_content`, OpenRouter `reasoning`).
          const reasoning = delta?.reasoning_content ?? delta?.reasoning;
          if (typeof reasoning === "string" && reasoning) yield { type: "thinking", text: reasoning };
          for (const call of delta?.tool_calls || []) {
            const id = call.id
              || (call.index !== undefined ? toolIdsByIndex.get(call.index) : undefined)
              || [...toolBuffers.keys()].at(-1)
              || "";
            if (call.id && call.index !== undefined) toolIdsByIndex.set(call.index, call.id);
            const current = toolBuffers.get(id) || { name: call.function?.name || "", args: "" };
            current.name ||= call.function?.name || "";
            current.args += call.function?.arguments || "";
            if (id) toolBuffers.set(id, current);
          }
          if (json.usage) yield { type: "usage", inputTokens: json.usage.prompt_tokens, outputTokens: json.usage.completion_tokens };
        }
      }
    }
  }
  for (const [id, call] of toolBuffers) yield { type: "tool_call", id, name: call.name, arguments: call.args };
}
