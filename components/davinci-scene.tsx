"use client";

import { Html, Line, OrbitControls } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  type ComponentRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as THREE from "three";
import { FrameCamera } from "@/components/frame-camera";
import { watchContextLoss } from "@/components/scene-boundary";
import { readLiveBodies, useSolarMotion } from "@/components/solar-motion";
import { createAppliancePoints } from "@/lib/scene-framing";
import {
  DAVINCI_HATCH_DENSITY,
  DAVINCI_HATCH_WEIGHT,
  davinciFragmentShader,
  davinciVertexShader,
} from "@/lib/davinci-shader";
import type { LayoutInsets } from "@/lib/layout-insets";
import {
  ARC_HIERARCHY,
  DISC_RADIUS,
  GNOMON_HEIGHT,
  MOON_ARC_DOT,
  SKY_RADIUS,
  fadedPathSegments,
  project,
  splitPathRuns,
  type AzimuthFan,
  type HorizonMarks,
  type MoonPlacement,
  type SkyPath,
  type SolarArc,
  type SunPlacement,
  type Vec3,
} from "@/lib/solar";

const INK = "#3a2412";
const PAPER = "#dfcdad";
const CODEX_APPLIANCE_POINTS = createAppliancePoints(0.7);

const CARDINALS = [
  ["N", 0],
  ["E", 90],
  ["S", 180],
  ["W", 270],
] as const;

export interface DavinciSceneProps {
  active: boolean;
  arcs: SolarArc[];
  horizon: HorizonMarks;
  sun: SunPlacement;
  moon: MoonPlacement;
  moonArc: SkyPath;
  showSun: boolean;
  showMoon: boolean;
  resetSignal: number;
  layoutInsets: LayoutInsets;
  onContextLost?: () => void;
}

export function DavinciScene({
  active,
  arcs,
  horizon,
  sun,
  moon,
  moonArc,
  showSun,
  showMoon,
  resetSignal,
  layoutInsets,
  onContextLost,
}: DavinciSceneProps) {
  const reducedMotion = usePrefersReducedMotion();

  return (
    <Canvas
      className="absolute inset-0"
      camera={{ position: [10.8, 6.4, 13.2], fov: 38, near: 0.1, far: 200 }}
      dpr={[1, 2]}
      frameloop={active ? "always" : "never"}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
      }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.NoToneMapping;
        gl.setClearColor(PAPER);
        watchContextLoss(gl.domElement, onContextLost);
      }}
    >
      <color attach="background" args={[PAPER]} />
      <InkInstrument
        arcs={arcs}
        horizon={horizon}
        sun={sun}
        moon={moon}
        moonArc={moonArc}
        showSun={showSun}
        showMoon={showMoon}
        resetSignal={resetSignal}
        layoutInsets={layoutInsets}
        reducedMotion={reducedMotion}
      />
    </Canvas>
  );
}

function InkInstrument({
  arcs,
  horizon,
  sun,
  moon,
  moonArc,
  showSun,
  showMoon,
  resetSignal,
  layoutInsets,
  reducedMotion,
}: Omit<DavinciSceneProps, "active"> & { reducedMotion: boolean }) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);

  return (
    <>
      <group>
        <InkCompass />
        {showSun && <InkHorizon horizon={horizon} />}
        <InkGnomon />
        {showSun && <InkShadowRig sun={sun} />}
        {showSun &&
          arcs.map((arc) => <InkSkyArc key={arc.id} arc={arc} variant={arc.id} />)}
        {showMoon && <InkSkyArc arc={moonArc} variant="moon" />}
        {showSun && <InkOrb track="sun" sun={sun} moon={moon} />}
        {showMoon && <InkOrb track="moon" sun={sun} moon={moon} />}
      </group>
      <OrbitControls
        ref={controls}
        enableDamping={!reducedMotion}
        dampingFactor={0.08}
        enablePan
        enableRotate
        minDistance={3.4}
        maxDistance={48}
        minPolarAngle={0.12}
        maxPolarAngle={Math.PI * 0.56}
        target={[0, 0.75, 0]}
        zoomSpeed={0.7}
        rotateSpeed={reducedMotion ? 0.9 : 0.75}
      />
      <FrameCamera
        resetSignal={resetSignal}
        controls={controls}
        layoutInsets={layoutInsets}
        appliancePoints={CODEX_APPLIANCE_POINTS}
      />
    </>
  );
}

function InkCompass() {
  const ticks = useMemo(() => {
    const pairs: [number, number, number][] = [];
    for (let bearing = 0; bearing < 360; bearing += 10) {
      const major = bearing % 90 === 0;
      const mid = bearing % 30 === 0;
      const inner = DISC_RADIUS * (major ? 0.9 : mid ? 0.945 : 0.968);
      const outer = DISC_RADIUS * 0.995;
      const a = project(bearing, 0, inner);
      const b = project(bearing, 0, outer);
      pairs.push([a.x, 0.03, a.z], [b.x, 0.03, b.z]);
    }
    return pairs;
  }, []);

  return (
    <group>
      <InkRing radius={DISC_RADIUS} y={0.02} lineWidth={1.8} opacity={0.92} />
      <InkRing radius={SKY_RADIUS} y={0.025} lineWidth={1.15} opacity={0.55} />
      <Line
        points={ticks}
        segments
        color={INK}
        lineWidth={1.15}
        transparent
        opacity={0.72}
      />
      {CARDINALS.map(([label, azimuth]) => {
        const point = project(azimuth, 0, DISC_RADIUS + 0.42);
        return (
          <Html
            key={label}
            position={[point.x, 0.04, point.z]}
            center
            distanceFactor={18}
            zIndexRange={[12, 0]}
            style={{ pointerEvents: "none" }}
          >
            <div
              style={{
                color: INK,
                fontSize: 13,
                letterSpacing: "0.16em",
                lineHeight: 1,
              }}
            >
              {label}
            </div>
          </Html>
        );
      })}
    </group>
  );
}

function InkGnomon() {
  const post = useMemo(
    () => [
      { x: 0, y: 0.024, z: 0 },
      { x: 0, y: GNOMON_HEIGHT + 0.008, z: 0 },
    ],
    [],
  );

  return (
    <group renderOrder={5}>
      <InkRing radius={0.14} y={0.024} lineWidth={1.55} opacity={0.9} />
      <InkStroke points={post} lineWidth={1.85} opacity={0.92} />
      <InkRing radius={0.044} y={GNOMON_HEIGHT + 0.012} lineWidth={1.45} opacity={0.94} />
    </group>
  );
}

function InkShadowRig({ sun }: { sun: SunPlacement }) {
  const motion = useSolarMotion();
  const ray = useRef<ComponentRef<typeof Line>>(null);
  const shadow = useRef<ComponentRef<typeof Line>>(null);
  const tip = useRef<THREE.Mesh>(null);

  const apply = useCallback((placement: SunPlacement) => {
    const tipPoint = { x: 0, y: GNOMON_HEIGHT, z: 0 };
    const origin = { x: 0, y: 0.045, z: 0 };
    if (ray.current) ray.current.visible = placement.aboveHorizon;
    writeSegment(ray.current, placement.position, tipPoint);
    const mark = placement.shadow;
    if (shadow.current) shadow.current.visible = Boolean(mark);
    if (mark) writeSegment(shadow.current, origin, mark);
    if (tip.current) {
      tip.current.visible = Boolean(mark);
      if (mark) tip.current.position.set(mark.x, 0.048, mark.z);
    }
  }, []);

  useLayoutEffect(() => {
    if (motion.playing.current) return;
    apply(sun);
  }, [apply, motion, sun]);

  useFrame(() => {
    if (!motion.playing.current) return;
    apply(readLiveBodies(motion).sun);
  });

  return (
    <group renderOrder={4}>
      <Line
        ref={ray}
        points={SEGMENT}
        color={INK}
        lineWidth={1.05}
        dashed
        dashSize={0.12}
        gapSize={0.14}
        transparent
        opacity={0.38}
        depthWrite={false}
      />
      <Line
        ref={shadow}
        points={SEGMENT}
        color={INK}
        lineWidth={2.05}
        transparent
        opacity={0.88}
        depthWrite={false}
      />
      <mesh ref={tip} rotation={[-Math.PI / 2, 0, 0]} renderOrder={4}>
        <circleGeometry args={[0.05, 20]} />
        <meshBasicMaterial
          color={INK}
          transparent
          opacity={0.82}
          toneMapped={false}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

function InkHorizon({ horizon }: { horizon: HorizonMarks }) {
  return (
    <group>
      {horizon.riseFan && <InkFan fan={horizon.riseFan} />}
      {horizon.setFan && <InkFan fan={horizon.setFan} />}
      {horizon.sunriseAzimuth != null && <InkAzimuthTick azimuth={horizon.sunriseAzimuth} />}
      {horizon.sunsetAzimuth != null && <InkAzimuthTick azimuth={horizon.sunsetAzimuth} />}
    </group>
  );
}

function InkFan({ fan }: { fan: AzimuthFan }) {
  const inner = DISC_RADIUS * 0.72;
  const outer = DISC_RADIUS * 0.9;
  const outerArc = useMemo(
    () => horizonArc(fan.start, fan.sweep, outer),
    [fan.start, fan.sweep, outer],
  );
  const innerArc = useMemo(
    () => horizonArc(fan.start, fan.sweep, inner),
    [fan.start, fan.sweep, inner],
  );
  const start = useMemo(() => radial(fan.start, inner, outer), [fan.start, inner, outer]);
  const end = useMemo(
    () => radial(fan.start + fan.sweep, inner, outer),
    [fan.start, fan.sweep, inner, outer],
  );

  return (
    <group>
      <InkStroke points={outerArc} lineWidth={1.15} opacity={0.62} />
      <InkStroke points={innerArc} lineWidth={1} opacity={0.42} />
      <InkStroke points={start} lineWidth={1.1} opacity={0.62} />
      <InkStroke points={end} lineWidth={1.1} opacity={0.62} />
    </group>
  );
}

function InkAzimuthTick({ azimuth }: { azimuth: number }) {
  const points = useMemo(() => {
    const inner = project(azimuth, 0, SKY_RADIUS * 0.92);
    const outer = project(azimuth, 0, DISC_RADIUS * 0.995);
    return [
      { x: inner.x, y: 0.036, z: inner.z },
      { x: outer.x, y: 0.036, z: outer.z },
    ];
  }, [azimuth]);
  return <InkStroke points={points} lineWidth={1.7} opacity={0.9} />;
}

function InkSkyArc({
  arc,
  variant,
}: {
  arc: SkyPath;
  variant: SolarArc["id"] | "moon";
}) {
  const style = strokeStyle(variant, arc.emphasized);
  const above = splitPathRuns(arc.points);
  const below = splitPathRuns(arc.underPoints);

  if (variant === "moon") {
    return (
      <group>
        {below.map((points, index) => (
          <InkStroke
            key={`under-${index}`}
            points={points}
            closed={arc.underClosed && below.length === 1}
            dashed
            dashSize={MOON_ARC_DOT.dashSize}
            gapSize={MOON_ARC_DOT.gapSize}
            lineWidth={1}
            opacity={style.opacity * 0.38}
          />
        ))}
        {above.map((points, index) => (
          <InkFadedDottedStroke
            key={`above-${index}`}
            points={points}
            lineWidth={style.lineWidth}
            opacity={style.opacity}
          />
        ))}
      </group>
    );
  }

  return (
    <group>
      {below.map((points, index) => (
        <InkStroke
          key={`under-${index}`}
          points={points}
          closed={arc.underClosed && below.length === 1}
          dashed
          dashSize={0.1}
          gapSize={0.14}
          lineWidth={Math.max(1, style.lineWidth - 0.35)}
          opacity={style.opacity * 0.42}
        />
      ))}
      {above.map((points, index) => (
        <InkStroke
          key={`above-${index}`}
          points={points}
          closed={arc.closed && above.length === 1}
          dashed={style.dashed}
          dashSize={style.dashSize}
          gapSize={style.gapSize}
          lineWidth={style.lineWidth}
          opacity={style.opacity}
        />
      ))}
    </group>
  );
}

function InkOrb({
  track,
  sun,
  moon,
}: {
  track: "sun" | "moon";
  sun: SunPlacement;
  moon: MoonPlacement;
}) {
  const mesh = useRef<THREE.Mesh>(null);
  const material = useRef<THREE.ShaderMaterial>(null);
  const motion = useSolarMotion();
  const uniforms = useMemo(
    () => ({
      uLightDirection: { value: new THREE.Vector3(0.4, 0.7, 0.5).normalize() },
      uInkColor: { value: new THREE.Color("#2b190d") },
      uPaperColor: { value: new THREE.Color(PAPER) },
      uHatchDensity: { value: DAVINCI_HATCH_DENSITY },
      uLineWeight: { value: DAVINCI_HATCH_WEIGHT },
      uIsLightSource: { value: track === "sun" ? 1 : 0 },
    }),
    [track],
  );

  const apply = (nextSun: SunPlacement, nextMoon: MoonPlacement) => {
    const position = track === "sun" ? nextSun.position : nextMoon.position;
    const radius =
      track === "sun"
        ? nextSun.aboveHorizon
          ? nextSun.altitude < 8
            ? 0.4
            : 0.46
          : 0.32
        : nextMoon.aboveHorizon
          ? 0.4
          : 0.3;
    mesh.current?.position.set(position.x, position.y, position.z);
    mesh.current?.scale.setScalar(radius);
    const shader = material.current;
    if (!shader) return;
    if (track === "moon") {
      shader.uniforms.uLightDirection.value.copy(
        lightFromSun(nextMoon.position, nextSun.position),
      );
    }
    shader.uniforms.uHatchDensity.value = DAVINCI_HATCH_DENSITY;
    shader.uniforms.uLineWeight.value = DAVINCI_HATCH_WEIGHT;
  };

  useLayoutEffect(() => {
    if (motion.playing.current) return;
    apply(sun, moon);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [motion, sun, moon, track]);

  useFrame(() => {
    if (!motion.playing.current) return;
    const live = readLiveBodies(motion);
    apply(live.sun, live.moon);
  });

  return (
    <mesh ref={mesh} renderOrder={6}>
      <sphereGeometry args={[1, 48, 48]} />
      <shaderMaterial
        ref={material}
        toneMapped={false}
        uniforms={uniforms}
        vertexShader={davinciVertexShader}
        fragmentShader={davinciFragmentShader}
      />
    </mesh>
  );
}

function InkRing({
  radius,
  y,
  lineWidth,
  opacity,
}: {
  radius: number;
  y: number;
  lineWidth: number;
  opacity: number;
}) {
  const points = useMemo(() => {
    const ring: Vec3[] = [];
    const segments = 160;
    for (let i = 0; i <= segments; i++) {
      const point = project((i / segments) * 360, 0, radius);
      ring.push({ x: point.x, y, z: point.z });
    }
    return ring;
  }, [radius, y]);
  return <InkStroke points={points} lineWidth={lineWidth} opacity={opacity} />;
}

function InkStroke({
  points,
  closed = false,
  dashed = false,
  opacity,
  lineWidth,
  dashSize = 0.16,
  gapSize = 0.1,
}: {
  points: Vec3[];
  closed?: boolean;
  dashed?: boolean;
  opacity: number;
  lineWidth: number;
  dashSize?: number;
  gapSize?: number;
}) {
  const linePoints = useMemo(() => {
    const mapped = points.map((point) => [point.x, point.y, point.z] as [number, number, number]);
    if (closed && mapped.length > 2) {
      const first = mapped[0];
      const last = mapped[mapped.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1] || first[2] !== last[2]) {
        mapped.push([first[0], first[1], first[2]]);
      }
    }
    return mapped;
  }, [closed, points]);

  if (linePoints.length < 2) return null;

  return (
    <Line
      points={linePoints}
      color={INK}
      lineWidth={lineWidth}
      dashed={dashed}
      dashSize={dashSize}
      gapSize={gapSize}
      transparent
      opacity={opacity}
      depthWrite={false}
    />
  );
}

function InkFadedDottedStroke({
  points,
  opacity,
  lineWidth,
}: {
  points: Vec3[];
  opacity: number;
  lineWidth: number;
}) {
  const segments = useMemo(
    () =>
      fadedPathSegments(points, {
        baseOpacity: opacity,
        fadeFraction: MOON_ARC_DOT.fadeFraction,
      }),
    [opacity, points],
  );

  return segments.map((segment, index) => (
    <Line
      key={index}
      points={segment.points.map((point) => [point.x, point.y, point.z] as [number, number, number])}
      color={INK}
      lineWidth={lineWidth}
      dashed
      dashSize={MOON_ARC_DOT.dashSize}
      gapSize={MOON_ARC_DOT.gapSize}
      transparent
      opacity={segment.opacity}
      depthWrite={false}
    />
  ));
}

function strokeStyle(variant: SolarArc["id"] | "moon", emphasized: boolean) {
  const { reference, moon, selected } = ARC_HIERARCHY.davinci;

  if (variant === "moon") {
    return {
      lineWidth: moon.lineWidth,
      opacity: moon.opacity,
      dashed: true,
      dashSize: MOON_ARC_DOT.dashSize,
      gapSize: MOON_ARC_DOT.gapSize,
    };
  }
  if (variant === "selected" || emphasized) {
    return { lineWidth: selected.lineWidth, opacity: selected.opacity, dashed: false, dashSize: 0.18, gapSize: 0.1 };
  }
  return { lineWidth: reference.lineWidth, opacity: reference.opacity, dashed: true, dashSize: 0.24, gapSize: 0.18 };
}

function horizonArc(start: number, sweep: number, radius: number): Vec3[] {
  const steps = Math.max(8, Math.ceil(Math.abs(sweep) / 4));
  const points: Vec3[] = [];
  for (let i = 0; i <= steps; i++) {
    const point = project(start + (sweep * i) / steps, 0, radius);
    points.push({ x: point.x, y: 0.032, z: point.z });
  }
  return points;
}

const SEGMENT: [number, number, number][] = [
  [0, 1, 0],
  [0, 0, 0],
];

function writeSegment(
  line: ComponentRef<typeof Line> | null,
  from: { x: number; y: number; z: number },
  to: { x: number; y: number; z: number },
) {
  const geometry = (line as { geometry?: { setPositions?: (values: number[]) => void } } | null)
    ?.geometry;
  geometry?.setPositions?.([from.x, from.y, from.z, to.x, to.y, to.z]);
}

function radial(azimuth: number, inner: number, outer: number): Vec3[] {
  const a = project(azimuth, 0, inner);
  const b = project(azimuth, 0, outer);
  return [
    { x: a.x, y: 0.032, z: a.z },
    { x: b.x, y: 0.032, z: b.z },
  ];
}

/** Moon hatch follows the real sun. A coincident sun falls back to a stable rake. */
function lightFromSun(body: Vec3, sun: Vec3) {
  const delta = new THREE.Vector3(sun.x - body.x, sun.y - body.y, sun.z - body.z);
  if (delta.lengthSq() < 0.04) {
    const bearing = new THREE.Vector3(sun.x, 0, sun.z);
    if (bearing.lengthSq() < 1e-6) bearing.set(0, 0, 1);
    bearing.normalize();
    return new THREE.Vector3(-bearing.z, 0.55, bearing.x).normalize();
  }
  return delta.normalize();
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  return reduced;
}
