import { NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import { AGENTS } from "@/data/agents";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const execFileAsync = promisify(execFile);

/** Resolve a binary on the PATH using `where` (Windows) or `which`. */
async function resolveBinary(bin: string): Promise<string | null> {
  try {
    const cmd = process.platform === "win32" ? "where" : "which";
    const { stdout } = await execFileAsync(cmd, [bin], {
      timeout: 4000,
      windowsHide: true,
    });
    const first = stdout
      .split(/\r?\n/)
      .map((l) => l.trim())
      .find(Boolean);
    return first ?? null;
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const results = await Promise.all(
      AGENTS.map(async (agent) => {
        const candidates = [agent.bin, ...(agent.bins ?? [])].filter(
          (b): b is string => Boolean(b)
        );
        let resolvedPath: string | null = null;
        for (const bin of candidates) {
          resolvedPath = await resolveBinary(bin);
          if (resolvedPath) break;
        }
        return {
          id: agent.id,
          name: agent.name,
          detected: Boolean(resolvedPath),
          path: resolvedPath,
        };
      })
    );

    return NextResponse.json({ agents: results, error: null });
  } catch (e) {
    return NextResponse.json({
      agents: [],
      error: e instanceof Error ? e.message : "Unable to detect agents",
    });
  }
}
