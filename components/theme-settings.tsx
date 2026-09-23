"use client";

import { Check, Lock, MoonStar, Palette, Sparkles } from "lucide-react";
import { useSyncExternalStore } from "react";
import type { StudioTheme } from "@/lib/studio-view";
import {
  readStudioThemePreference,
  subscribeStudioTheme,
  writeStudioThemePreference,
} from "@/lib/studio-theme-preference";

interface ThemeSettingsProps {
  theme: StudioTheme;
  davinciUnlocked: boolean;
  onTheme: (theme: StudioTheme) => void;
}

interface ThemeOption {
  id: StudioTheme;
  title: string;
  subtitle: string;
  preview: string;
  icon: typeof MoonStar;
  locked?: boolean;
}

const BASE_OPTIONS: ThemeOption[] = [
  {
    id: "default",
    title: "Night Sky",
    subtitle: "Liquid glass HUD over a dark starfield",
    preview: "linear-gradient(145deg, #0a0c14 0%, #141a28 45%, #07080d 100%)",
    icon: MoonStar,
  },
];

const DAVINCI_OPTION: ThemeOption = {
  id: "davinci",
  title: "Da Vinci",
  subtitle: "Sepia ink codex on aged parchment",
  preview: "linear-gradient(145deg, #f4e8d1 0%, #dfcdad 55%, #c9b08a 100%)",
  icon: Palette,
};

export function ThemeSettings({ theme, davinciUnlocked, onTheme }: ThemeSettingsProps) {
  const storedTheme = useSyncExternalStore(
    subscribeStudioTheme,
    readStudioThemePreference,
    () => null,
  );
  const activeTheme = theme ?? storedTheme ?? "default";

  const handleSelect = (next: StudioTheme) => {
    if (next === "davinci" && !davinciUnlocked) return;
    writeStudioThemePreference(next);
    onTheme(next);
  };

  const options = davinciUnlocked ? [...BASE_OPTIONS, DAVINCI_OPTION] : BASE_OPTIONS;

  return (
    <section className="space-y-3" aria-labelledby="theme-settings-heading">
      <div>
        <h2
          id="theme-settings-heading"
          className="font-display text-xl tracking-tight text-[#f6f1e7] md:text-2xl"
        >
          Appearance
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-white/55">
          Choose how Solstice renders the astrolabe and orrery.
        </p>
      </div>

      <div
        role="radiogroup"
        aria-label="Studio theme"
        className="grid gap-2 sm:grid-cols-2"
      >
        {options.map((option) => {
          const selected = activeTheme === option.id;
          const Icon = option.icon;
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => handleSelect(option.id)}
              className={`group relative flex min-h-[88px] w-full flex-col overflow-hidden rounded-2xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0b429] ${
                selected
                  ? "border-[#f0b429]/50 bg-white/[0.08] shadow-[0_12px_40px_rgba(0,0,0,0.35)]"
                  : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]"
              }`}
            >
              <div
                aria-hidden="true"
                className="absolute inset-0 opacity-80"
                style={{ background: option.preview }}
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_20%,rgba(7,8,13,0.88)_100%)]" />
              <div className="relative flex flex-1 flex-col justify-end gap-1">
                <div className="flex items-center gap-2">
                  <Icon className="size-4 shrink-0 text-[#f0b429]" />
                  <span className="text-sm font-medium tracking-wide text-[#f6f1e7]">
                    {option.title}
                  </span>
                  {selected && (
                    <span className="ml-auto flex size-6 items-center justify-center rounded-full bg-[#f0b429] text-[#1b1406]">
                      <Check className="size-3.5" aria-hidden="true" />
                    </span>
                  )}
                </div>
                <p className="text-xs leading-snug text-white/60">{option.subtitle}</p>
              </div>
            </button>
          );
        })}
      </div>

      {!davinciUnlocked && (
        <div className="rounded-2xl border border-dashed border-white/12 bg-white/[0.02] px-4 py-3">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/40">
              <Lock className="size-4 text-white/45" aria-hidden="true" />
            </div>
            <div className="min-w-0 space-y-1">
              <p className="flex items-center gap-1.5 text-sm font-medium text-[#f6f1e7]">
                <Sparkles className="size-3.5 text-[#f0b429]" aria-hidden="true" />
                Da Vinci codex
              </p>
              <p className="text-sm leading-relaxed text-white/50">
                A hidden sepia ink theme awaits discovery. Explore the studio — some secrets reveal
                themselves only to the persistent.
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
