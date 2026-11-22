"use client";

import { useEffect } from "react";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { getPresetTheme } from "@/data/themes";

/**
 * Reads the active `themeId` and `customVars` from the settings store
 * and applies the resolved CSS variables to `document.documentElement.style`.
 *
 * Resolution order:
 *   1. The preset theme vars for `themeId` (falls back to `forge-dark`).
 *   2. The user's `customVars` overlaid on top — so any custom color
 *      overrides the matching preset token.
 *
 * Vars that are not part of the active theme are removed so switching
 * between presets with different palettes never leaves stale values.
 */
export function useTheme(): void {
  const themeId = useSettingsStore((s) => s.themeId);
  const customVars = useSettingsStore((s) => s.customVars);
  const fontFamily = useSettingsStore((s) => s.fontFamily);
  const fontSize = useSettingsStore((s) => s.fontSize);
  const lineHeight = useSettingsStore((s) => s.lineHeight);
  const letterSpacing = useSettingsStore((s) => s.letterSpacing);

  useEffect(() => {
    const root = document.documentElement;
    const preset = getPresetTheme(themeId);
    const resolved: Record<string, string> = {
      ...preset.vars,
      ...customVars,
    };

    for (const [name, value] of Object.entries(resolved)) {
      root.style.setProperty(name, value);
    }

    // Clean up: any var we manage that is NOT in the resolved set must
    // be removed so it doesn't bleed across theme switches.
    const managedKeys = new Set(Object.keys(resolved));
    const knownKeys = new Set<string>([
      "--page",
      "--surface",
      "--card-ws",
      "--hover",
      "--ws-border",
      "--ws-border-soft",
      "--ws-secondary",
      "--ws-disabled",
      "--accent-fill",
      "--accent-hi",
      "--background",
      "--foreground",
      "--card",
      "--popover",
      "--primary",
      "--secondary",
      "--muted",
      "--accent",
      "--border",
      "--input",
      "--ring",
      "--sidebar",
      "--sidebar-border",
    ]);

    for (const key of knownKeys) {
      if (!managedKeys.has(key)) {
        root.style.removeProperty(key);
      }
    }
  }, [themeId, customVars]);

  // apply font family + size + line-height + letter-spacing
  useEffect(() => {
    const body = document.body;
    const fontMap: Record<string, string> = {
      Inter: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif",
      Geist: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif",
      Roboto: "'Roboto', ui-sans-serif, system-ui, sans-serif",
      "Open Sans": "'Open Sans', ui-sans-serif, system-ui, sans-serif",
      Poppins: "'Poppins', ui-sans-serif, system-ui, sans-serif",
      "Space Grotesk": "'Space Grotesk', ui-sans-serif, system-ui, sans-serif",
      Lora: "'Lora', ui-serif, Georgia, serif",
      "Playfair Display": "'Playfair Display', ui-serif, Georgia, serif",
      "JetBrains Mono": "'JetBrains Mono', ui-monospace, SFMono-Regular, monospace",
      "Fira Code": "'Fira Code', ui-monospace, SFMono-Regular, monospace",
      Monospace: "var(--font-geist-mono), ui-monospace, SFMono-Regular, monospace",
      Serif: "ui-serif, Georgia, Cambria, serif",
      System: "ui-sans-serif, system-ui, -apple-system, sans-serif",
    };
    body.style.fontFamily = fontMap[fontFamily] || fontMap.Inter;
    body.style.fontSize = `${fontSize}px`;
    body.style.lineHeight = lineHeight;
    body.style.letterSpacing = letterSpacing;
  }, [fontFamily, fontSize, lineHeight, letterSpacing]);
}
