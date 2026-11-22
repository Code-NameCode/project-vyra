import { promises as fs } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { consumeApproval, createApproval } from "@/lib/security/approvals";
import { assertWorkspacePath, relativeWorkspacePath, type ApprovalLevel } from "@/lib/security/workspace";
import { atomicWrite } from "@/lib/server/file-transactions";

export interface ToolCallInput {
  tool: string;
  input: Record<string, unknown>;
  approvalId?: string;
  executionId?: string;
  projectId?: string;
}

export interface ToolResult {
  ok: boolean;
  tool: string;
  output?: unknown;
  error?: string;
  requiresApproval?: boolean;
  approval?: Awaited<ReturnType<typeof createApproval>>;
}

export interface ToolDefinition {
  name: string;
  description: string;
  level: ApprovalLevel;
  execute: (input: Record<string, unknown>, approvalId?: string, context?: { executionId?: string; projectId?: string }) => Promise<ToolResult>;
}

function stringInput(input: Record<string, unknown>, key: string): string {
  const value = input[key];
  if (typeof value !== "string" || !value.trim()) throw new Error(`${key} is required`);
  return value;
}

async function gated(tool: string, action: string, level: ApprovalLevel, input: Record<string, unknown>, approvalId: string | undefined, execute: () => Promise<unknown>, context?: { executionId?: string; projectId?: string }): Promise<ToolResult> {
  if (level !== "read") {
    const consumed = await consumeApproval(approvalId, action, input, context?.executionId);
    if (!consumed) {
      return { ok: false, tool, requiresApproval: true, approval: await createApproval({ executionId: context?.executionId, tool, level, action, description: `${tool}: ${action}`, input }) };
    }
  }
  try {
    return { ok: true, tool, output: await execute() };
  } catch (error) {
    return { ok: false, tool, error: error instanceof Error ? error.message : "Tool failed" };
  }
}

const listFiles: ToolDefinition = {
  name: "list_files",
  description: "List files and directories inside the workspace.",
  level: "read",
  async execute(input) {
    const target = await assertWorkspacePath(typeof input.path === "string" ? input.path : ".", { allowRoot: true });
    const entries = await fs.readdir(target, { withFileTypes: true });
    return { ok: true, tool: "list_files", output: entries.map((entry) => ({ name: entry.name, type: entry.isDirectory() ? "dir" : "file", path: relativeWorkspacePath(path.join(target, entry.name)) })) };
  },
};

const readFile: ToolDefinition = {
  name: "read_file",
  description: "Read a UTF-8 text file inside the workspace.",
  level: "read",
  async execute(input) {
    const target = await assertWorkspacePath(stringInput(input, "path"));
    const stat = await fs.stat(target);
    if (stat.size > 2_000_000) return { ok: false, tool: "read_file", error: "File exceeds the 2 MB limit" };
    return { ok: true, tool: "read_file", output: { path: relativeWorkspacePath(target), content: await fs.readFile(target, "utf8") } };
  },
};

const writeFile: ToolDefinition = {
  name: "write_file",
  description: "Create or replace a UTF-8 text file after approval.",
  level: "write",
  async execute(input, approvalId, context) {
    const target = await assertWorkspacePath(stringInput(input, "path"));
    const content = input.content;
    if (typeof content !== "string") return { ok: false, tool: "write_file", error: "content is required" };
    const expectedHash = typeof input.expectedHash === "string" || input.expectedHash === null ? input.expectedHash as string | null : undefined;
    return gated("write_file", "write_file", "write", { path: relativeWorkspacePath(target), content, expectedHash }, approvalId, async () => {
      const transaction = await atomicWrite(target, content, expectedHash, { executionId: context?.executionId, projectId: context?.projectId, tool: "write_file", approvalId });
      return { path: relativeWorkspacePath(target), bytes: Buffer.byteLength(content), transaction };
    }, context);
  },
};

const runCommand: ToolDefinition = {
  name: "run_command",
  description: "Run an allowlisted command inside the workspace after approval.",
  level: "terminal",
  async execute(input, approvalId) {
    const command = stringInput(input, "command");
    const [executable, ...args] = command.trim().split(/\s+/);
    const allowlist = (process.env.VYRA_ALLOWED_COMMANDS || "git,bun,node,npm,pnpm,yarn,tsc").split(",").map((item) => item.trim().toLowerCase()).filter(Boolean);
    if (!allowlist.includes(executable.toLowerCase())) return { ok: false, tool: "run_command", error: `Command '${executable}' is not allowlisted` };
    const cwd = await assertWorkspacePath(typeof input.cwd === "string" ? input.cwd : ".", { allowRoot: true });
    return gated("run_command", "run_command", "terminal", { command, cwd: relativeWorkspacePath(cwd) }, approvalId, () => new Promise((resolve) => {
      const spawnExecutable = process.platform === "win32" && ["npm", "pnpm", "yarn", "tsc"].includes(executable.toLowerCase()) ? `${executable}.cmd` : executable;
      const child = spawn(spawnExecutable, args, { cwd, windowsHide: true, shell: false, env: process.env });
      let output = "";
      const append = (chunk: Buffer) => { output += chunk.toString(); if (output.length > 100_000) output = output.slice(-100_000); };
      child.stdout.on("data", append);
      child.stderr.on("data", append);
      const timeout = setTimeout(() => child.kill(), 120_000);
      child.on("close", (code, signal) => { clearTimeout(timeout); resolve({ command, exitCode: code, signal, output }); });
      child.on("error", (error) => { clearTimeout(timeout); resolve({ command, exitCode: -1, error: error.message, output }); });
    }));
  },
};

async function walk(root: string, max = 500): Promise<string[]> {
  const out: string[] = [];
  async function visit(dir: string) {
    if (out.length >= max) return;
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      if ([".git", "node_modules", ".next", ".vyra"].includes(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await visit(full); else out.push(full);
      if (out.length >= max) return;
    }
  }
  await visit(root);
  return out;
}

const searchFiles: ToolDefinition = {
  name: "search_files", description: "Find files by name within the workspace.", level: "read",
  async execute(input) {
    const root = await assertWorkspacePath(typeof input.path === "string" ? input.path : ".", { allowRoot: true });
    const pattern = stringInput(input, "pattern").toLowerCase();
    const files = await walk(root);
    return { ok: true, tool: "search_files", output: files.filter((file) => path.basename(file).toLowerCase().includes(pattern)).map(relativeWorkspacePath) };
  },
};

const searchContent: ToolDefinition = {
  name: "search_content", description: "Search UTF-8 file contents within the workspace.", level: "read",
  async execute(input) {
    const root = await assertWorkspacePath(typeof input.path === "string" ? input.path : ".", { allowRoot: true });
    const query = stringInput(input, "query"); const results: { path: string; line: number; text: string }[] = [];
    for (const file of await walk(root)) {
      if (results.length >= 200) break;
      const content = await fs.readFile(file, "utf8").catch(() => "");
      content.split(/\r?\n/).forEach((line, index) => { if (line.toLowerCase().includes(query.toLowerCase()) && results.length < 200) results.push({ path: relativeWorkspacePath(file), line: index + 1, text: line.slice(0, 500) }); });
    }
    return { ok: true, tool: "search_content", output: results };
  },
};

const createDirectory: ToolDefinition = { name: "create_directory", description: "Create a directory after approval.", level: "write", async execute(input, approvalId) { const target = await assertWorkspacePath(stringInput(input, "path")); return gated("create_directory", "create_directory", "write", { path: relativeWorkspacePath(target) }, approvalId, async () => { await fs.mkdir(target, { recursive: true }); return { path: relativeWorkspacePath(target) }; }); } };
const createFile: ToolDefinition = { name: "create_file", description: "Create a new file after approval.", level: "write", async execute(input, approvalId) { const target = await assertWorkspacePath(stringInput(input, "path")); const content = typeof input.content === "string" ? input.content : ""; return gated("create_file", "create_file", "write", { path: relativeWorkspacePath(target), content }, approvalId, async () => { await fs.mkdir(path.dirname(target), { recursive: true }); await fs.writeFile(target, content, { encoding: "utf8", flag: "wx" }); return { path: relativeWorkspacePath(target) }; }); } };
const renameFile: ToolDefinition = { name: "rename_file", description: "Rename a file after approval.", level: "write", async execute(input, approvalId) { const from = await assertWorkspacePath(stringInput(input, "path")); const to = await assertWorkspacePath(stringInput(input, "newPath")); return gated("rename_file", "rename_file", "write", { path: relativeWorkspacePath(from), newPath: relativeWorkspacePath(to) }, approvalId, async () => { await fs.rename(from, to); return { path: relativeWorkspacePath(from), newPath: relativeWorkspacePath(to) }; }); } };
const deleteFile: ToolDefinition = { name: "delete_file", description: "Delete a file or directory after explicit destructive approval.", level: "destructive", async execute(input, approvalId) { const target = await assertWorkspacePath(stringInput(input, "path")); return gated("delete_file", "delete_file", "destructive", { path: relativeWorkspacePath(target) }, approvalId, async () => { await fs.rm(target, { recursive: true }); return { path: relativeWorkspacePath(target) }; }); } };
async function executeReadOnlyCommand(command: string, cwdInput: unknown, tool: string): Promise<ToolResult> {
  const cwd = await assertWorkspacePath(typeof cwdInput === "string" ? cwdInput : ".", { allowRoot: true });
  const [executable, ...args] = command.split(/\s+/);
  if (executable !== "git") return { ok: false, tool, error: "Only Git inspection is permitted by this tool" };
  return new Promise((resolve) => { const child = spawn(executable, args, { cwd, windowsHide: true, shell: false, env: process.env }); let output = ""; child.stdout.on("data", (chunk) => { output += chunk.toString().slice(0, 100_000); }); child.stderr.on("data", (chunk) => { output += chunk.toString().slice(0, 100_000); }); child.on("close", (exitCode) => resolve({ ok: exitCode === 0, tool, output: { command, exitCode, output } })); child.on("error", (error) => resolve({ ok: false, tool, error: error.message })); });
}
const gitStatus: ToolDefinition = { name: "get_git_status", description: "Inspect local Git status.", level: "read", async execute(input) { return executeReadOnlyCommand("git status --short", input.cwd, "get_git_status"); } };
const gitDiff: ToolDefinition = { name: "get_git_diff", description: "Inspect local Git diff.", level: "read", async execute(input) { const suffix = typeof input.path === "string" && input.path ? ` -- ${input.path}` : ""; return executeReadOnlyCommand(`git diff${suffix}`, input.cwd, "get_git_diff"); } };
const runTests: ToolDefinition = { name: "run_tests", description: "Run the project test command after approval.", level: "terminal", async execute(input, approvalId) { return runCommand.execute({ command: typeof input.command === "string" ? input.command : "bun test", cwd: input.cwd || "." }, approvalId); } };
const runBuild: ToolDefinition = { name: "run_build", description: "Run the project build command after approval.", level: "terminal", async execute(input, approvalId) { return runCommand.execute({ command: typeof input.command === "string" ? input.command : "bun run build", cwd: input.cwd || "." }, approvalId); } };

export const TOOL_REGISTRY: Record<string, ToolDefinition> = {
  list_files: listFiles, read_file: readFile, write_file: writeFile, run_command: runCommand,
  search_files: searchFiles, search_content: searchContent, create_directory: createDirectory, create_file: createFile,
  rename_file: renameFile, delete_file: deleteFile, get_git_status: gitStatus, get_git_diff: gitDiff, run_tests: runTests, run_build: runBuild,
};

export async function executeTool(call: ToolCallInput): Promise<ToolResult> {
  const definition = TOOL_REGISTRY[call.tool];
  if (!definition) return { ok: false, tool: call.tool, error: "Unknown tool" };
  try {
    return await definition.execute(call.input, call.approvalId, { executionId: call.executionId, projectId: call.projectId });
  } catch (error) {
    return { ok: false, tool: call.tool, error: error instanceof Error ? error.message : "Invalid tool input" };
  }
}
