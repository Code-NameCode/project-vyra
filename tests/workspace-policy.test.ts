import { describe, expect, test } from "bun:test";
import { assertWorkspacePath, resolveWorkspacePath, WorkspacePolicyError } from "../src/lib/security/workspace";
import { executeTool } from "../src/lib/agent/tools";

describe("workspace policy", () => {
  test("keeps relative paths inside the configured root", async () => {
    const resolved = await resolveWorkspacePath("src");
    expect(resolved.endsWith("src")).toBe(true);
  });

  test("rejects traversal outside the root", async () => {
    await expect(assertWorkspacePath("..\\outside")).rejects.toBeInstanceOf(WorkspacePolicyError);
  });

  test("allows the configured root only when explicitly requested", async () => {
    await expect(assertWorkspacePath(".")).rejects.toBeInstanceOf(WorkspacePolicyError);
    await expect(assertWorkspacePath(".", { allowRoot: true })).resolves.toBeTruthy();
  });

  test("requires approval before a file write", async () => {
    const result = await executeTool({ tool: "write_file", input: { path: "tests/.approval-probe", content: "x" } });
    expect(result.ok).toBe(false);
    expect(result.requiresApproval).toBe(true);
    expect(result.approval?.status).toBe("pending");
  });

  test("rejects commands outside the allowlist", async () => {
    const result = await executeTool({ tool: "run_command", input: { command: "format-c-drive" } });
    expect(result.ok).toBe(false);
    expect(result.error).toContain("not allowlisted");
  });
});
