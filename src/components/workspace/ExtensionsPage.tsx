"use client";

import { useMemo, useState } from "react";
import {
  BarChart3,
  Check,
  Database,
  Figma,
  Github,
  Globe,
  ImagePlus,
  Plus,
  Rocket,
  ScanSearch,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Extension {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  category: string;
  builtIn?: boolean;
}

const EXTENSIONS: Extension[] = [
  {
    id: "github",
    name: "GitHub",
    description:
      "Sync repos, open pull requests, and resolve review comments without leaving your workspace.",
    icon: Github,
    category: "Integrations",
    builtIn: true,
  },
  {
    id: "figma",
    name: "Figma",
    description:
      "Import frames and design tokens from Figma files directly into your project workspace.",
    icon: Figma,
    category: "Design",
  },
  {
    id: "database",
    name: "Database",
    description:
      "Browse tables, run queries, and inspect schema for connected Postgres and SQLite databases.",
    icon: Database,
    category: "Data",
    builtIn: true,
  },
  {
    id: "web-search",
    name: "Web search",
    description:
      "Let the agent search the live web for documentation, examples, and current API references.",
    icon: Globe,
    category: "Agent",
  },
  {
    id: "image-gen",
    name: "Image generation",
    description:
      "Generate placeholder and hero imagery inline from text descriptions during a build.",
    icon: ImagePlus,
    category: "Media",
  },
  {
    id: "deployment",
    name: "Deployment",
    description:
      "Ship your project to Goodstuff-Agent hosting, Vercel, or Netlify with a single command from the agent.",
    icon: Rocket,
    category: "Deploy",
  },
  {
    id: "analytics",
    name: "Analytics",
    description:
      "Track page views, events, and conversion funnels across deployed projects in real time.",
    icon: BarChart3,
    category: "Insights",
  },
  {
    id: "code-review",
    name: "Code review",
    description:
      "Run automated reviews on generated diffs, flag regressions, and suggest safer patterns.",
    icon: ScanSearch,
    category: "Quality",
  },
];

export function ExtensionsPage() {
  const [query, setQuery] = useState("");
  // built-in extensions are always enabled and cannot be toggled off
  const [enabled, setEnabled] = useState<Set<string>>(
    () => new Set(EXTENSIONS.filter((e) => e.builtIn).map((e) => e.id))
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return EXTENSIONS;
    return EXTENSIONS.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q)
    );
  }, [query]);

  const toggle = (ext: Extension) => {
    if (ext.builtIn) return;
    setEnabled((prev) => {
      const next = new Set(prev);
      if (next.has(ext.id)) {
        next.delete(ext.id);
        toast(ext.name + " disabled");
      } else {
        next.add(ext.id);
        toast.success(ext.name + " enabled");
      }
      return next;
    });
  };

  return (
    <div className="flex h-full flex-col">
      <header className="shrink-0 border-b border-ws-border px-6 py-4 flex items-center gap-4">
        <div>
          <h1 className="text-[20px] font-semibold text-foreground">
            Extensions
          </h1>
          <p className="text-[13px] text-ws-secondary">
            Add capabilities to your workspace
          </p>
        </div>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search extensions"
          aria-label="Search extensions"
          className="bg-card-ws border border-ws-border h-9 text-[13px] w-[280px] ml-auto focus-ring"
        />
      </header>

      <div className="flex-1 overflow-y-auto ws-scroll px-6 py-5">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-[13px] text-ws-secondary">
              No extensions match &ldquo;{query}&rdquo;.
            </p>
          </div>
        ) : (
          <div className="ws-fade-in grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-w-[1100px] mx-auto">
            {filtered.map((ext) => {
              const Icon = ext.icon;
              const isEnabled = enabled.has(ext.id);
              const isOn = ext.builtIn || isEnabled;
              return (
                <div
                  key={ext.id}
                  className="rounded-[12px] border border-ws-border bg-card-ws p-4 flex flex-col gap-2"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-9 rounded-[8px] bg-hover flex items-center justify-center text-accent-hi">
                      <Icon className="size-5" />
                    </div>
                    <div className="text-[14px] font-medium text-foreground">
                      {ext.name}
                    </div>
                    <span className="ml-auto text-[11px] text-ws-secondary">
                      {ext.category}
                    </span>
                  </div>
                  <p className="text-[12.5px] text-ws-secondary line-clamp-2">
                    {ext.description}
                  </p>
                  <div className="mt-auto pt-2 flex items-center justify-between">
                    {ext.builtIn ? (
                      <span className="text-[11px] text-ws-disabled">
                        Built-in
                      </span>
                    ) : (
                      <span />
                    )}
                    <button
                      type="button"
                      disabled={ext.builtIn}
                      onClick={() => toggle(ext)}
                      aria-pressed={isOn}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-[8px] h-7 px-3 text-[12px] transition-colors duration-150 focus-ring",
                        isOn
                          ? "text-accent-hi border border-accent-fill/40 bg-accent-fill/10"
                          : "text-foreground border border-ws-border bg-card-ws hover:bg-hover",
                        ext.builtIn && "cursor-default"
                      )}
                    >
                      {isOn ? (
                        <Check className="size-3.5" />
                      ) : (
                        <Plus className="size-3.5" />
                      )}
                      {isOn ? "Enabled" : "Add"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
