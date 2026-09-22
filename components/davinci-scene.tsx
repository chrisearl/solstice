"use client";

import { Html, Line, OrbitControls } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import {
  type ComponentRef,
  type RefObject,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as THREE from "three";
import {
  DAVINCI_HATCH_DENSITY,
  DAVINCI_HATCH_WEIGHT,
  davinciFragmentShader,
  davinciVertexShader,
} from "@/lib/davinci-shader";
import {
  DISC_RADIUS,
  SKY_RADIUS,
  project,
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
const LOOK_TARGET = new THREE.Vector3(0, 0.75, 0);
const HOME_DIRECTION = new THREE.Vector3(5.15, 2.8, 6.35).normalize();

const APPLIANCE_POINTS = (() => {
  const points: THREE.Vector3[] = [];
  for (let i = 0; i < 36; i++) {
    const angle = (i / 36) * Math.PI * 2;
    points.push(
      new THREE.Vector3(Math.sin(angle) * (DISC_RADIUS + 0.7), 0.04, Math.cos(angle) * (DISC_RADIUS + 0.7)),
    );
  }
  for (const altitudeDeg of [25, 55, 80]) {
    const altitude = (altitudeDeg * Math.PI) / 180;
    const horizontal = Math.cos(altitude) * SKY_RADIUS;
    const y = Math.sin(altitude) * SKY_RADIUS + 0.45;
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      points.push(new THREE.Vector3(Math.sin(angle) * horizontal, y, Math.cos(angle) * horizontal));
    }
  }
  points.push(new THREE.Vector3(0, SKY_RADIUS + 0.7, 0));
  return points;
})();

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
  reducedMotion,
}: Omit<DavinciSceneProps, "active"> & { reducedMotion: boolean }) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const sunLight = useMemo(() => rakeFromBearing(sun.position), [sun.position]);
  const moonLight = useMemo(
    () => lightFromSun(moon.position, sun.position),
    [moon.position, sun.position],
  );

  return (
    <>
      <InkCompass />
      {showSun && <InkHorizon horizon={horizon} />}
      {showSun &&
        arcs.map((arc) => <InkSkyArc key={arc.id} arc={arc} variant={arc.id} />)}
      {showMoon && <InkSkyArc arc={moonArc} variant="moon" />}
      {showSun && (
        <InkOrb
          position={sun.position}
          radius={sun.aboveHorizon ? (sun.altitude < 8 ? 0.4 : 0.46) : 0.32}
          light={sunLight}
        />
      )}
      {showMoon && (
        <InkOrb
          position={moon.position}
          radius={moon.aboveHorizon ? 0.4 : 0.3}
          light={moonLight}
        />
      )}
      <OrbitControls
        ref={controls}
        enableDamping={!reducedMotion}
        dampingFactor={0.08}
        enablePan
        minDistance={4}
        maxDistance={48}
        minPolarAngle={0.2}
        maxPolarAngle={Math.PI * 0.5}
        target={[0, 0.75, 0]}
        zoomSpeed={0.7}
        rotateSpeed={reducedMotion ? 0.9 : 0.75}
      />
      <FrameCamera controls={controls} />
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
  const above = splitRuns(arc.points);
  const below = splitRuns(arc.underPoints);
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

/** Drop the long chords that stitch horizon endpoints across the disc. */
function splitRuns(points: Vec3[], maxGap = 1.25): Vec3[][] {
  if (points.length < 2) return [];
  const runs: Vec3[][] = [[points[0]]];
  for (let index = 1; index < points.length; index++) {
    const previous = points[index - 1];
    const next = points[index];
    const gap = Math.hypot(next.x - previous.x, next.y - previous.y, next.z - previous.z);
    if (gap > maxGap) runs.push([next]);
    else runs[runs.length - 1].push(next);
  }
  return runs.filter((run) => run.length > 1);
}

function InkOrb({
  position,
  radius,
  light,
}: {
  position: Vec3;
  radius: number;
  light: THREE.Vector3;
}) {
  const material = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({
      uLightDirection: { value: new THREE.Vector3(0.4, 0.7, 0.5).normalize() },
      uInkColor: { value: new THREE.Color("#2b190d") },
      uPaperColor: { value: new THREE.Color(PAPER) },
      uHatchDensity: { value: DAVINCI_HATCH_DENSITY },
      uLineWeight: { value: DAVINCI_HATCH_WEIGHT },
    }),
    [],
  );

  useLayoutEffect(() => {
    const shader = material.current;
    if (!shader) return;
    shader.uniforms.uLightDirection.value.copy(light);
    shader.uniforms.uHatchDensity.value = DAVINCI_HATCH_DENSITY;
    shader.uniforms.uLineWeight.value = DAVINCI_HATCH_WEIGHT;
  }, [light]);

  return (
    <mesh position={[position.x, position.y, position.z]} renderOrder={6}>
      <sphereGeometry args={[radius, 48, 48]} />
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

function FrameCamera({
  controls,
}: {
  controls: RefObject<ComponentRef<typeof OrbitControls> | null>;
}) {
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);

  useLayoutEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return;
    if (size.width < 2 || size.height < 2) return;

    const inset = parchmentInsets(size.width, size.height);
    camera.setViewOffset(
      size.width,
      size.height,
      (inset.right - inset.left) / 2,
      (inset.bottom - inset.top) / 2,
      size.width,
      size.height,
    );
    camera.aspect = size.width / size.height;
    camera.fov = 38;
    camera.updateProjectionMatrix();

    const limits = {
      minX: inset.left,
      maxX: size.width - inset.right,
      minY: inset.top,
      maxY: size.height - inset.bottom,
    };
    const place = (distance: number) => {
      camera.position.copy(HOME_DIRECTION).multiplyScalar(distance).add(LOOK_TARGET);
      camera.up.set(0, 1, 0);
      camera.lookAt(LOOK_TARGET);
      camera.updateMatrixWorld();
    };
    const fits = (distance: number) => {
      place(distance);
      for (const point of APPLIANCE_POINTS) {
        const projected = point.clone().project(camera);
        const x = (projected.x * 0.5 + 0.5) * size.width;
        const y = (1 - (projected.y * 0.5 + 0.5)) * size.height;
        if (x < limits.minX || x > limits.maxX || y < limits.minY || y > limits.maxY) return false;
      }
      return true;
    };

    let near = 4;
    let far = 80;
    for (let step = 0; step < 22; step++) {
      const mid = (near + far) / 2;
      if (fits(mid)) far = mid;
      else near = mid;
    }

    place(far * 1.06);
    camera.updateProjectionMatrix();

    const orbit = controls.current;
    if (!orbit) return;
    orbit.target.copy(LOOK_TARGET);
    orbit.minDistance = 4;
    orbit.maxDistance = Math.max(48, far * 1.7);
    orbit.update();
  }, [camera, controls, size.height, size.width]);

  return null;
}

function parchmentInsets(width: number, height: number) {
  const narrow = width < 640;
  const top = Math.min(narrow ? 96 : 156, Math.max(72, height * 0.3));
  const bottom = Math.min(124, Math.max(88, height * 0.24));
  const side = narrow ? 18 : 40;
  return { left: side, right: side, top, bottom };
}

function strokeStyle(variant: SolarArc["id"] | "moon", emphasized: boolean) {
  if (variant === "selected" || emphasized) {
    return { lineWidth: 2.2, opacity: 0.95, dashed: false, dashSize: 0.18, gapSize: 0.1 };
  }
  if (variant === "winter") {
    return { lineWidth: 1.25, opacity: 0.72, dashed: true, dashSize: 0.22, gapSize: 0.14 };
  }
  if (variant === "moon") {
    return { lineWidth: 1.35, opacity: 0.8, dashed: true, dashSize: 0.16, gapSize: 0.11 };
  }
  if (variant === "equinox") {
    return { lineWidth: 1.2, opacity: 0.66, dashed: false, dashSize: 0.16, gapSize: 0.1 };
  }
  return { lineWidth: 1.35, opacity: 0.8, dashed: false, dashSize: 0.16, gapSize: 0.1 };
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

function radial(azimuth: number, inner: number, outer: number): Vec3[] {
  const a = project(azimuth, 0, inner);
  const b = project(azimuth, 0, outer);
  return [
    { x: a.x, y: 0.032, z: a.z },
    { x: b.x, y: 0.032, z: b.z },
  ];
}

/** Rake across the sun's real bearing so the orb shows a hatched terminator. */
function rakeFromBearing(sun: Vec3) {
  const bearing = new THREE.Vector3(sun.x, 0, sun.z);
  if (bearing.lengthSq() < 1e-6) bearing.set(0, 0, 1);
  bearing.normalize();
  return new THREE.Vector3(-bearing.z, 0.55, bearing.x).normalize();
}

/** Moon hatch follows the real sun. A coincident sun falls back to the sun's bearing. */
function lightFromSun(body: Vec3, sun: Vec3) {
  const delta = new THREE.Vector3(sun.x - body.x, sun.y - body.y, sun.z - body.z);
  if (delta.lengthSq() < 0.04) return rakeFromBearing(sun);
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
