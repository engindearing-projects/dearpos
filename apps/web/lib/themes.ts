// Per-business theming. Resolved values are injected as CSS custom properties
// on a wrapper element so Tailwind classes like `[color:var(--color-accent)]/10`
// inherit through the cascade.

export type ThemeColors = {
  background: string;
  foreground: string;
  accent: string;
  muted: string;
};

export type BusinessThemeJson = {
  preset?: string;
  colors?: Partial<ThemeColors>;
};

export const DEFAULT_COLORS: ThemeColors = {
  background: "#faf7f2",
  foreground: "#1a1814",
  accent: "#c8553d",
  muted: "#6b665e",
};

export type ThemePreset = {
  id: string;
  name: string;
  description: string;
  colors: ThemeColors;
};

export const PRESETS: ThemePreset[] = [
  {
    id: "default",
    name: "Default",
    description: "Warm cream + Spokane red — DearPOS out of the box.",
    colors: DEFAULT_COLORS,
  },
  {
    id: "warm",
    name: "Warm café",
    description: "Soft beige with terracotta accents — for cafés and bakeries.",
    colors: {
      background: "#fbf3e8",
      foreground: "#2a1f15",
      accent: "#a85a2c",
      muted: "#7a6a55",
    },
  },
  {
    id: "midnight",
    name: "Midnight",
    description: "Dark slate with electric blue — for evening service.",
    colors: {
      background: "#13161c",
      foreground: "#f3f4f6",
      accent: "#4ea8de",
      muted: "#8b91a0",
    },
  },
  {
    id: "forest",
    name: "Forest",
    description: "Cool greens — feels like a Spokane summer evening.",
    colors: {
      background: "#f3f5ef",
      foreground: "#1d2a1a",
      accent: "#3a7a3f",
      muted: "#5e6a55",
    },
  },
  {
    id: "ocean",
    name: "Ocean",
    description: "Pale blue with deep teal — coastal feel.",
    colors: {
      background: "#f1f6f7",
      foreground: "#0f2a30",
      accent: "#1f8190",
      muted: "#5a737a",
    },
  },
  {
    id: "rose",
    name: "Rose",
    description: "Soft pink with deep wine accent — boutique tastefully.",
    colors: {
      background: "#fbf2f3",
      foreground: "#2a1318",
      accent: "#8e2c3f",
      muted: "#7a5e64",
    },
  },
];

export function getPreset(id: string | undefined): ThemePreset {
  return PRESETS.find((p) => p.id === id) ?? PRESETS[0]!;
}

// Resolves the final colors and logo for a business, layering overrides on
// top of a preset on top of defaults.
export function resolveTheme(input: {
  logoUrl?: string | null;
  theme?: unknown;
}): { colors: ThemeColors; presetId: string; logoUrl: string | null } {
  const json = parseThemeJson(input.theme);
  const preset = getPreset(json.preset);
  return {
    presetId: preset.id,
    colors: { ...preset.colors, ...(json.colors ?? {}) },
    logoUrl: input.logoUrl ?? null,
  };
}

export function parseThemeJson(raw: unknown): BusinessThemeJson {
  if (!raw || typeof raw !== "object") return {};
  const obj = raw as Record<string, unknown>;
  const out: BusinessThemeJson = {};
  if (typeof obj.preset === "string") out.preset = obj.preset;
  if (obj.colors && typeof obj.colors === "object") {
    const c = obj.colors as Record<string, unknown>;
    const colors: Partial<ThemeColors> = {};
    for (const key of ["background", "foreground", "accent", "muted"] as const) {
      if (typeof c[key] === "string" && isHex(c[key] as string)) {
        colors[key] = c[key] as string;
      }
    }
    if (Object.keys(colors).length > 0) out.colors = colors;
  }
  return out;
}

export function isHex(value: string): boolean {
  return /^#[0-9a-fA-F]{3,8}$/.test(value);
}

// Build the inline style object that re-declares the four CSS vars.
export function themeStyleVars(
  colors: ThemeColors,
): Record<string, string> {
  return {
    "--color-background": colors.background,
    "--color-foreground": colors.foreground,
    "--color-accent": colors.accent,
    "--color-muted": colors.muted,
  };
}
