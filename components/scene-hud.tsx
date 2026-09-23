"use client";

import { RotateCcw, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ChromeTone } from "@/lib/light";
import type { LayoutInsets } from "@/lib/layout-insets";

interface SceneHudProps {
  inspectorOpen: boolean;
  variant?: "full" | "minimal";
  desktopChrome?: boolean;
  layoutInsets?: LayoutInsets;
  tone?: ChromeTone;
  onResetView: () => void;
  onToggleInspector: () => void;
}

/** Top-corner menu chrome — metrics and timeline live in StudioSheet. */
export function SceneHud(props: SceneHudProps) {
  const hudTopClass = "pt-[calc(0.75rem+env(safe-area-inset-top,0px))]";

  if (props.variant === "minimal") {
    return (
      <div className={`pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-end px-3 ${hudTopClass}`}>
        <div className="pointer-events-auto flex gap-1.5">
          <HudAction label="Reset camera" onClick={props.onResetView}>
            <RotateCcw />
          </HudAction>
        </div>
      </div>
    );
  }

  const menuCorner = (
    <div className="pointer-events-auto flex shrink-0 gap-1.5">
      <HudAction label="Reset camera" onClick={props.onResetView} className="hidden sm:inline-flex">
        <RotateCcw />
      </HudAction>
      <HudAction
        label={props.inspectorOpen ? "Close inspector" : "Open inspector"}
        pressed={props.inspectorOpen}
        onClick={props.onToggleInspector}
        className={props.desktopChrome ? "lg:hidden" : ""}
      >
        <Settings2 />
      </HudAction>
    </div>
  );

  if (props.desktopChrome && props.layoutInsets) {
    return (
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-end ${hudTopClass}`}
        style={{
          paddingLeft: props.layoutInsets.left,
          paddingRight: props.layoutInsets.right,
        }}
      >
        <div className="pointer-events-auto px-3">{menuCorner}</div>
      </div>
    );
  }

  return (
    <div className={`pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-end px-3 ${hudTopClass} md:px-4`}>
      {menuCorner}
    </div>
  );
}

function HudAction({
  children,
  label,
  pressed,
  onClick,
  className = "",
}: {
  children: React.ReactNode;
  label: string;
  pressed?: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <Button
      type="button"
      size="icon"
      variant="outline"
      aria-label={label}
      aria-pressed={pressed}
      onClick={onClick}
      className={`chrome-surface size-11 border-white/10 bg-black/45 text-white backdrop-blur-md hover:bg-white/10 ${pressed ? "border-[#f0b429]/40 bg-[#f0b429]/15" : ""} ${className}`}
    >
      {children}
    </Button>
  );
}
