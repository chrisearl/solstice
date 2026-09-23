"use client";

import { Html, Line, OrbitControls, Stars } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  type ComponentRef,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import * as THREE from "three";
import { watchContextLoss } from "@/components/scene-boundary";
import { readLiveBodies, useSolarMotion } from "@/components/solar-motion";
import { FrameCamera } from "@/components/frame-camera";
import { createAppliancePoints } from "@/lib/scene-framing";
import { createCompassTexture } from "@/lib/compass-texture";
import type { LayoutInsets } from "@/lib/layout-insets";
import {
  DISC_FILL_COLOR,
  DISC_FILL_OPACITY,
  DISC_RADIUS,
  GNOMON_HEIGHT,
  SKY_RADIUS,
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

interface SolarSceneProps {
  arcs: SolarArc[];
  horizon: HorizonMarks;
  sun: SunPlacement;
  moon: MoonPlacement;
  moonArc: SkyPath;
  showSun: boolean;
  showMoon: boolean;
  resetSignal: number;
  layoutInsets: LayoutInsets;
  active?: boolean;
  onContextLost?: () => void;
}

export default function SolarScene({
  arcs,
  horizon,
  sun,
  moon,
  moonArc,
  showSun,
  showMoon,
  resetSignal,
  layoutInsets,
  active = true,
  onContextLost,
}: SolarSceneProps) {
  return (
    <Canvas
      camera={{ position: [10.8, 6.4, 13.2], fov: 38, near: 0.1, far: 200 }}
      dpr={[1, 2]}
      frameloop={active ? "always" : "never"}
      gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.setClearColor("#07080d");
        watchContextLoss(gl.domElement, onContextLost);
      }}
    >
      <Suspense fallback={null}>
        <SceneContent
          arcs={arcs}
          horizon={horizon}
          sun={sun}
          moon={moon}
          moonArc={moonArc}
          showSun={showSun}
          showMoon={showMoon}
          resetSignal={resetSignal}
          layoutInsets={layoutInsets}
        />
      </Suspense>
    </Canvas>
  );
}

function SceneContent({
  arcs,
  horizon,
  sun,
  moon,
  moonArc,
  showSun,
  showMoon,
  resetSignal,
  layoutInsets,
}: SolarSceneProps) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);

  return (
    <>
      <color attach="background" args={["#07080d"]} />
      <group>
        <SkyDome />
        <Stars
          radius={26}
          depth={14}
          count={1400}
          factor={2.4}
          saturation={0}
          fade
          speed={0.25}
        />
        <ambientLight intensity={0.28} />
        <hemisphereLight args={["#24324a", "#090b10", 0.55]} />
        <directionalLight position={[6, 8, 3]} intensity={0.4} color="#d5e2f5" />
        {showSun && (
          <LiveLight
            track="sun"
            placement={sun}
            color="#ffc98a"
            distance={28}
            decay={2}
          />
        )}
        {showMoon && (
          <LiveLight
            track="moon"
            placement={moon}
            color="#d8e4f4"
            distance={22}
            decay={2}
          />
        )}
        <CompassDisc />
        {showSun && <HorizonMarks horizon={horizon} />}
        <Gnomon />
        {showSun &&
          arcs.map((arc) => (
            <SkyArc key={arc.id} arc={arc} />
          ))}
        {showMoon && <SkyArc arc={moonArc} />}
        {showSun && <SunBody sun={sun} />}
        {showSun && <ShadowRig sun={sun} />}
        {showSun && <Bearing track="sun" color="#ffd78a" placement={sun} />}
        {showMoon && <MoonBody moon={moon} />}
        {showMoon && <Bearing track="moon" color="#d8e4f4" placement={moon} />}
      </group>
      <OrbitControls
        ref={controls}
        enableDamping
        dampingFactor={0.08}
        enablePan
        enableRotate
        minDistance={3.4}
        maxDistance={48}
        minPolarAngle={0.12}
        maxPolarAngle={Math.PI * 0.56}
        target={[0, 0.75, 0]}
        zoomSpeed={0.7}
        rotateSpeed={0.75}
      />
      <FrameCamera
        resetSignal={resetSignal}
        controls={controls}
        layoutInsets={layoutInsets}
        appliancePoints={NIGHT_APPLIANCE_POINTS}
      />
    </>
  );
}

const NIGHT_APPLIANCE_POINTS = createAppliancePoints(0);

function SkyDome() {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {
          top: { value: new THREE.Color("#070914") },
          horizon: { value: new THREE.Color("#1a2233") },
        },
        vertexShader: `
          varying vec3 vWorld;
          void main() {
            vec4 world = modelMatrix * vec4(position, 1.0);
            vWorld = world.xyz;
            gl_Position = projectionMatrix * viewMatrix * world;
          }
        `,
        fragmentShader: `
          varying vec3 vWorld;
          uniform vec3 top;
          uniform vec3 horizon;
          void main() {
            float h = normalize(vWorld).y;
            float t = smoothstep(-0.05, 0.72, h);
            vec3 color = mix(horizon, top, t);
            gl_FragColor = vec4(color, 1.0);
          }
        `,
      }),
    [],
  );

  useEffect(() => () => material.dispose(), [material]);

  return (
    <mesh material={material}>
      <sphereGeometry args={[48, 48, 32]} />
    </mesh>
  );
}

function HorizonMarks({ horizon }: { horizon: HorizonMarks }) {
  return (
    <group>
      {horizon.riseFan && <AzimuthFanMesh fan={horizon.riseFan} />}
      {horizon.setFan && <AzimuthFanMesh fan={horizon.setFan} />}
      {horizon.sunriseAzimuth != null && <AzimuthTick azimuth={horizon.sunriseAzimuth} />}
      {horizon.sunsetAzimuth != null && <AzimuthTick azimuth={horizon.sunsetAzimuth} />}
    </group>
  );
}

function AzimuthFanMesh({ fan }: { fan: AzimuthFan }) {
  const geometry = useMemo(() => {
    const inner = DISC_RADIUS * 0.72;
    const outer = DISC_RADIUS * 0.9;
    const y = 0.035;
    const steps = Math.max(8, Math.ceil(fan.sweep / 3));
    const positions: number[] = [];
    const indices: number[] = [];
    for (let i = 0; i <= steps; i++) {
      const azimuth = fan.start + (fan.sweep * i) / steps;
      const a = project(azimuth, 0, inner);
      const b = project(azimuth, 0, outer);
      positions.push(a.x, y, a.z, b.x, y, b.z);
    }
    for (let i = 0; i < steps; i++) {
      const base = i * 2;
      indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
    }
    const mesh = new THREE.BufferGeometry();
    mesh.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    mesh.setIndex(indices);
    return mesh;
  }, [fan.start, fan.sweep]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh geometry={geometry} renderOrder={3}>
      <meshBasicMaterial
        color="#ffe38a"
        transparent
        opacity={0.18}
        depthWrite={false}
        side={THREE.DoubleSide}
        toneMapped={false}
      />
    </mesh>
  );
}

function AzimuthTick({ azimuth }: { azimuth: number }) {
  const inner = project(azimuth, 0, SKY_RADIUS * 0.88);
  const outer = project(azimuth, 0, SKY_RADIUS * 0.99);
  const length = Math.hypot(outer.x - inner.x, outer.z - inner.z);
  return (
    <mesh
      position={[(inner.x + outer.x) / 2, 0.045, (inner.z + outer.z) / 2]}
      rotation={[0, (azimuth * Math.PI) / 180, 0]}
      renderOrder={3}
    >
      <boxGeometry args={[0.03, 0.012, Math.max(length, 0.02)]} />
      <meshBasicMaterial color="#ffe38a" toneMapped={false} />
    </mesh>
  );
}

function CompassDisc() {
  const texture = useMemo(() => createCompassTexture(), []);
  useEffect(() => () => texture.dispose(), [texture]);

  return (
    <group>
      <mesh position={[0, -0.09, 0]}>
        <cylinderGeometry args={[DISC_RADIUS, DISC_RADIUS * 1.012, 0.16, 96]} />
        <meshStandardMaterial color="#10141c" roughness={0.92} metalness={0.18} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.011, 0]} renderOrder={2}>
        <circleGeometry args={[DISC_RADIUS, 128]} />
        <meshBasicMaterial
          color={DISC_FILL_COLOR}
          transparent
          opacity={DISC_FILL_OPACITY}
          toneMapped={false}
          depthWrite={false}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]} renderOrder={2}>
        <circleGeometry args={[DISC_RADIUS, 128]} />
        <meshStandardMaterial
          map={texture}
          roughness={0.86}
          metalness={0.14}
          color="#ffffff"
          transparent
          opacity={0.84}
          depthWrite={false}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <torusGeometry args={[SKY_RADIUS, 0.01, 12, 180]} />
        <meshBasicMaterial color="#d5deea" transparent opacity={0.45} toneMapped={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <torusGeometry args={[DISC_RADIUS - 0.01, 0.018, 12, 160]} />
        <meshStandardMaterial color="#8ea0b8" roughness={0.45} metalness={0.4} />
      </mesh>
    </group>
  );
}

function Gnomon() {
  return (
    <group>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={5}>
        <circleGeometry args={[0.14, 24]} />
        <meshStandardMaterial
          color="#8d7349"
          metalness={0.55}
          roughness={0.35}
          transparent
          opacity={1}
          depthWrite
        />
      </mesh>
      <mesh position={[0, GNOMON_HEIGHT / 2, 0]} renderOrder={5}>
        <cylinderGeometry args={[0.018, 0.03, GNOMON_HEIGHT, 20]} />
        <meshStandardMaterial
          color="#e4bb72"
          metalness={0.72}
          roughness={0.28}
          transparent
          opacity={1}
          depthWrite
        />
      </mesh>
      <mesh position={[0, GNOMON_HEIGHT + 0.01, 0]} renderOrder={5}>
        <sphereGeometry args={[0.042, 20, 20]} />
        <meshStandardMaterial
          color="#f3ddb0"
          metalness={0.6}
          roughness={0.22}
          transparent
          opacity={1}
          depthWrite
        />
      </mesh>
    </group>
  );
}

function SkyArc({ arc }: { arc: SkyPath }) {
  if (!arc.emphasized) return <QuietSkyArc arc={arc} />;
  return <SolidSkyArc arc={arc} />;
}

/** Reference paths sit behind the day being shown: thin, dim, and broken. */
function QuietSkyArc({ arc }: { arc: SkyPath }) {
  const aboveRuns = useMemo(() => splitPathRuns(arc.points), [arc.points]);
  const underRuns = useMemo(() => splitPathRuns(arc.underPoints), [arc.underPoints]);

  return (
    <group>
      <DashedRuns
        runs={underRuns}
        closed={arc.underClosed}
        color={arc.color}
        lineWidth={1}
        opacity={0.2}
        dashSize={0.16}
        gapSize={0.18}
        renderOrder={1}
      />
      <DashedRuns
        runs={aboveRuns}
        closed={arc.closed}
        color={arc.color}
        lineWidth={1.25}
        opacity={0.38}
        dashSize={0.28}
        gapSize={0.22}
        renderOrder={3}
      />
      <ArcLabel arc={arc} />
    </group>
  );
}

function SolidSkyArc({ arc }: { arc: SkyPath }) {
  const aboveRuns = useMemo(() => splitPathRuns(arc.points), [arc.points]);
  const underRuns = useMemo(() => splitPathRuns(arc.underPoints), [arc.underPoints]);
  const aboveTubes = useMemo(
    () => tubesFromRuns(aboveRuns, 0.028, arc.closed && aboveRuns.length === 1),
    [aboveRuns, arc.closed],
  );
  const glowTubes = useMemo(
    () => tubesFromRuns(aboveRuns, 0.07, arc.closed && aboveRuns.length === 1),
    [aboveRuns, arc.closed],
  );
  const underTubes = useMemo(
    () => tubesFromRuns(underRuns, 0.011, arc.underClosed && underRuns.length === 1),
    [underRuns, arc.underClosed],
  );

  useEffect(() => {
    return () => {
      for (const geometry of [...aboveTubes, ...glowTubes, ...underTubes]) {
        geometry.dispose();
      }
    };
  }, [aboveTubes, glowTubes, underTubes]);

  if (aboveTubes.length === 0 && underTubes.length === 0) return null;

  return (
    <group>
      {underTubes.map((geometry, index) => (
        <mesh key={`under-${index}`} geometry={geometry} renderOrder={1}>
          <meshBasicMaterial
            color={arc.color}
            transparent
            opacity={0.28}
            toneMapped={false}
            depthWrite={false}
          />
        </mesh>
      ))}
      {glowTubes.map((geometry, index) => (
        <mesh key={`glow-${index}`} geometry={geometry} renderOrder={4}>
          <meshBasicMaterial
            color={arc.color}
            transparent
            opacity={0.16}
            toneMapped={false}
            depthWrite={false}
          />
        </mesh>
      ))}
      {aboveTubes.map((geometry, index) => (
        <mesh key={`above-${index}`} geometry={geometry} renderOrder={4}>
          <meshBasicMaterial
            color={arc.color}
            transparent
            opacity={1}
            toneMapped={false}
            depthWrite={false}
          />
        </mesh>
      ))}
      <ArcLabel arc={arc} />
    </group>
  );
}

function DashedRuns({
  runs,
  closed,
  color,
  lineWidth,
  opacity,
  dashSize,
  gapSize,
  renderOrder,
}: {
  runs: Vec3[][];
  closed: boolean;
  color: string;
  lineWidth: number;
  opacity: number;
  dashSize: number;
  gapSize: number;
  renderOrder: number;
}) {
  return runs.map((points, index) => {
    const line = linePoints(points, closed && runs.length === 1);
    if (line.length < 2) return null;
    return (
      <Line
        key={index}
        points={line}
        color={color}
        lineWidth={lineWidth}
        dashed
        dashSize={dashSize}
        gapSize={gapSize}
        transparent
        opacity={opacity}
        depthWrite={false}
        toneMapped={false}
        renderOrder={renderOrder}
      />
    );
  });
}

function linePoints(points: Vec3[], closed: boolean): [number, number, number][] {
  const mapped = points.map((point) => [point.x, point.y, point.z] as [number, number, number]);
  if (closed && mapped.length > 2) {
    const first = mapped[0];
    const last = mapped[mapped.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1] || first[2] !== last[2]) {
      mapped.push(first);
    }
  }
  return mapped;
}

function ArcLabel({ arc }: { arc: SkyPath }) {
  if (!arc.apex) return null;
  const quiet = !arc.emphasized;
  return (
    <Html
      position={[arc.apex.x, arc.apex.y + 0.32, arc.apex.z]}
      center
      distanceFactor={11}
      zIndexRange={[20, 0]}
      style={{ pointerEvents: "none" }}
    >
      <div
        style={{
          whiteSpace: "nowrap",
          textAlign: "center",
          fontFamily: "var(--font-geist-sans), ui-sans-serif, sans-serif",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: arc.color,
          opacity: quiet ? 0.48 : 1,
          textShadow: quiet ? "0 1px 6px rgba(0,0,0,0.7)" : "0 2px 10px rgba(0,0,0,0.85)",
        }}
      >
        <div style={{ fontSize: quiet ? 10 : 11, fontWeight: quiet ? 500 : 600 }}>{arc.label}</div>
        <div style={{ marginTop: 2, fontSize: 10, opacity: 0.75 }}>{arc.detail}</div>
      </div>
    </Html>
  );
}

function tubesFromRuns(
  runs: Vec3[][],
  radius: number,
  closed: boolean,
): THREE.TubeGeometry[] {
  return runs
    .map((run) => tubeFrom(run, radius, closed && runs.length === 1))
    .filter((geometry): geometry is THREE.TubeGeometry => geometry !== null);
}

function tubeFrom(points: Vec3[], radius: number, closed: boolean) {
  if (points.length < 2) return null;
  const curve = new THREE.CatmullRomCurve3(
    points.map((point) => new THREE.Vector3(point.x, point.y, point.z)),
    closed,
    "centripetal",
    0.15,
  );
  return new THREE.TubeGeometry(
    curve,
    Math.min(240, Math.max(48, points.length * 2)),
    radius,
    10,
    closed,
  );
}

function sunColor(altitude: number): string {
  if (altitude < 0) return "#8a5a3a";
  if (altitude < 4) return "#ff5c2a";
  if (altitude < 12) return "#ff9a3a";
  return "#fff3cf";
}

function placeObject(object: THREE.Object3D | null, point: { x: number; y: number; z: number }) {
  object?.position.set(point.x, point.y, point.z);
}

function LiveLight({
  track,
  placement,
  color,
  distance,
  decay,
}: {
  track: "sun" | "moon";
  placement: SunPlacement | MoonPlacement;
  color: string;
  distance: number;
  decay: number;
}) {
  const light = useRef<THREE.PointLight>(null);
  const motion = useSolarMotion();

  const apply = (next: SunPlacement | MoonPlacement) => {
    const node = light.current;
    if (!node) return;
    if (track === "sun") {
      const sun = next as SunPlacement;
      node.visible = sun.altitude > -2;
      node.intensity = sun.aboveHorizon ? 18 : 2;
      node.position.set(sun.position.x, Math.max(sun.position.y, 0.2), sun.position.z);
      return;
    }
    const moon = next as MoonPlacement;
    node.visible = moon.aboveHorizon;
    node.intensity = 4.5 * moon.fraction;
    node.position.set(moon.position.x, Math.max(moon.position.y, 0.2), moon.position.z);
  };

  useLayoutEffect(() => {
    if (motion.playing.current) return;
    apply(placement);
    // apply is recreated each render and reads the latest placement.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [motion, placement]);

  useFrame(() => {
    if (!motion.playing.current) return;
    apply(readLiveBodies(motion)[track]);
  });

  return (
    <pointLight ref={light} color={color} distance={distance} decay={decay} intensity={0} />
  );
}

function SunBody({ sun }: { sun: SunPlacement }) {
  const group = useRef<THREE.Group>(null);
  const core = useRef<THREE.Mesh>(null);
  const glow = useRef<THREE.Sprite>(null);
  const motion = useSolarMotion();
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    const gradient = ctx.createRadialGradient(128, 128, 8, 128, 128, 128);
    gradient.addColorStop(0, "rgba(255, 248, 230, 1)");
    gradient.addColorStop(0.18, "rgba(255, 196, 90, 0.9)");
    gradient.addColorStop(0.42, "rgba(255, 140, 40, 0.28)");
    gradient.addColorStop(1, "rgba(255, 120, 20, 0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    return map;
  }, []);

  useEffect(() => () => texture?.dispose(), [texture]);

  const apply = (placement: SunPlacement, elapsed: number) => {
    placeObject(group.current, placement.position);
    const radius = placement.aboveHorizon ? 0.12 : 0.08;
    core.current?.scale.setScalar(radius);
    const material = core.current?.material;
    if (material instanceof THREE.MeshBasicMaterial) {
      material.color.set(sunColor(placement.altitude));
    }
    if (!glow.current) return;
    const pulse = 1 + Math.sin(elapsed * 1.7) * (placement.aboveHorizon ? 0.05 : 0.02);
    const base = placement.altitude < 10 ? 1.85 : 1.35;
    glow.current.scale.setScalar(base * pulse);
    glow.current.renderOrder = placement.aboveHorizon ? 6 : 1;
    const sprite = glow.current.material;
    if (!Array.isArray(sprite)) sprite.opacity = placement.aboveHorizon ? 0.95 : 0.35;
  };

  useLayoutEffect(() => {
    if (motion.playing.current) return;
    apply(sun, 0);
  }, [motion, sun]);

  useFrame(({ clock }) => {
    if (motion.playing.current) {
      apply(readLiveBodies(motion).sun, clock.elapsedTime);
      return;
    }
    if (!glow.current) return;
    const pulse = 1 + Math.sin(clock.elapsedTime * 1.7) * (sun.aboveHorizon ? 0.05 : 0.02);
    const base = sun.altitude < 10 ? 1.85 : 1.35;
    glow.current.scale.setScalar(base * pulse);
  });

  return (
    <group ref={group}>
      <mesh ref={core}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial color={sunColor(sun.altitude)} toneMapped={false} />
      </mesh>
      {texture && (
        <sprite ref={glow} scale={[1.5, 1.5, 1]} renderOrder={sun.aboveHorizon ? 6 : 1}>
          <spriteMaterial
            map={texture}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            opacity={sun.aboveHorizon ? 0.95 : 0.35}
            toneMapped={false}
          />
        </sprite>
      )}
    </group>
  );
}

function writeSegment(
  line: ComponentRef<typeof Line> | null,
  from: { x: number; y: number; z: number },
  to: { x: number; y: number; z: number },
) {
  const geometry = (line as { geometry?: { setPositions?: (values: number[]) => void } } | null)
    ?.geometry;
  geometry?.setPositions?.([from.x, from.y, from.z, to.x, to.y, to.z]);
}

const SEGMENT: [number, number, number][] = [
  [0, 1, 0],
  [0, 0, 0],
];

function ShadowRig({ sun }: { sun: SunPlacement }) {
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
      if (mark) tip.current.position.set(mark.x, 0.05, mark.z);
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
    <group>
      <Line
        ref={ray}
        points={SEGMENT}
        color="#ffe1a8"
        lineWidth={1.4}
        transparent
        opacity={0.7}
      />
      <Line
        ref={shadow}
        points={SEGMENT}
        color="#c9844a"
        lineWidth={2.2}
        transparent
        opacity={0.9}
      />
      <mesh ref={tip} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.055, 20]} />
        <meshBasicMaterial color="#e0a15a" transparent opacity={0.8} toneMapped={false} />
      </mesh>
    </group>
  );
}

function Bearing({
  track,
  color,
  placement,
}: {
  track: "sun" | "moon";
  color: string;
  placement: Pick<SunPlacement, "bearing" | "aboveHorizon">;
}) {
  const mesh = useRef<THREE.Mesh>(null);
  const motion = useSolarMotion();

  const apply = (next: Pick<SunPlacement, "bearing" | "aboveHorizon">) => {
    placeObject(mesh.current, next.bearing);
    const material = mesh.current?.material;
    if (material instanceof THREE.MeshBasicMaterial) {
      material.color.set(next.aboveHorizon ? color : "#6f7788");
    }
  };

  useLayoutEffect(() => {
    if (motion.playing.current) return;
    apply(placement);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [motion, placement, color]);

  useFrame(() => {
    if (!motion.playing.current) return;
    apply(readLiveBodies(motion)[track]);
  });

  return (
    <mesh ref={mesh}>
      <sphereGeometry args={[0.045, 16, 16]} />
      <meshBasicMaterial color={placement.aboveHorizon ? color : "#6f7788"} toneMapped={false} />
    </mesh>
  );
}

function createMoonPhaseTexture(fraction: number, waxing: boolean) {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const center = size / 2;
  const radius = size * 0.46;

  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = "#2a3344";
  ctx.beginPath();
  ctx.arc(center, center, radius, 0, Math.PI * 2);
  ctx.fill();

  const offset = (1 - Math.min(1, Math.max(0, fraction))) * radius * 1.85;
  ctx.fillStyle = "#e8edf6";
  ctx.save();
  ctx.beginPath();
  ctx.arc(center, center, radius, 0, Math.PI * 2);
  ctx.clip();
  ctx.beginPath();
  ctx.arc(center + (waxing ? -offset : offset), center, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(center, center, radius - 1, 0, Math.PI * 2);
  ctx.stroke();

  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  return map;
}

function MoonBody({ moon }: { moon: MoonPlacement }) {
  const group = useRef<THREE.Group>(null);
  const core = useRef<THREE.Mesh>(null);
  const glow = useRef<THREE.Sprite>(null);
  const motion = useSolarMotion();
  const fractionStep = Math.round(moon.fraction * 100) / 100;
  const texture = useMemo(
    () => createMoonPhaseTexture(fractionStep, moon.waxing),
    [fractionStep, moon.waxing],
  );
  const glowTexture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    const gradient = ctx.createRadialGradient(128, 128, 8, 128, 128, 128);
    gradient.addColorStop(0, "rgba(232, 240, 255, 0.95)");
    gradient.addColorStop(0.25, "rgba(196, 210, 232, 0.45)");
    gradient.addColorStop(1, "rgba(160, 180, 210, 0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    return map;
  }, []);

  useEffect(() => {
    return () => {
      texture?.dispose();
      glowTexture?.dispose();
    };
  }, [texture, glowTexture]);

  const apply = (placement: MoonPlacement, elapsed: number) => {
    placeObject(group.current, placement.position);
    const radius = placement.aboveHorizon ? 0.095 : 0.07;
    core.current?.scale.setScalar(radius);
    if (core.current) core.current.renderOrder = placement.aboveHorizon ? 6 : 1;
    if (!glow.current) return;
    const pulse = 1 + Math.sin(elapsed * 1.1) * 0.03;
    glow.current.scale.setScalar((placement.aboveHorizon ? 1.15 : 0.85) * pulse);
    glow.current.renderOrder = placement.aboveHorizon ? 6 : 1;
    const sprite = glow.current.material;
    if (!Array.isArray(sprite)) {
      sprite.opacity = placement.aboveHorizon ? 0.55 * placement.fraction + 0.15 : 0.2;
    }
  };

  useLayoutEffect(() => {
    if (motion.playing.current) return;
    apply(moon, 0);
  }, [motion, moon]);

  useFrame(({ clock }) => {
    if (motion.playing.current) {
      apply(readLiveBodies(motion).moon, clock.elapsedTime);
      return;
    }
    if (!glow.current) return;
    const pulse = 1 + Math.sin(clock.elapsedTime * 1.1) * 0.03;
    glow.current.scale.setScalar((moon.aboveHorizon ? 1.15 : 0.85) * pulse);
  });

  return (
    <group ref={group}>
      <mesh ref={core} renderOrder={moon.aboveHorizon ? 6 : 1}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial map={texture ?? undefined} color="#ffffff" toneMapped={false} />
      </mesh>
      {glowTexture && (
        <sprite ref={glow} scale={[1.25, 1.25, 1]} renderOrder={moon.aboveHorizon ? 6 : 1}>
          <spriteMaterial
            map={glowTexture}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            opacity={moon.aboveHorizon ? 0.55 * moon.fraction + 0.15 : 0.2}
            toneMapped={false}
          />
        </sprite>
      )}
    </group>
  );
}
