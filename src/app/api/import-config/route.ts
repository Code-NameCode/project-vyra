import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import os from "os";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Discover provider/model configuration from installed coding CLI tools.
 *
 * Only metadata (base URLs, model ids, and whether a key EXISTS) is returned.
 * API keys are never read into the response.
 */

interface ImportedProvider {
  id: string;
  name: string;
  sourceCli: string;
  baseUrl: string;
  models: string[];
  hasApiKey: boolean;
}

async function readText(file: string): Promise<string | null> {
  try {
    return await fs.readFile(file, "utf8");
  } catch {
    return null;
  }
}

function stripJsonComments(text: string): string {
  let out = "";
  let inString = false;
  let escaped = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];
    if (inString) {
      out += c;
      if (escaped) escaped = false;
      else if (c === "\\") escaped = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') {
      inString = true;
      out += c;
      continue;
    }
    if (c === "/" && next === "/") {
      while (i < text.length && text[i] !== "\n") i++;
      if (i < text.length) out += "\n";
      continue;
    }
    if (c === "/" && next === "*") {
      i += 2;
      while (i < text.length && !(text[i] === "*" && text[i + 1] === "/")) i++;
      i++;
      continue;
    }
    out += c;
  }
  return out.replace(/,(\s*[}\]])/g, "$1");
}

async function readJson(file: string): Promise<Record<string, unknown> | null> {
  const text = await readText(file);
  if (!text) return null;
  try {
    return JSON.parse(stripJsonComments(text)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Very small top-level TOML reader (sections are ignored). */
function parseTomlTopLevel(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  let inSection = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    if (line.startsWith("[")) {
      inSection = true;
      continue;
    }
    if (inSection) continue;
    const m = line.match(/^([A-Za-z0-9_-]+)\s*=\s*(.+)$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
      if (v.includes("\\")) v = v.replace(/\\\\/g, "\\");
    }
    out[m[1]] = v;
  }
  return out;
}

function hasKey(obj: unknown): boolean {
  if (!obj || typeof obj !== "object") return false;
  const s = JSON.stringify(obj).toLowerCase();
  return /api[_-]?key|token|secret|password/.test(s);
}

function uniq(items: string[]): string[] {
  return Array.from(new Set(items.filter(Boolean)));
}

async function collectCodex(home: string): Promise<ImportedProvider[]> {
  const dir = path.join(home, ".codex");
  const out: ImportedProvider[] = [];
  const tomlText = await readText(path.join(dir, "config.toml"));
  const toml = tomlText ? parseTomlTopLevel(tomlText) : {};
  let baseUrl = toml.openai_base_url || "";
  const selected = toml.model || "";

  let models: string[] = selected ? [selected] : [];
  const catalogPath = toml.model_catalog_json;
  if (catalogPath) {
    const catalog = await readJson(catalogPath);
    const arr = catalog?.models;
    if (Array.isArray(arr)) {
      const slugs = arr
        .map((m) => (m && typeof m === "object" ? (m as { slug?: unknown }).slug : null))
        .filter((s): s is string => typeof s === "string");
      models = uniq([...slugs, ...models]);
    }
  }
  if (models.length === 0) {
    const modelJson = await readJson(path.join(dir, "model.json"));
    const arr = modelJson?.models;
    if (Array.isArray(arr)) {
      models = arr
        .map((m) => (m && typeof m === "object" ? (m as { slug?: unknown }).slug : null))
        .filter((s): s is string => typeof s === "string")
        .slice(0, 60);
    }
  }

  if (baseUrl || models.length > 0) {
    const auth = await readJson(path.join(dir, "auth.json"));
    out.push({
      id: "cli-codex",
      name: "Codex CLI",
      sourceCli: "Codex",
      baseUrl,
      models: models.slice(0, 60),
      hasApiKey: hasKey(auth) || Boolean(await readText(path.join(dir, "auth.json"))),
    });
  }
  return out;
}

async function collectOpencode(home: string): Promise<ImportedProvider[]> {
  const out: ImportedProvider[] = [];
  const cfg =
    (await readJson(path.join(home, ".config", "opencode", "opencode.json"))) ||
    (await readJson(path.join(home, ".opencode", "opencode.json")));
  const state = await readJson(
    path.join(home, ".local", "state", "opencode", "model.json")
  );

  const providerModels = new Map<string, string[]>();
  const add = (providerID: string, modelID: string) => {
    if (!providerID || !modelID) return;
    const list = providerModels.get(providerID) || [];
    list.push(modelID);
    providerModels.set(providerID, list);
  };

  if (cfg) {
    const model = cfg.model;
    if (typeof model === "string" && model.includes("/")) {
      const [p, ...rest] = model.split("/");
      add(p, rest.join("/"));
    }
    const providerCfg = cfg.provider;
    if (providerCfg && typeof providerCfg === "object") {
      for (const [pid, pconf] of Object.entries(providerCfg as Record<string, unknown>)) {
        if (!pconf || typeof pconf !== "object") continue;
        const pc = pconf as Record<string, unknown>;
        const models = pc.models;
        if (models && typeof models === "object") {
          for (const mid of Object.keys(models as Record<string, unknown>)) add(pid, mid);
        }
        const model = pc.model;
        if (typeof model === "string") add(pid, model);
      }
    }
  }

  const recent = state?.recent;
  if (Array.isArray(recent)) {
    for (const r of recent) {
      if (!r || typeof r !== "object") continue;
      const item = r as { providerID?: unknown; modelID?: unknown };
      if (typeof item.providerID === "string" && typeof item.modelID === "string") {
        add(item.providerID, item.modelID);
      }
    }
  }

  for (const [pid, models] of providerModels) {
    const configProvider =
      cfg && cfg.provider && typeof cfg.provider === "object"
        ? (cfg.provider as Record<string, unknown>)[pid]
        : undefined;
    const pc = configProvider && typeof configProvider === "object"
      ? (configProvider as Record<string, unknown>)
      : {};
    const baseUrl =
      typeof pc.baseURL === "string"
        ? pc.baseURL
        : typeof pc.baseUrl === "string"
          ? pc.baseUrl
          : "";
    out.push({
      id: `cli-opencode-${pid}`,
      name: `OpenCode · ${pid}`,
      sourceCli: "OpenCode",
      baseUrl,
      models: uniq(models).slice(0, 60),
      hasApiKey: hasKey(pc),
    });
  }
  return out;
}

async function collectKilo(home: string): Promise<ImportedProvider[]> {
  const cfg = await readJson(path.join(home, ".config", "kilo", "kilo.jsonc"));
  if (!cfg) return [];
  const out: ImportedProvider[] = [];
  const providerCfg = cfg.provider;
  if (providerCfg && typeof providerCfg === "object") {
    for (const [pid, pconf] of Object.entries(providerCfg as Record<string, unknown>)) {
      if (!pconf || typeof pconf !== "object") continue;
      const pc = pconf as Record<string, unknown>;
      const baseUrl =
        typeof pc.baseURL === "string" ? pc.baseURL : typeof pc.baseUrl === "string" ? pc.baseUrl : "";
      const modelsObj = pc.models;
      const models =
        modelsObj && typeof modelsObj === "object" ? Object.keys(modelsObj as object) : [];
      if (baseUrl || models.length) {
        out.push({
          id: `cli-kilo-${pid}`,
          name: `Kilo · ${pid}`,
          sourceCli: "Kilo",
          baseUrl,
          models: uniq(models).slice(0, 60),
          hasApiKey: hasKey(pc),
        });
      }
    }
  }
  return out;
}

async function collectClaude(home: string): Promise<ImportedProvider[]> {
  const out: ImportedProvider[] = [];
  const files = [
    path.join(home, ".claude", "settings.json"),
    path.join(home, ".claude", "settings.local.json"),
    path.join(home, ".claude.json"),
  ];
  let baseUrl = "";
  let models: string[] = [];
  let hasApiKey = false;
  for (const file of files) {
    const cfg = await readJson(file);
    if (!cfg) continue;
    const env = (cfg.env && typeof cfg.env === "object" ? cfg.env : cfg) as Record<string, unknown>;
    const url =
      env.ANTHROPIC_BASE_URL || env.baseUrl || env.baseURL || env.OPENAI_BASE_URL;
    if (typeof url === "string" && url) baseUrl = url;
    const model = env.ANTHROPIC_MODEL || env.ANTHROPIC_DEFAULT_SONNET_MODEL || env.model;
    if (typeof model === "string" && model) models.push(model);
    if (hasKey(cfg)) hasApiKey = true;
  }
  if (baseUrl || models.length) {
    out.push({
      id: "cli-claude",
      name: "Claude Code",
      sourceCli: "Claude Code",
      baseUrl,
      models: uniq(models).slice(0, 60),
      hasApiKey,
    });
  }
  return out;
}

async function collectGemini(home: string): Promise<ImportedProvider[]> {
  const cfg = await readJson(path.join(home, ".gemini", "settings.json"));
  if (!cfg) return [];
  const env = (cfg.env && typeof cfg.env === "object" ? cfg.env : cfg) as Record<string, unknown>;
  const baseUrl = typeof env.GOOGLE_GEMINI_BASE_URL === "string" ? env.GOOGLE_GEMINI_BASE_URL : "";
  const model = typeof env.GEMINI_MODEL === "string" ? env.GEMINI_MODEL : "";
  if (!baseUrl && !model) return [];
  return [
    {
      id: "cli-gemini",
      name: "Gemini CLI",
      sourceCli: "Gemini",
      baseUrl,
      models: model ? [model] : [],
      hasApiKey: hasKey(cfg),
    },
  ];
}

export async function GET() {
  const home = os.homedir();
  try {
    const groups = await Promise.all([
      collectCodex(home),
      collectOpencode(home),
      collectKilo(home),
      collectClaude(home),
      collectGemini(home),
    ]);
    const providers = groups.flat().filter((p) => p.baseUrl || p.models.length > 0);
    return NextResponse.json({ providers, error: null });
  } catch (e) {
    return NextResponse.json({
      providers: [],
      error: e instanceof Error ? e.message : "Unable to read CLI configs",
    });
  }
}
