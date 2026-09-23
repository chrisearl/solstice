"use client";

import { useEffect } from "react";

export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-4 bg-[#07080d] px-6 text-center text-[#f3efe6]">
      <p className="text-lg">The sky chart hit a problem.</p>
      <button
        type="button"
        onClick={() => retry()}
        className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/15"
      >
        Try again
      </button>
    </div>
  );
}
