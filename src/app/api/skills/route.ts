import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { assertWorkspacePath, WorkspacePolicyError } from "@/lib/security/workspace";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SKILL_RE = /\.(md|txt)$/i;

function parseFrontmatter(content: string): { name?: string; description?: string } {
  const m = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!m) return {};
  const block = m[1];
  const get = (key: string) => {
    const r = block.match(new RegExp(`^${key}:\\s*(.+)$`, "m"));
    return r ? r[1].trim().replace(/^["']|["']$/g, "") : undefined;
  };
  return { name: get("name"), description: get("description") };
}

async function collectSkills(
  dir: string,
  out: { name: string; description?: string; dir: string }[]
) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = entries.filter((e) => e.isFile() && SKILL_RE.test(e.name));
  if (files.length > 0) {
    // read first skill file for frontmatter
    let description: string | undefined;
    let name: string | undefined;
    try {
      const content = await fs.readFile(path.join(dir, files[0].name), "utf8");
      const fm = parseFrontmatter(content);
      name = fm.name;
      description = fm.description;
      if (!description) {
        // fallback: first non-empty line after frontmatter
        const lines = content.replace(/^---[\s\S]*?---\s*/, "").split("\n");
        description = lines.find((l) => l.trim())?.trim().slice(0, 120);
      }
    } catch {
      /* ignore */
    }
    out.push({ name: name || path.basename(dir), description, dir });
  }
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    await collectSkills(path.join(dir, e.name), out);
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const folder = (url.searchParams.get("path") || "").trim();
  if (!folder) {
    return NextResponse.json({ skills: [], error: "No folder path provided" });
  }
  try {
    const resolved = await assertWorkspacePath(folder, { allowRoot: true });
    const found: { name: string; dir: string }[] = [];
    await collectSkills(resolved, found);
    // de-duplicate by folder name (keep first occurrence)
    const seen = new Set<string>();
    const skills = found
      .filter((s) => (seen.has(s.name) ? false : (seen.add(s.name), true)))
      .sort((a, b) => a.name.localeCompare(b.name));
    return NextResponse.json({ skills, error: null });
  } catch (e) {
    return NextResponse.json({
      skills: [],
      error: e instanceof Error ? e.message : "Unable to read folder",
      code: e instanceof WorkspacePolicyError ? e.code : undefined,
    }, { status: e instanceof WorkspacePolicyError ? 403 : 200 });
  }
}
