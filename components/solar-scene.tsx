"use client";

import { Html, Line, OrbitControls, Stars } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  type ComponentRef,
  type RefObject,
  Suspense,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import * as THREE from "three";
import { createCompassTexture } from "@/lib/compass-texture";
import {
  DISC_RADIUS,
  GNOMON_HEIGHT,
  SKY_RADIUS,
  type MoonPlacement,
  type SkyPath,
  type SolarArc,
  type SunPlacement,
  type Vec3,
} from "@/lib/solar";

interface SolarSceneProps {
  arcs: SolarArc[];
  sun: SunPlacement;
  moon: MoonPlacement;
  moonArc: SkyPath;
  showSun: boolean;
  showMoon: boolean;
  resetSignal: number;
}

export default function SolarScene({
  arcs,
  sun,
  moon,
  moonArc,
  showSun,
  showMoon,
  resetSignal,
}: SolarSceneProps) {
  return (
    <Canvas
      camera={{ position: [10.8, 6.4, 13.2], fov: 38, near: 0.1, far: 200 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.setClearColor("#07080d");
      }}
    >
      <Suspense fallback={null}>
        <SceneContent
          arcs={arcs}
          sun={sun}
          moon={moon}
          moonArc={moonArc}
          showSun={showSun}
          showMoon={showMoon}
          resetSignal={resetSignal}
        />
      </Suspense>
    </Canvas>
  );
}

function SceneContent({
  arcs,
  sun,
  moon,
  moonArc,
  showSun,
  showMoon,
  resetSignal,
}: SolarSceneProps) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);

  return (
    <>
      <color attach="background" args={["#07080d"]} />
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
      {showSun && sun.altitude > -2 && (
        <pointLight
          position={[sun.position.x, Math.max(sun.position.y, 0.2), sun.position.z]}
          intensity={sun.aboveHorizon ? 18 : 2}
          distance={28}
          decay={2}
          color="#ffc98a"
        />
      )}
      {showMoon && moon.aboveHorizon && (
        <pointLight
          position={[moon.position.x, Math.max(moon.position.y, 0.2), moon.position.z]}
          intensity={4.5 * moon.fraction}
          distance={22}
          decay={2}
          color="#d8e4f4"
        />
      )}
      <CompassDisc />
      <Gnomon />
      {showSun &&
        arcs.map((arc) => (
          <SkyArc key={arc.id} arc={arc} />
        ))}
      {showMoon && <SkyArc arc={moonArc} />}
      {showSun && <SunBody sun={sun} />}
      {showSun && <ShadowRig sun={sun} />}
      {showSun && <Bearing sun={sun} color="#ffd78a" />}
      {showMoon && <MoonBody moon={moon} />}
      {showMoon && <Bearing sun={moon} color="#d8e4f4" />}
      <OrbitControls
        ref={controls}
        enableDamping
        dampingFactor={0.08}
        enablePan
        minDistance={3.4}
        maxDistance={48}
        minPolarAngle={0.12}
        maxPolarAngle={Math.PI * 0.56}
        target={[0, 0.75, 0]}
        zoomSpeed={0.7}
        rotateSpeed={0.75}
      />
      <FrameCamera resetSignal={resetSignal} controls={controls} />
    </>
  );
}

const LOOK_TARGET = new THREE.Vector3(0, 0.75, 0);
const HOME_DIRECTION = new THREE.Vector3(5.15, 2.8, 6.35).normalize();

/** Disc rim, seasonal arc envelope, and a little room for the arc labels. */
const APPLIANCE_POINTS = (() => {
  const points: THREE.Vector3[] = [];
  for (let i = 0; i < 36; i++) {
    const angle = (i / 36) * Math.PI * 2;
    points.push(
      new THREE.Vector3(Math.sin(angle) * DISC_RADIUS, 0.04, Math.cos(angle) * DISC_RADIUS),
    );
  }
  for (const altitudeDeg of [25, 55, 80]) {
    const altitude = (altitudeDeg * Math.PI) / 180;
    const horizontal = Math.cos(altitude) * SKY_RADIUS;
    const y = Math.sin(altitude) * SKY_RADIUS + 0.45;
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      points.push(
        new THREE.Vector3(Math.sin(angle) * horizontal, y, Math.cos(angle) * horizontal),
      );
    }
  }
  points.push(new THREE.Vector3(0, SKY_RADIUS + 0.7, 0));
  return points;
})();

function viewInsets(width: number) {
  // Phone layout stacks the controls under the canvas, so only a small margin is needed.
  // Desktop overlays a 360px panel and a 220px readout on the full-window canvas.
  if (width < 1024) return { left: 16, right: 16, top: 14, bottom: 16 };
  return { left: 384, right: 244, top: 56, bottom: 20 };
}

function FrameCamera({
  resetSignal,
  controls,
}: {
  resetSignal: number;
  controls: RefObject<ComponentRef<typeof OrbitControls> | null>;
}) {
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);

  useLayoutEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return;
    if (size.width < 2 || size.height < 2) return;

    const inset = viewInsets(size.width);
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

    place(far * 1.04);
    camera.updateProjectionMatrix();

    const orbit = controls.current;
    if (!orbit) return;
    orbit.target.copy(LOOK_TARGET);
    orbit.minDistance = 3.4;
    orbit.maxDistance = Math.max(48, far * 1.7);
    orbit.update();
    orbit.saveState();
  }, [camera, controls, resetSignal, size.height, size.width]);

  return null;
}

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

function CompassDisc() {
  const texture = useMemo(() => createCompassTexture(), []);
  useEffect(() => () => texture.dispose(), [texture]);

  return (
    <group>
      <mesh position={[0, -0.09, 0]}>
        <cylinderGeometry args={[DISC_RADIUS, DISC_RADIUS * 1.012, 0.16, 96]} />
        <meshStandardMaterial color="#10141c" roughness={0.92} metalness={0.18} />
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
  const geometry = useMemo(() => tubeFrom(arc.points, arc.emphasized ? 0.028 : 0.015, arc.closed), [
    arc.points,
    arc.emphasized,
    arc.closed,
  ]);
  const glow = useMemo(
    () => (arc.emphasized ? tubeFrom(arc.points, 0.07, arc.closed) : null),
    [arc.points, arc.emphasized, arc.closed],
  );
  const under = useMemo(
    () => tubeFrom(arc.underPoints, arc.emphasized ? 0.011 : 0.006, arc.underClosed),
    [arc.underPoints, arc.emphasized, arc.underClosed],
  );

  useEffect(() => {
    return () => {
      geometry?.dispose();
      glow?.dispose();
      under?.dispose();
    };
  }, [geometry, glow, under]);

  if (!geometry && !under) return null;

  return (
    <group>
      {under && (
        <mesh geometry={under} renderOrder={1}>
          <meshBasicMaterial
            color={arc.color}
            transparent
            opacity={arc.emphasized ? 0.28 : 0.16}
            toneMapped={false}
            depthWrite={false}
          />
        </mesh>
      )}
      {glow && (
        <mesh geometry={glow} renderOrder={4}>
          <meshBasicMaterial
            color={arc.color}
            transparent
            opacity={0.16}
            toneMapped={false}
            depthWrite={false}
          />
        </mesh>
      )}
      {geometry && (
        <mesh geometry={geometry} renderOrder={4}>
          <meshBasicMaterial
            color={arc.color}
            transparent
            opacity={arc.emphasized ? 1 : 0.78}
            toneMapped={false}
            depthWrite={false}
          />
        </mesh>
      )}
      {arc.apex && (
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
              textShadow: "0 2px 10px rgba(0,0,0,0.85)",
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 600 }}>{arc.label}</div>
            <div style={{ marginTop: 2, fontSize: 10, opacity: 0.75 }}>{arc.detail}</div>
          </div>
        </Html>
      )}
    </group>
  );
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

function SunBody({ sun }: { sun: SunPlacement }) {
  const glow = useRef<THREE.Sprite>(null);
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

  useFrame(({ clock }) => {
    if (!glow.current) return;
    const pulse = 1 + Math.sin(clock.elapsedTime * 1.7) * (sun.aboveHorizon ? 0.05 : 0.02);
    const base = sun.altitude < 10 ? 1.85 : 1.35;
    glow.current.scale.setScalar(base * pulse);
  });

  const color = sunColor(sun.altitude);
  const radius = sun.aboveHorizon ? 0.12 : 0.08;

  return (
    <group position={[sun.position.x, sun.position.y, sun.position.z]}>
      <mesh>
        <sphereGeometry args={[radius, 32, 32]} />
        <meshBasicMaterial color={color} toneMapped={false} />
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

function ShadowRig({ sun }: { sun: SunPlacement }) {
  const tip: [number, number, number] = [0, GNOMON_HEIGHT, 0];
  const from: [number, number, number] = [sun.position.x, sun.position.y, sun.position.z];

  return (
    <group>
      {sun.aboveHorizon && (
        <Line
          points={[from, tip]}
          color="#ffe1a8"
          lineWidth={1.4}
          transparent
          opacity={0.7}
        />
      )}
      {sun.shadow && (
        <Line
          points={[
            [0, 0.045, 0],
            [sun.shadow.x, sun.shadow.y, sun.shadow.z],
          ]}
          color="#c9844a"
          lineWidth={2.2}
          transparent
          opacity={0.9}
        />
      )}
      {sun.shadow && (
        <mesh
          position={[sun.shadow.x, 0.05, sun.shadow.z]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <circleGeometry args={[0.055, 20]} />
          <meshBasicMaterial color="#e0a15a" transparent opacity={0.8} toneMapped={false} />
        </mesh>
      )}
    </group>
  );
}

function Bearing({
  sun,
  color,
}: {
  sun: Pick<SunPlacement, "bearing" | "aboveHorizon">;
  color: string;
}) {
  return (
    <mesh position={[sun.bearing.x, sun.bearing.y, sun.bearing.z]}>
      <sphereGeometry args={[0.045, 16, 16]} />
      <meshBasicMaterial
        color={sun.aboveHorizon ? color : "#6f7788"}
        toneMapped={false}
      />
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
  const glow = useRef<THREE.Sprite>(null);
  const texture = useMemo(
    () => createMoonPhaseTexture(moon.fraction, moon.waxing),
    [moon.fraction, moon.waxing],
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

  useFrame(({ clock }) => {
    if (!glow.current) return;
    const pulse = 1 + Math.sin(clock.elapsedTime * 1.1) * 0.03;
    glow.current.scale.setScalar((moon.aboveHorizon ? 1.15 : 0.85) * pulse);
  });

  const radius = moon.aboveHorizon ? 0.095 : 0.07;

  return (
    <group position={[moon.position.x, moon.position.y, moon.position.z]}>
      <mesh renderOrder={moon.aboveHorizon ? 6 : 1}>
        <sphereGeometry args={[radius, 32, 32]} />
        <meshBasicMaterial
          map={texture ?? undefined}
          color="#ffffff"
          toneMapped={false}
        />
      </mesh>
      {glowTexture && (
        <sprite
          ref={glow}
          scale={[1.25, 1.25, 1]}
          renderOrder={moon.aboveHorizon ? 6 : 1}
        >
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
