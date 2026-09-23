"use client";

import { Html, Line, OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  type ComponentRef,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as THREE from "three";
import { watchContextLoss } from "@/components/scene-boundary";
import { readLiveOrrery, useSolarMotion } from "@/components/solar-motion";
import {
  DAVINCI_HATCH_DENSITY,
  DAVINCI_HATCH_WEIGHT,
  davinciFragmentShader,
  davinciVertexShader,
} from "@/lib/davinci-shader";
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
import type { OrrerySceneProps } from "@/components/orrery-scene";

const INK = "#3a2412";
const PAPER = "#dfcdad";
const ORRERY_APPLIANCE_POINTS = createOrreryAppliancePoints();
const ORRERY_LOOK = new THREE.Vector3(0, 0, 0);
const ORRERY_HOME = new THREE.Vector3(0, 14, 18).normalize();

export type DavinciOrrerySceneProps = OrrerySceneProps;

export function DavinciOrreryScene(props: DavinciOrrerySceneProps) {
  return (
    <Canvas
      className="absolute inset-0 z-[1]"
      camera={{ position: [0, 14, 18], fov: 38, near: 0.1, far: 400 }}
      dpr={[1, 2]}
      frameloop={props.active ? "always" : "never"}
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.NoToneMapping;
        gl.setClearColor(0x000000, 0);
        watchContextLoss(gl.domElement, props.onContextLost);
      }}
    >
      <InkOrreryInstrument {...props} />
    </Canvas>
  );
}

function InkOrreryInstrument({
  model,
  playing,
  focusId,
  visiblePlanets,
  resetSignal,
  layoutInsets,
  onFocus,
}: DavinciOrrerySceneProps) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const motion = useSolarMotion();
  const orbitPaths = useMemo(() => buildOrbitPaths(128), []);
  const [animatedModel, setAnimatedModel] = useState(model);

  useFrame(() => {
    if (!playing) return;
    setAnimatedModel(readLiveOrrery(motion, focusId, visiblePlanets));
  });

  const liveModel = playing ? animatedModel : model;

  const focusBody = bodyById(liveModel, focusId) ?? bodyById(liveModel, "earth");

  return (
    <>
      <InkSun />
      {orbitPaths.map((path) => {
        if (path.id !== "moon" && !visiblePlanets.has(path.id)) return null;
        const points = path.points.flatMap((p) => [p.x, p.y, p.z] as const);
        return (
          <Line
            key={path.id}
            points={points}
            color={INK}
            transparent
            opacity={path.id === focusId ? 0.55 : 0.22}
            lineWidth={path.id === focusId ? 1.5 : 1}
          />
        );
      })}
      {liveModel.bodies
        .filter((body) => body.id !== "sun")
        .map((body) => (
          <InkPlanetBody
            key={body.id}
            body={body}
            focused={body.id === focusId}
            onFocus={onFocus}
          />
        ))}
      {focusBody && (
        <Html
          position={[focusBody.position.x, focusBody.position.y + 0.5, focusBody.position.z]}
          center
          distanceFactor={14}
        >
          <span className="rounded-full border border-[#9b764b]/60 bg-[#f4e8d1]/90 px-2 py-0.5 text-[10px] tracking-[0.14em] text-[#3a2310] uppercase">
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
      <DavinciOrreryFrameCamera resetSignal={resetSignal} controls={controls} layoutInsets={layoutInsets} />
    </>
  );
}

function InkSun() {
  return (
    <mesh position={[0, 0, 0]}>
      <sphereGeometry args={[0.55, 32, 32]} />
      <meshBasicMaterial color="#c8922a" />
    </mesh>
  );
}

function InkPlanetBody({
  body,
  focused,
  onFocus,
}: {
  body: BodyPlacement;
  focused: boolean;
  onFocus: (id: BodyId) => void;
}) {
  const mesh = useRef<THREE.Mesh>(null);
  const material = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({
      uLightDirection: { value: new THREE.Vector3(0.4, 0.7, 0.5).normalize() },
      uInkColor: { value: new THREE.Color("#2b190d") },
      uPaperColor: { value: new THREE.Color(PAPER) },
      uHatchDensity: { value: DAVINCI_HATCH_DENSITY },
      uLineWeight: { value: DAVINCI_HATCH_WEIGHT },
      uIsLightSource: { value: 0 },
    }),
    [],
  );

  const handleClick = useCallback(
    (event: THREE.Event & { stopPropagation: () => void }) => {
      event.stopPropagation();
      onFocus(body.id);
    },
    [body.id, onFocus],
  );

  useLayoutEffect(() => {
    const scale = body.displayRadius * (focused ? 1.15 : 1);
    mesh.current?.position.set(body.position.x, body.position.y, body.position.z);
    mesh.current?.scale.setScalar(scale);
  }, [body, focused]);

  return (
    <mesh ref={mesh} onClick={handleClick} renderOrder={6}>
      <sphereGeometry args={[1, 32, 32]} />
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

function DavinciOrreryFrameCamera({
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

  /* Three.js cameras and orbit controls are mutable scene-graph objects. */
  /* eslint-disable react-hooks/immutability */
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
  /* eslint-enable react-hooks/immutability */

  return null;
}
