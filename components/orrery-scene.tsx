"use client";

import { Html, Line, OrbitControls, Stars } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  type ComponentRef,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as THREE from "three";
import { watchContextLoss } from "@/components/scene-boundary";
import { readLiveOrrery, useSolarMotion } from "@/components/solar-motion";
import {
  bodyById,
  buildOrbitPaths,
  type BodyId,
  type BodyPlacement,
  type OrreryModel,
  type PlanetId,
} from "@/lib/orrery";
import type { LayoutInsets } from "@/lib/layout-insets";
import { createOrreryAppliancePoints } from "@/lib/scene-framing";

export interface OrrerySceneProps {
  active: boolean;
  model: OrreryModel;
  focusId: PlanetId | "moon";
  visiblePlanets: ReadonlySet<PlanetId>;
  resetSignal: number;
  layoutInsets: LayoutInsets;
  onFocus: (id: BodyId) => void;
  onContextLost?: () => void;
}

const ORRERY_APPLIANCE_POINTS = createOrreryAppliancePoints();
const ORRERY_LOOK = new THREE.Vector3(0, 0, 0);
const ORRERY_HOME = new THREE.Vector3(0, 14, 18).normalize();

export default function OrreryScene(props: OrrerySceneProps) {
  return (
    <Canvas
      className="absolute inset-0"
      camera={{ position: [0, 14, 18], fov: 38, near: 0.1, far: 400 }}
      dpr={[1, 2]}
      frameloop={props.active ? "always" : "never"}
      gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.setClearColor("#07080d");
        watchContextLoss(gl.domElement, props.onContextLost);
      }}
    >
      <color attach="background" args={["#07080d"]} />
      <Suspense fallback={null}>
        <OrreryInstrument {...props} />
      </Suspense>
    </Canvas>
  );
}

function OrreryInstrument({
  model,
  focusId,
  visiblePlanets,
  resetSignal,
  layoutInsets,
  onFocus,
}: OrrerySceneProps) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const motion = useSolarMotion();
  const orbitPaths = useMemo(() => buildOrbitPaths(128), []);
  const [liveModel, setLiveModel] = useState(model);

  useLayoutEffect(() => {
    if (motion.playing.current) return;
    setLiveModel(model);
  }, [model, motion.playing]);

  useFrame(() => {
    if (!motion.playing.current) return;
    setLiveModel(readLiveOrrery(motion, focusId, visiblePlanets));
  });

  const focusBody = bodyById(liveModel, focusId) ?? bodyById(liveModel, "earth");

  return (
    <>
      <Stars radius={120} depth={40} count={3000} factor={3} saturation={0} fade speed={0.4} />
      <ambientLight intensity={0.18} />
      <hemisphereLight args={["#8eb4ff", "#0a0a12", 0.35]} />
      <pointLight position={[0, 0, 0]} intensity={2.4} color="#fff4d0" distance={80} decay={2} />

      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.55, 32, 32]} />
        <meshStandardMaterial emissive="#f0b429" emissiveIntensity={1.6} color="#ffd56a" />
      </mesh>

      {orbitPaths.map((path) => {
        if (path.id !== "moon" && !visiblePlanets.has(path.id)) return null;
        const points = path.points.flatMap((p) => [p.x, p.y, p.z] as const);
        return (
          <Line
            key={path.id}
            points={points}
            color={path.id === focusId ? "#ffffff" : "#ffffff"}
            transparent
            opacity={path.id === focusId ? 0.35 : 0.12}
            lineWidth={path.id === focusId ? 1.4 : 1}
          />
        );
      })}

      {liveModel.bodies
        .filter((body) => body.id !== "sun")
        .map((body) => (
          <PlanetBody
            key={body.id}
            body={body}
            focused={body.id === focusId}
            onFocus={onFocus}
          />
        ))}

      {focusBody && (
        <Html position={[focusBody.position.x, focusBody.position.y + 0.5, focusBody.position.z]} center distanceFactor={14}>
          <span className="rounded-full border border-white/20 bg-black/60 px-2 py-0.5 text-[10px] tracking-[0.14em] text-white uppercase backdrop-blur-sm">
            {focusBody.name}
          </span>
        </Html>
      )}

      <OrbitControls
        ref={controls}
        enableDamping
        dampingFactor={0.08}
        enablePan
        minDistance={2}
        maxDistance={120}
        minPolarAngle={0.08}
        maxPolarAngle={Math.PI * 0.52}
        target={[0, 0, 0]}
        zoomSpeed={0.7}
      />
      <OrreryFrameCamera
        resetSignal={resetSignal}
        controls={controls}
        layoutInsets={layoutInsets}
      />
    </>
  );
}

function OrreryFrameCamera({
  resetSignal,
  controls,
  layoutInsets,
}: {
  resetSignal: number;
  controls: React.RefObject<ComponentRef<typeof OrbitControls> | null>;
  layoutInsets: LayoutInsets;
}) {
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);

  useLayoutEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return;
    if (size.width < 2 || size.height < 2) return;

    const inset = layoutInsets;
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
      camera.position.copy(ORRERY_HOME).multiplyScalar(distance).add(ORRERY_LOOK);
      camera.up.set(0, 1, 0);
      camera.lookAt(ORRERY_LOOK);
      camera.updateMatrixWorld();
    };
    const fits = (distance: number) => {
      place(distance);
      for (const point of ORRERY_APPLIANCE_POINTS) {
        const projected = point.clone().project(camera);
        const x = (projected.x * 0.5 + 0.5) * size.width;
        const y = (1 - (projected.y * 0.5 + 0.5)) * size.height;
        if (x < limits.minX || x > limits.maxX || y < limits.minY || y > limits.maxY) return false;
      }
      return true;
    };

    let near = 8;
    let far = 120;
    for (let step = 0; step < 22; step++) {
      const mid = (near + far) / 2;
      if (fits(mid)) far = mid;
      else near = mid;
    }

    place(far * 1.04);
    camera.updateProjectionMatrix();

    const orbit = controls.current;
    if (!orbit) return;
    orbit.target.copy(ORRERY_LOOK);
    orbit.minDistance = 2;
    orbit.maxDistance = Math.max(120, far * 1.8);
    orbit.update();
    orbit.saveState();
  }, [camera, controls, layoutInsets, resetSignal, size.height, size.width]);

  return null;
}

function PlanetBody({
  body,
  focused,
  onFocus,
}: {
  body: BodyPlacement;
  focused: boolean;
  onFocus: (id: BodyId) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const handleClick = useCallback(
    (event: THREE.Event & { stopPropagation: () => void }) => {
      event.stopPropagation();
      onFocus(body.id);
    },
    [body.id, onFocus],
  );

  return (
    <mesh
      ref={meshRef}
      position={[body.position.x, body.position.y, body.position.z]}
      onClick={handleClick}
    >
      <sphereGeometry args={[body.displayRadius * (focused ? 1.15 : 1), 24, 24]} />
      <meshStandardMaterial
        color={body.color}
        emissive={focused ? body.color : "#000000"}
        emissiveIntensity={focused ? 0.35 : 0}
        roughness={0.65}
        metalness={0.15}
      />
    </mesh>
  );
}
