"use client";

import { Component, type ReactNode, useState } from "react";

export function watchContextLoss(
  canvas: HTMLCanvasElement,
  onContextLost: (() => void) | undefined,
) {
  if (!onContextLost) return;
  const onLost = (event: Event) => {
    event.preventDefault();
    onContextLost();
  };
  canvas.addEventListener("webglcontextlost", onLost);
}

export function SceneFallback({
  title,
  detail,
  tone,
  onRetry,
}: {
  title: string;
  detail: string;
  tone: "night" | "parchment";
  onRetry: () => void;
}) {
  const parchment = tone === "parchment";
  return (
    <div
      className={`flex h-full w-full flex-col items-center justify-center gap-4 px-6 text-center ${
        parchment ? "bg-[#dfcdad] text-[#5c3b1e]" : "bg-[#07080d] text-[#f3efe6]"
      }`}
    >
      <p className={parchment ? "text-lg italic" : "text-sm tracking-[0.18em] uppercase"}>
        {title}
      </p>
      <p className={`max-w-sm text-sm ${parchment ? "text-[#5c3b1e]/80" : "text-white/60"}`}>
        {detail}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className={`rounded-full border px-4 py-2 text-sm ${
          parchment
            ? "border-[#5c3b1e]/30 bg-[#5c3b1e]/10 hover:bg-[#5c3b1e]/15"
            : "border-white/15 bg-white/10 text-white hover:bg-white/15"
        }`}
      >
        Try again
      </button>
    </div>
  );
}

interface SceneErrorBoundaryProps {
  title: string;
  detail: string;
  tone: "night" | "parchment";
  onRetry: () => void;
  children: ReactNode;
}

interface SceneErrorBoundaryState {
  error: Error | null;
}

export class SceneErrorBoundary extends Component<
  SceneErrorBoundaryProps,
  SceneErrorBoundaryState
> {
  state: SceneErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): SceneErrorBoundaryState {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <SceneFallback
          title={this.props.title}
          detail={this.props.detail}
          tone={this.props.tone}
          onRetry={this.props.onRetry}
        />
      );
    }
    return this.props.children;
  }
}

export function GuardedScene({
  title,
  detail,
  tone,
  children,
}: {
  title: string;
  detail: string;
  tone: "night" | "parchment";
  children: (onContextLost: () => void) => ReactNode;
}) {
  const [generation, setGeneration] = useState(0);
  const [lost, setLost] = useState(false);
  const retry = () => {
    setLost(false);
    setGeneration((value) => value + 1);
  };

  if (lost) {
    return <SceneFallback title={title} detail={detail} tone={tone} onRetry={retry} />;
  }

  return (
    <SceneErrorBoundary key={generation} title={title} detail={detail} tone={tone} onRetry={retry}>
      {children(() => setLost(true))}
    </SceneErrorBoundary>
  );
}
