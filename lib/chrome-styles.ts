/** Frosted “liquid glass” chrome for the default night sky theme. */
export function liquidGlassToggleClass(active: boolean): string {
  const base =
    "flex h-11 shrink-0 items-center gap-2 rounded-full border px-3.5 shadow-lg backdrop-blur-md focus-visible:outline-none focus-visible:ring-2";
  return active
    ? `${base} border-[#f0b429]/40 bg-white/15 text-white shadow-black/30 focus-visible:ring-[#f0b429]`
    : `${base} border-white/10 bg-black/55 text-white/70 shadow-black/30 hover:bg-white/10 focus-visible:ring-[#f0b429]`;
}

export function liquidGlassIconButtonClass(): string {
  return "flex size-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/55 text-white shadow-lg shadow-black/30 backdrop-blur-md hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0b429]";
}

/** Sepia ink codex chrome for the Da Vinci theme. */
export function sepiaInkToggleClass(active: boolean): string {
  const base =
    "flex h-11 shrink-0 items-center gap-2 rounded-full border px-3.5 shadow-lg backdrop-blur-md focus-visible:outline-none focus-visible:ring-2";
  return active
    ? `${base} border-[#5c3b1e]/60 bg-[#e8d4b4] text-[#3a2310] shadow-[#422d1b]/20 focus-visible:ring-[#5c3b1e]`
    : `${base} border-[#9b764b]/50 bg-[#f4e8d1]/92 text-[#3a2310]/70 shadow-[#422d1b]/20 hover:bg-[#efe2cc] focus-visible:ring-[#5c3b1e]`;
}

export function sepiaInkIconButtonClass(): string {
  return "flex size-11 shrink-0 items-center justify-center rounded-full border border-[#9b764b]/50 bg-[#f4e8d1]/92 text-[#3a2310] shadow-lg shadow-[#422d1b]/20 backdrop-blur-md hover:bg-[#efe2cc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5c3b1e]";
}

export function chromeToggleClass(parchment: boolean, active: boolean): string {
  return parchment ? sepiaInkToggleClass(active) : liquidGlassToggleClass(active);
}

export function chromeIconButtonClass(parchment: boolean): string {
  return parchment ? sepiaInkIconButtonClass() : liquidGlassIconButtonClass();
}
