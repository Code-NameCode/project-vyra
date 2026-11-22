import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export const runtimeRoot = path.join(os.tmpdir(), `vyra-phase32-playwright-${process.pid}`);
export const databasePath = path.join(runtimeRoot, "custom.db");
export const workspaceRoot = path.join(runtimeRoot, "workspace");
export const databaseUrl = `file:${databasePath.replace(/\\/g, "/")}`;

export function prepareRuntime() {
  fs.mkdirSync(workspaceRoot, { recursive: true });
}
