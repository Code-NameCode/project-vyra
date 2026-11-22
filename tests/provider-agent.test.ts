import { describe, expect, test } from "bun:test";
import { capabilitiesFor } from "../src/lib/server/providers";
import { TOOL_REGISTRY } from "../src/lib/agent/tools";

describe("provider and agent contracts", () => {
  test("detects provider capabilities without assuming legacy models support tools", () => {
    expect(capabilitiesFor({ type: "openai", baseUrl: "https://example.test/v1", model: "legacy-text-davinci" }).toolCalling).toBe(false);
    expect(capabilitiesFor({ type: "ollama", baseUrl: "http://localhost:11434", model: "llama3" }).streaming).toBe(true);
  });

  test("exposes the core inspection and mutation tools", () => {
    for (const name of ["list_files", "read_file", "search_files", "search_content", "create_file", "write_file", "delete_file", "run_tests", "run_build", "get_git_status", "get_git_diff"]) expect(TOOL_REGISTRY[name]).toBeDefined();
  });
});
