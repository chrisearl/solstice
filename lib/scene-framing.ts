import * as THREE from "three";
import { maxOrrerySceneRadius } from "./orrery.ts";
import { DISC_RADIUS, SKY_RADIUS } from "./solar.ts";

/** Disc rim, seasonal arc envelope, and a little room for the arc labels. */
export function createAppliancePoints(discPadding: number): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  const disc = DISC_RADIUS + discPadding;
  for (let i = 0; i < 36; i++) {
    const angle = (i / 36) * Math.PI * 2;
    points.push(new THREE.Vector3(Math.sin(angle) * disc, 0.04, Math.cos(angle) * disc));
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
}

/** Outermost orbit ring plus label margin for the heliocentric orrery. */
export function createOrreryAppliancePoints(maxRadius = maxOrrerySceneRadius()): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  const radius = maxRadius + 1.2;
  for (let i = 0; i < 48; i++) {
    const angle = (i / 48) * Math.PI * 2;
    points.push(new THREE.Vector3(Math.sin(angle) * radius, 0.05, Math.cos(angle) * radius));
  }
  points.push(new THREE.Vector3(0, radius * 0.35, 0));
  return points;
}
