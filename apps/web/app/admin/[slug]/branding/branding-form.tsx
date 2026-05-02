"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import {
  PRESETS,
  type ThemeColors,
  isHex,
  themeStyleVars,
  getPreset,
} from "@/lib/themes";
import {
  removeLogo,
  resetTheme,
  updateTheme,
  uploadLogo,
} from "./actions";

const COLOR_KEYS = [
  { id: "background", label: "Background", hint: "Main page background" },
  { id: "foreground", label: "Text", hint: "Body and heading copy" },
  { id: "accent", label: "Accent", hint: "Primary buttons + highlights" },
  { id: "muted", label: "Muted", hint: "Subtitles + captions" },
] as const;

export function BrandingForm({
  slug,
  businessName,
  initialPresetId,
  initialColors,
  initialLogoUrl,
}: {
  slug: string;
  businessName: string;
  initialPresetId: string;
  initialColors: ThemeColors;
  initialLogoUrl: string | null;
}) {
  const [presetId, setPresetId] = useState(initialPresetId);
  const [colors, setColors] = useState<ThemeColors>(initialColors);
  const [logoUrl, setLogoUrl] = useState<string | null>(initialLogoUrl);
  const [pending, start] = useTransition();
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function applyPreset(id: string) {
    const preset = getPreset(id);
    setPresetId(id);
    setColors(preset.colors);
    setError(null);
  }

  function setColor(key: keyof ThemeColors, value: string) {
    setColors((prev) => ({ ...prev, [key]: value }));
    setError(null);
  }

  function save() {
    for (const k of ["background", "foreground", "accent", "muted"] as const) {
      if (!isHex(colors[k])) {
        setError(`${k} is not a valid hex color`);
        return;
      }
    }
    start(async () => {
      try {
        await updateTheme({ slug, presetId, colors });
        setSavedAt(Date.now());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save");
      }
    });
  }

  function reset() {
    if (
      !confirm("Reset to the Default preset? This clears all color overrides.")
    )
      return;
    start(async () => {
      const def = getPreset("default");
      setPresetId(def.id);
      setColors(def.colors);
      try {
        await resetTheme({ slug });
        setSavedAt(Date.now());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not reset");
      }
    });
  }

  function uploadFromInput() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.set("slug", slug);
    fd.set("logo", file);
    start(async () => {
      const result = await uploadLogo(fd);
      if (!result.ok) {
        setError(result.error ?? "Upload failed");
        return;
      }
      // Server revalidated the layout already; pull a cache-buster URL so the
      // new image renders without a hard refresh.
      setLogoUrl(`/uploads/cachebust?t=${Date.now()}`);
      // Read it back fresh on next render via setTimeout so revalidation lands.
      setTimeout(() => window.location.reload(), 200);
    });
  }

  function deleteLogo() {
    if (!confirm("Remove the logo?")) return;
    start(async () => {
      try {
        await removeLogo({ slug });
        setLogoUrl(null);
        setSavedAt(Date.now());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not remove logo");
      }
    });
  }

  const previewStyle = themeStyleVars(colors);

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
      <section className="space-y-8">
        <Card title="Logo">
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-lg border border-[color:var(--color-foreground)]/15 bg-[color:var(--color-background)]">
              {logoUrl ? (
                <Image
                  src={logoUrl}
                  alt="Logo preview"
                  width={80}
                  height={80}
                  unoptimized
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-xs text-[color:var(--color-muted)]">
                  no logo
                </span>
              )}
            </div>
            <div className="flex-1">
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={uploadFromInput}
                className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[color:var(--color-foreground)] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[color:var(--color-background)] hover:file:opacity-90"
              />
              <p className="mt-1 text-xs text-[color:var(--color-muted)]">
                PNG, JPEG, WEBP or SVG · 1.5 MB max
              </p>
              {logoUrl && (
                <button
                  onClick={deleteLogo}
                  disabled={pending}
                  className="mt-2 text-xs text-rose-700 underline-offset-4 hover:underline disabled:opacity-50"
                >
                  Remove logo
                </button>
              )}
            </div>
          </div>
        </Card>

        <Card title="Theme preset">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
            {PRESETS.map((p) => {
              const active = p.id === presetId;
              return (
                <button
                  key={p.id}
                  onClick={() => applyPreset(p.id)}
                  className={`rounded-xl border p-3 text-left transition ${
                    active
                      ? "border-[color:var(--color-accent)] ring-2 ring-[color:var(--color-accent)]/30"
                      : "border-[color:var(--color-foreground)]/15 hover:border-[color:var(--color-foreground)]/40"
                  }`}
                >
                  <div className="flex gap-1.5">
                    {(
                      ["background", "foreground", "accent", "muted"] as const
                    ).map((k) => (
                      <span
                        key={k}
                        className="h-6 w-6 rounded-full border border-black/10"
                        style={{ background: p.colors[k] }}
                      />
                    ))}
                  </div>
                  <div className="mt-2 text-sm font-semibold">{p.name}</div>
                  <div className="mt-0.5 text-xs text-[color:var(--color-muted)]">
                    {p.description}
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        <Card title="Section colors">
          <div className="grid gap-3 sm:grid-cols-2">
            {COLOR_KEYS.map(({ id, label, hint }) => (
              <label
                key={id}
                className="rounded-lg border border-[color:var(--color-foreground)]/15 bg-[color:var(--color-background)] p-3"
              >
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-semibold">{label}</span>
                  <span className="text-[10px] uppercase tracking-wider text-[color:var(--color-muted)]">
                    {hint}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="color"
                    value={colors[id]}
                    onChange={(e) => setColor(id, e.target.value)}
                    className="h-9 w-12 cursor-pointer rounded border border-[color:var(--color-foreground)]/15"
                  />
                  <input
                    type="text"
                    value={colors[id]}
                    onChange={(e) => setColor(id, e.target.value)}
                    className="block w-28 rounded-md border border-[color:var(--color-foreground)]/15 bg-white/60 px-2 py-1 font-mono text-sm focus:border-[color:var(--color-accent)] focus:outline-none"
                  />
                </div>
              </label>
            ))}
          </div>
        </Card>

        {error && (
          <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-900">
            {error}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            onClick={save}
            disabled={pending}
            className="rounded-lg bg-[color:var(--color-foreground)] px-5 py-2.5 text-sm font-semibold text-[color:var(--color-background)] disabled:opacity-50"
          >
            {pending ? "Saving…" : "Save theme"}
          </button>
          <button
            onClick={reset}
            disabled={pending}
            className="rounded-lg border border-[color:var(--color-foreground)]/15 px-5 py-2.5 text-sm font-medium hover:bg-[color:var(--color-foreground)]/5 disabled:opacity-50"
          >
            Reset to default
          </button>
          {savedAt && (
            <span className="self-center text-xs text-emerald-700">
              Saved · refresh other tabs to see it
            </span>
          )}
        </div>
      </section>

      <aside className="lg:sticky lg:top-6">
        <div
          style={previewStyle}
          className="overflow-hidden rounded-xl border border-[color:var(--color-foreground)]/15 shadow-sm"
        >
          <div className="bg-[var(--color-background)] p-5 text-[color:var(--color-foreground)]">
            <div className="flex items-center gap-3">
              {logoUrl && (
                <Image
                  src={logoUrl}
                  alt=""
                  width={40}
                  height={40}
                  unoptimized
                  className="h-10 w-10 rounded-md object-cover"
                />
              )}
              <div>
                <div className="text-sm font-semibold">{businessName}</div>
                <div className="text-xs text-[color:var(--color-muted)]">
                  Live preview
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-lg border border-[color:var(--color-foreground)]/10 bg-white/60 p-4">
              <div className="text-xs uppercase tracking-wider text-[color:var(--color-muted)]">
                Order
              </div>
              <div className="mt-1 text-2xl font-semibold tabular-nums">
                $24.50
              </div>
              <div className="mt-2 text-sm text-[color:var(--color-muted)]">
                12oz oat latte · extra shot
              </div>
              <button
                disabled
                className="mt-4 w-full rounded-lg bg-[color:var(--color-accent)] py-2 text-sm font-semibold text-white"
              >
                Charge $24.50
              </button>
            </div>

            <p className="mt-3 text-xs text-[color:var(--color-muted)]">
              Body copy uses the muted color · headings stay foreground.
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-[color:var(--color-foreground)]/10 bg-white/40 p-5">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[color:var(--color-muted)]">
        {title}
      </h3>
      {children}
    </div>
  );
}
