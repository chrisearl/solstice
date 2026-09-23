"use client";

import { OrbitControls } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { type ComponentRef, type RefObject, useLayoutEffect } from "react";
import * as THREE from "three";
import type { LayoutInsets } from "@/lib/layout-insets";

const LOOK_TARGET = new THREE.Vector3(0, 0.75, 0);
const HOME_DIRECTION = new THREE.Vector3(5.15, 2.8, 6.35).normalize();

export function FrameCamera({
  resetSignal,
  controls,
  layoutInsets,
  appliancePoints,
}: {
  resetSignal: number;
  controls: RefObject<ComponentRef<typeof OrbitControls> | null>;
  layoutInsets: LayoutInsets;
  appliancePoints: THREE.Vector3[];
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
      camera.position.copy(HOME_DIRECTION).multiplyScalar(distance).add(LOOK_TARGET);
      camera.up.set(0, 1, 0);
      camera.lookAt(LOOK_TARGET);
      camera.updateMatrixWorld();
    };
    const fits = (distance: number) => {
      place(distance);
      for (const point of appliancePoints) {
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
  }, [appliancePoints, camera, controls, layoutInsets, resetSignal, size.height, size.width]);
  /* eslint-enable react-hooks/immutability */

  return null;
}
