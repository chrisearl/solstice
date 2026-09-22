"use client";

import { Line, OrbitControls } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { davinciFragmentShader, davinciVertexShader } from "@/lib/davinci-shader";

const INK = "#472f1a";

interface DavinciSceneProps {
  active: boolean;
  density: number;
  weight: number;
  lightAngle: number;
  showRings: boolean;
  motion: boolean;
}

export function DavinciScene({
  active,
  density,
  weight,
  lightAngle,
  showRings,
  motion,
}: DavinciSceneProps) {
  return (
    <Canvas
      className="absolute inset-0"
      camera={{ position: [0, 2.2, 5.2], fov: 45, near: 0.1, far: 100 }}
      dpr={[1, 2]}
      frameloop={active ? "always" : "never"}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
      }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.NoToneMapping;
        gl.setClearColor("#dfcdad");
      }}
    >
      <color attach="background" args={["#dfcdad"]} />
      <CodexSphere
        density={density}
        weight={weight}
        lightAngle={lightAngle}
        motion={motion && active}
      />
      {showRings && <CompassRings motion={motion && active} />}
      <LightRay lightAngle={lightAngle} />
      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        enablePan
        maxDistance={12}
        minDistance={2.5}
        zoomSpeed={0.75}
        rotateSpeed={0.8}
      />
    </Canvas>
  );
}

function CodexSphere({
  density,
  weight,
  lightAngle,
  motion,
}: {
  density: number;
  weight: number;
  lightAngle: number;
  motion: boolean;
}) {
  const mesh = useRef<THREE.Mesh>(null);
  const uniforms = useMemo(() => {
    const rad = (45 * Math.PI) / 180;
    return {
      uLightDirection: {
        value: new THREE.Vector3(Math.cos(rad) * 2, 1.4, Math.sin(rad) * 2).normalize(),
      },
      uInkColor: { value: new THREE.Color("#2b190d") },
      uPaperColor: { value: new THREE.Color("#dfcdad") },
      uHatchDensity: { value: 35 },
      uLineWeight: { value: 1.2 },
    };
  }, []);

  useLayoutEffect(() => {
    const material = mesh.current?.material;
    if (!(material instanceof THREE.ShaderMaterial)) return;
    const rad = (lightAngle * Math.PI) / 180;
    material.uniforms.uHatchDensity.value = density;
    material.uniforms.uLineWeight.value = weight;
    material.uniforms.uLightDirection.value.set(Math.cos(rad) * 2, 1.4, Math.sin(rad) * 2).normalize();
  }, [density, lightAngle, weight]);

  useFrame((_, delta) => {
    if (!motion || !mesh.current) return;
    mesh.current.rotation.y += delta * 0.18;
  });

  return (
    <mesh ref={mesh}>
      <sphereGeometry args={[1.4, 64, 64]} />
      <shaderMaterial
        toneMapped={false}
        uniforms={uniforms}
        vertexShader={davinciVertexShader}
        fragmentShader={davinciFragmentShader}
      />
    </mesh>
  );
}

function CompassRings({ motion }: { motion: boolean }) {
  const group = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (!motion || !group.current) return;
    group.current.rotation.y += delta * 0.06;
  });

  return (
    <group ref={group}>
      <InkRing radius={2.1} segments={120} />
      <InkRing radius={2.35} segments={120} />
      <TickMarks />
      <group rotation={[Math.PI * 0.28, Math.PI * 0.15, 0]}>
        <InkRing radius={1.85} segments={96} dashed />
      </group>
      <group rotation={[0, 0, Math.PI * 0.35]}>
        <InkRing radius={1.65} segments={96} />
      </group>
      <Line
        points={[
          [0, -2.4, 0],
          [0, 2.4, 0],
        ]}
        color={INK}
        dashed
        dashSize={0.08}
        gapSize={0.05}
        transparent
        opacity={0.75}
        lineWidth={1}
      />
    </group>
  );
}

function InkRing({
  radius,
  segments,
  dashed = false,
}: {
  radius: number;
  segments: number;
  dashed?: boolean;
}) {
  const points = useMemo(() => ringPoints(radius, segments), [radius, segments]);
  return (
    <Line
      points={points}
      color={INK}
      dashed={dashed}
      dashSize={0.08}
      gapSize={0.05}
      transparent
      opacity={dashed ? 0.75 : 0.65}
      lineWidth={1}
    />
  );
}

function TickMarks() {
  const geometry = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const count = 48;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const len = i % 4 === 0 ? 0.12 : 0.06;
      points.push(
        new THREE.Vector3(Math.cos(angle) * 2.35, 0, Math.sin(angle) * 2.35),
        new THREE.Vector3(Math.cos(angle) * (2.35 + len), 0, Math.sin(angle) * (2.35 + len)),
      );
    }
    return new THREE.BufferGeometry().setFromPoints(points);
  }, []);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color={INK} transparent opacity={0.65} />
    </lineSegments>
  );
}

function LightRay({ lightAngle }: { lightAngle: number }) {
  return (
    <group rotation={[0, (lightAngle * Math.PI) / 180, 0]}>
      <Line
        points={[
          [0, 0, 0],
          [3.2, 2.2, 3.2],
        ]}
        color={INK}
        dashed
        dashSize={0.08}
        gapSize={0.05}
        transparent
        opacity={0.75}
        lineWidth={1}
      />
    </group>
  );
}

function ringPoints(radius: number, segments: number): [number, number, number][] {
  const points: [number, number, number][] = [];
  for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * Math.PI * 2;
    points.push([Math.cos(theta) * radius, 0, Math.sin(theta) * radius]);
  }
  return points;
}
