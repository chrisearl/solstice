"use client";

import { DavinciOrreryScene, type DavinciOrrerySceneProps } from "@/components/davinci-orrery-scene";

export default function DavinciOrreryView(props: DavinciOrrerySceneProps) {
  return (
    <div className="relative h-full w-full overflow-hidden text-[#36220f] select-none">
      <div className="davinci-parchment-bg" aria-hidden="true" />
      <DavinciOrreryScene {...props} />
      <div className="davinci-vignette" />
    </div>
  );
}
