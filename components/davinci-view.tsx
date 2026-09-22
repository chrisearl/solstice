"use client";

import { Cinzel, IM_Fell_English, Nanum_Pen_Script } from "next/font/google";
import { DavinciScene, type DavinciSceneProps } from "@/components/davinci-scene";

const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["500", "700"],
});

const imFell = IM_Fell_English({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

const nanumPen = Nanum_Pen_Script({
  subsets: ["latin"],
  weight: "400",
});

export default function DavinciView(props: DavinciSceneProps) {
  return (
    <div className={`relative h-full w-full overflow-hidden bg-[#dfcdad] text-[#36220f] select-none ${imFell.className}`}>
      <DavinciScene {...props} />
      <div className="davinci-vignette" />
      <div className="davinci-paper" />

      <header className="pointer-events-none absolute top-4 left-6 z-10 max-w-[min(36rem,calc(100%-2rem))]">
        <div className="border-b border-[#6c4826]/40 pb-2">
          <h1
            className={`${cinzel.className} text-2xl font-bold tracking-widest text-[#412712] uppercase drop-shadow-sm md:text-3xl`}
          >
            Codice Celeste
          </h1>
          <p className="mt-0.5 text-sm text-[#613f1c] italic md:text-base">
            Studi di sfumato e tratteggio sui corpi sperici — Leonardo da Vinci, c. 1508
          </p>
        </div>
        <p className={`${nanumPen.className} mt-2 hidden text-xl text-[#523315] opacity-85 rotate-[-1deg] sm:block`}>
          « La spera solare riluce senza termine, et l&apos;ombra si risolve in linee sottilissime »
        </p>
      </header>

      <div className="pointer-events-none absolute bottom-32 left-6 z-10 hidden max-w-xs text-[#53371a] opacity-85 lg:block">
        <div className={`${nanumPen.className} border-l-2 border-[#765431]/40 pl-3 text-2xl leading-none`}>
          Primo grado: linea pura.
          <br />
          Secondo grado: tratteggio incrociato a 45°.
          <br />
          Terzo grado: dense tenebre in bistro d&apos;inchiostro.
        </div>
      </div>
    </div>
  );
}
