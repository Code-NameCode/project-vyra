/**
 * Theme definitions for the Forge workspace.
 *
 * Each preset overrides the full set of CSS variables that drive the
 * workspace + shadcn tokens defined in `src/app/globals.css`. The
 * active theme is applied to `document.documentElement.style` by
 * `useTheme()` (see `src/hooks/useTheme.ts`).
 */

export interface ThemeDef {
  id: string;
  name: string;
  description: string;
  /** CSS variable name (with leading `--`) -> value. */
  vars: Record<string, string>;
}

/**
 * The ordered list of CSS variable names a theme may override.
 * Kept here so the custom-theme creator can iterate over the same set
 * the presets use.
 */
export const THEME_VAR_KEYS = [
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
] as const;

/** A focused subset shown as color pickers in the custom-theme UI. */
export const CUSTOM_COLOR_FIELDS = [
  { varName: "--page", label: "Background" },
  { varName: "--surface", label: "Surface" },
  { varName: "--card-ws", label: "Card" },
  { varName: "--ws-border", label: "Border" },
  { varName: "--accent-fill", label: "Accent" },
  { varName: "--foreground", label: "Text" },
] as const;

/**
 * The keys used to render a small swatch preview on each theme card.
 * Order: surface, accent, accent-hi, border, text.
 */
export const SWATCH_VAR_KEYS = [
  "--surface",
  "--accent-fill",
  "--accent-hi",
  "--ws-border",
  "--foreground",
] as const;

export const PRESET_THEMES: ThemeDef[] = [
  {
    id: "forge-dark",
    name: "Forge Dark",
    description: "Default warm-dark workspace with a green accent.",
    vars: {
      "--page": "#0b0b0c",
      "--surface": "#111214",
      "--card-ws": "#16181a",
      "--hover": "#1c1e21",
      "--ws-border": "#2a2d31",
      "--ws-border-soft": "#26282b",
      "--ws-secondary": "#9a9ea4",
      "--ws-disabled": "#5f6368",
      "--accent-fill": "#5a9e3f",
      "--accent-hi": "#7bc65a",
      "--background": "#0b0b0c",
      "--foreground": "#f2f2f2",
      "--card": "#16181a",
      "--popover": "#16181a",
      "--primary": "#5a9e3f",
      "--secondary": "#1c1e21",
      "--muted": "#16181a",
      "--accent": "#1c1e21",
      "--border": "#2a2d31",
      "--input": "#3a3d41",
      "--ring": "#7bc65a",
      "--sidebar": "#111214",
      "--sidebar-border": "#2a2d31",
    },
  },
  {
    id: "midnight",
    name: "Midnight",
    description: "Darker base with a cool blue accent.",
    vars: {
      "--page": "#0a0a0f",
      "--surface": "#0f0f17",
      "--card-ws": "#14141d",
      "--hover": "#1a1a25",
      "--ws-border": "#252535",
      "--ws-border-soft": "#1f1f2d",
      "--ws-secondary": "#8d92a4",
      "--ws-disabled": "#5a5f72",
      "--accent-fill": "#6b8afd",
      "--accent-hi": "#8baaff",
      "--background": "#0a0a0f",
      "--foreground": "#f2f3f7",
      "--card": "#14141d",
      "--popover": "#14141d",
      "--primary": "#6b8afd",
      "--secondary": "#1a1a25",
      "--muted": "#14141d",
      "--accent": "#1a1a25",
      "--border": "#252535",
      "--input": "#34344a",
      "--ring": "#8baaff",
      "--sidebar": "#0f0f17",
      "--sidebar-border": "#252535",
    },
  },
  {
    id: "forest",
    name: "Forest",
    description: "Green-dominant palette for deep focus.",
    vars: {
      "--page": "#0a0d0a",
      "--surface": "#0f1410",
      "--card-ws": "#141a15",
      "--hover": "#1a2118",
      "--ws-border": "#252d28",
      "--ws-border-soft": "#1f2622",
      "--ws-secondary": "#8ea094",
      "--ws-disabled": "#5a6960",
      "--accent-fill": "#4a8d3f",
      "--accent-hi": "#6bb85a",
      "--background": "#0a0d0a",
      "--foreground": "#f2f4f1",
      "--card": "#141a15",
      "--popover": "#141a15",
      "--primary": "#4a8d3f",
      "--secondary": "#1a2118",
      "--muted": "#141a15",
      "--accent": "#1a2118",
      "--border": "#252d28",
      "--input": "#344038",
      "--ring": "#6bb85a",
      "--sidebar": "#0f1410",
      "--sidebar-border": "#252d28",
    },
  },
  {
    id: "sunset",
    name: "Sunset",
    description: "Warm reddish base with a coral accent.",
    vars: {
      "--page": "#0d0a0a",
      "--surface": "#14100f",
      "--card-ws": "#1a1514",
      "--hover": "#211c1a",
      "--ws-border": "#2d2622",
      "--ws-border-soft": "#26201c",
      "--ws-secondary": "#a08e84",
      "--ws-disabled": "#6a5a52",
      "--accent-fill": "#d97757",
      "--accent-hi": "#f08a5b",
      "--background": "#0d0a0a",
      "--foreground": "#f4f1ef",
      "--card": "#1a1514",
      "--popover": "#1a1514",
      "--primary": "#d97757",
      "--secondary": "#211c1a",
      "--muted": "#1a1514",
      "--accent": "#211c1a",
      "--border": "#2d2622",
      "--input": "#3c342e",
      "--ring": "#f08a5b",
      "--sidebar": "#14100f",
      "--sidebar-border": "#2d2622",
    },
  },
  {
    id: "ocean",
    name: "Ocean",
    description: "Blue-teal surfaces with a teal accent.",
    vars: {
      "--page": "#0a0d0f",
      "--surface": "#0f1418",
      "--card-ws": "#141a1f",
      "--hover": "#1a2128",
      "--ws-border": "#252e35",
      "--ws-border-soft": "#1f272d",
      "--ws-secondary": "#8b97a0",
      "--ws-disabled": "#57626b",
      "--accent-fill": "#2d8a8a",
      "--accent-hi": "#4ab8b8",
      "--background": "#0a0d0f",
      "--foreground": "#f1f4f5",
      "--card": "#141a1f",
      "--popover": "#141a1f",
      "--primary": "#2d8a8a",
      "--secondary": "#1a2128",
      "--muted": "#141a1f",
      "--accent": "#1a2128",
      "--border": "#252e35",
      "--input": "#333d45",
      "--ring": "#4ab8b8",
      "--sidebar": "#0f1418",
      "--sidebar-border": "#252e35",
    },
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "Pure grayscale for a distraction-free canvas.",
    vars: {
      "--page": "#0b0b0b",
      "--surface": "#111111",
      "--card-ws": "#161616",
      "--hover": "#1c1c1c",
      "--ws-border": "#282828",
      "--ws-border-soft": "#222222",
      "--ws-secondary": "#9a9a9a",
      "--ws-disabled": "#5f5f5f",
      "--accent-fill": "#888888",
      "--accent-hi": "#aaaaaa",
      "--background": "#0b0b0b",
      "--foreground": "#f2f2f2",
      "--card": "#161616",
      "--popover": "#161616",
      "--primary": "#888888",
      "--secondary": "#1c1c1c",
      "--muted": "#161616",
      "--accent": "#1c1c1c",
      "--border": "#282828",
      "--input": "#383838",
      "--ring": "#aaaaaa",
      "--sidebar": "#111111",
      "--sidebar-border": "#282828",
    },
  },
];

/** Look up a preset theme by id; falls back to the default theme. */
export function getPresetTheme(id: string): ThemeDef {
  return (
    PRESET_THEMES.find((t) => t.id === id) ??
    PRESET_THEMES[0]
  );
}

/** True when the given id matches one of the preset theme ids. */
export function isPresetThemeId(id: string): boolean {
  return PRESET_THEMES.some((t) => t.id === id);
}
