"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { ThemeSettings } from "@/components/theme-settings";
import { useDavinciUnlocked } from "@/hooks/use-davinci-unlock";
import { resolveStudioView, type StudioTheme } from "@/lib/studio-view";
import {
  readStudioThemePreference,
  writeStudioThemePreference,
} from "@/lib/studio-theme-preference";

interface SettingsViewProps {
  initialTheme?: StudioTheme;
  returnQuery?: string;
}

export function SettingsView({ initialTheme, returnQuery = "" }: SettingsViewProps) {
  const [theme, setThemeState] = useState<StudioTheme>(
    () => initialTheme ?? readStudioThemePreference() ?? "default",
  );
  const davinciUnlocked = useDavinciUnlocked();

  const resolved = resolveStudioView("astrolabe", theme, davinciUnlocked);
  const parchment = resolved.theme === "davinci";

  const handleTheme = useCallback(
    (next: StudioTheme) => {
      const safe = next === "davinci" && !davinciUnlocked ? "default" : next;
      writeStudioThemePreference(safe);
      setThemeState(safe);
    },
    [davinciUnlocked],
  );

  const homeHref = useMemo(() => {
    const params = new URLSearchParams(returnQuery);
    if (theme !== "default") params.set("theme", theme);
    else params.delete("theme");
    const query = params.toString();
    return query ? `/?${query}` : "/";
  }, [returnQuery, theme]);

  return (
    <div
      className={`relative min-h-dvh w-full ${
        parchment ? "bg-[#dfcdad] text-[#3a2310]" : "bg-[#07080d] text-[#f3efe6]"
      }`}
    >
      {parchment && <div className="davinci-parchment-bg" aria-hidden="true" />}
      {!parchment && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(240,180,41,0.08),transparent_55%)]"
        />
      )}

      <div
        className="relative mx-auto flex min-h-dvh w-full max-w-lg flex-col px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] pt-[calc(0.75rem+env(safe-area-inset-top,0px))] md:px-6 md:pt-[calc(1rem+env(safe-area-inset-top,0px))]"
        data-chrome={parchment ? "parchment" : undefined}
      >
        <header className="sticky top-[env(safe-area-inset-top,0px)] z-10 -mx-4 mb-6 px-4 py-2 backdrop-blur-md md:-mx-6 md:px-6">
          <div className="flex items-center gap-3">
            <Link
              href={homeHref}
              className={`flex size-11 shrink-0 items-center justify-center rounded-full border shadow-lg backdrop-blur-md focus-visible:outline-none focus-visible:ring-2 ${
                parchment
                  ? "border-[#9b764b]/50 bg-[#f4e8d1]/92 text-[#3a2310] shadow-[#422d1b]/20 hover:bg-[#efe2cc] focus-visible:ring-[#5c3b1e]"
                  : "border-white/10 bg-black/55 text-white shadow-black/30 hover:bg-white/10 focus-visible:ring-[#f0b429]"
              }`}
              aria-label="Back to studio"
            >
              <ArrowLeft className="size-5" />
            </Link>
            <div className="min-w-0">
              <p className="text-[11px] tracking-[0.18em] text-white/45 uppercase">Solstice</p>
              <h1
                className={`font-display text-2xl leading-tight tracking-tight ${
                  parchment ? "text-[#3a2310]" : "text-[#f6f1e7]"
                }`}
              >
                Settings
              </h1>
            </div>
          </div>
        </header>

        <main className="flex flex-1 flex-col gap-8">
          <ThemeSettings
            theme={resolved.theme}
            davinciUnlocked={davinciUnlocked}
            onTheme={handleTheme}
          />

          <section className="space-y-2 border-t border-white/10 pt-6">
            <h2
              className={`font-display text-lg tracking-tight ${
                parchment ? "text-[#3a2310]" : "text-[#f6f1e7]"
              }`}
            >
              About themes
            </h2>
            <p className="text-sm leading-relaxed text-white/50">
              The astrolabe and orrery views keep their own model toggle on the studio page. Theme
              changes apply to both appliances and follow you through shared links via the address
              bar.
            </p>
          </section>
        </main>
      </div>
    </div>
  );
}
