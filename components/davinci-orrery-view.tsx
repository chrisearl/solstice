"use client";

import { DavinciOrreryScene, type DavinciOrrerySceneProps } from "@/components/davinci-orrery-scene";

export default function DavinciOrreryView(props: DavinciOrrerySceneProps) {
  return (
    <div className="relative h-full w-full overflow-hidden bg-[#dfcdad] text-[#36220f] select-none">
      <DavinciOrreryScene {...props} />
      <div className="davinci-vignette" />
      <div className="davinci-paper" />
    </div>
  );
}
