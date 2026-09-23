"use client";

import { DavinciScene, type DavinciSceneProps } from "@/components/davinci-scene";

export default function DavinciView(props: DavinciSceneProps) {
  return (
    <div className="relative h-full w-full overflow-hidden text-[#36220f] select-none">
      <div className="davinci-parchment-bg" aria-hidden="true" />
      <DavinciScene {...props} />
      <div className="davinci-vignette" />
    </div>
  );
}
