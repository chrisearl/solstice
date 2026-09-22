"use client";

import { Html, Line, OrbitControls, Stars } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { type ComponentRef, Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { createCompassTexture } from "@/lib/compass-texture";
import {
  DISC_RADIUS,
  GNOMON_HEIGHT,
  SKY_RADIUS,
  type SolarArc,
  type SunPlacement,
  type Vec3,
} from "@/lib/solar";

interface SolarSceneProps {
  arcs: SolarArc[];
  sun: SunPlacement;
  resetSignal: number;
}

export default function SolarScene({ arcs, sun, resetSignal }: SolarSceneProps) {
  return (
    <Canvas
      camera={{ position: [5.15, 3.55, 6.35], fov: 38, near: 0.1, far: 200 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.setClearColor("#07080d");
      }}
    >
      <Suspense fallback={null}>
        <SceneContent arcs={arcs} sun={sun} resetSignal={resetSignal} />
      </Suspense>
    </Canvas>
  );
}

function SceneContent({ arcs, sun, resetSignal }: SolarSceneProps) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);

  useEffect(() => {
    controls.current?.reset();
  }, [resetSignal]);

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
      {sun.altitude > -2 && (
        <pointLight
          position={[sun.position.x, Math.max(sun.position.y, 0.2), sun.position.z]}
          intensity={sun.aboveHorizon ? 18 : 2}
          distance={28}
          decay={2}
          color="#ffc98a"
        />
      )}
      <CompassDisc />
      <Gnomon />
      {arcs.map((arc) => (
        <SkyArc key={arc.id} arc={arc} />
      ))}
      <SunBody sun={sun} />
      <ShadowRig sun={sun} />
      <Bearing sun={sun} />
      <OrbitControls
        ref={controls}
        enableDamping
        dampingFactor={0.08}
        enablePan
        minDistance={3.4}
        maxDistance={16}
        minPolarAngle={0.12}
        maxPolarAngle={Math.PI * 0.56}
        target={[0, 0.75, 0]}
        zoomSpeed={0.7}
        rotateSpeed={0.75}
      />
    </>
  );
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
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
        <circleGeometry args={[DISC_RADIUS, 128]} />
        <meshStandardMaterial
          map={texture}
          roughness={0.86}
          metalness={0.14}
          color="#ffffff"
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
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.14, 24]} />
        <meshStandardMaterial color="#8d7349" metalness={0.55} roughness={0.35} />
      </mesh>
      <mesh position={[0, GNOMON_HEIGHT / 2, 0]}>
        <cylinderGeometry args={[0.018, 0.03, GNOMON_HEIGHT, 20]} />
        <meshStandardMaterial color="#e4bb72" metalness={0.72} roughness={0.28} />
      </mesh>
      <mesh position={[0, GNOMON_HEIGHT + 0.01, 0]}>
        <sphereGeometry args={[0.042, 20, 20]} />
        <meshStandardMaterial color="#f3ddb0" metalness={0.6} roughness={0.22} />
      </mesh>
    </group>
  );
}

function SkyArc({ arc }: { arc: SolarArc }) {
  const geometry = useMemo(() => tubeFrom(arc.points, arc.emphasized ? 0.028 : 0.015, arc.closed), [
    arc.points,
    arc.emphasized,
    arc.closed,
  ]);
  const glow = useMemo(
    () => (arc.emphasized ? tubeFrom(arc.points, 0.07, arc.closed) : null),
    [arc.points, arc.emphasized, arc.closed],
  );

  useEffect(() => {
    return () => {
      geometry?.dispose();
      glow?.dispose();
    };
  }, [geometry, glow]);

  if (!geometry) return null;

  return (
    <group>
      {glow && (
        <mesh geometry={glow}>
          <meshBasicMaterial
            color={arc.color}
            transparent
            opacity={0.16}
            toneMapped={false}
            depthWrite={false}
          />
        </mesh>
      )}
      <mesh geometry={geometry}>
        <meshBasicMaterial
          color={arc.color}
          transparent
          opacity={arc.emphasized ? 1 : 0.78}
          toneMapped={false}
        />
      </mesh>
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
        <sprite ref={glow} scale={[1.5, 1.5, 1]}>
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

function Bearing({ sun }: { sun: SunPlacement }) {
  return (
    <mesh position={[sun.bearing.x, sun.bearing.y, sun.bearing.z]}>
      <sphereGeometry args={[0.045, 16, 16]} />
      <meshBasicMaterial
        color={sun.aboveHorizon ? "#ffd78a" : "#8d7a68"}
        toneMapped={false}
      />
    </mesh>
  );
}
