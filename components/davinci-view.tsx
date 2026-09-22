"use client";

import { DavinciScene, type DavinciSceneProps } from "@/components/davinci-scene";

export default function DavinciView(props: DavinciSceneProps) {
  return (
    <div className="relative h-full w-full overflow-hidden bg-[#dfcdad] text-[#36220f] select-none">
      <DavinciScene {...props} />
      <div className="davinci-vignette" />
      <div className="davinci-paper" />
    </div>
  );
}
