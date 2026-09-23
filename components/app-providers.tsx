"use client";

import { useDavinciUnlock } from "@/hooks/use-davinci-unlock";

/** Global listeners (Konami unlock) that should work on every route. */
export function AppProviders({ children }: { children: React.ReactNode }) {
  useDavinciUnlock();
  return children;
}
