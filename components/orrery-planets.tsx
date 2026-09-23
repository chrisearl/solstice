"use client";

import { useCallback, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import {
  DAVINCI_HATCH_DENSITY,
  DAVINCI_HATCH_WEIGHT,
  davinciPlanetFragmentShader,
  davinciPlanetVertexShader,
} from "@/lib/davinci-shader";
import {
  getPlanetTexture,
  getSaturnRingTexture,
  planetTextureId,
  SATURN_RING_TILT,
  SATURN_RING_YAW,
} from "@/lib/planet-textures";
import type { BodyId, BodyPlacement } from "@/lib/orrery";

const DAVINCI_PAPER = "#dfcdad";
const DAVINCI_INK = "#2b190d";

function SaturnRings({
  displayRadius,
  theme,
  focused,
}: {
  displayRadius: number;
  theme: "night" | "davinci";
  focused: boolean;
}) {
  const texture = useMemo(() => getSaturnRingTexture(theme), [theme]);

  const innerA = displayRadius * 1.32;
  const outerA = displayRadius * 1.56;
  const innerB = displayRadius * 1.68;
  const outerB = displayRadius * 2.18;
  const opacity = focused ? (theme === "night" ? 0.62 : 0.48) : theme === "night" ? 0.5 : 0.38;

  return (
    <group rotation={[SATURN_RING_TILT, SATURN_RING_YAW, 0.12]}>
      <mesh rotation={[Math.PI / 2, 0, 0]} renderOrder={theme === "davinci" ? 5 : 0}>
        <ringGeometry args={[innerA, outerA, 96]} />
        {theme === "night" ? (
          <meshStandardMaterial
            map={texture}
            color="#e8dcb0"
            transparent
            opacity={opacity}
            side={THREE.DoubleSide}
            roughness={0.85}
            metalness={0.05}
            depthWrite={false}
          />
        ) : (
          <meshBasicMaterial
            map={texture}
            color={DAVINCI_INK}
            transparent
            opacity={opacity}
            side={THREE.DoubleSide}
            depthWrite={false}
            toneMapped={false}
          />
        )}
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} renderOrder={theme === "davinci" ? 5 : 0}>
        <ringGeometry args={[innerB, outerB, 128]} />
        {theme === "night" ? (
          <meshStandardMaterial
            map={texture}
            color="#d8ca98"
            transparent
            opacity={opacity * 0.92}
            side={THREE.DoubleSide}
            roughness={0.88}
            metalness={0.04}
            depthWrite={false}
          />
        ) : (
          <meshBasicMaterial
            map={texture}
            color={DAVINCI_INK}
            transparent
            opacity={opacity * 0.88}
            side={THREE.DoubleSide}
            depthWrite={false}
            toneMapped={false}
          />
        )}
      </mesh>
    </group>
  );
}

export function NightPlanetBody({
  body,
  focused,
  onFocus,
}: {
  body: BodyPlacement;
  focused: boolean;
  onFocus: (id: BodyId) => void;
}) {
  const textureId = planetTextureId(body.id);
  const texture = useMemo(
    () => (textureId ? getPlanetTexture(textureId, "night") : null),
    [textureId],
  );

  const radius = body.displayRadius * (focused ? 1.15 : 1);
  const handleClick = useCallback(
    (event: THREE.Event & { stopPropagation: () => void }) => {
      event.stopPropagation();
      onFocus(body.id);
    },
    [body.id, onFocus],
  );

  return (
    <group position={[body.position.x, body.position.y, body.position.z]}>
      <mesh onClick={handleClick}>
        <sphereGeometry args={[radius, 32, 32]} />
        <meshStandardMaterial
          map={texture ?? undefined}
          color="#ffffff"
          emissive={body.color}
          emissiveIntensity={focused ? 0.1 : 0.04}
          roughness={0.78}
          metalness={0.06}
        />
      </mesh>
      {body.id === "saturn" && (
        <SaturnRings displayRadius={radius} theme="night" focused={focused} />
      )}
    </group>
  );
}

export function InkPlanetBody({
  body,
  focused,
  onFocus,
}: {
  body: BodyPlacement;
  focused: boolean;
  onFocus: (id: BodyId) => void;
}) {
  const mesh = useRef<THREE.Mesh>(null);
  const textureId = planetTextureId(body.id);
  const featureMap = useMemo(() => {
    if (!textureId) throw new Error("Ink planets require a texture id.");
    return getPlanetTexture(textureId, "davinci");
  }, [textureId]);

  const uniforms = useMemo(
    () => ({
      uLightDirection: { value: new THREE.Vector3(0.4, 0.7, 0.5).normalize() },
      uInkColor: { value: new THREE.Color(DAVINCI_INK) },
      uPaperColor: { value: new THREE.Color(DAVINCI_PAPER) },
      uHatchDensity: { value: DAVINCI_HATCH_DENSITY },
      uLineWeight: { value: DAVINCI_HATCH_WEIGHT },
      uFeatureMap: { value: featureMap },
      uFeatureStrength: { value: 0.72 },
    }),
    [featureMap],
  );

  const handleClick = useCallback(
    (event: THREE.Event & { stopPropagation: () => void }) => {
      event.stopPropagation();
      onFocus(body.id);
    },
    [body.id, onFocus],
  );

  const radius = body.displayRadius * (focused ? 1.15 : 1);

  useLayoutEffect(() => {
    mesh.current?.position.set(body.position.x, body.position.y, body.position.z);
    mesh.current?.scale.setScalar(radius);
  }, [body.position.x, body.position.y, body.position.z, radius]);

  return (
    <group>
      <mesh ref={mesh} onClick={handleClick} renderOrder={6}>
        <sphereGeometry args={[1, 32, 32]} />
        <shaderMaterial
          toneMapped={false}
          uniforms={uniforms}
          vertexShader={davinciPlanetVertexShader}
          fragmentShader={davinciPlanetFragmentShader}
        />
      </mesh>
      {body.id === "saturn" && (
        <group position={[body.position.x, body.position.y, body.position.z]}>
          <SaturnRings displayRadius={radius} theme="davinci" focused={focused} />
        </group>
      )}
    </group>
  );
}
